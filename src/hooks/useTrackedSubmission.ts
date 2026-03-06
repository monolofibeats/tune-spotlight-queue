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
    // On mount, clean up old submissions that have no submissionId
    // (tracked before the ID fix) — they can never be verified, so treat
    // anything older than 2 hours without an ID as processed.
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const now = Date.now();
    const all = getTrackedSubmissions();
    let cleaned = false;
    const updated = all.map((s) => {
      if (!s.submissionId && !s.doneStatus && now - s.trackedAt > TWO_HOURS) {
        cleaned = true;
        return { ...s, doneStatus: 'reviewed' as const };
      }
      return s;
    });
    if (cleaned) saveTrackedSubmissions(updated);
    setSubmissions(updated);
  }, []);

  // Poll Supabase to mark submissions as done when streamer processes them
  useEffect(() => {
    const checkStatuses = async () => {
      const all = getTrackedSubmissions();
      // Only check submissions that are still "pending" (no doneStatus yet)
      const withIds = all.filter((s) => s.submissionId && !s.doneStatus);
      if (withIds.length === 0) return;

      const ids = withIds.map((s) => s.submissionId!);
      // Use public_submissions_queue view which only shows pending submissions
      // If a submission is no longer in this view, it's been processed
      const { data } = await supabase
        .from('public_submissions_queue')
        .select('id')
        .in('id', ids);

      if (!data) return;

      const stillPendingIds = new Set(data.map((r) => r.id));

      let changed = false;
      const updated = all.map((s) => {
        if (!s.submissionId || s.doneStatus) return s;
        // If no longer in the pending queue, it's been processed
        if (!stillPendingIds.has(s.submissionId)) {
          changed = true;
          return { ...s, doneStatus: 'reviewed' as const };
        }
        return s;
      });

      if (changed) {
        saveTrackedSubmissions(updated);
        setSubmissions(updated);
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 8_000);
    return () => clearInterval(interval);
  }, []);

  // Get all submissions for the current streamer
  const currentSubmissions = submissions.filter(
    (s) => s.streamerSlug === (streamerSlug || null)
  );

  const trackSubmission = useCallback((sub: Omit<TrackedSubmission, 'trackedAt'>) => {
    const updated = [...getTrackedSubmissions()];
    // Deduplicate: skip if this submissionId is already tracked
    if (sub.submissionId && updated.some((s) => s.submissionId === sub.submissionId)) {
      return;
    }
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
