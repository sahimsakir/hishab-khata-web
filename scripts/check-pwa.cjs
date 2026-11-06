const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = require('node:path').resolve(__dirname, '..') + '/';
const listeners = {};
let cached = [];
const offline = { status: 200, body: 'offline' };
const cache = { addAll: async urls => {cached = urls;}, match: async () => offline };
const sandbox = { URL, self: { location: {origin:'https://example.com'}, clients: {claim:async()=>{}}, addEventListener:(name,fn)=>listeners[name]=fn }, caches: {open:async()=>cache,keys:async()=>[],delete:async()=>true}, fetch:async()=>{throw new Error('offline');} };
vm.runInNewContext(fs.readFileSync(root+'public/sw.js','utf8'), sandbox);
(async()=>{
 let task; listeners.install({waitUntil:p=>task=p}); await task;
 assert(cached.includes('/offline.html'));
 assert(cached.every(p=>!p.startsWith('/api') && p!=='/index.html'));
 for(const [method,path] of [['GET','/api/finance'],['GET','/api/auth/google/callback'],['POST','/api/transactions'],['GET','/api']]) {
  let intercepted=false; listeners.fetch({request:{method,url:'https://example.com'+path,mode:'navigate'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 }
 let response;listeners.fetch({request:{method:'GET',url:'https://example.com/dashboard',mode:'navigate'},respondWith:p=>response=p}); assert.equal(await response,offline);
 const manifest=JSON.parse(fs.readFileSync(root+'public/manifest.webmanifest','utf8'));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');
 for(const icon of manifest.icons) assert(fs.existsSync(root+'public'+icon.src));
 console.log('PASS manifest icons, private API exclusion, no cached app pages, offline navigation fallback');
})();
