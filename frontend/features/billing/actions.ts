"use server";

import { redirect } from "next/navigation";
import { createConnectedAccountLink } from "./dal/mutations";
import { retrieveConnectedAccount } from "./dal/queries";

export async function setupPayrollAction() {
    const { data, error } = await createConnectedAccountLink();
    if (error) throw new Error(error)
    if (!data?.onboardingUrl) throw new Error('Failed to create account link');
    redirect(data.onboardingUrl);
}

export async function retrievePayrollAccountAction() {
  const { data, error } = await retrieveConnectedAccount();
  if (error) return { error, data: null };
  return { error: null, data };
}