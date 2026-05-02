import { useMemo, useState } from "react";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { analyzeKeywords, type KeywordFrequency } from "@/lib/keyword-analyzer";

interface Props {
  jobs: { description?: string | null }[];
}

function barColor(pct: number) {
  if (pct >= 60) return "bg-green-500";
  if (pct >= 35) return "bg-yellow-500";
  return "bg-primary";
}

function labelColor(pct: number) {
  if (pct >= 60) return "text-green-500";
  if (pct >= 35) return "text-yellow-500";
  return "text-primary";
}

export function KeywordAnalyzer({ jobs }: Props) {
  const [expanded, setExpanded] = useState(true);
  const keywords: KeywordFrequency[] = useMemo(() => analyzeKeywords(jobs, 20), [jobs]);

  if (keywords.length === 0) return null;

  const maxPct = keywords[0]?.pct ?? 1;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="bg-primary/15 text-primary p-1.5 rounded-lg">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold">Market Keyword Insights</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top skills mentioned across {jobs.length} job description{jobs.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> ≥ 60%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> ≥ 35%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> &lt; 35%
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {keywords.map((kw, i) => (
              <div key={kw.keyword} className="flex items-center gap-3 group">
                <span className="text-xs text-muted-foreground/60 w-5 text-right shrink-0 font-mono">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{kw.keyword}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className={cn("text-xs font-semibold tabular-nums", labelColor(kw.pct))}>
                        {kw.pct}%
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 font-mono text-muted-foreground"
                      >
                        {kw.count}/{jobs.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", barColor(kw.pct))}
                      style={{ width: `${(kw.pct / maxPct) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
