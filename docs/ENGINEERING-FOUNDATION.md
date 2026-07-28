# Engineering Foundation — v5.2.0

This release freezes visible behavior while establishing a maintainable path to the secure backend.

## Runtime boundaries

- `assets/js/app.js`: public guide shell and general interface.
- `assets/js/map-explorer.js`: interactive map behavior.
- `assets/js/vault.js`: local end-to-end encrypted vault.
- `assets/js/core/runtime.js`: shared path, JSON, and event helpers for incremental migration.
- `assets/js/sync/adapter.js`: backend-neutral sync contract; intentionally local-only until secure credentials and server rules are configured.

## Security boundary

Readable vault content remains on the user's device. Future adapters may upload only ciphertext, encrypted key envelopes, and minimal synchronization metadata.

## Release gate

Run `npm test`. A build fails if JavaScript syntax is invalid, required JSON cannot be parsed, an internal file reference is missing, or the service-worker cache references an absent file.
