import { supabase } from "../../config/supabase";

export interface WorkerRecord {
  id: string;
  user_id: string | null;
  stripe_account_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type CreateWorkerInput = {
  userId?: string;
} & Record<string, unknown>;

export type UpdateWorkerInput = {
  userId?: string;
} & Record<string, unknown>;

export class WorkersRepository {
  constructor() {}

  async create(input: CreateWorkerInput): Promise<WorkerRecord> {
    const { userId, ...rest } = input;

    const payload: Record<string, unknown> = {
      ...rest,
      ...(userId ? { user_id: userId } : {}),
    };

    const { data, error } = await supabase
      .from("workers")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create worker: ${error?.message ?? "unknown error"}`);
    }

    return data as WorkerRecord;
  }

  async findById(id: string): Promise<WorkerRecord | null> {
    const { data, error } = await supabase.from("workers").select("*").eq("id", id).single();
    if (error) return null;
    return data as WorkerRecord;
  }

  async findAll(params?: { limit?: number; offset?: number }): Promise<WorkerRecord[]> {
    let query = supabase.from("workers").select("*").order("created_at", { ascending: false });

    if (typeof params?.offset === "number" && typeof params?.limit === "number") {
      query = query.range(params.offset, params.offset + params.limit - 1);
    } else if (typeof params?.limit === "number") {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch workers: ${error.message}`);
    return (data ?? []) as WorkerRecord[];
  }

  async updateById(id: string, input: UpdateWorkerInput): Promise<WorkerRecord> {
    const { userId, ...rest } = input;

    const payload: Record<string, unknown> = {
      ...rest,
      ...(userId ? { user_id: userId } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("workers")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update worker: ${error?.message ?? "unknown error"}`);
    }

    return data as WorkerRecord;
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await supabase.from("workers").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete worker: ${error.message}`);
  }
}
