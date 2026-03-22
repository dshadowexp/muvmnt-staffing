"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoService = void 0;
const logger_1 = require("../../config/logger");
const google_maps_client_1 = require("./clients/google-maps.client");
const h3_client_1 = require("./clients/h3.client");
const geo_repository_1 = require("./geo.repository");
// ─── Service ──────────────────────────────────────────────────────────────────
class GeoService {
    maps;
    h3;
    repo;
    constructor() {
        this.maps = new google_maps_client_1.GoogleMapsClient();
        this.h3 = new h3_client_1.H3Service();
        this.repo = new geo_repository_1.GeoRepository();
    }
    // ─── Address autocomplete ─────────────────────────────────────────────────
    async searchAddress(input, sessionToken) {
        return this.maps.autocomplete(input, sessionToken);
    }
    // ─── Save location ────────────────────────────────────────────────────────
    async saveLocationByAddress(params) {
        const geocoded = await this.maps.geocode(params.address);
        return this.persist({ ...params, lat: geocoded.lat, lng: geocoded.lng, address: geocoded.formattedAddress });
    }
    async saveLocationByPlace(params) {
        const hasDirectFields = params.address != null && params.lat != null && params.lng != null;
        let lat;
        let lng;
        let address;
        if (hasDirectFields) {
            lat = params.lat;
            lng = params.lng;
            address = params.address;
        }
        else {
            const geocoded = await this.maps.getPlaceDetails(params.placeId, params.sessionToken);
            lat = geocoded.lat;
            lng = geocoded.lng;
            address = geocoded.formattedAddress;
        }
        const cellId = this.h3.encode(lat, lng);
        return {
            userId: params.userId,
            lat,
            lng,
            address,
            cellId,
        };
    }
    async saveLocationByCoords(params) {
        const geocoded = await this.maps.reverseGeocode(params.lat, params.lng);
        return this.persist({ ...params, address: geocoded.formattedAddress });
    }
    // ─── Get location ─────────────────────────────────────────────────────────
    async getLocation(entityId) {
        const record = await this.repo.findByEntityId(entityId);
        if (!record)
            return null;
        return this.toLocation(record);
    }
    // ─── Find nearby ──────────────────────────────────────────────────────────
    // k is the gridDisk ring count — see https://h3geo.org/docs/api/traversal#griddiskdistances
    // k=1 → 7 cells, k=2 → 19 cells, k=n → 3n² + 3n + 1 cells
    async findNearby(params) {
        const cells = this.h3.getCellsInRing(params.lat, params.lng, params.k);
        const records = await this.repo.findInCells({
            cells,
            entityType: params.entityType,
            excludeId: params.excludeId,
        });
        return records
            .map((r) => ({
            ...this.toLocation(r),
            distanceKm: this.h3.distanceKm(params.lat, params.lng, r.lat, r.lng),
        }))
            .sort((a, b) => a.distanceKm - b.distanceKm);
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    async persist(params) {
        console.log(params);
        const cellId = this.h3.encode(params.lat, params.lng);
        await this.repo.upsertLocation({ ...params, cellId });
        logger_1.logger.info({ userId: params.userId, cellId }, 'Location saved');
        return {
            userId: params.userId,
            lat: params.lat,
            lng: params.lng,
            address: params.address,
            cellId,
            updatedAt: new Date().toISOString(),
        };
    }
    toLocation(r) {
        return {
            userId: r.user_id,
            lat: r.lat,
            lng: r.lng,
            address: r.address,
            cellId: r.cell_id,
            updatedAt: r.updated_at,
        };
    }
}
exports.GeoService = GeoService;
//# sourceMappingURL=geo.service.js.map