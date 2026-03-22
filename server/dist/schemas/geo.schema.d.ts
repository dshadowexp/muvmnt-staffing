import { z } from 'zod';
export declare const SearchAddressQuery: z.ZodObject<{
    input: z.ZodString;
    sessionToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const SearchAddressReply: z.ZodArray<z.ZodObject<{
    placeId: z.ZodString;
    description: z.ZodString;
    mainText: z.ZodString;
    secondaryText: z.ZodString;
}, z.core.$strip>>;
export declare const GeocodeBody: z.ZodObject<{
    address: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const GeocodePlaceBody: z.ZodObject<{
    placeId: z.ZodString;
    sessionToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const GeocodeReply: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    formattedAddress: z.ZodString;
    placeId: z.ZodString;
    components: z.ZodObject<{
        streetNumber: z.ZodOptional<z.ZodString>;
        route: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const UpdateLocationBody: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const FindNearbyQuery: z.ZodObject<{
    lat: z.ZodCoercedNumber<unknown>;
    lng: z.ZodCoercedNumber<unknown>;
    k: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    entityType: z.ZodEnum<{
        worker: "worker";
        client: "client";
    }>;
    excludeId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const NearbyResultReply: z.ZodArray<z.ZodObject<{
    entityId: z.ZodString;
    entityType: z.ZodEnum<{
        worker: "worker";
        client: "client";
    }>;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    address: z.ZodString;
    cellId: z.ZodString;
    distanceKm: z.ZodNumber;
}, z.core.$strip>>;
export type SearchAddressQueryType = z.infer<typeof SearchAddressQuery>;
export type GeocodeBodyType = z.infer<typeof GeocodeBody>;
export type GeocodePlaceBodyType = z.infer<typeof GeocodePlaceBody>;
export type GeocodeReplyType = z.infer<typeof GeocodeReply>;
export type UpdateLocationBodyType = z.infer<typeof UpdateLocationBody>;
export type FindNearbyQueryType = z.infer<typeof FindNearbyQuery>;
