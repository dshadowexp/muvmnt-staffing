import { supabase } from '../../config/supabase';
import { matchWorkersForStaffRequest } from './staff-request-matching.service';

const MIN_HOURLY_RATE = 15;

export type CreateStaffRequestInput = {
  profession: string;
  startDate: Date;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  requirements: string[];
  tasks: string[];
  positions: number;
  notes: string;
};

export async function createDraftAndMatch(
  clientUserId: string,
  input: CreateStaffRequestInput,
): Promise<
  | {
      ok: true;
      jobId: string;
      tiers: Awaited<ReturnType<typeof matchWorkersForStaffRequest>>['tiers'];
      ringCellCount: number;
      candidateCount: number;
      currency: 'CAD';
    }
  | { ok: false; message: string }
> {
  const { data: cellData, error: cellError } = await supabase
    .from('locations')
    .select('cell_id')
    .eq('user_id', clientUserId)
    .single();

  if (cellError || cellData == null || cellData.cell_id == null) {
    return {
      ok: false,
      message: cellError?.message ?? 'Client location / cell not found',
    };
  }

  const { data: jobInfoData, error: jobInfoError } = await supabase
    .from('staff_requests')
    .insert({
      client_id: clientUserId,
      cell_id: cellData.cell_id,
      profession: input.profession,
      positions: input.positions,
      requirements: input.requirements,
      tasks: input.tasks,
      notes: input.notes.length > 0 ? input.notes : null,
      start_date: input.startDate.toISOString(),
      end_date: input.endDate?.toISOString() ?? null,
      start_time: input.startTime,
      end_time: input.endTime,
      hourly_rate: null,
    })
    .select()
    .single();

  if (jobInfoError || jobInfoData == null) {
    return {
      ok: false,
      message: jobInfoError?.message ?? 'Failed to create staff request',
    };
  }

  const pricingDraft = {
    profession: input.profession,
    start_date: input.startDate.toISOString(),
    end_date: input.endDate ? input.endDate.toISOString() : null,
    start_time: input.startTime,
    end_time: input.endTime,
    positions: input.positions,
  };

  const { tiers, ringCellCount, candidateCount } = await matchWorkersForStaffRequest({
    clientUserId,
    profession: input.profession,
    requirements: input.requirements,
    tasks: input.tasks,
    pricingDraft,
  });

  return {
    ok: true,
    jobId: jobInfoData.id,
    tiers,
    ringCellCount,
    candidateCount,
    currency: 'CAD',
  };
}

export async function finalizeStaffRequestFromMatch(
  clientUserId: string,
  jobId: string,
  hourlyRate: number,
  notes: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!Number.isFinite(hourlyRate) || hourlyRate < MIN_HOURLY_RATE) {
    return { ok: false, message: 'Invalid hourly rate' };
  }

  const { data: job, error: jobErr } = await supabase
    .from('staff_requests')
    .select('client_id, hourly_rate, notes')
    .eq('id', jobId)
    .single();

  if (jobErr || job == null) {
    return { ok: false, message: 'Request not found' };
  }
  if (job.client_id !== clientUserId) {
    return { ok: false, message: 'Forbidden' };
  }
  if (job.hourly_rate != null && job.hourly_rate > 0) {
    return { ok: false, message: 'This request already has an hourly rate' };
  }

  const nextNotes = notes.trim().length > 0 ? notes.trim() : job.notes;

  const { data: updated, error: upErr } = await supabase
    .from('staff_requests')
    .update({
      hourly_rate: hourlyRate,
      notes: nextNotes,
    })
    .eq('id', jobId)
    .eq('client_id', clientUserId)
    .select()
    .single();

  if (upErr || updated == null) {
    return { ok: false, message: upErr?.message ?? 'Failed to update request' };
  }

  return { ok: true };
}

export async function abandonPendingStaffRequest(
  clientUserId: string,
  jobId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: job, error: jobErr } = await supabase
    .from('staff_requests')
    .select('client_id, hourly_rate')
    .eq('id', jobId)
    .single();

  if (jobErr || job == null) {
    return { ok: false, message: 'Request not found' };
  }
  if (job.client_id !== clientUserId) {
    return { ok: false, message: 'Forbidden' };
  }
  if (job.hourly_rate != null && job.hourly_rate > 0) {
    return { ok: false, message: 'Request is already finalized' };
  }

  const { error: delErr, data: delData } = await supabase
    .from('staff_requests')
    .delete()
    .eq('id', jobId)
    .eq('client_id', clientUserId)
    .select()
    .single();

  if (delErr || delData == null) {
    return { ok: false, message: delErr?.message ?? 'Failed to delete draft' };
  }

  return { ok: true };
}
