(()=>{
'use strict';
const root=document.querySelector('[data-timeline]');
if(!root)return;
const filters=document.querySelector('#timeline-filters');
const status=document.querySelector('#timeline-status');
const TYPES={
 hotel:{icon:'🏨',label:'Hotel',group:'lodging'},rental:{icon:'🏠',label:'Vacation rental',group:'lodging'},
 restaurant:{icon:'🍽',label:'Restaurant',group:'dining'},flight:{icon:'✈',label:'Flight',group:'travel'},
 cruise:{icon:'🚢',label:'Cruise',group:'travel'},train:{icon:'🚆',label:'Train',group:'travel'},
 transportation:{icon:'🚕',label:'Transportation',group:'travel'},activity:{icon:'🎟',label:'Activity',group:'activities'},
 other:{icon:'📌',label:'Other',group:'activities'}
};
let tripStages=[],reservations=[],activeFilter='all',unsubscribe=null;
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const dateKey=v=>String(v||'').slice(0,10);
const timeValue=v=>String(v||'23:59');
const fmtDate=v=>new Date(v+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
const fmtTime=v=>{if(!v)return '';const [h,m]=v.split(':').map(Number);if(Number.isNaN(h))return v;return new Date(2000,0,1,h,m||0).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});};
const mapUrl=r=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.mapsQuery||r.address||[r.name,r.city].filter(Boolean).join(' '));
function reservationEvents(r){
 const t=TYPES[r.type]||TYPES.other,base={source:'reservation',id:r.id,type:r.type||'other',group:t.group,icon:t.icon,label:t.label,name:r.name||t.label,city:r.city||'',address:r.address||'',website:r.website||'',phone:r.phone||'',confirmation:r.confirmation||'',notes:r.notes||'',mapsQuery:r.mapsQuery||'',record:r};
 if(['hotel','rental','cruise'].includes(r.type)){
  const out=[];
  if(r.checkIn)out.push({...base,date:r.checkIn,time:r.startTime||'',title:r.type==='cruise'?'Embark / board':'Check in',subtitle:r.name});
  if(r.checkOut)out.push({...base,date:r.checkOut,time:r.endTime||'',title:r.type==='cruise'?'Disembark':'Check out',subtitle:r.name,endEvent:true});
  return out;
 }
 if(['flight','train'].includes(r.type))return r.departureDate?[{...base,date:r.departureDate,time:r.departureTime||'',title:r.name,subtitle:[r.origin,r.destination].filter(Boolean).join(' → '),serviceNumber:r.serviceNumber||''}]:[];
 const date=r.eventDate||r.departureDate||r.checkIn;
 return date?[{...base,date,time:r.startTime||r.departureTime||'',title:r.name,subtitle:r.type==='transportation'?[r.pickup,r.dropoff].filter(Boolean).join(' → '):[r.city,r.country].filter(Boolean).join(', ')}]:[];
}
function allEvents(){
 const staticEvents=tripStages.map((s,i)=>({source:'itinerary',id:'stage-'+i,date:s.date,time:s.time||'',title:s.title,subtitle:[s.location,s.summary].filter(Boolean).join(' · '),group:'itinerary',icon:'🗓',label:'Itinerary'}));
 return [...staticEvents,...reservations.flatMap(reservationEvents)].filter(e=>e.date).sort((a,b)=>a.date.localeCompare(b.date)||timeValue(a.time).localeCompare(timeValue(b.time))||a.title.localeCompare(b.title));
}
function renderFilters(events){
 const groups={all:events.length,itinerary:0,travel:0,lodging:0,dining:0,activities:0};events.forEach(e=>groups[e.group]=(groups[e.group]||0)+1);
 const labels={all:'All',itinerary:'Itinerary',travel:'Travel',lodging:'Lodging',dining:'Dining',activities:'Activities'};
 filters.innerHTML=Object.entries(labels).map(([key,label])=>`<button type="button" class="timeline-filter ${activeFilter===key?'active':''}" data-filter="${key}">${label}<span>${groups[key]||0}</span></button>`).join('');
}
function actionButtons(e){
 if(e.source!=='reservation')return '';
 const buttons=[];
 if(e.address||e.mapsQuery)buttons.push(`<button type="button" data-url="${esc(mapUrl(e.record))}">Directions</button>`);
 if(e.phone)buttons.push(`<a href="tel:${esc(e.phone)}">Call</a>`);
 if(e.website)buttons.push(`<button type="button" data-url="${esc(e.website)}">Website</button>`);
 buttons.push(`<a href="reservations.html">Reservation details</a>`);
 return `<div class="smart-timeline-actions">${buttons.join('')}</div>`;
}
function render(){
 const events=allEvents();renderFilters(events);
 const visible=activeFilter==='all'?events:events.filter(e=>e.group===activeFilter);
 const groups=new Map();visible.forEach(e=>{if(!groups.has(e.date))groups.set(e.date,[]);groups.get(e.date).push(e);});
 const today=new Date().toISOString().slice(0,10);
 root.innerHTML=[...groups.entries()].map(([date,items])=>`<section class="smart-day ${date===today?'is-today':''}">
  <header class="smart-day-header"><div>${date===today?'<span class="today-badge">Today</span>':''}<h2>${esc(fmtDate(date))}</h2></div><span>${items.length} ${items.length===1?'item':'items'}</span></header>
  <div class="smart-day-events">${items.map(e=>`<article class="smart-event ${e.source}">
   <div class="smart-event-time">${e.time?esc(fmtTime(e.time)):'—'}</div>
   <div class="smart-event-icon" aria-hidden="true">${e.icon}</div>
   <div class="smart-event-body"><div class="smart-event-meta">${esc(e.label)}${e.serviceNumber?` · ${esc(e.serviceNumber)}`:''}</div><h3>${esc(e.title)}</h3>${e.subtitle?`<p>${esc(e.subtitle)}</p>`:''}${e.confirmation?`<p class="smart-confirmation"><strong>Confirmation:</strong> ${esc(e.confirmation)}</p>`:''}${actionButtons(e)}</div>
  </article>`).join('')}</div></section>`).join('')||'<section class="card empty-trips"><div>🗓</div><h2>No matching timeline items</h2><p>Add a reservation or choose another filter.</p></section>';
}
async function loadTrip(){try{const r=await fetch('data/trip.json',{cache:'no-store'});const trip=await r.json();tripStages=Array.isArray(trip.stages)?trip.stages:[];}catch{tripStages=[];}render();}
function loadLocal(){try{if(window.IVTC?.reservations){reservations=IVTC.reservations.local();status.textContent=`${reservations.length} reservations available on this device`;}}catch{reservations=[];}render();}
function startCloud(){
 if(!window.IVTC?.firebase)return;
 const update=state=>{
  if(!state.user){status.textContent=reservations.length?'Showing device copy · sign in for live updates':'Sign in to include cloud reservations';return;}
  try{
   if(unsubscribe)unsubscribe();
   unsubscribe=IVTC.reservations.subscribe((items,meta)=>{reservations=items;status.textContent=meta.fromCache?`${items.length} reservations · offline copy`:`${items.length} reservations · cloud synchronized`;render();},err=>{status.textContent=`Live reservation updates paused: ${err.message}`;});
  }catch(err){status.textContent=err.message;}
 };
 window.addEventListener('ivtc:backend-state',e=>update(e.detail));
 IVTC.firebase.initialize().then(update);
}
filters.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;activeFilter=b.dataset.filter;render();});
root.addEventListener('click',e=>{const url=e.target.closest('[data-url]')?.dataset.url;if(url)window.open(url,'_blank','noopener');});
window.addEventListener('beforeunload',()=>{if(unsubscribe)unsubscribe();});
loadTrip().then(()=>{loadLocal();startCloud();});
})();
