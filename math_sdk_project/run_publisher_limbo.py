import os
import csv
import json
import math
from collections import defaultdict

try:
    import zstandard as zstd
except Exception as e:
    raise RuntimeError("zstandard is required. Install it in the venv: pip install zstandard") from e

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
OUT_DIR = os.path.join(ROOT, 'library', 'publish_files', 'limbo_game')
INDEX_PATH = os.path.join(OUT_DIR, 'index.json')
CSV_PATH = os.path.join(OUT_DIR, 'lookup_table.csv')
JSONL_ZST_PATH = os.path.join(OUT_DIR, 'game_logic.jsonl.zst')

SCALE = 100
MIN_M = 1.01
MAX_M = 1_000_000.0
POINTS_PER_DECADE = 100
BASE_WEIGHT = 10_000_000  # Large base to reduce rounding error


def logspace(start: float, end: float, num: int):
    if num <= 1:
        return [end]
    s, e = math.log(start, 10), math.log(end, 10)
    step = (e - s) / (num - 1)
    return [10 ** (s + i * step) for i in range(num)]


def build_bins():
    edges = [MIN_M]
    # 1.01 -> 10
    edges += logspace(MIN_M, 10.0, POINTS_PER_DECADE)[1:]
    # 10 -> 100, 100 -> 1e3, ..., 1e5 -> 1e6
    a = 10.0
    while a < MAX_M:
        b = min(a * 10.0, MAX_M)
        edges += logspace(a, b, POINTS_PER_DECADE)[1:]
        a = b
    return edges


def generate_distribution():
    edges = build_bins()
    # Probability mass for crash in [edge[i], edge[i+1]) is 0.99*(1/edge[i] - 1/edge[i+1])
    probs = []
    reps = []
    for i in range(len(edges) - 1):
        left, right = edges[i], edges[i + 1]
        p = 0.99 * (1.0 / left - 1.0 / right)
        probs.append(p)
        reps.append(right)  # representative multiplier for the bin
    # Tail mass at MAX_M (S(MAX_M))
    tail = 0.99 / MAX_M
    probs.append(tail)
    reps.append(MAX_M)
    # Bust mass below 1.01
    p_bust = 1.0 - 0.99 / MIN_M
    return p_bust, reps, probs


def to_weights(p_bust, reps, probs):
    weights = defaultdict(int)
    # Bust row at multiplier 0
    weights[0] += max(1, round(p_bust * BASE_WEIGHT))
    for m, p in zip(reps, probs):
        mult_int = int(round(m * SCALE))
        if mult_int < 101:
            mult_int = 101
        if mult_int > int(MAX_M * SCALE):
            mult_int = int(MAX_M * SCALE)
        w = max(1, round(p * BASE_WEIGHT))
        weights[mult_int] += w
    return weights


def write_csv_and_jsonl(weights_map):
    os.makedirs(OUT_DIR, exist_ok=True)
    # Order by multiplier ascending
    items = sorted(weights_map.items(), key=lambda x: x[0])
    # Write CSV
    with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        sim_id = 1
        for mult, w in items:
            writer.writerow([sim_id, int(w), int(mult)])
            sim_id += 1
    # Write JSONL.zst
    cctx = zstd.ZstdCompressor(level=3)
    with open(JSONL_ZST_PATH, 'wb') as f:
        with cctx.stream_writer(f) as zw:
            for mult, _ in items:
                line = json.dumps({"payoutMultiplier": int(mult), "events": [{}]}) + "\n"
                zw.write(line.encode('utf-8'))


def write_index():
    data = {
        "modes": [
            {
                "name": "limbo",
                "cost": 1.0,
                "events": os.path.basename(JSONL_ZST_PATH),
                "weights": os.path.basename(CSV_PATH),
            }
        ]
    }
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')


def main():
    p_bust, reps, probs = generate_distribution()
    weights = to_weights(p_bust, reps, probs)
    write_csv_and_jsonl(weights)
    write_index()
    print(f"Generated: \n  - {INDEX_PATH}\n  - {CSV_PATH}\n  - {JSONL_ZST_PATH}")

if __name__ == '__main__':
    main()
