// This service implements a Stake Engine API client for the game.
// It handles all communication with the Stake Engine RGS (Remote Game Server).

import { CurrencyConfig, ApiError } from '../../types';
import { logRequest, logResponse, logError, makeRequestId } from './logger';
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
    /** Optional flag sent when Bonus Buy (+20 % cost) is enabled */
    isBonusBuy?: boolean;
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

/* ------------------------------------------------------------------ */
/*                  Runtime response validators                       */
/* ------------------------------------------------------------------ */
const isCurrencyConfig = (v: any): v is CurrencyConfig =>
    !!v && typeof v.symbol === 'string' && typeof v.prefix === 'boolean';

const isAuthenticateResponse = (v: any): v is AuthenticateResponse =>
    !!v &&
    typeof v.balance === 'number' &&
    typeof v.serverSeedHash === 'string' &&
    typeof v.nonce === 'number' &&
    isCurrencyConfig(v.currencyConfig) &&
    typeof v.minBet === 'number' &&
    typeof v.maxBet === 'number' &&
    typeof v.minStep === 'number';

const isPlayResponse = (v: any): v is PlayResponse =>
    !!v &&
    typeof v.multiplier === 'number' &&
    typeof v.isWin === 'boolean' &&
    typeof v.newBalance === 'number' &&
    typeof v.winAmount === 'number' &&
    typeof v.serverSeed === 'string';

const isRotateServerSeedResponse = (v: any): v is RotateSeedResponse =>
    !!v &&
    typeof v.newServerSeedHash === 'string' &&
    typeof v.newNonce === 'number';

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

    /* ------------- Runtime options ------------- */
    private extraHeaders: Record<string, string> = {};
    private requestTimeoutMs = 10_000;
    
    public initialize(
        authToken: string,
        rgsUrl: string,
        options?: { headers?: Record<string, string>; requestTimeoutMs?: number },
    ) {
        this.authToken = authToken;
        this.rgsUrl = rgsUrl;
        this.extraHeaders = options?.headers || {};
        if (options?.requestTimeoutMs) this.requestTimeoutMs = options.requestTimeoutMs;
        /* ---- Determine if we should fall back to mock mode ---- */
        this.useMock =
            !authToken ||
            authToken === 'SESSION_TOKEN_FROM_STAKE_PLATFORM' ||
            !rgsUrl ||
            rgsUrl.startsWith('http://localhost') ||
            rgsUrl.startsWith('https://localhost');

        // Force real mode when hitting Stake Engine production endpoints
        const isStakeProd = /stake[-.]?engine\.com/i.test(rgsUrl);
        if (isStakeProd) {
            this.useMock = false;
        }

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
        // Web Crypto is only available in secure contexts (https or localhost).
        // When served from an insecure origin, `crypto.subtle` will be `undefined`.
        // We fall back to a deterministic (but not cryptographically secure)
        // padding/truncation so the rest of the game logic keeps working.
        try {
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const data = new TextEncoder().encode(input);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                return Array.from(new Uint8Array(hashBuffer))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            }
        } catch {
            /* fall through to fallback */
        }
        // Fallback: repeat the input and pad with zeros to 64-hex-chars length
        return (input + '0'.repeat(64)).slice(0, 64);
    }

    private async makeRequest<T>(
        endpoint: string,
        method: string = 'GET',
        body?: any,
    ): Promise<T> {
        if (!this.rgsUrl || !this.authToken) {
            throw new Error('RGS API client not initialized. Call initialize() first.');
        }

        const url = `${this.rgsUrl}${endpoint}`;
        const reqId = makeRequestId();

        // Merge headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.authToken}`,
            ...this.extraHeaders,
        };

        // Mask auth for log
        const safeHeaders = { ...headers, Authorization: 'Bearer ***' };
        logRequest(reqId, { method, url, headers: safeHeaders, body });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeout);

            const plainHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => (plainHeaders[key] = value));

            let parsedBody: any;
            try {
                parsedBody = await response.clone().json();
            } catch {
                parsedBody = await response.text();
            }

            const preview =
                typeof parsedBody === 'string' ? parsedBody.slice(0, 500) : parsedBody;
            logResponse(reqId, {
                status: response.status,
                ok: response.ok,
                headers: plainHeaders,
                body: preview,
            });

            if (!response.ok) {
                const message =
                    (parsedBody && (parsedBody.message || parsedBody.error || parsedBody.details)) ||
                    `HTTP ${response.status}`;
                throw new ApiError(message, response.status);
            }

            return parsedBody as T;
        } catch (error: any) {
            logError(reqId, error);
            if (error instanceof ApiError) throw error;
            if (error.name === 'AbortError') {
                throw new ApiError('Request timed out', 504);
            }
            throw new ApiError(error?.message || 'Network error', 500);
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
        const data = await this.makeRequest<unknown>('/authenticate', 'POST');
        if (!isAuthenticateResponse(data)) {
            throw new ApiError('Invalid authenticate response format', 502);
        }
        return data;
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
        const data = await this.makeRequest<unknown>('/play', 'POST', request);
        if (!isPlayResponse(data)) {
            throw new ApiError('Invalid play response format', 502);
        }
        return data;
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
        const data = await this.makeRequest<unknown>('/rotate-server-seed', 'POST');
        if (!isRotateServerSeedResponse(data)) {
            throw new ApiError('Invalid rotate-server-seed response format', 502);
        }
        return data;
    }
}

export const rgsApiService = new RgsApiClient();
