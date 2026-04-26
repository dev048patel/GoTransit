/* GoTransit Regina — Service Worker (push notifications) */

self.addEventListener('push', event => {
    const data = event.data?.json() ?? {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'GoTransit Regina', {
            body: data.body || '',
            icon: '/image.png',
            badge: '/favicon.ico',
            tag: 'departure-reminder',   // replaces previous instead of stacking
            renotify: true,
            data: { url: data.url || '/map' },
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            const existing = list.find(c => c.url.includes('/map'));
            if (existing) return existing.focus();
            return clients.openWindow(event.notification.data?.url ?? '/map');
        })
    );
});
