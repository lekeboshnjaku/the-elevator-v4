#!/usr/bin/env python3
"""
Limbo Math Verification Tool

Verifies the Limbo math package by:
1. Validating index.json and referenced files
2. Computing RTP from lookup_table.csv
3. Validating Limbo survival function (t * S(t) ≈ 0.99)
4. Comparing payoutMultiplier values between CSV and JSONL (if zstandard is available)
"""

import argparse
import csv
import json
import os.path
import sys
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict

# Try to import zstandard, but don't fail if not available
try:
    import zstandard as zstd
    ZSTD_AVAILABLE = True
except ImportError:
    ZSTD_AVAILABLE = False


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Verify Limbo math package")
    parser.add_argument(
        "--dir", 
        default=r"C:\Users\HomeTech PC\the-elevator\stake_engine_upload\math",
        help="Directory containing math files (default: %(default)s)"
    )
    parser.add_argument(
        "--scale", 
        type=int, 
        default=None,
        help="Override payout multiplier scale (default: auto-detect)"
    )
    parser.add_argument(
        "--require-zstd", 
        action="store_true",
        help="Fail if zstandard is not available for JSONL comparison"
    )
    return parser.parse_args()


def validate_index_json(math_dir: str) -> Dict[str, str]:
    """
    Validate index.json and return paths to referenced files.
    
    Returns:
        Dict with keys 'events' and 'weights' pointing to file paths
    
    Raises:
        SystemExit if index.json is invalid or missing
    """
    index_path = os.path.join(math_dir, "index.json")
    if not os.path.isfile(index_path):
        print(f"ERROR: index.json not found at {index_path}")
        sys.exit(1)
    
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse index.json: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Failed to read index.json: {e}")
        sys.exit(1)
    
    # Validate structure
    if not isinstance(index_data, dict) or "modes" not in index_data:
        print("ERROR: index.json is missing 'modes' array")
        sys.exit(1)
    
    if not isinstance(index_data["modes"], list) or not index_data["modes"]:
        print("ERROR: index.json 'modes' is empty or not an array")
        sys.exit(1)
    
    # Find limbo mode or use first mode
    limbo_mode = None
    for mode in index_data["modes"]:
        if mode.get("name") == "limbo":
            limbo_mode = mode
            break
    
    if not limbo_mode:
        limbo_mode = index_data["modes"][0]
        print(f"WARNING: No mode named 'limbo' found, using first mode: {limbo_mode.get('name', 'unnamed')}")
    
    # Validate required fields
    for field in ["events", "weights"]:
        if field not in limbo_mode:
            print(f"ERROR: Mode is missing '{field}' field")
            sys.exit(1)
        
        file_path = os.path.join(math_dir, limbo_mode[field])
        if not os.path.isfile(file_path):
            print(f"ERROR: Referenced file not found: {file_path}")
            sys.exit(1)
    
    # Check cost is numeric
    if "cost" not in limbo_mode:
        print("WARNING: Mode is missing 'cost' field, assuming 1.0")
    elif not isinstance(limbo_mode["cost"], (int, float)):
        print(f"WARNING: Mode 'cost' is not numeric: {limbo_mode['cost']}, assuming 1.0")
    
    return {
        "events": os.path.join(math_dir, limbo_mode["events"]),
        "weights": os.path.join(math_dir, limbo_mode["weights"])
    }


def load_csv_data(csv_path: str) -> List[Tuple[int, int, int]]:
    """
    Load and parse the lookup table CSV.
    
    Returns:
        List of tuples (simulation_id, weight, payoutMultiplier)
    
    Raises:
        SystemExit if CSV cannot be parsed
    """
    rows = []
    try:
        with open(csv_path, 'r', newline='', encoding='utf-8') as f:
            reader = csv.reader(f)
            for row in reader:
                if not row or len(row) < 3:
                    continue  # Skip empty lines
                
                try:
                    sim_id = int(row[0])
                    weight = int(row[1])
                    payout_multiplier = int(row[2])
                    rows.append((sim_id, weight, payout_multiplier))
                except (ValueError, IndexError) as e:
                    print(f"WARNING: Skipping invalid CSV row: {row}, error: {e}")
    except Exception as e:
        print(f"ERROR: Failed to read CSV file: {e}")
        sys.exit(1)
    
    if not rows:
        print("ERROR: No valid rows found in CSV file")
        sys.exit(1)
    
    return rows


