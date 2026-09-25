self.addEventListener("push", (event) => {
  let payload = { title: "クレスノート", body: "", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    const text = event.data ? event.data.text() : "";
    if (text) payload.body = text;
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "クレスノート", {
      body: payload.body || "クレスチェックの時間です",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});
