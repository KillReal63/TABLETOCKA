self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{}}catch{}
  event.waitUntil(self.registration.showNotification(data.title||'Вовремя',{
    body:data.body||'Открой расписание приёма лекарств.',
    icon:'/vovrema/icon-192.png',badge:'/vovrema/icon-192.png',tag:data.tag||'vovremya',data:{url:'/vovrema/'},
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){const url=new URL(client.url);if(url.origin===self.location.origin&&(url.pathname.startsWith('/vovrema/')||url.pathname==='/')){if(url.pathname==='/')await client.navigate('/vovrema/');await client.focus();return}}
    await self.clients.openWindow('/vovrema/');
  })());
});
