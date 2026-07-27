# v2 Architecture

The v2 application avoids page-by-page version drift by rendering the header, navigation, footer, version label, dashboard, timeline, Istanbul day cards, and excursion table from shared JavaScript and JSON data.

Future releases should update `data/trip.json` for the release version and regenerate the service-worker asset list.
