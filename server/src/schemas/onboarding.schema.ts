import { z } from 'zod'

const Role       = z.enum(['worker', 'client'])
const StepStatus = z.enum(['complete', 'in_progress', 'available', 'locked'])
const StepIcon   = z.enum(['mail-check', 'user', 'shield-check', 'file-text', 'credit-card', 'building-2', 'badge-check', 'lock'])

// ─── Step shape returned to frontend ─────────────────────────────────────────

const OnboardingStepReply = z.object({
  id:          z.string(),
  title:       z.string(),
  description: z.string(),
  href:        z.string(),
  requires:    z.array(z.string()).optional(),
  icon:        StepIcon,
  estimate:    z.string(),
  status:      StepStatus,
})

// ─── GET /onboarding/progress ─────────────────────────────────────────────────

export const ProgressReply = z.object({
  role:           Role,
  steps:          z.array(OnboardingStepReply),
  totalSteps:     z.number().int(),
  completedSteps: z.number().int(),
  isComplete:     z.boolean(),
})

// ─── POST /onboarding/steps/:stepId/complete ──────────────────────────────────

export const StepParams = z.object({
  stepId: z.string().min(1),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgressReplyType = z.infer<typeof ProgressReply>
export type StepParamsType    = z.infer<typeof StepParams>