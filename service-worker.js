/* ============================================================
   FX.01 — SERVICE WORKER
   ------------------------------------------------------------
   Responsável por:
   - funcionamento offline
   - cache dos arquivos essenciais
   - atualização controlada
   - remoção de caches antigos
   - recuperação de arquivos em caso de indisponibilidade
   ============================================================ */

"use strict";


/* ============================================================
   IDENTIDADE DA VERSÃO
   ============================================================ */

const FX_VERSION = "fx-01";

const CACHE_PREFIX = "fx-cache-";

const CACHE_NAME =
  `${CACHE_PREFIX}${FX_VERSION}`;


/*
 * Cache separado para recursos externos,
 * caso o projeto utilize algum futuramente.
 */
const RUNTIME_CACHE =
  `${CACHE_PREFIX}runtime-${FX_VERSION}`;


/*
 * Arquivos fundamentais do aplicativo.
 *
 * Tudo aqui deve existir na raiz do repositório.
 */
const APP_SHELL = [

  "./",

  "./index.html",

  "./style.css",

  "./app.js",

  "./manifest.json",

  "./service-worker.js",

  "./icon-192.png",

  "./icon-512.png"

];


/* ============================================================
   INSTALAÇÃO
   ============================================================ */

self.addEventListener(
  "install",
  event => {

    /*
     * Não esperamos o navegador decidir
     * quando o novo worker deve assumir.
     *
     * A instalação termina somente depois
     * que os arquivos essenciais foram
     * armazenados corretamente.
     */

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then(cache => {

          return cache.addAll(
            APP_SHELL
          );

        })

        .then(() => {

          /*
           * Permite que a nova versão
           * seja ativada sem ficar esperando
           * todas as abas antigas fecharem.
           */

          return self.skipWaiting();

        })

    );

  }
);


/* ============================================================
   ATIVAÇÃO
   ============================================================ */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()

        .then(cacheNames => {

          return Promise.all(

            cacheNames.map(
              cacheName => {

                /*
                 * Só removemos caches que
                 * pertencem ao FX.
                 *
                 * Outros caches existentes no
                 * navegador não são tocados.
                 */

                if (
                  cacheName.startsWith(
                    CACHE_PREFIX
                  ) &&
                  cacheName !== CACHE_NAME &&
                  cacheName !== RUNTIME_CACHE
                ) {

                  return caches.delete(
                    cacheName
                  );

                }

                return Promise.resolve(
                  false
                );

              }
            )

          );

        })

        .then(() => {

          /*
           * Faz a nova versão assumir
           * imediatamente as páginas
           * abertas dentro do escopo.
           */

          return self.clients.claim();

        })

    );

  }
);


/* ============================================================
   INTERCEPTAÇÃO DAS REQUISIÇÕES
   ============================================================ */

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;


    /*
     * O FX é um aplicativo local.
     *
     * Não tentamos interceptar:
     * - POST
     * - PUT
     * - PATCH
     * - DELETE
     *
     * Apenas requisições GET podem
     * ser atendidas pelo cache.
     */

    if (
      request.method !== "GET"
    ) {

      return;

    }


    /*
     * Não manipulamos esquemas que não
     * sejam HTTP/HTTPS.
     */

    if (
      !request.url.startsWith(
        "http"
      )
    ) {

      return;

    }


    event.respondWith(
      handleFetch(request)
    );

  }
);


/* ============================================================
   ESTRATÉGIA DE CACHE
   ============================================================ */

async function handleFetch(
  request
) {

  const url =
    new URL(
      request.url
    );


  /*
   * Só tratamos recursos que estão
   * dentro do escopo do FX.
   *
   * Isso evita que o Service Worker
   * interfira em outros sites.
   */

  if (
    url.origin !==
    self.location.origin
  ) {

    return fetch(
      request
    );

  }


  /*
   * Para o documento principal:
   *
   * NETWORK FIRST
   *
   * Isso permite que uma atualização
   * do aplicativo seja encontrada
   * quando houver internet.
   *
   * Se estiver offline, usamos
   * imediatamente a cópia armazenada.
   */

  if (
    request.mode === "navigate"
  ) {

    return networkFirst(
      request
    );

  }


  /*
   * Para CSS, JS, imagens,
   * manifest etc.:
   *
   * CACHE FIRST
   *
   * O aplicativo continua extremamente
   * rápido e funcionando offline.
   */

  return cacheFirst(
    request
  );

}


/* ============================================================
   NETWORK FIRST
   ============================================================ */

