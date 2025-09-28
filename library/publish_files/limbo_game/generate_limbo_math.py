import os, json, math, shutil
from pathlib import Path
import zstandard as zstd
import numpy as np

def generate(dest: Path):
    """Generate limbo game math files with both base and elevate modes.
    
    Creates:
    - One events file (game_logic.jsonl.zst) with all possible outcomes
    - Two weight tables (lookup_table_base.csv, lookup_table_elevate.csv)
    - One index.json file defining both modes
    
    Returns stats dictionary with verification metrics.
    """
    dest.mkdir(parents=True, exist_ok=True)
    
    # Output file paths
    base_csv_path = dest / "lookup_table_base.csv"
    elevate_csv_path = dest / "lookup_table_elevate.csv"
    jsonl_path = dest / "game_logic.jsonl"
    zst_path = dest / "game_logic.jsonl.zst"
    index_path = dest / "index.json"
    
    # Constants
    TOTAL_WEIGHT = 100_000_000
    BASE_COST = 1.0
    ELEVATE_COST = 1.2
    TARGET_RTP = 0.99
    TARGET_BUST_PROB = 0.0198
    SCALE = 100  # payoutMultiplier integers are scaled by 100
    
    # Calculate bust weight
    bust_weight = round(TARGET_BUST_PROB * TOTAL_WEIGHT)
    
    # Weight left for regular wins
    non_zero_weight = TOTAL_WEIGHT - bust_weight
    
    # Generate log-spaced multipliers from 1.01 to 100,000
    NUM_NON_ZERO = 12_000
    multipliers = np.logspace(np.log10(1.01), np.log10(100_000), NUM_NON_ZERO)
    # Round to 2 decimal places for display
    multipliers = np.round(multipliers * 100) / 100
    # Ensure minimum is exactly 1.01
    multipliers[0] = 1.01
    # Ensure maximum is exactly 100,000
    multipliers[-1] = 100_000
    
    # Remove duplicates and sort
    multipliers = np.unique(multipliers)
    
    # Find index of 10,000x (max for base mode)
    base_max_idx = np.searchsorted(multipliers, 10_000, side='right')
    base_multipliers = multipliers[:base_max_idx]
    
    # Function to calculate weights based on survival curve with tunable parameters
    def calculate_weights(alpha, mode='base', tail_threshold=None, tail_factor=None):
        # For base mode, only use multipliers up to 10,000x
        if mode == 'base':
            # Basic survival curve: weight ~ 1/m^(1+alpha)
            raw_weights = 1.0 / np.power(base_multipliers, 1.0 + alpha)
            
            # Normalize to non_zero_weight
            normalized_weights = raw_weights / raw_weights.sum() * non_zero_weight
            
            # Convert to integers, ensuring sum equals non_zero_weight
            int_weights = np.floor(normalized_weights).astype(int)
            remainders = normalized_weights - int_weights
            
            # Distribute remaining weight to bins with largest remainders
            remaining = non_zero_weight - int_weights.sum()
            if remaining > 0:
                indices = np.argsort(remainders)[-remaining:]
                for idx in indices:
                    int_weights[idx] += 1
            
            # Create full weights array with zeros for multipliers > 10,000x
            full_weights = np.zeros(len(multipliers), dtype=int)
            full_weights[:base_max_idx] = int_weights
            
            return full_weights
        else:  # elevate mode
            # Basic survival curve: weight ~ 1/m^(1+alpha)
            raw_weights = 1.0 / np.power(multipliers, 1.0 + alpha)
            
            # Apply tail boost for elevate mode if specified
            if tail_threshold is not None and tail_factor is not None:
                boost_mask = multipliers >= tail_threshold
                raw_weights[boost_mask] *= tail_factor
                
            # Normalize to non_zero_weight
            normalized_weights = raw_weights / raw_weights.sum() * non_zero_weight
            
            # Convert to integers, ensuring sum equals non_zero_weight
            int_weights = np.floor(normalized_weights).astype(int)
            remainders = normalized_weights - int_weights
            
            # Distribute remaining weight to bins with largest remainders
            remaining = non_zero_weight - int_weights.sum()
            if remaining > 0:
                indices = np.argsort(remainders)[-remaining:]
                for idx in indices:
                    int_weights[idx] += 1
                    
            return int_weights
    
    # Binary search to find alpha that gives target RTP for a mode
    def find_alpha_for_rtp(target_rtp, cost, mode='base', tail_threshold=None, tail_factor=None):
        alpha_min, alpha_max = 0.0, 200.0
        best_alpha = None
        best_rtp_diff = float('inf')
        
        # Increase iterations for finer precision on RTP targeting
        for _ in range(60):
            alpha = (alpha_min + alpha_max) / 2
            weights = calculate_weights(alpha, mode, tail_threshold, tail_factor)
            
            # Calculate expected value
            if mode == 'base':
                # Only consider multipliers up to 10,000x for base mode
                ev = np.sum(weights[:base_max_idx] * multipliers[:base_max_idx]) / TOTAL_WEIGHT
            else:
                # Consider all multipliers for elevate mode
                ev = np.sum(weights * multipliers) / TOTAL_WEIGHT
                
            rtp = ev / cost
            
            rtp_diff = abs(rtp - target_rtp)
            if rtp_diff < best_rtp_diff:
                best_alpha = alpha
                best_rtp_diff = rtp_diff
                
            # When alpha is high, weights shrink and EV drops. If resulting RTP
            # is below target, search lower (decrease alpha_max); otherwise raise
            # the lower bound to increase alpha.
            if rtp < target_rtp:
                alpha_max = alpha
            else:
                alpha_min = alpha
                
        # Clamp alpha to [0, 200]
        if best_alpha is None:
            return 0.0
        return max(0.0, min(200.0, best_alpha))
    
    # Find optimal parameters for both modes
    base_alpha = find_alpha_for_rtp(TARGET_RTP, BASE_COST, 'base')
    
    # For elevate mode, we want higher volatility (boost high multipliers)
    elevate_tail_threshold = 10.0  # Boost multipliers >= 10x
    elevate_tail_factor = 2.0      # Boost by 2.0x
    elevate_alpha = find_alpha_for_rtp(TARGET_RTP, ELEVATE_COST, 'elevate', 
                                     elevate_tail_threshold, elevate_tail_factor)
    
    # Calculate final weights
    base_weights = calculate_weights(base_alpha, 'base')
    elevate_weights = calculate_weights(elevate_alpha, 'elevate', elevate_tail_threshold, elevate_tail_factor)
    
    # Calculate payoutMultipliers (integer values for the game)
    payout_multipliers = np.round(multipliers * SCALE).astype(int)
    
    # Generate files
    with open(base_csv_path, 'w', encoding='utf-8', newline='') as f_base_csv, \
         open(elevate_csv_path, 'w', encoding='utf-8', newline='') as f_elevate_csv, \
         open(jsonl_path, 'w', encoding='utf-8') as f_jsonl:
        
        # Start ID counter
        _id = 1
        
        # Write bust row (payoutMultiplier = 0)
        f_base_csv.write(f"{_id},{bust_weight},0\n")
        f_elevate_csv.write(f"{_id},{bust_weight},0\n")
        f_jsonl.write(json.dumps({"id": _id, "events": [{}], "payoutMultiplier": 0}, 
                                separators=(',',':')) + "\n")
        _id += 1
        
        # Write non-zero multiplier rows
        for i in range(len(multipliers)):
            f_base_csv.write(f"{_id},{base_weights[i]},{payout_multipliers[i]}\n")
            f_elevate_csv.write(f"{_id},{elevate_weights[i]},{payout_multipliers[i]}\n")
            f_jsonl.write(json.dumps({"id": _id, "events": [{}], "payoutMultiplier": int(payout_multipliers[i])}, 
                                    separators=(',',':')) + "\n")
            _id += 1
    
    # Compress JSONL with zstandard
    c = zstd.ZstdCompressor(level=19)
    with open(jsonl_path, 'rb') as fi, open(zst_path, 'wb') as fo:
        fo.write(c.compress(fi.read()))
    os.remove(jsonl_path)
    
    # Create index.json
    index = {
        "modes": [
            {"name": "base", "cost": BASE_COST, "events": zst_path.name, "weights": base_csv_path.name},
            {"name": "elevate", "cost": ELEVATE_COST, "events": zst_path.name, "weights": elevate_csv_path.name}
        ]
    }
    index_path.write_text(json.dumps(index, indent=2))
    
    # Mirror files to stake_engine_upload/math
    mirror_dir = Path(dest).parents[2] / "stake_engine_upload" / "math"
    mirror_dir.mkdir(parents=True, exist_ok=True)
    
    shutil.copy2(base_csv_path, mirror_dir / base_csv_path.name)
    shutil.copy2(elevate_csv_path, mirror_dir / elevate_csv_path.name)
    shutil.copy2(zst_path, mirror_dir / zst_path.name)
    shutil.copy2(index_path, mirror_dir / index_path.name)
    
    # Calculate statistics for verification
    def calculate_stats(weights, cost, mode='base'):
        bust_prob = bust_weight / TOTAL_WEIGHT
        
        # Expected value calculation
        if mode == 'base':
            # Only consider multipliers up to 10,000x for base mode
            non_zero_weights = weights[:base_max_idx]
            non_zero_mults = multipliers[:base_max_idx]
            # Find min/max non-zero multipliers with non-zero weights
            non_zero_mask = non_zero_weights > 0
            min_nonzero = float(non_zero_mults[non_zero_mask][0]) if np.any(non_zero_mask) else 0
            max_nonzero = float(non_zero_mults[non_zero_mask][-1]) if np.any(non_zero_mask) else 0
            # Calculate EV
            ev = np.sum(non_zero_weights * non_zero_mults) / TOTAL_WEIGHT
        else:
            # Consider all multipliers for elevate mode
            non_zero_mask = weights > 0
            non_zero_mults = multipliers[non_zero_mask]
            min_nonzero = float(non_zero_mults[0]) if len(non_zero_mults) > 0 else 0
            max_nonzero = float(non_zero_mults[-1]) if len(non_zero_mults) > 0 else 0
            # Calculate EV
            ev = np.sum(weights * multipliers) / TOTAL_WEIGHT
            
        rtp = ev / cost
        house_edge = 1 - rtp
        
        return {
            "rtp": rtp,
            "bust_prob": bust_prob,
            "house_edge": house_edge,
            "min_nonzero": min_nonzero,
            "max_nonzero": max_nonzero,
            "total_weight": TOTAL_WEIGHT,
            "total_events": len(multipliers) + 1  # non-zero + bust
        }
    
    # Calculate and print stats
    base_stats = calculate_stats(base_weights, BASE_COST, 'base')
    elevate_stats = calculate_stats(elevate_weights, ELEVATE_COST, 'elevate')
    
    print("\nBase Mode Verification:")
    print(f"- RTP: {base_stats['rtp']:.6f} (~{base_stats['rtp']*100:.2f}%)")
    print(f"- Bust probability: {base_stats['bust_prob']:.6f} (~{base_stats['bust_prob']*100:.2f}%)")
    print(f"- House edge: {base_stats['house_edge']:.6f} ({base_stats['house_edge']*100:.2f}%)")
    print(f"- Min non-zero multiplier: {base_stats['min_nonzero']:.2f}x")
    print(f"- Max non-zero multiplier: {base_stats['max_nonzero']:.2f}x")
    
    print("\nElevate Mode Verification:")
    print(f"- RTP: {elevate_stats['rtp']:.6f} (~{elevate_stats['rtp']*100:.2f}%)")
    print(f"- Bust probability: {elevate_stats['bust_prob']:.6f} (~{elevate_stats['bust_prob']*100:.2f}%)")
    print(f"- House edge: {elevate_stats['house_edge']:.6f} ({elevate_stats['house_edge']*100:.2f}%)")
    print(f"- Min non-zero multiplier: {elevate_stats['min_nonzero']:.2f}x")
    print(f"- Max non-zero multiplier: {elevate_stats['max_nonzero']:.2f}x")
    
    # Return combined stats
    return {
        "base": base_stats,
        "elevate": elevate_stats,
        "alpha_base": base_alpha,
        "alpha_elevate": elevate_alpha
    }

if __name__ == "__main__":
    outdir = Path(__file__).parent
    stats = generate(outdir)
    print("\nGenerated limbo pack:", outdir)
    print(f"Files mirrored to: {Path(outdir).parents[2] / 'stake_engine_upload' / 'math'}")
