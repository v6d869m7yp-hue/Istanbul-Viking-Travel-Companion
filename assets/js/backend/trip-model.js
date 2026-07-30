(()=>{
'use strict';
window.IVTC=window.IVTC||{};
const SHADOW_KEY='ivtc.cloudTrips.shadow.v1';
function requireState(){const s=window.IVTC.firebase?._state;if(!s?.user||!s.db||!s.api)throw new Error('Sign in first.');return s;}
function readShadow(){try{const v=JSON.parse(localStorage.getItem(SHADOW_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function writeShadow(items){localStorage.setItem(SHADOW_KEY,JSON.stringify(items.map(t=>({...t,createdAt:serialTime(t.createdAt),updatedAt:serialTime(t.updatedAt)}))))}
function serialTime(v){if(!v)return null;if(typeof v==='string')return v;if(v.toDate)return v.toDate().toISOString();if(v.seconds)return new Date(v.seconds*1000).toISOString();return v}
function upsertShadow(trip){const items=readShadow();const i=items.findIndex(x=>x.id===trip.id);const clean={...trip,createdAt:serialTime(trip.createdAt)||new Date().toISOString(),updatedAt:serialTime(trip.updatedAt)||new Date().toISOString()};if(i>=0)items[i]={...items[i],...clean};else items.unshift(clean);writeShadow(items);return clean}
function removeShadow(id){writeShadow(readShadow().filter(x=>x.id!==id))}
function timeoutResult(promise,ms){return Promise.race([promise.then(value=>({value})).catch(error=>({error})),new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),ms))])}
function tripSort(items){return items.sort((a,b)=>String(serialTime(b.updatedAt)||'').localeCompare(String(serialTime(a.updatedAt)||'')))}
async function createTrip({label='New trip',startDate=null,endDate=null,travelers=1,status='active',source='manual',packagedVersion=null,itinerary=null,id=null}={}){
 const s=requireState(),tripRef=id?s.api.doc(s.db,'trips',id):s.api.doc(s.api.collection(s.db,'trips'));
 const now=new Date().toISOString();
 const localTrip={id:tripRef.id,schema:2,label:label.trim()||'New trip',startDate:startDate||null,endDate:endDate||null,travelers:Number(travelers)||1,ownerUid:s.user.uid,memberUids:[s.user.uid],roles:{[s.user.uid]:'owner'},createdAt:now,updatedAt:now,status,source};
 if(packagedVersion)localTrip.packagedVersion=packagedVersion;if(itinerary)localTrip.itinerary=itinerary;
 upsertShadow(localTrip);
 const remote={...localTrip};delete remote.id;remote.createdAt=s.api.serverTimestamp();remote.updatedAt=s.api.serverTimestamp();
 // Never hold the UI open for a Firestore write. Safari can leave the SDK promise pending.
 s.api.setDoc(tripRef,remote,{merge:true}).then(()=>upsertShadow({...localTrip,cloudState:'synced',updatedAt:new Date().toISOString()})).catch(error=>upsertShadow({...localTrip,cloudState:'error',cloudError:error?.message||String(error)}));
 return {id:tripRef.id,trip:localTrip,queued:true};
}
async function listTrips({includeArchived=true,timeoutMs=6000}={}){
 const s=requireState();
 const local=tripSort(readShadow().filter(t=>t.ownerUid===s.user.uid||t.memberUids?.includes(s.user.uid)));
 const q=s.api.query(s.api.collection(s.db,'trips'),s.api.where('memberUids','array-contains',s.user.uid));
 const remote=await timeoutResult(s.api.getDocs(q),timeoutMs);
 let items=local;
 if(remote.value){
  const cloud=remote.value.docs.map(d=>({id:d.id,...d.data()}));
  const map=new Map(local.map(t=>[t.id,t]));for(const t of cloud)map.set(t.id,{...map.get(t.id),...t,cloudState:'synced'});
  items=tripSort([...map.values()]);writeShadow(items);
 }
 if(!includeArchived)items=items.filter(t=>t.status!=='archived');
 Object.defineProperty(items,'fromCache',{value:!remote.value,enumerable:false});
 Object.defineProperty(items,'cloudError',{value:remote.error?.message||null,enumerable:false});
 return items;
}
async function resolveCanonicalTrip(){
 const s=requireState(),current=selectedTrip(),deterministicId=`istanbul-viking-2026-${s.user.uid}`;
 if(current?.id){
  const check=await timeoutResult(s.api.getDoc(s.api.doc(s.db,'trips',current.id)),2200);
  if(check.value?.exists()){const trip={id:check.value.id,...check.value.data(),cloudState:'synced'};upsertShadow(trip);selectTrip(trip);return trip;}
 }
 const items=await listTrips({timeoutMs:5000});
 const canonical=items.find(t=>t.cloudState==='synced'&&t.id!==deterministicId)||items.find(t=>t.cloudState==='synced')||items.find(t=>t.id!==deterministicId)||items[0]||null;
 if(canonical){selectTrip(canonical);return canonical;}
 return current?.id?current:null;
}
async function bootstrapPackagedTrip(packaged){
 if(!packaged||!Array.isArray(packaged.stages))throw new Error('The packaged itinerary could not be read.');
 const s=requireState();const deterministicId=`istanbul-viking-2026-${s.user.uid}`;
 const existing=await listTrips({timeoutMs:5000});
 const canonical=existing.find(t=>t.cloudState==='synced'&&t.id!==deterministicId)||existing.find(t=>t.cloudState==='synced')||existing.find(t=>t.id!==deterministicId);
 if(canonical){selectTrip(canonical);return {created:false,trip:canonical};}
 const local=existing.find(t=>t.id===deterministicId)||readShadow().find(t=>t.id===deterministicId);
 if(local){selectTrip(local);return {created:false,trip:local,queued:local.cloudState!=='synced'};}
 const travelerCount=String(packaged.travelers||'').split(/\s*(?:&|,|and)\s*/i).filter(Boolean).length||1;
 const created=await createTrip({id:deterministicId,label:'Istanbul · Viking · Venice & Northern Italy 2026',startDate:packaged.start||'2026-08-13',endDate:'2026-09-13',travelers:travelerCount,status:'active',source:'packaged-bootstrap',packagedVersion:packaged.version||null,itinerary:{title:packaged.title||null,subtitle:packaged.subtitle||null,ship:packaged.ship||null,stateroom:packaged.stateroom||null,hotel:packaged.hotel||null,stages:packaged.stages}});
 selectTrip(created.trip);return {created:true,trip:created.trip,queued:true};
}
async function updateTrip(id,changes){const s=requireState();if(!id)throw new Error('Trip ID is required.');const old=readShadow().find(t=>t.id===id)||{id};upsertShadow({...old,...changes,updatedAt:new Date().toISOString()});s.api.updateDoc(s.api.doc(s.db,'trips',id),{...changes,updatedAt:s.api.serverTimestamp()}).catch(()=>{});}
async function deleteTrip(id){const s=requireState();if(!id)throw new Error('Trip ID is required.');removeShadow(id);s.api.deleteDoc(s.api.doc(s.db,'trips',id)).catch(()=>{});if(localStorage.getItem('ivtc.activeTripId')===id){localStorage.removeItem('ivtc.activeTripId');localStorage.removeItem('ivtc.activeTripLabel');}}
async function duplicateTrip(id){const source=(await listTrips()).find(t=>t.id===id);if(!source)throw new Error('Trip not found.');return createTrip({label:`${source.label||'Trip'} copy`,startDate:source.startDate||null,endDate:source.endDate||null,travelers:source.travelers||1,status:'active',source:'duplicate',itinerary:source.itinerary||null});}
function selectTrip(trip){if(!trip?.id)throw new Error('Trip is required.');localStorage.setItem('ivtc.activeTripId',trip.id);localStorage.setItem('ivtc.activeTripLabel',trip.label||'Selected trip');window.dispatchEvent(new CustomEvent('ivtc:trip-selected',{detail:trip}));}
function selectedTrip(){return {id:localStorage.getItem('ivtc.activeTripId'),label:localStorage.getItem('ivtc.activeTripLabel')};}
window.IVTC.tripCloud=Object.freeze({createTrip,listTrips,resolveCanonicalTrip,bootstrapPackagedTrip,updateTrip,deleteTrip,duplicateTrip,selectTrip,selectedTrip});
})();
