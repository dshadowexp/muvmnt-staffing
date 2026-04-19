/** One saved compliance row from `compliances` (shared by onboarding + worker dashboard). */
export type ComplianceDocumentSavedRow = {
  id: string;
  name: string;
  fileUrl: string | null;
  isVerified: boolean;
  createdAt: string;
};
