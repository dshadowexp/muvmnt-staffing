"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    number: "01",
    phase: "Interview",
    title: "AI-Led Interview",
    description:
      "Complete a guided AI interview covering your resume and professional experience. It's conversational, fair, and done entirely online.",
    color: "from-teal-500/20 to-teal-600/10",
    accent: "bg-teal-500",
    textAccent: "text-teal-400",
    borderAccent: "border-teal-500/30",
  },
  {
    number: "02",
    phase: "Review",
    title: "Performance Review",
    description:
      "Our team reviews your interview. If you pass, you move forward. If not, you're welcome to try again in two weeks.",
    color: "from-sky-500/20 to-sky-600/10",
    accent: "bg-sky-500",
    textAccent: "text-sky-400",
    borderAccent: "border-sky-500/30",
    branch: true,
  },
  {
    number: "03",
    phase: "Compliance",
    title: "Submit Your Documents",
    description:
      "Provide your work authorization, complete identity verification, and upload any required healthcare compliance documents.",
    color: "from-violet-500/20 to-violet-600/10",
    accent: "bg-violet-500",
    textAccent: "text-violet-400",
    borderAccent: "border-violet-500/30",
  },
  {
    number: "04",
    phase: "Compliance Review",
    title: "Documents Reviewed",
    description:
      "We review everything you've submitted. If anything needs clarifying, we'll reach out directly. Otherwise, you're cleared to continue.",
    color: "from-amber-500/20 to-amber-600/10",
    accent: "bg-amber-500",
    textAccent: "text-amber-400",
    borderAccent: "border-amber-500/30",
  },
  {
    number: "05",
    phase: "Setup",
    title: "Set Availability & Payroll",
    description:
      "Tell us when you're available for shifts and connect your payout account so you're ready to get paid from day one.",
    color: "from-orange-500/20 to-orange-600/10",
    accent: "bg-orange-500",
    textAccent: "text-orange-400",
    borderAccent: "border-orange-500/30",
  },
  {
    number: "06",
    phase: "Active",
    title: "Receive Shifts & Get Paid",
    description:
      "Start receiving shift requests, complete them with care, and watch your earnings land in your account.",
    color: "from-emerald-500/20 to-emerald-600/10",
    accent: "bg-emerald-500",
    textAccent: "text-emerald-400",
    borderAccent: "border-emerald-500/30",
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof STEPS)[0];
  index: number;
}) {
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

  const isEven = index % 2 === 1;

  return (
    <div
      ref={ref}
      className="relative"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0)"
          : `translateY(${24}px)`,
        transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
      }}
    >
      {/* connector line on desktop */}
      {index < STEPS.length - 1 && (
        <div
          className={`absolute bottom-0 left-1/2 hidden h-6 w-px -translate-x-1/2 translate-y-full lg:block ${step.accent} opacity-30`}
          style={{ zIndex: 0 }}
        />
      )}

      <div
        className={`relative rounded-2xl border bg-gradient-to-br p-5 ${step.color} ${step.borderAccent} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
      >
        {/* step number badge */}
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

        {/* branch indicator for step 2 */}
        {step.branch && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-xs text-white/40">
              ✓ Pass → continue &nbsp;·&nbsp; ✗ Retry in 2 weeks
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="border-t bg-[var(--charcoal)] px-6 py-16 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
            How it works
          </p>
          <h2 className="font-[var(--font-display)] text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold tracking-tight text-white">
            Your path from application to{" "}
            <span className="text-[var(--teal-mid)]">first shift</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-white/50">
            A clear, structured process so you always know where you stand and what comes next.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
