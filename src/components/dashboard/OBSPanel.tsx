import { useState } from 'react';
import { Monitor, Circle, Video, Film, Wifi, WifiOff, Loader2, Key } from 'lucide-react';
import { useOBS } from '@/hooks/useOBS';
import { toast } from '@/hooks/use-toast';

export function OBSPanel() {
  const {
    connected, connecting, error,
    connect, disconnect, saveReplayBuffer, startStreaming, startRecording,
  } = useOBS();

  const [password, setPassword] = useState('');
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

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Key className="w-3 h-3 text-neutral-600" />
            <input
              type="password"
              placeholder="WebSocket password (if set)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent border border-white/[0.15] rounded px-2 py-1 text-[11px] text-neutral-300 placeholder:text-neutral-600 outline-none focus:border-white/30"
            />
          </div>

          <button
            onClick={() => connect(password || undefined)}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-white/[0.15] bg-transparent text-[11px] text-neutral-300 hover:bg-white/5 transition-colors"
          >
            <Monitor className="w-3 h-3" />
            Connect to OBS
          </button>
        </div>

        {error && (
          <p className="text-[10px] text-red-400/80 leading-tight">{error}</p>
        )}

        <p className="text-[9px] text-neutral-600 leading-tight">
          OBS → Tools → WebSocket Server Settings → Enable on port 4455. If you set a password there, enter it above.
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/70">
          <Wifi className="w-3 h-3" />
          <span>Connected to OBS</span>
        </div>
        <button
          onClick={disconnect}
          className="text-[9px] text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Disconnect
        </button>
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
