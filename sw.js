const REQUESTED_VERSION=new URL(self.location.href).searchParams.get("v")||"12.0.18";
const MIN_RUNTIME_VERSION="12.0.18";
const versionRank=v=>{
  const m=String(v||"").match(/^(\d+)\.(\d+)\.(\d+)/);
  return m?Number(m[1])*1e6+Number(m[2])*1e3+Number(m[3]):0;
};
const VERSION=versionRank(REQUESTED_VERSION)<versionRank(MIN_RUNTIME_VERSION)?MIN_RUNTIME_VERSION:REQUESTED_VERSION;
const CACHE="gb-admin-"+VERSION.replace(/[^A-Za-z0-9._-]/g,"_");
const SHELL=[
  "/admin.html",
  "/assets/icon-192.png","/assets/icon-light.png","/assets/logo-full.png","/assets/icon-512.png","/assets/favicon.ico"
];

async function cacheShell(cache){
  await Promise.all(SHELL.map(async url=>{
    try{
      const response=await fetch(url,{cache:"no-store",credentials:"same-origin"});
      if(response.ok) await cache.put(new Request(url),response);
    }catch{}
  }));
}

self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(async cache=>{
  await cacheShell(cache);
  await self.skipWaiting();
})));

self.addEventListener("activate",e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith("gb-admin-")&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener("message",e=>{
  if(e.data?.type==="SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push",e=>{
  let data={};
  try{data=e.data?.json()||{}}catch{try{data={body:e.data?.text()||""}}catch{}}
  e.waitUntil(self.registration.showNotification(data.title||"Gifted Brainz EduSpace Admin",{
    body:data.body||"",icon:"/assets/icon-192.png",badge:"/assets/icon-192.png",
    data:{url:data.url||"/admin.html"},tag:data.type||"gb-notification"
  }));
});

self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const target=e.notification.data?.url||"/admin.html";
  e.waitUntil((async()=>{
    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const c of clients){try{await c.focus();await c.navigate(target);return}catch{}}
    await self.clients.openWindow(target);
  })());
});

self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin || e.request.method!=="GET" || u.pathname.startsWith("/api/")) return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const r=await fetch(e.request,{cache:"no-store"});
      if(r.ok) cache.put(e.request,r.clone()).catch(()=>{});
      return r;
    }catch{
      return (await cache.match(e.request)) || (await cache.match("/admin.html"));
    }
  })());
});
