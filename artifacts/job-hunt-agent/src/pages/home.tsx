import { useState } from "react";
import { Terminal, Search, Loader2, Eye, EyeOff, Bookmark, Trash2, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ResumeDropzone } from "@/components/ResumeDropzone";
import { ResultsTable } from "@/components/ResultsTable";
import { OptimizePanel } from "@/components/OptimizePanel";
import { useJobSearch, type JobState } from "@/hooks/use-job-search";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  const { bookmarks, isBookmarked, toggleBookmark, clearBookmarks } = useBookmarks();

  const [showToken, setShowToken] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobState | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");

  const isScoringAll = jobs.some(j => j.isScoring);
  const isSearchDisabled = !apifyToken || !roles || !location || !resumeText || isSearching;

  const getScoreColor = (score?: number | null) => {
    if (score == null) return "bg-muted text-muted-foreground";
    if (score >= 72) return "bg-green-500/20 text-green-500";
    if (score >= 42) return "bg-yellow-500/20 text-yellow-500";
    return "bg-red-500/20 text-red-500";
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground font-sans flex flex-col items-center">
      
      <header className="w-full border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-3">
          <Terminal className="h-6 w-6 text-primary" />
          <h1 className="font-bold text-xl tracking-tight">Job Hunt Agent</h1>
          <Badge variant="secondary" className="ml-2 font-mono text-xs bg-primary/10 text-primary hover:bg-primary/20">v1.0.0</Badge>

          <div className="ml-auto flex gap-1">
            <Button
              variant={activeTab === "search" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("search")}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button
              variant={activeTab === "saved" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("saved")}
              className="gap-2 relative"
            >
              <Bookmark className="h-4 w-4" />
              Saved
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
                  {bookmarks.length > 9 ? "9+" : bookmarks.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-8">

        {activeTab === "search" && (
          <>
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
                  isBookmarked={isBookmarked}
                  toggleBookmark={toggleBookmark}
                />
              </section>
            )}
          </>
        )}

        {activeTab === "saved" && (
          <section className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="bg-primary/20 text-primary p-2 rounded-lg">
                  <Bookmark className="h-5 w-5" />
                </span>
                Saved Jobs
                {bookmarks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 font-mono">{bookmarks.length}</Badge>
                )}
              </h2>
              {bookmarks.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive gap-2"
                  onClick={clearBookmarks}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear all
                </Button>
              )}
            </div>

            {bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-dashed border-border/60 bg-card/40">
                <Bookmark className="h-12 w-12 text-muted-foreground/40" />
                <div>
                  <p className="text-lg font-medium text-muted-foreground">No saved jobs yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Click the bookmark icon on any job in your search results to save it here.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("search")}>
                  <Search className="mr-2 h-4 w-4" /> Go to Search
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px]">Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>ATS Score</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookmarks.map(job => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium max-w-[280px] truncate" title={job.title}>{job.title}</TableCell>
                        <TableCell>{job.company}</TableCell>
                        <TableCell>{job.location}</TableCell>
                        <TableCell>
                          <Badge className={getScoreColor(job.ats_score)} variant="secondary">
                            {job.ats_score != null ? `${job.ats_score}` : "Unscored"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {job.experienceLevel ? (
                            <Badge variant="outline">{job.experienceLevel}</Badge>
                          ) : <span className="text-muted-foreground text-sm">-</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(job.postedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleBookmark(job)}
                                  className="text-primary hover:text-destructive"
                                >
                                  <Bookmark className="h-4 w-4 fill-current" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove bookmark</TooltipContent>
                            </Tooltip>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={job.url} target="_blank" rel="noopener noreferrer">
                                Apply <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </Button>
                            <Button size="sm" onClick={() => { setSelectedJob(job); }}>
                              <Sparkles className="mr-1 h-3 w-3" /> Optimize
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
