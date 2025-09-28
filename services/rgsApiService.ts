// This service implements a Stake Engine API client for the game.
// It handles all communication with the Stake Engine RGS (Remote Game Server).

import { CurrencyConfig, ApiError } from '../types';
import { provablyFairService } from './provablyFairService';

// --- Interfaces for API calls ---
interface AuthenticateResponse {
    balance: number;
    serverSeedHash: string;
    nonce: number;
    currencyConfig: CurrencyConfig;
    minBet: number;
    maxBet: number;
    minStep: number;
}

interface PlayRequest {
    betAmount: number;
    targetMultiplier: number;
    clientSeed: string;
    nonce: number;
    isInstantBet?: boolean;
}

interface PlayResponse {
    multiplier: number;
    isWin: boolean;
    newBalance: number;
    winAmount: number;
    serverSeed: string; // Revealed seed
}

interface RotateSeedResponse {
    newServerSeedHash: string;
    newNonce: number;
}

// --- Stake Engine API Client ---
class RgsApiClient {
    private authToken: string | null = null;
    private rgsUrl: string | null = null;

    /* -------- Mock-mode fields -------- */
    private useMock = false;
    private mockBalance = 1000;
    private mockServerSeed = '';
    private mockNonce = 1;
    private mockCurrency: CurrencyConfig = { symbol: '$', prefix: true };
    private mockMinBet = 0.01;
    private mockMaxBet = 1000;
    private mockMinStep = 0.01;
    
    public initialize(authToken: string, rgsUrl: string) {
        this.authToken = authToken;
        this.rgsUrl = rgsUrl;
        /* ---- Determine if we should fall back to mock mode ---- */
        this.useMock =
            !authToken ||
            authToken === 'SESSION_TOKEN_FROM_STAKE_PLATFORM';

        /* Prepare mock data */
        if (this.useMock) {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            this.mockServerSeed = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
            this.mockNonce = 1;
            this.mockBalance = 1000;
            console.info('[RGS] Running in MOCK mode');
        } else {
            console.log(`RGS API Client initialized with base URL: ${rgsUrl}`);
        }
    }
    
    public generateClientSeed(): string {
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /* --- Helpers --------------------------------------------------------- */
    private async sha256Hex(input: string): Promise<string> {
        const data = new TextEncoder().encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private async makeRequest<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
        if (!this.rgsUrl || !this.authToken) {
            throw new Error('RGS API client not initialized. Call initialize() first.');
        }

        const url = `${this.rgsUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: body ? JSON.stringify(body) : undefined
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new ApiError(errorData.message || `API error: ${response.statusText}`, response.status);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            
            // Convert generic errors to ApiError with a 500 status
            throw new ApiError(
                error instanceof Error ? error.message : 'Unknown network error', 
                500
            );
        }
    }

    public async authenticate(): Promise<AuthenticateResponse> {
        if (this.useMock) {
            return {
                balance: this.mockBalance,
                serverSeedHash: await this.sha256Hex(this.mockServerSeed),
                nonce: this.mockNonce,
                currencyConfig: this.mockCurrency,
                minBet: this.mockMinBet,
                maxBet: this.mockMaxBet,
                minStep: this.mockMinStep,
            };
        }
        return this.makeRequest<AuthenticateResponse>('/authenticate', 'POST');
    }
    
    public async play(request: PlayRequest): Promise<PlayResponse> {
        if (this.useMock) {
            const { multiplier } = await provablyFairService.verifyBet(
                this.mockServerSeed,
                request.clientSeed,
                request.nonce
            );
            const isWin = multiplier >= request.targetMultiplier;
            const winAmount = isWin
                ? Math.floor(request.betAmount * request.targetMultiplier * 100) / 100
                : 0;
            const newBalanceRaw = isWin
                ? this.mockBalance - request.betAmount + winAmount
                : this.mockBalance - request.betAmount;
            const newBalance = Math.round(newBalanceRaw * 100) / 100;

            // update state
            this.mockBalance = newBalance;
            this.mockNonce += 1;

            return {
                multiplier,
                isWin,
                newBalance,
                winAmount,
                serverSeed: this.mockServerSeed,
            };
        }
        return this.makeRequest<PlayResponse>('/play', 'POST', request);
    }

    public async rotateServerSeed(): Promise<RotateSeedResponse> {
        if (this.useMock) {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            this.mockServerSeed = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
            this.mockNonce = 1;
            return {
                newServerSeedHash: await this.sha256Hex(this.mockServerSeed),
                newNonce: this.mockNonce,
            };
        }
        return this.makeRequest<RotateSeedResponse>('/rotate-server-seed', 'POST');
    }
}

export const rgsApiService = new RgsApiClient();