import { supabase } from '../../config/supabase'

export interface ClientProfileRecord {
  user_id:      string
  name:         string
  address_line1:string
  address_line2:string | null
  city:         string
  province:     string
  postal_code:  string
  client_type:  string
  created_at:   string
  updated_at:   string
}

export interface ClientProfile {
  userId:      string
  name:        string
  addressLine1:string
  addressLine2:string | null
  city:        string
  province:    string
  postalCode:  string
  clientType:  string
  createdAt:   string
  updatedAt:   string
}

export class ClientsRepository {
  constructor() {}

  // ─── Find profile by user ───────────────────────────────────────────────────

  async findByUserId(userId: string): Promise<ClientProfile | null> {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    // PostgREST "no rows" code; if different in your setup, adjust as needed
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch client profile: ${error.message}`)
    }

    if (!data) return null

    const row = data as ClientProfileRecord

    return {
      userId:      row.user_id,
      name:        row.name,
      addressLine1:row.address_line1,
      addressLine2:row.address_line2,
      city:        row.city,
      province:    row.province,
      postalCode:  row.postal_code,
      clientType:  row.client_type,
      createdAt:   row.created_at,
      updatedAt:   row.updated_at,
    }
  }

  // ─── Create or update profile for user ──────────────────────────────────────

  async upsert(userId: string, data: Omit<ClientProfile, 'userId' | 'createdAt' | 'updatedAt'>): Promise<ClientProfile> {
    const now = new Date().toISOString()

    const { data: row, error } = await supabase
      .from('client_profiles')
      .upsert(
        {
          user_id:      userId,
          name:         data.name,
          address_line1:data.addressLine1,
          address_line2:data.addressLine2 ?? null,
          city:         data.city,
          province:     data.province,
          postal_code:  data.postalCode,
          client_type:  data.clientType,
          updated_at:   now,
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to upsert client profile: ${error.message}`)
    }

    const record = row as ClientProfileRecord

    return {
      userId:      record.user_id,
      name:        record.name,
      addressLine1:record.address_line1,
      addressLine2:record.address_line2,
      city:        record.city,
      province:    record.province,
      postalCode:  record.postal_code,
      clientType:  record.client_type,
      createdAt:   record.created_at,
      updatedAt:   record.updated_at,
    }
  }

  // ─── Delete profile ─────────────────────────────────────────────────────────

  async delete(userId: string): Promise<void> {
    const { error } = await supabase
      .from('client_profiles')
      .delete()
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete client profile: ${error.message}`)
    }
  }
}

