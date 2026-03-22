export interface LocationRecord {
    user_id: string;
    lat: number;
    lng: number;
    address: string;
    cell_id: string;
    updated_at: string;
}
interface UpsertLocationParams {
    userId: string;
    lat: number;
    lng: number;
    address: string;
    cellId: string;
}
export declare class GeoRepository {
    constructor();
    upsertLocation(params: UpsertLocationParams): Promise<void>;
    findByUserId(userId: string): Promise<LocationRecord | null>;
    /** @deprecated Use findByUserId. Kept for compatibility with entityId (userId) in routes. */
    findByEntityId(entityId: string): Promise<LocationRecord | null>;
    findInCells(params: {
        cells: string[];
        entityType: 'worker' | 'client';
        excludeId?: string;
    }): Promise<LocationRecord[]>;
}
export {};
