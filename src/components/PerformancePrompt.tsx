import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';

export function PerformancePrompt() {
  const { showPrompt, setMode, dismissPrompt, isChrome, hasPerformanceIssue } = usePerformanceMode();

  const handleChoice = (mode: 'heavy' | 'light') => {
    setMode(mode);
    dismissPrompt();
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-4 max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Animation Settings</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isChrome && hasPerformanceIssue
                  ? "We noticed you're using Chrome and may experience slower performance."
                  : isChrome
                  ? "We noticed you're using Chrome, which may have slower animation performance."
                  : "We detected that animations may be running slowly on your device."}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleChoice('heavy')}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4 px-4 border-border/50 hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Full Experience</div>
                  <div className="text-xs text-muted-foreground">Keep all animations and effects</div>
                </div>
              </Button>

              <Button
                onClick={() => handleChoice('light')}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4 px-4 border-border/50 hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Better Performance</div>
                  <div className="text-xs text-muted-foreground">Reduced animations for smoother experience</div>
                </div>
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              You can change this anytime in the header
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
