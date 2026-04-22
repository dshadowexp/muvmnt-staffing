import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { firebaseApp } from "./client";
import { env } from "@/data/env/client";

export const messaging = async () => {
    if (typeof window === 'undefined') return null;
    const supported = await isSupported();
    return supported ? getMessaging(firebaseApp) : null;
}

export const serviceWorkerRegistration = async () => {
    if (typeof window === 'undefined') return null;
    if (!('serviceWorker' in navigator)) return null;

    await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
        updateViaCache: 'none',
    });
    const registration = await navigator.serviceWorker.ready;
    return registration;
}

export const fetchToken = async () => {
    try {
        const registration = await serviceWorkerRegistration();
        if (!registration) return null;
        const fcmMessaging = await messaging();
        if (!fcmMessaging) return null;
        
        return await getToken(fcmMessaging, {
            vapidKey: env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });
    } catch (error) {
        console.error(error);
        return null;
    }
}
