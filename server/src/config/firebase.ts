import admin from 'firebase-admin';
import { Auth } from 'firebase-admin/auth';
import { Messaging } from 'firebase-admin/messaging';
import { config } from './env';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(config.firebase),
    });
}

export const getAuth = (): Auth => admin.auth();
export const getMessaging = (): Messaging => admin.messaging();