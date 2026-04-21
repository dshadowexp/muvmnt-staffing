import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { firebaseApp } from "./client";
import { env } from "@/data/env/client";

export const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(firebaseApp) : null;
}

export const fetchToken = async () => {
    try {
       const fcmMessaging = await messaging();
       if (fcmMessaging) {
            const token = await getToken(fcmMessaging, {
                vapidKey: env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });
            return token;
       }
    } catch (error) {
        console.error(error);
        return null;
    }
}
