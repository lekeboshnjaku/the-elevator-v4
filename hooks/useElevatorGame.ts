import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GameStatus, HistoryEntry, AutoBetSettings, AutoBetAction, CurrencyConfig, ApiError, AchievementId, Achievement } from '../types';
import { rgsApiService } from '../src/services/rgsApiService';
import { audioService } from '../src/services/audioService';
import { aiService } from '../services/aiService';
import { getElevateCost } from '../src/services/mathConfigService';
import { MAX_MULTIPLIER } from '../constants';
import { allAchievements } from '../data/achievementData';

// Thematic voice lines for each achievement
const achievementAnnouncements: Record<AchievementId, string> = {
    [AchievementId.SKY_RIDER]: "Altitude warning bypassed. Achievement: Sky Rider.",
    [AchievementId.ROLLER]: "Spending threshold reached. Classification: Roller.",
    [AchievementId.BIG_ROLLER]: "Significant wager detected. Classification: Big Roller.",
    [AchievementId.HIGH_ROLLER]: "Designation confirmed: High Roller.",
    [AchievementId.ELEVATOR_JAMMER]: "Repetitive failure protocol initiated. Achievement: Elevator Jammer.",
    [AchievementId.LUCKY_LIFT]: "Statistical anomaly registered. Achievement: Lucky Lift.",
    [AchievementId.RISK_TAKER]: "High-risk maneuver successful. Designation: Risk Taker.",
    [AchievementId.PRECISION_PLAYER]: "Target parameters met with zero deviation. Precision Player.",
};


