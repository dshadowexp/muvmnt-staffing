import { BackLink } from "@/components/back-link";
import { NewScreeningForm } from "./_form";

export default function NewScreeningPage() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <BackLink backHref="/app/screenings" title="Back to screenings" />
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Create a new position for screening</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Populate the form below with the details of the position you are looking to fill.
        </p>
      </div>
      <NewScreeningForm />
    </div>
  );
}
