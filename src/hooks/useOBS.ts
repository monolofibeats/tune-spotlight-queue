import { useState, useEffect, useCallback, useRef } from 'react';
import OBSWebSocket from 'obs-websocket-js';

interface UseOBSOptions {
  url?: string;
  password?: string;
  autoConnect?: boolean;
}

export function useOBS({ url = 'ws://localhost:4455', password, autoConnect = false }: UseOBSOptions = {}) {
  const obsRef = useRef<OBSWebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(async (overridePassword?: string) => {
    if (obsRef.current) {
      try { await obsRef.current.disconnect(); } catch {}
    }

    const obs = new OBSWebSocket();
    obsRef.current = obs;
    setConnecting(true);
    setError(null);

    const pw = overridePassword ?? password;

    try {
      console.log('[OBS] Connecting to', url, pw ? '(with password)' : '(no password)');
      await obs.connect(url, pw || undefined);
      console.log('[OBS] Connected successfully');
      setConnected(true);
      setConnecting(false);

      obs.on('ConnectionClosed', () => {
        console.log('[OBS] Connection closed');
        setConnected(false);
        reconnectTimer.current = setTimeout(() => {
          console.log('[OBS] Attempting reconnect...');
          connect(pw || undefined);
        }, 5000);
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('[OBS] Connection failed:', msg, err);
      setConnected(false);
      setConnecting(false);
      
      if (msg.includes('Authentication')) {
        setError('Authentication failed – check your OBS WebSocket password.');
      } else if (msg.includes('WebSocket') || msg.includes('connect')) {
        setError('Cannot reach OBS. Is it running with WebSocket Server enabled on port 4455?');
      } else {
        setError(msg);
      }
    }
  }, [url, password]);

  const disconnect = useCallback(async () => {
    clearTimeout(reconnectTimer.current);
    if (obsRef.current) {
      try { await obsRef.current.disconnect(); } catch {}
      obsRef.current = null;
    }
    setConnected(false);
    setError(null);
  }, []);

  const saveReplayBuffer = useCallback(async () => {
    if (!obsRef.current || !connected) throw new Error('OBS not connected');
    await obsRef.current.call('SaveReplayBuffer');
  }, [connected]);

  const startStreaming = useCallback(async () => {
    if (!obsRef.current || !connected) throw new Error('OBS not connected');
    await obsRef.current.call('StartStream');
  }, [connected]);

  const stopStreaming = useCallback(async () => {
    if (!obsRef.current || !connected) throw new Error('OBS not connected');
    await obsRef.current.call('StopStream');
  }, [connected]);

  const startRecording = useCallback(async () => {
    if (!obsRef.current || !connected) throw new Error('OBS not connected');
    await obsRef.current.call('StartRecord');
  }, [connected]);

  const stopRecording = useCallback(async () => {
    if (!obsRef.current || !connected) throw new Error('OBS not connected');
    await obsRef.current.call('StopRecord');
  }, [connected]);

  useEffect(() => {
    return () => {
      clearTimeout(reconnectTimer.current);
      if (obsRef.current) {
        try { obsRef.current.disconnect(); } catch {}
      }
    };
  }, []);

  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    saveReplayBuffer,
    startStreaming,
    stopStreaming,
    startRecording,
    stopRecording,
  };
}
