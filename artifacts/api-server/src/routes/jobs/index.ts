import { Router, type IRouter } from "express";
import { logger } from "../../lib/logger";
import {
  SearchJobsBody,
  ScoreAtsBody,
  OptimizeResumeBody,
  FetchJobDescriptionBody,
} from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { createReadStream } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router: IRouter = Router();

function parseDateToRelative(dateStr: string): boolean {
  if (!dateStr) return false;
  const lower = dateStr.toLowerCase();
  if (lower.includes("just now") || lower.includes("moment ago")) return true;
  const hoursMatch = lower.match(/(\d+)\s*hour/);
  if (hoursMatch) return parseInt(hoursMatch[1]) <= 24;
  const minutesMatch = lower.match(/(\d+)\s*min/);
  if (minutesMatch) return true;
  if (lower.includes("1 day ago") || lower.includes("today") || lower.includes("yesterday")) return true;
  return false;
}

function extractExperienceLevel(description: string, title: string): string | null {
  const text = (description + " " + title).toLowerCase();
  if (text.includes("director") || text.includes("vp ") || text.includes("vice president") || text.includes("head of")) return "Director";
  if (text.includes("senior") || text.includes("sr.") || text.includes("lead") || text.includes("principal") || text.includes("staff")) return "Senior";
  if (text.includes("junior") || text.includes("jr.") || text.includes("entry") || text.includes("graduate") || text.includes("0-2 years") || text.includes("1-2 years")) return "Entry";
  if (text.includes("mid") || text.includes("intermediate") || text.includes("3+ years") || text.includes("2+ years") || text.includes("2-4 years")) return "Mid";
  return null;
}

function deduplicateJobs(jobs: Array<{ url: string; id: string; [key: string]: unknown }>) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    if (seen.has(job.url)) return false;
    seen.add(job.url);
    return true;
  });
}

