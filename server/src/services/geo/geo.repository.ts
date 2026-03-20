import { supabase } from '../../config/supabase';

export interface LocationRecord {
    user_id:     string
    lat:         number
    lng:         number
    address:     string
    cell_id:     string
    updated_at:  string
}

interface UpsertLocationParams {
    userId:     string
    lat:        number
    lng:        number
    address:    string
    cellId:     string
}

export class GeoRepository {
    constructor() {}

    async upsertLocation(params: UpsertLocationParams): Promise<void> {
        console.log(params);
        const { error } = await supabase
            .from('locations')
            .upsert(
                {
                    user_id:     params.userId,
                    lat:         params.lat,
                    lng:         params.lng,
                    address:     params.address,
                    cell_id:     params.cellId,
                },
                { onConflict: 'user_id' }
            );

        if (error) throw new Error(`Failed to upsert location: ${error.message}`);
    }

    async findByUserId(userId: string): Promise<LocationRecord | null> {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) return null;
        return data as LocationRecord;
    }

    /** @deprecated Use findByUserId. Kept for compatibility with entityId (userId) in routes. */
    async findByEntityId(entityId: string): Promise<LocationRecord | null> {
        return this.findByUserId(entityId);
    }

    async findInCells(params: {
        cells:      string[]
        entityType: 'worker' | 'client'
        excludeId?: string
    }): Promise<LocationRecord[]> {
        let query = supabase
            .from('locations')
            .select('*')
            .in('cell_id', params.cells)
            .eq('entity_type', params.entityType);

        if (params.excludeId) {
            query = query.neq('entity_id', params.excludeId);
        }

        const { data, error } = await query;
        if (error) throw new Error(`Failed to find locations in cells: ${error.message}`);
        return (data ?? []) as LocationRecord[];
    }
}