// Static server component — no client JS needed

export function FindWorkHeroDiagram() {
  return (
    <div className="relative flex w-full max-w-sm items-center justify-center mx-auto lg:max-w-md">
      {/* Floating glow behind the card stack */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full space-y-3">

        {/* ── Profile card ── */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-[var(--font-display)] text-base font-extrabold text-primary">
              S
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">Sarah Mensah, RN</p>
              <p className="text-xs text-muted-foreground">ICU · Registered Nurse</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Active
            </span>
          </div>

          {/* Credential pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["BLS", "ACLS", "IV Cert"].map((cert) => (
              <span
                key={cert}
                className="rounded-md border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary"
              >
                {cert}
              </span>
            ))}
            <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              +3 more
            </span>
          </div>
        </div>

        {/* ── Match indicator ── */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <span className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <svg className="size-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Matched
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>

        {/* ── Shift card A ── */}
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 shadow-sm ring-1 ring-primary/10">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Today</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">Sunrise Medical Centre</p>
            </div>
            <span className="rounded-lg border border-primary/20 bg-background px-2 py-1 text-xs font-bold text-primary">
              C$42/hr
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <svg className="size-3 text-primary/60" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              7:00 am – 3:00 pm
            </span>
            <span className="flex items-center gap-1">
              <svg className="size-3 text-primary/60" viewBox="0 0 12 12" fill="none">
                <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.72 3.5 6.5 3.5 6.5s3.5-3.78 3.5-6.5C9.5 2.57 7.93 1 6 1z" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              ICU Ward B
            </span>
          </div>
        </div>

        {/* ── Shift card B — dimmed / upcoming ── */}
        <div className="rounded-2xl border border-border bg-card p-4 opacity-60 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tomorrow</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">Lakeview General</p>
            </div>
            <span className="rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs font-bold text-muted-foreground">
              C$38/hr
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <svg className="size-3" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              3:00 pm – 11:00 pm
            </span>
            <span>ER · Triage</span>
          </div>
        </div>

        {/* ── Earnings strip ── */}
        <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card text-center">
          {[
            { value: "12", label: "Shifts" },
            { value: "4.9★", label: "Rating" },
            { value: "$2.4k", label: "Earned" },
          ].map(({ value, label }) => (
            <div key={label} className="py-3">
              <p className="font-[var(--font-display)] text-sm font-extrabold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
