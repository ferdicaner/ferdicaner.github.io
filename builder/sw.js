// Resume Builder moved to /resumebuilder/. Browsers that installed the old offline copy
// fetch this file on their next visit; it removes that copy and sends open windows to the new address.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("resume-builder-")).map((n) => caches.delete(n)));
      await self.clients.claim();
      const windows = await self.clients.matchAll({ type: "window" });
      await self.registration.unregister();
      const target = new URL("../resumebuilder/", self.location).href;
      await Promise.all(windows.map((client) => client.navigate(target).catch(() => null)));
    })()
  );
});
