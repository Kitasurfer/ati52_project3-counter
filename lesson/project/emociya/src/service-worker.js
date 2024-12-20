const CACHE_NAME = 'emotion-counter-v1';
const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'script.js',
    'data.js',
    'icons/icon-192x192.png',
    'icons/icon-512x512.png',
    'icons/icon-48x48.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэшируем файлы приложения');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames.map(cacheName => {
                if (cacheName !== CACHE_NAME) {
                    console.log('Удаляем старый кэш:', cacheName);
                    return caches.delete(cacheName);
                }
            })
        ))
    );
});

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {
        title: 'Эмоциональный счётчик',
        body: 'Новое уведомление!'
    };

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: 'icons/icon-192x192.png',
            badge: 'icons/icon-48x48.png'
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
