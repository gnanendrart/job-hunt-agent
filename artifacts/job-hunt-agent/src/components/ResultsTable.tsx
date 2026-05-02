import { useState, useMemo } from "react";
import { ArrowUpDown, ExternalLink, Sparkles, Loader2, Bookmark, BookmarkCheck, FileText, MessageSquare, DollarSign, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { JobState } from "@/hooks/use-job-search";
import type { SalaryInsight } from "@workspace/api-client-react/src/generated/api.schemas";
import { cn } from "@/lib/utils";

interface ResultsTableProps {
  jobs: JobState[];
  onOptimize: (job: JobState) => void;
  onCoverLetter: (job: JobState) => void;
  onInterviewPrep: (job: JobState) => void;
  onGetSalary: (job: JobState) => void;
  onSalaryAll: () => void;
  isSalaryingAll: boolean;
  onScoreAll: () => void;
  isScoringAll: boolean;
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (job: JobState) => void;
}

type SortField = "title" | "company" | "location" | "ats_score" | "postedAt";

function formatSalary(low: number, high: number, currency: string): string {
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
  const symbol = ({ USD: "$", GBP: "£", EUR: "€", CAD: "CA$", AUD: "A$" } as Record<string, string>)[currency] ?? "$";
  return `${symbol}${fmt(low)}–${fmt(high)}`;
}

const CONFIDENCE_CONFIG = {
  high:   { label: "High confidence",   dot: "bg-green-400" },
  medium: { label: "Medium confidence", dot: "bg-yellow-400" },
  low:    { label: "Low confidence",    dot: "bg-orange-400" },
};

function SalaryCell({ job, onGetSalary }: { job: JobState; onGetSalary: (job: JobState) => void }) {
  if (job.isFetchingSalary) {
    return (
      <Badge variant="outline" className="bg-muted animate-pulse gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Estimating
      </Badge>
    );
  }

  if (job.salary) {
    const s = job.salary as SalaryInsight;
    const conf = CONFIDENCE_CONFIG[s.confidence];
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 cursor-default gap-1 font-mono text-xs"
          >
            <DollarSign className="h-3 w-3" />
            {formatSalary(s.base_low, s.base_high, s.currency)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[260px] space-y-2 p-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Base salary</span>
              <span className="font-semibold">{formatSalary(s.base_low, s.base_high, s.currency)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total comp</span>
              <span className="font-semibold text-emerald-400">{formatSalary(s.total_low, s.total_high, s.currency)}</span>
            </div>
          </div>
          <div className="border-t border-border/50 pt-2 flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", conf.dot)} />
            <span className="text-xs text-muted-foreground">{conf.label}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{s.notes}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      onClick={() => onGetSalary(job)}
      className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors flex items-center gap-1 group"
    >
      <DollarSign className="h-3 w-3 group-hover:text-emerald-400" />
      <span>Estimate</span>
    </button>
  );
}

const getScoreColor = (score?: number | null) => {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 72) return "bg-green-500/20 text-green-500 hover:bg-green-500/30";
  if (score >= 42) return "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30";
  return "bg-red-500/20 text-red-500 hover:bg-red-500/30";
};

