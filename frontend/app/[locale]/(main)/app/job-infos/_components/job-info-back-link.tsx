import { BackLink } from "@/components/back-link";

export function JobInfoBackLink({ jobInfoId }: { jobInfoId: string }) {
    return (
        <BackLink backHref={`/app/job-infos/${jobInfoId}`} title="Staff request" />
    )
}