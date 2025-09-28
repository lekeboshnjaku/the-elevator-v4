#!/usr/bin/env python3
import csv, json
from pathlib import Path

SCALE = 100
TARGET_RTP = 0.99

root = Path(__file__).parent.parent
math_dir = root / 'library' / 'publish_files' / 'limbo_game'
mirror_dir = root / 'stake_engine_upload' / 'math'
base_csv = math_dir / 'lookup_table_base.csv'
elev_csv = math_dir / 'lookup_table_elevate.csv'
index_path = math_dir / 'index.json'

def ev_from_csv(p):
    tot = 0
    evn = 0.0
    with open(p, 'r', newline='') as f:
        for sid, w, m in csv.reader(f):
            w = int(w); m = int(m)
            tot += w
            evn += w * (m / SCALE)
    return (evn / tot) if tot else 0.0

base_ev = ev_from_csv(base_csv)
elev_ev = ev_from_csv(elev_csv)

cost_raw = elev_ev / TARGET_RTP
s_pct = round((cost_raw - 1.0) * 100)
elev_cost = 1.0 + s_pct / 100.0

index = {
  'modes': [
    { 'name': 'base', 'cost': 1.0, 'events': 'game_logic.jsonl.zst', 'weights': 'lookup_table_base.csv' },
    { 'name': 'elevate', 'cost': elev_cost, 'events': 'game_logic.jsonl.zst', 'weights': 'lookup_table_elevate.csv' }
  ]
}

with open(index_path, 'w', encoding='utf-8') as f:
    json.dump(index, f, indent=2)

mirror_dir.mkdir(parents=True, exist_ok=True)
for fname in ['index.json']:
    (mirror_dir / fname).write_bytes((math_dir / fname).read_bytes())

print(f'Base EV: {base_ev:.6f}')
print(f'Elev EV: {elev_ev:.6f}')
print(f'Elevate cost: {elev_cost:.2f} (+{s_pct}%)')