export const useElevatorGame = (isInstantBet: boolean) => {
  const [balance, setBalance] = useState<number>(0);
  const [_betAmount, _setBetAmount] = useState<string>('0.00');
  const [targetMultiplier, setTargetMultiplier] = useState<string>('2.00');
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastResult, setLastResult] = useState<HistoryEntry | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);
  const [isBonusBuy, setIsBonusBuy] = useState<boolean>(false);
  const [elevateCost, setElevateCost] = useState<number>(1.2);

  // --- State from Backend ---
  const [clientSeed, setClientSeed] = useState<string>('');
  const [serverSeedHash, setServerSeedHash] = useState<string>('');
  const [nonce, setNonce] = useState<number>(0);
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>({ symbol: '$', prefix: true });
  const [betLimits, setBetLimits] = useState({ minBet: 0.01, maxBet: 1000, minStep: 0.01 });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- Session Tracking State ---
  const [sessionProfit, setSessionProfit] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [totalWagered, setTotalWagered] = useState(0);
  
  // --- Auto Bet State ---
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [autoBetSettings, setAutoBetSettings] = useState<AutoBetSettings | null>(null);
  const [betsRemaining, setBetsRemaining] = useState(0);
  const lastPlacedBetAmount = useRef(0);
  const placeNextAutoBet = useRef(false);
  const autoBetSessionProfit = useRef(0);

  // --- Ambient Audio Timer ---
  const [isInitialWelcomeDone, setInitialWelcomeDone] = useState(false);
  const ambientTimerRef = useRef<number | null>(null);
  const isFirstAmbientCall = useRef(true);
  
  // --- Achievement State ---
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<AchievementId>>(new Set());
  const [newlyUnlockedQueue, setNewlyUnlockedQueue] = useState<Achievement[]>([]);
  const lossStreak = useRef(0);
  const luckyLiftStreak = useRef(0);

  /* ------------------------------------------------------------ */
  /*  BET AMOUNT (must be declared BEFORE first usage)             */
  /* ------------------------------------------------------------ */
  const betAmount = _betAmount;

  // Calculate effective bet amount (includes bonus buy cost)
  const effectiveBetAmount = useMemo(() => {
    const bet = parseFloat(betAmount);
    return isNaN(bet) ? 0 : bet * (isBonusBuy ? elevateCost : 1);
  }, [betAmount, isBonusBuy]);

  /* ------------------------------------------------------------ */
  /*  Max allowed multiplier depends on Elevate Mode              */
  /* ------------------------------------------------------------ */
  const maxAllowedMultiplier = MAX_MULTIPLIER;

  const initializeGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Reset to game defaults on every load
    _setBetAmount('0.00');
    setTargetMultiplier('2.00');
    setIsBonusBuy(false);
    // Reset session tracking
    setSessionStartTime(new Date());
    setTotalWagered(0);
    setSessionProfit(0);
    try {
      const response = await rgsApiService.authenticate();
      setBalance(response.balance);
      setServerSeedHash(response.serverSeedHash);
      setClientSeed(rgsApiService.generateClientSeed());
      setNonce(response.nonce);
      setCurrencyConfig(response.currencyConfig);
      setBetLimits({ minBet: response.minBet, maxBet: response.maxBet, minStep: response.minStep });

    } catch (e) {
      let message = "Failed to connect to the game server.";
      if (e instanceof ApiError) {
        message = `Connection Error: ${e.message} (Code: ${e.status})`;
      } else if (e instanceof Error) {
        message = e.message;
      }
      setError(message);
      console.error(e);
      throw e; // Re-throw to let the caller know initialization failed
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { getElevateCost().then(setElevateCost).catch(() => {}); }, []);

  const playWelcomeMessage = useCallback(async () => {
    // Fetch a random, pre-approved welcome message.
    const fullIntroSequence = await aiService.generateInitialGreeting();
    audioService.playCellphoneBeep();

    const speakSequentially = (parts: string[], index: number) => {
        if (index >= parts.length) {
            setInitialWelcomeDone(true); // Signal that the full welcome is complete
            return;
        }
        const currentPart = parts[index];
        // Queue the audio for the current part. The onEnd callback will trigger the next part.
        audioService.speak(currentPart, true, () => {
            speakSequentially(parts, index + 1);
        });
    };

    speakSequentially(fullIntroSequence, 0);
  }, []);

  const setBetAmount = (value: string) => {
    if (/^\d*\.?\d{0,2}$/.test(value)) {
        _setBetAmount(value);
    }
  };

  const canBet = useMemo(() => {
    const bet = parseFloat(betAmount);
    const target = parseFloat(targetMultiplier);
    const isBetValid =
      !isNaN(bet) &&
      bet >= betLimits.minBet &&
      bet <= betLimits.maxBet &&
      effectiveBetAmount <= balance;
    const isTargetValid = !isNaN(target) && target >= 1.01 && target <= maxAllowedMultiplier;
    return isBetValid && isTargetValid && gameStatus === GameStatus.IDLE && !isAutoBetting;
  }, [betAmount, targetMultiplier, balance, gameStatus, isAutoBetting, betLimits, effectiveBetAmount, maxAllowedMultiplier]);
  
  const isBetAmountInvalid = useMemo(() => {
    const bet = parseFloat(betAmount);
    return !isNaN(bet) && bet > 0 && effectiveBetAmount > balance;
  }, [betAmount, balance, effectiveBetAmount]);

  const toggleBonusBuy = useCallback(() => {
    setIsBonusBuy(prev => {
      const turningOn = !prev;
      /* ------------------------------------------------------------
         Operator voice-over: one line per toggle event
         ON  -> pick from elevateOnLines
         OFF -> pick from elevateOffLines
      ------------------------------------------------------------ */
      const elevateOnLines = [
        'Elevate Mode activated',
        'To the moon',
        'High roller engaged',
      ] as const;

      const elevateOffLines = [
        'Back to base',
        'Elevate Mode deactivated',
      ] as const;

      const pool = turningOn ? elevateOnLines : elevateOffLines;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      audioService.speak(chosen, false);

      return !prev;
    });
  }, []);

  const rotateServerSeed = async () => {
      const { newServerSeedHash, newNonce } = await rgsApiService.rotateServerSeed();
      setServerSeedHash(newServerSeedHash);
      setNonce(newNonce);
  }

  const checkAndUnlockAchievements = useCallback((result: HistoryEntry, betAmountValue: number, targetMultiplierValue: number) => {
      const newlyUnlocked: Achievement[] = [];
      const currentUnlocked = new Set(unlockedAchievements);

      const unlock = (id: AchievementId) => {
          if (!currentUnlocked.has(id)) {
              const achievement = allAchievements.get(id);
              if (achievement) {
                  newlyUnlocked.push(achievement);
                  currentUnlocked.add(id);
              }
          }
      };

      // Update streaks
      if (result.isWin) {
          lossStreak.current = 0;
          if (result.multiplier === 2.00) {
              luckyLiftStreak.current += 1;
          } else {
              luckyLiftStreak.current = 0;
          }
      } else {
          lossStreak.current += 1;
          luckyLiftStreak.current = 0;
      }

      // --- Check All Achievements ---
      if (result.isWin) {
          // Sky Rider
          if (result.multiplier >= 10) unlock(AchievementId.SKY_RIDER);
          // Risk Taker
          if (result.multiplier >= 20) unlock(AchievementId.RISK_TAKER);
          // Precision Player
          if (result.multiplier === targetMultiplierValue) unlock(AchievementId.PRECISION_PLAYER);
      }
      
      // High Roller Tiers
      if (betAmountValue >= 50) unlock(AchievementId.ROLLER);
      if (betAmountValue >= 200) unlock(AchievementId.BIG_ROLLER);
      if (betAmountValue >= 500) unlock(AchievementId.HIGH_ROLLER);

      // Elevator Jammer
      if (lossStreak.current >= 5) unlock(AchievementId.ELEVATOR_JAMMER);
      
      // Lucky Lift
      if (luckyLiftStreak.current >= 3) unlock(AchievementId.LUCKY_LIFT);
      
      if (newlyUnlocked.length > 0) {
          // Announce each newly unlocked achievement.
          newlyUnlocked.forEach(achievement => {
              const announcement = achievementAnnouncements[achievement.id];
              if (announcement) {
                  // Use high priority to interrupt any other ambient chatter.
                  audioService.speak(announcement, true);
              }
          });
          
          setUnlockedAchievements(new Set(currentUnlocked));
          setNewlyUnlockedQueue(prev => [...prev, ...newlyUnlocked]);
      }
  }, [unlockedAchievements]);


  const placeBet = useCallback(async () => {
    const bet = parseFloat(betAmount);
    const target = parseFloat(targetMultiplier);
    const currentBalance = balance; // Capture balance at time of bet
    const effectiveCost = bet * (isBonusBuy ? elevateCost : 1);
    const isBetValid = !isNaN(bet) && bet >= betLimits.minBet && bet <= betLimits.maxBet && effectiveCost <= currentBalance;
    const isTargetValid = !isNaN(target) && target >= 1.01 && target <= maxAllowedMultiplier;

    if (gameStatus !== GameStatus.IDLE || !isBetValid || !isTargetValid) return;

    setGameStatus(GameStatus.PLAYING);
    if(error) setError(null);
    setTotalWagered(prev => prev + effectiveCost); // Track total wagered for reality check
    setBalance(prev => prev - effectiveCost);
    lastPlacedBetAmount.current = bet;

    try {
      const betResult = await rgsApiService.play({
        betAmount: bet,
        targetMultiplier: target,
        clientSeed,
        nonce,
        isInstantBet,
        isBonusBuy,
      });

      const entry: HistoryEntry = {
        multiplier: betResult.multiplier,
        isWin: betResult.isWin,
        serverSeed: betResult.serverSeed,
        clientSeed: clientSeed,
        nonce: nonce,
      };

      setLastResult(entry);
      setHistory(prev => [entry, ...prev.slice(0, 14)]);
      setNonce(n => n + 1);
      
      // Calculate win amount and update balance manually (don't trust backend newBalance)
      const winAmount = betResult.isWin ? bet * target : 0;
      setBalance(currentBalance - effectiveCost + winAmount);
      
      const profitChange = betResult.isWin ? winAmount - effectiveCost : -effectiveCost;
      setSessionProfit(prev => prev + profitChange);

      if (betResult.isWin) {
        setGameStatus(GameStatus.WON);
        setLastWinAmount(winAmount);
      } else {
        setGameStatus(GameStatus.LOST);
        setLastWinAmount(0);
      }
      
      checkAndUnlockAchievements(entry, bet, target);

    } catch (e) {
        console.error("Bet failed:", e);
        if (e instanceof ApiError) {
             setError(`${e.message} (Code: ${e.status})`);
        } else if (e instanceof Error) {
            setError(`An error occurred: ${e.message}. Bet refunded.`);
        } else {
            setError("An unknown error occurred. Bet refunded.");
        }
        setBalance(prev => prev + effectiveCost);
        setTotalWagered(prev => prev - effectiveCost); // Refund wager from tracking
        setGameStatus(GameStatus.IDLE);
        setLastWinAmount(0);
    }
  }, [betAmount, targetMultiplier, clientSeed, nonce, balance, gameStatus, betLimits, error, isInstantBet, checkAndUnlockAchievements, isBonusBuy]);
  
  useEffect(() => {
    if (gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST) {
      const resultDisplayTime = isInstantBet ? 200 : 1000;
      const timer = setTimeout(() => {
        setGameStatus(GameStatus.IDLE);
      }, resultDisplayTime);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, isInstantBet]);

  // --- Ambient Operator Calling Loop ---
  useEffect(() => {
      // Determines if the ambient sound/voice loop should be running.
      const isLoopActive = isInitialWelcomeDone && (gameStatus === GameStatus.IDLE || gameStatus === GameStatus.PLAYING) && !isAutoBetting;

      const scheduleNextCall = () => {
          // Clear any *previous* timer ID before setting a new one.
          if (ambientTimerRef.current) {
              clearTimeout(ambientTimerRef.current);
          }
          
          // Use a longer, fixed delay for the very first call after the welcome message,
          // and for the first call after any period of activity.
          const randomDelay = isFirstAmbientCall.current
              ? 30000 // 30-second delay for the first call in an idle period
              : Math.random() * 30000 + 30000; // 30s to 60s for subsequent calls

          if (isFirstAmbientCall.current) {
              isFirstAmbientCall.current = false;
          }
          
          ambientTimerRef.current = window.setTimeout(async () => {
              // Decide whether to play a voice line or an ambient sound
              if (Math.random() > 0.85) { // 15% chance for a voice line
                const line = aiService.generateAmbientLine();
                if (line) {
                    audioService.speak(line, false);
                }
              } else { // 85% chance for an ambient sound
                await audioService.playAmbientSound();
              }
              // Once the action is done, schedule the next one.
              scheduleNextCall();
          }, randomDelay);
      };

      if (isLoopActive) {
          // If the loop should be active, only start it if there isn't one already running.
          // This prevents the timer from resetting when transitioning between IDLE and PLAYING states.
          if (!ambientTimerRef.current) {
              scheduleNextCall();
          }
      } else {
          // If the loop should be inactive, clear any running timer and reset state.
          if (ambientTimerRef.current) {
              clearTimeout(ambientTimerRef.current);
              ambientTimerRef.current = null;
              isFirstAmbientCall.current = true;
          }
      }

      // Cleanup on unmount
      return () => {
          if (ambientTimerRef.current) {
              clearTimeout(ambientTimerRef.current);
          }
      };
  }, [isInitialWelcomeDone, gameStatus, isAutoBetting]);


  // --- Auto Bet Logic ---
  const stopAutoBet = useCallback(() => {
    setIsAutoBetting(false);
    setAutoBetSettings(null);
  }, []);

  // --- Page Visibility for Auto Bet ---
  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.hidden && isAutoBetting) {
              stopAutoBet();
              setError("Auto-betting paused due to tab inactivity.");
          }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
  }, [isAutoBetting, stopAutoBet]);

  const startAutoBet = useCallback((settings: AutoBetSettings) => {
    setAutoBetSettings(settings);
    setBetsRemaining(settings.numberOfBets);
    autoBetSessionProfit.current = 0;
    setIsAutoBetting(true);
    placeNextAutoBet.current = true;
  }, []);

  useEffect(() => {
    // This effect triggers placing the next bet in the auto-bet sequence.
    if (isAutoBetting && gameStatus === GameStatus.IDLE && placeNextAutoBet.current) {
        if (betsRemaining <= 0) {
            stopAutoBet();
            return;
        }
        placeNextAutoBet.current = false;
        
        // Decrement the counter immediately before placing the bet for a real-time countdown feel.
        setBetsRemaining(prev => prev - 1);

        const nextBetDelay = isInstantBet ? 0 : 200;
        setTimeout(() => placeBet(), nextBetDelay);
    }
  }, [isAutoBetting, gameStatus, betsRemaining, stopAutoBet, placeBet, isInstantBet]);

  useEffect(() => {
    // This effect processes the result of an auto-bet and queues the next one.
    if (!isAutoBetting || (gameStatus !== GameStatus.WON && gameStatus !== GameStatus.LOST) || !autoBetSettings || !lastResult) {
      return;
    }
    
    const effectiveCost = lastPlacedBetAmount.current * (isBonusBuy ? elevateCost : 1);
    const profitChange = lastResult.isWin ? (parseFloat(targetMultiplier) * lastPlacedBetAmount.current) - effectiveCost : -effectiveCost;
    autoBetSessionProfit.current += profitChange;
    
    // Check for stop conditions based on profit/loss or if the last bet has finished.
    if (betsRemaining <= 0 || 
        (autoBetSettings.stopOnProfit && autoBetSessionProfit.current >= autoBetSettings.stopOnProfit) || 
        (autoBetSettings.stopOnLoss && autoBetSessionProfit.current <= -autoBetSettings.stopOnLoss) ) {
      
      stopAutoBet();
      return;
    }
    
    // The counter is now decremented BEFORE the bet is placed. We no longer decrement it here.

    let nextBet = parseFloat(betAmount);
    const action = lastResult.isWin ? autoBetSettings.onWinAction : autoBetSettings.onLossAction;
    const value = lastResult.isWin ? autoBetSettings.onWinValue : autoBetSettings.onLossValue;

    if (action === AutoBetAction.RESET) {
      nextBet = autoBetSettings.baseBet;
    } else if (action === AutoBetAction.INCREASE_BY) {
      nextBet *= (1 + value / 100);
    }
    
    const clampedBet = Math.max(betLimits.minBet, Math.min(betLimits.maxBet, nextBet));
    const effectiveNextBet = clampedBet * (isBonusBuy ? elevateCost : 1);
    
    if (effectiveNextBet > balance) {
      setError("Auto-bet stopped due to insufficient funds.");
      stopAutoBet();
      return;
    }

    _setBetAmount(clampedBet.toFixed(2));
    placeNextAutoBet.current = true;

  }, [gameStatus, isAutoBetting, autoBetSettings, lastResult, stopAutoBet, balance, betLimits, targetMultiplier, betAmount, betsRemaining, setError, isBonusBuy]);
  
  const clearNewlyUnlockedQueue = () => {
      setNewlyUnlockedQueue([]);
  };

  return {
    balance,
    betAmount,
    setBetAmount,
    targetMultiplier,
    setTargetMultiplier,
    gameStatus,
    history,
    lastResult,
    placeBet,
    canBet,
    isBetAmountInvalid,
    clientSeed,
    setClientSeed,
    serverSeedHash,
    nonce,
    rotateServerSeed,
    isAutoBetting,
    startAutoBet,
    stopAutoBet,
    betsRemaining,
    loading,
    error,
    clearError: () => setError(null),
    currencyConfig,
    betLimits,
    lastWinAmount,
    sessionProfit,
    sessionStartTime,
    totalWagered,
    initializeGame,
    playWelcomeMessage,
    // Achievements
    unlockedAchievements,
    newlyUnlockedQueue,
    clearNewlyUnlockedQueue,
    // Bonus Buy
    isBonusBuy,
    toggleBonusBuy,
    effectiveBetAmount,
    elevateCost,
  };
};





