# Claude Code Prompt: Workflow Mapper Tool

Paste this into a fresh Claude Code session with your system overview doc loaded.

---

I need to add a new internal tool to Larrikin HQ called the **Workflow Mapper**. This is a page I'll use during or after every client audit call to convert raw notes into a structured process map. It's internal only — not client-facing yet.

## What it does

1. I paste raw audit notes (rough transcript, bullets, stream of consciousness)
2. Optionally enter a dollar figure for the client's hourly labor cost
3. Hit "Generate" — it calls the Claude API with a structured system prompt
4. Returns a process map: ranked workflows with automation readiness scores, hours lost per month, hours recoverable, and specific recommended approaches
5. If I entered an hourly rate, each workflow also shows $ saved/month and $ saved/year, plus a payback estimate

## Where to build it

- **Frontend:** New Next.js page at `app/tools/workflow-mapper/page.tsx`
- **Backend:** New Express route `POST /api/tools/workflow-mapper` that takes `{ notes: string, hourlyRate?: number }` and calls the Claude API
- **Nav:** Add "Workflow Mapper" as a nav item under a "Tools" section in the sidebar (or wherever the current nav lives — check the existing nav component first)

## Backend route behavior

The route should:
1. Accept `{ notes: string, hourlyRate?: number }`
2. Call the Anthropic API using the existing `ANTHROPIC_API_KEY` env var (already set in Railway)
3. Use `claude-sonnet-4-20250514`, `max_tokens: 4000`
4. Return the parsed JSON result to the frontend
5. If parsing fails, return a 422 with `{ error: "Could not parse workflow map from notes" }`

**System prompt to use (paste verbatim into the route):**

```
You are a workflow analyst for Larrikin, an AI operations studio. Your job is to analyze raw notes or transcripts from a client discovery/audit session and extract a structured process map.

For each workflow or process you identify, output a JSON object. Return ONLY valid JSON — no markdown, no backticks, no preamble.

Output this exact structure:
{
  "clientName": "string (extract from notes or use 'Unnamed Client')",
  "industry": "string",
  "auditSummary": "2-3 sentence plain-English summary of the biggest operational pain points",
  "workflows": [
    {
      "id": "w1",
      "name": "string",
      "description": "string (what they currently do)",
      "frequency": "string (e.g. 'Daily', 'Weekly', 'Per client', 'Ad hoc')",
      "estimatedHoursPerMonth": number,
      "currentTools": ["array of tools/apps"],
      "painPoints": ["array of friction points"],
      "automationReadiness": number (1-10, 10 = easiest to automate),
      "automationReadinessReason": "string (1 sentence why)",
      "recommendedApproach": "string (specific: e.g. 'n8n webhook + Claude extraction + Airtable record creation')",
      "estimatedHoursSavedPerMonth": number,
      "priority": "High" | "Medium" | "Low"
    }
  ],
  "totalHoursPerMonth": number,
  "totalHoursSavedIfAutomated": number,
  "topRecommendation": "string (single highest-ROI thing to build first, and why)"
}

Automation readiness scoring:
- 10: Fully structured, clear trigger, repeatable — automate immediately
- 7-9: Minor variation, mostly structured — automate with some config
- 4-6: Semi-structured, needs human judgment at some steps — partial automation
- 1-3: Highly variable, relationship-dependent, or creative — assist only

Be specific in recommendedApproach. Reference real tools (n8n, Airtable, Claude API, Zapier, Make, webhooks). Think like a builder.
```

If `hourlyRate` was provided, add this to the user message:
`"\n\nThe client's average hourly labor cost is $${hourlyRate}/hour. Please add monthlyCostSaved and yearlyCostSaved fields to each workflow, and add a totalYearlySavings field to the root object."`

## Frontend page behavior

- Dark, clean UI consistent with the rest of HQ
- Two inputs: large textarea for notes, optional number input for hourly rate (labeled "Avg. hourly labor cost (optional) — used to calculate $ ROI")
- "Generate Process Map" button — disabled until notes are non-empty, shows loading state while waiting
- On success, render:
  - Client name + industry header
  - Audit summary paragraph
  - 3-stat row: Total hours/month | Hours recoverable | Workflows found (add $ saved/year if hourlyRate was provided)
  - Top recommendation callout box
  - Workflow cards sorted High → Medium → Low, each expandable to show: description, frequency, current tools, pain points, readiness bar, recommended approach
  - If hourlyRate provided: show $ saved/month and $ saved/year on each card
- "← New audit" button to reset and start over
- Error state if the API returns 422

## File structure

Create these files (check existing patterns in the repo first and match them):
- `packages/frontend/app/tools/workflow-mapper/page.tsx`
- `packages/backend/src/routes/tools.ts` (or add to an existing tools route if one exists)
- Wire the route into `packages/backend/src/index.ts`
- Add the Next.js rewrite in `next.config.js` if `/api/tools/*` isn't already proxied
- Add nav item — check `packages/frontend/components/` for the sidebar/nav component

## Notes

- Use the existing Anthropic API key env var — don't add a new one
- Match the existing error handling pattern in other routes
- This is internal only, no auth changes needed beyond whatever currently gates the app
- Don't add Airtable logging for now — keep it simple, stateless, no record created
