import { logger } from '../../config/logger';
import { UserRole } from '../auth/permissions';
import { GoogleMapsClient, PlacePrediction } from './clients/google-maps.client';
import { H3Service } from './clients/h3.client';
import { GeoRepository, LocationRecord } from './geo.repository'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoServiceDeps {
    googleMapsKey: string
}

export interface Location {
  entityId:   string
  entityType: UserRole
  lat:        number
  lng:        number
  address:    string
  cellId:     string
  updatedAt:  string
}

export interface NearbyResult extends Location {
    distanceKm: number
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class GeoService {
    private readonly maps: GoogleMapsClient
    private readonly h3:   H3Service
    private readonly repo: GeoRepository

    constructor() {
        this.maps = new GoogleMapsClient()
        this.h3   = new H3Service()
        this.repo = new GeoRepository()
    }

    // ─── Address autocomplete ─────────────────────────────────────────────────

    async searchAddress(input: string, sessionToken?: string): Promise<PlacePrediction[]> {
        return this.maps.autocomplete(input, sessionToken);
    }

    // ─── Save location ────────────────────────────────────────────────────────

    async saveLocationByAddress(params: {
        entityId:   string
        entityType: UserRole
        address:    string
    }): Promise<Location> {
        const geocoded = await this.maps.geocode(params.address);
        return this.persist({ ...params, lat: geocoded.lat, lng: geocoded.lng, address: geocoded.formattedAddress });
    }

    async saveLocationByPlace(params: {
        entityId:     string
        entityType:   UserRole
        placeId:      string
        sessionToken?: string
    }): Promise<Location> {
        const geocoded = await this.maps.getPlaceDetails(params.placeId, params.sessionToken);
        return this.persist({ ...params, lat: geocoded.lat, lng: geocoded.lng, address: geocoded.formattedAddress });
    }

    async saveLocationByCoords(params: {
        entityId:   string
        entityType: 'worker' | 'client'
        lat:        number
        lng:        number
    }): Promise<Location> {
        const geocoded = await this.maps.reverseGeocode(params.lat, params.lng);
        return this.persist({ ...params, address: geocoded.formattedAddress });
    }

    // ─── Get location ─────────────────────────────────────────────────────────

    async getLocation(entityId: string): Promise<Location | null> {
        const record = await this.repo.findByEntityId(entityId);
        if (!record) return null;
        return this.toLocation(record);
    }

    // ─── Find nearby ──────────────────────────────────────────────────────────
    // k is the gridDisk ring count — see https://h3geo.org/docs/api/traversal#griddiskdistances
    // k=1 → 7 cells, k=2 → 19 cells, k=n → 3n² + 3n + 1 cells

    async findNearby(params: {
        lat:        number
        lng:        number
        k:          number
        entityType: 'worker' | 'client'
        excludeId?: string
    }): Promise<NearbyResult[]> {
        const cells   = this.h3.getCellsInRing(params.lat, params.lng, params.k);
        const records = await this.repo.findInCells({
            cells,
            entityType: params.entityType,
            excludeId:  params.excludeId,
        });

        return records
            .map((r): NearbyResult => ({
                ...this.toLocation(r),
                distanceKm: this.h3.distanceKm(params.lat, params.lng, r.lat, r.lng),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private async persist(params: {
        entityId:   string
        entityType: UserRole
        lat:        number
        lng:        number
        address:    string
    }): Promise<Location> {
        const cellId = this.h3.encode(params.lat, params.lng)

        await this.repo.upsertLocation({ ...params, cellId })

        logger.info(
            { entityId: params.entityId, entityType: params.entityType, cellId },
            'Location saved'
        )

        return {
            entityId:   params.entityId,
            entityType: params.entityType,
            lat:        params.lat,
            lng:        params.lng,
            address:    params.address,
            cellId,
            updatedAt:  new Date().toISOString(),
        }
    }

    private toLocation(r: LocationRecord): Location {
        return {
            entityId:   r.entity_id,
            entityType: r.entity_type,
            lat:        r.lat,
            lng:        r.lng,
            address:    r.address,
            cellId:     r.cell_id,
            updatedAt:  r.updated_at,
        }
    }
}