import { z } from 'zod'

// ─── Body for creating/updating a worker profile ──────────────────────────────

export const WorkerProfileBody = z.object({
  firstName:       z.string().min(1),
  lastName:        z.string().min(1),
  dateOfBirth:     z.string().min(1), // ISO date string from frontend
  addressLine1:    z.string().min(1),
  addressLine2:    z.string().optional().nullable(),
  city:            z.string().min(1),
  province:        z.string().min(1),
  postalCode:      z.string().min(1),
  role:            z.string().min(1),
  yearsExperience: z.string().min(1),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerProfileBodyType = z.infer<typeof WorkerProfileBody>

