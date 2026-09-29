/* =========================================================
   Radar Vial — Service Worker (PWA)
   - Guarda la aplicación para que funcione sin conexión
   - Cachéa datos y cámaras de forma inteligente
   ========================================================= */
"use strict";

const CACHE_STATIC = "radar-vial-estatico-v5";
const CACHE_DATOS = "radar-vial-datos-v5";
const CACHE_IMAGENES = "radar-vial-imagenes-v5";

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icono.svg",
];

// Límites para no llenar el almacenamiento del dispositivo
const MAX_IMAGENES = 120;
const MAX_DATOS = 40;

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(
        claves
          .filter((k) => ![CACHE_STATIC, CACHE_DATOS, CACHE_IMAGENES].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function esImagen(url) {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) ||
    url.includes("atmsqf.iowadot.gov") ||
    url.includes("/snapshots/");
}

function esDato(url) {
  return url.includes("arcgis.com") ||
    url.includes("Live-Environment-Streams") ||
    url.includes("allorigins.win") ||
    url.includes("camaras.json") ||
    url.includes("raw.githubusercontent.com");
}

function esLibreria(url) {
  return url.includes("unpkg.com") ||
    url.includes("cdn.jsdelivr.net") ||
    url.includes("fastly.jsdelivr.net") ||
    url.includes("gcore.jsdelivr.net");
}

async function recortarCache(nombre, maximo) {
  const cache = await caches.open(nombre);
  const claves = await cache.keys();
  if (claves.length > maximo) {
    await Promise.all(claves.slice(0, claves.length - maximo).map((k) => cache.delete(k)));
  }
}

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return;

  const url = peticion.url;

  // Navegación: red primero, con respaldo a la app guardada
  if (peticion.mode === "navigate") {
    evento.respondWith(
      fetch(peticion)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_STATIC).then((c) => c.put("./index.html", copia));
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Librerías CDN: primero caché (son estables)
  if (esLibreria(url)) {
    evento.respondWith(
      caches.match(peticion).then((guardada) =>
        guardada ||
        fetch(peticion).then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_STATIC).then((c) => c.put(peticion, copia));
          return resp;
        })
      )
    );
    return;
  }

  // Datos (APIs y dataset mundial): red primero, caché como respaldo
  if (esDato(url)) {
    evento.respondWith(
      fetch(peticion)
        .then((resp) => {
          if (resp && resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE_DATOS).then((c) => {
              c.put(peticion, copia);
              recortarCache(CACHE_DATOS, MAX_DATOS);
            });
          }
          return resp;
        })
        .catch(() => caches.match(peticion))
    );
    return;
  }

  // Imágenes de cámaras: red primero, caché de respaldo (limitada)
  if (esImagen(url)) {
    evento.respondWith(
      caches.match(peticion).then((guardada) => {
        const red = fetch(peticion).then((resp) => {
          if (resp && resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE_IMAGENES).then((c) => {
              c.put(peticion, copia);
              recortarCache(CACHE_IMAGENES, MAX_IMAGENES);
            });
          }
          return resp;
        }).catch(() => guardada);

        return guardada || red;
      })
    );
    return;
  }

  // Resto: caché primero y red de respaldo
  evento.respondWith(
    caches.match(peticion).then((guardada) => guardada || fetch(peticion))
  );
});