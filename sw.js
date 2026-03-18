// O Service Worker é necessário para que o celular permita a instalação do PWA
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Instalado');
});

self.addEventListener('fetch', (e) => {
    e.respondWith(fetch(e.request));
});