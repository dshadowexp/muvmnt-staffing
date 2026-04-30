import { getTranslations } from "next-intl/server";
import { InterviewHeader } from "../../_components/interview-header";

export default async function UnliveLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  const t = await getTranslations("assessments.interview.unlive");

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_50%_at_10%_0%,hsl(var(--primary))/_0.10,transparent_60%),radial-gradient(55%_55%_at_90%_10%,rgb(59_130_246)_/_0.08,transparent_55%),radial-gradient(45%_45%_at_50%_100%,rgb(139_92_246)_/_0.07,transparent_55%)]" aria-hidden />

      <InterviewHeader
        backHref={`/interviews/${interviewId}`}
        backTitle={t("backToSteps")}
      />

      <div className="relative flex-1">{children}</div>
    </div>
  );
}
