import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { createAdminClient } from "@/services/supabase/server";

const SECRET = new TextEncoder().encode(process.env.SHIFT_RESPONSE_TOKEN_SECRET!);
const EXPIRES_IN_SECONDS = 30 * 60; // 30 minutes

export type ShiftResponseAction =
    | "accept"
    | "decline"
    | "transfer"
    | "check_in"
    | "check_out"
    | "complete";

export type ShiftResponseTokenPayload = {
    workerId:  string;
    requestId: string;
    action:    ShiftResponseAction;
    tokenId:   string; // DB row id for single-use enforcement
};

export async function createShiftResponseToken(params: {
    workerId:  string;
    requestId: string;
    action:    ShiftResponseAction;
}): Promise<string> {
    const supabase = await createAdminClient();

    const expiresAt = new Date(Date.now() + EXPIRES_IN_SECONDS * 1000);

    // Reserve the token row first to get the id
    const { data, error } = await supabase
        .from("shift_response_tokens")
        .insert({
            worker_id:  params.workerId,
            request_id: params.requestId,
            action:     params.action,
            expires_at: expiresAt.toISOString(),
            token:      "pending", // replaced below
        })
        .select("id")
        .single();

    if (error || !data) throw new Error(`Failed to create token: ${error?.message}`);

    const jwt = await new SignJWT({
        workerId:  params.workerId,
        requestId: params.requestId,
        action:    params.action,
        tokenId:   data.id,
    } satisfies ShiftResponseTokenPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(`${EXPIRES_IN_SECONDS}s`)
        .setIssuedAt()
        .sign(SECRET);

    // Store the signed JWT so we can look it up and mark as used
    await supabase
        .from("shift_response_tokens")
        .update({ token: jwt })
        .eq("id", data.id);

    return jwt;
}

export async function verifyShiftResponseToken(
    token: string,
): Promise<ShiftResponseTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return payload as unknown as ShiftResponseTokenPayload;
    } catch {
        return null; // expired or tampered
    }
}