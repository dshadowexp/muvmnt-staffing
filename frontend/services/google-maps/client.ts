import axios, { AxiosInstance } from 'axios';
import { env } from '@/data/env/client';

export interface GeocodeResult {
    lat:             number
    lng:             number
    formattedAddress: string
    placeId:         string
    components: {
        streetNumber?: string
        route?:        string
        city?:         string
        state?:        string
        country?:      string
        /** ISO 3166-1 alpha-2 from Google `short_name` */
        countryCode?:  string
        postalCode?:   string
    }
}

export interface PlacePrediction {
    placeId:     string
    description: string
    mainText:    string
    secondaryText: string
}

export class GoogleMapsClient {
    private readonly http: AxiosInstance
    private readonly apiKey: string

    constructor() {
        this.apiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        this.http   = axios.create({
            baseURL: env.NEXT_PUBLIC_GOOGLE_MAPS_URL,
            timeout: 5000,
        });
    }

    // ─── Geocode address → lat/lng ────────────────────────────────────────────

    async geocode(address: string): Promise<GeocodeResult> {
        const { data } = await this.http.get('/geocode/json', {
            params: { address, key: this.apiKey },
        })

        if (data.status !== 'OK' || !data.results.length) {
            throw new Error(`Geocoding failed: ${data.status} for address "${address}"`)
        }

        return this.parseGeocodeResult(data.results[0])
    }

    // ─── Reverse geocode lat/lng → address ───────────────────────────────────

    async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
        const { data } = await this.http.get('/geocode/json', {
            params: { latlng: `${lat},${lng}`, key: this.apiKey },
        })

        if (data.status !== 'OK' || !data.results.length) {
            throw new Error(`Reverse geocoding failed: ${data.status} for (${lat}, ${lng})`)
        }

        return this.parseGeocodeResult(data.results[0])
    }

    // ─── Autocomplete address search ──────────────────────────────────────────

    async autocomplete(input: string, sessionToken?: string): Promise<PlacePrediction[]> {
        const { data } = await this.http.get('/place/autocomplete/json', {
            params: {
                input,
                key:          this.apiKey,
                types:        'address',
                sessiontoken: sessionToken,
                components:   'country:ca' // 'country:ca|country:us'
            },
        })

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            throw new Error(`Autocomplete failed: ${data.status}`)
        }

        return (data.predictions ?? []).map((p: any) => ({
            placeId:       p.place_id,
            description:   p.description,
            mainText:      p.structured_formatting?.main_text ?? '',
            secondaryText: p.structured_formatting?.secondary_text ?? '',
        }))
    }

    // ─── Resolve place ID → full geocode ─────────────────────────────────────

    async getPlaceDetails(placeId: string, sessionToken?: string): Promise<GeocodeResult> {
        const { data } = await this.http.get('/place/details/json', {
            params: {
                place_id:     placeId,
                fields:       'geometry,formatted_address,address_components',
                key:          this.apiKey,
                sessiontoken: sessionToken,
            },
        })

        if (data.status !== 'OK') {
            throw new Error(`Place details failed: ${data.status} for placeId "${placeId}"`)
        }

        const result = data.result
        return {
            lat:              result.geometry.location.lat,
            lng:              result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            placeId,
            components:       this.parseAddressComponents(result.address_components ?? []),
        }
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private parseGeocodeResult(result: any): GeocodeResult {
        return {
            lat:              result.geometry.location.lat,
            lng:              result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            placeId:          result.place_id,
            components:       this.parseAddressComponents(result.address_components ?? []),
        }
    }

    private parseAddressComponents(components: any[]): GeocodeResult['components'] {
        const getLong = (type: string) =>
            components.find((c: any) => c.types.includes(type))?.long_name
        const getShort = (type: string) =>
            components.find((c: any) => c.types.includes(type))?.short_name

        return {
            streetNumber: getLong('street_number'),
            route:        getLong('route'),
            city:         getLong('locality') ?? getLong('postal_town'),
            state:        getLong('administrative_area_level_1'),
            country:      getLong('country'),
            countryCode:  getShort('country'),
            postalCode:   getLong('postal_code'),
        }
    }
}

export const getGoogleMapsClient = new GoogleMapsClient();