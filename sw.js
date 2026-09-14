const CACHE='chuanxi-2026-v17';
const CORE=['./','./index.html','./dashboard.html','./avatars.js','./roadtrip-pro.js','./mobile-fix.js','./personal-app.js','./cash-net-fix.js','./gate-sync.js','./precision-map-profile.js','./map-lite-ui.js','./ledger-editor-v3.js','./pro/p1.txt','./pro/p2.txt','./pro/p3.txt','./pro/p4.txt','./pro/p5.txt','./pro/p6.txt','./manifest.webmanifest','./icon.svg','./road-routes.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 const isTile=u.hostname.endsWith('autonavi.com')||u.hostname==='map.geoq.cn'||u.hostname.endsWith('tile.openstreetmap.org')||u.hostname==='server.arcgisonline.com';
 if(isTile){e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));return;}
 if(u.hostname==='api.open-meteo.com'){
   e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return;
 }
 if(u.origin===location.origin){
   const networkFirst=['/joe/','/joe/index.html','/joe/dashboard.html','/joe/avatars.js','/joe/roadtrip-pro.js','/joe/mobile-fix.js','/joe/personal-app.js','/joe/cash-net-fix.js','/joe/gate-sync.js','/joe/precision-map-profile.js','/joe/map-lite-ui.js','/joe/ledger-editor-v3.js'].some(x=>u.pathname===x);
   if(networkFirst){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return;}
   e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r})));
 }
});