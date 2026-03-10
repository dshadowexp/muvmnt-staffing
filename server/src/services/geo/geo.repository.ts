import { supabase } from '../../config/supabase';

export interface LocationRecord {
    entity_id:   string
    entity_type: 'worker' | 'client'
    lat:         number
    lng:         number
    address:     string
    cell_id:     string
    updated_at:  string
}

interface UpsertLocationParams {
    entityId:   string
    entityType: 'worker' | 'client'
    lat:        number
    lng:        number
    address:    string
    cellId:     string
}

export class GeoRepository {
    constructor() {}

    async upsertLocation(params: UpsertLocationParams): Promise<void> {
        const { error } = await supabase
            .from('locations')
            .upsert(
                {
                    entity_id:   params.entityId,
                    entity_type: params.entityType,
                    lat:         params.lat,
                    lng:         params.lng,
                    address:     params.address,
                    cell_id:     params.cellId,
                    updated_at:  new Date().toISOString(),
                },
                { onConflict: 'entity_id' }
            );

        if (error) throw new Error(`Failed to upsert location: ${error.message}`);
    }

    async findByEntityId(entityId: string): Promise<LocationRecord | null> {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('entity_id', entityId)
            .single();

        if (error) return null;
        return data as LocationRecord;
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