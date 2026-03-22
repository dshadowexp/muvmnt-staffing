"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const supabase_1 = require("../../config/supabase");
// ─── Repository ───────────────────────────────────────────────────────────────
class AuthRepository {
    constructor() { }
    async findById(id) {
        const { data, error } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null; // row not found
            throw new Error(`Failed to find user by id: ${error.message}`);
        }
        return data;
    }
    async findUserByAuthId(authId) {
        const { data, error } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('auth_id', authId)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null; // row not found
            throw new Error(`Failed to find user by auth_id: ${error.message}`);
        }
        return data;
    }
    async updatePhoneVerified(userId, phoneNumber) {
        const { error } = await supabase_1.supabase
            .from('users')
            .update({ is_phone_verified: true, phone_number: phoneNumber })
            .eq('id', userId);
        if (error) {
            throw new Error(`Failed to update phone verified: ${error.message}`);
        }
    }
    async updateEmailVerified(userId, email) {
        const { error } = await supabase_1.supabase
            .from('users')
            .update({ is_email_verified: true, email: email })
            .eq('id', userId);
        if (error) {
            throw new Error(`Failed to update phone verified: ${error.message}`);
        }
    }
    async findOrCreateUser({ authId, email, role, emailVerified }) {
        const existing = await this.findUserByAuthId(authId);
        if (existing)
            return existing;
        if (!role) {
            throw new Error(`Failed to query user: unspecified role`);
        }
        const { data: newUser, error: insertError } = await supabase_1.supabase
            .from('users')
            .insert({ auth_id: authId, email, role: role, is_email_verified: emailVerified })
            .select()
            .single();
        if (insertError || !newUser) {
            throw new Error(`Failed to create user: ${insertError?.message}`);
        }
        return newUser;
    }
}
exports.AuthRepository = AuthRepository;
//# sourceMappingURL=auth.repository.js.map