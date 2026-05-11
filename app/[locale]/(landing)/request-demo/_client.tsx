"use client";

import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { getCalApi } from "@calcom/embed-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
  linkDemoCalBookingAction,
  submitDemoLeadAction,
} from "@/app/[locale]/(landing)/request-demo/_actions";

const CAL_NAMESPACE =
  process.env.NEXT_PUBLIC_CAL_COM_NAMESPACE?.trim() || "30min";
const CAL_LINK =
  process.env.NEXT_PUBLIC_CAL_COM_LINK?.trim() || "samkofi-appiahkubi/30min";

type StaffSizeOpt = { value: string; label: string };
type CountryOpt = { value: string; label: string };
type ProductInterestOpt = { value: string; label: string };

function buildSchema(
  tVal: (key: string) => string,
  staffSizes: StaffSizeOpt[],
  countries: CountryOpt[],
  productInterests: ProductInterestOpt[],
) {
  const sizeValues = new Set(staffSizes.map((o) => o.value));
  const countryValues = new Set(countries.map((o) => o.value));
  const productValues = new Set(productInterests.map((o) => o.value));
  return z.object({
    email: z.email(tVal("emailInvalid")),
    firstName: z.string().min(1, tVal("firstNameRequired")),
    lastName: z.string().min(1, tVal("lastNameRequired")),
    companyName: z.string().min(1, tVal("companyRequired")),
    jobTitle: z.string().min(1, tVal("jobTitleRequired")),
    staffSize: z.string().refine((v) => sizeValues.has(v), tVal("staffSizeRequired")),
    country: z.string().refine((v) => countryValues.has(v), tVal("countryRequired")),
    productInterest: z.string().refine((v) => productValues.has(v), tVal("productInterestRequired")),
  });
}

export function RequestDemoForm() {
  const t = useTranslations("requestDemo.form");
  const tVal = useTranslations("requestDemo.form.validation");
  const staffSizes = t.raw("staffSizes") as StaffSizeOpt[];
  const countries = t.raw("countries") as CountryOpt[];
  const productInterests = t.raw("productInterests") as ProductInterestOpt[];

  const schema = useMemo(
    () => buildSchema(tVal, staffSizes, countries, productInterests),
    [tVal, JSON.stringify(staffSizes), JSON.stringify(countries), JSON.stringify(productInterests)],
  );
  type FormValues = z.infer<ReturnType<typeof buildSchema>>;

  const leadIdRef = useRef<string | null>(null);
  const emailRef = useRef<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      companyName: "",
      jobTitle: "",
      staffSize: "",
      country: "",
      productInterest: "",
    },
  });

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const cal = await getCalApi({ namespace: CAL_NAMESPACE });
        if (!alive) return;
        cal("ui", {
          hideEventTypeDetails: false,
          layout: "month_view",
        });
        cal("on", {
          action: "bookingSuccessfulV2",
          callback: (e) => {
            const uid = e.detail.data?.uid;
            const leadId = leadIdRef.current;
            const email = emailRef.current;
            if (!uid || !leadId || !email) return;
            void linkDemoCalBookingAction({
              leadId,
              email,
              bookingUid: uid,
            }).then((r) => {
              if (!r.ok) {
                toast.error(t("linkBookingError"));
              }
            });
          },
        });
      } catch {
        toast.error(t("calInitError"));
      }
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  async function onSubmit(values: FormValues) {
    const email = values.email.trim().toLowerCase();
    const res = await submitDemoLeadAction({
      email,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      companyName: values.companyName.trim(),
      jobTitle: values.jobTitle.trim(),
      staffSize: values.staffSize,
      country: values.country,
      productInterest: values.productInterest,
    });

    if (!res.ok) {
      toast.error(t("saveError"));
      return;
    }

    leadIdRef.current = res.leadId;
    emailRef.current = email;

    try {
      const cal = await getCalApi({ namespace: CAL_NAMESPACE });
      const displayName = `${values.firstName.trim()} ${values.lastName.trim()}`;
      cal("modal", {
        calLink: CAL_LINK,
        config: {
          name: displayName,
          email,
          layout: "month_view",
        },
      });
      reset();
    } catch {
      toast.error(t("calOpenError"));
    }
  }

  return (
    <CardContent className="p-7">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="demo-email">
              {t("emailLabel")} <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="demo-email"
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              disabled={isSubmitting}
              aria-invalid={!!errors.email || undefined}
              {...register("email")}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="demo-first">
                {t("firstNameLabel")}{" "}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="demo-first"
                autoComplete="given-name"
                placeholder={t("firstNamePlaceholder")}
                disabled={isSubmitting}
                {...register("firstName")}
              />
              <FieldError>{errors.firstName?.message}</FieldError>
            </Field>
            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="demo-last">
                {t("lastNameLabel")}{" "}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="demo-last"
                autoComplete="family-name"
                placeholder={t("lastNamePlaceholder")}
                disabled={isSubmitting}
                {...register("lastName")}
              />
              <FieldError>{errors.lastName?.message}</FieldError>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.companyName}>
              <FieldLabel htmlFor="demo-company">
                {t("companyLabel")}{" "}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="demo-company"
                autoComplete="organization"
                placeholder={t("companyPlaceholder")}
                disabled={isSubmitting}
                {...register("companyName")}
              />
              <FieldError>{errors.companyName?.message}</FieldError>
            </Field>
            <Field data-invalid={!!errors.jobTitle}>
              <FieldLabel htmlFor="demo-job">
                {t("jobTitleLabel")}{" "}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="demo-job"
                autoComplete="organization-title"
                placeholder={t("jobTitlePlaceholder")}
                disabled={isSubmitting}
                {...register("jobTitle")}
              />
              <FieldError>{errors.jobTitle?.message}</FieldError>
            </Field>
          </div>

          <Field data-invalid={!!errors.staffSize}>
            <FieldLabel>
              {t("staffSizeLabel")}{" "}
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              value={watch("staffSize")}
              onValueChange={(v) => setValue("staffSize", v, { shouldValidate: true })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {staffSizes.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.staffSize?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.country}>
            <FieldLabel>
              {t("countryLabel")}{" "}
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              value={watch("country")}
              onValueChange={(v) => setValue("country", v, { shouldValidate: true })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="max-h-[min(280px,60vh)]">
                {countries.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.country?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>
              {t("productInterestLabel")}{" "}
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              value={watch("productInterest")}
              onValueChange={(v) => setValue("productInterest", v, { shouldValidate: true })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("productInterestPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {productInterests.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.productInterest?.message}</FieldError>
          </Field>

          <p className="text-[0.75rem] leading-relaxed text-muted-foreground">
            {t.rich("privacyNotice", {
              cta: (chunks) => (
                <span className="font-semibold text-foreground">{chunks}</span>
              ),
              policy: (chunks) => (
                <Link
                  href="/privacy"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            <LoadingSwap isLoading={isSubmitting}>
              <span>{t("submit")}</span>
            </LoadingSwap>
          </Button>
        </FieldGroup>
      </form>
    </CardContent>
  );
}
