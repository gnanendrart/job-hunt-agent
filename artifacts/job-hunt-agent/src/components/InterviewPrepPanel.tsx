import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, MessageSquare, Building2, ChevronDown, ChevronUp, Copy, Check, RotateCcw, Users, Code2, Briefcase, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInterviewPrep } from "@workspace/api-client-react";
import type { InterviewPrepQuestion } from "@workspace/api-client-react";
import type { JobState } from "@/hooks/use-job-search";
import { cn } from "@/lib/utils";

interface InterviewPrepPanelProps {
  job: JobState | null;
  resumeText: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Section {
  key: "behavioral" | "technical" | "role_specific";
  label: string;
  description: string;
  icon: React.ReactNode;
  badgeClass: string;
}

const SECTIONS: Section[] = [
  {
    key: "behavioral",
    label: "Behavioral",
    description: "Past-situation questions using the STAR method",
    icon: <Users className="h-4 w-4" />,
    badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    key: "technical",
    label: "Technical",
    description: "Skills and knowledge specific to this role",
    icon: <Code2 className="h-4 w-4" />,
    badgeClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    key: "role_specific",
    label: "Role & Company",
    description: "Questions about this company and specific scope",
    icon: <Briefcase className="h-4 w-4" />,
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
];

function QuestionCard({
  q,
  index,
  badgeClass,
}: {
  q: InterviewPrepQuestion;
  index: number;
  badgeClass: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors group"
      >
        <Badge variant="outline" className={cn("shrink-0 mt-0.5 font-mono text-xs", badgeClass)}>
          Q{index + 1}
        </Badge>
        <span className="flex-1 text-sm font-medium leading-relaxed">{q.question}</span>
        <span className="shrink-0 mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0">
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 flex gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{q.tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function InterviewPrepPanel({ job, resumeText, isOpen, onClose }: InterviewPrepPanelProps) {
  const prepMutation = useInterviewPrep();

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    behavioral: InterviewPrepQuestion[];
    technical: InterviewPrepQuestion[];
    role_specific: InterviewPrepQuestion[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<"behavioral" | "technical" | "role_specific">("behavioral");

  useEffect(() => {
    if (isOpen && job) {
      generate();
    } else {
      setResult(null);
      setError(null);
    }
  }, [isOpen, job]);

  const generate = async () => {
    if (!job) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setActiveSection("behavioral");

    try {
      const data = await prepMutation.mutateAsync({
        data: {
          resumeText,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description ?? "",
        },
      });
      setResult(data);
    } catch {
      setError("Failed to generate interview questions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const lines: string[] = [];
    for (const section of SECTIONS) {
      lines.push(`\n## ${section.label} Questions\n`);
      result[section.key].forEach((q, i) => {
        lines.push(`Q${i + 1}: ${q.question}`);
        lines.push(`Tip: ${q.tip}\n`);
      });
    }
    await navigator.clipboard.writeText(lines.join("\n").trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalQuestions = result
    ? result.behavioral.length + result.technical.length + result.role_specific.length
    : 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 gap-0">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <SheetTitle>Interview Prep</SheetTitle>
          </div>
          {job && (
            <SheetDescription className="flex items-center gap-1.5 text-sm">
              <Building2 className="h-3.5 w-3.5" />
              {job.title} · {job.company}
            </SheetDescription>
          )}

          {result && (
            <div className="flex items-center justify-between pt-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {totalQuestions} questions generated
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={generate} className="gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                </Button>
                <Button size="sm" onClick={handleCopyAll} className="gap-1.5 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy All"}
                </Button>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Loading */}
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <p className="font-medium">Crafting your interview questions…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analysing the job description and your resume to personalise each question
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-destructive text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={generate}>Try again</Button>
            </div>
          )}

          {/* Results */}
          {result && !isLoading && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Section tabs */}
              <div className="flex border-b border-border/50 px-6 shrink-0">
                {SECTIONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setActiveSection(s.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors -mb-px",
                      activeSection === s.key
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.icon}
                    {s.label}
                    <Badge variant="outline" className="ml-1 font-mono text-[10px] px-1.5 py-0 h-4">
                      {result[s.key].length}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* Questions */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {SECTIONS.filter((s) => s.key === activeSection).map((s) => (
                  <div key={s.key}>
                    <p className="text-xs text-muted-foreground mb-4">{s.description} — click any question to reveal coaching tips.</p>
                    <div className="space-y-2">
                      {result[s.key].map((q, i) => (
                        <QuestionCard key={i} q={q} index={i} badgeClass={s.badgeClass} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}
