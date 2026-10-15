// APP "4a primaria" — service worker (v10.16). Serve a far installare l'app su Android ("Scarica l'app")
// e ad aprire la pagina anche con poca connessione. Strategia: prima la rete, la copia salvata solo se manca internet.
// I dati (script Google) e il video NON passano di qui: arrivano sempre dalla rete.
const CACHE = 'app4a-v10.16';
const FILE = ['./', 'index.html', 'manifest.webmanifest', 'icona-192.png', 'icona-512.png', 'icona-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILE.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => r.ok ? c.put(f, r) : null).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                                   // le chiamate allo script sono POST
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                         // script Google, font, ecc.: direttamente dalla rete
  if (url.pathname.indexOf('/video/') !== -1) return;                 // il video va dalla rete (Safari)
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
