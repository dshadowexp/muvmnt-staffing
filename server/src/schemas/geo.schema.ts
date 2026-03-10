import { z } from 'zod'

// ─── Shared ───────────────────────────────────────────────────────────────────

export const ErrorReply = z.object({
    statusCode: z.number(),
    error:      z.string(),
    message:    z.string(),
})

const EntityType = z.enum(['worker', 'client'])

const CoordSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
})

// ─── Address search (autocomplete) ───────────────────────────────────────────

export const SearchAddressQuery = z.object({
    input:        z.string().min(2, 'Search input must be at least 2 characters'),
    sessionToken: z.string().optional(),
})

export const SearchAddressReply = z.array(
    z.object({
        placeId:       z.string(),
        description:   z.string(),
        mainText:      z.string(),
        secondaryText: z.string(),
    })
)

// ─── Geocode address ──────────────────────────────────────────────────────────

export const GeocodeBody = z.object({
    address:    z.string().min(1, 'Address is required'),
    entityId:   z.string().uuid(),
    entityType: EntityType,
})

// ─── Geocode place ID ─────────────────────────────────────────────────────────

export const GeocodePlaceBody = z.object({
    placeId:      z.string().min(1, 'Place ID is required'),
    entityId:     z.string().uuid(),
    entityType:   EntityType,
    sessionToken: z.string().optional(),
})

// ─── Geocode reply (shared) ───────────────────────────────────────────────────

export const GeocodeReply = z.object({
    lat:             z.number(),
    lng:             z.number(),
    formattedAddress: z.string(),
    placeId:         z.string(),
    components: z.object({
        streetNumber: z.string().optional(),
        route:        z.string().optional(),
        city:         z.string().optional(),
        state:        z.string().optional(),
        country:      z.string().optional(),
        postalCode:   z.string().optional(),
    }),
})

// ─── Update location by GPS coords ───────────────────────────────────────────

export const UpdateLocationBody = CoordSchema.extend({
    entityId:   z.string().uuid(),
    entityType: EntityType,
})

// ─── Find nearby ──────────────────────────────────────────────────────────────

// k = gridDisk ring count — https://h3geo.org/docs/api/traversal#griddiskdistances
// k=1 → 7 cells, k=2 → 19 cells, k=n → 3n² + 3n + 1 cells
const KParam = z.coerce
    .number()
    .int()
    .min(0, 'k must be >= 0')
    .max(50, 'k must be <= 50')
    .default(1)

export const FindNearbyQuery = z.object({
    lat:        z.coerce.number().min(-90).max(90),
    lng:        z.coerce.number().min(-180).max(180),
    k:          KParam,
    entityType: EntityType,
    excludeId:  z.string().uuid().optional(),
})

export const NearbyResultReply = z.array(
    z.object({
        entityId:   z.string(),
        entityType: EntityType,
        lat:        z.number(),
        lng:        z.number(),
        address:    z.string(),
        cellId:     z.string(),
        distanceKm: z.number(),
    })
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type ErrorReplyType              = z.infer<typeof ErrorReply>
export type SearchAddressQueryType      = z.infer<typeof SearchAddressQuery>
export type GeocodeBodyType             = z.infer<typeof GeocodeBody>
export type GeocodePlaceBodyType        = z.infer<typeof GeocodePlaceBody>
export type GeocodeReplyType            = z.infer<typeof GeocodeReply>
export type UpdateLocationBodyType      = z.infer<typeof UpdateLocationBody>
export type FindNearbyQueryType = z.infer<typeof FindNearbyQuery>