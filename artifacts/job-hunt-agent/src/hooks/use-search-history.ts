import { useState, useEffect } from "react";
import type { DatePosted } from "./use-job-search";

const STORAGE_KEY = "job-hunt-search-history";
const MAX_ENTRIES = 5;

export interface SearchHistoryEntry {
  id: string;
  roles: string;
  location: string;
  datePosted: DatePosted;
  timestamp: number;
}

function load(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SearchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: SearchHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(load);

  useEffect(() => {
    save(history);
  }, [history]);

  const addToHistory = (entry: Omit<SearchHistoryEntry, "id" | "timestamp">) => {
    setHistory((prev) => {
      // Remove duplicate (same roles + location + datePosted)
      const deduped = prev.filter(
        (e) =>
          !(e.roles === entry.roles &&
            e.location === entry.location &&
            e.datePosted === entry.datePosted)
      );
      const next: SearchHistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      };
      return [next, ...deduped].slice(0, MAX_ENTRIES);
    });
  };

  const removeFromHistory = (id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  };

  const clearHistory = () => setHistory([]);

  return { history, addToHistory, removeFromHistory, clearHistory };
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
