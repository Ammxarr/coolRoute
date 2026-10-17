CoolRoute Dortmund
The navigation app that knows where the shade is.

Cooler paths for a better Dortmund.

CoolRoute Dortmund is a heat-aware, accessibility-conscious walking-route concept created for the DO-DATA-HACKATHON 2026 — Adesso Challenge (16–17 October 2026). It explores a simple idea: the best walking route is not always the shortest one. Depending on the person and the conditions, a better route may offer more shade, places to rest, drinking water, or other useful facilities along the way.

This repository currently contains a clickable front-end prototype for presenting and testing the product experience. The wider project vision is to connect Dortmund's open data with a pedestrian-routing engine and explain why a route is recommended.
What you can explore in the prototype
- Onboarding and home screens to introduce the CoolRoute experience.
- Route planning with origin and destination presets, travel-mode controls, route preferences, and a comfort slider.
- Three illustrative route alternatives, plus comparison and route-detail views.
- Map interactions, including zoom controls and map-layer toggles.
- Step-by-step demo navigation with previous/next controls.
- Profile and settings concepts for personal preferences, display options, alerts, and language.
- Community improvement ideas where users can support or undo support for suggested improvements; demo state is stored in browser localStorage.
- Responsive layout with a phone-style presentation on desktop and a mobile-sized view on smaller screens.

The pitch envisions personalising routes around needs such as heat sensitivity, walking pace, mobility aids, strollers, rest frequency, drinking water, toilets, benches with backrests, cool indoor spaces, dogs or children, and public transport. The prototype demonstrates parts of this experience; not every preference is connected to a verified routing constraint.
Run the prototype

Option 1: Open the standalone file
Open CoolRoute_Interactive.html in a modern browser. The standalone version embeds its artwork, CSS, and JavaScript.

Option 2: Run the multi-file version
Keep index.html, styles.css, app.js, and the assets/ directory together, then start a local server in the project directory:
python -m http.server 8000
Open http://localhost:8000 in your browser.
No sign-in or API key is required for the standalone demo. The prototype is designed to run without network access.
Product concept: how CoolRoute is intended to work
The intended data-driven experience brings together three route considerations:
1. Heat and shade — consider exposure to direct sun and nearby shaded places, trees, and climate-sensor readings where suitable data is available.
2. Accessibility and mobility preferences — account for a person's needs where the footpath data and routing engine can reliably support them.
3. Rest and everyday facilities — surface relevant benches or shaded rest spots, drinking fountains, cool indoor spaces, toilets, and public-transport stops along or near a route.
The product should explain why a route is recommended rather than showing an unexplained score. It should also distinguish verified information from estimates and unknown data.
Data sources in the pitch

The project presentation identifies the following potential source groups from the City of Dortmund's open-data portal and OpenStreetMap:
Source	Intended use
Tree register (Baumkataster)	Help estimate where shade may be available along a route
Shaded places (Schattenplätze)	Identify shaded places to pause or rest
Climate-sensor locations and readings	Add local context from sensor observations where available
Drinking-water fountains	Find water stops along or near a route
Cool indoor spaces	Identify possible places to cool down
Public toilets and accessible public toilets	Find practical stops and accessible facilities where recorded
Public-transport stops	Explore walking routes that connect with bus or tram services
Playgrounds	Help identify useful stops for families
OpenStreetMap footpaths	Provide pedestrian-network and place information
Valhalla	Intended pedestrian-routing engine for network-based route calculation


Sources and coverage should be rechecked before any live release. Listing a dataset here describes the project direction; it does not mean every source is already fetched or used by the current static prototype.
- Dortmund Open Data: https://open-data.dortmund.de/
- OpenStreetMap: https://www.openstreetmap.org/
- Valhalla routing engine: https://github.com/valhalla/valhalla
  
Accessibility and privacy principles
CoolRoute aims to support people with different mobility needs and preferences, including wheelchair users, people using a rollator, older adults, and people walking with a stroller. Accessibility data is often incomplete, so unknown information must be shown as unknown rather than interpreted as accessible. Stairs, kerbs, cobblestones, slopes, surfaces, crossings, and public-transport accessibility should only be treated as routing constraints when trustworthy data and supported logic are available.
The pitch describes profile preferences as stored on the device. In this front-end prototype, profile or demo state may be held in browser storage; this is not a secure account system. Avoid entering sensitive personal or health information into a public demo. Any production version would need a dedicated privacy and security review.

Important limitations
- This repository is a presentation prototype, not a verified live navigation service.
- The illustrated map and route lines are not georeferenced street geometry and must not be used for real-world navigation.
- Route lengths, comfort or shade scores, facility counts, weather values, and other metrics shown by the demo are illustrative unless a screen explicitly indicates otherwise.
- The demo does not establish that a route will be cooler, accessible, safe, or suitable for a dog, stroller, or wheelchair.
- The pitch describes a future data-driven approach. Heat scores are experimental estimates; tree locations alone do not prove that a place is shaded at a particular time of day.
- Accessibility coverage may be incomplete. Missing information must not be presented as proof that a route or facility is accessible.
- Community suggestions in the prototype are demo interactions stored locally in the browser; they are not submitted to Dortmund or a shared backend.
- Do not rely on this demo for travel, medical, or heat-safety decisions.

Next steps toward a data-driven version
1. Replace the illustrative map with a real map using an appropriate library and licensed map tiles.
2. Import and validate relevant Dortmund open-data records and OpenStreetMap pedestrian-network data.
3. Connect a pedestrian router such as Valhalla and calculate route alternatives on actual network geometry.
4. Build and document an explainable scoring method for heat exposure, shade, rest facilities, and supported accessibility constraints.
5. Model uncertainty honestly: show sources, freshness, coverage, and unknown values instead of inventing certainty.
6. Connect community reports to a moderated backend and validate reports before treating them as verified infrastructure data.
7. Test the experience with people with different accessibility needs and with local community organisations.

Team
- Shirin — Concept & Story
- Ammar — Frontend & Data
- Preyash — Backend & Data

Acknowledgements
Created for the DO-DATA-HACKATHON 2026 Adesso Challenge. Where OpenStreetMap data is used in a future or connected version, attribution should follow the applicable OpenStreetMap requirements: © OpenStreetMap contributors.
CoolRoute Dortmund — Your city. Your comfort. Your way.
