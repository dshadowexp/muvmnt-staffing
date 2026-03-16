import { FastifyInstance, FastifyRequest } from 'fastify'
import { ReferralService } from '../../services/referral/referral.service'
import {
  ValidateBody,
  ValidateBodyType,
  RedeemBody,
  RedeemBodyType,
} from '../../schemas/referral.schema'

export default async function referralRoutes(app: FastifyInstance): Promise<void> {
    const referralService = new ReferralService();

    // ─── GET /referrals/code ──────────────────────────────────────────────────
    // Returns the authenticated user's referral code, creating one if needed.

    app.get(
        '/code',
        {
        onRequest: [app.authenticate],
        schema: {
            summary:  "Get the current user's referral code",
            tags:     ['Referrals'],
            security: [{ bearerAuth: [] }],
        },
        },
        async (request: FastifyRequest, reply) => {
            const { sub: userId } = request.user;
            const record          = await referralService.getOrCreateCode(userId);

            return reply.code(200).send({
                code:      record.code,
                uses:      record.uses,
                createdAt: record.created_at,
            });
        }
    )

    // ─── GET /referrals/stats ─────────────────────────────────────────────────
    // Full breakdown of who has used the current user's code.

    app.get(
        '/stats',
        {
        onRequest: [app.authenticate],
        schema: {
            summary:  'Get referral stats for the current user',
            tags:     ['Referrals'],
            security: [{ bearerAuth: [] }],
        },
        },
        async (request: FastifyRequest, reply) => {
            const { sub: userId } = request.user
            const stats           = await referralService.getStats(userId)

            return reply.code(200).send({
                ...stats,
                referrals: stats.referrals.map((r) => ({
                    id:         r.id,
                    referrerId: r.referrer_id,
                    refereeId:  r.referee_id,
                    code:       r.code,
                    status:     r.status,
                    redeemedAt: r.redeemed_at,
                    expiresAt:  r.expires_at,
                    createdAt:  r.created_at,
                })),
            })
        }
    )

    // ─── POST /referrals/validate ─────────────────────────────────────────────
    // Check if a code is valid before showing the user a confirmation UI.
    // Does not redeem the code — call /redeem after signup is complete.

    app.post<{ Body: ValidateBodyType }>(
        '/validate',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Validate a referral code without redeeming it',
                tags:     ['Referrals'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { code }        = ValidateBody.parse(request.body)
            const { sub: userId } = request.user
            const result          = await referralService.validateCode(code, userId)

            return reply.code(200).send(result)
        }
    )

    // ─── POST /referrals/redeem ───────────────────────────────────────────────
    // Finalise a referral after the new user completes signup.
    // A user can only redeem one code ever.

    app.post<{ Body: RedeemBodyType }>(
        '/redeem',
        {
        onRequest: [app.authenticate],
        schema: {
            summary:  'Redeem a referral code',
            tags:     ['Referrals'],
            security: [{ bearerAuth: [] }],
        },
        },
        async (request, reply) => {
        const { code }        = RedeemBody.parse(request.body)
        const { sub: userId } = request.user

        try {
            const result = await referralService.redeemCode({ code, refereeId: userId })
            return reply.code(200).send(result)
        } catch (err: any) {
            return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: err.message })
        }
        }
    )

    // ─── GET /referrals/referred-by ───────────────────────────────────────────
    // Returns the referral record for how the current user was brought in.

    app.get(
        '/referred-by',
        {
        onRequest: [app.authenticate],
        schema: {
            summary:  'Get the referral that brought in the current user',
            tags:     ['Referrals'],
            security: [{ bearerAuth: [] }],
        },
        },
        async (request: FastifyRequest, reply) => {
            const { sub: userId } = request.user;
            const record          = await referralService.getReferredBy(userId);

            return reply.code(200).send({
                referredBy: record ? {
                id:         record.id,
                referrerId: record.referrer_id,
                refereeId:  record.referee_id,
                code:       record.code,
                status:     record.status,
                redeemedAt: record.redeemed_at,
                expiresAt:  record.expires_at,
                createdAt:  record.created_at,
                } : null,
            });
        }
    )
}