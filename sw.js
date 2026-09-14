const CACHE='chuanxi-2026-v8';
const CORE=['./','./index.html','./dashboard.html','./avatars.js','./cloud-sync.js','./roadtrip-pro.js','./roadtrip-hotfix.js','./pro/p1.txt','./pro/p2.txt','./pro/p3.txt','./pro/p4.txt','./pro/p5.txt','./pro/p6.txt','./ios-widget.js','./manifest.webmanifest','./icon.svg','./road-routes.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname==='api.open-meteo.com'||u.hostname.endsWith('tile.openstreetmap.org')||u.hostname==='server.arcgisonline.com'){
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return;
  }
  if(u.origin===location.origin){
    const networkFirst=['/joe/','/joe/index.html','/joe/dashboard.html','/joe/avatars.js','/joe/cloud-sync.js','/joe/roadtrip-pro.js','/joe/roadtrip-hotfix.js','/joe/ios-widget.js'].some(x=>u.pathname===x);
    if(networkFirst){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return;}
    e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r})));
  }
});