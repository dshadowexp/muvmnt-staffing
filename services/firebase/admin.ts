import admin from 'firebase-admin';
import { Messaging } from 'firebase-admin/messaging';
import { Auth } from 'firebase-admin/auth';
import { env } from '@/data/env/server';


if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

export const getMessaging = (): Messaging => admin.messaging();
export const getAuth = (): Auth => admin.auth();