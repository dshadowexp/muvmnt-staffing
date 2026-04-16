import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Search = { certification?: string };

export default async function CertificationQuizStartPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { certification } = await searchParams;
  const label =
    typeof certification === "string" && certification.trim() !== ""
      ? decodeURIComponent(certification)
      : "this certification";

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
        <Link href="/worker/assessments">← Back to assessments</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Certification assessment</CardTitle>
          <CardDescription>
            Multiple-choice quiz for:{" "}
            <span className="font-medium text-foreground">{label}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            An AI-generated quiz based on the document you uploaded will appear
            here. The questions will reflect the topic of your file so we can
            confirm your knowledge.
          </p>
          <p className="text-xs">This step is not yet available — check back soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
