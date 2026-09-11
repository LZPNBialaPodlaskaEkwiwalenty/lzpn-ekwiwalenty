/* ======================================
   SW.JS - Service Worker
   Cache aplikacji, żeby działała offline
   (przynajmniej powłoka + wcześniej wczytane dane).

   Dane meczów i tak są trzymane lokalnie i
   synchronizowane z Firebase, gdy wróci internet -
   ten SW dba tylko o to, żeby sama strona (HTML/CSS/JS)
   dało się otworzyć bez zasięgu.
====================================== */

const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = "lzpn-ekwiwalenty-shell-" + CACHE_VERSION;
const RUNTIME_CACHE = "lzpn-ekwiwalenty-runtime-" + CACHE_VERSION;

// Pliki własne strony - zawsze potrzebne, żeby coś w ogóle się wyświetliło.
const APP_SHELL_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./auth.js",
    "./a11y.js",
    "./manifest.json",
    "./logo.png"
];

self.addEventListener("install", (event) => {

    event.waitUntil(
        caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.addAll(APP_SHELL_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {

    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter(
                            (key) =>
                                key !== APP_SHELL_CACHE &&
                                key !== RUNTIME_CACHE
                        )
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {

    const request = event.request;

    // Nie ruszamy zapytań innych niż GET (np. do Firebase/Firestore).
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    const isSameOrigin = url.origin === self.location.origin;

    // Nigdy nie cache'ujemy wywołań do Firebase/Firestore -
    // to musi zawsze iść po realne, aktualne dane.
    if (
        url.hostname.includes("firestore.googleapis.com") ||
        url.hostname.includes("googleapis.com") ||
        url.hostname.includes("identitytoolkit")
    ) {
        return;
    }

    if (isSameOrigin) {
        // Własne pliki: cache-first, w tle odświeżamy z sieci.
        event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
    } else {
        // Zewnętrzne biblioteki (fonty, ikony, PDF): network-first
        // z zapasem z cache, gdy nie ma internetu.
        event.respondWith(networkFirst(request, RUNTIME_CACHE));
    }
});

async function cacheFirst(request, cacheName) {

    const cached = await caches.match(request);

    const networkFetch = fetch(request)
        .then((response) => {
            if (response && response.status === 200) {
                const clone = response.clone();
                caches
                    .open(cacheName)
                    .then((cache) => cache.put(request, clone));
            }
            return response;
        })
        .catch(() => null);

    // Zwróć od razu wersję z cache, jeśli jest - a sieć niech
    // ją sobie w tle zaktualizuje na następny raz.
    if (cached) {
        networkFetch;
        return cached;
    }

    const fresh = await networkFetch;

    if (fresh) return fresh;

    // Ostateczny fallback dla nawigacji, gdy nic nie działa.
    if (request.mode === "navigate") {
        return caches.match("./index.html");
    }

    return new Response("", { status: 504, statusText: "Offline" });
}

async function networkFirst(request, cacheName) {

    try {

        const response = await fetch(request);

        if (response && response.status === 200) {
            const clone = response.clone();
            caches
                .open(cacheName)
                .then((cache) => cache.put(request, clone));
        }

        return response;

    } catch (err) {

        const cached = await caches.match(request);

        if (cached) return cached;

        return new Response("", { status: 504, statusText: "Offline" });
    }
}
