/** Trip-centered synchronization facade. Public trip records use Firestore; Vault payloads remain encrypted. */
window.IVTC=window.IVTC||{};
class TripSyncAdapter{
 constructor(){this.mode='trip-centered';}
 async status(){if(window.IVTC.tripSync)return window.IVTC.tripSync.status();return {mode:this.mode,connected:false,pending:0};}
 async flush(){if(!window.IVTC.tripSync)throw new Error('Trip sync model is not loaded.');return window.IVTC.tripSync.flush();}
 async pushEncryptedChanges(){throw new Error('Encrypted Vault synchronization is handled by the Travel Vault sync engine.');}
 async pullEncryptedChanges(){return [];}
 async revokeDevice(){throw new Error('Remote device revocation is planned for a later security release.');}
}
window.IVTC.sync=Object.freeze({adapter:new TripSyncAdapter(),TripSyncAdapter});