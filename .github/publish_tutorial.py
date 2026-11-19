#!/usr/bin/env python3
"""Publish one tutorial to the site from a copy of its source HTML.

    python3 .github/publish_tutorial.py <slug> <path-to-html> <updated-at ISO-8601 UTC>

Writes tutorials/<slug>/index.html (the source page plus the "Learning path" back link and the analytics snippet) and records
the time in tutorials/updated.json, which the Learning Path page reads to show "Last updated".
Run from the root of the repo. It changes files only; committing and pushing are left to the caller.
Only tutorials already listed in tutorials/updated.json can be published this way; a new tutorial
needs its card and its place in the learning path, which are set up by a site build.
"""
import json, pathlib, re, sys

BACK = pathlib.Path(__file__).with_name('tutorial_backlink.html').read_text(encoding='utf-8').rstrip('\n')
BEACON = pathlib.Path(__file__).with_name('analytics_beacon.html').read_text(encoding='utf-8').strip()

def main():
    if len(sys.argv) != 4: sys.exit(__doc__)
    slug, src, when = sys.argv[1], pathlib.Path(sys.argv[2]), sys.argv[3]
    if not re.fullmatch(r'[a-z0-9-]+', slug): sys.exit('bad slug')
    if not re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ', when): sys.exit('time must look like 2026-11-17T20:45:08Z')
    upd_path = pathlib.Path('tutorials/updated.json')
    upd = json.loads(upd_path.read_text(encoding='utf-8'))
    if slug not in upd: sys.exit(f'{slug} is not a tutorial on the site')
    html = src.read_text(encoding='utf-8')
    if '<body>' not in html or '</html>' not in html.lower() or len(html) < 20000: sys.exit('that does not look like a whole tutorial page')
    if BACK in html: sys.exit('the source already has the back link; pass the original page')
    page = html.replace('<body>', '<body>\n' + BACK, 1)
    i = page.lower().rfind('</body>')
    if BEACON not in page: page = page[:i] + BEACON + '\n' + page[i:]   # Cloudflare Web Analytics, as on the rest of the site
    out = pathlib.Path('tutorials') / slug / 'index.html'
    changed = (not out.exists()) or out.read_text(encoding='utf-8') != page
    out.write_text(page, encoding='utf-8')
    upd[slug] = when
    upd_path.write_text(json.dumps(upd, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(f'{slug}: {"page updated" if changed else "page unchanged"}, last updated set to {when}')

if __name__ == '__main__': main()
