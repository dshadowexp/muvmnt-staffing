import { supabase } from '../../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FindOrCreateUserParams {
  authId: string
  email:  string
}

export interface UserRecord {
  id:        string
  auth_id:   string
  email:     string
  role:      string
  is_active: boolean
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class AuthRepository {
  constructor() {}

  async findOrCreateUser({ authId, email }: FindOrCreateUserParams): Promise<UserRecord> {
    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 = row not found — anything else is a real DB error
      throw new Error(`Failed to query user: ${findError.message}`);
    }

    if (existing) return existing as UserRecord

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ auth_id: authId, email, role: 'customer' })
      .select()
      .single();

    if (insertError || !newUser) {
      throw new Error(`Failed to create user: ${insertError?.message}`);
    }

    return newUser as UserRecord;
  }
}