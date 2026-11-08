import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
  plugins: [
    {
      name: "offline-shell",
      apply: "build",
      writeBundle(options, bundle) {
        const directory = options.dir!;
        const files = [
          ...new Set([...Object.keys(bundle), ...readdirSync("public")]),
        ].sort();
        const hash = createHash("sha256");
        for (const name of files)
          hash.update(readFileSync(resolve(directory, name)));
        const cache = "last-degree-" + hash.digest("hex").slice(0, 12);
        writeFileSync(
          resolve(directory, "sw.js"),
          `
const CACHE=${JSON.stringify(cache)};
const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(file=>new Request(file,{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('last-degree-')&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||!url.href.startsWith(self.registration.scope))return;
  if(event.request.mode==='navigate'){
    event.respondWith(caches.open(CACHE).then(cache=>cache.match('index.html')).then(response=>response||fetch(event.request)));
  }else{
    event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreVary:true})).then(response=>response||fetch(event.request)));
  }
});`,
        );
      },
    },
  ],
});
