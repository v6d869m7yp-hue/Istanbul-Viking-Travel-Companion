# v6 Backend Bootstrap

This release prepares a deny-by-default Firebase development environment while leaving it disabled.

## Safe first test

1. Create a new Firebase project owned by the traveler.
2. Register a Web app and copy its public configuration into `assets/js/backend/firebase-config.js`.
3. Enable Email/Password Authentication for development.
4. Create Firestore and Storage.
5. Install the Firebase CLI locally, log in, copy `.firebaserc.example` to `.firebaserc`, and replace the project ID.
6. Run `firebase deploy --only firestore:rules,firestore:indexes,storage`.
7. Open `backend-setup.html` from the staging site and confirm configuration loads.
8. Use only invented sample records until account invitations, key envelopes, key rotation, revocation, and recovery are complete.

## What remains local

The v5 vault remains local and unchanged. The Firebase adapter is not selected as the live adapter and cannot silently upload current vault content.
