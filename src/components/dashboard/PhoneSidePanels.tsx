import { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, DollarSign, Music, Clock, Timer, Crown,
  Volume2, Bell, Trophy, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useStreamSession } from '@/hooks/useStreamSession';
import { TopSongsPublicDisplay } from '@/components/TopSongsPublicDisplay';
import { PricingSettings, PricingSettingsHandle } from '@/components/streamer-settings/PricingSettings';
import { SidePanelSoundboard } from '@/components/dashboard/SidePanelSoundboard';
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
    <div className="last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
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
    <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-transparent border border-white/[0.15]">
      <Icon className="w-3 h-3 text-neutral-300 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold truncate text-neutral-100">{value}</p>
        <p className="text-[8px] text-neutral-400">{label}</p>
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
      const { data: subs } = await supabase
        .from('submissions')
        .select('email, amount_paid, created_at')
        .eq('streamer_id', streamerId)
        .gte('created_at', currentSession.started_at)
        .order('created_at', { ascending: false });

      const { data: earnings } = await supabase
        .from('streamer_earnings')
        .select('streamer_share_cents')
        .eq('streamer_id', streamerId)
        .gte('created_at', currentSession.started_at);

      const totalEarnings = earnings?.reduce((s, e) => s + e.streamer_share_cents, 0) ?? 0;
      const trackCount = subs?.length ?? 0;
      const lastSongAt = subs?.[0]?.created_at ?? null;

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

/* LEFT PANEL */
function LeftPanel({ streamer, onStreamerUpdate }: { streamer: Streamer; onStreamerUpdate?: (s: Streamer) => void }) {
  const { stats } = useSessionStats(streamer.id);
  const duration = useOnlineDuration();
  const [volume, setVolume] = useState(80);
  const [notifSounds, setNotifSounds] = useState(true);

  const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;
  const timeSince = (iso: string | null) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

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

  return (
    <div className="h-full flex flex-col">
      {/* Session stats — always fully visible */}
      <CollapsibleSection title="Session Stats" icon={DollarSign}>
        <div className="grid grid-cols-2 gap-1.5">
          <StatCard label="Earnings" value={fmt(stats.earnings)} icon={DollarSign} />
          <StatCard label="Tracks" value={String(stats.trackCount)} icon={Music} />
          <StatCard label="Last Song" value={timeSince(stats.lastSongAt)} icon={Clock} />
          <StatCard label="Online" value={duration} icon={Timer} />
          {stats.topPayer && (
            <div className="col-span-2">
              <StatCard 
                label="Top Payer" 
                value={`${stats.topPayer.email.split('@')[0]}… €${stats.topPayer.amount.toFixed(2)}`} 
                icon={Crown} 
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Everything below dims when not hovered */}
      <div className="side-panel-left-dimmable flex-1 flex flex-col">
        <CollapsibleSection title="Audio" icon={Volume2}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3 h-3 text-neutral-500" />
                <span className="text-[11px] text-neutral-400">Notification Sounds</span>
              </div>
              <Switch checked={notifSounds} onCheckedChange={setNotifSounds} className="data-[state=checked]:bg-neutral-400 data-[state=unchecked]:bg-neutral-700" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-neutral-500" />
                <span className="text-[11px] text-neutral-400">Volume</span>
                <span className="text-[10px] text-neutral-600 ml-auto">{volume}%</span>
              </div>
              <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={100} step={1} className="w-full side-panel-slider" />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Soundboard" icon={Volume2} defaultOpen={false}>
          <SidePanelSoundboard />
        </CollapsibleSection>

        <CollapsibleSection title="Podium" icon={Trophy} defaultOpen={false}>
          <div className="side-panel-podium scale-75 origin-top -mb-8">
            <TopSongsPublicDisplay streamerId={streamer.id} showTopSongs={true} hideTitle />
          </div>
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
                <span className="text-[11px] text-neutral-400">{label}</span>
                <Switch
                  checked={!!(streamer as any)[key]}
                  onCheckedChange={(v) => toggleVisibility(key, v)}
                  className="data-[state=checked]:bg-neutral-400 data-[state=unchecked]:bg-neutral-700"
                />
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

/* RIGHT PANEL */
function RightPanel({ streamer }: { streamer: Streamer }) {
  const pricingRef = useRef<PricingSettingsHandle>(null);

  return (
    <div className="h-full flex flex-col">
      <CollapsibleSection title="Pricing" icon={DollarSign}>
        <div className="max-h-[80vh] overflow-y-auto -mx-1 px-1 side-panel-pricing">
          <PricingSettings ref={pricingRef} streamerId={streamer.id} />
        </div>
      </CollapsibleSection>
    </div>
  );
}

export function PhoneSidePanels({ streamer, children, onStreamerUpdate }: PhoneSidePanelsProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="flex items-stretch gap-2 w-full min-h-[calc(100vh-140px)]">
      {/* Left Panel */}
      <div className="relative flex-1 min-w-0">
        {leftOpen ? (
          <>
            <div className="h-full rounded-xl backdrop-blur-sm overflow-y-auto side-panel-left-container transition-all duration-300">
              <LeftPanel streamer={streamer} onStreamerUpdate={onStreamerUpdate} />
            </div>
            <button
              onClick={() => setLeftOpen(false)}
              className="absolute top-2 right-1 z-10 p-1 rounded-full bg-black/70 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-3 h-3 text-neutral-400" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setLeftOpen(true)}
            className="absolute top-2 left-0 z-10 p-1 rounded-full bg-black/70 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-3 h-3 text-neutral-400" />
          </button>
        )}
      </div>

      {/* Center Content */}
      <div className="flex-shrink-0 w-[480px]">
        {children}
      </div>

      {/* Right Panel */}
      <div className="relative flex-1 min-w-0">
        {rightOpen ? (
          <>
            <div className="h-full rounded-xl backdrop-blur-sm overflow-y-auto side-panel-right-container side-panel-mono transition-all duration-300">
              <RightPanel streamer={streamer} />
            </div>
            <button
              onClick={() => setRightOpen(false)}
              className="absolute top-2 left-1 z-10 p-1 rounded-full bg-black/70 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-3 h-3 text-neutral-400" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setRightOpen(true)}
            className="absolute top-2 right-0 z-10 p-1 rounded-full bg-black/70 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-3 h-3 text-neutral-400" />
          </button>
        )}
      </div>
    </div>
  );
}
