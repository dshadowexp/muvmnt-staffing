/** True when work authorization is on file for compliance gating (upload or admin-verified). */
export function isWorkAuthorizationSubmitted(wa: {
  file_url: string | null;
  is_verified: boolean;
} | null): boolean {
  if (!wa) return false;
  if (wa.is_verified) return true;
  return typeof wa.file_url === "string" && wa.file_url.trim().length > 0;
}
