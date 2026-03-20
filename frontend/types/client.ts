
// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientProfileRow {
    user_id:     string;
    name:        string;
    type: string;
    created_at:  string;
    updated_at:  string;
}
  
export interface ClientProfile {
    userId:     string;
    name:       string;
    type: string;
    createdAt:  string;
    updatedAt:  string;
}
  
  // ─── Mapper ───────────────────────────────────────────────────────────────────
  
export function toProfile(row: ClientProfileRow): ClientProfile {
    return {
      userId:     row.user_id,
      name:       row.name,
      type: row.type,
      createdAt:  row.created_at,
      updatedAt:  row.updated_at,
    };
}
  