(()=>{
'use strict';
window.IVTC=window.IVTC||{};
const VERSION='8.2.5';
const FAVORITES_KEY='ivtc-favorites';
const LAST_SYNC_KEY='ivtc.wholeTrip.lastSync.v1';
function state(){const s=window.IVTC.firebase?._state;if(!s?.user||!s.db||!s.api)throw new Error('Sign in before synchronizing the trip.');return s;}
function timeout(promise,ms,label){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out after ${Math.round(ms/1000)} seconds.`)),ms))]);}
function serial(v){if(!v)return null;if(typeof v==='string')return v;if(v.toDate)return v.toDate().toISOString();if(v.seconds)return new Date(v.seconds*1000).toISOString();return v;}
function favorites(){try{const v=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function cleanFavorites(items){const map=new Map();for(const x of items||[]){if(!x?.url)continue;const prev=map.get(x.url);if(!prev||String(x.added||'')>String(prev.added||''))map.set(x.url,{url:x.url,title:x.title||x.url,added:x.added||new Date().toISOString()});}return [...map.values()].sort((a,b)=>String(b.added).localeCompare(String(a.added)));}
function mergeFavorites(a,b){return cleanFavorites([...(a||[]),...(b||[])]);}
function shadowTrips(){try{const v=JSON.parse(localStorage.getItem('ivtc.cloudTrips.shadow.v1')||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function fastActiveTrip(){
 const selected=window.IVTC.tripCloud?.selectedTrip?.()||{};
 const id=selected.id||localStorage.getItem('ivtc.activeTripId');
 if(!id)return null;
 const shadow=shadowTrips().find(t=>t?.id===id)||{};
 return {...shadow,...selected,id,label:selected.label||shadow.label||localStorage.getItem('ivtc.activeTripLabel')||'Active trip'};
}
async function activeTrip({allowRepositoryFallback=true}={}){
 const fast=fastActiveTrip();if(fast?.id)return fast;
 if(allowRepositoryFallback&&window.IVTC.tripRepository?.ensureActiveTrip){const resolved=await window.IVTC.tripRepository.ensureActiveTrip();if(resolved?.id)return resolved;}
 throw new Error('Choose an active trip in My Trips first.');
}
async function enrichTrip(trip){
 if(trip?.itinerary?.stages?.length)return trip;
 try{const packaged=await timeout(window.IVTC.tripRepository?.packagedTrip?.(),3000,'Packaged itinerary read');if(packaged?.stages?.length)return {...trip,packagedVersion:trip.packagedVersion||packaged.version||null,itinerary:{title:packaged.title||null,subtitle:packaged.subtitle||null,ship:packaged.ship||null,stateroom:packaged.stateroom||null,hotel:packaged.hotel||null,stages:packaged.stages}};}catch{}
 return trip;
}
async function localSnapshot(existingTrip=null){const trip=await enrichTrip(existingTrip||await activeTrip());return {schema:1,tripId:trip.id,trip:{label:trip.label||null,startDate:trip.startDate||null,endDate:trip.endDate||null,travelers:Number(trip.travelers||1),status:trip.status||'active',packagedVersion:trip.packagedVersion||null,itinerary:trip.itinerary||null},favorites:cleanFavorites(favorites())};}
async function getRemote(tripId){const s=state();const snap=await timeout(s.api.getDoc(s.api.doc(s.db,'trips',tripId)),12000,'Whole-trip cloud read');if(!snap.exists())throw new Error('The active trip does not exist in Firestore.');return {id:snap.id,...snap.data()};}
function applyLocal(remote){const sync=remote.wholeTripSync||{};if(Array.isArray(sync.favorites))localStorage.setItem(FAVORITES_KEY,JSON.stringify(cleanFavorites(sync.favorites)));
 const trip={id:remote.id,...remote};window.IVTC.tripCloud?.selectTrip?.(trip);try{const shadow=JSON.parse(localStorage.getItem('ivtc.cloudTrips.shadow.v1')||'[]');const i=shadow.findIndex(x=>x.id===trip.id);const clean={...trip,createdAt:serial(trip.createdAt),updatedAt:serial(trip.updatedAt)};if(i>=0)shadow[i]={...shadow[i],...clean};else shadow.unshift(clean);localStorage.setItem('ivtc.cloudTrips.shadow.v1',JSON.stringify(shadow));}catch{}
 window.dispatchEvent(new CustomEvent('ivtc:whole-trip-applied',{detail:{tripId:remote.id,revision:Number(sync.revision||0)}}));return sync;
}
async function push({force=false}={}){const s=state(),local=await localSnapshot(),remote=await getRemote(local.tripId),prior=remote.wholeTripSync||{};const mergedFavorites=mergeFavorites(prior.favorites,local.favorites);const revision=Math.max(Number(prior.revision||0),Number(localStorage.getItem(LAST_SYNC_KEY+'.revision')||0))+1;const payload={schema:1,revision,updatedAt:new Date().toISOString(),updatedBy:s.user.uid,deviceId:localStorage.getItem('ivtc.vault.deviceId')||null,favorites:mergedFavorites};
 const top={...local.trip,wholeTripSync:payload,wholeTripSyncUpdatedAt:s.api.serverTimestamp(),updatedAt:s.api.serverTimestamp()};
 await timeout(s.api.updateDoc(s.api.doc(s.db,'trips',local.tripId),top),15000,'Whole-trip upload');
 localStorage.setItem(FAVORITES_KEY,JSON.stringify(mergedFavorites));localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());localStorage.setItem(LAST_SYNC_KEY+'.revision',String(revision));
 return {tripId:local.tripId,revision,favorites:mergedFavorites.length,updatedAt:payload.updatedAt,mode:'uploaded'};
}
async function pull(){const local=await localSnapshot(),remote=await getRemote(local.tripId),sync=remote.wholeTripSync||{};applyLocal(remote);localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());localStorage.setItem(LAST_SYNC_KEY+'.revision',String(sync.revision||0));return {tripId:remote.id,revision:Number(sync.revision||0),favorites:(sync.favorites||[]).length,updatedAt:serial(sync.updatedAt||remote.wholeTripSyncUpdatedAt||remote.updatedAt),mode:'downloaded'};}
async function synchronize(){const local=await localSnapshot(),remote=await getRemote(local.tripId),cloud=remote.wholeTripSync||{},cloudRev=Number(cloud.revision||0),localRev=Number(localStorage.getItem(LAST_SYNC_KEY+'.revision')||0);if(cloudRev>localRev){applyLocal(remote);localStorage.setItem(LAST_SYNC_KEY+'.revision',String(cloudRev));return {tripId:remote.id,revision:cloudRev,favorites:(cloud.favorites||[]).length,mode:'downloaded',updatedAt:serial(cloud.updatedAt)};}return push();}

function nowMs(){return (window.performance&&performance.now)?performance.now():Date.now();}
async function profiledStep(name,path,operation,limitMs=12000,onEvent){
 const started=nowMs();
 onEvent?.({type:'start',name,path,startedAt:new Date().toISOString()});
 try{
  const value=await timeout(operation(),limitMs,name);
  const elapsed=Math.round(nowMs()-started);
  onEvent?.({type:'success',name,path,elapsed,value});
  return {ok:true,value,elapsed};
 }catch(error){
  const elapsed=Math.round(nowMs()-started);
  const message=error?.message||String(error);
  onEvent?.({type:'failure',name,path,elapsed,error:message});
  return {ok:false,error:message,elapsed};
 }
}
async function profileCloudReads(onEvent){
 const overall=nowMs();
 const results=[];
 const record=e=>{results.push(e);onEvent?.(e);};
 let s;
 try{
  s=state();
  record({type:'success',name:'Firebase session',path:'Authentication + Firestore initialization',elapsed:0,value:{uid:s.user.uid,projectId:s.app?.options?.projectId||null,sdk:'12.1.0',online:navigator.onLine}});
 }catch(error){
  record({type:'failure',name:'Firebase session',path:'Authentication + Firestore initialization',elapsed:0,error:error.message});
  return {ok:false,results,totalElapsed:Math.round(nowMs()-overall),reservationCount:null};
 }

 let trip=null;
 const fast=await profiledStep('Resolve active trip — fast path','localStorage: ivtc.activeTripId + trip shadow',()=>Promise.resolve(fastActiveTrip()),1000,record);
 if(fast.ok&&fast.value?.id)trip=fast.value;
 else{
  record({type:'info',name:'Resolve active trip — fast path result',path:'localStorage: ivtc.activeTripId + trip shadow',elapsed:fast.elapsed||0,error:'No stored canonical trip ID; repository fallback required.'});
  const fallback=await profiledStep('Resolve active trip — repository fallback','tripRepository.ensureActiveTrip()',()=>activeTrip({allowRepositoryFallback:true}),6000,record);
  if(fallback.ok&&fallback.value?.id)trip=fallback.value;
 }
 const tripId=trip?.id||localStorage.getItem('ivtc.activeTripId')||null;
 if(!tripId){
  record({type:'failure',name:'Canonical trip ID',path:'local trip state',elapsed:0,error:'No canonical trip ID is available. Open My Trips and select the trip.'});
  const summary={ok:false,tripId:null,local:null,remote:null,reservationCount:null,totalElapsed:Math.round(nowMs()-overall),results};
  record({type:'complete',name:'Profiler complete',path:'Whole-trip download pipeline',elapsed:summary.totalElapsed,value:summary});
  return summary;
 }
 record({type:'success',name:'Canonical trip ID',path:'trips/'+tripId,elapsed:0,value:{tripId}});

 const local=await profiledStep('Build local snapshot','trip shadow + packaged itinerary + local favorites',()=>localSnapshot(trip),6000,record);
 const ref=s.api.doc(s.db,'trips',tripId);
 let remote=null;

 // Each Firestore strategy is independently bounded. A stalled server-only read
 // can no longer prevent cache/default reads or the remaining collection tests.
 if(typeof s.api.getDocFromServer==='function'){
  const server=await profiledStep('Trip document — server','trips/'+tripId+' [getDocFromServer]',()=>s.api.getDocFromServer(ref),6000,record);
  if(server.ok&&server.value?.exists?.())remote={id:server.value.id,...server.value.data()};
  else if(server.ok)record({type:'failure',name:'Trip document — server result',path:'trips/'+tripId,elapsed:server.elapsed,error:'Server responded, but the document does not exist.'});
 }else record({type:'info',name:'Trip document — server',path:'trips/'+tripId,elapsed:0,error:'getDocFromServer is unavailable in this Firebase build.'});

 if(!remote&&typeof s.api.getDocFromCache==='function'){
  const cache=await profiledStep('Trip document — cache','trips/'+tripId+' [getDocFromCache]',()=>s.api.getDocFromCache(ref),3000,record);
  if(cache.ok&&cache.value?.exists?.())remote={id:cache.value.id,...cache.value.data()};
  else if(cache.ok)record({type:'failure',name:'Trip document — cache result',path:'trips/'+tripId,elapsed:cache.elapsed,error:'No cached trip document exists on this device.'});
 }

 if(!remote){
  const normal=await profiledStep('Trip document — default','trips/'+tripId+' [getDoc]',()=>s.api.getDoc(ref),6000,record);
  if(normal.ok&&normal.value?.exists?.())remote={id:normal.value.id,...normal.value.data()};
  else if(normal.ok)record({type:'failure',name:'Trip document — default result',path:'trips/'+tripId,elapsed:normal.elapsed,error:'The document does not exist.'});
 }

 if(remote){
  await profiledStep('Inspect itinerary','trips/'+tripId+'.itinerary.stages',()=>Promise.resolve({count:Array.isArray(remote.itinerary?.stages)?remote.itinerary.stages.length:0}),1000,record);
  await profiledStep('Inspect favorites','trips/'+tripId+'.wholeTripSync.favorites',()=>Promise.resolve({count:Array.isArray(remote.wholeTripSync?.favorites)?remote.wholeTripSync.favorites.length:0,revision:Number(remote.wholeTripSync?.revision||0)}),1000,record);
  await profiledStep('Inspect travelers','trips/'+tripId+'.travelers',()=>Promise.resolve({count:Number(remote.travelers||1)}),1000,record);
 }else{
  for(const [name,path] of [['Inspect itinerary','itinerary.stages'],['Inspect favorites','wholeTripSync.favorites'],['Inspect travelers','travelers']])record({type:'info',name,path:'trips/'+tripId+'.'+path,elapsed:0,error:'Not tested because the trip document was unavailable.'});
 }

 // Run collection probes even when the parent trip read fails. This distinguishes
 // a single-document issue from a broader Firestore transport or rules problem.
 const reservations=await profiledStep('Reservations collection','trips/'+tripId+'/reservations [getDocs]',()=>s.api.getDocs(s.api.collection(s.db,'trips',tripId,'reservations')),6000,record);
 const members=await profiledStep('Members collection','trips/'+tripId+'/members [getDocs]',()=>s.api.getDocs(s.api.collection(s.db,'trips',tripId,'members')),6000,record);
 const merge=await profiledStep('Validate local merge','remote trip + local favorites (read-only simulation)',()=>Promise.resolve(remote?{favorites:mergeFavorites(remote.wholeTripSync?.favorites||[],local.ok?local.value.favorites:[]).length,tripId}:{skipped:true}),1000,record);
 const summary={
  ok:!!remote,
  tripId,
  local:local.ok?local.value:null,
  remote,
  reservationCount:reservations.ok?reservations.value.size:null,
  reservationsTested:true,
  memberCount:members.ok?members.value.size:null,
  membersTested:true,
  mergeValidated:merge.ok&&!merge.value?.skipped,
  totalElapsed:Math.round(nowMs()-overall),
  results
 };
 record({type:'complete',name:'Profiler complete',path:'Whole-trip download pipeline',elapsed:summary.totalElapsed,value:summary});
 return summary;
}

async function auditLocal(){const trip=await activeTrip();const local=await localSnapshot();return {tripId:trip.id,label:trip.label||'Active trip',localRevision:Number(localStorage.getItem(LAST_SYNC_KEY+'.revision')||0),favoritesLocal:local.favorites.length,travelersLocal:Number(local.trip.travelers||1),itineraryDaysLocal:Array.isArray(local.trip.itinerary?.stages)?local.trip.itinerary.stages.length:0,lastDeviceSync:localStorage.getItem(LAST_SYNC_KEY)};}
async function auditCloud(tripId){const s=state();let remote=null;let readError=null;const ref=s.api.doc(s.db,'trips',tripId);try{const reader=s.api.getDocFromServer? s.api.getDocFromServer(ref):s.api.getDoc(ref);const snap=await timeout(reader,18000,'Cloud trip audit');if(!snap.exists())throw new Error('The canonical trip was not found in Firestore.');remote={id:snap.id,...snap.data()};}catch(error){readError=error?.message||String(error);try{const snap=await timeout(s.api.getDoc(ref),8000,'Cached trip audit');if(snap.exists())remote={id:snap.id,...snap.data()};}catch{} }
 let reservations=null,reservationError=null;try{const q=await timeout(s.api.getDocs(s.api.collection(s.db,'trips',tripId,'reservations')),10000,'Reservation audit');reservations=q.size;}catch(error){reservationError=error?.message||String(error);}
 if(!remote)return {available:false,error:readError||'Cloud values unavailable.',reservationsCloud:reservations,reservationError};
 const sync=remote.wholeTripSync||{};return {available:true,tripId:remote.id,label:remote.label||'Active trip',cloudRevision:Number(sync.revision||0),cloudUpdatedAt:serial(sync.updatedAt||remote.wholeTripSyncUpdatedAt||remote.updatedAt),favoritesCloud:Array.isArray(sync.favorites)?sync.favorites.length:0,reservationsCloud:reservations,reservationError,travelersCloud:Number(remote.travelers||1),itineraryDaysCloud:Array.isArray(remote.itinerary?.stages)?remote.itinerary.stages.length:0,readWarning:readError};}
async function audit(){const local=await auditLocal();const cloud=await auditCloud(local.tripId);return {local,cloud};}
let timer=null;function schedule(){clearTimeout(timer);timer=setTimeout(()=>synchronize().catch(()=>{}),2500);}window.addEventListener('ivtc:favorites-changed',schedule);window.addEventListener('online',()=>setTimeout(()=>synchronize().catch(()=>{}),1000));
window.IVTC.wholeTripSync=Object.freeze({version:VERSION,localSnapshot,getRemote,push,pull,synchronize,auditLocal,auditCloud,audit,profileCloudReads,schedule});
})();
