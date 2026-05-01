"use server";

import { z } from "zod";
import { createAdminClient } from "@/supabase/server";

const submitSchema = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  companyName: z.string().min(1).max(300),
  jobTitle: z.string().min(1).max(300),
  staffSize: z.string().min(1),
  country: z.string().min(1).max(120),
  productInterest: z.string().min(1).max(120),
});

export async function submitDemoLeadAction(
  raw: z.infer<typeof submitSchema>,
): Promise<{ ok: true; leadId: string } | { ok: false; code: "validation" | "db" }> {
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "validation" };

  const d = parsed.data;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("demo_leads")
    .insert({
      email: d.email.trim().toLowerCase(),
      first_name: d.firstName.trim(),
      last_name: d.lastName.trim(),
      company_name: d.companyName.trim(),
      job_title: d.jobTitle.trim(),
      company_size: d.staffSize,
      country: d.country.trim(),
      product_interest: d.productInterest.trim(),
    })
    .select("id")
    .single();

  console.log(data, error);
  if (error || !data) return { ok: false, code: "db" };
  return { ok: true, leadId: data.id };
}

const linkSchema = z.object({
  leadId: z.uuid(),
  email: z.email(),
  bookingUid: z.string().min(1).max(200),
});

/** Called from the client when Cal fires `bookingSuccessfulV2` — ties the embed booking to the lead row. */
export async function linkDemoCalBookingAction(
  raw: z.infer<typeof linkSchema>,
): Promise<{ ok: true } | { ok: false }> {
  const parsed = linkSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };

  const { leadId, email, bookingUid } = parsed.data;
  const supabase = await createAdminClient();

  const { data: row, error: fetchErr } = await supabase
    .from("demo_leads")
    .select("id, email")
    .eq("id", leadId)
    .maybeSingle();

  if (fetchErr || !row || row.email !== email.trim().toLowerCase()) {
    return { ok: false };
  }

  const { error: updErr } = await supabase
    .from("demo_leads")
    .update({ cal_booking_uid: bookingUid })
    .eq("id", leadId);

  if (updErr) return { ok: false };
  return { ok: true };
}
