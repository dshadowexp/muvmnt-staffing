import { FastifyInstance } from 'fastify'
import { GeoService } from '../../services/geo/geo.service'
import {
    SearchAddressQuery,
    SearchAddressQueryType,
    GeocodeBody,
    GeocodeBodyType,
    GeocodePlaceBody,
    GeocodePlaceBodyType,
    UpdateLocationBody,
    UpdateLocationBodyType,
    FindNearbyQuery,
    FindNearbyQueryType,
} from '../../schemas/geo.schema'

export default async function geoRoutes(app: FastifyInstance): Promise<void> {
    const geoService = new GeoService();

    // ─── GET /geo/search ──────────────────────────────────────────────────────

    app.get<{ Querystring: SearchAddressQueryType }>(
        '/search',
        {
            onRequest: [app.authenticate],
            schema: { 
                summary: 'Autocomplete address search', 
                tags: ['Geo'], 
                security: [{ bearerAuth: [] }] 
            },
        },
        async (request, reply) => {
            const { input, sessionToken } = SearchAddressQuery.parse(request.query)
            const results = await geoService.searchAddress(input, sessionToken)
            return reply.code(200).send(results)
        }
    )

    // ─── POST /geo/location/address ───────────────────────────────────────────

    app.post<{ Body: GeocodeBodyType }>(
        '/location/address',
        {
            onRequest: [app.authenticate],
            schema: { 
                summary: 'Save location from address string', 
                tags: ['Geo'], 
                security: [{ bearerAuth: [] }] 
            },
        },
        async (request, reply) => {
            const body   = GeocodeBody.parse(request.body)
            const result = await geoService.saveLocationByAddress(body)
            return reply.code(200).send(result)
        }
    )

    // ─── POST /geo/location/place ─────────────────────────────────────────────
    // Use after user selects an autocomplete suggestion — pass the sessionToken
    // from the search request to keep billing grouped as one session.

    app.post<{ Body: GeocodePlaceBodyType }>(
        '/location/place',
        {
            onRequest: [app.authenticate],
            schema: { 
                summary: 'Save location from Google place ID', 
                tags: ['Geo'], 
                security: [{ bearerAuth: [] }] 
            },
        },
        async (request, reply) => {
            const body   = GeocodePlaceBody.parse(request.body);
            const { sub: userId } = request.user;
            const result = await geoService.saveLocationByPlace({ ...body, userId: userId })
            return reply.code(200).send(result)
        }
    )

    // ─── PUT /geo/location/coords ─────────────────────────────────────────────
    // Mobile GPS update — reverse geocodes to get address automatically.

    app.put<{ Body: UpdateLocationBodyType }>(
        '/location/coords',
        {
            onRequest: [app.authenticate],
            schema: { 
                summary: 'Save location from GPS coordinates', 
                tags: ['Geo'], 
                security: [{ bearerAuth: [] }] 
            },
        },
        async (request, reply) => {
            const body   = UpdateLocationBody.parse(request.body)
            const result = await geoService.saveLocationByCoords(body)
            return reply.code(200).send(result)
        }
    )

    // ─── GET /geo/location/:entityId ──────────────────────────────────────────

    app.get<{ Params: { entityId: string } }>(
        '/location/:entityId',
        {
            onRequest: [app.authenticate],
            schema: { summary: 'Get saved location for an entity', tags: ['Geo'], security: [{ bearerAuth: [] }] },
        },
        async (request, reply) => {
            const result = await geoService.getLocation(request.params.entityId)
            if (!result) {
                return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Location not found' })
            }
            return reply.code(200).send(result)
        }
    )

    // ─── GET /geo/nearby ──────────────────────────────────────────────────────
    // k is the gridDisk ring count from the H3 spec:
    // https://h3geo.org/docs/api/traversal#griddiskdistances
    // k=1 → 7 cells (~0.46 km radius)
    // k=2 → 19 cells (~0.92 km radius)
    // k=n → 3n² + 3n + 1 cells

    app.get<{ Querystring: FindNearbyQueryType }>(
        '/nearby',
        {
            onRequest: [app.authenticate],
            schema: { summary: 'Find nearby workers or clients by lat/lng and k', tags: ['Geo'], security: [{ bearerAuth: [] }] },
        },
            async (request, reply) => {
            const { lat, lng, k, entityType, excludeId } = FindNearbyQuery.parse(request.query)
            const results = await geoService.findNearby({ lat, lng, k, entityType, excludeId })
            return reply.code(200).send(results)
        }
    )
}