router.post("/search-jobs", async (req, res): Promise<void> => {
  const parsed = SearchJobsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { roles, location, apifyToken } = parsed.data;
  const roleList = roles.split(",").map((r) => r.trim()).filter(Boolean);

  // Build one URL pair per role, then combine into a single Apify call
  const urls = roleList.flatMap((role) => [
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&f_TPR=r86400&start=0`,
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&f_TPR=r86400&start=25`,
  ]);

  req.log.info({ roles: roleList, urlCount: urls.length }, "Calling Apify with combined URL list");

  try {
    const response = await fetch(
      "https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/run-sync-get-dataset-items",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apifyToken}`,
        },
        body: JSON.stringify({ urls, count: 50 }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Apify request failed");
      res.status(502).json({ error: `Apify error ${response.status}: ${text.slice(0, 200)}` });
      return;
    }

    const items = await response.json() as Array<Record<string, unknown>>;

    if (!Array.isArray(items) || items.length === 0) {
      req.log.info("Apify returned no jobs");
      res.json([]);
      return;
    }

    const jobs = items
      .filter((item) => {
        const dateStr = String(item.postedAt ?? item.timeAgo ?? item.publishedAt ?? "");
        return parseDateToRelative(dateStr);
      })
      .map((item, idx) => ({
        id: String(item.id ?? item.jobId ?? `job-${idx}`),
        title: String(item.title ?? item.jobTitle ?? ""),
        company: String(item.companyName ?? item.company ?? ""),
        location: String(item.location ?? ""),
        url: String(item.link ?? item.jobUrl ?? item.url ?? ""),
        postedAt: String(item.postedAt ?? item.timeAgo ?? item.publishedAt ?? ""),
        description: String(item.description ?? item.jobDescription ?? ""),
        experienceLevel: extractExperienceLevel(
          String(item.description ?? item.jobDescription ?? ""),
          String(item.title ?? item.jobTitle ?? "")
        ),
      }));

    const uniqueJobs = deduplicateJobs(
      jobs as Array<{ url: string; id: string; [key: string]: unknown }>
    );

    req.log.info({ total: items.length, afterFilter: uniqueJobs.length }, "Jobs fetched and filtered");
    res.json(uniqueJobs);
  } catch (err) {
    req.log.error({ err }, "Error in search-jobs");
    res.status(500).json({ error: "Failed to fetch jobs from Apify" });
  }
});

router.post("/score-ats", async (req, res): Promise<void> => {
  const parsed = ScoreAtsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { resumeText, jobTitle, jobSnippet } = parsed.data;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `You are an expert ATS (Applicant Tracking System) analyzer. Analyze how well the resume matches the job description and return a genuine, varied score.

Job Title: ${jobTitle}

Job Description:
${jobSnippet.slice(0, 3000)}

Resume Text:
${resumeText.slice(0, 3000)}

Instructions:
1. Identify the 10 most important keywords/requirements from the job description
2. Count how many of these keywords appear in the resume
3. Consider also: skills match, experience level alignment, title relevance, industry terminology
4. Return a GENUINE score that reflects actual match quality — scores should vary widely based on fit (not clustered around 50-70)
5. If the resume is clearly an excellent match, score 75-95
6. If it's a decent match with gaps, score 45-65
7. If it's a poor match, score 15-35
8. Missing keywords are the most important keywords NOT in the resume

Return ONLY valid JSON with this exact structure:
{
  "ats_score": <number 0-100>,
  "match_tier": <"High Match" | "Medium Match" | "Low Match">,
  "top_missing_keywords": [<array of 3-7 important missing keywords>]
}`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Invalid AI response" });
      return;
    }

    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Could not parse AI response" });
      return;
    }

    const result = JSON.parse(jsonMatch[0]);
    const atsScore = Math.min(100, Math.max(0, Number(result.ats_score)));
    const tier = atsScore >= 72 ? "High Match" : atsScore >= 42 ? "Medium Match" : "Low Match";

    res.json({
      ats_score: atsScore,
      match_tier: tier,
      top_missing_keywords: Array.isArray(result.top_missing_keywords) ? result.top_missing_keywords : [],
    });
  } catch (err) {
    req.log.error({ err }, "Error in score-ats");
    res.status(500).json({ error: "Failed to score resume" });
  }
});

router.post("/optimize-resume", async (req, res): Promise<void> => {
  const parsed = OptimizeResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { resumeText, jobDescription, jobTitle } = parsed.data;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `You are an expert resume writer and ATS optimization specialist. Analyze this resume against the job description and provide detailed, actionable optimization recommendations.

${jobTitle ? `Job Title: ${jobTitle}` : ""}

Job Description:
${jobDescription.slice(0, 4000)}

Resume:
${resumeText.slice(0, 4000)}

Provide a comprehensive resume optimization report. Be specific and actionable. Return ONLY valid JSON:
{
  "match_score": <overall match percentage 0-100>,
  "ats_breakdown": {
    "skills_match": <percentage 0-100 of required skills present>,
    "experience_match": <percentage 0-100 of experience requirements met>,
    "title_match": <percentage 0-100 of title/role alignment>
  },
  "top_3_changes": [
    "<specific, actionable change #1 — be concrete, e.g. 'Add Python proficiency to your skills section — it appears 8 times in the job description'>",
    "<specific, actionable change #2>",
    "<specific, actionable change #3>"
  ],
  "keywords_to_add": [<array of 5-10 specific keywords/phrases from the JD missing from the resume>],
  "rewritten_headline": "<a compelling 1-2 line professional headline optimized for this role>",
  "rewritten_summary": "<a 3-4 sentence professional summary rewritten to match this job's requirements, highlighting relevant experience and skills>"
}`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Invalid AI response" });
      return;
    }

    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Could not parse AI response" });
      return;
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json({
      match_score: Math.min(100, Math.max(0, Number(result.match_score ?? 0))),
      ats_breakdown: {
        skills_match: Math.min(100, Math.max(0, Number(result.ats_breakdown?.skills_match ?? 0))),
        experience_match: Math.min(100, Math.max(0, Number(result.ats_breakdown?.experience_match ?? 0))),
        title_match: Math.min(100, Math.max(0, Number(result.ats_breakdown?.title_match ?? 0))),
      },
      top_3_changes: Array.isArray(result.top_3_changes) ? result.top_3_changes.slice(0, 3) : [],
      keywords_to_add: Array.isArray(result.keywords_to_add) ? result.keywords_to_add : [],
      rewritten_headline: String(result.rewritten_headline ?? ""),
      rewritten_summary: String(result.rewritten_summary ?? ""),
    });
  } catch (err) {
    req.log.error({ err }, "Error in optimize-resume");
    res.status(500).json({ error: "Failed to optimize resume" });
  }
});

router.post("/fetch-jd", async (req, res): Promise<void> => {
  const parsed = FetchJobDescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, apifyToken } = parsed.data;

  try {
    const response = await fetch("https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apifyToken}`,
      },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        crawlerType: "playwright:chrome",
      }),
    });

    if (!response.ok) {
      req.log.warn({ status: response.status }, "Apify JD fetch failed");
      res.json({ description: "" });
      return;
    }

    const items = await response.json() as Array<{ text?: string; markdown?: string }>;
    const description = items?.[0]?.text ?? items?.[0]?.markdown ?? "";
    res.json({ description: description.slice(0, 8000) });
  } catch (err) {
    req.log.error({ err }, "Error in fetch-jd");
    res.json({ description: "" });
  }
});

export default router;
