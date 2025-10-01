import os
import sys

# ---------------------------------------------------------------------------
# Ensure the local source tree takes precedence over any site-packages copy.
# This prevents accidental import of the editable-installed `stakeengine`
# version when we really want the in-repo `src` package.
# ---------------------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, BASE_DIR)

"""Main file for generating results for sample lines-pay game."""

from gamestate import GameState
from game_config import GameConfig
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs

if __name__ == "__main__":

    num_threads = 1
    batching_size = 50000
    compression = True
    profiling = False

    num_sim_args = {
        "base": int(1e2),
    }

    run_conditions = {"run_sims": True}

    config = GameConfig()
    gamestate = GameState(config)

    if run_conditions["run_sims"]:
        create_books(
            gamestate,
            config,
            num_sim_args,
            batching_size,
            num_threads,
            compression,
            profiling,
        )
    generate_configs(gamestate)
