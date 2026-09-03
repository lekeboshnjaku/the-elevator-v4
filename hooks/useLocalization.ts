
import { useMemo } from 'react';

// Dictionary of keys and their translations
const translations = {
    en: {
        // Controls.tsx
        betAmount: 'Bet Amount',
        targetMultiplier: 'Target Multiplier',
        winChance: 'Win Chance',
        placeBet: 'Place Bet',
        startAutoBet: 'Start Auto-Bet',
        stopAutoBet: 'Stop Auto-Bet',
        betsRemaining: (count: number) => `Stop Auto-Bet (${count} Left)`,
        resolving: 'Resolving...',
        ascending: 'Ascending...',
        rules: 'Rules',
        fairness: 'Fairness',
        manual: 'Manual',
        auto: 'Auto',
        mathTitle: 'Math Summary',
        // RulesModal.tsx
        rulesTitle: 'Game Rules',
        rulesObjective: 'Objective',
        rulesObjectiveText: 'Place a bet and choose a target multiplier. The elevator will start "going up" to a random multiplier. If the elevator reaches or exceeds your target, you win!',
        rulesPayout: 'Payout',
        rulesPayoutText: 'Your win amount is your',
        rulesPayoutBetAmount: 'Bet Amount',
        rulesPayoutTargetMultiplier: 'Target Multiplier',
        rulesElevateTitle: 'Elevate Mode',
        rulesElevateText: 'Increases your bet by +200% and unlocks higher volatility with a bias toward extreme multipliers. When Elevate Mode is active, the Target Multiplier is enabled and can be set up to 100,000x.',
        rulesElevateVolatility: 'Volatility Disclaimer: Elevate Mode greatly reduces the chance of small wins while significantly increasing the chance of very large multipliers.',
        rulesRtp: 'Return to Player (RTP)',
        rulesMaxWin: 'Maximum Win',
        rulesRtpNote: '≈ 99.00% (Varies Slightly per Mode)',
        rulesFairnessTitle: 'Provably Fair',
        rulesFairnessText: 'This game uses a cryptographic system to ensure its fairness. The outcome of each bet is determined by a combination of a secret server seed and a public client seed, making it impossible for the operator to manipulate the results. You can verify each bet in the game history.',
        // RealityCheckModal.tsx
        totalWagered: 'Total Wagered',
    },
    sweeps_en: {
        // Controls.tsx
        betAmount: 'Play Amount',
        targetMultiplier: 'Target Multiplier',
        winChance: 'Win Chance',
        placeBet: 'Place Play',
        startAutoBet: 'Start Auto-Play',
        stopAutoBet: 'Stop Auto-Play',
        betsRemaining: (count: number) => `Stop Auto-Play (${count} Left)`,
        resolving: 'Resolving...',
        ascending: 'Ascending...',
        rules: 'Rules',
        fairness: 'Fairness',
        manual: 'Manual',
        auto: 'Auto',
        mathTitle: 'Math Summary',
        // RulesModal.tsx
        rulesTitle: 'Game Rules',
        rulesObjective: 'Objective',
        rulesObjectiveText: 'Make a play and choose a target multiplier. The elevator will start "going up" to a random multiplier. If the elevator reaches or exceeds your target, you win!',
        rulesPayout: 'Win Potential',
        rulesPayoutText: 'Your win amount is your',
        rulesPayoutBetAmount: 'Play Amount',
        rulesPayoutTargetMultiplier: 'Target Multiplier',
        rulesElevateTitle: 'Elevate Mode',
        rulesElevateText: 'Increases your play by +200% and unlocks higher volatility with a bias toward extreme multipliers. When Elevate Mode is active, the Target Multiplier is enabled and can be set up to 100,000x.',
        rulesElevateVolatility: 'Volatility Disclaimer: Elevate Mode greatly reduces the chance of small wins while significantly increasing the chance of very large multipliers.',
        rulesRtp: 'Return to Player (RTP)',
        rulesMaxWin: 'Maximum Win',
        rulesRtpNote: '≈ 99.00% (Varies Slightly per Mode)',
        rulesFairnessTitle: 'Provably Fair',
        rulesFairnessText: 'This game uses a cryptographic system to ensure its fairness. The outcome of each play is determined by a combination of a secret server seed and a public client seed, making it impossible for the operator to manipulate the results. You can verify each play in the game history.',
        // RealityCheckModal.tsx
        totalWagered: 'Total Played',
    },
};

type TranslationKey = keyof (typeof translations.en & typeof translations.sweeps_en);

export const useLocalization = (isSocialMode: boolean) => {
    const lang = isSocialMode ? 'sweeps_en' : 'en';

    const t = useMemo(() => {
        // Relaxed signature: accept any string. Components that expect
        // `(key: string, ...args: any[]) => string` will now be satisfied.
        return (key: string, ...args: any[]) => {
            // Cast to TranslationKey for dictionary lookup; if missing, fallback.
            const template =
                (translations[lang] as any)[key as TranslationKey] ??
                (translations['en'] as any)[key as TranslationKey];

            // If the key is not found in either dictionary, return the key itself.
            if (!template) {
                return key;
            }

            if (typeof template === 'function') {
                return (template as (...a: any[]) => string)(...args);
            }
            return template;
        };
    }, [lang]);

    return { t };
};