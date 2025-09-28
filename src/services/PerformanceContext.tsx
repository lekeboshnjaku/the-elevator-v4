import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Device profile and performance settings
 */
export type DeviceProfile = {
  isTouch: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  maxFps: number;
  animationScale: number;
  confettiCount: number;
  reduceEffects: boolean;
};

/**
 * Detects device profile based on window properties
 */
const detectProfile = (win: Window): DeviceProfile => {
  // Check for touch support
  const isTouch = 'ontouchstart' in win || 
    (win.matchMedia && win.matchMedia('(pointer: coarse)').matches);
  
  // Check screen width
  const width = win.innerWidth;
  
  // Check user agent for mobile/tablet indicators
  const ua = navigator.userAgent;
  const uaHasMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const uaHasTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  
  // Determine device type based on width and UA
  const isMobile = width <= 480 || (uaHasMobile && !uaHasTablet);
  const isTablet = !isMobile && (width <= 1024 || uaHasTablet);
  const isDesktop = !isMobile && !isTablet;
  
  // Set performance parameters based on device
  const maxFps = isMobile ? 30 : (isTablet ? 45 : 60);
  const animationScale = isMobile ? 0.85 : (isTablet ? 0.9 : 1);
  const confettiCount = isMobile ? 28 : (isTablet ? 45 : 80);
  
  // Check for reduced motion preference
  const prefersReducedMotion = win.matchMedia && 
    win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Detect potentially low-end devices
  const isLowEnd = 
    (isMobile || isTablet) && 
    (navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false);
  
  const reduceEffects = (isMobile || isTablet) && (prefersReducedMotion || isLowEnd);
  
  return {
    isTouch,
    isMobile,
    isTablet,
    isDesktop,
    maxFps,
    animationScale,
    confettiCount,
    reduceEffects
  };
};

/**
 * Gets initial profile with SSR safety
 */
const getInitialProfile = (): DeviceProfile => {
  // Default to desktop for SSR
  const defaultProfile: DeviceProfile = {
    isTouch: false,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    maxFps: 60,
    animationScale: 1,
    confettiCount: 80,
    reduceEffects: false
  };
  
  // Check if window is available (client-side)
  if (typeof window !== 'undefined') {
    return detectProfile(window);
  }
  
  return defaultProfile;
};

/**
 * Performance context with desktop defaults
 */
export const PerformanceContext = createContext<DeviceProfile>({
  isTouch: false,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  maxFps: 60,
  animationScale: 1,
  confettiCount: 80,
  reduceEffects: false
});

/**
 * Provider that computes profile on mount and window changes
 */
export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<DeviceProfile>(getInitialProfile());
  
  // Update profile when window properties change
  const handleResize = useCallback(() => {
    if (typeof window !== 'undefined') {
      setProfile(detectProfile(window));
    }
  }, []);
  
  useEffect(() => {
    // Set initial profile
    handleResize();
    
    // Debounced resize handler
    let timeoutId: number | null = null;
    
    const debouncedResize = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(handleResize, 250);
    };
    
    // Listen for resize and orientation change
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);
  
  return (
    <PerformanceContext.Provider value={profile}>
      {children}
    </PerformanceContext.Provider>
  );
};

/**
 * Hook for consuming performance context
 */
export const usePerformance = () => useContext(PerformanceContext);
