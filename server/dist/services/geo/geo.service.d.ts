import { PlacePrediction } from './clients/google-maps.client';
export interface GeoServiceDeps {
    googleMapsKey: string;
}
export interface Location {
    userId: string;
    lat: number;
    lng: number;
    address: string;
    cellId: string;
    updatedAt?: string;
}
export interface NearbyResult extends Location {
    distanceKm: number;
}
export declare class GeoService {
    private readonly maps;
    private readonly h3;
    private readonly repo;
    constructor();
    searchAddress(input: string, sessionToken?: string): Promise<PlacePrediction[]>;
    saveLocationByAddress(params: {
        userId: string;
        address: string;
    }): Promise<Location>;
    saveLocationByPlace(params: {
        userId: string;
        placeId: string;
        sessionToken?: string;
        address?: string;
        lat?: number;
        lng?: number;
    }): Promise<Location>;
    saveLocationByCoords(params: {
        userId: string;
        lat: number;
        lng: number;
    }): Promise<Location>;
    getLocation(entityId: string): Promise<Location | null>;
    findNearby(params: {
        lat: number;
        lng: number;
        k: number;
        entityType: 'worker' | 'client';
        excludeId?: string;
    }): Promise<NearbyResult[]>;
    private persist;
    private toLocation;
}
