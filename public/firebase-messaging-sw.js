importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDSX5uaF_WxSbYGgGpBpFBfHA8l4AQDJSE",
    authDomain: "muvmnt-staffing.firebaseapp.com",
    projectId: "muvmnt-staffing",
    storageBucket: "muvmnt-staffing.firebasestorage.app",
    messagingSenderId: "708398926380",
    appId: "1:708398926380:web:4452b531b501a1783a5f89",
    measurementId: "G-1H25MV66NQ",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => { 
    // payload.fcmOptions?.link is from the backend
    // payload.data?.link is from the Firebase Console where link is the 'key'
    const link = payload.fcmOptions?.link || payload.data?.link;

    const notificationTitle = payload.notification?.title || "You have a new notification";
    const notificationOptions = {
        body: payload.notification?.body,
        icon: "/web-app-manifest-192x192.png",
        badge: "/badge-72x72.png",
        vibrate: [100, 50, 100],
        data: {
            url: link,
        },
        requireInteraction: true,
    }

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                const currentUrl = new URL(self.location.href);
                const targetUrl = new URL(event.notification.data.url, currentUrl.origin);
                const navigationUrl = targetUrl.toString();

                for (const client of windowClients) {
                    if (client.url.includes(self.registration.scope) && client.url === navigationUrl && 'focus' in client) {
                        // client.navigate(navigationUrl);
                        return client.focus();
                    }
                }

                if (clients.openWindow) {
                    clients.openWindow(navigationUrl);
                }
            })
    );
});