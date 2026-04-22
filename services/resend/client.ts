import "server-only";
import { Resend } from "resend";
import { env } from "@/data/env/server";

export const resendClient = new Resend(env.RESEND_API_KEY);