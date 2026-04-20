import { AppSidebar } from "@/app/[locale]/dashboard/_components/app-sidebar";
import { PushTokenRegistrar } from "@/app/[locale]/dashboard/_components/push-token-registrar";
import { SiteHeader } from "@/app/[locale]/dashboard/_components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const shellStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider
            style={shellStyle}
            className="h-svh min-h-0 overflow-hidden"
        >
            <PushTokenRegistrar />
            <AppSidebar variant="inset" />
            <SidebarInset className="min-h-0 flex-1 overflow-hidden">
                <SiteHeader />
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                    <div className="@container/main flex w-full min-w-0 flex-1 flex-col items-stretch gap-6 px-4 pb-10 pt-4 md:px-6 md:pt-5 [&>*]:!max-w-none">
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}