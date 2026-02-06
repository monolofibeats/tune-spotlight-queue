import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type PerformanceMode = 'heavy' | 'light';

interface PerformanceModeContextType {
  mode: PerformanceMode;
  setMode: (mode: PerformanceMode) => void;
  toggleMode: () => void;
  showPrompt: boolean;
  dismissPrompt: () => void;
  isChrome: boolean;
  hasPerformanceIssue: boolean;
}

const PerformanceModeContext = createContext<PerformanceModeContextType | undefined>(undefined);

const STORAGE_KEY = 'upstar-performance-mode';
const PROMPT_DISMISSED_KEY = 'upstar-performance-prompt-dismissed';

function detectChrome(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('chrome') && !userAgent.includes('edg') && !userAgent.includes('opr');
}

function detectPerformanceIssue(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      resolve(false);
      return;
    }

    let frameCount = 0;
    let lastTime = performance.now();
    const frameTimes: number[] = [];
    
    const measureFrame = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;
      
      if (frameCount > 0) {
        frameTimes.push(delta);
      }
      
      frameCount++;
      
      if (frameCount < 30) {
        requestAnimationFrame(measureFrame);
      } else {
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const avgFPS = 1000 / avgFrameTime;
        // Consider it a performance issue if FPS drops below 30
        resolve(avgFPS < 30);
      }
    };
    
    requestAnimationFrame(measureFrame);
  });
}

export function PerformanceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PerformanceMode>('heavy');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [hasPerformanceIssue, setHasPerformanceIssue] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Check saved preference
    const savedMode = localStorage.getItem(STORAGE_KEY) as PerformanceMode | null;
    const promptDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true';
    
    if (savedMode) {
      setModeState(savedMode);
      setInitialized(true);
      return;
    }

    // Detect Chrome
    const chromeDetected = detectChrome();
    setIsChrome(chromeDetected);

    // Detect performance issues
    detectPerformanceIssue().then((hasIssue) => {
      setHasPerformanceIssue(hasIssue);
      
      // Show prompt if Chrome or performance issue, and not dismissed before
      if ((chromeDetected || hasIssue) && !promptDismissed) {
        setShowPrompt(true);
      }
      
      setInitialized(true);
    });
  }, []);

  const setMode = useCallback((newMode: PerformanceMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'heavy' ? 'light' : 'heavy';
    setMode(newMode);
  }, [mode, setMode]);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
  }, []);

  // Apply mode to document for CSS-based changes
  useEffect(() => {
    if (mode === 'light') {
      document.documentElement.classList.add('performance-light');
    } else {
      document.documentElement.classList.remove('performance-light');
    }
  }, [mode]);

  if (!initialized) {
    return null;
  }

  return (
    <PerformanceModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        showPrompt,
        dismissPrompt,
        isChrome,
        hasPerformanceIssue,
      }}
    >
      {children}
    </PerformanceModeContext.Provider>
  );
}

export function usePerformanceMode() {
  const context = useContext(PerformanceModeContext);
  if (context === undefined) {
    throw new Error('usePerformanceMode must be used within a PerformanceModeProvider');
  }
  return context;
}
