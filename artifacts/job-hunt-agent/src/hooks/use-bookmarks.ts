import { useState, useCallback, useEffect } from "react";
import type { JobState } from "./use-job-search";

const STORAGE_KEY = "job-hunt-bookmarks";
const STATUS_STORAGE_KEY = "job-hunt-statuses";

export type ApplicationStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected";

export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  saved:       { label: "Saved",        color: "bg-muted text-muted-foreground" },
  applied:     { label: "Applied",      color: "bg-blue-500/20 text-blue-400" },
  interviewing:{ label: "Interviewing", color: "bg-yellow-500/20 text-yellow-400" },
  offer:       { label: "Offer",        color: "bg-green-500/20 text-green-400" },
  rejected:    { label: "Rejected",     color: "bg-red-500/20 text-red-400" },
};

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<JobState[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [statusMap, setStatusMap] = useState<Record<string, ApplicationStatus>>(() => {
    try {
      const raw = localStorage.getItem(STATUS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)); } catch {}
  }, [bookmarks]);

  useEffect(() => {
    try { localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusMap)); } catch {}
  }, [statusMap]);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks]
  );

  const toggleBookmark = useCallback((job: JobState) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === job.id);
      if (exists) {
        return prev.filter((b) => b.id !== job.id);
      }
      return [job, ...prev];
    });
  }, []);

  const updateBookmark = useCallback((updated: JobState) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b))
    );
  }, []);

  const getStatus = useCallback(
    (id: string): ApplicationStatus => statusMap[id] ?? "saved",
    [statusMap]
  );

  const setStatus = useCallback((id: string, status: ApplicationStatus) => {
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  }, []);

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    setStatusMap({});
  }, []);

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    updateBookmark,
    getStatus,
    setStatus,
    clearBookmarks,
  };
}
