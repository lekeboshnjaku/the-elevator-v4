
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