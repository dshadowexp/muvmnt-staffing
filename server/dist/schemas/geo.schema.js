"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NearbyResultReply = exports.FindNearbyQuery = exports.UpdateLocationBody = exports.GeocodeReply = exports.GeocodePlaceBody = exports.GeocodeBody = exports.SearchAddressReply = exports.SearchAddressQuery = void 0;
const zod_1 = require("zod");
// ─── Shared ───────────────────────────────────────────────────────────────────
const EntityType = zod_1.z.enum(['worker', 'client']);
const CoordSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
});
// ─── Address search (autocomplete) ───────────────────────────────────────────
exports.SearchAddressQuery = zod_1.z.object({
    input: zod_1.z.string().min(2, 'Search input must be at least 2 characters'),
    sessionToken: zod_1.z.string().optional(),
});
exports.SearchAddressReply = zod_1.z.array(zod_1.z.object({
    placeId: zod_1.z.string(),
    description: zod_1.z.string(),
    mainText: zod_1.z.string(),
    secondaryText: zod_1.z.string(),
}));
// ─── Geocode address ──────────────────────────────────────────────────────────
exports.GeocodeBody = zod_1.z.object({
    address: zod_1.z.string().min(1, 'Address is required'),
    userId: zod_1.z.string().uuid(),
});
// ─── Geocode place ID ─────────────────────────────────────────────────────────
exports.GeocodePlaceBody = zod_1.z.object({
    placeId: zod_1.z.string().min(1, 'Place ID is required'),
    sessionToken: zod_1.z.string().optional(),
});
// ─── Geocode reply (shared) ───────────────────────────────────────────────────
exports.GeocodeReply = zod_1.z.object({
    lat: zod_1.z.number(),
    lng: zod_1.z.number(),
    formattedAddress: zod_1.z.string(),
    placeId: zod_1.z.string(),
    components: zod_1.z.object({
        streetNumber: zod_1.z.string().optional(),
        route: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        state: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
        postalCode: zod_1.z.string().optional(),
    }),
});
// ─── Update location by GPS coords ───────────────────────────────────────────
exports.UpdateLocationBody = CoordSchema.extend({
    userId: zod_1.z.string().uuid(),
});
// ─── Find nearby ──────────────────────────────────────────────────────────────
// k = gridDisk ring count — https://h3geo.org/docs/api/traversal#griddiskdistances
// k=1 → 7 cells, k=2 → 19 cells, k=n → 3n² + 3n + 1 cells
const KParam = zod_1.z.coerce
    .number()
    .int()
    .min(0, 'k must be >= 0')
    .max(50, 'k must be <= 50')
    .default(1);
exports.FindNearbyQuery = zod_1.z.object({
    lat: zod_1.z.coerce.number().min(-90).max(90),
    lng: zod_1.z.coerce.number().min(-180).max(180),
    k: KParam,
    entityType: EntityType,
    excludeId: zod_1.z.string().uuid().optional(),
});
exports.NearbyResultReply = zod_1.z.array(zod_1.z.object({
    entityId: zod_1.z.string(),
    entityType: EntityType,
    lat: zod_1.z.number(),
    lng: zod_1.z.number(),
    address: zod_1.z.string(),
    cellId: zod_1.z.string(),
    distanceKm: zod_1.z.number(),
}));
//# sourceMappingURL=geo.schema.js.map