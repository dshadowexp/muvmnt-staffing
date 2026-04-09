import { ClientAccountProfile } from "@/features/profile/components/client-account-profile";
import { WorkerAccountProfile } from "@/features/profile/components/worker-account-profile";
import {
  getCertifications,
  getClientProfile,
  getWorkAuthorization,
  getWorkerProfile,
} from "@/features/profile/dal/queries";
import { getAddressLocation } from "@/features/geo/dal/queries";
import { getBillingAccount, getPaymentMethods } from "@/features/billing/dal/queries";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AccountProfilePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  if (session.role === "worker") {
    const [worker, certifications, workAuthorization] = await Promise.all([
      getWorkerProfile(),
      getCertifications(),
      getWorkAuthorization(),
    ]);
    if (!worker) redirect("/onboarding/profile");

    let location: Awaited<ReturnType<typeof getAddressLocation>> | undefined;
    try {
      location = await getAddressLocation();
    } catch {
      location = undefined;
    }

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your worker profile, credentials, and work authorization.
          </p>
        </div>
        <WorkerAccountProfile
          worker={{
            first_name: worker.first_name,
            last_name: worker.last_name,
            date_of_birth: worker.date_of_birth,
            gender: worker.gender,
            profession: worker.profession,
            years_exp: worker.years_exp,
          }}
          location={location ?? null}
          certifications={certifications.map((c) => ({
            name: c.name,
            file_url: c.file_url,
          }))}
          workAuthorization={
            workAuthorization
              ? {
                  type: workAuthorization.type,
                  file_url: workAuthorization.file_url,
                  is_verified: workAuthorization.is_verified === true,
                }
              : null
          }
        />
      </div>
    );
  }

  if (session.role === "client") {
    const clientRow = await getClientProfile();
    let location: Awaited<ReturnType<typeof getAddressLocation>> | undefined;
    try {
      location = await getAddressLocation();
    } catch {
      location = undefined;
    }

    const [pmRes, billingRes] = await Promise.all([
      getPaymentMethods(),
      getBillingAccount(),
    ]);

    const paymentMethods =
      pmRes.error || !pmRes.data ? [] : pmRes.data;
    const billingSummary =
      billingRes.error || !billingRes.data
        ? null
        : { customerId: billingRes.data.customerId };

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Account</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Organization profile, address, and billing.
          </p>
        </div>
        <ClientAccountProfile
          client={
            clientRow
              ? {
                  id: clientRow.id,
                  name: clientRow.name,
                  type: clientRow.type,
                }
              : null
          }
          location={location ?? null}
          paymentMethods={paymentMethods}
          billingSummary={billingSummary}
        />
      </div>
    );
  }

  redirect("/app");
}
