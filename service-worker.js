const CACHE_NAME = "esf-mapper-v4";
const OFFLINE_ASSETS = [
  "./",
  "./index.php",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./assets/js/modules/apiService.js",
  "./assets/js/modules/constants.js",
  "./assets/js/modules/utils.js",
  "./assets/js/modules/storageService.js",
  "./assets/js/modules/exportService.js",
  "./assets/js/modules/mapService.js",
  "./assets/js/modules/uiService.js",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  // Não intercepta recursos externos (tiles OSM, CDNs), evitando mapa quebrado.
  if (!isSameOrigin) {
    return;
  }

  const isNavigation = event.request.mode === "navigate";

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match("./index.php"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
