"""Main file for generating results for Limbo game."""

from gamestate import GameState
from game_config import GameConfig
from optimization_program.run_script import OptimizationExecution
from utils.game_analytics.run_analysis import create_stat_sheet as run
from utils.rgs_verification import execute_all_tests
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs
# upload_to_aws is optional – gracefully degrade if utils.upload_data is absent
try:
    from utils.upload_data import upload_to_aws
except Exception:  # pragma: no cover
    def upload_to_aws(*args, **kwargs):  # type: ignore
        print("upload_to_aws not available; skipping upload.")

if __name__ == "__main__":

    num_threads = 2
    rust_threads = 4
    batching_size = 10000
    compression = False
    profiling = False

    num_sim_args = {
        "base": int(1e3),
    }

    run_conditions = {
        "run_sims": True,
        "run_optimization": False,
        "run_analysis": False,
        "upload_data": True,
    }
    target_modes = ["base"]

    config = GameConfig()
    gamestate = GameState(config)

    if run_conditions["run_optimization"] or run_conditions["run_analysis"]:
        optimization_setup_class = OptimizationExecution()

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

    if run_conditions["run_optimization"]:
        OptimizationExecution().run_all_modes(config, target_modes, rust_threads)
        generate_configs(gamestate)

    if run_conditions["run_analysis"]:
        custom_keys = [{"symbol": "scatter"}]
        run(config.game_id, custom_keys=custom_keys)

    if run_conditions["upload_data"]:
        upload_items = {
            "books": True,
            "lookup_tables": True,
            "force_files": True,
            "config_files": True,
        }
        upload_to_aws(
            gamestate,
            target_modes,
            upload_items,
        )
