"use client";

import { useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowRight, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { cn } from "@/lib/utils";

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

/** sessionStorage key read by the authenticated staff-request wizard to prefill. */
export const PENDING_STAFF_REQUEST_KEY = "muvmnt:pending-staff-request";

export function FindStaffForm() {
  const router = useRouter();
  const t = useTranslations("findStaff.form");
  const tCommon = useTranslations("common");

  const schema = useMemo(
    () =>
      z
        .object({
          positions: z.coerce
            .number()
            .int()
            .min(1, t("validation.positionsMin"))
            .max(50, t("validation.positionsMax")),
          startDate: z.date({ error: t("validation.startDateRequired") }),
          endDate: z.date().optional().nullable(),
          startTime: z.string().regex(timeRegex, t("validation.timeFormat")),
          endTime: z.string().regex(timeRegex, t("validation.timeFormat")),
        })
        .refine((d) => !d.endDate || d.endDate >= d.startDate, {
          message: t("validation.endAfterStart"),
          path: ["endDate"],
        })
        .refine(
          (d) => {
            const [sh, sm] = d.startTime.split(":").map(Number);
            const [eh, em] = d.endTime.split(":").map(Number);
            return eh * 60 + em > sh * 60 + sm;
          },
          { message: t("validation.endAfterStartTime"), path: ["endTime"] },
        ),
    [t],
  );

  type FindStaffValues = z.infer<typeof schema>;

  const defaults = useMemo<Partial<FindStaffValues>>(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      positions: 1,
      startDate: tomorrow,
      endDate: null,
      startTime: "09:00",
      endTime: "17:00",
    };
  }, []);

  const form = useForm<FindStaffValues>({
    resolver: zodResolver(schema) as Resolver<FindStaffValues>,
    defaultValues: defaults as FindStaffValues,
  });

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  async function onSubmit(values: FindStaffValues) {
    try {
      if (typeof window !== "undefined") {
        const payload = {
          positions: values.positions,
          startDate: values.startDate.toISOString(),
          endDate: values.endDate ? values.endDate.toISOString() : null,
          startTime: values.startTime,
          endTime: values.endTime,
          savedAt: new Date().toISOString(),
        };
        window.sessionStorage.setItem(
          PENDING_STAFF_REQUEST_KEY,
          JSON.stringify(payload),
        );
      }
    } catch {
      /* sessionStorage may be unavailable; continue regardless */
    }
    const target = `/sign-up?as=client&redirect=${encodeURIComponent(
      "/client/requests/new",
    )}`;
    router.push(target as Parameters<typeof router.push>[0]);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.positions}>
          <FieldLabel htmlFor="fs-positions">{t("positions")}</FieldLabel>
          <Input
            id="fs-positions"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            {...register("positions", { valueAsNumber: true })}
          />
          <FieldError>{errors.positions?.message}</FieldError>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.startDate}>
            <FieldLabel>{t("startDate")}</FieldLabel>
            <DatePicker
              value={startDate}
              onChange={(d) => {
                if (d) setValue("startDate", d, { shouldValidate: true });
              }}
              minDate={new Date(new Date().setHours(0, 0, 0, 0))}
              placeholder={tCommon("pickADate")}
              clearLabel={tCommon("clear")}
            />
            <FieldError>{errors.startDate?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.endDate}>
            <FieldLabel>{t("endDate")}</FieldLabel>
            <DatePicker
              value={endDate ?? undefined}
              onChange={(d) =>
                setValue("endDate", d ?? null, { shouldValidate: true })
              }
              minDate={startDate}
              placeholder={t("endDatePlaceholder")}
              clearLabel={tCommon("clear")}
              allowClear
            />
            <FieldError>{errors.endDate?.message}</FieldError>
          </Field>
        </div>

        <FieldDescription>{t("help")}</FieldDescription>
      </FieldGroup>

      <Button
        type="submit"
        size="lg"
        className="mt-6 w-full"
        disabled={isSubmitting}
      >
        <LoadingSwap isLoading={isSubmitting}>
          <span className="inline-flex items-center gap-2">
            {t("submit")}
            <ArrowRight className="size-4" />
          </span>
        </LoadingSwap>
      </Button>

      <p className="mt-3 text-center text-xs font-light text-muted-foreground">
        {t("haveAccount")}{" "}
        <a
          href={`/sign-in?redirect=${encodeURIComponent("/client/requests/new")}`}
          className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
        >
          {t("signIn")}
        </a>
      </p>
    </form>
  );
}

function DatePicker({
  value,
  onChange,
  minDate,
  placeholder,
  clearLabel,
  allowClear = false,
}: {
  value: Date | undefined;
  onChange: (d: Date | null) => void;
  minDate?: Date;
  placeholder: string;
  clearLabel: string;
  allowClear?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {value ? format(value, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => onChange(d ?? (allowClear ? null : value ?? null))}
          disabled={minDate ? (d) => d < minDate : undefined}
        />
        {allowClear && value ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange(null)}
            >
              {clearLabel}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
