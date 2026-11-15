// APP "4a primaria" — service worker (v12.19, 15/11/2026: le illustrazioni e le immagini della pagina (.webp, .png, .jpg) si
// salvano sul telefono: si mostrano subito dalla copia e intanto si scarica quella nuova, così un'immagine cambiata su GitHub arriva
// all'apertura dopo. Pagina, dati e video come prima. Prima: v12.2: cambiano il numero e la copia salvata; le notifiche dei sondaggi programmati aprono il messaggio pronto; prima v11.12 e v10.16). v11.12: mostra le notifiche dei colloqui (Firebase) e al tocco apre Ricevimento o la videochiamata.
// Serve a far installare l'app su Android ("Scarica l'app")
// e ad aprire la pagina anche con poca connessione. Strategia: prima la rete, la copia salvata solo se manca internet.
// I dati (script Google) e il video NON passano di qui: arrivano sempre dalla rete.
const CACHE = 'app4a-v12.19';
const CACHE_IMG = 'app4a-img';                                     // v12.19: non cambia nome a ogni versione (le immagini restano)
const ILL_HOME = ['documenti', 'sondaggi', 'megafono', 'cassa', 'calendario', 'libri', 'orario', 'colloqui', 'afterschool', 'divise', 'teatro', 'home'].map(n => n + '.webp');
const FILE = ['./', 'index.html', 'manifest.webmanifest', 'icona-192.png', 'icona-512.png', 'icona-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILE.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => r.ok ? c.put(f, r) : null).catch(() => null))))
    .then(() => caches.open(CACHE_IMG)).then(c => Promise.all(ILL_HOME.map(f => fetch(f).then(r => r.ok ? c.put(f, r) : null).catch(() => null))))   // v12.19
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE && x !== CACHE_IMG).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                                   // le chiamate allo script sono POST
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                         // script Google, font, ecc.: direttamente dalla rete
  if (url.pathname.indexOf('/video/') !== -1) return;                 // il video va dalla rete (Safari)
  if (/\.(webp|png|jpe?g)$/i.test(url.pathname)) {                   // v12.19: immagini subito dalla copia, aggiornate in sottofondo
    e.respondWith(caches.open(CACHE_IMG).then(c => c.match(req, { ignoreSearch: true }).then(salvata => {
      const nuova = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
      if (salvata) { e.waitUntil(nuova.catch(() => null)); return salvata; }
      return nuova;
    })));
    return;
  }
  e.respondWith(
    fetch(req).then(r => {
      if (r.ok && (req.mode === 'navigate' || FILE.some(f => url.pathname.endsWith('/' + f.replace('./', ''))))) {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? 'index.html' : req, copia));
      }
      return r;
    }).catch(() => caches.match(req).then(x => x || (req.mode === 'navigate' ? caches.match('index.html').then(y => y || Response.error()) : Response.error())))
  );
});

// ---------- v11.12: notifiche dei colloqui ----------
// Firebase manda solo dati (titolo, testo, url, id): la notifica la mostra sempre questo service worker (su iPhone è obbligatorio).
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (x) { p = { data: { testo: e.data ? e.data.text() : '' } }; }
  const d = p.data || {}, n = p.notification || {};
  e.waitUntil(self.registration.showNotification(d.titolo || n.title || '4a primaria', {
    body: d.testo || n.body || '',
    icon: 'icona-192.png',
    badge: 'badge-4a.png',
    tag: d.id || undefined,
    vibrate: [200, 100, 200],
    data: { url: d.url || './#ricevimento' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './#ricevimento', self.registration.scope).href;
  e.waitUntil((async () => {
    if (new URL(url).origin !== location.origin) return self.clients.openWindow(url);      // la videochiamata
    const aperte = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = aperte.find(c => c.url.indexOf(self.registration.scope) === 0);
    if (app) { await app.focus(); app.postMessage({ tipo: 'apri', url: url }); return; }
    return self.clients.openWindow(url);
  })());
});
