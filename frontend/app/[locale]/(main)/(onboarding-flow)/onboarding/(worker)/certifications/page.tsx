import { getCertifications } from "@/features/profile/dal/queries";
import { CertificationsClient } from "./_client";

export default async function CertificationsPage() {
  const certifications = await getCertifications();

  return (
    <>
      <CertificationsClient
        initialCertifications={certifications.map((c) => ({
          name: c.name,
          file_url: c.file_url,
        }))}
      />
    </>
  );
}