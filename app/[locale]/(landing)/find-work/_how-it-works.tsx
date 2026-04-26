"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/* Style config — parallel to the 6 i18n steps (index-matched). */
const STEP_STYLES = [
  {
    number: "01",
    color: "from-teal-500/20 to-teal-600/10",
    accent: "bg-teal-500",
    textAccent: "text-teal-400",
    borderAccent: "border-teal-500/30",
  },
  {
    number: "02",
    color: "from-sky-500/20 to-sky-600/10",
    accent: "bg-sky-500",
    textAccent: "text-sky-400",
    borderAccent: "border-sky-500/30",
  },
  {
    number: "03",
    color: "from-violet-500/20 to-violet-600/10",
    accent: "bg-violet-500",
    textAccent: "text-violet-400",
    borderAccent: "border-violet-500/30",
  },
  {
    number: "04",
    color: "from-amber-500/20 to-amber-600/10",
    accent: "bg-amber-500",
    textAccent: "text-amber-400",
    borderAccent: "border-amber-500/30",
  },
  {
    number: "05",
    color: "from-orange-500/20 to-orange-600/10",
    accent: "bg-orange-500",
    textAccent: "text-orange-400",
    borderAccent: "border-orange-500/30",
  },
  {
    number: "06",
    color: "from-emerald-500/20 to-emerald-600/10",
    accent: "bg-emerald-500",
    textAccent: "text-emerald-400",
    borderAccent: "border-emerald-500/30",
  },
] as const;

type I18nStep = {
  phase: string;
  title: string;
  description: string;
  branchLabel?: string;
};

type Step = (typeof STEP_STYLES)[number] & I18nStep;

function StepCard({ step, index, total }: { step: Step; index: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${24}px)`,
        transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
      }}
    >
      {/* connector line on desktop */}
      {index < total - 1 && (
        <div
          className={`absolute bottom-0 left-1/2 hidden h-6 w-px -translate-x-1/2 translate-y-full lg:block ${step.accent} opacity-30`}
          style={{ zIndex: 0 }}
        />
      )}

      <div
        className={`relative rounded-2xl border bg-gradient-to-br p-5 ${step.color} ${step.borderAccent} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
      >
        {/* phase badge + step number */}
        <div className="mb-4 flex items-center justify-between">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${step.textAccent} bg-white/5`}
          >
            {step.phase}
          </span>
          <span className="font-[var(--font-display)] text-2xl font-extrabold text-white/10">
            {step.number}
          </span>
        </div>

        <div className={`mb-3 h-0.5 w-8 rounded-full ${step.accent}`} />

        <h3 className="mb-2 font-[var(--font-display)] text-base font-bold text-white">
          {step.title}
        </h3>
        <p className="text-sm font-light leading-relaxed text-white/60">
          {step.description}
        </p>

        {/* branch indicator — only rendered when translation provides branchLabel */}
        {step.branchLabel && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-xs text-white/40">{step.branchLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const t = useTranslations("findWork");
  const i18nSteps = t.raw("howSteps") as I18nStep[];

  const steps: Step[] = STEP_STYLES.map((style, i) => ({
    ...style,
    ...(i18nSteps[i] ?? {}),
  }));

  return (
    <section className="border-t bg-[var(--charcoal)] px-6 py-16 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
            {t("howOverline")}
          </p>
          <h2 className="font-[var(--font-display)] text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold tracking-tight text-white">
            {t("howTitle").replace(t("howTitleAccent"), "").trim()}{" "}
            <span className="text-[var(--teal-mid)]">{t("howTitleAccent")}</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-white/50">
            {t("howSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} total={steps.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
