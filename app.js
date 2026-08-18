(() => {
  "use strict";

  const FX = {
    name: "FX",
    version: "1.0.0",
    storageKey: "fx01_state"
  };

  function boot() {
    const root = document.getElementById("app");
    if (!root) return;
    root.innerHTML = '<div style="padding:24px"><h1>FX</h1><p>Seu dinheiro. Suas regras.</p></div>';

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    }
  }

  window.addEventListener("DOMContentLoaded", boot);
})();
