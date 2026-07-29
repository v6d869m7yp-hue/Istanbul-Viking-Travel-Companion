(()=>{
'use strict';
window.IVTC=window.IVTC||{};

function activeTrip(){
  return {id:localStorage.getItem('ivtc.activeTripId'),label:localStorage.getItem('ivtc.activeTripLabel')};
}
function message(error){
  const code=error?.code||'';
  if(code.includes('storage/unauthorized'))return 'Firebase Storage rejected the test. Publish the included storage.rules file, then retry.';
  if(code.includes('storage/bucket-not-found'))return 'Firebase Storage is not enabled for this project. Open Firebase Console → Storage and complete the initial setup.';
  if(code.includes('storage/object-not-found'))return 'The temporary test object could not be read back.';
  return error?.message||String(error);
}
async function inspect(){
  const status=await window.IVTC.firebase.initialize();
  const s=window.IVTC.firebase._state;
  const trip=activeTrip();
  let firestore={ok:false,text:'Not tested'};
  if(status.connected&&trip.id&&s?.db&&s?.api){
    try{
      const snap=await s.api.getDoc(s.api.doc(s.db,'trips',trip.id));
      if(!snap.exists())throw new Error('The selected trip document does not exist.');
      const data=snap.data();
      const member=Array.isArray(data.memberUids)&&data.memberUids.includes(s.user.uid);
      firestore={ok:member,text:member?'Active trip is readable and membership is confirmed.':'Trip is readable, but this user is not listed in memberUids.'};
    }catch(error){firestore={ok:false,text:message(error)};}
  }
  return {
    config:{ok:status.configured,text:status.configured?'Firebase browser configuration loaded.':status.error||'Firebase is not configured.'},
    auth:{ok:status.connected,text:status.connected?`Signed in as ${status.user?.email||status.user?.uid}.`:'Sign in on Trip Cloud Connection first.'},
    trip:{ok:!!trip.id,text:trip.id?`${trip.label||'Active trip'} (${trip.id})`:'Choose an active trip in My Trips.'},
    firestore,
    storage:{ok:!!s?.storage,text:s?.storage?'Storage SDK initialized; rules test has not run yet.':'Storage SDK did not initialize.'}
  };
}
async function testStorage(){
  const status=await window.IVTC.firebase.initialize();
  const s=window.IVTC.firebase._state;
  const trip=activeTrip();
  if(!status.connected)throw new Error('Sign in to Firebase first.');
  if(!trip.id)throw new Error('Choose an active trip in My Trips first.');
  if(!s?.storage||!s?.api)throw new Error('Firebase Storage did not initialize.');
  const name=`probe-${Date.now()}-${crypto.randomUUID()}.bin`;
  const path=`trips/${trip.id}/readiness/${s.user.uid}/${name}`;
  const ref=s.api.ref(s.storage,path);
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  try{
    await s.api.uploadBytes(ref,bytes,{contentType:'application/octet-stream',customMetadata:{purpose:'ivtc-backend-readiness',release:'6.8.3'}});
    const meta=await s.api.getMetadata(ref);
    await s.api.deleteObject(ref);
    return {ok:true,text:`Upload, metadata read, and cleanup passed (${meta.size} bytes). No Vault data was uploaded.`,path};
  }catch(error){
    try{await s.api.deleteObject(ref);}catch{}
    return {ok:false,text:message(error),code:error?.code||null,path};
  }
}
window.IVTC.backendReadiness=Object.freeze({inspect,testStorage});
})();
