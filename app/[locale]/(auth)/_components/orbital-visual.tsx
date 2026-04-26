"use client"

import {
  Stethoscope,
  ShieldCheck,
  HeartPulse,
  Users,
  Clock,
  Activity,
  type LucideIcon,
} from "lucide-react"
import { LogoIcon } from "@/components/logo-icon"

const OUTER_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Stethoscope, label: "Clinical" },
  { icon: ShieldCheck,  label: "Compliance" },
  { icon: HeartPulse,  label: "Patient Care" },
  { icon: Users,       label: "Staffing" },
]

const INNER_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Clock,    label: "Scheduling" },
  { icon: Activity, label: "Monitoring" },
]

const OUTER_DURATION = 28
const INNER_DURATION = 18

export function OrbitalVisual() {
  return (
    <div className="relative flex h-[380px] w-[380px] items-center justify-center select-none">

      {/* Orbit rings */}
      <div className="absolute h-[340px] w-[340px] rounded-full border border-dashed border-white/15" />
      <div className="absolute h-[200px] w-[200px] rounded-full border border-dashed border-white/15" />

      {/* Glow behind center */}
      <div className="absolute h-24 w-24 rounded-full bg-teal-500/10 blur-2xl" />

      {/* Center node */}
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.6)]">
        <LogoIcon className="size-8" />
      </div>

      {/* Outer ring — 4 items evenly spread using negative delay to pre-position */}
      {OUTER_ITEMS.map((item, i) => (
        <OrbitItem
          key={item.label}
          radius={170}
          duration={OUTER_DURATION}
          delay={-(i / OUTER_ITEMS.length) * OUTER_DURATION}
          bubbleSize={44}
        >
          <item.icon className="size-[18px] text-white/70" />
        </OrbitItem>
      ))}

      {/* Inner ring — 2 items, reverse */}
      {INNER_ITEMS.map((item, i) => (
        <OrbitItem
          key={item.label}
          radius={100}
          duration={INNER_DURATION}
          delay={-(i / INNER_ITEMS.length) * INNER_DURATION}
          reverse
          bubbleSize={36}
        >
          <item.icon className="size-[14px] text-white/70" />
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
    // Sits exactly at center, rotates the full container around origin
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
      {/* Positioned at the radius distance, counter-rotates to stay upright */}
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
        <div
          className="flex items-center justify-center rounded-full bg-zinc-900 border border-white/10 shadow-[0_2px_16px_rgba(0,0,0,0.6)]"
          style={{ width: bubbleSize, height: bubbleSize }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}