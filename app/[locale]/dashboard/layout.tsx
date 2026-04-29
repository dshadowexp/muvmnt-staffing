import { AppSidebar } from "@/app/[locale]/dashboard/_components/app-sidebar";
import { PushTokenRegistrar } from "@/features/notifications/components/push-token-registrar";
import { SiteHeader } from "@/app/[locale]/dashboard/_components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSession } from "@/lib/get-session";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { resolveWorkerPhotoSrc } from "@/features/shifts/lib/resolve-worker-photo-url";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

const shellStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const session = await getSession();
    if (!session) return redirect({ href: "/sign-in", locale });
    let avatarSrc: string | null = null;
    let displayName: string | null = null;

    if (session?.role === "worker") {
        const profile = await getWorkerProfile();
        avatarSrc = await resolveWorkerPhotoSrc(profile?.photo_url);
        displayName = profile?.first_name + ' ' + profile?.last_name;;
    }

    return (
        <SidebarProvider
            style={shellStyle}
            className="h-svh min-h-0 overflow-hidden"
        >
            <PushTokenRegistrar />
            <AppSidebar variant="inset" avatarSrc={avatarSrc} displayName={displayName} />
            <SidebarInset className="min-h-0 flex-1 overflow-hidden">
                <SiteHeader avatarSrc={avatarSrc} displayName={displayName} />
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain has-[[data-full-bleed]]:overflow-hidden">
                    <div className="@container/main flex w-full min-w-0 flex-1 flex-col items-center gap-6 px-4 pb-10 pt-4 md:px-6 md:pt-5 has-[[data-full-bleed]]:items-stretch has-[[data-full-bleed]]:gap-0 has-[[data-full-bleed]]:p-0 has-[[data-full-bleed]]:overflow-hidden">
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}