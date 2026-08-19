/* ============================================================
   FX.01 — SERVICE WORKER
   ------------------------------------------------------------
   Responsável por:
   - Funcionamento offline
   - Cache dos arquivos essenciais
   - Atualização controlada
   - Remoção de caches antigos
   - Recuperação de arquivos em caso de indisponibilidade
   ============================================================ */

"use strict";

/* ============================================================
   IDENTIDADE DA VERSÃO
   ============================================================ */

const FX_VERSION = "fx-01";
const CACHE_PREFIX = "fx-cache-";
const CACHE_NAME = `${CACHE_PREFIX}${FX_VERSION}`;

/*
 * Cache separado para recursos externos,
 * caso o projeto utilize algum futuramente.
 */
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${FX_VERSION}`;

/*
 * Arquivos fundamentais do aplicativo.
 * Tudo aqui deve existir na raiz do repositório.
 */
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./sw.js",
  "./icon-192.png",
  "./icon-512.png"
];

/* ============================================================
   INSTALAÇÃO
   ============================================================ */

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

/* ============================================================
   ATIVAÇÃO
   ============================================================ */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (
              cacheName.startsWith(CACHE_PREFIX) &&
              cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE
            ) {
              return caches.delete(cacheName);
            }
            return Promise.resolve(false);
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

/* ============================================================
   INTERCEPTAÇÃO DAS REQUISIÇÕES
   ============================================================ */

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (!request.url.startsWith("http")) {
    return;
  }

  event.respondWith(handleFetch(request));
});

/* ============================================================
   ESTRATÉGIA DE CACHE
   ============================================================ */

async function handleFetch(request) {
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return fetch(request);
  }

  if (request.mode === "navigate") {
    return networkFirst(request);
  }

  return cacheFirst(request);
}

/* ============================================================
   NETWORK FIRST
   ============================================================ */

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request, {
      cache: "no-cache"
    });

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const fallback = await caches.match("./index.html");

    if (fallback) {
      return fallback;
    }

    return new Response(offlineHTML(), {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  }
}

/* ============================================================
   CACHE FIRST
   ============================================================ */

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    updateCacheInBackground(request);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    if (request.destination === "image") {
      return new Response("", {
        status: 404
      });
    }

    return new Response("Recurso indisponível offline.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
}

/* ============================================================
   ATUALIZAÇÃO EM SEGUNDO PLANO
   ============================================================ */

async function updateCacheInBackground(request) {
  try {
    const response = await fetch(request, {
      cache: "no-cache"
    });

    if (!response || !response.ok) {
      return;
    }

    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  } catch (error) {
    // Falha silenciosa se estiver offline.
  }
}

/* ============================================================
   FALLBACK OFFLINE
   ============================================================ */

function offlineHTML() {
  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#111111">
  <title>FX — Offline</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: #0a0a0a;
      color: #f4f2ed;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .offline {
      width: 100%;
      max-width: 360px;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      font-weight: 800;
      margin-bottom: 18px;
      color: #c9a227;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 24px;
    }
    p {
      margin: 0;
      color: #aaa69d;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <main class="offline">
    <div class="logo">FX</div>
    <h1>FX está offline</h1>
    <p>
      Não foi possível carregar esta tela no momento.
      Seus dados locais continuam seguros no dispositivo.
    </p>
  </main>
</body>
</html>
  `;
}

/* ============================================================
   MENSAGENS PARA O APLICATIVO
   ============================================================ */

self.addEventListener("message", event => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "GET_VERSION") {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: "VERSION",
        version: FX_VERSION
      });
    }
  }
});

/* ============================================================
   PROTEÇÃO CONTRA ERROS
   ============================================================ */

self.addEventListener("error", event => {
  console.error("FX Service Worker:", event.error);
});

self.addEventListener("unhandledrejection", event => {
  console.error("FX Service Worker — Promise rejeitada:", event.reason);
});
