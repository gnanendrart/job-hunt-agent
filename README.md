# Job Hunt Agent

AI-powered job search assistant. Upload your resume, run a search — it scrapes LinkedIn and Indeed, scores every job against your resume, and manages your pipeline end-to-end.

**[job-hunt-agent](https://github.com/gnanendrart/job-hunt-agent)** · [Live demo](https://job-hunt-agent.onrender.com) · React · Vite · Express · Claude API · Apify
---

## What it does

**Search & scrape**
- Scrapes LinkedIn and Indeed via Apify
- Filter by job title, location, source, and date posted
- Search history with one-click re-run

**ATS scoring**
- Upload your resume (PDF)
- Every job is scored against your resume using Claude
- Missing keywords surfaced per listing

**Resume & application tools**
- Optimize resume bullets per job
- Generate a tailored cover letter
- Salary estimate per role
- Interview prep questions

**Pipeline management**
- Kanban view: five columns by status (Saved / Applied / Interviewing / Offer / Rejected)
- List view: sortable, filterable table with ATS score and quick actions
- Export pipeline to CSV
- Email digest of saved jobs with ATS scores and links

---

## Stack

| Layer | Tools |
|-------|-------|
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Backend | Express, TypeScript |
| AI | Anthropic Claude API |
| Scraping | Apify (LinkedIn Scraper, Indeed Scraper) |

---

## Setup

```bash
# Install dependencies
pnpm install

# Copy env template and fill in values
cp .env.example .env

# Start dev server
pnpm dev
```

**Environment variables:**

| Variable | Description |
|----------|-------------|
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Your Anthropic API key |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic base URL |

The Apify token is entered in the UI and saved to your browser's localStorage — no server config needed.

---

## Related

[n8n-job-search](https://github.com/gnanendrart/n8n-job-search) — automated overnight pipeline version of this workflow (n8n + Supabase + Gotenberg).  
