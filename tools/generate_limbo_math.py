import os, json, shutil
import zstandard as zstd

SCALE = 100
TOTAL_WEIGHT = 100_000_000  # large to allow tiny high-tail prob
BUST_PROB = 0.0198
WEIGHT_BUST = int(round(TOTAL_WEIGHT * BUST_PROB))  # 1,980,000
WEIGHT_MAX = 99  # gives S(1,000,000) ≈ 9.9e-7
WEIGHT_MIN = TOTAL_WEIGHT - WEIGHT_BUST - WEIGHT_MAX

MULT_BUST = 0
MULT_MIN = 101  # 1.01x at scale=100
MULT_MAX = 100_000_000  # 1,000,000x at scale=100

publish_dir = r"C:\Users\HomeTech PC\the-elevator\library\publish_files\limbo_game"
target_dir = r"C:\Users\HomeTech PC\the-elevator\stake_engine_upload\math"
os.makedirs(publish_dir, exist_ok=True)

# 1) index.json
index = {
    "modes": [
        {
            "cost": 1,
            "weights": "lookup_table.csv",
            "name": "limbo",
            "events": "game_logic.jsonl.zst"
        }
    ]
}
with open(os.path.join(publish_dir, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

# 2) lookup_table.csv  (simulation_id, weight, payoutMultiplier)
csv_lines = []
rows = [
    (1, WEIGHT_BUST, MULT_BUST),
    (2, WEIGHT_MIN, MULT_MIN),
    (3, WEIGHT_MAX, MULT_MAX),
]
for sim_id, weight, mult in rows:
    csv_lines.append(f"{sim_id},{weight},{mult}\n")

with open(os.path.join(publish_dir, 'lookup_table.csv'), 'w', encoding='utf-8', newline='') as f:
    f.writelines(csv_lines)

# 3) game_logic.jsonl.zst (compressed JSONL with payoutMultiplier fields matching CSV order)
jsonl_lines = [
    {"payoutMultiplier": MULT_BUST},
    {"payoutMultiplier": MULT_MIN},
    {"payoutMultiplier": MULT_MAX},
]
jsonl_text = "\n".join(json.dumps(obj, separators=(",", ":")) for obj in jsonl_lines) + "\n"

cctx = zstd.ZstdCompressor()
with open(os.path.join(publish_dir, 'game_logic.jsonl.zst'), 'wb') as f:
    with cctx.stream_writer(f) as writer:
        writer.write(jsonl_text.encode('utf-8'))

# Print summary for sanity
rtp = (WEIGHT_MIN * (MULT_MIN / SCALE) + WEIGHT_MAX * (MULT_MAX / SCALE)) / TOTAL_WEIGHT
print('Generated files at:', publish_dir)
print('Weights -> bust:', WEIGHT_BUST, 'min:', WEIGHT_MIN, 'max:', WEIGHT_MAX)
print('Bust prob:', WEIGHT_BUST / TOTAL_WEIGHT)
print('Min non-zero x:', MULT_MIN / SCALE)
print('Max x:', MULT_MAX / SCALE)
print('RTP:', rtp)

# Copy files to target directory
print(f"\nCopying files to {target_dir}...")
for filename in ['index.json', 'lookup_table.csv', 'game_logic.jsonl.zst']:
    src = os.path.join(publish_dir, filename)
    dst = os.path.join(target_dir, filename)
    shutil.copy2(src, dst)
    print(f"Copied {filename}")

print("\nFiles generated and copied successfully!")
