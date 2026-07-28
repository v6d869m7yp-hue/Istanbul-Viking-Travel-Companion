# Trip-Centric Cloud Model

Firestore stores non-secret authorization metadata and encrypted application envelopes.

- `users/{uid}`: account metadata
- `users/{uid}/trips/{tripId}`: the user’s trip index
- `users/{uid}/devices/{deviceId}`: future device registry
- `trips/{tripId}`: owner, member UIDs, role map, status
- `trips/{tripId}/envelopes/{id}`: client-encrypted records
- `trips/{tripId}/activity/{id}`: minimally disclosed audit metadata

Readable reservations remain encrypted on the client. Invitations, removals, key rotation, and remote revocation require trusted server functions in a later release.
