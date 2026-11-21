// NutriPlan: sin caché de datos para que cada actualización llegue al momento.
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  if(e.request.mode!=='navigate')return;
  e.respondWith(fetch(e.request).catch(function(){
    return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NutriPlan</title><body style="font-family:system-ui,sans-serif;padding:48px 24px;text-align:center;color:#24543b;background:#f7f8f5"><h2>Sin conexión</h2><p>NutriPlan necesita internet para cargar y guardar tus registros. Comprueba la conexión y vuelve a intentarlo.</p><button onclick="location.reload()" style="padding:12px 20px;border:0;border-radius:12px;background:#24543b;color:#fff;font-size:16px">Reintentar</button></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
  }));
});
