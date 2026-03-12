import { supabase } from "../../config/supabase"

// New steps default to false when not present in the stored map.
export type CompletionMap = Record<string, boolean>

export class OnboardingRepository {
    constructor() {}

    async getCompletionMap(userId: string): Promise<CompletionMap> {
        const { data } = await supabase
            .from('onboarding_progress')
            .select('completion_map')
            .eq('user_id', userId)
            .single()

        return (data?.completion_map ?? {}) as CompletionMap
    }

    async markStepComplete(userId: string, stepId: string): Promise<void> {
        // Read-modify-write: merge the new flag into the existing map
        const existing = await this.getCompletionMap(userId)

        const { error } = await supabase
            .from('onboarding_progress')
            .upsert(
                {
                    user_id:        userId,
                    completion_map: { ...existing, [stepId]: true },
                    updated_at:     new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            )

        if (error) throw new Error(`Failed to mark step complete: ${error.message}`)
    }

    async markStepIncomplete(userId: string, stepId: string): Promise<void> {
        const existing = await this.getCompletionMap(userId)

        const { error } = await supabase
            .from('onboarding_progress')
            .upsert(
                {
                    user_id:        userId,
                    completion_map: { ...existing, [stepId]: false },
                    updated_at:     new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            )

        if (error) throw new Error(`Failed to mark step incomplete: ${error.message}`)
    }
}