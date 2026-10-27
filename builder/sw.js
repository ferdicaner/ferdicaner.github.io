const APP_CACHE = "resume-builder-app-v1";
const EXTERNAL_CACHE = "resume-builder-external-v1";

const APP_FILES = [
  "./",
  "index.html",
  "app.js",
  "render.js",
  "data.js",
  "builder.css",
  "resume.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

const SORTABLE_URL = "https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js";
// Must match the stylesheet link in index.html exactly.
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Roboto:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:ital,wght@0,400;0,700;1,400&family=Ubuntu:ital,wght@0,400;0,500;0,700;1,400&display=swap";
const EXTERNAL_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"]);

// Latin and Latin Extended cover English and Turkish; other scripts load on demand when online.
const FONT_FILES = /\/\*\s*(?:latin|latin-ext)\s*\*\/\s*@font-face\s*\{[^}]*?url\(([^)]+)\)/g;

async function cacheExternal(cache, url) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  await cache.put(url, response.clone());
  return response;
}

async function cacheFonts(cache) {
  const css = await (await cacheExternal(cache, FONTS_URL)).text();
  const urls = [...css.matchAll(FONT_FILES)].map((m) => m[1].replace(/["']/g, ""));
  await Promise.allSettled(urls.map((url) => cacheExternal(cache, url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await (await caches.open(APP_CACHE)).addAll(APP_FILES);
      const external = await caches.open(EXTERNAL_CACHE);
      await Promise.allSettled([cacheExternal(external, SORTABLE_URL), cacheFonts(external)]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([APP_CACHE, EXTERNAL_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("resume-builder-") && !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

// App files: answer from the cache at once, refresh it in the background so the next launch is current.
async function appResponse(event) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(event.request, { ignoreSearch: true });
  const refresh = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => null);
  event.waitUntil(refresh);
  if (cached) return cached;
  const fresh = await refresh;
  if (fresh) return fresh;
  if (event.request.mode === "navigate") return (await cache.match("./")) || Response.error();
  return Response.error();
}

// Fonts and the drag-and-drop library never change at a given URL.
async function externalResponse(request) {
  const cache = await caches.open(EXTERNAL_CACHE);
  const cached = await cache.match(request.url);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request.url, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith(new URL("./", self.location).pathname)) event.respondWith(appResponse(event));
  } else if (EXTERNAL_HOSTS.has(url.host)) {
    event.respondWith(externalResponse(event.request));
  }
});
