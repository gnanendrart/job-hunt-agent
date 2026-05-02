import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, Mail } from "lucide-react";
import type { JobState } from "@/hooks/use-job-search";
import { type ApplicationStatus, STATUS_CONFIG } from "@/hooks/use-bookmarks";

interface EmailDigestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: JobState[];
  getStatus: (id: string) => ApplicationStatus;
}

const STATUS_ORDER: ApplicationStatus[] = ["offer", "interviewing", "applied", "saved", "rejected"];

const STATUS_COLORS: Record<ApplicationStatus, { bg: string; text: string; border: string }> = {
  offer:        { bg: "#14532d", text: "#4ade80", border: "#166534" },
  interviewing: { bg: "#713f12", text: "#fbbf24", border: "#854d0e" },
  applied:      { bg: "#1e3a5f", text: "#60a5fa", border: "#1e40af" },
  saved:        { bg: "#27272a", text: "#a1a1aa", border: "#3f3f46" },
  rejected:     { bg: "#450a0a", text: "#f87171", border: "#7f1d1d" },
};

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "#71717a";
  if (score >= 80) return "#4ade80";
  if (score >= 60) return "#facc15";
  return "#f87171";
}

function generateHtml(
  bookmarks: JobState[],
  getStatus: (id: string) => ApplicationStatus
): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const grouped: Record<ApplicationStatus, JobState[]> = {
    offer: [], interviewing: [], applied: [], saved: [], rejected: [],
  };
  for (const job of bookmarks) {
    const s = getStatus(job.id);
    grouped[s].push(job);
  }

  const pipelineSummary = STATUS_ORDER.map((s) => {
    const count = grouped[s].length;
    if (count === 0) return "";
    const c = STATUS_COLORS[s];
    return `
      <td style="text-align:center;padding:0 12px;">
        <div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px 20px;display:inline-block;min-width:80px;">
          <div style="font-size:28px;font-weight:900;color:${c.text};line-height:1;">${count}</div>
          <div style="font-size:11px;font-weight:600;color:${c.text};margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">${STATUS_CONFIG[s].label}</div>
        </div>
      </td>`;
  }).join("");

  const sections = STATUS_ORDER.map((s) => {
    const jobs = grouped[s];
    if (jobs.length === 0) return "";
    const c = STATUS_COLORS[s];

    const jobCards = jobs.map((job) => {
      const score = job.ats_score;
      const sc = scoreColor(score);
      const scoreBlock = score != null
        ? `<span style="background:#1c1c1e;border:1px solid ${sc};color:${sc};border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;margin-left:8px;">${score}</span>`
        : `<span style="background:#1c1c1e;border:1px solid #3f3f46;color:#71717a;border-radius:999px;padding:2px 10px;font-size:12px;">—</span>`;

      const keywords = (job.top_missing_keywords ?? []).slice(0, 5);
      const keywordBadges = keywords.length > 0
        ? `<div style="margin-top:10px;"><span style="font-size:11px;color:#71717a;margin-right:6px;">Missing keywords:</span>${keywords.map(k => `<span style="background:#27272a;color:#a1a1aa;border:1px solid #3f3f46;border-radius:4px;padding:1px 7px;font-size:11px;font-family:monospace;margin-right:4px;">${k}</span>`).join("")}</div>`
        : "";

      return `
        <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:18px 20px;margin-bottom:10px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:top;">
              <div style="font-size:15px;font-weight:700;color:#fafafa;line-height:1.3;">${job.title} ${scoreBlock}</div>
              <div style="font-size:13px;color:#a1a1aa;margin-top:4px;">${job.company}${job.location ? ` &middot; ${job.location}` : ""}</div>
              ${job.experienceLevel ? `<div style="margin-top:6px;"><span style="background:#27272a;color:#a1a1aa;border-radius:4px;padding:2px 8px;font-size:11px;">${job.experienceLevel}</span></div>` : ""}
              ${keywordBadges}
            </td>
            <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:16px;">
              <a href="${job.url}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;">Apply →</a>
            </td>
          </tr></table>
        </div>`;
    }).join("");

    return `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <span style="background:${c.bg};color:${c.text};border:1px solid ${c.border};border-radius:999px;padding:3px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${STATUS_CONFIG[s].label}</span>
          <span style="font-size:12px;color:#52525b;">${jobs.length} job${jobs.length !== 1 ? "s" : ""}</span>
        </div>
        ${jobCards}
      </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Job Hunt Weekly Digest — ${today}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;min-height:100vh;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="padding-bottom:28px;">
    <div style="background:linear-gradient(135deg,#1c1c1e 0%,#18181b 100%);border:1px solid #27272a;border-radius:16px;padding:28px 32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="font-size:22px;font-weight:900;color:#fafafa;letter-spacing:-0.03em;">Job Hunt</span>
        <span style="background:#7c3aed;color:#fff;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:0.05em;">WEEKLY DIGEST</span>
      </div>
      <div style="font-size:13px;color:#71717a;">${today} &middot; ${bookmarks.length} saved job${bookmarks.length !== 1 ? "s" : ""}</div>
    </div>
  </td></tr>

  <!-- Pipeline summary -->
  <tr><td style="padding-bottom:28px;">
    <div style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:20px;">
      <div style="font-size:11px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">Application Pipeline</div>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>${pipelineSummary}</tr></table>
    </div>
  </td></tr>

  <!-- Job sections -->
  <tr><td>
    ${sections}
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding-top:28px;text-align:center;">
    <div style="font-size:11px;color:#3f3f46;">Generated by Job Hunt Agent &middot; ${new Date().getFullYear()}</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function EmailDigestPanel({ isOpen, onClose, bookmarks, getStatus }: EmailDigestPanelProps) {
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<"preview" | "html">("preview");

  const html = useMemo(
    () => generateHtml(bookmarks, getStatus),
    [bookmarks, getStatus]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-hunt-digest-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <SheetTitle>Email Digest</SheetTitle>
          </div>
          <SheetDescription>
            A formatted HTML email of your {bookmarks.length} saved job{bookmarks.length !== 1 ? "s" : ""} — copy and paste it into Gmail, Outlook, or any email client.
          </SheetDescription>

          {/* Toggle + Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setActiveView("preview")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeView === "preview"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveView("html")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeView === "html"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                HTML Source
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Download .html
              </Button>
              <Button size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy HTML"}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {activeView === "preview" ? (
            <iframe
              srcDoc={html}
              title="Email Digest Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="h-full overflow-auto bg-muted/30 p-4">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
                {html}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
