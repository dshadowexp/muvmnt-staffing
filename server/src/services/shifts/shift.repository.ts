import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';
import type { DailyWindowMatch } from '../staff-requests/matching.service';

export type ShiftRowUpdate = Database['public']['Tables']['shifts']['Update'];

export type ShiftWithStaffRequestRow = {
  id:         string;
  worker_id:  string;
  status:     string | null;
  start_time: string | null;
  end_time:   string | null;
  staff_requests: {
    client_id:           string;
    pricing_tier:        string | null;
    requirements:        string[];
    daily_time_windows:  unknown;
  } | null;
};

export async function getShiftWithStaffRequest(
  shiftId: string,
): Promise<ShiftWithStaffRequestRow | null> {
  const { data, error } = await supabase
    .from('shifts')
    .select(
      `
      id,
      worker_id,
      status,
      start_time,
      end_time,
      staff_requests!inner (
        client_id,
        pricing_tier,
        requirements,
        daily_time_windows
      )
    `,
    )
    .eq('id', shiftId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return (data ?? null) as ShiftWithStaffRequestRow | null;
}

export async function getWorkerIdByUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('workers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data?.id ?? null;
}

export async function updateShiftById(
  shiftId: string,
  patch: ShiftRowUpdate,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('shifts')
    .update({ ...patch, updated_at: now })
    .eq('id', shiftId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export function parseDailyWindows(raw: unknown): DailyWindowMatch[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw as DailyWindowMatch[];
}
