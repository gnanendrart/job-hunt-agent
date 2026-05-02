# Job Hunt Agent

A full-stack AI-powered job search tool that scrapes LinkedIn for recent job postings, scores them against your resume using Claude AI, and helps you optimize your resume for each specific role.

## Architecture

- **Frontend**: React + Vite at `/` (artifact: `job-hunt-agent`)
- **Backend**: Express API server at `/api` (artifact: `api-server`)
- **AI**: Claude Sonnet 4.6 via Replit AI Integrations (Anthropic) — no user API key needed

## Features

- Upload a PDF resume (parsed client-side via pdfjs-dist — text never leaves the browser)
- Enter Apify token (saved to localStorage), job titles (comma-separated), and location
- Scrapes LinkedIn via Apify for jobs posted in the last 24 hours
- ATS scoring against resume using Claude AI (batches of 5, 1.5s delay between batches)
- Colored ATS score badges: green (>=72), yellow (42-71), red (<42)
- Sort/filter results table by any column, experience level, or minimum ATS score
- "Optimize Resume" side panel with full breakdown, keywords to add, rewritten headline/summary
- Fallback to 5 cached sample jobs when Apify returns nothing

## API Endpoints

- `POST /api/search-jobs` — scrapes LinkedIn via Apify actor `curious_coder~linkedin-jobs-scraper`
- `POST /api/score-ats` — scores job vs resume using Claude AI
- `POST /api/optimize-resume` — full resume optimization report using Claude AI
- `POST /api/fetch-jd` — fetches full job description via Apify `apify~website-content-crawler`

## Key Files

- `artifacts/job-hunt-agent/src/pages/home.tsx` — main page
- `artifacts/job-hunt-agent/src/hooks/use-job-search.ts` — job search state & ATS scoring logic
- `artifacts/job-hunt-agent/src/components/ResumeDropzone.tsx` — PDF parsing component
- `artifacts/job-hunt-agent/src/components/ResultsTable.tsx` — sortable/filterable jobs table
- `artifacts/job-hunt-agent/src/components/OptimizePanel.tsx` — resume optimization side panel
- `artifacts/api-server/src/routes/jobs/index.ts` — all job-related API routes
- `artifacts/api-server/src/data/cached-jobs.json` — fallback sample jobs

## Environment Variables

- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — set automatically by Replit AI Integrations
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — set automatically by Replit AI Integrations
- `DATABASE_URL` — not needed (no DB — this app is stateless)

## User Credentials

- **Apify token**: provided by the user, saved to localStorage. Used for LinkedIn scraping and JD fetching.
- **Anthropic**: handled by Replit AI Integrations — no user key needed.
