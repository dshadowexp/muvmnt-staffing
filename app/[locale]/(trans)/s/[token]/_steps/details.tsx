"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CircleDashedIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import type { ScreeningRow, ScreeningCandidateRow } from "@/features/screenings/dal/queries";
import { saveCandidateDetailsAction } from "@/features/screenings/candidate-actions";

type Props = {
  screening: ScreeningRow;
  candidate: ScreeningCandidateRow;
  onComplete: () => void;
};

export function DetailsStep({ screening, candidate, onComplete }: Props) {
  const [firstName, setFirstName] = useState(candidate.first_name ?? "");
  const [lastName, setLastName] = useState(candidate.last_name ?? "");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFirstNameError("");
    setLastNameError("");

    let valid = true;
    if (!firstName.trim()) {
      setFirstNameError("First name is required");
      valid = false;
    }
    if (!lastName.trim()) {
      setLastNameError("Last name is required");
      valid = false;
    }
    if (!valid) return;

    setIsSaving(true);
    const result = await saveCandidateDetailsAction(screening.id, { firstName, lastName });
    setIsSaving(false);

    if (result.error) {
      toast.error(result.message);
      return;
    }

    onComplete();
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center mb-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {screening.title}
          </p>
          <h1 className="text-2xl font-semibold mt-1">Tell us about yourself</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2">
                <UserIcon className="size-5 text-primary" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-base">Your details</CardTitle>
                <CardDescription className="text-sm mt-0.5">
                  This information will be shared with the employer.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSaving}
                    autoFocus
                  />
                  {firstNameError && <FieldError>{firstNameError}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isSaving}
                  />
                  {lastNameError && <FieldError>{lastNameError}</FieldError>}
                </Field>
              </div>

              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input value={candidate.email} disabled />
              </Field>

              <Button type="submit" className="w-full" size="lg" disabled={isSaving}>
                {isSaving && <CircleDashedIcon className="size-4 animate-spin mr-2" />}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>

        <StepProgress current={1} total={4} />
      </div>
    </div>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < current ? "w-8 bg-primary" : "w-4 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}