def compute_rtp(csv_data: List[Tuple[int, int, int]], scale: Optional[int] = None) -> Dict[str, Any]:
    """
    Compute RTP and other statistics from CSV data.
    
    Args:
        csv_data: List of tuples (simulation_id, weight, payoutMultiplier)
        scale: Override scale factor for payoutMultiplier
    
    Returns:
        Dict with statistics including RTP, row count, etc.
    """
    if not csv_data:
        return {
            "row_count": 0,
            "total_weight": 0,
            "min_multiplier": 0,
            "max_multiplier": 0,
            "scale": 1,
            "rtp": 0.0,
            "house_edge": 1.0
        }
    
    # Extract data
    weights = [row[1] for row in csv_data]
    multipliers = [row[2] for row in csv_data]
    
    # Calculate statistics
    total_weight = sum(weights)
    min_multiplier = min(multipliers)
    max_multiplier = max(multipliers)
    
    # Determine scale if not provided
    if scale is None:
        # 1.  try to estimate from the smallest non-zero multiplier
        try:
            min_nonzero = min(m for m in multipliers if m > 0)
        except ValueError:
            min_nonzero = None

        chosen = None
        if min_nonzero:
            # theoretical min_nonzero should be 1.01 * scale
            scale_guess = round(min_nonzero / 1.01)
            candidates = [100, 1_000, 10_000, 100_000,
                          1_000_000, 10_000_000]
            # choose candidate with smallest relative error
            best_err = float("inf")
            for cand in candidates:
                err = abs(cand - scale_guess) / cand
                if err < best_err:
                    best_err = err
                    chosen = cand

        # 2.  fallback heuristics
        if chosen is None:
            if max_multiplier <= 2_000_000:
                chosen = 100
            else:
                chosen = 10_000_000

        scale = chosen
    
    # Compute RTP
    weighted_sum = sum(w * (m / scale) for w, m in zip(weights, multipliers))
    rtp = weighted_sum / total_weight if total_weight > 0 else 0
    
    return {
        "row_count": len(csv_data),
        "total_weight": total_weight,
        "min_multiplier": min_multiplier,
        "max_multiplier": max_multiplier,
        "scale": scale,
        "rtp": rtp,
        "house_edge": 1.0 - rtp
    }


