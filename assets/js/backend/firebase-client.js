(()=>{
'use strict';
window.IVTC=window.IVTC||{};
const SDK_VERSION='12.1.0';
const state={configured:false,connected:false,user:null,error:null,app:null,auth:null,db:null,storage:null};
const config=window.IVTC_FIREBASE_CONFIG||{};
function publicState(){return {configured:state.configured,connected:state.connected,user:state.user?{uid:state.user.uid,email:state.user.email||null}:null,error:state.error};}
async function initialize(){
 if(!config.enabled){state.error='Firebase configuration is disabled.';return publicState();}
 const required=['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'];
 if(required.some(k=>!config[k]||String(config[k]).includes('REPLACE_ME'))){state.error='Firebase configuration contains placeholders.';return publicState();}
 try{
  const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut},{initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,doc,getDoc,setDoc,serverTimestamp},{getStorage}]=await Promise.all([
   import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
   import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
   import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`),
   import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-storage.js`)
  ]);
  state.app=initializeApp(config);
  state.auth=getAuth(state.app);
  try{state.db=initializeFirestore(state.app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});}
  catch{const {getFirestore}=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`);state.db=getFirestore(state.app);}
  state.storage=getStorage(state.app);
  state.api={signInWithEmailAndPassword,signOut,collection,doc,getDoc,setDoc,serverTimestamp};
  state.configured=true;
  onAuthStateChanged(state.auth,user=>{state.user=user;state.connected=!!user;window.dispatchEvent(new CustomEvent('ivtc:backend-state',{detail:publicState()}));});
  return publicState();
 }catch(error){state.error=error?.message||String(error);return publicState();}
}
async function signIn(email,password){if(!state.auth)await initialize();if(!state.auth)throw new Error(state.error||'Firebase is not configured.');return state.api.signInWithEmailAndPassword(state.auth,email,password);}
async function signOutUser(){if(state.auth)await state.api.signOut(state.auth);}
window.IVTC.firebase=Object.freeze({initialize,status:publicState,signIn,signOut:signOutUser,_state:state});
})();
