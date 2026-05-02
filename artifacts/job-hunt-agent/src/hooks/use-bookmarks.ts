import { useState, useCallback, useEffect } from "react";
import type { JobState } from "./use-job-search";

const STORAGE_KEY = "job-hunt-bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<JobState[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      // quota exceeded — silently ignore
    }
  }, [bookmarks]);

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

  const clearBookmarks = useCallback(() => setBookmarks([]), []);

  return { bookmarks, isBookmarked, toggleBookmark, updateBookmark, clearBookmarks };
}
