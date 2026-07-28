(()=>{
'use strict';
window.IVTC=window.IVTC||{};
const SDK_VERSION='12.1.0';
const state={configured:false,connected:false,user:null,error:null,app:null,auth:null,db:null,api:null,initializing:null};
const config=window.IVTC_FIREBASE_CONFIG||{};
function publicState(){return {configured:state.configured,connected:state.connected,user:state.user?{uid:state.user.uid,email:state.user.email||null}:null,error:state.error};}
async function initialize(){
 if(state.initializing)return state.initializing;
 state.initializing=(async()=>{
  if(!config.enabled){state.error='Firebase configuration is disabled.';return publicState();}
  const required=['apiKey','authDomain','projectId','messagingSenderId','appId'];
  if(required.some(k=>!config[k]||String(config[k]).includes('REPLACE_ME'))){state.error='Firebase configuration contains placeholders.';return publicState();}
  try{
   const appSdk=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`);
   const authSdk=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`);
   const fsSdk=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`);
   state.app=appSdk.initializeApp(config);
   state.auth=authSdk.getAuth(state.app);
   try{state.db=fsSdk.initializeFirestore(state.app,{localCache:fsSdk.persistentLocalCache({tabManager:fsSdk.persistentMultipleTabManager()})});}
   catch{state.db=fsSdk.getFirestore(state.app);}
   state.api={...authSdk,...fsSdk};state.configured=true;state.error=null;
   authSdk.onAuthStateChanged(state.auth,user=>{state.user=user;state.connected=!!user;window.dispatchEvent(new CustomEvent('ivtc:backend-state',{detail:publicState()}));});
   return publicState();
  }catch(error){state.error=error?.message||String(error);return publicState();}
 })();return state.initializing;
}
async function signIn(email,password,remember=true){await initialize();if(!state.auth)throw new Error(state.error||'Firebase is not configured.');await state.api.setPersistence(state.auth,remember?state.api.browserLocalPersistence:state.api.browserSessionPersistence);return state.api.signInWithEmailAndPassword(state.auth,email,password);}
async function signOutUser(){if(state.auth)await state.api.signOut(state.auth);}
window.IVTC.firebase=Object.freeze({initialize,status:publicState,signIn,signOut:signOutUser,_state:state});
})();
