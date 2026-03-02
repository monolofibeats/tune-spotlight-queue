import { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, DollarSign, Music, Clock, Timer, Crown,
  Volume2, Bell, Trophy, Eye, Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useStreamSession } from '@/hooks/useStreamSession';
import { useAllPricingConfigs } from '@/hooks/usePricingConfig';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { MiniPedestal } from '@/components/MiniPedestal';
import type { Streamer } from '@/types/streamer';

interface PhoneSidePanelsProps {
  streamer: Streamer;
  children: React.ReactNode;
  onStreamerUpdate?: (streamer: Streamer) => void;
}

interface SessionStats {
  earnings: number;
  trackCount: number;
  lastSongAt: string | null;
  topPayer: { email: string; amount: number } | null;
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="flex-1 text-left uppercase tracking-wider">{title}</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
      <div className="p-1.5 rounded-md bg-primary/15">
        <Icon className="w-3 h-3 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold truncate">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function useSessionStats(streamerId: string) {
  const { currentSession } = useStreamSession();
  const [stats, setStats] = useState<SessionStats>({
    earnings: 0, trackCount: 0, lastSongAt: null, topPayer: null,
  });

  useEffect(() => {
    if (!currentSession) return;

    const fetch = async () => {
      // Get submissions for this session (created after session start)
      const { data: subs } = await supabase
        .from('submissions')
        .select('email, amount_paid, created_at')
        .eq('streamer_id', streamerId)
        .gte('created_at', currentSession.started_at)
        .order('created_at', { ascending: false });

      // Get earnings for this session
      const { data: earnings } = await supabase
        .from('streamer_earnings')
        .select('streamer_share_cents')
        .eq('streamer_id', streamerId)
        .gte('created_at', currentSession.started_at);

      const totalEarnings = earnings?.reduce((s, e) => s + e.streamer_share_cents, 0) ?? 0;
      const trackCount = subs?.length ?? 0;
      const lastSongAt = subs?.[0]?.created_at ?? null;

      // Top payer
      const payerMap: Record<string, number> = {};
      subs?.forEach(s => {
        if (s.email && s.amount_paid > 0) {
          payerMap[s.email] = (payerMap[s.email] || 0) + s.amount_paid;
        }
      });
      const topEntry = Object.entries(payerMap).sort((a, b) => b[1] - a[1])[0];
      const topPayer = topEntry ? { email: topEntry[0], amount: topEntry[1] } : null;

      setStats({ earnings: totalEarnings, trackCount, lastSongAt, topPayer });
    };

    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [streamerId, currentSession]);

  return { stats, currentSession };
}

function useOnlineDuration() {
  const { currentSession } = useStreamSession();
  const [duration, setDuration] = useState('0:00');

  useEffect(() => {
    if (!currentSession) { setDuration('0:00'); return; }
    const calc = () => {
      const diff = Date.now() - new Date(currentSession.started_at).getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setDuration(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
    };
    calc();
    const i = setInterval(calc, 30000);
    return () => clearInterval(i);
  }, [currentSession]);

  return duration;
}

function LeftPanel({ streamerId }: { streamerId: string }) {
  const { stats } = useSessionStats(streamerId);
  const duration = useOnlineDuration();

  const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;
  const timeSince = (iso: string | null) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <div className="h-full flex flex-col">
      <CollapsibleSection title="Session Stats" icon={DollarSign}>
        <StatCard label="Session Earnings" value={fmt(stats.earnings)} icon={DollarSign} />
        <StatCard label="Tracks Received" value={String(stats.trackCount)} icon={Music} />
        <StatCard label="Last Song" value={timeSince(stats.lastSongAt)} icon={Clock} />
        <StatCard label="Online Duration" value={duration} icon={Timer} />
        {stats.topPayer && (
          <StatCard 
            label="Top Payer" 
            value={`${stats.topPayer.email.split('@')[0]}… €${stats.topPayer.amount.toFixed(2)}`} 
            icon={Crown} 
          />
        )}
      </CollapsibleSection>
    </div>
  );
}

function RightPanel({ streamer, onStreamerUpdate }: { streamer: Streamer; onStreamerUpdate?: (s: Streamer) => void }) {
  const { configs, isLoading: pricingLoading } = useAllPricingConfigs(streamer.id);
  const [volume, setVolume] = useState(80);
  const [notifSounds, setNotifSounds] = useState(true);

  const toggleVisibility = async (field: string, value: boolean) => {
    const update: Record<string, boolean> = { [field]: value };
    const { error } = await supabase
      .from('streamers')
      .update(update)
      .eq('id', streamer.id);
    if (!error && onStreamerUpdate) {
      onStreamerUpdate({ ...streamer, ...update } as Streamer);
    }
  };

  const fmtCents = (c: number) => `€${(c / 100).toFixed(2)}`;

  return (
    <div className="h-full flex flex-col">
      <CollapsibleSection title="Audio" icon={Volume2}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bell className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px]">Notification Sounds</span>
            </div>
            <Switch checked={notifSounds} onCheckedChange={setNotifSounds} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px]">Volume</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{volume}%</span>
            </div>
            <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={100} step={1} className="w-full" />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Podium" icon={Trophy} defaultOpen={false}>
        <MiniPedestal streamerId={streamer.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Pricing" icon={DollarSign} defaultOpen={false}>
        {pricingLoading ? (
          <p className="text-[10px] text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {Object.entries(configs).map(([type, cfg]) => (
              <div key={type} className="flex items-center justify-between p-1.5 rounded bg-muted/20">
                <span className="text-[10px] capitalize">{type.replace(/_/g, ' ')}</span>
                <span className={`text-[10px] font-medium ${cfg.is_active ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {cfg.is_active ? `${fmtCents(cfg.min_amount_cents)} – ${fmtCents(cfg.max_amount_cents)}` : 'Off'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Section Visibility" icon={Eye} defaultOpen={false}>
        <div className="space-y-2">
          {[
            { key: 'show_how_it_works', label: 'How It Works' },
            { key: 'show_stream_embed', label: 'Stream Embed' },
            { key: 'show_public_queue', label: 'Public Queue' },
            { key: 'show_top_songs', label: 'Top Songs' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[11px]">{label}</span>
              <Switch
                checked={!!(streamer as any)[key]}
                onCheckedChange={(v) => toggleVisibility(key, v)}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

export function PhoneSidePanels({ streamer, children, onStreamerUpdate }: PhoneSidePanelsProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="flex items-start gap-0 w-full">
      {/* Left Panel */}
      <div className="relative flex-shrink-0">
        <AnimatePresence>
          {leftOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden h-full"
            >
              <div className="w-[220px] rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm overflow-y-auto max-h-[calc(100vh-120px)]">
                <LeftPanel streamerId={streamer.id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className="absolute top-2 -right-3 z-10 p-1 rounded-full bg-card border border-border/50 hover:bg-accent transition-colors"
        >
          {leftOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>

      {/* Center Content */}
      <div className="flex-1 min-w-0 px-1">
        {children}
      </div>

      {/* Right Panel */}
      <div className="relative flex-shrink-0">
        <AnimatePresence>
          {rightOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden h-full"
            >
              <div className="w-[220px] rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm overflow-y-auto max-h-[calc(100vh-120px)]">
                <RightPanel streamer={streamer} onStreamerUpdate={onStreamerUpdate} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="absolute top-2 -left-3 z-10 p-1 rounded-full bg-card border border-border/50 hover:bg-accent transition-colors"
        >
          {rightOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
