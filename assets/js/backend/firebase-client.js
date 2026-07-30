(()=>{
'use strict';
window.IVTC=window.IVTC||{};
if(window.IVTC.firebase)return;
const SDK_VERSION='12.1.0';
const state={configured:false,connected:false,user:null,error:null,app:null,auth:null,db:null,storage:null,api:null,initializing:null,authReady:false,firestoreMode:null};
const config=window.IVTC_FIREBASE_CONFIG||{};
function userView(user){
 if(!user)return null;
 return {
  uid:user.uid,
  email:user.email||null,
  displayName:user.displayName||null,
  emailVerified:!!user.emailVerified,
  providerId:user.providerData?.[0]?.providerId||'password',
  creationTime:user.metadata?.creationTime||null,
  lastSignInTime:user.metadata?.lastSignInTime||null
 };
}
function publicState(){return {configured:state.configured,connected:state.connected,user:userView(state.user),error:state.error,authReady:state.authReady,firestoreMode:state.firestoreMode};}
function emit(){window.dispatchEvent(new CustomEvent('ivtc:backend-state',{detail:publicState()}));}
function isSafari(){
 const ua=navigator.userAgent||'';
 return /Safari/i.test(ua)&&!/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Android/i.test(ua);
}
async function initialize(){
 if(state.initializing)return state.initializing;
 state.initializing=(async()=>{
  if(!config.enabled){state.error='Firebase configuration is disabled.';state.authReady=true;emit();return publicState();}
  const required=['apiKey','authDomain','projectId','messagingSenderId','appId'];
  if(required.some(k=>!config[k]||String(config[k]).includes('REPLACE_ME'))){state.error='Firebase configuration contains placeholders.';state.authReady=true;emit();return publicState();}
  try{
   const appSdk=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`);
   const authSdk=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`);
   const fsSdk=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`);
   const storageSdk=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-storage.js`);
   state.app=appSdk.getApps().length?appSdk.getApp():appSdk.initializeApp(config);
   state.auth=authSdk.getAuth(state.app);

   // Safari Private Browsing and some VPN/proxy combinations can leave the
   // IndexedDB-backed persistent cache or WebChannel transport pending forever.
   // Use the documented memory cache and long-polling auto detection so reads
   // always settle. The Travel Companion already stores its offline trip shadow
   // and encrypted vault separately, so Firestore disk persistence is optional.
   const firestoreSettings={
    localCache:fsSdk.memoryLocalCache(),
    experimentalAutoDetectLongPolling:true
   };
   if(isSafari()){
    // Safari is the environment where the profiler demonstrated the stall.
    // Forced long polling avoids WebChannel buffering by private/VPN proxies.
    firestoreSettings.experimentalForceLongPolling=true;
    delete firestoreSettings.experimentalAutoDetectLongPolling;
   }
   try{
    state.db=fsSdk.initializeFirestore(state.app,firestoreSettings);
    state.firestoreMode=isSafari()?'memory cache + forced long polling':'memory cache + auto-detected long polling';
   }catch(error){
    // initializeFirestore throws when another module already initialized this
    // app. Reuse that exact singleton rather than creating a second instance.
    state.db=fsSdk.getFirestore(state.app);
    state.firestoreMode='existing Firestore singleton';
   }
   state.storage=storageSdk.getStorage(state.app);
   state.api={...authSdk,...fsSdk,...storageSdk};state.configured=true;state.error=null;

   await new Promise(resolve=>{
    let settled=false;
    const finish=(user)=>{
     state.user=user||null;
     state.connected=!!user;
     state.authReady=true;
     emit();
     if(!settled){settled=true;resolve();}
    };
    authSdk.onAuthStateChanged(state.auth,finish,error=>{
     state.error=error?.message||String(error);
     finish(null);
    });
   });
   return publicState();
  }catch(error){state.error=error?.message||String(error);state.authReady=true;emit();return publicState();}
 })();return state.initializing;
}
async function signIn(email,password,remember=true){
 await initialize();
 if(!state.auth)throw new Error(state.error||'Firebase is not configured.');
 await state.api.setPersistence(state.auth,remember?state.api.browserLocalPersistence:state.api.browserSessionPersistence);
 return state.api.signInWithEmailAndPassword(state.auth,email,password);
}
async function signOutUser(){if(state.auth)await state.api.signOut(state.auth);}
async function sendPasswordReset(email){
 await initialize();
 const target=email||state.user?.email;
 if(!target)throw new Error('Enter your email address first.');
 return state.api.sendPasswordResetEmail(state.auth,target);
}
async function refreshUser(){if(state.user){await state.api.reload(state.user);state.user=state.auth.currentUser;emit();}return publicState();}
window.IVTC.firebase=Object.freeze({initialize,status:publicState,signIn,signOut:signOutUser,sendPasswordReset,refreshUser,_state:state});
})();
