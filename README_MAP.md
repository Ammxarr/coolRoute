# CoolRoute: interactive Dortmund Open Data map

This is a drop-in replacement for the **Explore the map** screen of https://github.com/Ammxarr/coolRoute. Your other pages, example route statistics and SVG maps remain unchanged.

## Install

1. Download or clone your original coolRoute repository. Confirm `index.html` and `app.js` are at its root.
2. Extract this ZIP to any folder.
3. In a terminal, run:

   ```bash
   python /path/to/extracted/install_map.py /path/to/coolRoute
   ```

   If the extracted package is *inside* the coolRoute folder, run `python install_map.py .` from there.

4. From the coolRoute folder, start a local HTTP server:

   ```bash
   python -m http.server 8000
   ```

5. Visit http://localhost:8000 and tap **Map** in the bottom navigation.

The installer updates `index.html` and `app.js` and copies `live-map.js` and `live-map.css`. It creates backups (`*.bak`) and is safe to re-run. No build system, Node.js dependencies, or API key required.

## Functionality

- Pan and zoom around Dortmund on real OpenStreetMap tiles.
- Toggle four dataset layers; tap markers for information cards.
- The map fetches **all records (in pages)** for the smaller datasets: `fb60-schattenplatze`, `trinkwasserbrunnen`, `kuhle-innenraume`.
- The municipal tree dataset (`baumkataster`) is large. Trees load only at zoom 16+ and only within the visible map bounds, using the Opendatasoft `in_bbox` filter and a safety cap of 1,000 markers per view. Zoom further in if you see a cap warning.
- Dataset fetching shows status/error notices rather than inventing sample pins.
- Text coming from dataset records is escaped in popups.

## Technical details

The API URLs follow the Opendatasoft Explore API v2.1 pattern:

`https://open-data.dortmund.de/api/explore/v2.1/catalog/datasets/<DATASET_ID>/records?limit=100&offset=0`

For municipal trees, the client adds an `in_bbox(geo_point_2d, south, west, north, east)` `where` clause. The `geo_point_2d` values are `[latitude, longitude]`. All four municipal datasets expose that field.

**Dependencies:** Leaflet 1.9.4 loaded via unpkg CDN, OpenStreetMap tile service, Dortmund API. An internet connection is required. A local HTTP server is recommended; avoid using `file://` to test.

**Data caveats:** These point records do not establish real-time water availability, current opening, accessibility, actual street shade, thermal comfort, or safe pedestrian routing. The original route-planning section remains a simulation. These datasets are municipal points rather than ready-made pedestrian graph edges. To calculate genuinely cooler routes, incorporate a routing engine and a verified heat/shade model later.

**Credits:** Stadt Dortmund Open Data (Datenlizenz Deutschland – Zero – Version 2.0); © OpenStreetMap contributors for the tile map. Check data terms and tile usage for production deployments.

**Note:** This code was syntax-checked offline against the structure visible in the public GitHub repository. Live API requests and rendering could not be executed from the current environment; test in your browser with DevTools Network open.
