import { useState } from 'react';
import { Monitor, Circle, Video, Film, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useOBS } from '@/hooks/useOBS';
import { toast } from '@/hooks/use-toast';

export function OBSPanel() {
  const {
    connected, connecting, error,
    connect, saveReplayBuffer, startStreaming, startRecording,
  } = useOBS();

  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});

  const withCooldown = (key: string, fn: () => Promise<void>, label: string) => async () => {
    if (cooldowns[key]) return;
    setCooldowns(prev => ({ ...prev, [key]: true }));
    try {
      await fn();
      toast({ title: `${label} ✓`, description: `${label} triggered successfully.` });
    } catch (err: any) {
      toast({ title: `${label} failed`, description: err?.message || 'Unknown error', variant: 'destructive' });
    }
    setTimeout(() => setCooldowns(prev => ({ ...prev, [key]: false })), 2000);
  };

  if (!connected && !connecting) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <WifiOff className="w-3 h-3" />
          <span>Not connected to OBS</span>
        </div>
        {error && <p className="text-[10px] text-red-400/70">{error}</p>}
        <button
          onClick={connect}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-white/[0.15] bg-transparent text-[11px] text-neutral-300 hover:bg-white/5 transition-colors"
        >
          <Monitor className="w-3 h-3" />
          Connect to OBS
        </button>
        <p className="text-[9px] text-neutral-600 leading-tight">
          Requires OBS WebSocket Server enabled on port 4455.
        </p>
      </div>
    );
  }

  if (connecting) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Connecting to OBS…</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/70">
        <Wifi className="w-3 h-3" />
        <span>Connected to OBS</span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        <button
          onClick={withCooldown('clip', saveReplayBuffer, 'Save Clip')}
          disabled={cooldowns.clip}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-white/[0.15] bg-transparent text-[11px] text-neutral-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          <Film className="w-3 h-3" />
          {cooldowns.clip ? 'Saving…' : 'Save Clip'}
        </button>

        <button
          onClick={withCooldown('stream', startStreaming, 'Start Stream')}
          disabled={cooldowns.stream}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-white/[0.15] bg-transparent text-[11px] text-neutral-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          <Circle className="w-3 h-3" />
          {cooldowns.stream ? 'Starting…' : 'Start Stream'}
        </button>

        <button
          onClick={withCooldown('record', startRecording, 'Start Recording')}
          disabled={cooldowns.record}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-white/[0.15] bg-transparent text-[11px] text-neutral-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          <Video className="w-3 h-3" />
          {cooldowns.record ? 'Starting…' : 'Start Recording'}
        </button>
      </div>
    </div>
  );
}
