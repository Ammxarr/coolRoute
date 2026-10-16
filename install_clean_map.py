"""Install clean map-first UI into the existing five-layer CoolRoute website.

Usage from coolroute-website root:
    python .\\coolroute-clean-map-addon\\install_clean_map.py .
"""
from pathlib import Path
import shutil
import sys

BASE = Path(__file__).resolve().parent
CSS = ("presentation-theme.css", "clean-map.css")
JS = ("presentation-ui.js", "clean-map.js")
NEEDED = ("index.html", "app.js", "styles.css", "live-map.js", "live-map.css")


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
    missing = [p for p in NEEDED if not (root / p).is_file()]
    if missing:
        raise SystemExit(f"Not a CoolRoute project directory: missing {', '.join(missing)}")
    html_file = root / 'index.html'
    html = html_file.read_text(encoding='utf-8')
    if '</head>' not in html or '<script src="app.js"></script>' not in html:
        raise SystemExit('Unsupported index.html. Nothing was modified.')
    app = (root / 'app.js').read_text(encoding='utf-8')
    if not all(x in app for x in ('function screenResults()', 'function screenNavigation()', 'function render()')):
        raise SystemExit('Unsupported CoolRoute app.js. Nothing was modified.')
    for name in (*CSS, *JS):
        if not (BASE / name).is_file():
            raise SystemExit(f'Add-on is incomplete: {name}')
    shutil.copy2(html_file, root / 'index.html.before-clean-map.bak')
    for name in (*CSS, *JS):
        dest = root / name
        if dest.is_file():
            shutil.copy2(dest, root / (name + '.before-clean-map.bak'))
        shutil.copy2(BASE / name, dest)
    for name in CSS:
        tag = f'<link rel="stylesheet" href="{name}" />'
        if tag not in html:
            html = html.replace('</head>', '  ' + tag + '\n</head>', 1)
    for name in JS:
        tag = f'<script src="{name}"></script>'
        if tag not in html:
            anchor = '<script src="app.js"></script>' if name == JS[0] else '<script src="presentation-ui.js"></script>'
            html = html.replace(anchor, anchor + '\n  ' + tag, 1)
    # Always enforce source order (the prior presentation might have old tags).
    for name in JS:
        html = html.replace(f'<script src="{name}"></script>', '')
    html = html.replace('<script src="app.js"></script>',
                        '<script src="app.js"></script>\n  <script src="presentation-ui.js"></script>\n  <script src="clean-map.js"></script>', 1)
    html_file.write_text(html, encoding='utf-8')
    print('Installed clean map-first CoolRoute interface in:', root)
    print('Preserved app.js and existing Dortmund Leaflet map layers.')
    print('Launch python -m http.server 8000, then visit http://localhost:8000/?v=clean-map')


if __name__ == '__main__':
    main()
