(()=>{
'use strict';
window.IVTC=window.IVTC||{};
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
async function encryptConnectivityPayload(value){
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(value)));
 return {algorithm:'AES-256-GCM',iv:b64(iv),ciphertext:b64(cipher),testOnly:true};
}
function requireState(){const s=window.IVTC.firebase?._state;if(!s?.user||!s.db||!s.api)throw new Error('Sign in first.');return s;}
async function createTrip({label='Istanbul–Viking–Venice 2026'}={}){
 const s=requireState(),tripRef=s.api.doc(s.api.collection(s.db,'trips'));
 const payload=await encryptConnectivityPayload({message:'Encrypted connection test',createdAt:new Date().toISOString()});
 const batch=s.api.writeBatch(s.db);
 batch.set(tripRef,{schema:1,label,ownerUid:s.user.uid,memberUids:[s.user.uid],roles:{[s.user.uid]:'owner'},createdAt:s.api.serverTimestamp(),updatedAt:s.api.serverTimestamp(),status:'active'});
 batch.set(s.api.doc(tripRef,'envelopes','connection-test'),{ciphertext:payload.ciphertext,iv:payload.iv,algorithm:payload.algorithm,testOnly:true,updatedAt:s.api.serverTimestamp(),updatedBy:s.user.uid});
 await batch.commit();return tripRef.id;
}
async function listTrips(){
 const s=requireState();
 const q=s.api.query(s.api.collection(s.db,'trips'),s.api.where('memberUids','array-contains',s.user.uid));
 const snap=await s.api.getDocs(q);return snap.docs.map(d=>({id:d.id,...d.data()}));
}
window.IVTC.tripCloud=Object.freeze({createTrip,listTrips});
})();
