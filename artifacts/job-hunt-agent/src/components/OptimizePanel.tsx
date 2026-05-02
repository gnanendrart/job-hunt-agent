import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useFetchJobDescription, useOptimizeResume } from "@workspace/api-client-react";
import { Loader2, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import type { JobState } from "@/hooks/use-job-search";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface OptimizePanelProps {
  job: JobState | null;
  resumeText: string;
  apifyToken: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OptimizePanel({ job, resumeText, apifyToken, isOpen, onClose }: OptimizePanelProps) {
  const fetchJdMutation = useFetchJobDescription();
  const optimizeMutation = useOptimizeResume();

  const [isLoading, setIsLoading] = useState(false);
  const [loadStep, setLoadStep] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && job) {
      runOptimization();
    } else {
      setResult(null);
    }
  }, [isOpen, job]);

  const runOptimization = async () => {
    if (!job || !apifyToken || !resumeText) return;
    
    setIsLoading(true);
    setResult(null);
    try {
      setLoadStep("Fetching full job description from LinkedIn...");
      const jdResult = await fetchJdMutation.mutateAsync({
        data: { url: job.url, apifyToken }
      });

      setLoadStep("Running AI resume optimization...");
      const optResult = await optimizeMutation.mutateAsync({
        data: {
          resumeText,
          jobDescription: jdResult.description,
          jobTitle: job.title
        }
      });

      setResult(optResult);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadStep("");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l-border bg-card">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold flex items-start gap-2">
            <Sparkles className="h-6 w-6 text-primary mt-1" />
            Resume Optimization
          </SheetTitle>
          {job && (
            <SheetDescription className="flex flex-col gap-1 mt-2">
              <span className="text-foreground font-medium text-lg">{job.title}</span>
              <span className="flex items-center gap-1"><Building2 className="h-4 w-4"/> {job.company}</span>
            </SheetDescription>
          )}
        </SheetHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <Loader2 className="h-12 w-12 text-primary animate-spin relative" />
            </div>
            <p className="text-muted-foreground animate-pulse">{loadStep}</p>
          </div>
        )}

        {result && !isLoading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex items-center justify-between p-6 bg-accent rounded-xl border border-border/50">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Overall Match</h3>
                <p className="text-sm text-muted-foreground">After recommended changes</p>
              </div>
              <div className="text-5xl font-black text-primary">
                {result.match_score}%
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Match Breakdown
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Skills Match</span>
                    <span className="font-mono">{result.ats_breakdown?.skills_match}%</span>
                  </div>
                  <Progress value={result.ats_breakdown?.skills_match} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Experience Match</span>
                    <span className="font-mono">{result.ats_breakdown?.experience_match}%</span>
                  </div>
                  <Progress value={result.ats_breakdown?.experience_match} className="h-2 bg-secondary" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Title Match</span>
                    <span className="font-mono">{result.ats_breakdown?.title_match}%</span>
                  </div>
                  <Progress value={result.ats_breakdown?.title_match} className="h-2" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Top 3 Resume Changes</h3>
              <div className="space-y-3">
                {result.top_3_changes?.map((change: string, i: number) => (
                  <div key={i} className="flex gap-3 items-start bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-6 h-6 text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{change}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Keywords to Add</h3>
              <div className="flex flex-wrap gap-2">
                {result.keywords_to_add?.map((kw: string, i: number) => (
                  <Badge key={i} variant="secondary" className="px-3 py-1 font-mono">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Suggested Headline</h3>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <p className="font-medium text-lg leading-snug">{result.rewritten_headline}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Suggested Summary</h3>
              <Card>
                <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">
                  {result.rewritten_summary}
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
