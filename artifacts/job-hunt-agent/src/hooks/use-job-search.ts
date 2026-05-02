import { useState, useEffect, useRef } from "react";
import { useSearchJobs, useScoreAts } from "@workspace/api-client-react";
import type { JobResult } from "@workspace/api-client-react/src/generated/api.schemas";

export interface JobState extends JobResult {
  ats_score?: number | null;
  match_tier?: string | null;
  top_missing_keywords?: string[];
  isScoring?: boolean;
}

export type DatePosted = "24h" | "week" | "any";

export function useJobSearch() {
  const [apifyToken, setApifyToken] = useState("");
  const [roles, setRoles] = useState("");
  const [location, setLocation] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [datePosted, setDatePosted] = useState<DatePosted>("24h");
  
  const [jobs, setJobs] = useState<JobState[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStage, setSearchStage] = useState("");

  const searchMutation = useSearchJobs();
  const scoreMutation = useScoreAts();

  // Load apifyToken from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("apifyToken");
    if (savedToken) setApifyToken(savedToken);
  }, []);

  // Save apifyToken on change
  useEffect(() => {
    localStorage.setItem("apifyToken", apifyToken);
  }, [apifyToken]);

  const searchJobs = async () => {
    if (!apifyToken || !roles || !location || !resumeText) return;
    
    setIsSearching(true);
    setSearchStage("Scraping LinkedIn...");
    setJobs([]);

    try {
      const results = await searchMutation.mutateAsync({
        data: { roles, location, apifyToken, datePosted }
      });
      
      setSearchStage("Processing results...");
      setJobs(results as JobState[]);
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
      setSearchStage("");
    }
  };

  const scoreAllJobs = async () => {
    if (!resumeText || jobs.length === 0) return;
    
    // Get jobs that haven't been scored
    const unscoredJobs = jobs.filter(j => j.ats_score == null && !j.isScoring);
    if (unscoredJobs.length === 0) return;

    // Mark as scoring
    setJobs(prev => prev.map(j => unscoredJobs.find(u => u.id === j.id) ? { ...j, isScoring: true } : j));

    const batchSize = 5;
    for (let i = 0; i < unscoredJobs.length; i += batchSize) {
      const batch = unscoredJobs.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (job) => {
        try {
          const score = await scoreMutation.mutateAsync({
            data: {
              resumeText,
              jobTitle: job.title,
              jobSnippet: job.description
            }
          });
          
          setJobs(prev => prev.map(j => {
            if (j.id === job.id) {
              return { 
                ...j, 
                ats_score: score.ats_score, 
                match_tier: score.match_tier,
                top_missing_keywords: score.top_missing_keywords,
                isScoring: false 
              };
            }
            return j;
          }));
        } catch (e) {
          console.error("Scoring failed for job", job.id, e);
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, isScoring: false } : j));
        }
      }));
      
      // Delay between batches
      if (i + batchSize < unscoredJobs.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  };

  return {
    apifyToken, setApifyToken,
    roles, setRoles,
    location, setLocation,
    resumeText, setResumeText,
    datePosted, setDatePosted,
    jobs, setJobs,
    isSearching, searchStage,
    searchJobs, scoreAllJobs,
    scoreMutation
  };
}
