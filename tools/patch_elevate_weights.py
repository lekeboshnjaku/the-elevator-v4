#!/usr/bin/env python3
import csv
import json
import shutil
from pathlib import Path

SCALE = 100
TARGET_RTP = 0.99
GUARANTEE_WEIGHT = 10
TARGET_PAYOUTS = [1000000, 2500000, 5000000, 10000000]

def main():
    project_root = Path(__file__).parent.parent
    math_dir = project_root / "library" / "publish_files" / "limbo_game"
    mirror_dir = project_root / "stake_engine_upload" / "math"
    elevate_csv_path = math_dir / "lookup_table_elevate.csv"
    index_path = math_dir / "index.json"

    rows = []
    with open(elevate_csv_path, 'r', newline='') as f:
        for sim_id, weight, payout in csv.reader(f):
            rows.append({'id': int(sim_id), 'weight': int(weight), 'payout': int(payout)})

    max_id = max(r['id'] for r in rows) if rows else 0
    present = {r['payout'] for r in rows}
    modified = False

    for target in TARGET_PAYOUTS:
        if target in present:
            for r in rows:
                if r['payout'] == target and r['weight'] < GUARANTEE_WEIGHT:
                    r['weight'] = GUARANTEE_WEIGHT
                    modified = True
                    print(f"Updated weight for {target/SCALE:,}x to {GUARANTEE_WEIGHT}")
        else:
            max_id += 1
            rows.append({'id': max_id, 'weight': GUARANTEE_WEIGHT, 'payout': target})
            modified = True
            print(f"Added row for {target/SCALE:,}x with weight {GUARANTEE_WEIGHT}")

    total_weight = sum(r['weight'] for r in rows)
    ev = sum(r['weight'] * (r['payout'] / SCALE) for r in rows) / total_weight
    cost_raw = ev / TARGET_RTP
    s_pct = round((cost_raw - 1.0) * 100)
    elev_cost = 1.0 + s_pct / 100.0

    with open(index_path, 'r', encoding='utf-8') as f:
        index = json.load(f)
    for m in index.get('modes', []):
        if m.get('name') == 'elevate':
            old = m.get('cost', 1.0)
            m['cost'] = elev_cost
            print(f"Elevate cost: {old:.2f} -> {elev_cost:.2f} (+{s_pct}%)")

    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2)

    with open(elevate_csv_path, 'w', newline='') as f:
        w = csv.writer(f)
        for r in rows:
            w.writerow([r['id'], r['weight'], r['payout']])

    mirror_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(elevate_csv_path, mirror_dir / elevate_csv_path.name)
    shutil.copy2(index_path, mirror_dir / index_path.name)

    print('\nGuaranteed high multipliers:')
    for t in TARGET_PAYOUTS:
        for r in rows:
            if r['payout'] == t:
                print(f"- {t/SCALE:,}x weight={r['weight']}")

    print(f"\nUpdated and mirrored to {mirror_dir}")

if __name__ == '__main__':
    main()
