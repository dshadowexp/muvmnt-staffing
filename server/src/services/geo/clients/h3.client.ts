import * as h3 from 'h3-js'

// Resolution 8 — ~0.46 km cell edge length
const RESOLUTION = 8

export class H3Service {

    encode(lat: number, lng: number): string {
        return h3.latLngToCell(lat, lng, RESOLUTION)
    }

    decode(cellId: string): { lat: number; lng: number } {
        const [lat, lng] = h3.cellToLatLng(cellId)
        return { lat, lng }
    }

    // Returns all cells within k rings of the origin cell.
    // k is the exact gridDisk k parameter from https://h3geo.org/docs/api/traversal#griddiskdistances
    // k=0 → 1 cell (origin only)
    // k=1 → 7 cells
    // k=2 → 19 cells
    // k=n → 3n² + 3n + 1 cells
    getCellsInRing(lat: number, lng: number, k: number): string[] {
        const origin = h3.latLngToCell(lat, lng, RESOLUTION)
        return h3.gridDisk(origin, k)
    }

    // Exact haversine distance in km
    distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R    = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a    =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}