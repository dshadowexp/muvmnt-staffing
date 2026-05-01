"use client"

import {
  Stethoscope,
  ShieldCheck,
  HeartPulse,
  Users,
  Clock,
  Activity,
  type LucideIcon,
  Sparkles,
} from "lucide-react"

const OUTER_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Stethoscope, label: "Clinical" },
  { icon: ShieldCheck,  label: "Compliance" },
  { icon: HeartPulse,  label: "Patient Care" },
  { icon: Users,       label: "Staffing" },
]

const INNER_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Clock,    label: "Scheduling" },
  { icon: Activity, label: "Monitoring" },
  { icon: Sparkles, label: "Automation" },
]

const OUTER_DURATION = 28
const INNER_DURATION = 18

export function OrbitalVisual() {
  return (
    <div className="relative flex h-[380px] w-[380px] select-none items-center justify-center">

      {/* Orbit rings — border-border is theme-aware */}
      <div className="absolute h-[340px] w-[340px] rounded-full border border-dashed border-border" />
      <div className="absolute h-[200px] w-[200px] rounded-full border border-dashed border-border" />

      {/* Glow behind center */}
      <div className="absolute h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

      {/* Center node — bg-foreground so it inverts correctly in both themes */}
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <LogoIcon className="size-8 text-background" />
      </div>

      {/* Outer ring */}
      {OUTER_ITEMS.map((item, i) => (
        <OrbitItem
          key={item.label}
          radius={170}
          duration={OUTER_DURATION}
          delay={-(i / OUTER_ITEMS.length) * OUTER_DURATION}
          bubbleSize={44}
        >
          <item.icon className="size-[18px]" />
        </OrbitItem>
      ))}

      {/* Inner ring — reverse */}
      {INNER_ITEMS.map((item, i) => (
        <OrbitItem
          key={item.label}
          radius={100}
          duration={INNER_DURATION}
          delay={-(i / INNER_ITEMS.length) * INNER_DURATION}
          reverse
          bubbleSize={36}
        >
          <item.icon className="size-[14px]" />
        </OrbitItem>
      ))}
    </div>
  )
}

function OrbitItem({
  children,
  radius,
  duration,
  delay = 0,
  reverse = false,
  bubbleSize,
}: {
  children: React.ReactNode
  radius: number
  duration: number
  delay?: number
  reverse?: boolean
  bubbleSize: number
}) {
  const direction = reverse ? "reverse" : "normal"

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: `orbit ${duration}s linear ${direction} infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `calc(50% + ${radius}px)`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          animation: `counter ${duration}s linear ${direction} infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        {/* bg-background + border-border = theme-aware bubble */}
        <div
          className="flex items-center justify-center rounded-full border border-border bg-background shadow-sm"
          style={{ width: bubbleSize, height: bubbleSize }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Logo icon inline so orbital-visual has no extra imports ──────────────────

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 980"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M279.192 310.925C275.02 293.639 275.66 275.664 281.054 258.666C286.448 241.668 296.42 226.199 310.047 213.691C323.673 201.184 340.512 192.043 359.002 187.117C377.493 182.192 397.036 181.64 415.82 185.514C426.159 170.641 440.402 158.401 457.236 149.922C474.07 141.444 492.954 137 512.146 137C531.338 137 550.222 141.444 567.056 149.922C583.89 158.401 598.133 170.641 608.472 185.514C627.284 181.623 646.861 182.172 665.381 187.11C683.901 192.048 700.763 201.214 714.397 213.755C728.032 226.297 737.997 241.806 743.365 258.841C748.733 275.876 749.33 293.884 745.1 311.188C761.27 320.698 774.576 333.799 783.794 349.283C793.011 364.768 797.842 382.137 797.842 399.791C797.842 417.444 793.011 434.814 783.794 450.298C774.576 465.783 761.27 478.884 745.1 488.394C749.311 505.672 748.712 523.648 743.357 540.656C738.002 557.664 728.064 573.153 714.467 585.687C700.869 598.221 684.051 607.393 665.571 612.355C647.092 617.316 627.55 617.905 608.758 614.068C598.432 628.998 584.178 641.29 567.315 649.807C550.452 658.323 531.526 662.788 512.289 662.788C493.051 662.788 474.125 658.323 457.262 649.807C440.399 641.29 426.145 628.998 415.82 614.068C397.036 617.942 377.493 617.39 359.002 612.464C340.512 607.539 323.673 598.398 310.047 585.891C296.42 573.383 286.448 557.913 281.054 540.916C275.66 523.918 275.02 505.943 279.192 488.657C262.898 479.172 249.477 466.05 240.177 450.513C230.877 434.976 226 417.527 226 399.791C226 382.054 230.877 364.606 240.177 349.069C249.477 333.531 262.898 320.41 279.192 310.925Z"
        stroke="currentColor"
        strokeWidth="100"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M507.501 943.027L510.996 838.972"
        stroke="currentColor"
        strokeWidth="50"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M120.25 615.667C149.529 678.899 202.77 733.508 272.755 772.093C342.741 810.678 426.088 831.373 511.5 831.373C596.912 831.373 680.259 810.678 750.245 772.093C820.23 733.508 873.471 678.899 902.75 615.667"
        stroke="currentColor"
        strokeWidth="100"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}