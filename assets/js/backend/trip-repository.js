(()=>{
'use strict';
window.IVTC=window.IVTC||{};
const VERSION='8.1.2';
async function packagedTrip(){
 const r=await fetch('data/trip.json',{cache:'no-store'});
 if(!r.ok)throw new Error('Unable to load the packaged Istanbul itinerary.');
 return r.json();
}
function activeTrip(){return window.IVTC.tripCloud?.selectedTrip?.()||{id:localStorage.getItem('ivtc.activeTripId'),label:localStorage.getItem('ivtc.activeTripLabel')};}
async function ensureActiveTrip(){
 if(window.IVTC.tripCloud?.resolveCanonicalTrip){const canonical=await window.IVTC.tripCloud.resolveCanonicalTrip();if(canonical?.id)return canonical;}
 let active=activeTrip();if(active?.id)return active;
 if(!window.IVTC.tripCloud)throw new Error('Trip data service is unavailable.');
 const local=await window.IVTC.tripCloud.listTrips({timeoutMs:1200});
 if(local.length){window.IVTC.tripCloud.selectTrip(local[0]);return window.IVTC.tripCloud.selectedTrip();}
 const result=await window.IVTC.tripCloud.bootstrapPackagedTrip(await packagedTrip());
 if(!result?.trip?.id)throw new Error('The packaged Istanbul trip could not be prepared.');
 window.IVTC.tripCloud.selectTrip(result.trip);return window.IVTC.tripCloud.selectedTrip();
}
async function listTrips(options={}){return window.IVTC.tripCloud.listTrips({timeoutMs:1200,...options});}
async function ensureReservations(){
 await ensureActiveTrip();
 if(!window.IVTC.reservations)throw new Error('Reservation data service is unavailable.');
 return window.IVTC.reservations.ensureSeeded();
}
function localReservations(){try{return window.IVTC.reservations?.local?.()||[]}catch{return []}}
async function subscribeReservations(onItems,onError){
 try{
  const seeded=await ensureReservations();
  onItems(seeded.items,{fromCache:true,hasPendingWrites:false,repository:true,source:seeded.source});
 }catch(error){onError?.(error);return ()=>{};}
 try{return window.IVTC.reservations.subscribe(onItems,onError)}catch(error){onError?.(error);return ()=>{}}
}
window.IVTC.tripRepository=Object.freeze({version:VERSION,packagedTrip,activeTrip,ensureActiveTrip,listTrips,ensureReservations,localReservations,subscribeReservations});
})();
