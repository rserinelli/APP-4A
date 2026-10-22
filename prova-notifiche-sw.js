/* Prova notifiche (22 ottobre 2026) — service worker SOLO della pagina di prova.
   Ambito: /APP-4A/prova-notifiche… (non tocca sw.js dell'app vera).
   Mostra sempre una notifica per ogni messaggio (su iPhone è obbligatorio). */
'use strict';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var p = {};
  try { p = e.data ? e.data.json() : {}; } catch (x) { p = { data: { testo: e.data ? e.data.text() : '' } }; }
  var d = p.data || {}, n = p.notification || {};
  var titolo = d.titolo || n.title || '4a primaria';
  var opz = {
    body: d.testo || n.body || 'Notifica di prova',
    icon: 'icona-192.png',
    badge: 'icona-192.png',
    tag: d.id || undefined,
    data: { url: d.url || 'prova-notifiche.html' }
  };
  e.waitUntil(self.registration.showNotification(titolo, opz));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || 'prova-notifiche.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].url.indexOf('prova-notifiche') >= 0 && 'focus' in lista[i]) return lista[i].focus();
    }
    return self.clients.openWindow(url);
  }));
});
