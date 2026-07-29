# v6.5.1 — Map Destination Menu Restore

Tapping a supported map or its Expand button now opens Map Explorer with the complete destination list and information panel. Stale v6.4.0 diagnostic asset labels are corrected.

# Istanbul–Viking Travel Companion v6.5.1

Map Information Popups repair. Tapping a numbered marker opens a location-information card rather than navigating immediately or merely grabbing the map.

# Istanbul–Viking Travel Companion v6.4.4

Milestone 2 begins with Firebase Authentication: sign in, sign out, session persistence, a current-user indicator, and an account profile card.

Run `npm test` before deployment.

## v6.5.1 — Cloud Hotel Reservations
Open `reservations.html` after signing in and selecting a trip. The first load imports the known 2026 lodging plan into the active trip; review each imported record against the actual booking confirmation.

## v6.5.1 activation
After uploading this release, publish the included `firestore.rules` in Firebase Console → Firestore Database → Rules. The new rules permit authorized trip members to read and edit `trips/{tripId}/reservations`.
