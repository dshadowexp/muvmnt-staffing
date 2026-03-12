import { FastifyInstance, FastifyRequest } from 'fastify'
import { OnboardingService } from '../../services/onboarding/onboarding.service'
import { StepParams, StepParamsType } from '../../schemas/onboarding.schema'

export default async function onboardingRoutes(app: FastifyInstance): Promise<void> {
    const onboardingService = new OnboardingService();

    // ─── GET /onboarding/progress ─────────────────────────────────────────────
    // Returns step definitions + resolved statuses for the authenticated user.
    // Role is read from the JWT — no query param needed.

    app.get(
        '/progress',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Get onboarding progress for the current user',
                tags:     ['Onboarding'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request: FastifyRequest, reply) => {
            const { sub: userId, role } = request.user

            if (role !== 'worker' && role !== 'client') {
                return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: `No onboarding flow for role '${role}'` })
            }

            const progress = await onboardingService.getProgress(userId, role);
            return reply.code(200).send(progress);
        }
    )

    // ─── POST /onboarding/steps/:stepId/complete ──────────────────────────────
    // Called by the frontend after the user finishes a step's form/flow.

    app.post<{ Params: StepParamsType }>(
        '/steps/:stepId/complete',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Mark an onboarding step as complete',
                tags:     ['Onboarding'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { stepId }            = StepParams.parse(request.params)
            const { sub: userId, role } = request.user

            if (role !== 'worker' && role !== 'client') {
                return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: `No onboarding flow for role '${role}'` })
            }

            try {
                const progress = await onboardingService.completeStep(userId, role, stepId);
                return reply.code(200).send(progress);
            } catch (err: any) {
                return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: err.message })
            }
        }
    )

    // ─── DELETE /onboarding/steps/:stepId/complete ────────────────────────────
    // Used internally / by ops when a step needs to be re-done (e.g. ID rejected,
    // re-verification required). Also cascades to dependent steps.

    app.delete<{ Params: StepParamsType }>(
        '/steps/:stepId/complete',
        {
            onRequest: [app.authenticate, app.requireRole('admin')],
            schema: {
                summary:  'Clear a completed step and its dependents',
                tags:     ['Onboarding'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { stepId }            = StepParams.parse(request.params)
            const { sub: userId, role } = request.user

            if (role !== 'worker' && role !== 'client') {
                return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: `No onboarding flow for role '${role}'` })
            }

            try {
                const progress = await onboardingService.uncompleteStep(userId, role, stepId)
                return reply.code(200).send(progress)
            } catch (err: any) {
                return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: err.message })
            }
        }
    )
}