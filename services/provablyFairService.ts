
// This service contains the client-side logic to verify that a game result
// was generated fairly, using the revealed server seed.

import { HOUSE_EDGE, MAX_MULTIPLIER } from '../constants';

// --- Cryptography Helpers (client-side verification) ---

const hmac_sha256 = async (key: string, message: string): Promise<string> => {
    const keyData = new TextEncoder().encode(key);
    const messageData = new TextEncoder().encode(message);
    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    return Math.min(Math.max(1.00, result), MAX_MULTIPLIER);
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