export function ResultsTable({
  jobs, onOptimize, onCoverLetter, onInterviewPrep,
  onGetSalary, onSalaryAll, isSalaryingAll,
  onScoreAll, isScoringAll, isBookmarked, toggleBookmark,
}: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>("ats_score");
  const [sortDesc, setSortDesc] = useState(true);
  const [expFilter, setExpFilter] = useState("All");
  const [minScoreFilter, setMinScoreFilter] = useState([0]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (expFilter !== "All" && job.experienceLevel !== expFilter && job.experienceLevel) return false;
      if (minScoreFilter[0] > 0) {
        if (job.ats_score == null || job.ats_score < minScoreFilter[0]) return false;
      }
      return true;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal == null) aVal = sortField === "ats_score" ? -1 : "";
      if (bVal == null) bVal = sortField === "ats_score" ? -1 : "";
      if (aVal < bVal) return sortDesc ? 1 : -1;
      if (aVal > bVal) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [jobs, sortField, sortDesc, expFilter, minScoreFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDesc(!sortDesc);
    else { setSortField(field); setSortDesc(true); }
  };

  const scoredCount = jobs.filter(j => j.ats_score != null).length;
  const estimatedCount = jobs.filter(j => j.salary != null).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-end justify-between bg-card p-4 rounded-xl border">
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <Label>Experience Level</Label>
            <Select value={expFilter} onValueChange={setExpFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Levels</SelectItem>
                <SelectItem value="Entry">Entry</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="Senior">Senior</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 w-[200px]">
            <div className="flex justify-between">
              <Label>Min ATS Score</Label>
              <span className="text-xs text-muted-foreground">{minScoreFilter[0]}</span>
            </div>
            <Slider value={minScoreFilter} onValueChange={setMinScoreFilter} max={100} step={1} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {jobs.length} jobs · {scoredCount} scored · {estimatedCount} estimated
          </div>
          <Button
            variant="outline"
            onClick={onSalaryAll}
            disabled={isSalaryingAll || estimatedCount === jobs.length}
            className="gap-2"
          >
            {isSalaryingAll ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Estimating...</>
            ) : (
              <><TrendingUp className="h-4 w-4" /> Estimate All Salaries</>
            )}
          </Button>
          <Button onClick={onScoreAll} disabled={isScoringAll || scoredCount === jobs.length}>
            {isScoringAll ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scoring...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Score All</>
            )}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-[260px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort("title")}>
                Job Title {sortField === "title" && <ArrowUpDown className="ml-1 inline h-3 w-3" />}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("company")}>
                Company {sortField === "company" && <ArrowUpDown className="ml-1 inline h-3 w-3" />}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("location")}>
                Location {sortField === "location" && <ArrowUpDown className="ml-1 inline h-3 w-3" />}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("ats_score")}>
                ATS Score {sortField === "ats_score" && <ArrowUpDown className="ml-1 inline h-3 w-3" />}
              </TableHead>
              <TableHead>Salary (Base)</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("postedAt")}>
                Posted {sortField === "postedAt" && <ArrowUpDown className="ml-1 inline h-3 w-3" />}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No jobs match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map(job => (
                <TableRow key={job.id} className={isBookmarked(job.id) ? "bg-primary/5" : ""}>
                  <TableCell className="pr-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => toggleBookmark(job)}
                          className="p-1 rounded hover:bg-muted/60 transition-colors"
                          aria-label={isBookmarked(job.id) ? "Remove bookmark" : "Bookmark job"}
                        >
                          {isBookmarked(job.id)
                            ? <BookmarkCheck className="h-4 w-4 text-primary" />
                            : <Bookmark className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{isBookmarked(job.id) ? "Remove bookmark" : "Save job"}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="font-medium max-w-[260px] truncate" title={job.title}>{job.title}</TableCell>
                  <TableCell>{job.company}</TableCell>
                  <TableCell>{job.location}</TableCell>
                  <TableCell>
                    {job.isScoring ? (
                      <Badge variant="outline" className="bg-muted animate-pulse">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Scoring
                      </Badge>
                    ) : (
                      <Badge className={getScoreColor(job.ats_score)} variant="secondary">
                        {job.ats_score != null ? `${job.ats_score}` : "Unscored"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <SalaryCell job={job} onGetSalary={onGetSalary} />
                  </TableCell>
                  <TableCell>
                    {job.experienceLevel
                      ? <Badge variant="outline">{job.experienceLevel}</Badge>
                      : <span className="text-muted-foreground text-sm">-</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(job.postedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                          Apply <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onCoverLetter(job)}>
                        <FileText className="mr-1 h-3 w-3" /> Cover Letter
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onInterviewPrep(job)}>
                        <MessageSquare className="mr-1 h-3 w-3" /> Interview Prep
                      </Button>
                      <Button size="sm" onClick={() => onOptimize(job)}>
                        <Sparkles className="mr-1 h-3 w-3" /> Optimize
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
