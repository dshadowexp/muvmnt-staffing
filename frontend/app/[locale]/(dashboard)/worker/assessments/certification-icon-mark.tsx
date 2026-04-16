import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { createElement } from "react";
import {
  AwardIcon,
  BabyIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CarIcon,
  CpuIcon,
  GraduationCapIcon,
  HardHatIcon,
  HeartPulseIcon,
  LanguagesIcon,
  ShieldIcon,
  StethoscopeIcon,
  UtensilsCrossedIcon,
  WrenchIcon,
} from "lucide-react";

const FALLBACK_ICONS: LucideIcon[] = [
  AwardIcon,
  GraduationCapIcon,
  ShieldIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CpuIcon,
  WrenchIcon,
];

function stringHash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) + h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function certificationIconForName(name: string): LucideIcon {
  const n = name.trim().toLowerCase();
  if (n.length === 0) return AwardIcon;

  if (
    /cpr|first aid|bls|acls|aed|emr|ems|emt|paramedic|lifeguard|pool op/.test(n)
  ) {
    return HeartPulseIcon;
  }
  if (
    /forklift|whmis|osha|construction|scaffold|rigging|crane|hazmat|confined space|working at heights|working at height/.test(
      n,
    )
  ) {
    return HardHatIcon;
  }
  if (/rn|lpn|rpn|nursing|nclex|medical|clinical|steth|patient care/.test(n)) {
    return StethoscopeIcon;
  }
  if (/food safe|food handler|serve.?safe|chef|kitchen|haccp|cook|culinary/.test(n)) {
    return UtensilsCrossedIcon;
  }
  if (/childcare|ece|early childhood|daycare|infant|toddler/.test(n)) {
    return BabyIcon;
  }
  if (
    /driver|driving|cdl|class [1-5]|\bdz\b|az licence|air brake|transport/.test(n)
  ) {
    return CarIcon;
  }
  if (
    /language|ielts|toefl|tesol|bilingual|french|spanish|interpret|translation/.test(
      n,
    )
  ) {
    return LanguagesIcon;
  }
  if (
    /software|developer|engineer|python|java|react|aws|azure|it |network|security\+|comptia|coding|programming/.test(
      n,
    )
  ) {
    return CpuIcon;
  }
  if (/welding|electrician|plumber|hvac|millwright|machinist|trade|apprentice/.test(n)) {
    return WrenchIcon;
  }
  if (/pmp|project management|agile|scrum|six sigma|lean|itil/.test(n)) {
    return BriefcaseIcon;
  }
  if (/hipaa|pci|iso|compliance|audit|gdpr|cyber|infosec/.test(n)) {
    return ShieldIcon;
  }
  if (/course|certificate|diploma|degree|university|college|training|edu/.test(n)) {
    return GraduationCapIcon;
  }

  return FALLBACK_ICONS[stringHash(n) % FALLBACK_ICONS.length] ?? AwardIcon;
}

const TONE_CLASSES = [
  "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-50",
  "bg-teal-500/15 text-teal-900 dark:bg-teal-400/15 dark:text-teal-50",
  "bg-cyan-500/15 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-50",
] as const;

export function CertificationIconMark({
  name,
  className,
}: {
  /** Certification or skill label; empty uses a generic credential icon. */
  name?: string;
  className?: string;
}) {
  const trimmed = name?.trim() ?? "";
  const icon = certificationIconForName(trimmed);
  const toneIdx =
    trimmed.length > 0 ? stringHash(trimmed) % TONE_CLASSES.length : 0;

  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        TONE_CLASSES[toneIdx],
        className,
      )}
    >
      {createElement(icon, {
        className: "size-5",
        "aria-hidden": true,
      })}
    </div>
  );
}