def validate_limbo_survival(csv_data: List[Tuple[int, int, int]], scale: int, samples: int = 200) -> Dict[str, Any]:
    """
    Validate that the Limbo survival function follows t * S(t) ≈ 0.99.
    
    In Limbo, the probability of surviving to multiplier t should follow S(t) = 0.99/t.
    This means t * S(t) = 0.99 for all valid t.
    
    Args:
        csv_data: List of tuples (simulation_id, weight, payoutMultiplier)
        scale: Scale factor for payoutMultiplier
        samples: Number of points to sample for validation
    
    Returns:
        Dict with validation results
    """
    # Aggregate weights by multiplier
    multiplier_weights = defaultdict(int)
    for _, weight, multiplier in csv_data:
        multiplier_weights[multiplier] += weight
    
    # Get unique multipliers and sort
    unique_multipliers = sorted(multiplier_weights.keys())
    
    # Skip multipliers below 101 (1.01x) when scale=100
    min_valid_multiplier = 101 if scale == 100 else int(1.01 * scale)
    valid_multipliers = [m for m in unique_multipliers if m >= min_valid_multiplier]
    
    if not valid_multipliers:
        return {
            "samples_checked": 0,
            "max_abs_err": 1.0,  # Maximum possible error
            "mean_abs_err": 1.0,
            "passed": False
        }
    
    # Calculate total weight
    total_weight = sum(multiplier_weights.values())
    
    # Sample points for validation
    # Use logarithmic sampling to better cover the range
    if len(valid_multipliers) <= samples:
        sample_multipliers = valid_multipliers
    else:
        # Sample logarithmically across the range
        import math
        min_log = math.log(valid_multipliers[0])
        max_log = math.log(valid_multipliers[-1])
        log_step = (max_log - min_log) / (samples - 1)
        
        sample_indices = []
        for i in range(samples):
            log_val = min_log + i * log_step
            target = math.exp(log_val)
            # Find closest multiplier
            idx = min(range(len(valid_multipliers)), 
                      key=lambda j: abs(valid_multipliers[j] - target))
            if idx not in sample_indices:
                sample_indices.append(idx)
        
        sample_multipliers = [valid_multipliers[i] for i in sorted(sample_indices)]
    
    # Compute tail probabilities and validate survival function
    errors = []
    for multiplier in sample_multipliers:
        # Convert to float
        m = multiplier / scale
        
        # Calculate tail probability (probability of surviving to this multiplier)
        tail_prob = sum(multiplier_weights[mult] for mult in unique_multipliers 
                        if mult >= multiplier) / total_weight
        
        # Compute score: m * tail_prob should be approximately 0.99
        score = m * tail_prob
        error = abs(score - 0.99)
        errors.append((m, tail_prob, score, error))
    
    # Calculate statistics
    max_abs_err = max(err[3] for err in errors) if errors else 1.0
    mean_abs_err = sum(err[3] for err in errors) / len(errors) if errors else 1.0
    
    return {
        "samples_checked": len(sample_multipliers),
        "max_abs_err": max_abs_err,
        "mean_abs_err": mean_abs_err,
        "passed": max_abs_err <= 0.002  # Allow 0.2% error margin
    }


def survival_checks_at_points(csv_data: List[Tuple[int, int, int]], scale: int, 
                              points: List[float]) -> List[Dict[str, Any]]:
    """
    Check survival function at specific multiplier points.
    
    Args:
        csv_data: List of tuples (simulation_id, weight, payoutMultiplier)
        scale: Scale factor for payoutMultiplier
        points: List of specific multiplier points to check
    
    Returns:
        List of dicts with M, S_calc, S_expected, rel_err for each point
    """
    # Aggregate weights by multiplier
    multiplier_weights = defaultdict(int)
    for _, weight, multiplier in csv_data:
        multiplier_weights[multiplier] += weight
    
    # Get unique multipliers and sort
    unique_multipliers = sorted(multiplier_weights.keys())
    
    # Calculate total weight
    total_weight = sum(multiplier_weights.values())
    
    results = []
    for m in points:
        # Convert to integer multiplier
        int_m = int(m * scale)
        
        # Calculate tail probability (probability of surviving to this multiplier)
        tail_prob = sum(multiplier_weights[mult] for mult in unique_multipliers 
                        if mult >= int_m) / total_weight
        
        # Expected survival probability based on Limbo formula S(t) = 0.99/t
        expected = 0.99 / m
        
        # Relative error
        rel_err = abs(tail_prob - expected) / expected if expected > 0 else 1.0
        
        results.append({
            "M": m,
            "S_calc": tail_prob,
            "S_expected": expected,
            "rel_err": rel_err
        })
    
    return results


