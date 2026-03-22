"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleMapsClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../../config/env");
class GoogleMapsClient {
    http;
    apiKey;
    constructor() {
        this.apiKey = env_1.config.google.mapsApiKey;
        this.http = axios_1.default.create({
            baseURL: env_1.config.google.url,
            timeout: 5000,
        });
    }
    // ─── Geocode address → lat/lng ────────────────────────────────────────────
    async geocode(address) {
        const { data } = await this.http.get('/geocode/json', {
            params: { address, key: this.apiKey },
        });
        if (data.status !== 'OK' || !data.results.length) {
            throw new Error(`Geocoding failed: ${data.status} for address "${address}"`);
        }
        return this.parseGeocodeResult(data.results[0]);
    }
    // ─── Reverse geocode lat/lng → address ───────────────────────────────────
    async reverseGeocode(lat, lng) {
        const { data } = await this.http.get('/geocode/json', {
            params: { latlng: `${lat},${lng}`, key: this.apiKey },
        });
        if (data.status !== 'OK' || !data.results.length) {
            throw new Error(`Reverse geocoding failed: ${data.status} for (${lat}, ${lng})`);
        }
        return this.parseGeocodeResult(data.results[0]);
    }
    // ─── Autocomplete address search ──────────────────────────────────────────
    async autocomplete(input, sessionToken) {
        const { data } = await this.http.get('/place/autocomplete/json', {
            params: {
                input,
                key: this.apiKey,
                types: 'address',
                sessiontoken: sessionToken,
                components: 'country:ca' // 'country:ca|country:us'
            },
        });
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            throw new Error(`Autocomplete failed: ${data.status}`);
        }
        return (data.predictions ?? []).map((p) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text ?? '',
            secondaryText: p.structured_formatting?.secondary_text ?? '',
        }));
    }
    // ─── Resolve place ID → full geocode ─────────────────────────────────────
    async getPlaceDetails(placeId, sessionToken) {
        const { data } = await this.http.get('/place/details/json', {
            params: {
                place_id: placeId,
                fields: 'geometry,formatted_address,address_components',
                key: this.apiKey,
                sessiontoken: sessionToken,
            },
        });
        if (data.status !== 'OK') {
            throw new Error(`Place details failed: ${data.status} for placeId "${placeId}"`);
        }
        const result = data.result;
        return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            placeId,
            components: this.parseAddressComponents(result.address_components ?? []),
        };
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    parseGeocodeResult(result) {
        return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            placeId: result.place_id,
            components: this.parseAddressComponents(result.address_components ?? []),
        };
    }
    parseAddressComponents(components) {
        const get = (type) => components.find((c) => c.types.includes(type))?.long_name;
        return {
            streetNumber: get('street_number'),
            route: get('route'),
            city: get('locality') ?? get('postal_town'),
            state: get('administrative_area_level_1'),
            country: get('country'),
            postalCode: get('postal_code'),
        };
    }
}
exports.GoogleMapsClient = GoogleMapsClient;
//# sourceMappingURL=google-maps.client.js.map