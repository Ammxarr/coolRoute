# CoolRoute — clean map-first route UI

A lightweight visual add-on for the existing CoolRoute hackathon prototype.
Designed to match the **structure and palette** of the supplied reference image: pale map canvas, single blue sample route, floating route controls, white rounded bottom panels, compact blue buttons, and a separate arrival screen.

The existing welcome/onboarding screens, original app data files, climate sensors, and five Dortmund Open Data layers are retained.

## Install on Windows

1. Extract the ZIP archive.
2. Copy the `coolroute-clean-map-addon` folder inside your existing `coolroute-website` directory.
3. In PowerShell:

```powershell
cd "C:\Users\ASUS1\Downloads\CoolRoute_Website_Source\coolroute-website"
python .\coolroute-clean-map-addon\install_clean_map.py .
python -m http.server 8000
```

4. Open `http://localhost:8000/?v=clean-map` and hard-refresh with `Ctrl+F5`.

If a server is already running on port 8000, use its terminal and press `Ctrl+C` before restarting it.

## Demo walkthrough

Home → Find a route → Show routes → select a route → Start demo navigation → Next step (four times) → arrival page → Done.

The route map, travel times, shade percentages and simulated navigation are examples and are **not** a functional navigation service. The Explore Map tab still uses your Dortmund Open Data sources.

## Files added or replaced

- `presentation-ui.js`, `presentation-theme.css` — previous streamlined screen foundation
- `clean-map.js`, `clean-map.css` — new reference-inspired route design
- `index.html` — only extra stylesheet/script tags

Existing core files `app.js`, `styles.css`, `live-map.js`, `live-map.css` remain untouched. Backups are created by the installer. You can remove the new `clean-map.*` references from `index.html` to disable the new route presentation.
