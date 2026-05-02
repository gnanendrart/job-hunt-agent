import { useMemo, useState } from "react";
import { ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { analyzeKeywords, analyzeResumeGaps, type KeywordFrequency } from "@/lib/keyword-analyzer";

interface Props {
  jobs: { description?: string | null }[];
  resumeText: string;
}

function priorityConfig(pct: number) {
  if (pct >= 60) return { label: "Critical",     classes: "bg-red-500/15 text-red-400 border-red-500/30" };
  if (pct >= 35) return { label: "High",         classes: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" };
  return               { label: "Nice to have",  classes: "bg-muted/60 text-muted-foreground border-border/40" };
}

function coverageColor(pct: number) {
  if (pct >= 70) return { ring: "text-green-500",  track: "bg-green-500",  label: "Strong" };
  if (pct >= 40) return { ring: "text-yellow-500", track: "bg-yellow-500", label: "Moderate" };
  return               { ring: "text-red-400",     track: "bg-red-400",    label: "Weak" };
}

function GapRow({ kw }: { kw: KeywordFrequency }) {
  const p = priorityConfig(kw.pct);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
      <span className="flex-1 text-sm font-medium">{kw.keyword}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{kw.pct}% of jobs</span>
      <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4 font-medium", p.classes)}>
        {p.label}
      </Badge>
    </div>
  );
}

function PresentRow({ kw }: { kw: KeywordFrequency }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
      <span className="flex-1 text-sm text-muted-foreground">{kw.keyword}</span>
      <span className="text-xs text-muted-foreground/60 tabular-nums">{kw.pct}% of jobs</span>
    </div>
  );
}

export function ResumeGapAnalyzer({ jobs, resumeText }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showPresent, setShowPresent] = useState(false);

  const { gaps, present, coveragePct } = useMemo(() => {
    const market = analyzeKeywords(jobs, 20);
    return analyzeResumeGaps(market, resumeText);
  }, [jobs, resumeText]);

  if (!resumeText || jobs.length === 0) return null;

  const cc = coverageColor(coveragePct);
  const criticalCount = gaps.filter((g) => g.pct >= 60).length;
  const highCount = gaps.filter((g) => g.pct >= 35 && g.pct < 60).length;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="bg-red-500/10 text-red-400 p-1.5 rounded-lg">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold">Resume Gap Analysis</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              How well your resume matches the top market keywords
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                {criticalCount} critical gap{criticalCount !== 1 ? "s" : ""}
              </div>
            )}
            {highCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                {highCount} high
              </div>
            )}
            <div className={cn("text-xs font-semibold tabular-nums", cc.ring)}>
              {coveragePct}% covered
            </div>
          </div>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5">

          {/* Coverage bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Resume keyword coverage</span>
              <span className={cn("font-semibold", cc.ring)}>{coveragePct}% — {cc.label}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", cc.track)}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {present.length} of {present.length + gaps.length} top market skills found in your resume
            </p>
          </div>

          {/* Gaps */}
          {gaps.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-red-400">
                  Missing from resume
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 h-4 text-red-400 border-red-500/30">
                  {gaps.length}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground/60 ml-auto">
                  <Info className="h-3 w-3" />
                  sorted by demand
                </div>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/40 px-4 divide-y divide-border/20">
                {gaps.map((g) => <GapRow key={g.keyword} kw={g} />)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-400">No gaps found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your resume already covers all the top market keywords.
                </p>
              </div>
            </div>
          )}

          {/* Present — collapsible */}
          {present.length > 0 && (
            <div>
              <button
                className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setShowPresent((v) => !v); }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-green-500">
                  Already on your resume
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 h-4 text-green-500 border-green-500/30">
                  {present.length}
                </Badge>
                {showPresent
                  ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
              </button>
              {showPresent && (
                <div className="rounded-lg border border-border/40 bg-background/40 px-4 divide-y divide-border/20">
                  {present.map((p) => <PresentRow key={p.keyword} kw={p} />)}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
