# Developer Guide

## Main areas
- `assets/js/app.js`: shared shell, diagnostics, service worker, general pages
- `assets/js/map-explorer.js`: interactive map behavior
- `assets/js/vault.js`: encrypted local Vault, documents, backup and restore
- `assets/js/backend/`: Firebase authentication, trips, and reservations
- `service-worker.js`: offline cache and update lifecycle
- `data/build-info.json`: authoritative build metadata

## Safety rules
- Do not change the Vault data format during unrelated work.
- Do not modify Maps while changing Reservations or Diagnostics.
- Keep Firebase rules and client code versioned together.
- Never claim a feature works until it is demonstrated in the deployed app.