async function networkFirst(
  request
) {

  try {

    const networkResponse =
      await fetch(
        request,
        {
          cache: "no-cache"
        }
      );


    /*
     * Só armazenamos respostas
     * válidas.
     */

    if (
      networkResponse &&
      networkResponse.ok
    ) {

      const cache =
        await caches.open(
          CACHE_NAME
        );


      await cache.put(
        request,
        networkResponse.clone()
      );

    }


    return networkResponse;


  } catch (error) {

    /*
     * Sem internet:
     * procura primeiro exatamente
     * a página solicitada.
     */

    const cachedResponse =
      await caches.match(
        request
      );


    if (cachedResponse) {

      return cachedResponse;

    }


    /*
     * Se não existir, usa o index
     * como fallback principal do FX.
     */

    const fallback =
      await caches.match(
        "./index.html"
      );


    if (fallback) {

      return fallback;

    }


    /*
     * Último recurso.
     */

    return new Response(
      offlineHTML(),
      {
        status: 503,
        headers: {
          "Content-Type":
            "text/html; charset=utf-8"
        }
      }
    );

  }

}


/* ============================================================
   CACHE FIRST
   ============================================================ */

async function cacheFirst(
  request
) {

  const cachedResponse =
    await caches.match(
      request
    );


  if (cachedResponse) {

    /*
     * Retorna imediatamente
     * o recurso armazenado.
     *
     * Paralelamente tentamos atualizar
     * a cópia quando houver rede.
     */

    updateCacheInBackground(
      request
    );


    return cachedResponse;

  }


  /*
   * Se ainda não estiver no cache,
   * busca pela rede.
   */

  try {

    const networkResponse =
      await fetch(
        request
      );


    if (
      networkResponse &&
      networkResponse.ok
    ) {

      const cache =
        await caches.open(
          CACHE_NAME
        );


      await cache.put(
        request,
        networkResponse.clone()
      );

    }


    return networkResponse;


  } catch (error) {

    /*
     * Se for uma imagem e estiver
     * indisponível, não derrubamos
     * o restante do aplicativo.
     */

    if (
      request.destination ===
      "image"
    ) {

      return new Response(
        "",
        {
          status: 404
        }
      );

    }


    return new Response(
      "Recurso indisponível offline.",
      {
        status: 503,
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      }
    );

  }

}


/* ============================================================
   ATUALIZAÇÃO EM SEGUNDO PLANO
   ============================================================ */

async function updateCacheInBackground(
  request
) {

  try {

    const response =
      await fetch(
        request,
        {
          cache: "no-cache"
        }
      );


    if (
      !response ||
      !response.ok
    ) {

      return;

    }


    const cache =
      await caches.open(
        CACHE_NAME
      );


    await cache.put(
      request,
      response
    );


  } catch (error) {

    /*
     * Falha silenciosa.
     *
     * Se estiver offline,
     * o cache atual continua válido.
     */

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

  <meta
    name="viewport"
    content="width=device-width,
             initial-scale=1,
             viewport-fit=cover"
  >

  <meta
    name="theme-color"
    content="#111827"
  >

  <title>FX</title>

  <style>

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: #111827;
      color: #ffffff;
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
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
    }

    h1 {
      margin: 0 0 10px;
      font-size: 24px;
    }

    p {
      margin: 0;
      opacity: 0.75;
      line-height: 1.5;
    }

  </style>

</head>

<body>

  <main class="offline">

    <div class="logo">
      FX
    </div>

    <h1>
      FX está offline
    </h1>

    <p>
      Não foi possível carregar
      esta tela agora.
      Seus dados locais continuam
      armazenados no dispositivo.
    </p>

  </main>

</body>

</html>
  `;

}


/* ============================================================
   MENSAGENS PARA O APLICATIVO
   ============================================================ */

self.addEventListener(
  "message",
  event => {

    if (
      !event.data
    ) {

      return;

    }


    /*
     * Permite que o aplicativo
     * solicite atualização imediata.
     */

    if (
      event.data.type ===
      "SKIP_WAITING"
    ) {

      self.skipWaiting();

    }


    /*
     * Permite consultar a versão
     * atualmente instalada.
     */

    if (
      event.data.type ===
      "GET_VERSION"
    ) {

      if (
        event.ports &&
        event.ports[0]
      ) {

        event.ports[0].postMessage({

          type: "VERSION",

          version:
            FX_VERSION

        });

      }

    }

  }
);


/* ============================================================
   PROTEÇÃO CONTRA ERROS
   ============================================================ */

self.addEventListener(
  "error",
  event => {

    /*
     * O Service Worker não deve
     * quebrar silenciosamente todo
     * o aplicativo por causa de uma
     * exceção inesperada.
     */

    console.error(
      "FX Service Worker:",
      event.error
    );

  }
);


self.addEventListener(
  "unhandledrejection",
  event => {

    console.error(
      "FX Service Worker — Promise rejeitada:",
      event.reason
    );

  }
);
