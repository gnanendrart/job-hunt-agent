import { useState } from "react";
import { Terminal, Search, Loader2, Eye, EyeOff, Bookmark, Trash2, ExternalLink, Sparkles, Download, SearchX, Clock, Globe, AlertCircle, X, History, RotateCcw, MapPin, CheckCircle2, XCircle, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResumeDropzone } from "@/components/ResumeDropzone";
import { ResultsTable } from "@/components/ResultsTable";
import { OptimizePanel } from "@/components/OptimizePanel";
import { useJobSearch, type JobState, type DatePosted } from "@/hooks/use-job-search";
import { useValidateToken } from "@workspace/api-client-react";
import { KeywordAnalyzer } from "@/components/KeywordAnalyzer";
import { ResumeGapAnalyzer } from "@/components/ResumeGapAnalyzer";
import { CoverLetterPanel } from "@/components/CoverLetterPanel";
import { EmailDigestPanel } from "@/components/EmailDigestPanel";
import { InterviewPrepPanel } from "@/components/InterviewPrepPanel";
import { useSearchHistory, formatRelativeTime } from "@/hooks/use-search-history";
import { useBookmarks, type ApplicationStatus, STATUS_CONFIG } from "@/hooks/use-bookmarks";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function exportToCSV(jobs: JobState[], getStatus: (id: string) => ApplicationStatus) {
  const headers = [
    "Status",
    "Job Title",
    "Company",
    "Location",
    "ATS Score",
    "Match Tier",
    "Experience Level",
    "Posted Date",
    "Missing Keywords",
    "URL",
  ];

  const escape = (val: string | null | undefined) => {
    const s = String(val ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  };

  const rows = jobs.map((job) => [
    escape(STATUS_CONFIG[getStatus(job.id)].label),
    escape(job.title),
    escape(job.company),
    escape(job.location),
    escape(job.ats_score != null ? String(job.ats_score) : "Unscored"),
    escape(job.match_tier),
    escape(job.experienceLevel),
    escape(new Date(job.postedAt).toLocaleDateString()),
    escape((job.top_missing_keywords ?? []).join(", ")),
    escape(job.url),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saved-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_ORDER: ApplicationStatus[] = ["saved", "applied", "interviewing", "offer", "rejected"];

export default function Home() {
  const {
    apifyToken, setApifyToken,
    roles, setRoles,
    location, setLocation,
    resumeText, setResumeText,
    datePosted, setDatePosted,
    jobs,
    isSearching, searchStage,
    searchAttempted, searchError,
    searchJobs, scoreAllJobs,
    getSalaryForJob, salaryAllJobs, isSalaryingAll,
  } = useJobSearch();

  const { history, addToHistory, removeFromHistory } = useSearchHistory();
  const { bookmarks, isBookmarked, toggleBookmark, getStatus, setStatus, clearBookmarks } = useBookmarks();

  const validateTokenMutation = useValidateToken();
  const [tokenStatus, setTokenStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [tokenInfo, setTokenInfo] = useState<{ username?: string; plan?: string } | null>(null);

  const handleValidateToken = async () => {
    if (!apifyToken) return;
    setTokenStatus("checking");
    setTokenInfo(null);
    try {
      const result = await validateTokenMutation.mutateAsync({ data: { apifyToken } });
      if (result.valid) {
        setTokenStatus("valid");
        setTokenInfo({ username: result.username, plan: result.plan });
      } else {
        setTokenStatus("invalid");
      }
    } catch {
      setTokenStatus("invalid");
    }
  };

  const [showToken, setShowToken] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobState | null>(null);
  const [coverLetterJob, setCoverLetterJob] = useState<JobState | null>(null);
  const [interviewPrepJob, setInterviewPrepJob] = useState<JobState | null>(null);
  const [emailDigestOpen, setEmailDigestOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");

  const DATE_LABELS: Record<DatePosted, string> = { "24h": "Last 24h", week: "Last Week", any: "Any Time" };

  const handleSearch = async () => {
    const ok = await searchJobs();
    if (ok) addToHistory({ roles, location, datePosted });
  };

  const rerunSearch = (entry: { roles: string; location: string; datePosted: DatePosted }) => {
    setRoles(entry.roles);
    setLocation(entry.location);
    setDatePosted(entry.datePosted);
  };

  const isScoringAll = jobs.some(j => j.isScoring);
  const isSearchDisabled = !apifyToken || !roles || !location || !resumeText || isSearching;

  const getScoreColor = (score?: number | null) => {
    if (score == null) return "bg-muted text-muted-foreground";
    if (score >= 72) return "bg-green-500/20 text-green-500";
    if (score >= 42) return "bg-yellow-500/20 text-yellow-500";
    return "bg-red-500/20 text-red-500";
  };

  const filteredBookmarks = statusFilter === "all"
    ? bookmarks
    : bookmarks.filter(j => getStatus(j.id) === statusFilter);

  const statusCounts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = bookmarks.filter(j => getStatus(j.id) === s).length;
    return acc;
  }, {});

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
                      placeholder="e.g. Remote, Calgary Alberta Canada"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Date Posted</Label>
                    <div className="flex gap-2">
                      {([ ["24h", "Last 24h"], ["week", "Last Week"], ["any", "Any Time"] ] as [DatePosted, string][]).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDatePosted(val)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                            datePosted === val
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="apifyToken">Apify API Token</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="apifyToken"
                          type={showToken ? "text" : "password"}
                          placeholder="apify_api_..."
                          value={apifyToken}
                          onChange={(e) => { setApifyToken(e.target.value); setTokenStatus("idle"); setTokenInfo(null); }}
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
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        disabled={!apifyToken || tokenStatus === "checking"}
                        onClick={handleValidateToken}
                        className={
                          tokenStatus === "valid" ? "border-green-500/50 text-green-500 hover:text-green-400" :
                          tokenStatus === "invalid" ? "border-red-500/50 text-red-400 hover:text-red-300" :
                          ""
                        }
                      >
                        {tokenStatus === "checking" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : tokenStatus === "valid" ? (
                          <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Valid</>
                        ) : tokenStatus === "invalid" ? (
                          <><XCircle className="h-4 w-4 mr-1.5" /> Invalid</>
                        ) : (
                          <><ShieldCheck className="h-4 w-4 mr-1.5" /> Validate</>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tokenStatus === "valid" && tokenInfo?.username ? (
                        <span className="text-green-500 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified as <span className="font-medium">{tokenInfo.username}</span>
                          {tokenInfo.plan && <span className="text-green-500/70">· {tokenInfo.plan}</span>}
                        </span>
                      ) : tokenStatus === "invalid" ? (
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Token is invalid or expired — check your Apify console
                        </span>
                      ) : (
                        "Saved locally in your browser."
                      )}
                    </p>
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

            <section className="flex flex-col items-center gap-4 py-4">
              <Button
                size="lg"
                className="w-full max-w-md text-base h-14 font-semibold shadow-lg hover:shadow-primary/25 transition-all"
                onClick={handleSearch}
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

            {history.length > 0 && !isSearching && (
              <section className="animate-in fade-in duration-300 max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent searches</span>
                </div>
                <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/40 overflow-hidden">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                      <button
                        className="flex-1 flex items-start gap-3 text-left min-w-0"
                        onClick={() => rerunSearch(entry)}
                        title="Restore this search"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{entry.roles}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <MapPin className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{entry.location}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                              {DATE_LABELS[entry.datePosted]}
                            </Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground/60 shrink-0 self-center">
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                      </button>
                      <button
                        onClick={() => removeFromHistory(entry.id)}
                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {searchError && !isSearching && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-destructive">Search failed</p>
                    <p className="text-xs text-destructive/80 mt-0.5 font-mono break-all">{searchError}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">Common causes:</span>
                      <span>Invalid or expired Apify token</span>
                      <span>·</span>
                      <span>Apify account out of credits</span>
                      <span>·</span>
                      <span>Actor timeout (try fewer roles)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}

            {searchAttempted && !isSearching && !searchError && jobs.length === 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 rounded-2xl border border-dashed border-border/60 bg-card/40">
                  <div className="bg-muted/60 p-5 rounded-full">
                    <SearchX className="h-10 w-10 text-muted-foreground/60" />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <p className="text-xl font-semibold">No jobs found</p>
                    <p className="text-sm text-muted-foreground">
                      Apify returned no results for your search. Try one of these fixes:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left">
                    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
                      <div className="flex items-center gap-2 text-primary">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-semibold">Widen the date</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Switch from "Last 24h" to "Last Week" or "Any Time"</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
                      <div className="flex items-center gap-2 text-primary">
                        <Search className="h-4 w-4" />
                        <span className="text-sm font-semibold">Broaden the role</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Try a more general title like "Data Analyst" instead of "Senior Healthcare Data Analyst"</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
                      <div className="flex items-center gap-2 text-primary">
                        <Globe className="h-4 w-4" />
                        <span className="text-sm font-semibold">Expand location</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Use a country or "Remote" instead of a specific city</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {jobs.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="bg-primary/20 text-primary p-2 rounded-lg">
                    <Terminal className="h-5 w-5" />
                  </span>
                  Intelligence Report
                  <Badge variant="secondary" className="ml-2 font-mono text-sm">{jobs.length} jobs</Badge>
                </h2>
                <div className="mb-4">
                  <KeywordAnalyzer jobs={jobs} />
                </div>
                <div className="mb-6">
                  <ResumeGapAnalyzer jobs={jobs} resumeText={resumeText} />
                </div>
                <ResultsTable
                  jobs={jobs}
                  onScoreAll={scoreAllJobs}
                  isScoringAll={isScoringAll}
                  onOptimize={(job) => setSelectedJob(job)}
                  onCoverLetter={(job) => setCoverLetterJob(job)}
                  onInterviewPrep={(job) => setInterviewPrepJob(job)}
                  onGetSalary={getSalaryForJob}
                  onSalaryAll={salaryAllJobs}
                  isSalaryingAll={isSalaryingAll}
                  isBookmarked={isBookmarked}
                  toggleBookmark={toggleBookmark}
                />
              </section>
            )}
          </>
        )}

        {activeTab === "saved" && (
          <section className="animate-in fade-in duration-300 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setEmailDigestOpen(true)}
                  >
                    <Mail className="h-4 w-4" />
                    Email Digest
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => exportToCSV(bookmarks, getStatus)}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive gap-2"
                    onClick={clearBookmarks}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear all
                  </Button>
                </div>
              )}
            </div>

            {/* Pipeline summary cards */}
            {bookmarks.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {STATUS_ORDER.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const count = statusCounts[s] ?? 0;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all hover:border-primary/50",
                        statusFilter === s
                          ? "border-primary/60 bg-primary/5 shadow-sm"
                          : "border-border/50 bg-card"
                      )}
                    >
                      <p className="text-2xl font-black tabular-nums">{count}</p>
                      <p className={cn("text-xs font-semibold mt-1 px-1.5 py-0.5 rounded-full inline-block", cfg.color)}>
                        {cfg.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

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
                      <TableHead className="w-[160px]">Status</TableHead>
                      <TableHead className="w-[220px]">Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>ATS Score</TableHead>
                      <TableHead>Missing Keywords</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookmarks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                          No jobs with status "{STATUS_CONFIG[statusFilter as ApplicationStatus]?.label}".
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookmarks.map(job => {
                        const status = getStatus(job.id);
                        const cfg = STATUS_CONFIG[status];
                        return (
                          <TableRow key={job.id}>
                            <TableCell>
                              <Select
                                value={status}
                                onValueChange={(val) => setStatus(job.id, val as ApplicationStatus)}
                              >
                                <SelectTrigger className={cn("h-7 text-xs font-semibold border-0 shadow-none w-[140px] rounded-full px-2.5", cfg.color)}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_ORDER.map((s) => (
                                    <SelectItem key={s} value={s} className="text-xs">
                                      <span className={cn("font-semibold px-1.5 py-0.5 rounded-full", STATUS_CONFIG[s].color)}>
                                        {STATUS_CONFIG[s].label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="font-medium max-w-[220px] truncate" title={job.title}>
                              <div className="truncate">{job.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{job.location}</div>
                            </TableCell>
                            <TableCell>{job.company}</TableCell>
                            <TableCell>
                              <Badge className={getScoreColor(job.ats_score)} variant="secondary">
                                {job.ats_score != null ? `${job.ats_score}` : "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[180px]">
                              {job.top_missing_keywords && job.top_missing_keywords.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {job.top_missing_keywords.slice(0, 3).map((kw, i) => (
                                    <Badge key={i} variant="outline" className="text-xs font-mono px-1.5 py-0">
                                      {kw}
                                    </Badge>
                                  ))}
                                  {job.top_missing_keywords.length > 3 && (
                                    <span className="text-xs text-muted-foreground">+{job.top_missing_keywords.length - 3}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {job.experienceLevel ? (
                                <Badge variant="outline">{job.experienceLevel}</Badge>
                              ) : <span className="text-muted-foreground text-sm">-</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleBookmark(job)}
                                      className="text-primary hover:text-destructive h-8 w-8 p-0"
                                    >
                                      <Bookmark className="h-4 w-4 fill-current" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remove</TooltipContent>
                                </Tooltip>
                                <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                                <Button size="sm" className="h-8 px-2" onClick={() => setSelectedJob(job)}>
                                  <Sparkles className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
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

      <CoverLetterPanel
        job={coverLetterJob}
        isOpen={coverLetterJob !== null}
        onClose={() => setCoverLetterJob(null)}
        resumeText={resumeText}
      />

      <EmailDigestPanel
        isOpen={emailDigestOpen}
        onClose={() => setEmailDigestOpen(false)}
        bookmarks={bookmarks}
        getStatus={getStatus}
      />

      <InterviewPrepPanel
        job={interviewPrepJob}
        isOpen={interviewPrepJob !== null}
        onClose={() => setInterviewPrepJob(null)}
        resumeText={resumeText}
      />

    </div>
  );
}
