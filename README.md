# CoolRoute Dortmund — Interactive Web Prototype

This is a front-end-only, clickable product prototype inspired by the supplied CoolRoute mobile-screen reference.

## Start

Option 1: Open `CoolRoute_Interactive.html` directly in any modern browser. It is a standalone file with all artwork, CSS, and JavaScript embedded.

Option 2: Open `index.html` with the `styles.css`, `app.js`, and `assets/` folder kept together. A local web server works well (`python -m http.server 8000`).

## Interactive features

- Home, splash/onboarding, map, route planner, route alternatives, comparison and details.
- Origin/destination presets, travel-mode and routing-preference controls, and comfort slider.
- An illustrative three-route map, map zoom buttons, and map-layer toggles.
- Step-by-step demo navigation with next/previous controls.
- Support/undo support for suggested city improvements (stored in browser localStorage).
- Tips, profile, and settings.
- Responsive design: centered smartphone on desktop, full mobile viewport on smaller screens.

## Important limitations

**This is a prototype, not a real routing or navigation service.** Road geometries, comfort/shade percentages, metrics, infrastructure counts, weather, and accessibility are illustrative. The map is a stylized SVG illustration, not a georeferenced street map. Do not rely on it for physical travel or heat-safety advice. No API keys, sign-in, external JavaScript libraries, or network access are required.

## To make it data-driven

Replace the demo map with MapLibre GL JS or Leaflet using real map tiles; import Dortmund GeoJSON records for Schattenplätze, Baumkataster, Trinkwasserbrunnen and Kühle Innenräume; use OpenStreetMap with an appropriate pedestrian route engine; calculate real edge weights and accessibility constraints on a backend (e.g., Python + OSMnx + NetworkX). Verify coverage, licensing, and accuracy. Keep real vs inferred metrics separate.
