import { useState, useEffect, useCallback, useRef } from 'react';
import OBSWebSocket from 'obs-websocket-js';

interface UseOBSOptions {
  url?: string;
  password?: string;
  autoConnect?: boolean;
}

export function useOBS({ url = 'ws://localhost:4455', password, autoConnect = true }: UseOBSOptions = {}) {
  const obsRef = useRef<OBSWebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(async () => {
    if (obsRef.current) {
      try { await obsRef.current.disconnect(); } catch {}
    }

    const obs = new OBSWebSocket();
    obsRef.current = obs;
    setConnecting(true);
    setError(null);

    try {
      await obs.connect(url, password);
      setConnected(true);
      setConnecting(false);

      obs.on('ConnectionClosed', () => {
        setConnected(false);
        // Auto-reconnect after 5s
        reconnectTimer.current = setTimeout(() => connect(), 5000);
      });
    } catch (err: any) {
      setConnected(false);
      setConnecting(false);
      setError(err?.message || 'Failed to connect to OBS');
    }
  }, [url, password]);

  const disconnect = useCallback(async () => {
    clearTimeout(reconnectTimer.current);
    if (obsRef.current) {
      try { await obsRef.current.disconnect(); } catch {}
      obsRef.current = null;
    }
    setConnected(false);
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
    if (autoConnect) connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (obsRef.current) {
        try { obsRef.current.disconnect(); } catch {}
      }
    };
  }, [autoConnect, connect]);

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
