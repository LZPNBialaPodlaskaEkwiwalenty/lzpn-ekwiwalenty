/* ======================================
   SW.JS - Service Worker
   Cache aplikacji, żeby działała offline
   (przynajmniej powłoka + wcześniej wczytane dane).

   Dane meczów i tak są trzymane lokalnie i
   synchronizowane z Firebase, gdy wróci internet -
   ten SW dba tylko o to, żeby sama strona (HTML/CSS/JS)
   dało się otworzyć bez zasięgu.
====================================== */

const CACHE_VERSION = "v2";
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
        // Własne pliki (HTML/CSS/JS): zawsze najpierw sieć, żeby
        // po każdej aktualizacji strony wystarczyło samo odświeżenie
        // (bez wylogowywania / zamykania karty). Cache to tylko
        // zapasowa kopia na wypadek braku internetu.
        event.respondWith(networkFirst(request, APP_SHELL_CACHE));
    } else {
        // Zewnętrzne biblioteki (fonty, ikony, PDF): network-first
        // z zapasem z cache, gdy nie ma internetu.
        event.respondWith(networkFirst(request, RUNTIME_CACHE));
    }
});

async function networkFirst(request, cacheName) {

    try {

        const response = await fetch(request, { cache: "no-store" });

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

        if (request.mode === "navigate") {
            return caches.match("./index.html");
        }

        return new Response("", { status: 504, statusText: "Offline" });
    }
}
