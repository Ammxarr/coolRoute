#!/usr/bin/env python3
"""Add the Leaflet Explore map to an existing Ammxarr/coolRoute checkout.

Usage: python install_map.py /path/to/coolRoute
Can be re-run safely. Backups app.js.bak and index.html.bak are created.
"""
from pathlib import Path
import re
import shutil
import sys

src = Path(__file__).resolve().parent
dest = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else Path.cwd()
index_path = dest / 'index.html'
app_path = dest / 'app.js'
if not index_path.is_file() or not app_path.is_file():
    raise SystemExit(f'ERROR: {dest} must contain the original index.html and app.js')

screen = '''function screenExplore(){return `<div class="page with-bottom">${head('Explore the map')}
  <div class="cr-map-shell">
    <div id="cr-live-map" class="cr-live-map" role="region" aria-label="Interactive Dortmund map"></div>
    <div class="cr-map-layer-panel">
      <div class="cr-map-layer-title">Dortmund Open Data</div>
      <div class="cr-layer-controls" id="cr-layer-controls" aria-label="Map data layers">
        <button type="button" class="cr-layer-toggle" data-cr-layer="trees" aria-pressed="true">🌳 Trees</button>
        <button type="button" class="cr-layer-toggle" data-cr-layer="shade" aria-pressed="true">☂ Shade</button>
        <button type="button" class="cr-layer-toggle" data-cr-layer="water" aria-pressed="true">💧 Water</button>
        <button type="button" class="cr-layer-toggle" data-cr-layer="indoor" aria-pressed="true">⌂ Cool indoors</button>
      </div>
    </div>
    <div id="cr-map-status" class="cr-map-status" role="status" aria-live="polite">Loading Dortmund places…</div>
  </div>${bottom('explore')}</div>`}
'''

index = index_path.read_text(encoding='utf-8')
app = app_path.read_text(encoding='utf-8')

if 'live-map.css' not in index:
    index = index.replace('  <link rel="stylesheet" href="styles.css" />',
        '  <link rel="stylesheet" href="styles.css" />\n'
        '  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />\n'
        '  <link rel="stylesheet" href="live-map.css" />')
if 'live-map.js' not in index:
    tag = '<script src="app.js"></script>'
    assert tag in index, 'Could not find app.js script tag in index.html'
    index = index.replace(tag,
        '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>\n'
        '  <script src="live-map.js"></script>\n  ' + tag)

if 'id="cr-live-map"' not in app:
    pattern = r'function screenExplore\(\)\{.*?(?=\nfunction screenIdeas\(\))'
    app, number = re.subn(pattern, lambda _: screen.rstrip('\n'), app, count=1, flags=re.S)
    assert number == 1, 'Could not find the original screenExplore() function in app.js'

# render() is a single line in the public CoolRoute repository.
if 'window.CoolRouteMap?.mount()' not in app:
    pattern = r'^function render\(\)\{[^\n]*\}$'
    found = re.search(pattern, app, flags=re.M)
    assert found, 'Could not find the original single-line render() function in app.js'
    original = found.group(0)
    changed = original.replace('function render(){', 'function render(){window.CoolRouteMap?.unmount();', 1)
    changed = changed[:-1] + ";if(state.screen==='explore')window.CoolRouteMap?.mount();}"
    app = app[:found.start()] + changed + app[found.end():]

if index_path.read_text(encoding='utf-8') != index:
    shutil.copy2(index_path, dest / 'index.html.bak')
    index_path.write_text(index, encoding='utf-8')
if app_path.read_text(encoding='utf-8') != app:
    shutil.copy2(app_path, dest / 'app.js.bak')
    app_path.write_text(app, encoding='utf-8')
for name in ('live-map.css', 'live-map.js'):
    shutil.copy2(src / name, dest / name)
print(f'Installed live Dortmund map in {dest}')
print('Run: python -m http.server 8000')
print('Then open http://localhost:8000 and tap Map in the bottom navigation.')
