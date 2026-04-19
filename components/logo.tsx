import { SITE_NAME } from "@/lib/constants";
import { Link } from "@/i18n/navigation";

export function Logo({ href = "/" }: { href?: string }) {
    return (
        <Link href={href} className="no-underline">
            <span className="font-[var(--font-display)] text-2xl font-extrabold tracking-tight text-primary">
                {SITE_NAME.toLowerCase()}
                <span className="text-primary/60">.</span>
            </span>
        </Link>
    )
}