import { useState } from "react";
import { Terminal, Search, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResumeDropzone } from "@/components/ResumeDropzone";
import { ResultsTable } from "@/components/ResultsTable";
import { OptimizePanel } from "@/components/OptimizePanel";
import { useJobSearch, type JobState } from "@/hooks/use-job-search";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const {
    apifyToken, setApifyToken,
    roles, setRoles,
    location, setLocation,
    resumeText, setResumeText,
    jobs,
    isSearching, searchStage,
    searchJobs, scoreAllJobs
  } = useJobSearch();

  const [showToken, setShowToken] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobState | null>(null);

  const isScoringAll = jobs.some(j => j.isScoring);
  const isSearchDisabled = !apifyToken || !roles || !location || !resumeText || isSearching;

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground font-sans flex flex-col items-center">
      
      <header className="w-full border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-3">
          <Terminal className="h-6 w-6 text-primary" />
          <h1 className="font-bold text-xl tracking-tight">Job Hunt Agent</h1>
          <Badge variant="secondary" className="ml-2 font-mono text-xs bg-primary/10 text-primary hover:bg-primary/20">v1.0.0</Badge>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* INPUT SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 p-6 rounded-2xl border border-border/50 bg-card shadow-sm">
            <div className="space-y-1 mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Search Parameters
              </h2>
              <p className="text-sm text-muted-foreground">Define your target roles and location to scrape LinkedIn.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="roles">Job Titles</Label>
                <Input 
                  id="roles" 
                  placeholder="e.g. Software Engineer, React Developer" 
                  value={roles}
                  onChange={(e) => setRoles(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  placeholder="e.g. San Francisco, CA" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="apifyToken">Apify API Token</Label>
                <div className="relative">
                  <Input 
                    id="apifyToken" 
                    type={showToken ? "text" : "password"}
                    placeholder="apify_api_..." 
                    value={apifyToken}
                    onChange={(e) => setApifyToken(e.target.value)}
                    className="bg-background font-mono text-sm pr-10"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Saved locally in your browser.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 rounded-2xl border border-border/50 bg-card shadow-sm flex flex-col">
            <div className="space-y-1 mb-2">
              <h2 className="text-lg font-semibold">Target Resume</h2>
              <p className="text-sm text-muted-foreground">Upload for ATS scoring.</p>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <ResumeDropzone onTextExtracted={setResumeText} className="flex-1 min-h-[140px] bg-background" />
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <section className="flex flex-col items-center gap-4 py-4">
          <Button 
            size="lg" 
            className="w-full max-w-md text-base h-14 font-semibold shadow-lg hover:shadow-primary/25 transition-all"
            onClick={searchJobs}
            disabled={isSearchDisabled}
          >
            {isSearching ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {searchStage}</>
            ) : (
              <><Search className="mr-2 h-5 w-5" /> Run Job Search Agent</>
            )}
          </Button>
          {isSearching && (
            <div className="w-full max-w-md space-y-2">
              <Progress value={searchStage.includes('Scraping') ? 33 : 66} className="h-2" />
            </div>
          )}
        </section>

        {/* RESULTS TABLE */}
        {jobs.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-primary/20 text-primary p-2 rounded-lg">
                <Terminal className="h-5 w-5" />
              </span>
              Intelligence Report
            </h2>
            <ResultsTable 
              jobs={jobs} 
              onScoreAll={scoreAllJobs}
              isScoringAll={isScoringAll}
              onOptimize={(job) => setSelectedJob(job)}
            />
          </section>
        )}

      </main>

      <OptimizePanel 
        job={selectedJob}
        isOpen={selectedJob !== null}
        onClose={() => setSelectedJob(null)}
        resumeText={resumeText}
        apifyToken={apifyToken}
      />
      
    </div>
  );
}

// Temporary Badge component import fallback if not exported above
import { Badge } from "@/components/ui/badge";