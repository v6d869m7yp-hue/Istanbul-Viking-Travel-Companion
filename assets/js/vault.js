(()=>{
'use strict';
const HOST=document.querySelector('#vault-app');
if(!HOST)return;
const STORAGE='ivtc.travelVault.v1';
const SESSION='ivtc.travelVault.autoLock';
const DEVICE_KEY='ivtc.travelVault.deviceId';
const DEVICE_CLASS_KEY='ivtc.travelVault.deviceClass';
let deviceId=localStorage.getItem(DEVICE_KEY)||crypto.randomUUID();localStorage.setItem(DEVICE_KEY,deviceId);
const ITERATIONS=310000;
const enc=new TextEncoder(),dec=new TextDecoder();
let masterKey=null,data=null,lockTimer=null;
let cloudReservations=[],cloudReservationMeta={status:'loading'},cloudReservationUnsub=null,activePanel='documents';
let cloudSync={state:'idle',message:'Sign in and choose an active trip to enable encrypted sync.',lastAt:null,remoteRevision:null,stages:[],detail:''};
const APP_VERSION='8.2.3';
let cloudRestore={state:'checking',message:'Checking your Firebase account for an existing encrypted Vault…',candidate:null,candidates:[]};
let cloudSyncTimer=null,cloudSyncBusy=false,cloudSyncRun=0;
const qs=(s,r=HOST)=>r.querySelector(s),qsa=(s,r=HOST)=>[...r.querySelectorAll(s)];
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const random=n=>crypto.getRandomValues(new Uint8Array(n));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const now=()=>new Date().toISOString();
async function sha256Text(value){const digest=await crypto.subtle.digest('SHA-256',enc.encode(value));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function backupCore(store){return {format:store.format,schema:store.schema,createdAt:store.createdAt,kdf:store.kdf,passwordWrap:store.passwordWrap,vault:store.vault,biometric:store.biometric||undefined}}
function loadStore(){try{return JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{return null}}
function saveStore(v){localStorage.setItem(STORAGE,JSON.stringify(v))}
async function importAes(raw){return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function derivePassword(password,salt,iterations=ITERATIONS){
 const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function seal(key,value,aad='ivtc-vault'){
 const iv=random(12);const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(aad)},key,value instanceof Uint8Array?value:enc.encode(JSON.stringify(value)));
 return {iv:b64(iv),cipher:b64(cipher)};
}
async function open(key,box,aad='ivtc-vault',raw=false){
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.iv),additionalData:enc.encode(aad)},key,unb64(box.cipher));
 return raw?new Uint8Array(plain):JSON.parse(dec.decode(plain));
}
async function exportRawKey(key){return new Uint8Array(await crypto.subtle.exportKey('raw',key))}
function defaultData(owner){return {schema:3,revision:0,sync:{remoteRevision:-1,lastSyncedAt:null,history:[]},backup:{lastExportAt:null,lastExportRevision:-1},createdAt:now(),updatedAt:now(),travelers:[{id:crypto.randomUUID(),name:owner||'Traveler 1',role:'Owner'}],records:[],documents:[],settings:{autoLockMinutes:15},audit:[],devices:[{id:deviceId,name:deviceName(),addedAt:now(),lastSeen:now()}],outbox:[]}}
function deviceClass(){const ua=navigator.userAgent||'';const platform=navigator.platform||'';const touchPoints=Number(navigator.maxTouchPoints||0);const shortSide=Math.min(Number(screen?.width||0),Number(screen?.height||0));if(/iPhone|iPod/i.test(ua))return 'iphone';if(/iPad/i.test(ua))return 'ipad';if((platform==='MacIntel'||/Macintosh/i.test(ua))&&touchPoints>1)return shortSide&&shortSide<600?'iphone':'ipad';if(/Macintosh|MacIntel/i.test(ua))return 'mac';return 'apple';}
function deviceName(){const kind={iphone:'iPhone',ipad:'iPad',mac:'Mac',apple:'Apple device'}[deviceClass()]||'Apple device';return `${kind} · Safari`}
function classFromDeviceName(name){const n=String(name||'').toLowerCase();return n.startsWith('iphone')?'iphone':n.startsWith('ipad')?'ipad':n.startsWith('mac')?'mac':'apple'}
function normalizeData(){data.schema=3;data.revision=Number(data.revision||0);data.sync=data.sync||{remoteRevision:-1,lastSyncedAt:null,history:[]};data.sync.history=data.sync.history||[];data.backup=data.backup||{lastExportAt:null,lastExportRevision:-1};data.travelers=data.travelers||[];data.records=data.records||[];data.documents=data.documents||[];data.audit=data.audit||[];data.settings=data.settings||{autoLockMinutes:15};data.devices=data.devices||[];data.outbox=data.outbox||[];const detectedClass=deviceClass();const storedClass=localStorage.getItem(DEVICE_CLASS_KEY);let d=data.devices.find(x=>x.id===deviceId);const inheritedMismatch=(storedClass&&storedClass!==detectedClass)||(d&&classFromDeviceName(d.name)!==detectedClass&&classFromDeviceName(d.name)!=='apple');if(inheritedMismatch){deviceId=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,deviceId);d=null}localStorage.setItem(DEVICE_CLASS_KEY,detectedClass);if(!d){d={id:deviceId,name:deviceName(),addedAt:now(),lastSeen:now(),lastSyncedAt:null,syncCount:0,appVersion:APP_VERSION};data.devices.push(d)}d.name=deviceName();d.lastSeen=now();d.appVersion=APP_VERSION;for(const r of data.records){r.attachments=r.attachments||[];r.status=r.status||'confirmed';r.updatedAt=r.updatedAt||data.updatedAt}}

function currentDevice(){return data?.devices?.find(x=>x.id===deviceId)}
function addSyncHistory(direction,status,note='',bytes=0){
 if(!data?.sync)return;
 data.sync.history=data.sync.history||[];
 data.sync.history.unshift({id:crypto.randomUUID(),at:now(),direction,status,note,bytes:Number(bytes||0),deviceId,deviceName:deviceName(),appVersion:APP_VERSION});
 data.sync.history=data.sync.history.slice(0,40);
 const d=currentDevice();if(d&&status==='completed'){d.lastSyncedAt=now();d.syncCount=Number(d.syncCount||0)+1;d.lastSyncDirection=direction;d.appVersion=APP_VERSION}
}
function syncHistoryMarkup(){
 const items=(data.sync?.history||[]).slice(0,12);
 if(!items.length)return '<p class="notice">No completed sync activity has been recorded yet.</p>';
 return `<div class="vault-travelers">${items.map(h=>`<article class="card"><div><h3>${h.direction==='download'?'Downloaded':'Uploaded'} encrypted Vault</h3><p>${new Date(h.at).toLocaleString()} · ${esc(h.deviceName||'Device')}${h.bytes?` · ${Number(h.bytes).toLocaleString()} bytes`:''}</p>${h.note?`<p class="notice">${esc(h.note)}</p>`:''}</div><span class="tag">${esc(h.status)}</span></article>`).join('')}</div>`
}

function queueChange(type,entityId){data.revision=(data.revision||0)+1;data.outbox.push({id:crypto.randomUUID(),at:now(),type,entityId,deviceId});data.outbox=data.outbox.slice(-250)}
function recordAudit(action){data.audit.unshift({at:now(),action});data.audit=data.audit.slice(0,50)}
async function persist(options={}){
 const store=loadStore();if(!store||!masterKey||!data)return;
 data.updatedAt=now();store.vault=await seal(masterKey,data,'ivtc-vault-data-v1');saveStore(store);renderUnlocked();scheduleLock();startCloudReservations();
 if(!options.skipCloud)scheduleCloudSync();
}
function scheduleCloudSync(){clearTimeout(cloudSyncTimer);if(!masterKey||!data)return;cloudSyncTimer=setTimeout(()=>cloudSyncNow('auto'),1400)}
function syncStatusMarkup(){
 const cls=cloudSync.state==='synced'?'secure':cloudSync.state==='error'?'vault-sync-off':'';
 const icons={pending:'○',active:'◌',done:'✓',error:'✕',canceled:'—'};
 const stages=(cloudSync.stages||[]).length?`<div class="vault-sync-stages">${cloudSync.stages.map(x=>`<div class="vault-sync-stage ${esc(x.state)}"><span aria-hidden="true">${icons[x.state]||'○'}</span> ${esc(x.label)}${x.note?` <small>— ${esc(x.note)}</small>`:''}</div>`).join('')}</div>`:'';
 const detail=cloudSync.detail?`<p class="notice"><strong>Technical detail:</strong> ${esc(cloudSync.detail)}</p>`:'';
 return `<p class="${cls}"><strong>${esc(cloudSync.message)}</strong></p>${stages}${detail}${cloudSync.lastAt?`<p class="notice">Last cloud contact: ${new Date(cloudSync.lastAt).toLocaleString()}</p>`:''}`
}
function syncStages(labels){return labels.map((label,i)=>({label,state:i===0?'active':'pending'}))}
function setSyncStage(index,state,note=''){if(!cloudSync.stages?.[index])return;cloudSync.stages=cloudSync.stages.map((x,i)=>i===index?{...x,state,note}:x);renderUnlocked()}
function timeout(promise,label,ms=20000){let id;const timer=new Promise((_,reject)=>{id=setTimeout(()=>reject(new Error(`${label} timed out after ${Math.round(ms/1000)} seconds.`)),ms)});return Promise.race([promise,timer]).finally(()=>clearTimeout(id))}
async function downloadStorageBytes(s,path,maxBytes=25*1024*1024){
 const storageRef=s.api.ref(s.storage,path);
 // Firebase getBytes can remain pending indefinitely in Safari/iPadOS. Fetching the
 // signed download URL uses Safari's native networking stack and is more reliable.
 if(typeof s.api.getDownloadURL==='function'){
  const url=await timeout(s.api.getDownloadURL(storageRef),'Encrypted Vault URL lookup',12000);
  const controller=new AbortController(),id=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:controller.signal});
   if(!response.ok)throw new Error(`Encrypted Vault download failed (${response.status}).`);
   const length=Number(response.headers.get('content-length')||0);
   if(length&&length>maxBytes)throw new Error('Encrypted Vault exceeds the 25 MB safety limit.');
   const buffer=await response.arrayBuffer();
   if(buffer.byteLength>maxBytes)throw new Error('Encrypted Vault exceeds the 25 MB safety limit.');
   return new Uint8Array(buffer);
  }catch(error){
   if(error?.name==='AbortError')throw new Error('Encrypted Vault download timed out after 20 seconds.');
   throw error;
  }finally{clearTimeout(id)}
 }
 return timeout(s.api.getBytes(storageRef,maxBytes),'Encrypted Vault download',20000);
}

