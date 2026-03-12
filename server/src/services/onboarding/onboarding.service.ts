import {
    OnboardingStep,
    OnboardingStepDef,
    StepStatus,
    STEPS_BY_ROLE,
} from './onboarding.steps'
import { OnboardingRepository, CompletionMap } from './onboarding.repository'
import { logger } from '../../config/logger'
import { Role } from '../auth/permissions'

export interface OnboardingProgress {
  role:           Role
  steps:          OnboardingStep[]
  defs:           OnboardingStepDef[],
  totalSteps:     number
  completedSteps: number
  isComplete:     boolean
}

export class OnboardingService {
    private readonly repo: OnboardingRepository

    constructor() {
        this.repo = new OnboardingRepository()
    }

    // ─── Get full progress for a user ────────────────────────────────────────

    async getProgress(userId: string, role: Role): Promise<OnboardingProgress> {
        const defs          = STEPS_BY_ROLE[role];
        const completionMap = await this.repo.getCompletionMap(userId);
        const steps         = this.resolveStatuses(defs, completionMap, role);
        const completedSteps = steps.filter((s) => s.status === 'complete').length

        return {
            role,
            steps,
            defs,
            totalSteps:    steps.length,
            completedSteps,
            isComplete:    completedSteps === steps.length,
        }
    }

    // ─── Mark a step complete ─────────────────────────────────────────────────

    async completeStep(userId: string, role: 'worker' | 'client', stepId: string): Promise<OnboardingProgress> {
        this.assertStepExists(role, stepId)
        await this.repo.markStepComplete(userId, stepId)
        logger.info({ userId, role, stepId }, 'Onboarding step completed')
        return this.getProgress(userId, role)
    }

    // ─── Mark a step incomplete (e.g. document rejected, re-verification) ────

    async uncompleteStep(userId: string, role: Role, stepId: string): Promise<OnboardingProgress> {
        this.assertStepExists(role, stepId)

        // Also clear any steps that depend on this one — their completion is now invalid
        const defs         = STEPS_BY_ROLE[role]
        const dependents   = this.getDependents(defs, stepId)
        const stepsToClear = [stepId, ...dependents]

        await Promise.all(stepsToClear.map((id) => this.repo.markStepIncomplete(userId, id)))

        logger.info({ userId, role, stepId, dependents }, 'Onboarding step cleared')
        return this.getProgress(userId, role)
    }

    // ─── Status derivation ────────────────────────────────────────────────────
    // Pure function — no DB calls. Takes step definitions + completion flags,
    // returns the same steps with a resolved status on each.

    private resolveStatuses(defs: OnboardingStepDef[], completionMap: CompletionMap, role: Role): OnboardingStep[] {
        const cmap: CompletionMap = role == 'worker' ? { 'verification': true, 'personal-details': true, 'certifications': true, 'identification': true } : { 'verification': true, 'org-details': true }
        return defs.map((def): OnboardingStep => ({
            ...def,
            status: this.deriveStatus(def, cmap),
        }));
    }

    private deriveStatus(def: OnboardingStepDef, completionMap: CompletionMap): StepStatus {
        if (completionMap[def.id] === true) return 'complete'

        // Locked if any required step is not yet complete
        if (def.requires?.some((reqId) => completionMap[reqId] !== true)) return 'locked'

        return 'available'
    }

    // Returns IDs of all steps that directly or transitively depend on stepId
    private getDependents(defs: OnboardingStepDef[], stepId: string): string[] {
        const dependents: string[] = []

        const traverse = (id: string) => {
            for (const def of defs) {
                if (def.requires?.includes(id) && !dependents.includes(def.id)) {
                    dependents.push(def.id)
                    traverse(def.id) // recurse for transitive dependents
                }
            }
        }

        traverse(stepId);
        return dependents;
    }

    private assertStepExists(role: Role, stepId: string): void {
        const exists = STEPS_BY_ROLE[role].some((s) => s.id === stepId)
        if (!exists) throw new Error(`Step '${stepId}' does not exist for role '${role}'`)
    }
}