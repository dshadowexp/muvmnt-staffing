import { PushTokenRegistrar } from "@/features/notifications/components/push-token-registrar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./_components/app-sidebar";
import { SiteHeader } from "./_components/site-header";

const shellStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties;

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider
            style={shellStyle}
            className="h-svh min-h-0 overflow-hidden"
        >
            <PushTokenRegistrar />
            <AppSidebar />
            <SidebarInset className="min-h-0 flex-1 overflow-hidden">
                <SiteHeader />
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain has-[[data-full-bleed]]:overflow-hidden">
                    <div className="@container/main flex w-full min-w-0 flex-1 flex-col items-center gap-6 px-4 pb-10 pt-4 md:px-6 md:pt-5 has-[[data-full-bleed]]:items-stretch has-[[data-full-bleed]]:gap-0 has-[[data-full-bleed]]:p-0 has-[[data-full-bleed]]:overflow-hidden">
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}