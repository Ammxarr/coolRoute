"""Install CoolRoute's presentation redesign without replacing app or live-map code.

From your coolroute-website project root:
    python .\\coolroute-presentation-addon\\install_presentation.py .

The installer only edits index.html and copies two new presentation files.
"""
from pathlib import Path
import shutil
import sys


def main():
    destination = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
    base = Path(__file__).resolve().parent
    required = ['index.html', 'app.js', 'styles.css', 'live-map.js', 'live-map.css']
    missing = [name for name in required if not (destination / name).is_file()]
    if missing:
        raise SystemExit('ERROR: Could not find ' + ', '.join(missing) + '\nOpen PowerShell in your existing coolroute-website folder and try again.')

    app = (destination / 'app.js').read_text(encoding='utf-8')
    if not all(s in app for s in ['function screenHome(', 'function screenRoute(', 'function render(']):
        raise SystemExit('ERROR: This app.js is not the supported CoolRoute version. No changes made.')

    index_path = destination / 'index.html'
    index = index_path.read_text(encoding='utf-8')
    if not ('src="app.js"' in index and '</head>' in index):
        raise SystemExit('ERROR: Expected index.html to load app.js. No changes made.')

    stylesheet = '<link rel="stylesheet" href="presentation-theme.css" />'
    script = '<script src="presentation-ui.js"></script>'
    if stylesheet not in index:
        index = index.replace('</head>', '  ' + stylesheet + '\n</head>', 1)
    if script not in index:
        index = index.replace('<script src="app.js"></script>', '<script src="app.js"></script>\n  ' + script, 1)

    backup = destination / 'index.html.before-presentation.bak'
    if not backup.exists():
        shutil.copy2(index_path, backup)
    for filename in ('presentation-theme.css', 'presentation-ui.js'):
        shutil.copy2(base / filename, destination / filename)
    index_path.write_text(index, encoding='utf-8')
    print('Success! Simplified UI installed in', destination)
    print('Your original app.js, live-map.js, live-map.css and datasets were NOT modified.')
    print('Start: python -m http.server 8000')
    print('Visit: http://localhost:8000/?v=presentation')


if __name__ == '__main__':
    main()
