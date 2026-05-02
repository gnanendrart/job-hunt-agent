import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, FileText, Building2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDraftCoverLetter } from "@workspace/api-client-react";
import type { JobState } from "@/hooks/use-job-search";

interface CoverLetterPanelProps {
  job: JobState | null;
  resumeText: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CoverLetterPanel({ job, resumeText, isOpen, onClose }: CoverLetterPanelProps) {
  const coverLetterMutation = useDraftCoverLetter();

  const [isLoading, setIsLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && job) {
      generate();
    } else {
      setCoverLetter(null);
      setError(null);
    }
  }, [isOpen, job]);

  const generate = async () => {
    if (!job || !resumeText) return;
    setIsLoading(true);
    setCoverLetter(null);
    setError(null);
    try {
      const result = await coverLetterMutation.mutateAsync({
        data: {
          resumeText,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
        },
      });
      setCoverLetter(result.cover_letter);
    } catch (e) {
      setError("Failed to generate cover letter. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l-border bg-card flex flex-col">
        <SheetHeader className="mb-6 shrink-0">
          <SheetTitle className="text-2xl font-bold flex items-start gap-2">
            <FileText className="h-6 w-6 text-primary mt-0.5" />
            Cover Letter Draft
          </SheetTitle>
          {job && (
            <SheetDescription className="flex flex-col gap-1 mt-2">
              <span className="text-foreground font-medium text-lg">{job.title}</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Building2 className="h-4 w-4" /> {job.company}
              </span>
            </SheetDescription>
          )}
        </SheetHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6 flex-1">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <Loader2 className="h-12 w-12 text-primary animate-spin relative" />
            </div>
            <p className="text-muted-foreground animate-pulse text-sm">
              Drafting your tailored cover letter…
            </p>
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive flex-1">
            {error}
            <Button variant="outline" size="sm" className="mt-3 block" onClick={generate}>
              Retry
            </Button>
          </div>
        )}

        {coverLetter && !isLoading && (
          <div className="flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <p className="text-xs text-muted-foreground">
                AI-generated draft — review and personalise before sending.
              </p>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
                {copied ? (
                  <><Check className="h-3.5 w-3.5 text-green-500" /> Copied</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" /> Copy</>
                )}
              </Button>
            </div>
            <div className="flex-1 rounded-xl border border-border/50 bg-background/60 p-5 overflow-y-auto">
              <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                {coverLetter}
              </pre>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-muted-foreground shrink-0"
              onClick={generate}
            >
              <Loader2 className="mr-1.5 h-3.5 w-3.5" /> Regenerate
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
