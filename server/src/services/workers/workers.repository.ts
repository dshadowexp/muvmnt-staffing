import { supabase } from '../../config/supabase'

export interface WorkerProfileRecord {
  user_id:         string
  first_name:      string
  last_name:       string
  date_of_birth:   string
  address_line1:   string
  address_line2:   string | null
  city:            string
  province:        string
  postal_code:     string
  role:            string
  years_experience:string
  created_at:      string
  updated_at:      string
}

export interface WorkerProfile {
  userId:         string
  firstName:      string
  lastName:       string
  dateOfBirth:    string
  addressLine1:   string
  addressLine2:   string | null
  city:           string
  province:       string
  postalCode:     string
  role:           string
  yearsExperience:string
  createdAt:      string
  updatedAt:      string
}

export class WorkersRepository {
  constructor() {}

  // ─── Find profile by user ───────────────────────────────────────────────────

  async findByUserId(userId: string): Promise<WorkerProfile | null> {
    const { data, error } = await supabase
      .from('worker_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // no rows
      throw new Error(`Failed to fetch worker profile: ${error.message}`)
    }

    if (!data) return null

    const row = data as WorkerProfileRecord

    return {
      userId:         row.user_id,
      firstName:      row.first_name,
      lastName:       row.last_name,
      dateOfBirth:    row.date_of_birth,
      addressLine1:   row.address_line1,
      addressLine2:   row.address_line2,
      city:           row.city,
      province:       row.province,
      postalCode:     row.postal_code,
      role:           row.role,
      yearsExperience:row.years_experience,
      createdAt:      row.created_at,
      updatedAt:      row.updated_at,
    }
  }

  // ─── Create or update profile for user ──────────────────────────────────────

  async upsert(userId: string, data: Omit<WorkerProfile, 'userId' | 'createdAt' | 'updatedAt'>): Promise<WorkerProfile> {
    const now = new Date().toISOString()

    const { data: row, error } = await supabase
      .from('worker_profiles')
      .upsert(
        {
          user_id:         userId,
          first_name:      data.firstName,
          last_name:       data.lastName,
          date_of_birth:   data.dateOfBirth,
          address_line1:   data.addressLine1,
          address_line2:   data.addressLine2 ?? null,
          city:            data.city,
          province:        data.province,
          postal_code:     data.postalCode,
          role:            data.role,
          years_experience:data.yearsExperience,
          updated_at:      now,
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to upsert worker profile: ${error.message}`)
    }

    const record = row as WorkerProfileRecord

    return {
      userId:         record.user_id,
      firstName:      record.first_name,
      lastName:       record.last_name,
      dateOfBirth:    record.date_of_birth,
      addressLine1:   record.address_line1,
      addressLine2:   record.address_line2,
      city:           record.city,
      province:       record.province,
      postalCode:     record.postal_code,
      role:           record.role,
      yearsExperience:record.years_experience,
      createdAt:      record.created_at,
      updatedAt:      record.updated_at,
    }
  }

  // ─── Delete profile ─────────────────────────────────────────────────────────

  async delete(userId: string): Promise<void> {
    const { error } = await supabase
      .from('worker_profiles')
      .delete()
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete worker profile: ${error.message}`)
    }
  }
}

