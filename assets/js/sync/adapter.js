/** Backend-neutral synchronization contract. No private data leaves the device in this release. */
window.IVTC = window.IVTC || {};
class LocalOnlySyncAdapter {
  constructor() { this.mode = 'local-only'; }
  async status() { return { mode: this.mode, connected: false, pending: 0 }; }
  async pushEncryptedChanges() { throw new Error('Secure cloud synchronization is not configured.'); }
  async pullEncryptedChanges() { return []; }
  async revokeDevice() { throw new Error('Remote device revocation requires the secure backend.'); }
}
window.IVTC.sync = Object.freeze({ adapter: new LocalOnlySyncAdapter(), LocalOnlySyncAdapter });
