// Service worker de CLUBIO: recibe las notificaciones push del panel (mensajes nuevos de
// WhatsApp) aunque el navegador o la app estén cerrados, y al tocarlas abre el chat.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || "CLUBIO";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Tenés un mensaje nuevo",
      icon: "/icon.jpeg",
      badge: "/icon.jpeg",
      tag: data.tag || "clubio",
      renotify: true,
      data: { url: data.url || "/dashboard/whatsapp" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/dashboard/whatsapp", self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of ventanas) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        return c.navigate(url);
      }
    }
    return self.clients.openWindow(url);
  })());
});
