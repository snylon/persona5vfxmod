const CACHE = "bloom-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["./", "./icons/bloom-192.png", "./icons/bloom-512.png"])),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("bloom-shell-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  const isAsset = url.pathname.startsWith(`${scope.pathname}assets/`);
  if (
    request.method !== "GET" ||
    url.origin !== scope.origin ||
    (request.mode !== "navigate" && !isAsset)
  )
    return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match(self.registration.scope);
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
