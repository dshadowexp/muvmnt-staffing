/**
 * services/onboarding/onboarding.steps.ts
 *
 * Single source of truth for step definitions — shared by the service
 * (status derivation) and sent to the frontend as part of the API response.
 */

import { Role } from "../auth/permissions"

export type StepStatus =
    | 'complete'
    | 'in_progress'
    | 'available'
    | 'locked'

export type OnboardingStepIcon =
    | 'mail-check'
    | 'user'
    | 'shield-check'
    | 'file-text'
    | 'credit-card'
    | 'building-2'
    | 'badge-check'
    | 'lock'

export interface OnboardingStepDef {
    id:          string
    title:       string
    description: string
    href:        string
    requires?:   string[]
    icon:        OnboardingStepIcon
    estimate:    string
}

export interface OnboardingStep extends OnboardingStepDef {
    status: StepStatus
}

// ─── Worker steps ─────────────────────────────────────────────────────────────

export const WORKER_STEPS: OnboardingStepDef[] = [
    {
        id:          'verification',
        title:       'Verify Contact',
        description: 'Confirm your email address and phone number to secure your account.',
        href:        '/onboarding/verification',
        icon:        'mail-check',
        estimate:    '2 min',
    },
    {
        id:          'personal-details',
        title:       'Personal Details',
        description: 'Your name, contact info, location, and professional role.',
        href:        '/onboarding/info',
        icon:        'user',
        requires:    ['verification'],
        estimate:    '3 min',
    },
    {
        id:          'certifications',
        title:       'Certifications',
        description: 'Upload your CPR and First Aid certificates.',
        href:        '/onboarding/certifications',
        icon:        'badge-check',
        requires:    ['personal-details'],
        estimate:    '2 min',
    },
    {
        id:          'identification',
        title:       'Verify Identity',
        description: 'Government-issued ID for compliance and placement eligibility.',
        href:        '/onboarding/identification',
        icon:        'shield-check',
        requires:    ['personal-details'],
        estimate:    '5 min',
    },
    {
        id:          'payment',
        title:       'Setup Payroll',
        description: 'Add a void cheque or direct deposit details to receive payments.',
        href:        '/onboarding/payment',
        icon:        'credit-card',
        requires:    ['personal-details', 'identification'],
        estimate:    '3 min',
    },
]

// ─── Client steps ─────────────────────────────────────────────────────────────

export const CLIENT_STEPS: OnboardingStepDef[] = [
    {
        id:          'verification',
        title:       'Verify Information',
        description: 'Confirm your email address and phone number to secure your account.',
        href:        '/onboarding/verification',
        icon:        'mail-check',
        estimate:    '2 min',
    },
    {
        id:          'org-details',
        title:       'Organization Details',
        description: 'Your facility type, contact information, and service location.',
        href:        '/onboarding/info',
        icon:        'building-2',
        requires:    ['verification'],
        estimate:    '4 min',
    },
    {
        id:          'billing',
        title:       'Billing Setup',
        description: 'Add a payment method to authorize staffing placements.',
        href:        '/onboarding/payment',
        icon:        'credit-card',
        requires:    ['org-details'],
        estimate:    '3 min',
    },
    {
        id:          'create-shift',
        title:       'Request Your First Worker',
        description: 'Create a shift and specify the role, time, and location so we can match you with available staff.',
        href:        '/onboarding/shift',
        icon:        'credit-card',
        requires:    ['org-details', 'billing'],
        estimate:    '2 min',
    },
]

// ─── Step registry ────────────────────────────────────────────────────────────

export const STEPS_BY_ROLE: Record<Role, OnboardingStepDef[]> = {
    worker: WORKER_STEPS,
    client: CLIENT_STEPS,
    admin: []
}