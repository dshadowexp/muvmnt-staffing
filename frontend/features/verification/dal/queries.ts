import { getSession } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Send an SMS OTP to the given phone number. No auth required.
 */
export async function sendPhoneOtp(phoneNumber: string): Promise<{ status: string }> {
    const session = await getSession();

    if (!session) throw new Error('Unauthorized');
    
    const res = await fetch(`${API_URL}/v1/auth/send-sms-otp`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.token}`,
        },
        body: JSON.stringify({ phoneNumber }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to send code (${res.status})`);
    }
    
    return res.json();
}

/**
 * Verify the SMS OTP code. Requires the internal API token (Bearer).
 */
export async function verifyPhoneOtp(
    phoneNumber: string,
    code: string,
): Promise<{ status: string }> {
    const session = await getSession();

    if (!session) throw new Error('Unauthorized');

    const res = await fetch(`${API_URL}/v1/auth/verify-sms-otp`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.token}`,
        },
        body: JSON.stringify({ phoneNumber, code }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Verification failed (${res.status})`);
    }

    return res.json();
}
