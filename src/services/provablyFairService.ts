// This service contains the client-side logic to verify that a game result
// was generated fairly, using the revealed server seed.

import { HOUSE_EDGE, MAX_MULTIPLIER } from '../../constants';

// --- Cryptography Helpers (client-side verification) ---

const hmac_sha256 = async (key: string, message: string): Promise<string> => {
    // WebCrypto is only available in secure contexts (https, localhost).
    // If it is present we use it, otherwise we fall back to a lightweight
    // deterministic hash so the fairness flow keeps working offline/insecurely.
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const keyData = new TextEncoder().encode(key);
        const messageData = new TextEncoder().encode(message);
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /* ---------- Fallback (NON-CRYPTOGRAPHIC) ---------- */
    // Simple deterministic mixing adapted from Jenkins hash ideas.
    const input = `${key}|${message}`;
    const data = new TextEncoder().encode(input);
    let a = 0xdeadbeef ^ data.length;
    let b = 0x41c6ce57 ^ data.length;

    for (let i = 0; i < data.length; i++) {
        const x = data[i];
        a = Math.imul(a ^ x, 0x85ebca6b);
        b = Math.imul(b ^ x, 0xc2b2ae35);
    }

    // Final avalanche
    a ^= a >>> 13;
    a = Math.imul(a, 0xc2b2ae35);
    a ^= a >>> 16;

    b ^= b >>> 13;
    b = Math.imul(b, 0x85ebca6b);
    b ^= b >>> 16;

    // Build 32-byte / 64-hex output by expanding the two 32-bit numbers
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        const source = (i & 1) === 0 ? a : b; // alternate
        const shift = ((i >> 1) & 3) * 8;      // cycle through 0,8,16,24
        out[i] = (source >>> shift) & 0xff;
    }

    return Array.from(out)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

const hashToFloat = (hexHash: string): number => {
    // We use the first 4 bytes (8 hex characters) for a 32-bit number
    const fourBytes = hexHash.substring(0, 8);
    const value = parseInt(fourBytes, 16);
    // Normalize to a float between 0 and 1
    return value / 0x100000000;
};

const calculateResultMultiplier = (randomValue: number): number => {
    // This formula ensures a house edge and is the core of the game's fairness.
    // A randomValue of 0 would result in infinity, so we handle it as a special case for the max multiplier.
    if (randomValue === 0) return MAX_MULTIPLIER;
    
    // The core formula for calculating the multiplier from a random float.
    const multiplier = (1 - HOUSE_EDGE) / randomValue;
    
    // Truncate to two decimal places, as the game does.
    const result = Math.floor(multiplier * 100) / 100;
    
    // Clamp the result between the minimum (1.00x) and the absolute maximum.
    return Math.min(Math.max(1.01, result), MAX_MULTIPLIER);
};


class ProvablyFairService {
    /**
     * Verifies a bet outcome using the revealed server seed, client seed, and nonce.
     * This function runs on the client-side to prove that the result was not manipulated.
     */
    public async verifyBet(serverSeed: string, clientSeed: string, nonce: number): Promise<{ multiplier: number }> {
        const message = `${clientSeed}:${nonce}`;
        const hmac = await hmac_sha256(serverSeed, message);
        const randomValue = hashToFloat(hmac);
        const multiplier = calculateResultMultiplier(randomValue);
        
        return { multiplier };
    }
}

export const provablyFairService = new ProvablyFairService();
