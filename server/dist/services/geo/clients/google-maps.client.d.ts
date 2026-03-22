export interface GeocodeResult {
    lat: number;
    lng: number;
    formattedAddress: string;
    placeId: string;
    components: {
        streetNumber?: string;
        route?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
    };
}
export interface PlacePrediction {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
}
export declare class GoogleMapsClient {
    private readonly http;
    private readonly apiKey;
    constructor();
    geocode(address: string): Promise<GeocodeResult>;
    reverseGeocode(lat: number, lng: number): Promise<GeocodeResult>;
    autocomplete(input: string, sessionToken?: string): Promise<PlacePrediction[]>;
    getPlaceDetails(placeId: string, sessionToken?: string): Promise<GeocodeResult>;
    private parseGeocodeResult;
    private parseAddressComponents;
}