const FIRESTORE_CHUNK_SIZE=420000;
function vaultChunkRef(s,tripId,index){return s.api.doc(s.db,'trips',tripId,'vaultChunks',String(index).padStart(4,'0'))}
function vaultLocatorRef(s){return s.api.doc(s.db,'users',s.user.uid,'vaultLocator','current')}
async function publishVaultLocator(ctx,meta){
 const payload={tripId:ctx.tripId,tripLabel:localStorage.getItem('ivtc.activeTripLabel')||'Istanbul · Viking · Venice & Northern Italy 2026',revision:Number(meta.revision||0),storageState:meta.storageState||'unknown',firestoreChunkCount:Number(meta.firestoreChunkCount||0),checksum:meta.checksum||'',updatedAt:ctx.s.api.serverTimestamp(),updatedByDevice:deviceId,updatedByDeviceName:deviceName(),appVersion:APP_VERSION};
 await timeout(ctx.s.api.setDoc(vaultLocatorRef(ctx.s),payload,{merge:true}),'Vault locator write',12000);
}
async function writeFirestoreVaultMirror(ctx,text,checksum){
 const chunks=[];for(let i=0;i<text.length;i+=FIRESTORE_CHUNK_SIZE)chunks.push(text.slice(i,i+FIRESTORE_CHUNK_SIZE));
 for(let i=0;i<chunks.length;i++)await timeout(ctx.s.api.setDoc(vaultChunkRef(ctx.s,ctx.tripId,i),{index:i,data:chunks[i],checksum,updatedAt:ctx.s.api.serverTimestamp()}),'Encrypted Vault Firestore bridge upload',20000);
 return chunks.length;
}
async function readFirestoreVaultMirror(s,tripId,meta){
 const count=Number(meta?.firestoreChunkCount||0);if(!count)return null;
 const parts=[];for(let i=0;i<count;i++){const snap=await timeout(s.api.getDoc(vaultChunkRef(s,tripId,i)),'Encrypted Vault Firestore bridge download',12000);if(!snap.exists())throw new Error(`Encrypted Vault bridge chunk ${i+1} is missing.`);parts.push(String(snap.data()?.data||''));}
 return parts.join('');
}
async function downloadSnapshotText(s,tripId,meta){
 try{const mirrored=await readFirestoreVaultMirror(s,tripId,meta);if(mirrored)return mirrored;}catch(error){console.warn('Firestore Vault bridge unavailable; falling back to Storage.',error)}
 const bytes=await downloadStorageBytes(s,meta.storagePath||`trips/${tripId}/encrypted/travel-vault.ivtcsync`);return dec.decode(bytes);
}

