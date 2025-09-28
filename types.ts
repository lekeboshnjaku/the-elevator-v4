
import React from 'react';

export enum GameStatus {
  IDLE,
  PLAYING,
  WON,
  LOST,
}

export interface HistoryEntry {
  multiplier: number;
  isWin: boolean;
  // Provably Fair data
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export enum AutoBetAction {
  RESET = 'RESET',
  INCREASE_BY = 'INCREASE_BY',
}

export interface AutoBetSettings {
    numberOfBets: number;
    baseBet: number;
    onWinAction: AutoBetAction;
    onWinValue: number; // Percentage
    onLossAction: AutoBetAction;
    onLossValue: number; // Percentage
    stopOnProfit: number | null;
    stopOnLoss: number | null;
}

export interface CurrencyConfig {
    symbol: string;
    prefix: boolean; // true if symbol comes before the amount, e.g., $10.00
}

/**
 * A custom error class for handling specific API responses.
 * This allows the frontend to distinguish between different types of errors
 * (e.g., 401 Unauthorized vs. 402 Insufficient Funds) and act accordingly.
 */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
    // This is necessary for proper `instanceof` checks with TypeScript.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// --- Achievement System Types ---

export enum AchievementId {
    SKY_RIDER = 'SKY_RIDER',
    ROLLER = 'ROLLER',
    BIG_ROLLER = 'BIG_ROLLER',
    HIGH_ROLLER = 'HIGH_ROLLER',
    ELEVATOR_JAMMER = 'ELEVATOR_JAMMER',
    LUCKY_LIFT = 'LUCKY_LIFT',
    RISK_TAKER = 'RISK_TAKER',
    PRECISION_PLAYER = 'PRECISION_PLAYER',
}

export interface Achievement {
    id: AchievementId;
    name: string;
    description: string;
    icon: React.ReactNode;
}
