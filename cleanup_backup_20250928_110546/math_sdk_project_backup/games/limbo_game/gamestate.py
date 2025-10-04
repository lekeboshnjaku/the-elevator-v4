"""Handles the state and output for a single simulation round for Limbo"""

from game_override import GameStateOverride
import random


class GameState(GameStateOverride):
    def run_spin(self, sim):
        # Deterministic RNG for any internal random choices
        self.reset_seed(sim)
        self.reset_book()

        # Read parameters
        conditions = self.get_current_distribution_conditions()
        edge = float(conditions.get("edge", 0.01))
        min_mult = float(conditions.get("min_multiplier", 1.01))
        display_cap = conditions.get("display_cap", None)

        targets = conditions.get("targets", [1.01])
        weights = conditions.get("target_weights", [1 for _ in targets])
        # Deterministic selection under seeded RNG
        target = random.choices(targets, weights=weights, k=1)[0]

        # Deterministic seeds per simulation (can be overridden via conditions)
        server_seed = conditions.get("server_seed", "SERVER_SEED")
        client_seed = conditions.get("client_seed", "CLIENT_SEED")
        nonce = int(conditions.get("base_nonce", 0)) + (sim + 1)

        # Compute outcome
        crash, payout = self.compute_round(
            target=float(target),
            edge=edge,
            min_multiplier=min_mult,
            display_cap=display_cap,
            server_seed=str(server_seed),
            client_seed=str(client_seed),
            nonce=nonce,
        )

        # Record payout multiplier as the bet win
        self.win_manager.set_spin_win(float(payout))
        self.win_manager.update_gametype_wins(self.gametype)

        # Finalize round
        self.evaluate_finalwin()
        self.imprint_wins()
    
    def run_freespin(self):
        # Limbo game doesn't have freespins
        pass
