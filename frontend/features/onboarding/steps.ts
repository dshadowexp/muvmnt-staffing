import {
    MailCheck,
    User,
    Award,
    CreditCard,
    Building2,
    ShieldCheck,
    MapPin,
} from "lucide-react";
import { UserRole } from "@/types/auth";
import { MultistepFormStep } from "@/hooks/use-multistep-form";

// ─── Worker steps ─────────────────────────────────────────────────────────────

const workerSteps: MultistepFormStep[] = [
    {
        id:          'verification',
        title:       'Verification',
        description: 'Confirm your email address and phone number to secure your account.',
        route:        '/onboarding/verification',
        icon:        MailCheck,
    },
    {
        id:          'personal-details',
        title:       'Profile',
        description: 'Your name, contact info, location, and professional role.',
        route:        '/onboarding/profile',
        icon:        User,
    },
    {
        id:          'location',
        title:       'Location',
        description: 'Your location and address.',
        route:        '/onboarding/location',
        icon:        MapPin,
    },
    {
        id:          'authorization',
        title:       'Authorization',
        description: 'Select your work authorization type and upload your document.',
        route:        '/onboarding/authorization',
        icon:        ShieldCheck,
    },
    {
        id:          'certifications',
        title:       'Certifications',
        description: 'Upload your CPR and First Aid certificates.',
        route:        '/onboarding/certifications',
        icon:        Award,
    },
    {
        id:          'payroll',
        title:       'Payroll',
        description: 'Add a void cheque or direct deposit details to receive payments.',
        route:        '/onboarding/payroll',
        icon:        CreditCard,
    },
]

// ─── Client steps ─────────────────────────────────────────────────────────────

const clientSteps: MultistepFormStep[] = [
    {
        id:          'verification',
        title:       'Verification',
        description: 'Confirm your email address and phone number to secure your account.',
        route:        '/onboarding/verification',
        icon:        MailCheck,
    },
    {
        id:          'details',
        title:       'Details',
        description: 'Provide your basic information',
        route:        '/onboarding/details',
        icon:        Building2,
    },
    {
        id:          'location',
        title:       'Location',
        description: 'Your location and address.',
        route:        '/onboarding/location',
        icon:        MapPin,
    },
    {
        id:          'billing',
        title:       'Billing',
        description: 'Add a payment method to authorize staffing placements.',
        route:        '/onboarding/billing',
        icon:        CreditCard,
    },
]

// ─── Step registry ────────────────────────────────────────────────────────────

export const STEPS_BY_ROLE: Record<UserRole, MultistepFormStep[]> = {
    worker: workerSteps,
    client: clientSteps,
    admin: []
}