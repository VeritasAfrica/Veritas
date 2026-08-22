/*
=========================================
PURPOSE INSTITUTE — SERVICE WORKER
Handles incoming push events and shows the
actual OS-level notification.
=========================================
*/

self.addEventListener("push", (event) => {

  const data = event.data ? event.data.json() : {};

  const title = data.title || "Purpose Institute";
  const options = {
    body: data.body || "You have an update.",
    icon: "/icon-192.png",   // replace with your actual logo file if you have one
    badge: "/icon-192.png",
    data: { url: data.url || "/dashboard.html" }
  };

  event.waitUntil(self.registration.showNotification(title, options));

});

self.addEventListener("notificationclick", (event) => {

  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );

});