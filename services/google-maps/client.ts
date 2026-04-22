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
        countryCode?:  string
        postalCode?:   string
    }
}

export interface PlacePrediction {
    placeId:       string
    description:   string
    mainText:      string
    secondaryText: string
}

export interface DistanceMatrixResult {
    origin:      string
    destination: string
    distance: {
        text:  string
        value: number // metres
    }
    duration: {
        text:  string
        value: number // seconds
    }
}

export class GoogleMapsClient {
    private readonly baseURL: string
    private readonly apiKey:  string

    constructor() {
        this.baseURL = env.NEXT_PUBLIC_GOOGLE_MAPS_URL;
        this.apiKey  = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private async get<T>(path: string, params: Record<string, string>): Promise<T> {
        const url = new URL(path, this.baseURL);
        url.searchParams.set('key', this.apiKey);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

        const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error(`Google Maps request failed: ${response.status} ${response.statusText}`);
        }

        return response.json() as Promise<T>;
    }

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
        const getLong  = (type: string) =>
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

    // ─── Geocode address → lat/lng ────────────────────────────────────────────

    async geocode(address: string): Promise<GeocodeResult> {
        const data = await this.get<any>('/geocode/json', { address });

        if (data.status !== 'OK' || !data.results.length) {
            throw new Error(`Geocoding failed: ${data.status} for address "${address}"`);
        }

        return this.parseGeocodeResult(data.results[0]);
    }

    // ─── Reverse geocode lat/lng → address ───────────────────────────────────

    async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
        const data = await this.get<any>('/geocode/json', { latlng: `${lat},${lng}` });

        if (data.status !== 'OK' || !data.results.length) {
            throw new Error(`Reverse geocoding failed: ${data.status} for (${lat}, ${lng})`);
        }

        return this.parseGeocodeResult(data.results[0]);
    }

    // ─── Autocomplete address search ──────────────────────────────────────────

    async autocomplete(input: string, sessionToken?: string): Promise<PlacePrediction[]> {
        const params: Record<string, string> = {
            input,
            types:      'address',
            components: 'country:ca',
            ...(sessionToken && { sessiontoken: sessionToken }),
        };

        const data = await this.get<any>('/place/autocomplete/json', params);

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            throw new Error(`Autocomplete failed: ${data.status}`);
        }

        return (data.predictions ?? []).map((p: any) => ({
            placeId:       p.place_id,
            description:   p.description,
            mainText:      p.structured_formatting?.main_text ?? '',
            secondaryText: p.structured_formatting?.secondary_text ?? '',
        }));
    }

    // ─── Resolve place ID → full geocode ─────────────────────────────────────

    async getPlaceDetails(placeId: string, sessionToken?: string): Promise<GeocodeResult> {
        const params: Record<string, string> = {
            place_id: placeId,
            fields:   'geometry,formatted_address,address_components',
            ...(sessionToken && { sessiontoken: sessionToken }),
        };

        const data = await this.get<any>('/place/details/json', params);

        if (data.status !== 'OK') {
            throw new Error(`Place details failed: ${data.status} for placeId "${placeId}"`);
        }

        const result = data.result;
        return {
            lat:              result.geometry.location.lat,
            lng:              result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            placeId,
            components:       this.parseAddressComponents(result.address_components ?? []),
        }
    }

    // ─── Distance matrix → driving time ──────────────────────────────────────

    async distanceMatrix(
        origins:      { lat: number; lng: number }[],
        destinations: { lat: number; lng: number }[],
        mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
    ): Promise<DistanceMatrixResult[]> {
        const toLatLng = ({ lat, lng }: { lat: number; lng: number }) => `${lat},${lng}`;
    
        const data = await this.get<any>('/distancematrix/json', {
            origins:      origins.map(toLatLng).join('|'),
            destinations: destinations.map(toLatLng).join('|'),
            mode,
        });
    
        if (data.status !== 'OK') {
            throw new Error(`Distance matrix failed: ${data.status}`);
        }
    
        const results: DistanceMatrixResult[] = [];
    
        data.rows.forEach((row: any, originIndex: number) => {
            row.elements.forEach((element: any, destinationIndex: number) => {
                if (element.status !== 'OK') {
                    throw new Error(
                        `Distance matrix element failed: ${element.status} for (${origins[originIndex].lat},${origins[originIndex].lng}) → (${destinations[destinationIndex].lat},${destinations[destinationIndex].lng})`
                    );
                }
    
                results.push({
                    origin:      data.origin_addresses[originIndex],
                    destination: data.destination_addresses[destinationIndex],
                    distance:    element.distance,
                    duration:    element.duration,
                });
            });
        });
    
        return results;
    }
}

export const getGoogleMapsClient = new GoogleMapsClient();