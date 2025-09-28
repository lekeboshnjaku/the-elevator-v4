#!/usr/bin/env python3
"""
verify_limbo_math.py - Verification script for Limbo game math files

This script analyzes the Limbo game math files to verify:
- Bust probability
- Min/max non-zero multipliers
- RTP and house edge for each mode

Usage:
    python verify_limbo_math.py [directory]
"""

import json
import os
import csv
import sys
from pathlib import Path

# Constants
SCALE = 100  # payoutMultiplier integers are scaled by 100
# Note: jackpot logic has been removed from the game.  Any payoutMultiplier
# greater than zero is treated as a regular win for verification purposes.


def verify_limbo_math(base_dir: Path = None):
    """
    Verify the limbo math files and print statistics.
    
    Args:
        base_dir: Base directory containing the math files. Defaults to current directory.
    """
    if base_dir is None:
        base_dir = Path(__file__).parent
    
    # Load index.json
    index_path = base_dir / "index.json"
    if not index_path.exists():
        raise FileNotFoundError(f"Index file not found: {index_path}")
    
    with open(index_path, 'r') as f:
        try:
            index_data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in index file: {e}")
    
    if "modes" not in index_data or not index_data["modes"]:
        raise ValueError("No game modes found in index.json")
    
    # Check if game_logic.jsonl.zst exists (just presence, not content)
    events_file = base_dir / index_data["modes"][0]["events"]
    if not events_file.exists():
        raise FileNotFoundError(f"Events file not found: {events_file}")
    
    # Print header
    print("\n" + "=" * 70)
    print(f"LIMBO MATH VERIFICATION")
    print("=" * 70)
    
    # Process each mode
    for mode in index_data["modes"]:
        mode_name = mode["name"]
        cost = mode["cost"]
        weights_file = base_dir / mode["weights"]
        
        if not weights_file.exists():
            raise FileNotFoundError(f"Weights file not found for {mode_name}: {weights_file}")
        
        # Analyze weights file
        stats = analyze_weights(weights_file, cost)
        
        # Print mode statistics
        print(f"\nMode: {mode_name.upper()} (cost: {cost})")
        print("-" * 50)
        print(f"Bust probability:     {stats['bust_prob']:.6f} ({stats['bust_prob']*100:.4f}%)")
        print(f"Min non-zero mult:    {stats['min_nonzero']:.2f}x")
        print(f"Max non-zero mult:    {stats['max_nonzero']:.2f}x")
        print(f"RTP:                  {stats['rtp']:.6f} ({stats['rtp']*100:.2f}%)")
        print(f"House edge:           {stats['house_edge']:.6f} ({stats['house_edge']*100:.2f}%)")
        print(f"Total weight:         {stats['total_weight']:,}")
        print(f"Total entries:        {stats['total_entries']:,}")
    
    print("\n" + "=" * 70)
    print("Verification complete.")
    print("=" * 70)


def analyze_weights(weights_file: Path, cost: float):
    """
    Analyze a weights CSV file and calculate statistics.
    
    Args:
        weights_file: Path to the weights CSV file
        cost: Cost of the mode
        
    Returns:
        Dictionary of statistics
    """
    total_weight = 0
    bust_weight = 0
    min_nonzero = float('inf')
    max_nonzero = 0
    weighted_sum = 0
    total_entries = 0
    
    # Read the weights file
    with open(weights_file, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 3:
                continue
                
            try:
                total_entries += 1
                id_val, weight, payout = int(row[0]), int(row[1]), int(row[2])
                total_weight += weight
                
                if payout == 0:
                    # Bust row (payoutMultiplier = 0)
                    bust_weight += weight
                else:
                    # Regular payout - convert to multiplier by dividing by SCALE
                    if weight > 0:
                        multiplier = payout / SCALE
                        min_nonzero = min(min_nonzero, multiplier)
                        max_nonzero = max(max_nonzero, multiplier)
                
                # Add to weighted sum for RTP calculation
                weighted_sum += weight * payout
            except (ValueError, IndexError) as e:
                print(f"Warning: Invalid row in weights file: {row} - {e}")
    
    # Calculate statistics
    bust_prob = bust_weight / total_weight if total_weight > 0 else 0
    
    # RTP calculation: sum(weight * payout) / (total_weight * SCALE * cost)
    # The division by SCALE converts payout integers back to multipliers
    rtp = (weighted_sum / SCALE) / (total_weight * cost) if total_weight > 0 else 0
    house_edge = 1 - rtp
    
    return {
        'total_weight': total_weight,
        'bust_weight': bust_weight,
        'bust_prob': bust_prob,
        'min_nonzero': min_nonzero if min_nonzero != float('inf') else 0,
        'max_nonzero': max_nonzero,
        'rtp': rtp,
        'house_edge': house_edge,
        'total_entries': total_entries
    }


if __name__ == "__main__":
    try:
        # Allow specifying a different directory as a command-line argument
        dir_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
        verify_limbo_math(dir_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
