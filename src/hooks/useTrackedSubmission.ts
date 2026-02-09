import { useState, useEffect, useCallback, useRef } from 'react';

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

  // Load from localStorage
  useEffect(() => {
    setSubmissions(getTrackedSubmissions());
  }, []);

  // Get submissions for the current streamer
  const currentSubmission = submissions.find(
    (s) => s.streamerSlug === (streamerSlug || null)
  ) || null;

  const trackSubmission = useCallback((sub: Omit<TrackedSubmission, 'trackedAt'>) => {
    const updated = getTrackedSubmissions().filter(
      (s) => s.streamerSlug !== sub.streamerSlug
    );
    const newSub: TrackedSubmission = { ...sub, trackedAt: Date.now() };
    updated.push(newSub);
    saveTrackedSubmissions(updated);
    setSubmissions(updated);
  }, []);

  const clearSubmission = useCallback((slug: string | null) => {
    const updated = getTrackedSubmissions().filter(
      (s) => s.streamerSlug !== slug
    );
    saveTrackedSubmissions(updated);
    setSubmissions(updated);
  }, []);

  return { currentSubmission, submissions, trackSubmission, clearSubmission };
}
