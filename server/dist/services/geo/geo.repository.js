"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoRepository = void 0;
const supabase_1 = require("../../config/supabase");
class GeoRepository {
    constructor() { }
    async upsertLocation(params) {
        console.log(params);
        const { error } = await supabase_1.supabase
            .from('locations')
            .upsert({
            user_id: params.userId,
            lat: params.lat,
            lng: params.lng,
            address: params.address,
            cell_id: params.cellId,
        }, { onConflict: 'user_id' });
        if (error)
            throw new Error(`Failed to upsert location: ${error.message}`);
    }
    async findByUserId(userId) {
        const { data, error } = await supabase_1.supabase
            .from('locations')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error)
            return null;
        return data;
    }
    /** @deprecated Use findByUserId. Kept for compatibility with entityId (userId) in routes. */
    async findByEntityId(entityId) {
        return this.findByUserId(entityId);
    }
    async findInCells(params) {
        let query = supabase_1.supabase
            .from('locations')
            .select('*')
            .in('cell_id', params.cells)
            .eq('entity_type', params.entityType);
        if (params.excludeId) {
            query = query.neq('entity_id', params.excludeId);
        }
        const { data, error } = await query;
        if (error)
            throw new Error(`Failed to find locations in cells: ${error.message}`);
        return (data ?? []);
    }
}
exports.GeoRepository = GeoRepository;
//# sourceMappingURL=geo.repository.js.map