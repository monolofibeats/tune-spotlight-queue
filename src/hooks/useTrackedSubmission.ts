import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'upstar_tracked_submissions';

export interface TrackedSubmission {
  submissionId?: string;
  songTitle: string;
  artistName: string;
  songUrl: string;
  platform: string;
  audioFileUrl: string | null;
  streamerId: string | null;
  streamerSlug: string | null;
  trackedAt: number; // timestamp
}

function getTrackedSubmissions(): TrackedSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrackedSubmission[];
  } catch {
    return [];
  }
}

function saveTrackedSubmissions(subs: TrackedSubmission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

export function useTrackedSubmission(streamerSlug?: string | null) {
  const [submissions, setSubmissions] = useState<TrackedSubmission[]>([]);

  useEffect(() => {
    setSubmissions(getTrackedSubmissions());
  }, []);

  // Poll Supabase to remove submissions that are no longer pending
  useEffect(() => {
    const checkStatuses = async () => {
      const all = getTrackedSubmissions();
      const withIds = all.filter((s) => s.submissionId);
      if (withIds.length === 0) return;

      const ids = withIds.map((s) => s.submissionId!);
      const { data } = await supabase
        .from('submissions')
        .select('id, status')
        .in('id', ids);

      if (!data) return;

      const nonPendingIds = new Set(
        data.filter((r) => r.status !== 'pending').map((r) => r.id)
      );

      if (nonPendingIds.size === 0) return;

      const updated = all.filter(
        (s) => !s.submissionId || !nonPendingIds.has(s.submissionId)
      );
      saveTrackedSubmissions(updated);
      setSubmissions(updated);
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Get all submissions for the current streamer
  const currentSubmissions = submissions.filter(
    (s) => s.streamerSlug === (streamerSlug || null)
  );

  const trackSubmission = useCallback((sub: Omit<TrackedSubmission, 'trackedAt'>) => {
    const updated = [...getTrackedSubmissions()];
    const newSub: TrackedSubmission = { ...sub, trackedAt: Date.now() };
    updated.push(newSub);
    saveTrackedSubmissions(updated);
    setSubmissions(updated);
  }, []);

  const clearSubmission = useCallback((slug: string | null, trackedAt?: number) => {
    let updated = getTrackedSubmissions();
    if (trackedAt) {
      updated = updated.filter((s) => s.trackedAt !== trackedAt);
    } else {
      updated = updated.filter((s) => s.streamerSlug !== slug);
    }
    saveTrackedSubmissions(updated);
    setSubmissions(updated);
  }, []);

  return { currentSubmissions, submissions, trackSubmission, clearSubmission };
}
