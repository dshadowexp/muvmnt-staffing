'use server';

import { UserAuth } from "@/features/auth/types";
import { cookies } from "next/headers";

export const setSession = async (user: UserAuth) => {
    (await cookies()).set("session", JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/"
    });
}

// Get session cookie
export const getSession = async (): Promise<UserAuth | null> => {
    const session = (await cookies()).get("session")?.value;
    if (!session) return null;
    const user = JSON.parse(session) as UserAuth;
    return user;
}

// Delete session cookie
export const deleteSession = async () => {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}