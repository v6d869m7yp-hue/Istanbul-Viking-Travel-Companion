(()=>{
'use strict';
window.IVTC=window.IVTC||{};
const LOCAL_QUEUE='ivtc.tripSync.pending.v1';
function state(){const s=window.IVTC.firebase?._state;if(!s?.user||!s.db||!s.api)return null;return s;}
function trip(){return {id:localStorage.getItem('ivtc.activeTripId'),label:localStorage.getItem('ivtc.activeTripLabel')};}
function ready(){const s=state(),t=trip();return !!(s&&t.id);}
function keyForUrl(url){return btoa(unescape(encodeURIComponent(url))).replace(/[+/=]/g,m=>({'+':'-','/':'_','=':''}[m]));}
function queue(){try{return JSON.parse(localStorage.getItem(LOCAL_QUEUE)||'[]')}catch{return[]}}
function saveQueue(items){localStorage.setItem(LOCAL_QUEUE,JSON.stringify(items.slice(-500)));}
function enqueue(change){const items=queue();items.push({...change,queuedAt:new Date().toISOString()});saveQueue(items);window.dispatchEvent(new CustomEvent('ivtc:trip-sync-queued',{detail:change}));}
function refs(kind,id){const s=state(),t=trip();return {s,t,ref:s.api.doc(s.db,'trips',t.id,kind,id)};}
async function activity(action,entityType,entityId,summary){if(!ready())return;const s=state(),t=trip(),ref=s.api.doc(s.api.collection(s.db,'trips',t.id,'activity'));await s.api.setDoc(ref,{action,entityType,entityId,summary:summary||'',actorUid:s.user.uid,deviceId:localStorage.getItem('ivtc-vault-device-id')||'browser',createdAt:s.api.serverTimestamp(),release:'7.0.1'});}
async function upsertFavorite(item){if(!ready()){enqueue({op:'upsert',kind:'favorites',item});return {queued:true}}const {s,ref}=refs('favorites',keyForUrl(item.url));await s.api.setDoc(ref,{...item,url:item.url,title:item.title||item.url,updatedAt:s.api.serverTimestamp(),updatedBy:s.user.uid},{merge:true});await activity('upsert','favorite',item.url,item.title);return {queued:false};}
async function removeFavorite(url){if(!ready()){enqueue({op:'remove',kind:'favorites',url});return {queued:true}}const {s,ref}=refs('favorites',keyForUrl(url));await s.api.deleteDoc(ref);await activity('remove','favorite',url,'Removed favorite');return {queued:false};}
async function listFavorites(){if(!ready())return [];const s=state(),t=trip();const snap=await s.api.getDocs(s.api.collection(s.db,'trips',t.id,'favorites'));return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.added||'').localeCompare(String(a.added||'')));}
async function flush(){if(!ready())return {connected:false,pending:queue().length};const pending=queue(),remaining=[];for(const c of pending){try{if(c.kind==='favorites'&&c.op==='upsert')await upsertFavorite(c.item);else if(c.kind==='favorites'&&c.op==='remove')await removeFavorite(c.url);}catch(e){remaining.push(c)}}saveQueue(remaining);return {connected:true,pending:remaining.length,processed:pending.length-remaining.length};}
async function mergeFavorites(local){if(!ready())return {connected:false,items:local||[]};await flush();const cloud=await listFavorites();const map=new Map();for(const x of [...(local||[]),...cloud]){const prev=map.get(x.url);if(!prev||String(x.updatedAt?.seconds||x.added||'')>String(prev.updatedAt?.seconds||prev.added||''))map.set(x.url,{url:x.url,title:x.title,added:x.added||new Date().toISOString()});}const items=[...map.values()].sort((a,b)=>String(b.added).localeCompare(String(a.added)));for(const item of items)await upsertFavorite(item);return {connected:true,items};}
async function status(){const s=state(),t=trip();return {connected:!!s,activeTrip:!!t.id,tripId:t.id||null,tripLabel:t.label||null,pending:queue().length,collections:['reservations','favorites','activity','vault']};}
window.IVTC.tripSync=Object.freeze({status,flush,mergeFavorites,listFavorites,upsertFavorite,removeFavorite,activity});
})();