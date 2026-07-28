(()=>{
'use strict';
const HOST=document.querySelector('#vault-app');
if(!HOST)return;
const STORAGE='ivtc.travelVault.v1';
const SESSION='ivtc.travelVault.autoLock';
const ITERATIONS=310000;
const enc=new TextEncoder(),dec=new TextDecoder();
let masterKey=null,data=null,lockTimer=null;
const qs=(s,r=HOST)=>r.querySelector(s),qsa=(s,r=HOST)=>[...r.querySelectorAll(s)];
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const random=n=>crypto.getRandomValues(new Uint8Array(n));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const now=()=>new Date().toISOString();
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
function defaultData(owner){return {schema:1,createdAt:now(),updatedAt:now(),travelers:[{id:crypto.randomUUID(),name:owner||'Traveler 1',role:'Owner'}],records:[],settings:{autoLockMinutes:15},audit:[]}}
function recordAudit(action){data.audit.unshift({at:now(),action});data.audit=data.audit.slice(0,50)}
async function persist(){
 const store=loadStore();if(!store||!masterKey||!data)return;
 data.updatedAt=now();store.vault=await seal(masterKey,data,'ivtc-vault-data-v1');saveStore(store);renderUnlocked();scheduleLock();
}
function scheduleLock(){clearTimeout(lockTimer);if(!data)return;const mins=Number(data.settings?.autoLockMinutes??15);if(mins>0)lockTimer=setTimeout(lock,mins*60000)}
function lock(){masterKey=null;data=null;clearTimeout(lockTimer);renderLocked()}
function statusBadge(){return `<span class="vault-status secure">● Encrypted offline</span>`}
function renderSetup(message=''){
 HOST.innerHTML=`<section class="vault-auth card"><div class="vault-lock-icon">🔐</div><div><div class="meta">First-time setup</div><h2>Create this device’s Travel Vault</h2><p>Your password encrypts a randomly generated vault key. There is no password reset: keep the encrypted backup and password somewhere safe.</p></div>${message?`<p class="vault-error">${esc(message)}</p>`:''}<div class="vault-form-grid"><label>Owner name<input id="vault-owner" autocomplete="name" value="John"></label><label>Vault password<input id="vault-password" type="password" autocomplete="new-password" minlength="12"></label><label>Confirm password<input id="vault-confirm" type="password" autocomplete="new-password" minlength="12"></label></div><div class="button-row"><button class="btn" id="vault-create" type="button">Create encrypted vault</button></div><p class="notice">Use at least 12 characters. The password and readable reservation data are never written into the project files.</p></section>`;
 qs('#vault-create').addEventListener('click',createVault);
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
 try{const pwKey=await derivePassword(password,unb64(store.kdf.salt),store.kdf.iterations);const raw=await open(pwKey,store.passwordWrap,'ivtc-master-key-v1',true);masterKey=await importAes(raw);data=await open(masterKey,store.vault,'ivtc-vault-data-v1');recordAudit('Vault unlocked with password');await persist();}
 catch(e){masterKey=null;data=null;renderLocked('Incorrect password or damaged vault data.');}
}
function categoryLabel(v){return ({hotel:'Hotel',flight:'Flight',cruise:'Cruise',restaurant:'Restaurant',transport:'Transport',other:'Other'})[v]||'Other'}
function renderUnlocked(){
 if(!data||!masterKey)return renderLocked();
 const records=[...data.records].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
 HOST.innerHTML=`<section class="vault-toolbar"><div>${statusBadge()} <span class="vault-sync">Saved on this device · ${new Date(data.updatedAt).toLocaleString()}</span></div><div class="button-row"><button class="btn" id="vault-add" type="button">Add reservation</button><button class="btn outline" id="vault-lock" type="button">Lock now</button></div></section>
 <section class="vault-layout"><aside class="card vault-sidebar"><h2>Vault controls</h2><button class="vault-nav active" data-vault-panel="records">Reservations <span>${records.length}</span></button><button class="vault-nav" data-vault-panel="travelers">Travelers <span>${data.travelers.length}</span></button><button class="vault-nav" data-vault-panel="security">Security & backup</button><div class="vault-local-note"><strong>Current mode</strong><p>Encrypted local/offline vault. Shared cloud synchronization and temporary public-PC sessions require the separate secure sync service.</p></div></aside>
 <div class="vault-main"><section data-panel="records"><div class="vault-section-head"><div><div class="meta">Private records</div><h2>Reservations and trip details</h2></div><label class="vault-filter">Show<select id="vault-filter"><option value="all">All records</option><option value="hotel">Hotels</option><option value="flight">Flights</option><option value="cruise">Cruise</option><option value="restaurant">Restaurants</option><option value="transport">Transport</option><option value="other">Other</option></select></label></div><div id="vault-records">${recordCards(records)}</div></section>
 <section data-panel="travelers" hidden>${travelersPanel()}</section><section data-panel="security" hidden>${securityPanel()}</section></div></section><div id="vault-modal"></div>`;
 bindUnlocked();scheduleLock();
}
function recordCards(records){if(!records.length)return `<div class="card empty-state"><h3>No private reservations yet</h3><p>Add a hotel, flight, cruise, restaurant or transportation record. It will be encrypted before being saved.</p><button class="btn" data-empty-add type="button">Add first reservation</button></div>`;return `<div class="vault-record-grid">${records.map(r=>`<article class="card vault-record" data-category="${esc(r.category)}"><div class="vault-record-top"><span class="tag">${categoryLabel(r.category)}</span><span class="vault-record-date">${r.date?new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'No date'}</span></div><h3>${esc(r.title)}</h3>${r.location?`<p class="vault-location">${esc(r.location)}</p>`:''}<dl>${r.confirmation?`<dt>Confirmation</dt><dd>${esc(r.confirmation)}</dd>`:''}${r.contact?`<dt>Contact</dt><dd>${esc(r.contact)}</dd>`:''}</dl>${r.notes?`<p class="vault-notes">${esc(r.notes)}</p>`:''}<div class="button-row"><button class="btn outline" data-edit-record="${r.id}" type="button">Edit</button><button class="btn outline danger" data-delete-record="${r.id}" type="button">Delete</button></div></article>`).join('')}</div>`}
function travelersPanel(){return `<div class="vault-section-head"><div><div class="meta">Authorized trip members</div><h2>Traveler profiles</h2></div><button class="btn" id="vault-add-traveler" type="button">Add traveler</button></div><div class="vault-travelers">${data.travelers.map(t=>`<article class="card"><div><h3>${esc(t.name)}</h3><p>${esc(t.role)}</p></div>${t.role==='Owner'?'':`<button class="btn outline danger" data-remove-traveler="${t.id}" type="button">Remove</button>`}</article>`).join('')}</div><div class="callout"><strong>Important:</strong> profiles identify intended travelers inside this local vault. They do not yet create four independent online accounts. Use encrypted export/import to copy the vault to another approved device until the sync service is connected.</div>`}
function securityPanel(){const store=loadStore();return `<div class="vault-section-head"><div><div class="meta">Protection and recovery</div><h2>Security & encrypted backup</h2></div></div><div class="grid grid-2"><article class="card"><h3>Automatic lock</h3><label>Lock after<select id="vault-autolock"><option value="1">1 minute</option><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="60">1 hour</option><option value="0">Only when I tap Lock</option></select></label><p class="notice">The readable key exists only in memory while the vault is unlocked.</p></article><article class="card"><h3>Face ID / Touch ID</h3><p>${store.biometric?'Biometric unlock is enabled on this device.':'Enable device biometric unlock where Safari supports passkey PRF encryption.'}</p><div class="button-row">${store.biometric?'<button class="btn outline danger" id="vault-disable-biometric" type="button">Disable on this device</button>':'<button class="btn" id="vault-enable-biometric" type="button">Enable biometric unlock</button>'}</div><p class="notice">This never receives your face or fingerprint. Apple performs device verification.</p></article><article class="card"><h3>Encrypted backup</h3><p>Download one encrypted file containing the vault ciphertext and key wrappers. The password is still required to open it.</p><div class="button-row"><button class="btn" id="vault-export" type="button">Download encrypted backup</button><button class="btn outline" id="vault-import" type="button">Restore backup</button></div><input id="vault-import-file" type="file" accept="application/json,.ivtcvault" hidden></article><article class="card"><h3>Change password</h3><label>Current password<input id="vault-current-password" type="password" autocomplete="current-password"></label><label>New password<input id="vault-new-password" type="password" autocomplete="new-password"></label><button class="btn" id="vault-change-password" type="button">Change vault password</button><p class="notice" id="vault-security-status"></p></article></div><article class="card danger-zone"><h3>Delete local vault</h3><p>This permanently removes the encrypted vault from this browser. Export a backup first.</p><button class="btn outline danger" id="vault-delete-all" type="button">Delete vault from this device</button></article>`}
function bindUnlocked(){
 qs('#vault-lock').onclick=lock;qs('#vault-add').onclick=()=>editRecord();qs('[data-empty-add]')?.addEventListener('click',()=>editRecord());
 qsa('.vault-nav').forEach(b=>b.onclick=()=>{qsa('.vault-nav').forEach(x=>x.classList.toggle('active',x===b));qsa('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==b.dataset.vaultPanel)});
 qs('#vault-filter')?.addEventListener('change',e=>qsa('.vault-record').forEach(c=>c.hidden=e.target.value!=='all'&&c.dataset.category!==e.target.value));
 qsa('[data-edit-record]').forEach(b=>b.onclick=()=>editRecord(b.dataset.editRecord));qsa('[data-delete-record]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.deleteRecord));
 qs('#vault-add-traveler')?.addEventListener('click',addTraveler);qsa('[data-remove-traveler]').forEach(b=>b.onclick=()=>removeTraveler(b.dataset.removeTraveler));
 const al=qs('#vault-autolock');if(al){al.value=String(data.settings.autoLockMinutes??15);al.onchange=async()=>{data.settings.autoLockMinutes=Number(al.value);recordAudit('Automatic lock changed');await persist()}}
 qs('#vault-export')?.addEventListener('click',exportBackup);qs('#vault-import')?.addEventListener('click',()=>qs('#vault-import-file').click());qs('#vault-import-file')?.addEventListener('change',importBackup);
 qs('#vault-change-password')?.addEventListener('click',changePassword);qs('#vault-enable-biometric')?.addEventListener('click',enableBiometric);qs('#vault-disable-biometric')?.addEventListener('click',disableBiometric);qs('#vault-delete-all')?.addEventListener('click',deleteVault);
 ['pointerdown','keydown','touchstart'].forEach(evt=>document.addEventListener(evt,scheduleLock,{passive:true,once:true}));
}
function editRecord(id=''){
 const r=data.records.find(x=>x.id===id)||{id:'',category:'hotel',title:'',date:'',location:'',confirmation:'',contact:'',notes:''};
 qs('#vault-modal').innerHTML=`<div class="vault-modal-backdrop"><section class="vault-modal card" role="dialog" aria-modal="true" aria-labelledby="vault-record-title"><button class="vault-modal-close" type="button" aria-label="Close">×</button><div class="meta">Encrypted reservation</div><h2 id="vault-record-title">${id?'Edit':'Add'} private record</h2><div class="vault-form-grid"><label>Type<select id="vr-category"><option value="hotel">Hotel</option><option value="flight">Flight</option><option value="cruise">Cruise</option><option value="restaurant">Restaurant</option><option value="transport">Transport</option><option value="other">Other</option></select></label><label>Date<input id="vr-date" type="date" value="${esc(r.date)}"></label><label class="span-2">Name or title<input id="vr-title" value="${esc(r.title)}" placeholder="Dersaadet Hotel Istanbul"></label><label class="span-2">Location<input id="vr-location" value="${esc(r.location)}" placeholder="Address, terminal or meeting point"></label><label>Confirmation number<input id="vr-confirmation" value="${esc(r.confirmation)}"></label><label>Contact<input id="vr-contact" value="${esc(r.contact)}" placeholder="Phone or email"></label><label class="span-2">Private notes<textarea id="vr-notes" rows="5">${esc(r.notes)}</textarea></label></div><div class="button-row"><button class="btn" id="vr-save" type="button">Save encrypted record</button><button class="btn outline" id="vr-cancel" type="button">Cancel</button></div><p class="vault-error" id="vr-error"></p></section></div>`;
 qs('#vr-category').value=r.category;const close=()=>qs('#vault-modal').innerHTML='';qs('.vault-modal-close').onclick=close;qs('#vr-cancel').onclick=close;
 qs('#vr-save').onclick=async()=>{const title=qs('#vr-title').value.trim();if(!title){qs('#vr-error').textContent='Enter a name or title.';return}const out={id:id||crypto.randomUUID(),category:qs('#vr-category').value,title,date:qs('#vr-date').value,location:qs('#vr-location').value.trim(),confirmation:qs('#vr-confirmation').value.trim(),contact:qs('#vr-contact').value.trim(),notes:qs('#vr-notes').value.trim(),updatedAt:now()};if(id)data.records[data.records.findIndex(x=>x.id===id)]=out;else data.records.push(out);recordAudit(`${id?'Updated':'Added'} ${categoryLabel(out.category)} record`);await persist()};
}
async function deleteRecord(id){const r=data.records.find(x=>x.id===id);if(!r||!confirm(`Delete “${r.title}” from this encrypted vault?`))return;data.records=data.records.filter(x=>x.id!==id);recordAudit('Deleted reservation record');await persist()}
async function addTraveler(){const name=prompt('Traveler name');if(!name?.trim())return;const role=prompt('Role: Editor or Viewer','Editor');data.travelers.push({id:crypto.randomUUID(),name:name.trim(),role:/viewer/i.test(role||'')?'Viewer':'Editor'});recordAudit('Added traveler profile');await persist();qs('[data-vault-panel="travelers"]')?.click()}
async function removeTraveler(id){const t=data.travelers.find(x=>x.id===id);if(!t||!confirm(`Remove ${t.name} from the traveler list?`))return;data.travelers=data.travelers.filter(x=>x.id!==id);recordAudit('Removed traveler profile');await persist();qs('[data-vault-panel="travelers"]')?.click()}
function exportBackup(){const store=loadStore();const blob=new Blob([JSON.stringify({...store,exportedAt:now()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Istanbul-Viking-Travel-Vault-${new Date().toISOString().slice(0,10)}.ivtcvault`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);recordAudit('Encrypted backup exported');persist()}
async function importBackup(e){const file=e.target.files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(obj.format!=='ivtc-encrypted-vault'||!obj.passwordWrap||!obj.vault)throw new Error();if(!confirm('Replace the encrypted vault on this device with this backup?'))return;saveStore(obj);masterKey=null;data=null;renderLocked('Encrypted backup restored. Enter its vault password to unlock.')}catch{alert('That file is not a valid Travel Vault backup.')}finally{e.target.value=''}}
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
async function unlockBiometric(){try{const store=loadStore(),b=store.biometric,assertion=await navigator.credentials.get({publicKey:{challenge:random(32),rpId:location.hostname,allowCredentials:[{type:'public-key',id:unb64(b.credentialId)}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:unb64(b.prfSalt)}}}}});const out=assertion.getClientExtensionResults().prf?.results?.first;if(!out)throw new Error();const bioKey=await importAes(new Uint8Array(out)),raw=await open(bioKey,b.masterWrap,'ivtc-biometric-master-v1',true);masterKey=await importAes(raw);data=await open(masterKey,store.vault,'ivtc-vault-data-v1');recordAudit('Vault unlocked biometrically');await persist()}catch{renderLocked('Biometric unlock was unavailable or canceled. Use the vault password.')}}
async function disableBiometric(){if(!confirm('Disable biometric unlock for this device?'))return;const store=loadStore();delete store.biometric;saveStore(store);recordAudit('Biometric unlock disabled');await persist();qs('[data-vault-panel="security"]')?.click()}
function deleteVault(){if(!confirm('Permanently delete the encrypted Travel Vault from this browser?'))return;if(!confirm('This cannot be undone without an exported backup. Delete it now?'))return;localStorage.removeItem(STORAGE);masterKey=null;data=null;renderSetup('The local vault was deleted.')}
window.addEventListener('pagehide',()=>{masterKey=null;data=null});document.addEventListener('visibilitychange',()=>{if(document.hidden&&data?.settings?.autoLockMinutes===1)scheduleLock()});
loadStore()?renderLocked():renderSetup();
})();
