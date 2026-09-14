/* ======================================
   SW.JS — wersja wygaszająca
   Strona przeniosła się na kalkulatorlzpn.netlify.app.
   Ten Service Worker nie cache'uje już niczego —
   jego jedynym zadaniem jest samo-wyrejestrowanie się
   i wyczyszczenie starego cache u każdego, kto go jeszcze ma.
====================================== */

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {

    event.waitUntil(
        (async () => {

            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));

            await self.registration.unregister();

            const clientsList = await self.clients.matchAll({ type: "window" });
            clientsList.forEach((client) => client.navigate(client.url));

        })()
    );
});
