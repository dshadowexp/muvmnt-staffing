import { logger } from '../../config/logger';
import { supabase } from '../../config/supabase';
import {
  STAFF_REQUEST_STATUS_CONFIRMED,
  STAFF_REQUEST_STATUS_PENDING_COVERAGE,
  STAFF_REQUEST_STATUS_PENDING_PRICING,
  UNSPECIFIED_STAFF_REQUEST_PROFESSION,
} from './constants';
import {
  matchWorkersForStaffRequest,
  type DailyWindowMatch,
  type MatchResult,
} from './matching.service';

type ProposedSchedule = MatchResult['schedule'];
import { buildPricingTierOffersForJob, type PricingTierOfferDto } from './pricing-tiers.service';
import {
  estimatedTotalCentsForHourly,
  type StaffRequestPricingDraft,
} from './staff-request-pricing';
import { chargeStaffRequestOffSession } from '../payments/staff-request-charge.service';
import { insertShiftsFromProposedCoverage } from './staff-request-shifts';
import { enqueueShiftAssignmentEmails } from '../shifts/shift-assignment-email.service';
import { enqueueStaffRequestBookedEmail } from './staff-request-booked-email.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateStaffRequestInput = {
  startDate: Date;
  endDate:   Date | null;
  positions: number;
  dailyTimeWindows: DailyWindowMatch[];
};

export type CreateStaffRequestDraftResult =
  | { ok: true; jobId: string }
  | { ok: false; message: string };

export type PricingTiersResult =
  | { ok: true; tiers: PricingTierOfferDto[]; currency: 'CAD'; ringCellCount: number }
  | { ok: false; message: string };

export type MatchStaffRequestWithPricingResult =
  | {
      ok:             true;
      jobId:          string;
      schedule:       MatchResult['schedule'];
      totalWorkers:   number;
      fullyCovered:   boolean;
      candidateCount: number;
      ringCellCount:  number;
      currency:       'CAD';
    }
  | { ok: false; message: string };

// ─── Step 1: create draft (no match yet) ─────────────────────────────────────

export async function createStaffRequestDraft(
  clientUserId: string,
  input: CreateStaffRequestInput,
): Promise<CreateStaffRequestDraftResult> {
  const { data: cellData, error: cellErr } = await supabase
    .from('locations')
    .select('cell_id')
    .eq('user_id', clientUserId)
    .single();

  if (cellErr || !cellData?.cell_id) {
    return { ok: false, message: cellErr?.message ?? 'Client location not found' };
  }

  const { data: job, error: jobErr } = await supabase
    .from('staff_requests')
    .insert({
      client_id:          clientUserId,
      cell_id:            cellData.cell_id,
      start_date:         input.startDate.toISOString(),
      end_date:           input.endDate?.toISOString() ?? null,
      positions:          Math.max(1, Math.floor(input.positions)),
      requirements:       [],
      tasks:              [],
      notes:              null,
      pricing_rate:       null,
      pricing_tier:       null,
      daily_time_windows: input.dailyTimeWindows,
      status:             STAFF_REQUEST_STATUS_PENDING_PRICING,
    })
    .select('id')
    .single();

  if (jobErr || !job) {
    return { ok: false, message: jobErr?.message ?? 'Failed to create staff request' };
  }

  return { ok: true, jobId: job.id };
}

// ─── Step 2: pricing tiers ─────────────────────────────────────────────────

export async function getPricingTiersForStaffRequest(
  clientUserId: string,
  jobId: string,
): Promise<PricingTiersResult> {
  const { data: job, error } = await supabase
    .from('staff_requests')
    .select(
      'client_id, status, requirements, start_date, end_date, daily_time_windows',
    )
    .eq('id', jobId)
    .single();

  if (error || !job) return { ok: false, message: 'Request not found' };
  if (job.client_id !== clientUserId) return { ok: false, message: 'Forbidden' };
  if (
    job.status !== STAFF_REQUEST_STATUS_PENDING_PRICING &&
    job.status !== STAFF_REQUEST_STATUS_PENDING_COVERAGE
  ) {
    return { ok: false, message: 'Pricing tiers are not available for this request' };
  }

  const dailyWindows = job.daily_time_windows as DailyWindowMatch[];
  const startYmd     = job.start_date.slice(0, 10);
  const endYmd       = job.end_date ? job.end_date.slice(0, 10) : startYmd;

  const built = await buildPricingTierOffersForJob({
    clientUserId,
    profession:   UNSPECIFIED_STAFF_REQUEST_PROFESSION,
    requirements: job.requirements ?? [],
    startDateYmd: startYmd,
    endDateYmd:   endYmd,
    dailyWindows,
  });

  return { ok: true, ...built };
}

const MIN_PRICING_RATE = 15;

// ─── Step 3: match with selected tier / rate ─────────────────────────────────

