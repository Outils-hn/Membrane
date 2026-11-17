// Service worker de Membrane : l'appli s'ouvre aussi sans reseau (bureau, toit, sous-sol).
// En ligne : on prend toujours la version la plus recente, qu'on garde en copie. Hors ligne : on sert la copie.
// Les echanges avec la base (Supabase) ne passent jamais par ici.
const VERSION = "1.35";
const CACHE = "membrane-" + VERSION;
const DELAI_MS = 3000; // reseau trop lent (chantier, sous-sol) : apres 3 s on sert la copie
const FIXES = ["./", "index.html", "icone-192.png", "icone-512.png", "fonts/Geist-wght.woff2", "fonts/GeistMono-wght.woff2", "vendor/jspdf.umd.min.js", "vendor/jspdf.plugin.autotable.min.js", "vendor/fonts/IBMPlexSans-SemiBold.ttf", "vendor/fonts/IBMPlexSans-LICENSE.txt", "vendor/fonts/IBMPlexSans-Regular.ttf"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(FIXES.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("membrane-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// La page envoie la liste de ce qu'elle a charge (scripts, styles, polices) : tout part dans la copie hors ligne.
self.addEventListener("message", (e) => {
  const urls = (e.data && e.data.precache) || [];
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(urls.map((u) => c.add(u)))));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const memeOrigine = url.origin === self.location.origin;
  if (!memeOrigine) return; // base de donnees, etc. : on ne touche pas
  const copie = () => caches.match(req).then((m) => m || caches.match(req, { ignoreSearch: true })).then((m) => m || (req.mode === "navigate" ? caches.match("index.html") : Response.error()));
  e.respondWith((async () => {
    const reseau = fetch(req).then((rep) => {
      if (rep && rep.ok) { const c = rep.clone(); caches.open(CACHE).then((ch) => ch.put(req, c)); }
      return rep;
    });
    const delai = new Promise((res) => setTimeout(() => res(null), DELAI_MS));
    try {
      const rep = await Promise.race([reseau, delai]);
      if (rep) return rep;
      const m = await copie();
      return m && m.type !== "error" ? m : reseau; // pas de copie : on attend le reseau
    } catch (_) { return copie(); }
  })());
});
