import { useState, useEffect, useCallback } from 'react';

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
