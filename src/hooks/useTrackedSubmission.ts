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
  doneStatus?: 'reviewed' | 'skipped' | 'deleted'; // set when streamer processes it
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

  // Poll Supabase to mark submissions as done when streamer processes them
  useEffect(() => {
    const checkStatuses = async () => {
      const all = getTrackedSubmissions();
      // Only check submissions that are still "pending" (no doneStatus yet)
      const withIds = all.filter((s) => s.submissionId && !s.doneStatus);
      if (withIds.length === 0) return;

      const ids = withIds.map((s) => s.submissionId!);
      const { data } = await supabase
        .from('submissions')
        .select('id, status')
        .in('id', ids);

      if (!data) return;

      // Map processed submissions to their new status
      const statusMap = new Map(data.map((r) => [r.id, r.status]));

      let changed = false;
      const updated = all.map((s) => {
        if (!s.submissionId || s.doneStatus) return s;
        const dbStatus = statusMap.get(s.submissionId);
        if (dbStatus && dbStatus !== 'pending') {
          changed = true;
          const doneStatus =
            dbStatus === 'reviewed' ? 'reviewed'
            : dbStatus === 'skipped' ? 'skipped'
            : 'deleted';
          return { ...s, doneStatus } as TrackedSubmission;
        }
        // If not found in DB at all, treat as deleted
        if (!statusMap.has(s.submissionId) && data.length > 0) {
          // Only mark deleted if we specifically queried for it and it's missing
          changed = true;
          return { ...s, doneStatus: 'deleted' as const };
        }
        return s;
      });

      if (changed) {
        saveTrackedSubmissions(updated);
        setSubmissions(updated);
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 15_000);
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
