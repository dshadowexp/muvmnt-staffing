import { z } from 'zod'

// ─── Body for creating/updating a client profile ──────────────────────────────

export const ClientProfileBody = z.object({
  name:         z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional().nullable(),
  city:         z.string().min(1),
  province:     z.string().min(1),
  postalCode:   z.string().min(1),
  clientType:   z.string().min(1), // maps to web WorkSetting type
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientProfileBodyType = z.infer<typeof ClientProfileBody>

