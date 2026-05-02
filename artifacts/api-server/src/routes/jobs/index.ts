import { Router, type IRouter } from "express";
import { logger } from "../../lib/logger";
import {
  SearchJobsBody,
  ScoreAtsBody,
  OptimizeResumeBody,
  FetchJobDescriptionBody,
  CoverLetterBody,
  ValidateTokenBody,
  InterviewPrepBody,
  SalaryInsightsBody,
} from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { createReadStream } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router: IRouter = Router();

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

  const { roles, location, apifyToken, datePosted = "24h" } = parsed.data;
  const roleList = roles.split(",").map((r) => r.trim()).filter(Boolean);
  const locationList = location.split(",").map((l) => l.trim()).filter(Boolean);

  const tprParam =
    datePosted === "24h" ? "&f_TPR=r86400" :
    datePosted === "week" ? "&f_TPR=r604800" :
    "";

  // LinkedIn search uses + for spaces, not %20
  const liEncode = (s: string) => encodeURIComponent(s).replace(/%20/g, "+");

  // Build two URLs (start=0, start=25) for every role × location combination
  const urls = roleList.flatMap((role) =>
    locationList.flatMap((loc) => [
      `https://www.linkedin.com/jobs/search/?keywords=${liEncode(role)}&location=${liEncode(loc)}${tprParam}&start=0`,
      `https://www.linkedin.com/jobs/search/?keywords=${liEncode(role)}&location=${liEncode(loc)}${tprParam}&start=25`,
    ])
  );

  req.log.info({ roles: roleList, locations: locationList, urlCount: urls.length }, "Calling Apify with combined URL list");

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

    const jobs = items.map((item, idx) => ({
      id: String(item.id ?? item.jobId ?? `job-${idx}`),
      title: String(item.title ?? item.jobTitle ?? ""),
      company: String(item.companyName ?? ""),
      location: String(item.location ?? ""),
      url: String(item.link ?? ""),
      postedAt: String(item.postedAt ?? ""),
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

router.post("/salary-insights", async (req, res): Promise<void> => {
  const parsed = SalaryInsightsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { jobTitle, company, location, experienceLevel } = parsed.data;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are a compensation data expert with deep knowledge of tech and professional salaries globally. Estimate a realistic salary range for this position.

Job Title: ${jobTitle}
Company: ${company}
Location: ${location}${experienceLevel ? `\nExperience Level: ${experienceLevel}` : ""}

Return ONLY a valid JSON object with no markdown, no commentary:
{
  "base_low": <integer annual base salary, lower bound>,
  "base_high": <integer annual base salary, upper bound>,
  "total_low": <integer total comp including bonus/equity lower bound>,
  "total_high": <integer total comp including bonus/equity upper bound>,
  "currency": "<3-letter ISO currency code for the location, e.g. USD, GBP, CAD, EUR, AUD>",
  "confidence": "<high|medium|low>",
  "notes": "<1-2 sentence explanation covering equity/bonus structure typical for this role/company, and what drives the range>"
}

Guidelines:
- Use real-world market data knowledge for ${company} specifically if known (FAANG, startup, enterprise all differ)
- Account for ${location} cost-of-living and local market (e.g. SF vs Austin vs London vs Remote)
- confidence: "high" if role/company/location is well-known, "medium" if partially known, "low" if speculative
- Total comp should realistically include typical annual bonus % and annualised equity for the seniority level
- All numbers as plain integers (no commas, no symbols)`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Invalid AI response" });
      return;
    }

    let result;
    try {
      result = JSON.parse(block.text.trim());
    } catch {
      const match = block.text.match(/\{[\s\S]*\}/);
      if (!match) {
        res.status(500).json({ error: "Could not parse salary response" });
        return;
      }
      result = JSON.parse(match[0]);
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error in salary-insights");
    res.status(500).json({ error: "Failed to estimate salary" });
  }
});

router.post("/interview-prep", async (req, res): Promise<void> => {
  const parsed = InterviewPrepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { resumeText, jobTitle, company, jobDescription } = parsed.data;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are an expert interview coach. Generate targeted interview questions for this candidate applying to this specific role.

Job Title: ${jobTitle}
Company: ${company}

Job Description:
${jobDescription.slice(0, 3000)}

Candidate's Resume:
${resumeText.slice(0, 3000)}

Generate exactly 4 questions in each of the 3 categories below. For each question include a concise "tip" (2-3 sentences of practical coaching advice specific to this role and the candidate's background — what to highlight, what experience to draw from).

Return ONLY a valid JSON object with this exact structure, no markdown, no commentary:
{
  "behavioral": [
    { "question": "...", "tip": "..." },
    ...4 items
  ],
  "technical": [
    { "question": "...", "tip": "..." },
    ...4 items
  ],
  "role_specific": [
    { "question": "...", "tip": "..." },
    ...4 items
  ]
}

Guidelines:
- behavioral: STAR-format questions about past situations (teamwork, conflict, failure, leadership)
- technical: Skills and knowledge questions directly tied to the job description's requirements
- role_specific: Questions about THIS company, industry, and the specific scope of this role
- Make questions challenging but fair — what a real interviewer at ${company} would ask
- Tips should reference the candidate's actual resume experience where relevant`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Invalid AI response" });
      return;
    }

    let result;
    try {
      result = JSON.parse(block.text.trim());
    } catch {
      const match = block.text.match(/\{[\s\S]*\}/);
      if (!match) {
        res.status(500).json({ error: "Could not parse AI response as JSON" });
        return;
      }
      result = JSON.parse(match[0]);
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error in interview-prep");
    res.status(500).json({ error: "Failed to generate interview questions" });
  }
});

router.post("/validate-token", async (req, res): Promise<void> => {
  const parsed = ValidateTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { apifyToken } = parsed.data;

  try {
    const response = await fetch("https://api.apify.com/v2/users/me", {
      headers: { Authorization: `Bearer ${apifyToken}` },
    });

    if (response.status === 401 || response.status === 403) {
      res.json({ valid: false, message: "Invalid or expired token" });
      return;
    }

    if (!response.ok) {
      res.json({ valid: false, message: `Apify returned ${response.status}` });
      return;
    }

    const data = await response.json() as { username?: string; plan?: { id?: string } };
    res.json({
      valid: true,
      username: data.username,
      plan: data.plan?.id,
    });
  } catch (err) {
    req.log.error({ err }, "Error in validate-token");
    res.json({ valid: false, message: "Network error reaching Apify" });
  }
});

router.post("/cover-letter", async (req, res): Promise<void> => {
  const parsed = CoverLetterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { resumeText, jobTitle, company, jobDescription } = parsed.data;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an expert career coach and professional writer. Write a tailored, compelling cover letter for this job application.

Job Title: ${jobTitle}
Company: ${company}

Job Description:
${jobDescription.slice(0, 3000)}

Candidate's Resume:
${resumeText.slice(0, 3000)}

Instructions:
- Write a professional cover letter of 3-4 paragraphs (around 300-400 words)
- Opening paragraph: Hook with genuine enthusiasm for this specific role and company; reference something specific from the job description
- Middle paragraphs (1-2): Draw concrete connections between the candidate's actual experience from the resume and the role's key requirements; use specific achievements and skills from the resume
- Closing paragraph: Clear call to action, express eagerness for an interview
- Tone: Confident, warm, professional — not generic or overly formal
- Do NOT use placeholder text like [Your Name] — write it as a ready-to-use letter starting with "Dear Hiring Manager,"
- Do NOT include a signature block or date
- Return ONLY the cover letter text, no commentary or explanation`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Invalid AI response" });
      return;
    }

    res.json({ cover_letter: block.text.trim() });
  } catch (err) {
    req.log.error({ err }, "Error in cover-letter");
    res.status(500).json({ error: "Failed to generate cover letter" });
  }
});

export default router;
