-- Soft-revoke screening invites with audit columns.
-- Revoking records operator + timestamp; the magic link may still work (product rule).

alter table screening_invites drop constraint if exists screening_invites_status_check;

alter table screening_invites
  add constraint screening_invites_status_check
  check (
    status in (
      'pending',
      'sent',
      'accepted',
      'declined',
      'expired',
      'revoked'
    )
  );

alter table screening_invites
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references users (id) on delete set null;

comment on column screening_invites.revoked_at is
  'When this invite was soft-revoked (audit trail).';
comment on column screening_invites.revoked_by is
  'Operator user who revoked the invite.';
