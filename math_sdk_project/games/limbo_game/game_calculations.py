from src.executables.executables import Executables
import hmac
import hashlib


class GameCalculations(Executables):
    def _hmac_sha256(self, server_seed: str, message: str) -> bytes:
        key = server_seed.encode('utf-8')
        msg = message.encode('utf-8')
        return hmac.new(key, msg, hashlib.sha256).digest()

    def _uniform_from_hash(self, digest: bytes) -> float:
        # Use first 8 bytes (64-bit) for uniform in (0,1)
        n = int.from_bytes(digest[:8], 'big')
        if n == 0:
            # Avoid zero; shift by 1
            n = 1
        return n / float(2**64)

    def pf_uniform(self, server_seed: str, client_seed: str, nonce: int) -> float:
        digest = self._hmac_sha256(server_seed, f"{client_seed}:{nonce}")
        return self._uniform_from_hash(digest)

    def crash_multiplier(self, u: float, edge: float, min_multiplier: float, display_cap: float | None = None) -> float:
        if u <= 0.0:
            u = 1.0 / (2**64)
        raw = max(min_multiplier, (1.0 - edge) / u)
        if display_cap is not None:
            return min(raw, float(display_cap))
        return raw
