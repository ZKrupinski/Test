#!/usr/bin/env python3
"""Bundle only verified CC0 OGG field/foley samples for offline GitHub Pages.
All source URLs and local names come from foley.js (one authoritative map).
Never synthesize digital bleeps or include files with unknown license.
"""
import pathlib
import re
import time
import urllib.request

BASE = pathlib.Path(__file__).resolve().parents[1]
JS = (BASE / 'foley.js').read_text(encoding='utf-8')
OUT = BASE / 'assets' / 'foley'
SOURCES = re.findall(
    r"^\s*\w+:\['([\w-]+\.ogg)','(https://raw\.githubusercontent\.com/[^']+\.ogg)'\],?\s*$",
    JS, re.MULTILINE
)
assert len(SOURCES) >= 29, f'Audio manifest unexpectedly small ({len(SOURCES)})'
assert len(set(name for name, _ in SOURCES)) == len(SOURCES), 'Duplicate sound file name'
ALLOWED = (
    'https://raw.githubusercontent.com/Julian-adv/OpenMMO/master/client/public/sounds/fishing-',
    'https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/'
)
OUT.mkdir(parents=True, exist_ok=True)
for index, (filename, url) in enumerate(SOURCES, 1):
    if not url.startswith(ALLOWED):
        raise ValueError(f'Unreviewed audio origin: {url}')
    target = OUT / filename
    if target.is_file() and target.stat().st_size >= 2000:
        if target.read_bytes()[:4] != b'OggS':
            raise ValueError(f'Invalid local OGG file: {target}')
        print(f'[{index:02d}/{len(SOURCES)}] retained {filename}')
        continue
    last_error = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (HumanFishing CC0 audio installer)',
                'Referer':'https://opengameart.org/content/trumpet-fanfare'})
            with urllib.request.urlopen(req, timeout=30) as response:
                payload = response.read(500_000)
            if not 2000 <= len(payload) <= 400_000 or not payload.startswith(b'OggS'):
                raise ValueError(f'Invalid OGG sample {filename}: {len(payload)} bytes')
            target.write_bytes(payload)
            print(f'[{index:02d}/{len(SOURCES)}] bundled {filename} ({len(payload)} bytes)')
            last_error = None
            break
        except Exception as exc:
            last_error = exc
            time.sleep(1 + attempt)
    if last_error:
        raise RuntimeError(f'Could not download {filename} from {url}') from last_error
print(f'PASS: {len(SOURCES)} CC0 field/foley samples installed in {OUT}')