export async function runStaffRequestMatchWithPricing(
  clientUserId: string,
  jobId: string,
  pricingTier: string,
  pricingRate: number,
): Promise<MatchStaffRequestWithPricingResult> {
  if (!Number.isFinite(pricingRate) || pricingRate < MIN_PRICING_RATE) {
    return { ok: false, message: `Rate must be at least $${MIN_PRICING_RATE}/hr` };
  }

  const { data: job, error: jobErr } = await supabase
    .from('staff_requests')
    .select(
      'id, client_id, status, requirements, start_date, end_date, daily_time_windows',
    )
    .eq('id', jobId)
    .single();

  if (jobErr || !job) return { ok: false, message: 'Request not found' };
  if (job.client_id !== clientUserId) return { ok: false, message: 'Forbidden' };
  if (
    job.status !== STAFF_REQUEST_STATUS_PENDING_PRICING &&
    job.status !== STAFF_REQUEST_STATUS_PENDING_COVERAGE
  ) {
    return { ok: false, message: 'Match is not allowed in the current state' };
  }

  const dailyWindows = job.daily_time_windows as DailyWindowMatch[];
  const startYmd     = job.start_date.slice(0, 10);
  const endYmd       = job.end_date ? job.end_date.slice(0, 10) : null;

  const tierCheck = await buildPricingTierOffersForJob({
    clientUserId,
    profession:   UNSPECIFIED_STAFF_REQUEST_PROFESSION,
    requirements: job.requirements ?? [],
    startDateYmd: startYmd,
    endDateYmd:   endYmd,
    dailyWindows,
  });

  const allowed = tierCheck.tiers.find(t => t.tierId === pricingTier && t.available);
  if (!allowed) return { ok: false, message: 'Selected tier is not available' };
  if (Math.abs(allowed.hourlyRate - pricingRate) > 0.02) {
    return { ok: false, message: 'Rate does not match selected tier' };
  }

  const result = await matchWorkersForStaffRequest({
    clientUserId,
    startDate: startYmd,
    endDate:   endYmd,
    dailyWindows,
    pricingTierId:      pricingTier,
    requestProfession:  UNSPECIFIED_STAFF_REQUEST_PROFESSION,
    requirements:     job.requirements ?? [],
  });

  const now = new Date().toISOString();
  // Coverage is not stored in `proposed_schedule` (column may be absent). Confirm re-runs
  // matching from persisted tier + `daily_time_windows` so shifts match server logic.
  const { error: upErr } = await supabase
    .from('staff_requests')
    .update({
      pricing_tier: pricingTier,
      pricing_rate: pricingRate,
      status:       STAFF_REQUEST_STATUS_PENDING_COVERAGE,
      update_at:    now,
    })
    .eq('id', jobId)
    .eq('client_id', clientUserId);

  if (upErr) return { ok: false, message: upErr.message };

  return {
    ok:             true,
    jobId,
    schedule:       result.schedule,
    totalWorkers:   result.totalWorkers,
    fullyCovered:   result.fullyCovered,
    candidateCount: result.candidateCount,
    ringCellCount:  result.ringCellCount,
    currency:       'CAD',
  };
}

// ─── Step 4: confirm + shifts ───────────────────────────────────────────────