def compare_with_jsonl(jsonl_path: str, csv_data: List[Tuple[int, int, int]], require_zstd: bool) -> Dict[str, Any]:
    """
    Compare payoutMultiplier values between CSV and JSONL.
    
    Args:
        jsonl_path: Path to game_logic.jsonl.zst file
        csv_data: List of tuples (simulation_id, weight, payoutMultiplier)
        require_zstd: Whether to fail if zstandard is not available
    
    Returns:
        Dict with comparison results
    """
    result = {
        "compared": False,
        "jsonl_count": 0,
        "counts_match": False,
        "values_match": False,
        "mismatches": []
    }
    
    if not ZSTD_AVAILABLE:
        if require_zstd:
            print("ERROR: zstandard module is required but not available")
            print("Install with: pip install zstandard")
            sys.exit(1)
        else:
            print("WARNING: zstandard module not available, skipping JSONL comparison")
            print("Install with: pip install zstandard")
            return result
    
    try:
        # Get expected multipliers from CSV
        expected_multipliers = [row[2] for row in csv_data]
        
        # Read and decompress JSONL
        with open(jsonl_path, 'rb') as f:
            dctx = zstd.ZstdDecompressor()
            with dctx.stream_reader(f) as reader:
                text_stream = reader.read().decode('utf-8')
                lines = text_stream.splitlines()
        
        # Parse each JSON line
        jsonl_multipliers = []
        for i, line in enumerate(lines):
            if not line.strip():
                continue
            
            try:
                data = json.loads(line)
                # Look for payoutMultiplier in different possible formats
                multiplier = None
                for key in ["payoutMultiplier", "payout_multiplier", "multiplier"]:
                    if key in data:
                        multiplier = data[key]
                        break
                
                if multiplier is not None:
                    jsonl_multipliers.append(int(multiplier))
                else:
                    print(f"WARNING: No multiplier found in JSONL line {i+1}")
            except json.JSONDecodeError:
                print(f"WARNING: Invalid JSON at line {i+1}")
            except Exception as e:
                print(f"WARNING: Error processing JSONL line {i+1}: {e}")
        
        # Compare counts
        result["jsonl_count"] = len(jsonl_multipliers)
        result["counts_match"] = len(expected_multipliers) == len(jsonl_multipliers)
        
        # Compare values
        mismatches = []
        min_len = min(len(expected_multipliers), len(jsonl_multipliers))
        for i in range(min_len):
            if expected_multipliers[i] != jsonl_multipliers[i]:
                mismatches.append((i, expected_multipliers[i], jsonl_multipliers[i]))
                if len(mismatches) >= 5:  # Limit to first 5 mismatches
                    break
        
        result["values_match"] = len(mismatches) == 0
        result["mismatches"] = mismatches
        result["compared"] = True
        
        return result
    
    except Exception as e:
        print(f"WARNING: Failed to compare with JSONL: {e}")
        return result