function ensureSyncRun(run){if(run!==cloudSyncRun)throw new Error('Sync canceled.')}
function cancelCloudSync(){if(!cloudSyncBusy)return;cloudSyncRun++;cloudSyncBusy=false;cloudSync={...cloudSync,state:'error',message:'Sync canceled. No local Vault data was changed.',detail:'You can safely try again.',stages:(cloudSync.stages||[]).map(x=>x.state==='active'?{...x,state:'canceled',note:'canceled'}:x),lastAt:now()};renderUnlocked()}
async function cloudContext(){
 if(!window.IVTC?.firebase)throw new Error('Firebase components are unavailable.');
 const state=await window.IVTC.firebase.initialize();
 const s=window.IVTC.firebase._state;
 if(!state.user||!s.storage||!s.db)throw new Error('Sign in to Firebase first.');
 // The canonical trip was already selected in My Trips. Do not re-query
 // Firestore during Vault sync; Safari can leave that verification pending.
 const selected=window.IVTC.tripCloud?.selectedTrip?.()||{};
 const tripId=selected.id||localStorage.getItem('ivtc.activeTripId');
 if(!tripId)throw new Error('Choose an active trip in My Trips first.');
 const label=selected.label||localStorage.getItem('ivtc.activeTripLabel')||'Selected trip';
 localStorage.setItem('ivtc.activeTripId',tripId);localStorage.setItem('ivtc.activeTripLabel',label);
 return {s,tripId,path:`trips/${tripId}/encrypted/travel-vault.ivtcsync`};
}
function mergeById(local=[],incoming=[]){const map=new Map(local.map(x=>[x.id,x]));for(const item of incoming){const old=map.get(item.id);if(!old||String(item.updatedAt||item.at||'')>String(old.updatedAt||old.at||''))map.set(item.id,item)}return [...map.values()]}
function mergeRemoteData(remote){
 data.documents=mergeById(data.documents,remote.documents||[]);data.records=mergeById(data.records,remote.records||[]);data.travelers=mergeById(data.travelers,remote.travelers||[]);data.devices=mergeById(data.devices,remote.devices||[]);
 data.audit=mergeById(data.audit,remote.audit||[]).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))).slice(0,50);
 data.revision=Math.max(Number(data.revision||0),Number(remote.revision||0));data.sync.remoteRevision=Number(remote.revision||0);data.sync.lastSyncedAt=now();
}
async function uploadCloudSnapshot(ctx){
 const core=backupCore(loadStore()),text=JSON.stringify(core),checksum=await sha256Text(text),blob=new Blob([text],{type:'application/octet-stream'});
 const firestoreChunkCount=await writeFirestoreVaultMirror(ctx,text,checksum);
 let storageState='uploaded',storageError=null;
 try{const ref=ctx.s.api.ref(ctx.s.storage,ctx.path);await ctx.s.api.uploadBytes(ref,blob,{contentType:'application/octet-stream',customMetadata:{format:'ivtc-encrypted-vault',revision:String(data.revision||0),deviceId}});}catch(error){storageState='bridge-only';storageError=error?.message||String(error);console.warn('Storage upload failed; encrypted Firestore bridge remains available.',error)}
 const envelopeMeta={storagePath:ctx.path,storageState,storageError,firestoreChunkCount,firestoreBridgeVersion:1,format:'ivtc-encrypted-vault',schema:1,revision:Number(data.revision||0),checksum,updatedBy:ctx.s.user.uid,updatedByDevice:deviceId,updatedAt:ctx.s.api.serverTimestamp()};
 await ctx.s.api.setDoc(ctx.s.api.doc(ctx.s.db,'trips',ctx.tripId,'envelopes','travel-vault'),envelopeMeta,{merge:true});
 await publishVaultLocator(ctx,envelopeMeta);
 data.sync.remoteRevision=Number(data.revision||0);data.sync.lastSyncedAt=now();data.outbox=[];await persist({skipCloud:true});
}
async function downloadCloudSnapshot(ctx,meta){
 const text=await downloadSnapshotText(ctx.s,ctx.tripId,meta),remoteStore=JSON.parse(text);
 const remoteData=await open(masterKey,remoteStore.vault,'ivtc-vault-data-v1');mergeRemoteData(remoteData);recordAudit('Merged encrypted Firebase vault snapshot');await persist({skipCloud:true});
}
async function cloudSyncNow(reason='manual'){
 if(cloudSyncBusy||!masterKey||!data)return;
 const run=++cloudSyncRun;cloudSyncBusy=true;
 cloudSync={state:'syncing',message:'Preparing encrypted Vault sync…',lastAt:cloudSync.lastAt,remoteRevision:cloudSync.remoteRevision,detail:'',stages:syncStages(['Prepare local snapshot','Connect to Firebase','Optional cloud conflict check','Upload encrypted snapshot','Write sync metadata','Finalize local status'])};renderUnlocked();
 try{
  await Promise.resolve();ensureSyncRun(run);setSyncStage(0,'done');setSyncStage(1,'active');cloudSync.message='Connecting to Firebase…';
  const ctx=await timeout(cloudContext(),'Firebase connection',20000);ensureSyncRun(run);setSyncStage(1,'done');
  const ref=ctx.s.api.doc(ctx.s.db,'trips',ctx.tripId,'envelopes','travel-vault');
  setSyncStage(2,'active');cloudSync.message='Checking cloud revision without blocking upload…';
  try{
   const snap=await timeout(ctx.s.api.getDoc(ref),'Cloud conflict check',4000);ensureSyncRun(run);
   if(snap.exists()){
    const remoteRev=Number(snap.data()?.revision||0);cloudSync.remoteRevision=remoteRev;
    setSyncStage(2,'done',remoteRev>Number(data.sync?.remoteRevision??-1)?'newer cloud revision noted; upload continues':'cloud revision checked');
   }else setSyncStage(2,'done','first cloud snapshot');
  }catch(error){
   ensureSyncRun(run);setSyncStage(2,'done','cloud check unavailable; upload continues');console.warn('Optional cloud conflict check skipped.',error);
  }
  setSyncStage(3,'active');cloudSync.message='Uploading encrypted Vault snapshot…';
  const core=backupCore(loadStore()),text=JSON.stringify(core),checksum=await sha256Text(text),blob=new Blob([text],{type:'application/octet-stream'});
  let storageState='uploaded',storageError=null;
  try{
   const storageRef=ctx.s.api.ref(ctx.s.storage,ctx.path);
   await timeout(ctx.s.api.uploadBytes(storageRef,blob,{contentType:'application/octet-stream',customMetadata:{format:'ivtc-encrypted-vault',revision:String(data.revision||0),deviceId}}),'Encrypted snapshot Storage upload',30000);
  }catch(error){storageState='bridge-only';storageError=error?.message||String(error);console.warn('Storage upload failed; continuing with encrypted Firestore bridge.',error)}
  let firestoreChunkCount=0,firestoreBridgeError=null;
  try{
   firestoreChunkCount=await writeFirestoreVaultMirror(ctx,text,checksum);ensureSyncRun(run);
  }catch(error){
   firestoreBridgeError=error?.message||String(error);
   console.warn('Firestore Vault bridge upload unavailable; continuing when Storage succeeded.',error);
   if(storageState!=='uploaded')throw new Error(`Encrypted Vault could not be published. Storage: ${storageError||'unavailable'}. Firestore bridge: ${firestoreBridgeError}`);
  }
  const transportNote=storageState==='uploaded'
   ? `${blob.size.toLocaleString()} bytes · Storage${firestoreChunkCount?` + Firestore bridge ${firestoreChunkCount} chunk${firestoreChunkCount===1?'':'s'}`:' · bridge deferred'}`
   : `${blob.size.toLocaleString()} bytes · Firestore bridge ${firestoreChunkCount} chunk${firestoreChunkCount===1?'':'s'}`;
  setSyncStage(3,'done',transportNote);
  setSyncStage(4,'active');cloudSync.message='Writing sync metadata…';
  const syncMeta={storagePath:ctx.path,storageState,storageError,firestoreChunkCount,firestoreBridgeError,firestoreBridgeVersion:1,format:'ivtc-encrypted-vault',schema:1,revision:Number(data.revision||0),checksum,updatedBy:ctx.s.user.uid,updatedByDevice:deviceId,updatedByDeviceName:deviceName(),updatedByAppVersion:APP_VERSION,updatedAt:ctx.s.api.serverTimestamp()};
  await timeout(ctx.s.api.setDoc(ref,syncMeta,{merge:true}),'Sync metadata write',20000);ensureSyncRun(run);
  await publishVaultLocator(ctx,syncMeta);ensureSyncRun(run);setSyncStage(4,'done','metadata + cross-device locator');
  setSyncStage(5,'active');data.sync.remoteRevision=Number(data.revision||0);data.sync.lastSyncedAt=now();data.outbox=[];addSyncHistory('upload','completed',reason==='auto'?'Automatic upload-first sync':'Manual upload-first sync',blob.size);await timeout(persist({skipCloud:true}),'Local sync finalization',15000);ensureSyncRun(run);setSyncStage(5,'done');
  cloudSync={state:'synced',message:storageState==='uploaded'?'Encrypted Vault synced through Firebase':'Encrypted Vault synced through the Firestore recovery bridge',lastAt:now(),remoteRevision:Number(data.revision||0),detail:storageError?`Storage was unavailable, but the encrypted Firestore bridge completed successfully. ${storageError}`:'',stages:cloudSync.stages};
 }catch(e){
  if(run!==cloudSyncRun)return;
  const message=e?.message||'Encrypted cloud sync failed.';
  const idx=(cloudSync.stages||[]).findIndex(x=>x.state==='active');if(idx>=0)setSyncStage(idx,message==='Sync canceled.'?'canceled':'error',message);
  cloudSync={...cloudSync,state:'error',message:message==='Sync canceled.'?'Sync canceled.':'Encrypted Vault sync stopped safely.',detail:message,lastAt:now()};
 }finally{if(run===cloudSyncRun){cloudSyncBusy=false;renderUnlocked()}}
}
async function pullCloudNow(){
 if(!masterKey||!data||cloudSyncBusy)return;const run=++cloudSyncRun;cloudSyncBusy=true;
 cloudSync={state:'syncing',message:'Checking Firebase for a newer encrypted Vault…',lastAt:cloudSync.lastAt,remoteRevision:cloudSync.remoteRevision,detail:'',stages:syncStages(['Connect to Firebase','Read cloud metadata','Download encrypted snapshot','Decrypt and merge locally'])};renderUnlocked();
 try{const ctx=await timeout(cloudContext(),'Firebase connection',20000);ensureSyncRun(run);setSyncStage(0,'done');setSyncStage(1,'active');const snap=await timeout(ctx.s.api.getDoc(ctx.s.api.doc(ctx.s.db,'trips',ctx.tripId,'envelopes','travel-vault')),'Cloud metadata read',20000);ensureSyncRun(run);if(!snap.exists())throw new Error('No encrypted Vault snapshot exists in Firebase yet.');setSyncStage(1,'done');setSyncStage(2,'active');await timeout(downloadCloudSnapshot(ctx,snap.data()),'Encrypted snapshot download and merge',30000);ensureSyncRun(run);setSyncStage(2,'done');setSyncStage(3,'done');addSyncHistory('download','completed','Manual download of latest cloud snapshot');await persist({skipCloud:true});cloudSync={state:'synced',message:'Latest encrypted Vault downloaded and merged',lastAt:now(),remoteRevision:Number(snap.data().revision||0),detail:'',stages:cloudSync.stages}}
 catch(e){if(run!==cloudSyncRun)return;const message=e?.message||'Could not download the encrypted Vault.';const idx=(cloudSync.stages||[]).findIndex(x=>x.state==='active');if(idx>=0)setSyncStage(idx,'error',message);cloudSync={...cloudSync,state:'error',message:'Encrypted Vault download stopped safely.',detail:message,lastAt:now()}}
 finally{if(run===cloudSyncRun){cloudSyncBusy=false;renderUnlocked()}}
}
function scheduleLock(){clearTimeout(lockTimer);if(!data)return;const mins=Number(data.settings?.autoLockMinutes??15);if(mins>0)lockTimer=setTimeout(lock,mins*60000)}
function lock(){cloudReservationUnsub?.();cloudReservationUnsub=null;masterKey=null;data=null;clearTimeout(lockTimer);renderLocked()}
function statusBadge(){return `<span class="vault-status secure">● Encrypted offline</span>`}
function renderSetup(message=''){
 if(cloudRestore.state==='found'&&cloudRestore.candidate){
  const c=cloudRestore.candidate;
  HOST.innerHTML=`<section class="vault-auth card"><div class="vault-lock-icon">☁️🔐</div><div><div class="meta">Encrypted cloud Vault found</div><h2>Unlock your existing Travel Vault</h2><p>An encrypted Vault associated with <strong>${esc(c.tripLabel||'your trip')}</strong> was found in your Firebase account. Enter the same Vault password you use on your Mac. A separate iPad password is not required.</p></div>${message?`<p class="vault-error">${esc(message)}</p>`:''}<label>Existing Vault password<input id="vault-cloud-password" type="password" autocomplete="current-password"></label><div class="button-row"><button class="btn" id="vault-cloud-restore" type="button">Download and unlock existing Vault</button><button class="btn outline" id="vault-restore-first" type="button">Restore from backup file</button><button class="btn outline" id="vault-show-create" type="button">Create a separate Vault</button></div><input id="vault-import-file-first" type="file" accept="application/json,.ivtcvault" hidden><p class="notice">The encrypted copy is downloaded first and decrypted only on this iPad. Your Vault password is never sent to Firebase.</p></section>`;
  qs('#vault-cloud-restore').addEventListener('click',restoreCloudVault);qs('#vault-cloud-password').addEventListener('keydown',e=>{if(e.key==='Enter')restoreCloudVault()});qs('#vault-restore-first').addEventListener('click',()=>qs('#vault-import-file-first').click());qs('#vault-import-file-first').addEventListener('change',importBackup);qs('#vault-show-create').addEventListener('click',()=>{cloudRestore={state:'none',message:'',candidate:null};renderSetup()});return;
 }
 const checking=cloudRestore.state==='checking'?'<p class="notice"><strong>Checking Firebase for your existing encrypted Vault…</strong></p>':cloudRestore.state==='error'?`<p class="vault-error">${esc(cloudRestore.message)}</p>`:cloudRestore.state==='signedout'?'<p class="notice">Sign in to Firebase to look for a Vault already created on another device.</p>':'<p class="notice">No encrypted cloud Vault was found for your cloud trips. You may create one here or restore an exported backup file.</p>';
 HOST.innerHTML=`<section class="vault-auth card"><div class="vault-lock-icon">🔐</div><div><div class="meta">First-time setup on this device</div><h2>Create or restore your Travel Vault</h2><p>The app first checks for the encrypted Vault you may already use on another device. The Vault password is separate from your Firebase sign-in password.</p></div>${message?`<p class="vault-error">${esc(message)}</p>`:''}${checking}<div class="vault-form-grid"><label>Owner name<input id="vault-owner" autocomplete="name" value="John"></label><label>New Vault password<input id="vault-password" type="password" autocomplete="new-password" minlength="12"></label><label>Confirm password<input id="vault-confirm" type="password" autocomplete="new-password" minlength="12"></label></div><div class="button-row"><button class="btn" id="vault-create" type="button" ${cloudRestore.state==='checking'?'disabled':''}>Create new encrypted vault</button><button class="btn outline" id="vault-restore-first" type="button">Restore existing backup</button><button class="btn outline" id="vault-check-cloud" type="button">Check cloud again</button></div><input id="vault-import-file-first" type="file" accept="application/json,.ivtcvault" hidden><p class="notice">Use at least 12 characters and save it in a password manager. Properly encrypted vaults have no password reset.</p></section>`;
 qs('#vault-create').addEventListener('click',createVault);qs('#vault-restore-first').addEventListener('click',()=>qs('#vault-import-file-first').click());qs('#vault-import-file-first').addEventListener('change',importBackup);qs('#vault-check-cloud').addEventListener('click',discoverCloudVault);
}
async function discoverCloudVault(){
 if(loadStore())return;
 cloudRestore={state:'checking',message:'Checking your Firebase account for existing encrypted Vault copies…',candidate:null,candidates:[]};renderSetup();
 try{
  if(!window.IVTC?.firebase)throw new Error('Firebase components are unavailable.');
  const state=await timeout(window.IVTC.firebase.initialize(),'Firebase sign-in check',12000),s=window.IVTC.firebase._state;
  if(!state.user||!s.db){cloudRestore={state:'signedout',message:'Sign in to Firebase first.',candidate:null,candidates:[]};renderSetup();return;}
  const tripMap=new Map();
  // New devices have no active-trip localStorage. Resolve the canonical Vault directly
  // through the authenticated user's locator before trying any trip enumeration.
  try{
   const locatorSnap=await timeout(s.api.getDoc(vaultLocatorRef(s)),'Cloud Vault locator lookup',8000);
   if(locatorSnap.exists()){
    const locator=locatorSnap.data()||{};
    const locatorTripId=String(locator.tripId||'');
    if(locatorTripId){
     const label=locator.tripLabel||'Istanbul · Viking · Venice & Northern Italy 2026';
     tripMap.set(locatorTripId,{id:locatorTripId,label});
     localStorage.setItem('ivtc.activeTripId',locatorTripId);localStorage.setItem('ivtc.activeTripLabel',label);
    }
   }
  }catch(error){console.warn('Direct Vault locator unavailable; using compatibility discovery.',error)}
  const activeId=localStorage.getItem('ivtc.activeTripId');if(activeId)tripMap.set(activeId,{id:activeId,label:localStorage.getItem('ivtc.activeTripLabel')||'Active trip'});
  const deterministicId=`istanbul-viking-2026-${s.user.uid}`;if(!tripMap.has(deterministicId))tripMap.set(deterministicId,{id:deterministicId,label:'Istanbul · Viking · Venice & Northern Italy 2026'});
  // Include every accessible trip because an older duplicate may still contain a stale Vault envelope.
  try{
   const q=s.api.query(s.api.collection(s.db,'trips'),s.api.where('memberUids','array-contains',s.user.uid));
   const trips=await timeout(s.api.getDocs(q),'Cloud trip lookup',7000);
   for(const d of trips.docs)tripMap.set(d.id,{id:d.id,label:d.data()?.label||'Cloud trip'});
  }catch(error){console.warn('Cloud trip list unavailable; checking known trip IDs only.',error)}
  const found=[];
  for(const trip of tripMap.values()){
   try{
    const snap=await timeout(s.api.getDoc(s.api.doc(s.db,'trips',trip.id,'envelopes','travel-vault')),'Vault metadata lookup',6000);
    if(snap.exists()){
     const meta=snap.data();
     if(meta?.storagePath||Number(meta?.firestoreChunkCount||0)>0){
      const ts=meta?.updatedAt?.toMillis?.()||meta?.updatedAt?.seconds*1000||0;
      found.push({tripId:trip.id,tripLabel:trip.label,meta,sortTime:Number(ts||0),revision:Number(meta?.revision||0)});
     }
    }
   }catch(error){console.warn(`Vault metadata unavailable for ${trip.id}.`,error)}
  }
  found.sort((a,b)=>(b.sortTime-a.sortTime)||(b.revision-a.revision));
  if(found.length){
   const candidate=found[0];
   localStorage.setItem('ivtc.activeTripId',candidate.tripId);localStorage.setItem('ivtc.activeTripLabel',candidate.tripLabel);
   cloudRestore={state:'found',message:'',candidate,candidates:found};renderSetup();return;
  }
  cloudRestore={state:'none',message:'No uploaded encrypted Vault was found. On the Mac, open Travel Vault and use “Sync now,” then tap “Check cloud again” here.',candidate:null,candidates:[]};renderSetup();
 }catch(e){cloudRestore={state:'error',message:e?.message||'The cloud Vault check could not be completed.',candidate:null,candidates:[]};renderSetup();}
}
async function restoreCloudVault(){
 const button=qs('#vault-cloud-restore'),password=qs('#vault-cloud-password')?.value||'';
 const candidates=(cloudRestore.candidates?.length?cloudRestore.candidates:[cloudRestore.candidate]).filter(Boolean);
 if(!candidates.length)return;
 if(!password)return renderSetup('Enter the Vault password you use on your Mac.');
 let lastError=null;
 try{
  button.disabled=true;
  const s=window.IVTC.firebase._state;
  for(let i=0;i<candidates.length;i++){
   const candidate=candidates[i];
   try{
    button.textContent=candidates.length>1?`Checking encrypted copy ${i+1} of ${candidates.length}…`:'Downloading encrypted Vault…';
    const text=await downloadSnapshotText(s,candidate.tripId,candidate.meta);
    if(candidate.meta?.checksum){const actual=await sha256Text(text);if(actual!==candidate.meta.checksum)throw new Error('Encrypted Vault checksum mismatch.');}
    const restored=JSON.parse(text);
    button.textContent='Verifying password…';
    const unlocked=await decryptBackup(restored,password);
    localStorage.setItem('ivtc.activeTripId',candidate.tripId);localStorage.setItem('ivtc.activeTripLabel',candidate.tripLabel);
    saveStore(restored);masterKey=unlocked.key;data=unlocked.contents;normalizeData();recordAudit('Existing encrypted cloud Vault restored on this device');await persist({skipCloud:true});startCloudReservations();renderUnlocked();cloudSyncNow('device restore');return;
   }catch(error){lastError=error;console.warn(`Encrypted Vault copy for ${candidate.tripId} did not unlock; trying next available copy.`,error)}
  }
  throw lastError||new Error('No encrypted Vault copy could be unlocked.');
 }catch(e){
  const cryptographicFailure=e?.name==='OperationError'||e?.message?.includes('operation')||e?.message?.includes('decrypt');
  renderSetup(cryptographicFailure?'The password did not unlock any available cloud Vault copy. Check the exact password used on the Mac and try again.':(e?.message||'The encrypted cloud Vault could not be restored.'));
 }
}
async function createVault(){
 const password=qs('#vault-password').value,confirm=qs('#vault-confirm').value,owner=qs('#vault-owner').value.trim();
 if(password.length<12)return renderSetup('Use a password of at least 12 characters.');
 if(password!==confirm)return renderSetup('The two passwords do not match.');
 try{
  const salt=random(16),pwKey=await derivePassword(password,salt);masterKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
  data=defaultData(owner);recordAudit('Vault created');
  const raw=await exportRawKey(masterKey);
  const store={format:'ivtc-encrypted-vault',schema:1,createdAt:now(),kdf:{name:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt)},passwordWrap:await seal(pwKey,raw,'ivtc-master-key-v1'),vault:await seal(masterKey,data,'ivtc-vault-data-v1')};
  saveStore(store);renderUnlocked();scheduleLock();
 }catch(e){renderSetup('This browser could not create the encrypted vault. Use current Safari over HTTPS.');}
}
function renderLocked(message=''){
 const store=loadStore();if(!store)return renderSetup();
 HOST.innerHTML=`<section class="vault-auth card"><div class="vault-lock-icon">🔒</div><div><div class="meta">Travel Vault locked</div><h2>Unlock private travel information</h2><p>The encrypted copy remains available offline on this device.</p></div>${message?`<p class="vault-error">${esc(message)}</p>`:''}<label>Vault password<input id="vault-unlock-password" type="password" autocomplete="current-password"></label><div class="button-row"><button class="btn" id="vault-unlock" type="button">Unlock vault</button>${store.biometric?'<button class="btn outline" id="vault-biometric" type="button">Use Face ID / Touch ID</button>':''}<button class="btn outline" id="vault-import-locked" type="button">Restore encrypted backup</button></div><input id="vault-import-file-locked" type="file" accept="application/json,.ivtcvault" hidden><p class="notice">Biometric unlock appears only after it has been enabled on this device.</p></section>`;
 qs('#vault-unlock').addEventListener('click',unlockPassword);qs('#vault-unlock-password').addEventListener('keydown',e=>{if(e.key==='Enter')unlockPassword()});
 qs('#vault-biometric')?.addEventListener('click',unlockBiometric);
 qs('#vault-import-locked').addEventListener('click',()=>qs('#vault-import-file-locked').click());qs('#vault-import-file-locked').addEventListener('change',importBackup);
}
async function unlockPassword(){
 const password=qs('#vault-unlock-password').value,store=loadStore();
 try{const pwKey=await derivePassword(password,unb64(store.kdf.salt),store.kdf.iterations);const raw=await open(pwKey,store.passwordWrap,'ivtc-master-key-v1',true);masterKey=await importAes(raw);data=await open(masterKey,store.vault,'ivtc-vault-data-v1');normalizeData();recordAudit('Vault unlocked with password');await persist({skipCloud:true});startCloudReservations();cloudSyncNow('unlock');}
 catch(e){masterKey=null;data=null;renderLocked('Incorrect password or damaged vault data.');}
}
function categoryLabel(v){return ({hotel:'Hotel',flight:'Flight',cruise:'Cruise',restaurant:'Restaurant',transport:'Transport',other:'Other'})[v]||'Other'}
function documentCategoryLabel(v){return ({identity:'Identity',financial:'Financial',medical:'Medical',travel:'Travel',emergency:'Emergency',other:'Other'})[v]||'Other'}

