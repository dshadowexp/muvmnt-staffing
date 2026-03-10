import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/auth/auth.service';
import { 
    ErrorReply, 
    ExchangeAuthTokenBody, 
    ExchangeAuthTokenBodyType, 
    ExchangeAuthTokenReply, 
    ExchangeAuthTokenReplyType 
} from '../../schemas/auth.schema';

// ─── Route ────────────────────────────────────────────────────────────────────

export default async function authRoutes(app: FastifyInstance): Promise<void> {
    const authService = new AuthService()

    /**
     * POST /v1/auth/exchange-auth-token
     *
     * Accepts a short-lived or third-party token and returns a signed
     * JWT access token + refresh token for use across the platform.
     */
    app.post<{
        Body: ExchangeAuthTokenBodyType
        Reply: ExchangeAuthTokenReplyType
    }>(
        '/exchange-token',
        {
            schema: {
                summary:     'Exchange an auth token',
                description: 'Trade a third-party or short-lived token for a signed platform JWT.',
                tags:        ['Auth'],
                body:        ExchangeAuthTokenBody,
                response: {
                    200: ExchangeAuthTokenReply,
                    400: ErrorReply,
                    401: ErrorReply,
                },
            },
        },
        async (
            request: FastifyRequest<{ Body: ExchangeAuthTokenBodyType }>,
            reply:   FastifyReply
        ): Promise<ExchangeAuthTokenReplyType> => {
            const { token } = request.body;

            const result = await authService.exchangeToken(token);

            return reply.code(200).send(result);
        }
    )
}