#!/usr/bin/env python3
"""Set tutorials/updated.json for tutorials whose page changed in a push but whose recorded time did not.

    python3 .github/tutorial_times.py <before-sha> <after-sha>

The time used is the commit time (UTC) of the last commit in the push that touched that page.
A slug whose time was changed in the same push is left alone: whoever pushed it set the time on purpose.
"""
import json, re, subprocess, sys

def git(*a): return subprocess.run(('git',) + a, check=True, capture_output=True, text=True).stdout

def main():
    before, after = sys.argv[1], sys.argv[2]
    if not re.fullmatch(r'[0-9a-f]{40}', before) or set(before) == {'0'}: before = after + '~1'
    if subprocess.run(('git', 'rev-parse', '-q', '--verify', before + '^{commit}'), capture_output=True).returncode:
        print('first push, nothing to compare with'); return
    def times(rev):
        try: return json.loads(git('show', f'{rev}:tutorials/updated.json'))
        except Exception: return {}
    old, new = times(before), times(after)
    changed = [l for l in git('diff', '--name-only', before, after, '--', 'tutorials').splitlines()]
    out = dict(new); n = 0
    for path in changed:
        m = re.fullmatch(r'tutorials/([a-z0-9-]+)/index\.html', path)
        if not m or m[1] not in new: continue                       # only tutorials already on the site
        slug = m[1]
        if old.get(slug) != new.get(slug): continue                 # the push set this time itself
        when = git('log', '-1', '--format=%cd', '--date=format-local:%Y-%m-%dT%H:%M:%SZ', after, '--', path).strip()
        if when > new[slug]: out[slug] = when; n += 1; print(slug, '->', when)
    if n: open('tutorials/updated.json', 'w', encoding='utf-8').write(json.dumps(out, indent=2, sort_keys=True) + '\n')
    else: print('nothing to record')

if __name__ == '__main__': main()
