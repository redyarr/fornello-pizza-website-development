// Fornello Pizza - Zero-Backend PWA Offline Service Worker
// Enables 100% offline menu browsing, ordering, and floor monitoring

const CACHE_NAME = 'fornello-pwa-v1'
const PRECACHE_URLS = [
  '/',
  '/admin',
  '/floor',
  '/qr',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-icon.png',
  '/images/hero-pizza.png',
  '/images/al-taglio.png',
  '/images/potato.png',
  '/images/coffee.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Continue even if an image fails to pre-cache
      })
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET or cross-origin requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Network-First for HTML navigation with Cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/')
          })
        }),
    )
    return
  }

  // Stale-While-Revalidate for static assets (_next, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return networkResponse
        })
        .catch(() => cached)

      return cached || fetchPromise
    }),
  )
})
