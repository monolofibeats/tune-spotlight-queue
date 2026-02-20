import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Power, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useStreamSession } from '@/hooks/useStreamSession';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { SessionEndSummary } from '@/components/SessionEndSummary';
import { supabase } from '@/integrations/supabase/client';

interface SessionManagerProps {
  streamerId?: string;
  phoneOptimized?: boolean;
  onPhoneOptimizedChange?: (value: boolean) => void;
}

export function SessionManager({ streamerId: _streamerId, phoneOptimized = false, onPhoneOptimizedChange }: SessionManagerProps) {
  const { currentSession, isLive, startSession, endSession } = useStreamSession();
  const { play } = useSoundEffects();
  const { t } = useLanguage();
  const [sessionTitle, setSessionTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [endedSessionSnap, setEndedSessionSnap] = useState<{
    streamerId: string; startedAt: string; endedAt: string;
  } | null>(null);

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      await startSession(sessionTitle || undefined);
      play('live');
      toast({
        title: t('session.startStream') + '! 🔴',
        description: t('session.sessionActive'),
      });
      setSessionTitle('');
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('session.startStream'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    setIsLoading(true);

    // Capture snapshot before ending — use currentSession from context,
    // or fall back to a direct DB fetch if realtime hasn't synced yet.
    let sessionData = currentSession;
    if (!sessionData) {
      const { data } = await supabase
        .from('stream_sessions')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      sessionData = data as typeof currentSession;
    }

    const snap = sessionData
      ? {
          streamerId: sessionData.streamer_id || '',
          startedAt: sessionData.started_at,
          endedAt: new Date().toISOString(),
        }
      : null;

    try {
      await endSession();
      play('notification');
      if (snap && snap.streamerId) {
        setEndedSessionSnap(snap);
        setSummaryOpen(true);
      } else {
        toast({ title: t('session.endStream'), description: t('session.noActiveSession') });
      }
    } catch (error) {
      toast({ title: t('common.error'), description: t('session.endStream'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {endedSessionSnap && (
        <SessionEndSummary
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          streamerId={endedSessionSnap.streamerId}
          startedAt={endedSessionSnap.startedAt}
          endedAt={endedSessionSnap.endedAt}
        />
      )}
    <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLive ? 'bg-red-500/20' : 'bg-muted'}`}>
            <Radio className={`w-5 h-5 ${isLive ? 'text-red-500' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <h3 className="font-semibold">{t('session.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {isLive ? `Live: ${currentSession?.title || 'Untitled'}` : t('session.noActiveSession')}
            </p>
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          {isLive ? (
            <motion.div
              key="live"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1]
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-3 h-3 rounded-full bg-red-500"
              />
              <span className="text-sm font-medium text-red-400">LIVE</span>
            </motion.div>
          ) : (
            <motion.div
              key="offline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground"
            >
              Offline
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isLive && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="session-title">{t('session.sessionTitle')}</Label>
            <Input
              id="session-title"
              placeholder={t('session.sessionTitlePlaceholder')}
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('session.phoneOptimized')}</p>
                <p className="text-[10px] text-muted-foreground">{t('session.phoneOptimizedDesc')}</p>
              </div>
            </div>
            <Switch
              checked={phoneOptimized}
              onCheckedChange={(checked) => onPhoneOptimizedChange?.(checked)}
            />
          </div>
        </div>
      )}

      <Button
        onClick={isLive ? handleEndSession : handleStartSession}
        disabled={isLoading}
        variant={isLive ? 'destructive' : 'default'}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Power className="w-4 h-4 mr-2" />
        )}
        {isLive ? t('session.endStream') : t('session.startStream')}
      </Button>
    </div>
    </>
  );
}
