import { supabase } from '../../config/supabase';
import { Role } from './permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FindOrCreateUserParams {
  authId:        string
  email:         string
  emailVerified: boolean,
  role?:         Role
}

export interface UserRecord {
  id:                string
  auth_id:           string
  email:             string
  phone_number:      string
  role:              string
  is_email_verified: boolean
  is_phone_verified: boolean
  is_active:         boolean
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class AuthRepository {
  constructor() {}

  async findById(id: string): Promise<UserRecord | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // row not found
      throw new Error(`Failed to find user by id: ${error.message}`);
    }

    return data as UserRecord;
  }

  async findUserByAuthId(authId: string): Promise<UserRecord | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // row not found
      throw new Error(`Failed to find user by auth_id: ${error.message}`);
    }

    return data as UserRecord;
  }

  async updatePhoneVerified(userId: string, phoneNumber: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ is_phone_verified: true, phone_number: phoneNumber })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update phone verified: ${error.message}`);
    }
  }

  async updateEmailVerified(userId: string, email: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ is_email_verified: true, email: email })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update phone verified: ${error.message}`);
    }
  }

  async findOrCreateUser({ authId, email, role, emailVerified }: FindOrCreateUserParams): Promise<UserRecord> {
    const existing = await this.findUserByAuthId(authId);

    if (existing) return existing as UserRecord
    if (!role) {
      throw new Error(`Failed to query user: unspecified role`);
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ auth_id: authId, email, role: role, is_email_verified: emailVerified })
      .select()
      .single();

    if (insertError || !newUser) {
      throw new Error(`Failed to create user: ${insertError?.message}`);
    }

    return newUser as UserRecord;
  }
}