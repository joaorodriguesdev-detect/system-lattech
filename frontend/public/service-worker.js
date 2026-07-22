

self.addEventListener('push', function (event) {
    if (!event.data) return;
  
    const data = event.data.json();
  
    const options = {
      body: data.body,
      icon: '/icon-192.png',      // ajuste pro caminho do seu ícone/logo
      badge: '/icon-192.png',
      data: { url: data.url || '/admin/dashboard' },
      vibrate: [200, 100, 200],
    };
  
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  });
  
  // Ao clicar na notificação, abre (ou foca) o dashboard
  self.addEventListener('notificationclick', function (event) {
    event.notification.close();
  
    const targetUrl = event.notification.data?.url || '/admin/dashboard';
  
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  });