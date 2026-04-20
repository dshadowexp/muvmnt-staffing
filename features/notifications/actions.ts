"use server";

import webpush from 'web-push';
import { upsertPushToken, deletePushToken } from "./dal/mutations";
import { env as clientEnv } from '@/data/env/client';
import { env as serverEnv } from '@/data/env/server';

export async function registerPushTokenAction(token: string) {
  return upsertPushToken(token);
}

export async function deregisterPushTokenAction() {
  return deletePushToken();
}

 
// webpush.setVapidDetails(
//   '<mailto:support@readykare.ca>',
//   clientEnv.NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY,
//   serverEnv.WEB_PUSH_VAPID_PRIVATE_KEY
// )
 
let subscription: PushSubscription | null = null
 
export async function subscribeUser(sub: PushSubscription) {
  subscription = sub
  // In a production environment, you would want to store the subscription in a database
  // For example: await db.subscriptions.create({ data: sub })
  return { success: true }
}
 
export async function unsubscribeUser() {
  subscription = null
  // In a production environment, you would want to remove the subscription from the database
  // For example: await db.subscriptions.delete({ where: { ... } })
  return { success: true }
}
 
export async function sendNotification(message: string) {
  if (!subscription) {
    throw new Error('No subscription available')
  }
 
  try {
    await webpush.sendNotification(
      subscription as any,
      JSON.stringify({
        title: 'Test Notification',
        body: message,
        icon: '/icon.png',
      })
    )
    return { success: true }
  } catch (error) {
    console.error('Error sending push notification:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}
