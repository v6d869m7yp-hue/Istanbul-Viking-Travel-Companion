(()=>{
'use strict';
window.IVTC=window.IVTC||{};
class FirebaseCiphertextSyncAdapter{
 constructor(client=window.IVTC.firebase){this.client=client;this.mode='firebase-ciphertext-preview';}
 async status(){const s=this.client?.status?.()||{};return {mode:this.mode,configured:!!s.configured,connected:!!s.connected,user:s.user||null,error:s.error||null};}
 async pushEncryptedEnvelope({tripId,envelopeId,ciphertext,metadata={}}){
  const s=this.client?._state;if(!s?.user||!s.db)throw new Error('Sign in before synchronizing.');
  if(!tripId||!envelopeId||!ciphertext)throw new Error('tripId, envelopeId, and ciphertext are required.');
  const ref=s.api.doc(s.db,'trips',tripId,'envelopes',envelopeId);
  await s.api.setDoc(ref,{ciphertext,metadata,updatedAt:s.api.serverTimestamp(),updatedBy:s.user.uid},{merge:true});
 }
 async pullEncryptedEnvelope({tripId,envelopeId}){
  const s=this.client?._state;if(!s?.user||!s.db)throw new Error('Sign in before synchronizing.');
  const snap=await s.api.getDoc(s.api.doc(s.db,'trips',tripId,'envelopes',envelopeId));
  return snap.exists()?snap.data():null;
 }
 async revokeDevice(){throw new Error('Device revocation requires the invitation and key-rotation Cloud Function milestone.');}
}
window.IVTC.FirebaseCiphertextSyncAdapter=FirebaseCiphertextSyncAdapter;
})();
