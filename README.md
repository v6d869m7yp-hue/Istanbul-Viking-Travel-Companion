# Istanbul–Viking Travel Companion v6.5.4

## Open reservations

1. Deploy this release to GitHub Pages.
2. Sign in.
3. Open **My Trips**.
4. Tap **Reservations** on the trip you want to use.

The first successful opening creates the known 2026 lodging records under:

`trips/{tripId}/reservations/{reservationId}`

Your current Firestore rules already cover this subcollection. No rules change is required.
