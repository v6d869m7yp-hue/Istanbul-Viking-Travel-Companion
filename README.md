# v6.2.2 Diagnostics Startup Fix

Diagnostics now initializes before the shared app shell and service-worker startup, so its buttons remain functional even when Safari stalls during another startup operation.

# Istanbul–Viking Travel Companion v6.1.0

Offline-first public travel guide plus a local encrypted Travel Vault. This developer preview adds a disabled, ciphertext-only Firebase backend foundation. See `backend-setup.html` and `docs/V6-BACKEND-BOOTSTRAP.md`.

Run `npm test` before deployment.
