"""Stamp each progress-log entry with OpenTimestamps, then record its Bitcoin block once confirmed.

Runs in GitHub Actions (.github/workflows/stamp-log.yml). Proofs are named by the
SHA-256 of the entry file, so an edited entry gets a new, later proof and the old
one no longer matches: the log can't be quietly backdated.
"""
import datetime, hashlib, json, pathlib, re, shutil, subprocess, urllib.request

ROOT = pathlib.Path('learning-log'); ENTRIES = ROOT / 'entries'; PROOFS = ROOT / 'proofs'
PROOFS.mkdir(parents=True, exist_ok=True)

def get(url):
    with urllib.request.urlopen(url, timeout=30) as r: return r.read().decode()

for f in sorted(ENTRIES.glob('*.json')):
    sha = hashlib.sha256(f.read_bytes()).hexdigest(); ots = PROOFS / f'{sha}.ots'
    if ots.exists(): continue
    if subprocess.run(['ots', 'stamp', str(f)]).returncode == 0:
        shutil.move(f'{f}.ots', ots); print('stamped', f.name, sha)

for ots in sorted(PROOFS.glob('*.ots')):
    meta = ots.with_suffix('.json')
    if meta.exists(): continue
    subprocess.run(['ots', 'upgrade', str(ots)])
    for bak in PROOFS.glob('*.bak'): bak.unlink()
    info = subprocess.run(['ots', 'info', str(ots)], capture_output=True, text=True).stdout
    heights = [int(h) for h in re.findall(r'BitcoinBlockHeaderAttestation\((\d+)\)', info)]
    if not heights: print('pending', ots.name); continue
    h = min(heights); bhash = get(f'https://blockstream.info/api/block-height/{h}').strip()
    t = json.loads(get(f'https://blockstream.info/api/block/{bhash}'))['timestamp']
    meta.write_text(json.dumps({'bitcoin_block': h, 'block_hash': bhash,
                                'time': datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}) + '\n')
    print('confirmed', ots.name, h)
