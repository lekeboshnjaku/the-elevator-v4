from game_executables import GameExecutables


class GameStateOverride(GameExecutables):
    # Satisfy abstract requirement from GeneralGameState
    def assign_special_sym_function(self):
        """
        Limbo has no special symbols, so provide an
        empty mapping to meet the abstract contract.
        """
        self.special_symbol_functions = {}
