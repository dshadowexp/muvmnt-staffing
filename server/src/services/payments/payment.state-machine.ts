// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'

type PaymentEvent =
    | 'PAYMENT_INTENT_CREATED'
    | 'FACILITY_CONFIRMED'
    | 'STRIPE_SUCCEEDED'
    | 'STRIPE_FAILED'
    | 'REFUND_ISSUED'

const PAYMENT_TRANSITIONS: Record<PaymentStatus, Partial<Record<PaymentEvent, PaymentStatus>>> = {
    pending:    {
        PAYMENT_INTENT_CREATED: 'pending',
        FACILITY_CONFIRMED:     'processing',
    },
    processing: {
        STRIPE_SUCCEEDED: 'succeeded',
        STRIPE_FAILED:    'failed',
    },
    succeeded:  {
        REFUND_ISSUED: 'refunded',
    },
    failed:     {}, // terminal
    refunded:   {}, // terminal
}

// ─── Payout ───────────────────────────────────────────────────────────────────

export type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled'

type PayoutEvent =
    | 'TRANSFER_CREATED'
    | 'BANK_PAYOUT_TRIGGERED'
    | 'STRIPE_PAYOUT_PAID'
    | 'STRIPE_PAYOUT_FAILED'
    | 'STRIPE_PAYOUT_CANCELED'
    | 'OPS_RETRY'

const PAYOUT_TRANSITIONS: Record<PayoutStatus, Partial<Record<PayoutEvent, PayoutStatus>>> = {
    pending:    {
        TRANSFER_CREATED:      'pending',
        BANK_PAYOUT_TRIGGERED: 'in_transit',
    },
    in_transit: {
        STRIPE_PAYOUT_PAID:     'paid',
        STRIPE_PAYOUT_FAILED:   'failed',
        STRIPE_PAYOUT_CANCELED: 'canceled',
    },
    failed:     {
        OPS_RETRY: 'in_transit',  // ops can re-trigger a bank payout
    },
    paid:       {}, // terminal
    canceled:   {}, // terminal
}

// ─── State machine ────────────────────────────────────────────────────────────

export class PaymentStateMachine {
    static transition(current: PaymentStatus, event: PaymentEvent): PaymentStatus {
        const next = PAYMENT_TRANSITIONS[current]?.[event]
        if (!next) {
            throw new InvalidTransitionError('payment', current, event)
        }
        return next
    }

    static isTerminal(status: PaymentStatus): boolean {
        return Object.keys(PAYMENT_TRANSITIONS[status]).length === 0
    }

    static canTransition(current: PaymentStatus, event: PaymentEvent): boolean {
        return !!PAYMENT_TRANSITIONS[current]?.[event]
    }
}

export class PayoutStateMachine {
    static transition(current: PayoutStatus, event: PayoutEvent): PayoutStatus {
        const next = PAYOUT_TRANSITIONS[current]?.[event]
        if (!next) {
            throw new InvalidTransitionError('payout', current, event)
        }
        return next
    }

    static isTerminal(status: PayoutStatus): boolean {
        return Object.keys(PAYOUT_TRANSITIONS[status]).length === 0
    }

    static canTransition(current: PayoutStatus, event: PayoutEvent): boolean {
        return !!PAYOUT_TRANSITIONS[current]?.[event]
    }
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class InvalidTransitionError extends Error {
    constructor(entity: string, from: string, event: string) {
        super(`Invalid ${entity} transition: ${from} + ${event} has no defined next state`)
        this.name = 'InvalidTransitionError'
    }
}