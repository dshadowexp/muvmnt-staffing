"use client";

import { useEffect, useRef, useState } from "react";
import { fetchToken } from "@/services/firebase/messaging";
import { MessagePayload, onMessage, Unsubscribe } from "firebase/messaging";
import { messaging } from "@/services/firebase/messaging";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

async function getNotificationPermissionAndToken() {
    if (!('Notification' in window)) {
        console.log("This browser does not support notifications");
        return null;
    }

    if (Notification.permission === 'granted') {
        return await fetchToken();
    } else {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            return await fetchToken();
        }
    }
    
    return null;
}

export const useFcmToken = () => {
    const router = useRouter();
    const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | null>(null);
    const [isSupported, setIsSupported] = useState<boolean | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const isLoading = useRef(false);

    const loadToken = async (byPass = false) => {
        if (isLoading.current) return;
        isLoading.current = true;

        try {
            const MAX_RETRIES = 3;

            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                const token = await getNotificationPermissionAndToken();

                if (Notification.permission === 'denied') {
                    if (byPass) alert("Please enable notifications in your browser settings.");
                    setNotificationPermissionStatus('denied');
                    isLoading.current = false;
                    return;
                }

                if (token) {
                    setNotificationPermissionStatus(Notification.permission);
                    setToken(token);
                    isLoading.current = false;
                    return;
                }

                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
                }
            }

            alert("Unable to setup notifications. Please refresh the browser.");
        } finally {
            isLoading.current = false;
        }
    }

    const showSystemNotification = (payload: MessagePayload) => {
        const title = payload.notification?.title || "New notification";
        const body = payload.notification?.body || "This is a new notification";
        const link = payload.fcmOptions?.link || payload.data?.link;

        if (!link) {
            toast.info(
                title,
                {
                    description: body,
                }
            )
        } else {
            toast.info(
                title,
                {
                    description: body,
                    action: {
                        label: "View",
                        onClick: () => {
                            if (link) {
                                router.push(link);
                            }
                        },
                    },
                }
            )
        }

        // Show system notification
        const notification = new Notification(
            title,
            {
                body: body,
                icon: "/web-app-manifest-192x192.png",
                badge: "/badge-72x72.png",
                requireInteraction: true,
                data: { url: link },
            }
        );
    
        // Handle notification click
        notification.onclick = (event) => {
            event.preventDefault(); 
            window.focus();
            const link = (event.target as Notification).data.url;
            if (link) {
                router.push(link);
            }

            notification.close();
        };
    };

    // Check browser support on mount
    useEffect(() => {
        const checkSupport = () => {
            if (
                typeof window !== "undefined" &&
                "serviceWorker" in navigator &&
                "PushManager" in window
            ) {
                return true;
            }
            return false;
        };
    
        setIsSupported(checkSupport());
    }, []);

    useEffect(() => {
        if ("Notification" in window && isSupported) {
            loadToken();
        }
    }, [isSupported]);

    useEffect(() => {
        const setupListener = async() => {
            if (!token) return;

            const m = await messaging();
            if (!m) return;

            const unsubscribe = onMessage(m, async (payload) => {
                console.log("Message received in the foreground:", payload);
                if ("Notification" in window && Notification.permission === 'granted') {
                    console.log("Showing system notification");
                    showSystemNotification(payload);
                }
            });

            return unsubscribe;
        }

        let unsubscribe: Unsubscribe | null = null;
        setupListener().then((unsub) => {
            if (unsub) {
                unsubscribe = unsub;
            }
        });

        return () => unsubscribe?.();
    }, [token, router, toast]);

    return {
        token,
        notificationPermissionStatus,
        handleEnableNotifications: loadToken,
    };
}