function cloudDate(value){if(!value)return 'Date not added';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?value:d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
function cloudReservationPrivateRecord(cloudId){return data.records.find(r=>r.cloudReservationId===cloudId)}
function cloudReservationCards(){
 if(cloudReservationMeta.status==='loading')return `<div class="card"><h3>Loading cloud itinerary…</h3><p>Connecting to the active trip in Firestore.</p></div>`;
 if(cloudReservationMeta.status==='signed-out')return `<div class="card"><h3>Cloud itinerary unavailable</h3><p>Sign in to Firebase to show the active trip’s reservations here. Your encrypted Vault records remain available offline.</p><a class="btn outline" href="cloud-vault.html">Cloud sign in</a></div>`;
 if(cloudReservationMeta.status==='no-trip')return `<div class="card"><h3>No active trip selected</h3><p>Choose the active trip in My Trips to show its cloud reservations here.</p><a class="btn outline" href="my-trips.html">Choose trip</a></div>`;
 if(cloudReservationMeta.status==='error')return `<div class="card"><h3>Cloud itinerary could not load</h3><p>${esc(cloudReservationMeta.message||'The local encrypted records are still available.')}</p><a class="btn outline" href="reservations.html">Open cloud reservations</a></div>`;
 if(!cloudReservations.length)return `<div class="card"><h3>No cloud reservations yet</h3><p>Add lodging on the main Reservations page. It will then appear here automatically.</p><a class="btn" href="reservations.html">Open reservations</a></div>`;
 return `<div class="vault-record-grid cloud-reservation-grid">${cloudReservations.map(r=>{const privateRecord=cloudReservationPrivateRecord(r.id);return `<article class="card vault-record cloud-reservation-card" data-category="${esc(r.type||'hotel')}"><div class="vault-record-top"><span class="tag selected">Cloud synced</span><span class="vault-record-date">${cloudDate(r.checkIn)} → ${cloudDate(r.checkOut)}</span></div><h3>${esc(r.name)}</h3><p class="vault-location">${esc([r.city,r.country].filter(Boolean).join(', '))}</p><dl>${r.address?`<dt>Address</dt><dd>${esc(r.address)}</dd>`:''}${r.roomType?`<dt>Room</dt><dd>${esc(r.roomType)}</dd>`:''}${r.confirmation?`<dt>Confirmation</dt><dd>${esc(r.confirmation)}</dd>`:''}</dl>${privateRecord?`<div class="vault-card-status">🔒 Encrypted private details attached</div>${privateRecord.attachments?.length?`<p><strong>${privateRecord.attachments.length} encrypted attachment${privateRecord.attachments.length===1?'':'s'}</strong></p>`:''}`:`<p class="notice">Add confirmation scans, payment notes, or other sensitive details without putting them in Firestore.</p>`}<div class="button-row"><a class="btn outline" href="reservations.html">Cloud details</a><button class="btn" data-cloud-private="${esc(r.id)}" type="button">${privateRecord?'Edit private details':'Add private details'}</button></div></article>`}).join('')}</div>`;
}
function unifiedReservationsPanel(records){
 const standalone=records.filter(r=>!r.cloudReservationId);
 const status=cloudReservationMeta.fromCache?'Offline cloud copy':cloudReservationMeta.status==='ready'?'Cloud synced':'Cloud itinerary';
 return `<div class="vault-section-head"><div><div class="meta">One itinerary · two security layers</div><h2>Reservations</h2><p>Cloud itinerary details appear here automatically. Sensitive notes and files remain encrypted only inside this Vault.</p></div><div><span class="tag">${esc(status)}</span></div></div><h3>Cloud itinerary</h3>${cloudReservationCards()}<div class="vault-section-head vault-private-head"><div><h3>Encrypted standalone records</h3><p>Use these only for reservations that are not already in the cloud itinerary.</p></div><button class="btn outline" id="vault-add-standalone" type="button">Add standalone record</button></div><div id="vault-records">${recordCards(standalone)}</div>`;
}
async function startCloudReservations(){
 if(!masterKey||!data)return;
 try{
  if(!window.IVTC?.tripRepository){cloudReservationMeta={status:'error',message:'Unified trip repository did not load.'};renderUnlocked();return}
  cloudReservationUnsub?.();cloudReservationMeta={status:'loading'};renderUnlocked();
  cloudReservationUnsub=await window.IVTC.tripRepository.subscribeReservations((items,meta)=>{
   cloudReservations=items;cloudReservationMeta={status:'ready',...meta};renderUnlocked();
  },err=>{
   const local=window.IVTC.tripRepository.localReservations();
   if(local.length){cloudReservations=local;cloudReservationMeta={status:'ready',fromCache:true,cloudError:err?.message||''};renderUnlocked();}
   else{cloudReservationMeta={status:'error',message:err?.message||'Reservations could not load.'};renderUnlocked();}
  });
 }catch(e){
  const local=window.IVTC?.tripRepository?.localReservations?.()||[];
  if(local.length){cloudReservations=local;cloudReservationMeta={status:'ready',fromCache:true,cloudError:e.message};}
  else cloudReservationMeta={status:'error',message:e.message};
  renderUnlocked();
 }
}
function renderUnlocked(){
 if(!data||!masterKey)return renderLocked();normalizeData();
 const records=[...data.records].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
 const documents=[...data.documents].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
 const backupNeeded=(data.backup?.lastExportRevision??-1)!==(data.revision||0);const backupText=backupNeeded?'Backup recommended':`Backed up ${data.backup?.lastExportAt?new Date(data.backup.lastExportAt).toLocaleString():'never'}`;
 HOST.innerHTML=`<section class="vault-toolbar"><div>${statusBadge()} <span class="vault-sync"><strong>${backupText}</strong> · ${data.outbox.length?`${data.outbox.length} encrypted change${data.outbox.length===1?'':'s'} ready to share`:'Up to date on this device'} · ${new Date(data.updatedAt).toLocaleString()}</span></div><div class="button-row"><button class="btn" id="vault-add-document" type="button">Add secure document</button><button class="btn outline" id="vault-add" type="button">Add reservation</button><button class="btn outline" id="vault-lock" type="button">Lock now</button></div></section>
 <section class="vault-layout"><aside class="card vault-sidebar"><h2>Travel Vault</h2><button class="vault-nav ${activePanel==='documents'?'active':''}" data-vault-panel="documents">Secure documents <span>${documents.length}</span></button><button class="vault-nav ${activePanel==='records'?'active':''}" data-vault-panel="records">Reservations <span>${cloudReservations.length+records.filter(r=>!r.cloudReservationId).length}</span></button><button class="vault-nav ${activePanel==='activity'?'active':''}" data-vault-panel="activity">Activity <span>${data.audit.length}</span></button><button class="vault-nav ${activePanel==='travelers'?'active':''}" data-vault-panel="travelers">Travelers <span>${data.travelers.length}</span></button><button class="vault-nav ${activePanel==='devices'?'active':''}" data-vault-panel="devices">Devices <span>${data.devices.length}</span></button><button class="vault-nav ${activePanel==='sharing'?'active':''}" data-vault-panel="sharing">Share & sync <span>${data.outbox.length}</span></button><button class="vault-nav ${activePanel==='backup'?'active':''}" data-vault-panel="backup">Backup & recovery ${backupNeeded?'<span>!</span>':''}</button><button class="vault-nav ${activePanel==='security'?'active':''}" data-vault-panel="security">Security</button><div class="vault-local-note"><strong>Encrypted locally</strong><p>Passport scans and other documents are encrypted before browser storage. Export an encrypted backup after adding important files.</p></div></aside>
 <div class="vault-main"><section data-panel="documents" ${activePanel==='documents'?'':'hidden'}>${documentsPanel(documents)}</section><section data-panel="records" ${activePanel==='records'?'':'hidden'}>${unifiedReservationsPanel(records)}</section>
 <section data-panel="activity" ${activePanel==='activity'?'':'hidden'}>${activityPanel()}</section><section data-panel="travelers" ${activePanel==='travelers'?'':'hidden'}>${travelersPanel()}</section><section data-panel="devices" ${activePanel==='devices'?'':'hidden'}>${devicesPanel()}</section><section data-panel="sharing" ${activePanel==='sharing'?'':'hidden'}>${sharingPanel()}</section><section data-panel="backup" ${activePanel==='backup'?'':'hidden'}>${backupPanel()}</section><section data-panel="security" ${activePanel==='security'?'':'hidden'}>${securityPanel()}</section></div></section><div id="vault-modal"></div>`;
 bindUnlocked();scheduleLock();
}
function documentsPanel(documents){return `<div class="vault-section-head"><div><div class="meta">Encrypted identity and emergency files</div><h2>Secure documents</h2><p>Use this area for passport scans, identification, insurance cards, visas, medical information and emergency documents.</p></div><button class="btn" id="vault-add-document-panel" type="button">Add secure document</button></div>${documentCards(documents)}<div class="callout"><strong>Important:</strong> These files are stored only in this browser until you export an encrypted backup or encrypted share package. Keep the vault password and a current backup separately.</div>`}
function documentCards(documents){if(!documents.length)return `<div class="card empty-state"><h3>No secure documents yet</h3><p>Add a passport scan, passport card, driver license, Global Entry card, insurance document, prescription list, visa or emergency record.</p><button class="btn" data-empty-document type="button">Add first secure document</button></div>`;return `<div class="vault-document-groups">${['identity','travel','medical','financial','emergency','other'].map(cat=>{const items=documents.filter(d=>d.category===cat);if(!items.length)return '';return `<section class="vault-document-group"><h3>${documentCategoryLabel(cat)}</h3><div class="vault-record-grid">${items.map(d=>`<article class="card vault-record vault-document-card"><div class="vault-record-top"><span class="tag">${documentCategoryLabel(d.category)}</span><span class="vault-record-date">${d.expires?`Expires ${new Date(d.expires+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`:'No expiration entered'}</span></div><h3>${esc(d.title)}</h3>${d.holder?`<p class="vault-location">${esc(d.holder)}</p>`:''}${d.documentNumber?`<dl><dt>Document number</dt><dd>${esc(d.documentNumber)}</dd></dl>`:''}${d.notes?`<p class="vault-notes">${esc(d.notes)}</p>`:''}<div class="vault-attachments"><strong>${d.files.length} encrypted file${d.files.length===1?'':'s'}</strong>${d.files.map(f=>`<button class="btn outline vault-file" data-download-document="${d.id}" data-download-document-file="${f.id}" type="button">Open ${esc(f.name)}</button>`).join('')}</div><div class="button-row"><button class="btn outline" data-edit-document="${d.id}" type="button">Edit</button><button class="btn outline danger" data-delete-document="${d.id}" type="button">Delete</button></div></article>`).join('')}</div></section>`}).join('')}</div>`}
function recordCards(records){if(!records.length)return `<div class="card empty-state"><h3>No private reservations yet</h3><p>Add a hotel, flight, cruise, restaurant or transportation record. It will be encrypted before being saved.</p><button class="btn" data-empty-add type="button">Add first reservation</button></div>`;return `<div class="vault-record-grid">${records.map(r=>`<article class="card vault-record" data-category="${esc(r.category)}"><div class="vault-record-top"><span class="tag">${categoryLabel(r.category)}</span><span class="vault-record-date">${r.date?new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'No date'}</span></div><h3>${esc(r.title)}</h3>${r.location?`<p class="vault-location">${esc(r.location)}</p>`:''}<div class="vault-card-status">${esc(r.status||'confirmed')}</div><dl>${r.confirmation?`<dt>Confirmation</dt><dd>${esc(r.confirmation)}</dd>`:''}${r.contact?`<dt>Contact</dt><dd>${esc(r.contact)}</dd>`:''}${r.checkIn?`<dt>Check-in</dt><dd>${esc(r.checkIn)}</dd>`:''}${r.checkOut?`<dt>Check-out</dt><dd>${esc(r.checkOut)}</dd>`:''}</dl>${r.notes?`<p class="vault-notes">${esc(r.notes)}</p>`:''}${r.attachments?.length?`<div class="vault-attachments"><strong>${r.attachments.length} encrypted attachment${r.attachments.length===1?'':'s'}</strong>${r.attachments.map(a=>`<button class="btn outline vault-file" data-download-record="${r.id}" data-download-attachment="${a.id}" type="button">${esc(a.name)}</button>`).join('')}</div>`:''}<div class="button-row"><button class="btn outline" data-edit-record="${r.id}" type="button">Edit</button><button class="btn outline danger" data-delete-record="${r.id}" type="button">Delete</button></div></article>`).join('')}</div>`}
function activityPanel(){return `<div class="vault-section-head"><div><div class="meta">Encrypted local history</div><h2>Activity timeline</h2></div></div><div class="vault-activity">${data.audit.length?data.audit.map(a=>`<article class="card"><strong>${esc(a.action)}</strong><span>${new Date(a.at).toLocaleString()}</span></article>`).join(''):'<p>No activity yet.</p>'}</div>`}
function travelersPanel(){return `<div class="vault-section-head"><div><div class="meta">Authorized trip members</div><h2>Traveler profiles</h2></div><button class="btn" id="vault-add-traveler" type="button">Add traveler</button></div><div class="vault-travelers">${data.travelers.map(t=>`<article class="card"><div><h3>${esc(t.name)}</h3><p>${esc(t.role)}</p></div>${t.role==='Owner'?'':`<button class="btn outline danger" data-remove-traveler="${t.id}" type="button">Remove</button>`}</article>`).join('')}</div><div class="callout"><strong>Current behavior:</strong> traveler profiles and roles are stored inside the encrypted vault. Independent online authentication begins only after the sync service is connected.</div>`}
function devicesPanel(){return `<div class="vault-section-head"><div><div class="meta">Encrypted device registry</div><h2>Known devices</h2><p>Device information is stored inside the encrypted Vault and travels with each synchronized snapshot.</p></div></div><div class="vault-travelers">${data.devices.map(d=>`<article class="card"><div><h3>${esc(d.name)}</h3><p>${d.id===deviceId?'This device · ':''}Last seen ${new Date(d.lastSeen).toLocaleString()}</p><p class="notice">${d.lastSyncedAt?`Last sync ${new Date(d.lastSyncedAt).toLocaleString()} · ${Number(d.syncCount||0)} completed sync${Number(d.syncCount||0)===1?'':'s'}`:'No completed sync recorded'}${d.appVersion?` · App v${esc(d.appVersion)}`:''}</p></div>${d.id===deviceId?'<span class="tag">Current</span>':'<span class="tag">Synced device</span>'}</article>`).join('')}</div><div class="callout"><strong>Stage 1 complete:</strong> devices now identify themselves in the encrypted Vault and record last-seen and last-sync information. Remote revocation remains disabled until a later, separately tested release.</div>`}

function backupPanel(){const needed=(data.backup?.lastExportRevision??-1)!==(data.revision||0);return `<div class="vault-section-head"><div><div class="meta">Portable encrypted recovery</div><h2>Backup & recovery</h2><p>Export one encrypted file that can restore this vault on another device. Save it in iCloud Drive or another secure location.</p></div></div><div class="card"><h3>${needed?'Backup recommended':'Backup current'}</h3><p>${data.backup?.lastExportAt?`Last export: ${new Date(data.backup.lastExportAt).toLocaleString()}`:'No backup has been exported from this vault.'}</p><p>Vault revision: ${data.revision||0} · Last backed-up revision: ${data.backup?.lastExportRevision??'none'}</p><div class="button-row"><button class="btn" id="vault-export-backup-panel" type="button">Export encrypted backup</button><button class="btn outline" id="vault-verify-backup-panel" type="button">Verify backup</button><button class="btn outline" id="vault-restore-backup-panel" type="button">Restore backup</button></div><input id="vault-verify-file-panel" type="file" accept="application/json,.ivtcvault" hidden><input id="vault-import-file-panel" type="file" accept="application/json,.ivtcvault" hidden><div id="vault-backup-result" class="notice"></div></div><div class="callout"><strong>Safer recovery:</strong> Verify reads and decrypts the selected backup without changing this vault. Restore shows its contents and asks before replacing the current vault.</div>`}
function sharingPanel(){return `<div class="vault-section-head"><div><div class="meta">Encrypted collaboration</div><h2>Share & sync</h2></div></div><article class="card"><h3>Encrypted Firebase sync</h3>${syncStatusMarkup()}<p>The complete Vault snapshot is encrypted on this device before upload. Changes sync automatically while the Vault is unlocked; manual controls remain available. Firebase stores ciphertext only; your separate Vault password and readable key are never uploaded.</p><div class="button-row"><button class="btn" id="vault-sync-now" type="button">Sync now</button><button class="btn outline" id="vault-pull-now" type="button">Download latest</button>${cloudSyncBusy?'<button class="btn outline" id="vault-cancel-sync" type="button">Cancel sync</button>':''}</div><p class="notice">Requires Firebase sign-in, an active trip, published Firestore rules, and published Storage rules.</p></article><article class="card"><div class="meta">Encrypted local log</div><h3>Recent sync history</h3>${syncHistoryMarkup()}</article><div class="grid grid-2"><article class="card"><h3>Manual share package</h3><p>Download an encrypted collaboration package for AirDrop, Messages, Mail, or iCloud Drive.</p><button class="btn outline" id="vault-export-changes" type="button">Download share package</button><p class="notice">${data.outbox.length} change${data.outbox.length===1?'':'s'} currently queued.</p></article><article class="card"><h3>Import manual changes</h3><p>Newer records are merged; conflicting versions are preserved for review.</p><button class="btn outline" id="vault-import-changes" type="button">Import share package</button><input id="vault-import-changes-file" type="file" accept="application/json,.ivtcshare" hidden></article></div>`}
function securityPanel(){const store=loadStore();return `<div class="vault-section-head"><div><div class="meta">Protection and recovery</div><h2>Security & encrypted backup</h2></div></div><div class="grid grid-2"><article class="card"><h3>Automatic lock</h3><label>Lock after<select id="vault-autolock"><option value="1">1 minute</option><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="60">1 hour</option><option value="0">Only when I tap Lock</option></select></label><p class="notice">The readable key exists only in memory while the vault is unlocked.</p></article><article class="card"><h3>Face ID / Touch ID</h3><p>${store.biometric?'Biometric unlock is enabled on this device.':'Enable device biometric unlock where Safari supports passkey PRF encryption.'}</p><div class="button-row">${store.biometric?'<button class="btn outline danger" id="vault-disable-biometric" type="button">Disable on this device</button>':'<button class="btn" id="vault-enable-biometric" type="button">Enable biometric unlock</button>'}</div><p class="notice">Apple verifies your identity; the companion never receives biometric data.</p></article><article class="card"><h3>Complete encrypted backup</h3><p>Download one encrypted file containing all records, attachments, travelers, activity and key wrappers.</p><div class="button-row"><button class="btn" id="vault-export" type="button">Download encrypted backup</button><button class="btn outline" id="vault-import" type="button">Restore backup</button></div><input id="vault-import-file" type="file" accept="application/json,.ivtcvault" hidden></article><article class="card"><h3>Change password</h3><label>Current password<input id="vault-current-password" type="password" autocomplete="current-password"></label><label>New password<input id="vault-new-password" type="password" autocomplete="new-password"></label><button class="btn" id="vault-change-password" type="button">Change vault password</button><p class="notice" id="vault-security-status"></p></article></div><article class="card danger-zone"><h3>Delete local vault</h3><p>This permanently removes the encrypted vault from this browser. Export a backup first.</p><button class="btn outline danger" id="vault-delete-all" type="button">Delete vault from this device</button></article>`}
function bindUnlocked(){
 qs('#vault-lock').onclick=lock;qs('#vault-export-backup-panel')?.addEventListener('click',exportBackup);qs('#vault-verify-backup-panel')?.addEventListener('click',()=>qs('#vault-verify-file-panel').click());qs('#vault-verify-file-panel')?.addEventListener('change',verifyBackup);qs('#vault-restore-backup-panel')?.addEventListener('click',()=>qs('#vault-import-file-panel').click());qs('#vault-import-file-panel')?.addEventListener('change',importBackup);qs('#vault-add').onclick=()=>editRecord();qs('#vault-add-document').onclick=()=>editDocument();qs('#vault-add-document-panel')?.addEventListener('click',()=>editDocument());qs('[data-empty-document]')?.addEventListener('click',()=>editDocument());qs('[data-empty-add]')?.addEventListener('click',()=>editRecord());qs('#vault-add-standalone')?.addEventListener('click',()=>editRecord());qsa('[data-cloud-private]').forEach(b=>b.onclick=()=>editCloudPrivate(b.dataset.cloudPrivate));
 qsa('.vault-nav').forEach(b=>b.onclick=()=>{activePanel=b.dataset.vaultPanel;qsa('.vault-nav').forEach(x=>x.classList.toggle('active',x===b));qsa('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==activePanel)});
 qs('#vault-filter')?.addEventListener('change',e=>qsa('.vault-record').forEach(c=>c.hidden=e.target.value!=='all'&&c.dataset.category!==e.target.value));
 qsa('[data-edit-record]').forEach(b=>b.onclick=()=>editRecord(b.dataset.editRecord));qsa('[data-delete-record]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.deleteRecord));qsa('[data-download-attachment]').forEach(b=>b.onclick=()=>downloadAttachment(b.dataset.downloadRecord,b.dataset.downloadAttachment));qsa('[data-edit-document]').forEach(b=>b.onclick=()=>editDocument(b.dataset.editDocument));qsa('[data-delete-document]').forEach(b=>b.onclick=()=>deleteDocument(b.dataset.deleteDocument));qsa('[data-download-document-file]').forEach(b=>b.onclick=()=>downloadDocumentFile(b.dataset.downloadDocument,b.dataset.downloadDocumentFile));
 qs('#vault-add-traveler')?.addEventListener('click',addTraveler);qsa('[data-remove-traveler]').forEach(b=>b.onclick=()=>removeTraveler(b.dataset.removeTraveler));
 const al=qs('#vault-autolock');if(al){al.value=String(data.settings.autoLockMinutes??15);al.onchange=async()=>{data.settings.autoLockMinutes=Number(al.value);recordAudit('Automatic lock changed');await persist()}}
 qs('#vault-export')?.addEventListener('click',exportBackup);qs('#vault-import')?.addEventListener('click',()=>qs('#vault-import-file').click());qs('#vault-import-file')?.addEventListener('change',importBackup);
 qs('#vault-sync-now')?.addEventListener('click',()=>cloudSyncNow('manual'));qs('#vault-pull-now')?.addEventListener('click',pullCloudNow);qs('#vault-cancel-sync')?.addEventListener('click',cancelCloudSync);
 qs('#vault-change-password')?.addEventListener('click',changePassword);qs('#vault-enable-biometric')?.addEventListener('click',enableBiometric);qs('#vault-disable-biometric')?.addEventListener('click',disableBiometric);qs('#vault-export-changes')?.addEventListener('click',exportChanges);qs('#vault-import-changes')?.addEventListener('click',()=>qs('#vault-import-changes-file').click());qs('#vault-import-changes-file')?.addEventListener('change',importChanges);qs('#vault-delete-all')?.addEventListener('click',deleteVault);
 ['pointerdown','keydown','touchstart'].forEach(evt=>document.addEventListener(evt,scheduleLock,{passive:true,once:true}));
}

function editCloudPrivate(cloudId){
 const cloud=cloudReservations.find(r=>r.id===cloudId);if(!cloud)return;
 const existing=cloudReservationPrivateRecord(cloudId);
 if(existing)return editRecord(existing.id);
 const draft={id:'',cloudReservationId:cloudId,category:cloud.type==='cruise'?'cruise':'hotel',title:cloud.name,date:cloud.checkIn||'',location:[cloud.city,cloud.country].filter(Boolean).join(', '),confirmation:'',contact:'',notes:'',status:cloud.status||'confirmed',checkIn:cloud.checkIn||'',checkOut:cloud.checkOut||'',attachments:[]};
 editRecord('',draft);
}
function editRecord(id='',seed=null){
 const r=data.records.find(x=>x.id===id)||seed||{id:'',category:'hotel',title:'',date:'',location:'',confirmation:'',contact:'',notes:'',status:'confirmed',checkIn:'',checkOut:'',attachments:[]};
 qs('#vault-modal').innerHTML=`<div class="vault-modal-backdrop"><section class="vault-modal card" role="dialog" aria-modal="true" aria-labelledby="vault-record-title"><button class="vault-modal-close" type="button" aria-label="Close">×</button><div class="meta">Encrypted reservation</div><h2 id="vault-record-title">${id?'Edit':'Add'} private record</h2><div class="vault-form-grid"><label>Type<select id="vr-category"><option value="hotel">Hotel</option><option value="flight">Flight</option><option value="cruise">Cruise</option><option value="restaurant">Restaurant</option><option value="transport">Transport</option><option value="other">Other</option></select></label><label>Status<select id="vr-status"><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="changed">Changed</option><option value="canceled">Canceled</option></select></label><label>Date<input id="vr-date" type="date" value="${esc(r.date)}"></label><label class="span-2">Name or title<input id="vr-title" value="${esc(r.title)}" placeholder="Dersaadet Hotel Istanbul"></label><label class="span-2">Location<input id="vr-location" value="${esc(r.location)}" placeholder="Address, terminal or meeting point"></label><label>Confirmation number<input id="vr-confirmation" value="${esc(r.confirmation)}"></label><label>Contact<input id="vr-contact" value="${esc(r.contact)}" placeholder="Phone or email"></label><label>Check-in / start time<input id="vr-checkin" value="${esc(r.checkIn)}" placeholder="3:00 PM"></label><label>Check-out / end time<input id="vr-checkout" value="${esc(r.checkOut)}" placeholder="11:00 AM"></label><label class="span-2">Private notes<textarea id="vr-notes" rows="5">${esc(r.notes)}</textarea></label><label class="span-2">Encrypted attachments<input id="vr-files" type="file" multiple accept="application/pdf,image/*,.pkpass,text/plain"><span class="notice">Up to 5 MB per file. Attachments remain inside the encrypted vault.</span></label></div><div class="button-row"><button class="btn" id="vr-save" type="button">Save encrypted record</button><button class="btn outline" id="vr-cancel" type="button">Cancel</button></div><p class="vault-error" id="vr-error"></p></section></div>`;
 qs('#vr-category').value=r.category;qs('#vr-status').value=r.status||'confirmed';const close=()=>qs('#vault-modal').innerHTML='';qs('.vault-modal-close').onclick=close;qs('#vr-cancel').onclick=close;
 qs('#vr-save').onclick=async()=>{const title=qs('#vr-title').value.trim();if(!title){qs('#vr-error').textContent='Enter a name or title.';return}const files=[...qs('#vr-files').files];if(files.some(f=>f.size>5*1024*1024)){qs('#vr-error').textContent='Each attachment must be 5 MB or smaller.';return}const attachments=[...(r.attachments||[])];for(const f of files)attachments.push({id:crypto.randomUUID(),name:f.name,type:f.type||'application/octet-stream',size:f.size,data:await fileToDataURL(f)});const out={id:id||crypto.randomUUID(),cloudReservationId:r.cloudReservationId||'',category:qs('#vr-category').value,status:qs('#vr-status').value,title,date:qs('#vr-date').value,location:qs('#vr-location').value.trim(),confirmation:qs('#vr-confirmation').value.trim(),contact:qs('#vr-contact').value.trim(),checkIn:qs('#vr-checkin').value.trim(),checkOut:qs('#vr-checkout').value.trim(),notes:qs('#vr-notes').value.trim(),attachments,updatedAt:now(),updatedBy:deviceId};const recordIndex=data.records.findIndex(x=>x.id===id);if(recordIndex>=0)data.records[recordIndex]=out;else data.records.push(out);queueChange(id?'record-updated':'record-added',out.id);recordAudit(`${id?'Updated':'Added'} ${categoryLabel(out.category)} record`);await persist()};
}
function editDocument(id=''){
 const d=data.documents.find(x=>x.id===id)||{id:'',category:'identity',title:'',holder:'',documentNumber:'',issued:'',expires:'',notes:'',files:[]};
 qs('#vault-modal').innerHTML=`<div class="vault-modal-backdrop"><section class="vault-modal card" role="dialog" aria-modal="true" aria-labelledby="vault-document-title"><button class="vault-modal-close" type="button" aria-label="Close">×</button><div class="meta">Encrypted document</div><h2 id="vault-document-title">${id?'Edit':'Add'} secure document</h2><div class="vault-form-grid"><label>Category<select id="vd-category"><option value="identity">Identity</option><option value="travel">Travel</option><option value="medical">Medical</option><option value="financial">Financial</option><option value="emergency">Emergency</option><option value="other">Other</option></select></label><label>Document holder<input id="vd-holder" value="${esc(d.holder)}" placeholder="John"></label><label class="span-2">Document title<input id="vd-title" value="${esc(d.title)}" placeholder="United States passport"></label><label>Document number (optional)<input id="vd-number" value="${esc(d.documentNumber)}"></label><label>Issue date<input id="vd-issued" type="date" value="${esc(d.issued)}"></label><label>Expiration date<input id="vd-expires" type="date" value="${esc(d.expires)}"></label><label class="span-2">Private notes<textarea id="vd-notes" rows="4">${esc(d.notes)}</textarea></label><label class="span-2">Encrypted scan or document<input id="vd-files" type="file" multiple accept="application/pdf,image/*,.pkpass,text/plain"><span class="notice">PDF, image, wallet pass or text file. Up to 5 MB per file. Existing files remain attached when editing.</span></label></div>${d.files.length?`<div class="vault-existing-files"><strong>Existing encrypted files</strong>${d.files.map(f=>`<label><input type="checkbox" data-remove-doc-file="${f.id}"> Remove ${esc(f.name)}</label>`).join('')}</div>`:''}<div class="button-row"><button class="btn" id="vd-save" type="button">Save encrypted document</button><button class="btn outline" id="vd-cancel" type="button">Cancel</button></div><p class="vault-error" id="vd-error"></p></section></div>`;
 qs('#vd-category').value=d.category;const close=()=>qs('#vault-modal').innerHTML='';qs('.vault-modal-close').onclick=close;qs('#vd-cancel').onclick=close;
 qs('#vd-save').onclick=async()=>{const title=qs('#vd-title').value.trim();if(!title){qs('#vd-error').textContent='Enter a document title.';return}const incoming=[...qs('#vd-files').files];if(incoming.some(f=>f.size>5*1024*1024)){qs('#vd-error').textContent='Each file must be 5 MB or smaller.';return}const removed=new Set(qsa('[data-remove-doc-file]:checked').map(x=>x.dataset.removeDocFile));const files=(d.files||[]).filter(f=>!removed.has(f.id));for(const f of incoming)files.push({id:crypto.randomUUID(),name:f.name,type:f.type||'application/octet-stream',size:f.size,data:await fileToDataURL(f)});if(!files.length){qs('#vd-error').textContent='Attach at least one scan or document.';return}const out={id:id||crypto.randomUUID(),category:qs('#vd-category').value,title,holder:qs('#vd-holder').value.trim(),documentNumber:qs('#vd-number').value.trim(),issued:qs('#vd-issued').value,expires:qs('#vd-expires').value,notes:qs('#vd-notes').value.trim(),files,updatedAt:now(),updatedBy:deviceId};if(id)data.documents[data.documents.findIndex(x=>x.id===id)]=out;else data.documents.push(out);queueChange(id?'document-updated':'document-added',out.id);recordAudit(`${id?'Updated':'Added'} secure document: ${out.title}`);await persist()};
}
async function downloadDocumentFile(documentId,fileId){const d=data.documents.find(x=>x.id===documentId),f=d?.files?.find(x=>x.id===fileId);if(!f)return;const type=(f.type||'').toLowerCase(),name=esc(f.name);let body='';if(type.startsWith('image/'))body=`<img src="${f.data}" alt="${name}" style="max-width:100%;height:auto;display:block;margin:auto">`;else if(type==='application/pdf')body=`<iframe src="${f.data}" title="${name}" style="width:100%;height:70vh;border:0"></iframe>`;else if(type.startsWith('text/')||/\.(txt|md|csv|json)$/i.test(f.name)){try{body=`<pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:70vh;overflow:auto">${esc(await (await fetch(f.data)).text())}</pre>`}catch{body='<p>This text file could not be displayed.</p>'}}else body='<p>This file type cannot be previewed in the browser. Use Download file to open it with another app.</p>';qs('#vault-modal').innerHTML=`<div class="vault-modal-backdrop"><section class="vault-modal card" role="dialog" aria-modal="true"><button class="vault-modal-close" type="button" aria-label="Close">×</button><div class="meta">Decrypted for this unlocked session</div><h2>${name}</h2><div class="vault-file-preview">${body}</div><div class="button-row"><button class="btn outline" id="vault-file-download" type="button">Download file</button><button class="btn" id="vault-file-close" type="button">Close</button></div></section></div>`;const close=()=>qs('#vault-modal').innerHTML='';qs('.vault-modal-close').onclick=close;qs('#vault-file-close').onclick=close;qs('#vault-file-download').onclick=()=>{const link=document.createElement('a');link.href=f.data;link.download=f.name;link.click()}}
async function deleteDocument(id){const d=data.documents.find(x=>x.id===id);if(!d||!confirm(`Delete “${d.title}” and its encrypted file(s) from this vault?`))return;data.documents=data.documents.filter(x=>x.id!==id);queueChange('document-deleted',id);recordAudit(`Deleted secure document: ${d.title}`);await persist()}
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function downloadAttachment(recordId,attachmentId){const r=data.records.find(x=>x.id===recordId),a=r?.attachments?.find(x=>x.id===attachmentId);if(!a)return;const link=document.createElement('a');link.href=a.data;link.download=a.name;link.click()}
async function deleteRecord(id){const r=data.records.find(x=>x.id===id);if(!r||!confirm(`Delete “${r.title}” from this encrypted vault?`))return;data.records=data.records.filter(x=>x.id!==id);queueChange('record-deleted',id);recordAudit('Deleted reservation record');await persist()}
async function addTraveler(){const name=prompt('Traveler name');if(!name?.trim())return;const role=prompt('Role: Editor or Viewer','Editor');data.travelers.push({id:crypto.randomUUID(),name:name.trim(),role:/viewer/i.test(role||'')?'Viewer':'Editor'});queueChange('traveler-added',data.travelers.at(-1).id);recordAudit('Added traveler profile');await persist();qs('[data-vault-panel="travelers"]')?.click()}
async function removeTraveler(id){const t=data.travelers.find(x=>x.id===id);if(!t||!confirm(`Remove ${t.name} from the traveler list?`))return;data.travelers=data.travelers.filter(x=>x.id!==id);queueChange('traveler-removed',id);recordAudit('Removed traveler profile');await persist();qs('[data-vault-panel="travelers"]')?.click()}
function exportChanges(){const payload={format:'ivtc-encrypted-share',schema:1,createdAt:now(),sourceDevice:deviceId,records:data.records,documents:data.documents,travelers:data.travelers,audit:data.audit.slice(0,100),devices:data.devices};seal(masterKey,payload,'ivtc-share-v1').then(box=>{const blob=new Blob([JSON.stringify({format:'ivtc-encrypted-share',schema:1,box},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Travel-Vault-Changes-${new Date().toISOString().slice(0,10)}.ivtcshare`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);data.outbox=[];recordAudit('Encrypted collaboration package exported');persist()})}
async function importChanges(e){const file=e.target.files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(obj.format!=='ivtc-encrypted-share'||!obj.box)throw new Error();const incoming=await open(masterKey,obj.box,'ivtc-share-v1');let merged=0,conflicts=0;for(const r of incoming.records||[]){const local=data.records.find(x=>x.id===r.id);if(!local){data.records.push(r);merged++;continue}if((r.updatedAt||'')>(local.updatedAt||'')){data.records[data.records.indexOf(local)]=r;merged++}else if((r.updatedAt||'')!==(local.updatedAt||'')&&JSON.stringify(r)!==JSON.stringify(local)){data.records.push({...r,id:crypto.randomUUID(),title:`${r.title} (conflict copy)`,conflictOf:r.id});conflicts++}}for(const d of incoming.documents||[]){const local=data.documents.find(x=>x.id===d.id);if(!local)data.documents.push(d);else if((d.updatedAt||'')>(local.updatedAt||''))data.documents[data.documents.indexOf(local)]=d}for(const t of incoming.travelers||[])if(!data.travelers.some(x=>x.id===t.id))data.travelers.push(t);for(const d of incoming.devices||[])if(!data.devices.some(x=>x.id===d.id))data.devices.push(d);recordAudit(`Imported collaboration package: ${merged} merged, ${conflicts} conflict copies`);await persist();alert(`Imported ${merged} newer or new record(s). ${conflicts} conflict copy/copies preserved.`)}catch(err){alert('The share package could not be opened with this vault key. Use a package exported from the same shared vault.')}finally{e.target.value=''}}
async function exportBackup(){const stamp=now();data.backup={lastExportAt:stamp,lastExportRevision:data.revision||0};recordAudit('Encrypted backup exported');await persist();const core=backupCore(loadStore()),serialized=JSON.stringify(core),envelope={format:'ivtc-encrypted-vault-backup',schema:2,exportedAt:stamp,appVersion:APP_VERSION,checksum:{algorithm:'SHA-256',value:await sha256Text(serialized)},payload:core};const blob=new Blob([JSON.stringify(envelope,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Istanbul-Viking-Travel-Vault-${stamp.slice(0,10)}-${stamp.slice(11,19).replace(/:/g,'')}.ivtcvault`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function readBackupFile(file){const obj=JSON.parse(await file.text());let restored,meta={exportedAt:null,appVersion:'legacy'};if(obj.format==='ivtc-encrypted-vault-backup'&&obj.schema===2){if(!obj.payload||!obj.checksum?.value)throw new Error('Backup package is incomplete.');const actual=await sha256Text(JSON.stringify(obj.payload));if(actual!==obj.checksum.value)throw new Error('Backup integrity check failed. The file may be damaged or altered.');restored=obj.payload;meta={exportedAt:obj.exportedAt,appVersion:obj.appVersion||'unknown'}}else if(obj.format==='ivtc-encrypted-vault'&&obj.passwordWrap&&obj.vault){restored=obj}else throw new Error('Unrecognized backup format.');return {restored,meta}}
async function decryptBackup(restored,password){const pwKey=await derivePassword(password,unb64(restored.kdf.salt),restored.kdf.iterations);const raw=await open(pwKey,restored.passwordWrap,'ivtc-master-key-v1',true);const key=await importAes(raw);const contents=await open(key,restored.vault,'ivtc-vault-data-v1');return {key,contents}}
function backupSummary(contents,meta={}){const files=(contents.documents||[]).reduce((n,d)=>n+(d.files?.length||0),0)+(contents.records||[]).reduce((n,r)=>n+(r.attachments?.length||0),0);return `Backup ${meta.exportedAt?`created ${new Date(meta.exportedAt).toLocaleString()}`:'date unavailable'}\nDocuments: ${(contents.documents||[]).length} (${files} attached file${files===1?'':'s'})\nReservations: ${(contents.records||[]).length}\nTravelers: ${(contents.travelers||[]).length}\nActivity entries: ${(contents.audit||[]).length}`}
async function verifyBackup(e){const file=e.target.files?.[0];if(!file)return;try{const {restored,meta}=await readBackupFile(file),password=prompt('Enter the Vault password for this backup to verify its encrypted contents.');if(password===null)return;const {contents}=await decryptBackup(restored,password);const text=`Verified successfully.\n${backupSummary(contents,meta)}\nIntegrity: checksum and encryption passed.`;const out=qs('#vault-backup-result');if(out)out.textContent=text;alert(text)}catch(err){alert(err.message||'The backup could not be verified. Check the password and file.')}finally{e.target.value=''}}
async function importBackup(e){const file=e.target.files?.[0];if(!file)return;try{const {restored,meta}=await readBackupFile(file),password=prompt('Enter the Vault password for the backup you want to restore.');if(password===null)return;const {key,contents}=await decryptBackup(restored,password),summary=backupSummary(contents,meta);if(!confirm(`${summary}\n\nReplace the encrypted vault on this device with this backup?`))return;saveStore(restored);masterKey=key;data=contents;normalizeData();recordAudit('Encrypted backup restored and verified');await persist();alert('Backup restored. The listed documents and files are now available in Secure documents.')}catch(err){alert(err.message||'That backup could not be restored. Check the password and file.')}finally{e.target.value=''}}
async function changePassword(){const old=qs('#vault-current-password').value,newp=qs('#vault-new-password').value,status=qs('#vault-security-status');if(newp.length<12){status.textContent='New password must contain at least 12 characters.';return}try{const store=loadStore(),oldKey=await derivePassword(old,unb64(store.kdf.salt),store.kdf.iterations);await open(oldKey,store.passwordWrap,'ivtc-master-key-v1',true);const salt=random(16),newKey=await derivePassword(newp,salt);store.kdf={name:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt)};store.passwordWrap=await seal(newKey,await exportRawKey(masterKey),'ivtc-master-key-v1');saveStore(store);recordAudit('Vault password changed');await persist();status.textContent='Password changed.'}catch{status.textContent='Current password is incorrect.'}}
async function enableBiometric(){
 if(!window.PublicKeyCredential||!navigator.credentials){alert('Passkeys are not available in this browser.');return}
 try{
  const rpId=location.hostname,userId=random(32),prfSalt=random(32),challenge=random(32);
  const cred=await navigator.credentials.create({publicKey:{challenge,rp:{name:'Istanbul Viking Travel Vault',id:rpId},user:{id:userId,name:'travel-vault-'+Date.now(),displayName:'Travel Vault on this device'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},timeout:60000,attestation:'none',extensions:{prf:{eval:{first:prfSalt}}}}});
  const ext=cred.getClientExtensionResults();if(!ext.prf?.enabled)throw new Error('PRF unsupported');
  const assertion=await navigator.credentials.get({publicKey:{challenge:random(32),rpId,allowCredentials:[{type:'public-key',id:cred.rawId}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:prfSalt}}}}});
  const out=assertion.getClientExtensionResults().prf?.results?.first;if(!out)throw new Error('No PRF output');
  const bioKey=await importAes(new Uint8Array(out)),store=loadStore();store.biometric={credentialId:b64(cred.rawId),prfSalt:b64(prfSalt),masterWrap:await seal(bioKey,await exportRawKey(masterKey),'ivtc-biometric-master-v1'),createdAt:now()};saveStore(store);recordAudit('Biometric unlock enabled on this device');await persist();qs('[data-vault-panel="security"]')?.click();
 }catch(e){alert('This device did not complete encrypted biometric setup. Continue using the vault password. Safari support can vary by OS version and site installation state.');}
}
async function unlockBiometric(){try{const store=loadStore(),b=store.biometric,assertion=await navigator.credentials.get({publicKey:{challenge:random(32),rpId:location.hostname,allowCredentials:[{type:'public-key',id:unb64(b.credentialId)}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:unb64(b.prfSalt)}}}}});const out=assertion.getClientExtensionResults().prf?.results?.first;if(!out)throw new Error();const bioKey=await importAes(new Uint8Array(out)),raw=await open(bioKey,b.masterWrap,'ivtc-biometric-master-v1',true);masterKey=await importAes(raw);data=await open(masterKey,store.vault,'ivtc-vault-data-v1');normalizeData();recordAudit('Vault unlocked biometrically');await persist({skipCloud:true});startCloudReservations();cloudSyncNow('unlock')}catch{renderLocked('Biometric unlock was unavailable or canceled. Use the vault password.')}}
async function disableBiometric(){if(!confirm('Disable biometric unlock for this device?'))return;const store=loadStore();delete store.biometric;saveStore(store);recordAudit('Biometric unlock disabled');await persist();qs('[data-vault-panel="security"]')?.click()}
function deleteVault(){if(!confirm('Permanently delete the encrypted Travel Vault from this browser?'))return;if(!confirm('This cannot be undone without an exported backup. Delete it now?'))return;localStorage.removeItem(STORAGE);masterKey=null;data=null;renderSetup('The local vault was deleted.')}
window.addEventListener('pagehide',()=>{masterKey=null;data=null});document.addEventListener('visibilitychange',()=>{if(document.hidden&&data?.settings?.autoLockMinutes===1)scheduleLock()});
if(loadStore())renderLocked();else{renderSetup();setTimeout(discoverCloudVault,250);}
})();
