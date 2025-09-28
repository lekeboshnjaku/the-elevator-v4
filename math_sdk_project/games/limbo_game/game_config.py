from src.config.config import Config
from src.config.distributions import Distribution
from src.config.config import BetMode


class GameConfig(Config):
    def __init__(self):
        super().__init__()
        self.rtp = 0.99
        # providerId_gameNumber_gameName format required by base Config
        self.game_id = "1_0_limbo"
        self.provider_name = "provably_fair"
        self.provider_number = 1
        self.game_name = "limbo"
        self.working_name = "limbo"
        self.wincap = 1_000_000.0
        self.construct_paths(self.game_id)

        # Not used, but kept to satisfy base class expectations
        self.num_reels = 1
        self.num_rows = [1]
        self.paytable = {}
        self.include_padding = False
        self.special_symbols = {None: []}

        # Limbo parameters
        min_multiplier = 1.01
        edge = 0.01
        display_cap = 1_000_000.0

        # Target selection (for simulations)
        targets = [1.01, 1.1, 2.0, 3.0, 5.0, 10.0, 50.0, 100.0, 1000.0]
        target_weights = [5, 5, 10, 10, 15, 20, 15, 10, 10]

        self.bet_modes = [
            BetMode(
                name="base",
                cost=1.0,
                rtp=self.rtp,
                max_win=self.wincap,
                auto_close_disabled=False,
                is_feature=False,
                is_buybonus=False,
                distributions=[
                    Distribution(
                        criteria="base",
                        quota=1.0,
                        conditions={
                            # Minimal required key
                            "reel_weights": {self.basegame_type: {}},
                            # Limbo params
                            "min_multiplier": min_multiplier,
                            "edge": edge,
                            "display_cap": display_cap,
                            "targets": targets,
                            "target_weights": target_weights,
                            # seeds optional; if omitted, defaults used
                        },
                    ),
                ],
            ),
        ]