export async function confirmStaffRequestCoverage(
  clientUserId: string,
  jobId: string,
  notes: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: job, error: jobErr } = await supabase
    .from('staff_requests')
    .select(
      'id, client_id, status, positions, pricing_rate, pricing_tier, requirements, start_date, end_date, daily_time_windows',
    )
    .eq('id', jobId)
    .single();

  if (jobErr || !job) return { ok: false, message: 'Request not found' };
  if (job.client_id !== clientUserId) return { ok: false, message: 'Forbidden' };
  if (job.status !== STAFF_REQUEST_STATUS_PENDING_COVERAGE) {
    return { ok: false, message: 'Request is not awaiting confirmation' };
  }
  if (job.pricing_rate == null || job.pricing_rate < MIN_PRICING_RATE) {
    return { ok: false, message: 'Invalid pricing on request' };
  }
  if (job.pricing_tier == null || job.pricing_tier === '') {
    return { ok: false, message: 'No pricing tier on request; run match first' };
  }

  const { data: billing, error: billingErr } = await supabase
    .from('billing_accounts')
    .select('stripe_customer_id, default_payment_method_id')
    .eq('user_id', clientUserId)
    .single();

  if (billingErr || !billing) {
    return { ok: false, message: billingErr?.message ?? 'Failed to get billing account' };
  }

  if (!billing?.stripe_customer_id) {
    return { ok: false, message: 'No billing account found' };
  }
  if (!billing.default_payment_method_id) {
    return { ok: false, message: 'No saved payment method' };
  }

  const dailyWindows = job.daily_time_windows as DailyWindowMatch[];
  const pricingDraft: StaffRequestPricingDraft = {
    profession:   UNSPECIFIED_STAFF_REQUEST_PROFESSION,
    start_date:   job.start_date,
    end_date:     job.end_date,
    positions:    job.positions,
    dailyWindows: dailyWindows as StaffRequestPricingDraft['dailyWindows'],
  };
  const amountCents = estimatedTotalCentsForHourly(pricingDraft, job.pricing_rate);

  const paid = await chargeStaffRequestOffSession({
    jobId,
    clientUserId,
    stripeCustomerId:       billing.stripe_customer_id,
    paymentMethodId:        billing.default_payment_method_id,
    amountCents,
  });
  if (!paid.ok) return { ok: false, message: paid.message };

  const startYmd     = job.start_date.slice(0, 10);
  const endYmd       = job.end_date ? job.end_date.slice(0, 10) : null;

  const tierCheck = await buildPricingTierOffersForJob({
    clientUserId,
    profession:   UNSPECIFIED_STAFF_REQUEST_PROFESSION,
    requirements: job.requirements ?? [],
    startDateYmd: startYmd,
    endDateYmd:   endYmd,
    dailyWindows,
  });
  const allowed = tierCheck.tiers.find(
    t => t.tierId === job.pricing_tier && t.available,
  );
  if (!allowed) {
    return { ok: false, message: 'Selected tier is no longer available; try matching again' };
  }
  if (Math.abs(allowed.hourlyRate - job.pricing_rate) > 0.02) {
    return { ok: false, message: 'Stored rate does not match tier' };
  }

  const matchResult = await matchWorkersForStaffRequest({
    clientUserId,
    startDate:       startYmd,
    endDate:         endYmd,
    dailyWindows,
    pricingTierId:   job.pricing_tier,
    requestProfession: UNSPECIFIED_STAFF_REQUEST_PROFESSION,
    requirements:    job.requirements ?? [],
  });

  const schedule = matchResult.schedule as ProposedSchedule;
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return { ok: false, message: 'No coverage could be computed for this request' };
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', clientUserId)
    .maybeSingle();

  if (clientErr || !clientRow?.id) {
    return { ok: false, message: clientErr?.message ?? 'Client profile not found' };
  }

  const clientDisplayName = (clientRow.name ?? '').trim() || 'Client';

  const { data: clientLoc } = await supabase
    .from('locations')
    .select('address, lat, lng')
    .eq('user_id', clientUserId)
    .maybeSingle();

  const lat =
    clientLoc?.lat != null && Number.isFinite(Number(clientLoc.lat))
      ? Number(clientLoc.lat)
      : null;
  const lng =
    clientLoc?.lng != null && Number.isFinite(Number(clientLoc.lng))
      ? Number(clientLoc.lng)
      : null;
  const shiftLocation =
    lat != null && lng != null
      ? {
          address: typeof clientLoc?.address === 'string' ? clientLoc.address : '',
          lat,
          lng,
        }
      : null;

  const shifts = await insertShiftsFromProposedCoverage({
    staffRequestId: jobId,
    clientId:       clientRow.id,
    hourlyRate:     job.pricing_rate,
    schedule,
    location:       shiftLocation,
  });

  if (!shifts.ok) return { ok: false, message: shifts.message };

  void enqueueShiftAssignmentEmails({
    shiftRows:       shifts.rows,
    clientDisplayName,
  }).catch((err: unknown) => {
    logger.error({ err }, 'enqueueShiftAssignmentEmails failed');
  });

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from('staff_requests')
    .update({
      status:    STAFF_REQUEST_STATUS_CONFIRMED,
      notes:     notes ?? null,
      update_at: now,
    })
    .eq('id', jobId)
    .eq('client_id', clientUserId);

  if (upErr) return { ok: false, message: upErr.message };

  void enqueueStaffRequestBookedEmail({
    clientUserId:      clientUserId,
    requestId:         jobId,
    clientDisplayName,
    amountCents,
    shiftCount:        shifts.rows.length,
    startDateYmd:      startYmd,
    endDateYmd:        endYmd,
  }).catch((err: unknown) => {
    logger.error({ err, jobId }, 'enqueueStaffRequestBookedEmail failed');
  });

  return { ok: true };
}

// ─── Abandon draft ───────────────────────────────────────────────────────────

export async function abandonPendingStaffRequest(
  clientUserId: string,
  jobId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: job, error: jobErr } = await supabase
    .from('staff_requests')
    .select('client_id, status')
    .eq('id', jobId)
    .single();

  if (jobErr || !job) return { ok: false, message: 'Request not found' };
  if (job.client_id !== clientUserId) return { ok: false, message: 'Forbidden' };
  if (job.status === STAFF_REQUEST_STATUS_CONFIRMED) {
    return { ok: false, message: 'Request is already confirmed' };
  }

  const { error: delErr } = await supabase
    .from('staff_requests')
    .delete()
    .eq('id', jobId)
    .eq('client_id', clientUserId);

  if (delErr) return { ok: false, message: delErr.message };
  return { ok: true };
}
