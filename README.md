# CoolRoute · Presentation UI Add-on

This is a **design-only add-on** for the existing CoolRoute hackathon prototype. It simplifies the **Home**, **Find a Route**, **Route Results**, **Compare Routes**, **Route Details**, and **Demo Navigation** screens. It follows the navy/blue/green color palette from your supplied design. The first two intro/splash designs are not replaced.

## Windows installation

1. Extract the ZIP and put the `coolroute-presentation-addon` folder inside your existing `coolroute-website` folder (alongside index.html).
2. Open PowerShell, then run:

```powershell
cd "C:\Users\ASUS1\Downloads\CoolRoute_Website_Source\coolroute-website"
python .\coolroute-presentation-addon\install_presentation.py .
python -m http.server 8000
```

3. Open http://localhost:8000/ and press Ctrl+F5 once if you still see the old design.

If port 8000 is already in use, stop the old local server with Ctrl+C first.

## What is (and isn't) changed

The installer creates an `index.html.before-presentation.bak`, copies `presentation-ui.js` and `presentation-theme.css` into your project, and adds two references to `index.html`. It **does not overwrite** `app.js`, `styles.css`, `live-map.js`, `live-map.css`, or any data/asset files. Running it twice does not duplicate the references.

The Dortmund map data and climate sensors stay as they were. Example weather (32 °C), three demo routes, shade percentages, times, distances, and guidance are still **illustrative**. This is a presentation prototype, **not** a verified live navigation product. The other existing screens (Ideas, Profile, Tips) remain available; their UI is only lightly rethemed.

## Remove the add-on

To revert, restore `index.html.before-presentation.bak` as `index.html`, and optionally delete `presentation-ui.js` and `presentation-theme.css`. Your other app files were not changed.
