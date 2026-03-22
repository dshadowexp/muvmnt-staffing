export declare class H3Service {
    encode(lat: number, lng: number): string;
    decode(cellId: string): {
        lat: number;
        lng: number;
    };
    getCellsInRing(lat: number, lng: number, k: number): string[];
    distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
    private toRad;
}
