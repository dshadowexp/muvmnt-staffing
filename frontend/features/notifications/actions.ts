"use server";

import { upsertPushToken, deletePushToken } from "./dal/mutations";

export async function registerPushTokenAction(token: string) {
  return upsertPushToken(token);
}

export async function deregisterPushTokenAction() {
  return deletePushToken();
}
