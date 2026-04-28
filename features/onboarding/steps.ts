import {
    MailCheck,
    User,
    CreditCard,
    Building2,
    ShieldCheck,
    MapPin,
    CalendarClock,
} from "lucide-react";
import { UserRole } from "@/features/auth/types";
import { MultistepFormStep } from "@/hooks/use-multistep-form";

export type { OnboardingStepState } from "@/features/onboarding/types";

// ─── Worker steps ─────────────────────────────────────────────────────────────

const workerSteps: MultistepFormStep[] = [
    {
        id:          'verification',
        title:       'Verification',
        description: 'Confirm your contact information to secure your account.',
        route:        '/onboarding/verification',
        dependsOn:   [], 
        locked:      false, 
        freezesWhen: [], 
        icon:        MailCheck,
    },
    {
        id:          'personal-details',
        title:       'Profile',
        description: 'Your name, contact info, location, and professional role.',
        route:        '/onboarding/profile',
        dependsOn:   ['verification'],
        locked:      false,
        freezesWhen: [],
        icon:        User,
    },
]

// ─── Client steps ─────────────────────────────────────────────────────────────

const clientSteps: MultistepFormStep[] = [
    {
        id:          'details',
        title:       'Details',
        description: 'Provide your basic information',
        route:        '/onboarding/details',
        dependsOn:   [],
        locked:      false, 
        freezesWhen: [],
        icon:        Building2,
    },
    {
        id:          'billing',
        title:       'Billing',
        description: 'Add a payment method to authorize staffing placements.',
        route:        '/onboarding/billing',
        dependsOn:   ['details'],
        locked:      false,
        freezesWhen: [],
        icon:        CreditCard,
        skippable:   true,
    },
]

// ─── Step registry ────────────────────────────────────────────────────────────

export const STEPS_BY_ROLE: Record<UserRole, MultistepFormStep[]> = {
    worker:    workerSteps,
    client:    clientSteps,
    admin:     [],
    candidate: [],
}