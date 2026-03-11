import { supabase } from "../../config/supabase";

export interface ClientRecord {
  id: string;
  user_id: string | null;
  created_at?: string;
  updated_at?: string;
  // allow extra columns without typing the whole table
  [key: string]: unknown;
}

export type CreateClientInput = {
  userId?: string;
} & Record<string, unknown>;

export type UpdateClientInput = {
  userId?: string;
} & Record<string, unknown>;

export class ClientsRepository {
  constructor() {}

  async create(input: CreateClientInput): Promise<ClientRecord> {
    const { userId, ...rest } = input;

    const payload: Record<string, unknown> = {
      ...rest,
      ...(userId ? { user_id: userId } : {}),
    };

    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create client: ${error?.message ?? "unknown error"}`);
    }

    return data as ClientRecord;
  }

  async findById(id: string): Promise<ClientRecord | null> {
    const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
    if (error) return null;
    return data as ClientRecord;
  }

  async findAll(params?: { limit?: number; offset?: number }): Promise<ClientRecord[]> {
    let query = supabase.from("clients").select("*").order("created_at", { ascending: false });

    if (typeof params?.offset === "number" && typeof params?.limit === "number") {
      query = query.range(params.offset, params.offset + params.limit - 1);
    } else if (typeof params?.limit === "number") {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
    return (data ?? []) as ClientRecord[];
  }

  async updateById(id: string, input: UpdateClientInput): Promise<ClientRecord> {
    const { userId, ...rest } = input;

    const payload: Record<string, unknown> = {
      ...rest,
      ...(userId ? { user_id: userId } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update client: ${error?.message ?? "unknown error"}`);
    }

    return data as ClientRecord;
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete client: ${error.message}`);
  }
}
