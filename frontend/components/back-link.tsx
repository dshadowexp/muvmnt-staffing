import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

export function BackLink({ backHref, title, className }: { backHref: string, title: string, className?: string }) {
    return (
        <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn("-ml-3", className)}
        >
            <Link
                href={backHref}
                className="flex gap-2 items-center text-sm text-muted-foreground"
            >
                <ArrowLeft size={15} /> { title }
            </Link>
        </Button>
    )
}