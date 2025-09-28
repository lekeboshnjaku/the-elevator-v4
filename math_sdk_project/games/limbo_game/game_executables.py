from game_calculations import GameCalculations


class GameExecutables(GameCalculations):
    def compute_round(self, target: float, edge: float, min_multiplier: float, display_cap: float | None,
                      server_seed: str, client_seed: str, nonce: int) -> tuple[float, float]:
        """
        Returns (crash_multiplier, payout_multiplier)
        payout is target if crash >= target else 0
        """
        u = self.pf_uniform(server_seed, client_seed, nonce)
        crash = self.crash_multiplier(u, edge, min_multiplier, display_cap)
        payout = target if crash >= target else 0.0
        return crash, payout