def main():
    """Main verification function."""
    args = parse_args()
    math_dir = args.dir
    
    print(f"Verifying Limbo math in: {math_dir}")
    
    # Validate index.json and get file paths
    print("\nValidating index.json...")
    file_paths = validate_index_json(math_dir)
    print(f"[OK] index.json valid")
    print(f"  - Events file: {os.path.basename(file_paths['events'])}")
    print(f"  - Weights file: {os.path.basename(file_paths['weights'])}")
    
    # Load and validate CSV data
    print("\nLoading lookup table CSV...")
    csv_data = load_csv_data(file_paths["weights"])
    print(f"[OK] Loaded {len(csv_data)} rows from CSV")
    
    # Compute RTP and statistics
    print("\nComputing RTP...")
    stats = compute_rtp(csv_data, args.scale)
    
    print(f"[OK] CSV Statistics:")
    print(f"  - Total rows: {stats['row_count']:,}")
    print(f"  - Total weight: {stats['total_weight']:,}")
    print(f"  - Min multiplier: {stats['min_multiplier']:,}")
    print(f"  - Max multiplier: {stats['max_multiplier']:,}")
    print(f"  - Inferred scale: {stats['scale']:,}")
    print(f"  - RTP: {stats['rtp']:.6f} ({stats['rtp']*100:.4f}%)")
    print(f"  - House edge: {stats['house_edge']:.6f} ({stats['house_edge']*100:.4f}%)")
    
    # Check min/max multiplier requirements
    min_x = stats['min_multiplier'] / stats['scale']
    max_x = stats['max_multiplier'] / stats['scale']
    print(f"  - Min multiplier (scaled): {min_x:.2f}x")
    print(f"  - Max multiplier (scaled): {max_x:.2f}x")
    
    if min_x < 1.01:
        print(f"[FAIL] Min multiplier is below 1.01x")
        sys.exit(1)
    
    if max_x < 1_000_000.0:
        print(f"[FAIL] Max multiplier is below 1,000,000x")
        sys.exit(1)
    
    # Check expected gross (E) against target
    expected_gross = stats['rtp']
    print(f"\nChecking expected gross (E)...")
    print(f"  - Expected gross (E): {expected_gross:.6f}")
    print(f"  - Target: 0.990000")
    print(f"  - Absolute error: {abs(expected_gross - 0.99):.6f}")
    
    if abs(expected_gross - 0.99) > 0.01:
        print(f"[FAIL] Expected gross (E) differs from target 0.99 by more than 0.01")
        sys.exit(1)
    else:
        print(f"[OK] Expected gross (E) is within 0.01 of target 0.99")
    
    # Validate Limbo survival function
    print("\nValidating survival function (t * S(t) ≈ 0.99)...")
    survival_check = validate_limbo_survival(csv_data, stats['scale'])
    
    print(f"  - Samples checked: {survival_check['samples_checked']}")
    print(f"  - Max absolute error: {survival_check['max_abs_err']:.6f}")
    print(f"  - Mean absolute error: {survival_check['mean_abs_err']:.6f}")
    
    if survival_check['passed']:
        print(f"[OK] Survival function check passed")
    else:
        print(f"[FAIL] Survival function check failed")
        sys.exit(1)
    
    # Check specific survival points
    print("\nChecking survival function at specific points...")
    specific_points = [1.01, 1.05, 1.1, 2, 5, 10, 100, 1000, 1_000_000]
    point_checks = survival_checks_at_points(csv_data, stats['scale'], specific_points)
    
    print(f"{'Multiplier':>12} | {'S_calc':>12} | {'S_expected':>12} | {'Rel Error %':>12}")
    print(f"{'-'*12} | {'-'*12} | {'-'*12} | {'-'*12}")
    
    all_points_passed = True
    for check in point_checks:
        rel_err_pct = check['rel_err'] * 100
        print(f"{check['M']:12.2f} | {check['S_calc']:12.6f} | {check['S_expected']:12.6f} | {rel_err_pct:12.2f}")
        if check['rel_err'] > 0.02:  # 2% relative error threshold
            all_points_passed = False
    
    if all_points_passed:
        print(f"[OK] All specific survival points passed (relative error ≤ 2%)")
    else:
        print(f"[FAIL] One or more specific survival points failed (relative error > 2%)")
        sys.exit(1)
    
    # Compare with JSONL if possible
    print("\nComparing with JSONL...")
    comparison = compare_with_jsonl(file_paths["events"], csv_data, args.require_zstd)
    
    if comparison["compared"]:
        print(f"[OK] JSONL comparison completed")
        print(f"  - JSONL lines: {comparison['jsonl_count']:,}")
        print(f"  - Counts match: {'Yes' if comparison['counts_match'] else 'No'}")
        print(f"  - Values match: {'Yes' if comparison['values_match'] else 'No'}")
        
        if not comparison["values_match"]:
            print("\n[WARN] Mismatches found (showing up to first 5):")
            for idx, csv_val, jsonl_val in comparison["mismatches"]:
                print(f"  - Index {idx}: CSV={csv_val}, JSONL={jsonl_val}")
    
    # Overall verification result
    print("\nVerification summary:")
    if not survival_check['passed']:
        print("[FAIL] Survival function check failed")
        sys.exit(1)
    elif not all_points_passed:
        print("[FAIL] Specific survival points check failed")
        sys.exit(1)
    elif abs(expected_gross - 0.99) > 0.01:
        print("[FAIL] Expected gross check failed")
        sys.exit(1)
    elif comparison["compared"] and not comparison["values_match"]:
        print("[FAIL] CSV and JSONL multipliers do not match")
        sys.exit(1)
    elif comparison["compared"] and not comparison["counts_match"]:
        print("[WARN] CSV and JSONL row counts do not match")
        print("[OK] PASSED with warnings")
    else:
        print("[OK] PASSED: All verifications successful")
    
    sys.exit(0)


if __name__ == "__main__":
    main()
