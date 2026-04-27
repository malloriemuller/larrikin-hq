# Larrikin HQ — System Overview (LLM Reference)

> **Purpose**: This document gives an LLM full situational awareness of the Larrikin HQ codebase without needing to read the source. Optimized for density over readability. Two-person studio (Mallorie + Andy) managing AI operations engagements.

---

## 1. HIGH-LEVEL ARCHITECTURE

**Stack**: TypeScript monorepo — Express backend + Next.js 15 frontend. Airtable is the sole database.

```
Browser (Next.js, port 3001)
  └── next.config.ts rewrites /api/* and /webhooks/* → backend
        └── Express backend (port 3000)
              ├── /api/clients, /projects, /tasks, /phases, /email-queue, /credentials
              ├── /webhooks/docusign, /intake-form, /fireflies
              └── Services: Airtable (DB) · Claude API (AI) · Gmail API (email sending)
```

**Deployment**: Railway via Nixpacks. Healthcheck at `GET /health`. Auto-restart on failure (max 3).

**No authentication layer.** All routes are public. Access control is implicit (Mallorie's dashboard at `/`, Andy's at `/andy`).

---

## 2. KEY MODULES & RESPONSIBILITIES

### Backend (`src/`)

| File | Responsibility |
|------|---------------|
| `server.ts` | Express init, CORS, mounts all routes, error handler |
| `services/airtable.ts` | DB abstraction — generic CRUD helpers + domain queries for all 7 tables |
| `services/claude.ts` | Email draft generation + interview guide (with web_search tool) via Claude Sonnet |
| `services/gmail.ts` | OAuth2 Gmail sending — builds RFC 2822 message, base64url-encodes, sends |
| `services/onboarding.ts` | Core workflow engine — phase activation, webhook event handlers, email orchestration |
| `templates/emailPrompts.ts` | Prompt builders for 12 email types; enforces 100–220 word limit, warm/direct tone |
| `templates/taskTemplates.ts` | Phase task templates (Audit/Build/Retainer) — auto-created on phase activation |
| `types/index.ts` | All TypeScript types — entities, request bodies, webhook payloads, union enums |
| `routes/webhooks.ts` | HMAC signature validation + async delegation to onboarding handlers |
| `routes/emailQueue.ts` | Queue CRUD, generate draft, approve, send, discard |
| `routes/projects.ts` | Project CRUD, phase activation trigger, engagement view, comms log |

### Frontend (`frontend/`)

| File | Responsibility |
|------|---------------|
| `lib/api.ts` | HTTP client + all type defs + transform helpers (`toProject`, `toProjectPhase`) |
| `app/page.tsx` | Mallorie's dashboard — 4 tabs: pipeline, projects, tasks, queue |
| `app/clients/[id]/page.tsx` | Client detail — info, linked projects, communications timeline |
| `app/andy/page.tsx` | Andy's QA-focused dashboard |
| `components/PipelineBoard.tsx` | Kanban by client stage (Lead → Discovery → Proposal → Delivery → Retainer → Archived) |
| `components/EmailQueuePanel.tsx` | Email queue grouped by status (Pending Review / Approved / Sent / Auto-Sent) |
| `components/TaskList.tsx` | Tasks filtered by assignee/status/project |
| `components/ProjectCard.tsx` | Engagement overview with phases and status |
| `components/*Form.tsx` | ClientForm, ProjectForm, TaskForm — creation/edit modals |

---

## 3. CRITICAL DATA FLOWS

### A. Client Onboarding (End-to-End)
```
1. New referral → POST /api/clients (Stage: Lead)
2. /api/clients/:id/queue-outreach → Claude generates "Referral Outreach" email
3. Intro call recorded by Fireflies → /webhooks/fireflies
   → keyword "intro" in title → queue "Post-Intro-Call" email (includes Calendly Audit link)
4. Client submits Tally intake form → /webhooks/intake-form
   → Store responses in client Notes
   → Claude generates "Interview Guide" (uses web_search to research company)
   → Queue for Mallorie review
5. Audit call → Fireflies → keyword "audit" → auto-send "Post-Audit-Call" email
6. Results meeting → Fireflies → keyword "results" → queue "Post-Results-Meeting" email
7. Contract signed in DocuSign → /webhooks/docusign
   → handleAuditContractSigned → activatePhase("Audit")
   → Create phase record + tasks from AUDIT_PHASES template
   → Auto-send "Welcome Email"
   → Client Stage: Lead → Discovery
```

### B. Phase Activation (Core Function: `activatePhase`)
```
activatePhase(clientEmail, phaseType, envelopeId?, projectId?)
  1. findClientByEmail → or create if new
  2. findActiveProjectByClientId → or create project
  3. Guard: reject if phaseType already exists on project
  4. createProjectPhase (order: Audit=1, Build=2, Retainer=3)
  5. updateClient(Stage) — stage map per phase type
  6. createPhaseTasks — reads template, creates Task records in Airtable
  7. createCommunicationsLogEntry (Type: Note)
  8. queue or auto-send email based on phase type
```

### C. Email Generation & Send
```
POST /api/email-queue/generate { projectId, emailType }
  → fetch project + client from Airtable
  → buildEmailPrompt(emailType, context) → userPrompt + suggestedSubject
  → Claude API (claude-sonnet-4-20250514, max_tokens=1024)
  → createEmailQueueEntry (Status: "Pending Review")

POST /api/email-queue/:id/send
  → sendEmail via Gmail API
  → update entry Status → "Sent"
  → createCommunicationsLogEntry (Type: Email)
```

### D. Fireflies Meeting Handler
```
/webhooks/fireflies → validate HMAC → extract title, summary, attendees
  → detect type from title keywords:
      "intro" → Post-Intro-Call (queue)
      "audit" → Post-Audit-Call (auto-send)
      "results" → Post-Results-Meeting (queue)
      "demo" → Post-Demo Email (queue)
      "session" → Retainer session follow-up (queue)
  → match client by filtering Mallorie's email from attendee list
  → queue or send appropriate email
```

---

## 4. EXTERNAL INTEGRATIONS

| Service | Purpose | Auth | Webhook Endpoint | Validation |
|---------|---------|------|-----------------|------------|
| **Airtable** | Database (all data) | API Key + Base ID | — | — |
| **Claude (Anthropic)** | Email drafts + interview guides | API Key | — | Model: `claude-sonnet-4-20250514` |
| **Gmail** | Send emails | OAuth2 refresh token | — | RFC 2822 + base64url |
| **DocuSign** | Contract e-signatures | Webhook secret | `/webhooks/docusign` | HMAC-SHA256 (`x-docusign-signature-1`) |
| **Tally** | Client intake forms | Webhook secret | `/webhooks/intake-form` | HMAC-SHA256 (`tally-signature`, hex or base64) |
| **Fireflies** | Meeting recordings | Webhook secret | `/webhooks/fireflies` | HMAC-SHA256 (`x-fireflies-signature`) |
| **Calendly** | Scheduling links | None (static URLs) | — | Embedded in email templates via env vars |

**Env vars**: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `ANTHROPIC_API_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM_ADDRESS`, `DOCUSIGN_WEBHOOK_SECRET`, `TALLY_WEBHOOK_SECRET`, `FIREFLIES_WEBHOOK_SECRET`, `MALLORIE_EMAIL`, `CALENDLY_INTRO_URL`, `CALENDLY_AUDIT_URL`, `INTAKE_FORM_URL`, `PORT`, `FRONTEND_URL`

---

## 5. AIRTABLE SCHEMA (7 TABLES)

All field names are **case-sensitive** in Airtable API calls.

### Clients
`Name` (primary) · `Company` · `Email` · `Phone` · `Stage`¹ · `Source` · `Notes` · `Created Date`

¹ Stage values: `Lead` · `Discovery` · `Proposal` · `Delivery` · `Retainer` · `Archived`

### Projects
`Name` (primary) · `Client` (linked) · `Status`² · `Contract Status` · `Contract Date` · `Quoted Price` · `Start Date` · `Target End Date` · `v1 Scope Notes` · `Notes` · `Spec URL`
Auto-linked: `Project Phases` · `Tasks` · `Email Queue` · `Communications Log`

² Status: `Not Started` · `In Progress` · `Complete` · `On Hold`

### Project Phases
`Phase Name` (primary) · `Project` (linked) · `Phase Type`³ · `Order` (number) · `Status`⁴ · `Contract Status` · `Contract Date` · `Target Date` · `Billing Milestone` (checkbox) · `Billing Amount` · `Tasks` (linked) · `Email Queue` (linked)

³ Phase Type: `Audit` · `Build` · `Retainer`
⁴ Phase Status: `Pending` · `Active` · `Complete`

### Tasks
`Title` (primary) · `Project` (linked) · `Phase` (linked, optional) · `Phase Group` · `Description` · `Assignee`⁵ · `Task Type`⁶ · `Status`⁷ · `Priority`⁸ · `Due Date` · `Completed Date`

⁵ Assignee: `Mallorie` · `Andy`
⁶ Task Type: `Onboarding` · `Build` · `Maintenance` · `QA` · `Admin`
⁷ Task Status: `To Do` · `In Progress` · `Done` · `Blocked`
⁸ Priority: `High` · `Medium` · `Low`

### Email Queue
`Client` (linked, primary) · `Project` (linked, optional) · `Email Type`⁹ · `To` · `Subject` · `Body` · `Status`¹⁰ · `Generation Failed` (checkbox) · `Created Date` · `Sent Date`

⁹ Email Types (12): `Welcome Email` · `Interview Guide` · `Post-Interview Thank-You` · `Pre-Meeting Preview` · `Proposal Follow-Up` · `Milestone Notification` · `Post-Demo Email` · `Retainer Onboarding Email` · `Referral Outreach` · `Post-Intro-Call` · `Post-Audit-Call` · `Post-Results-Meeting`

¹⁰ Email Status: `Pending Review` · `Approved` · `Sent` · `Auto-Sent`

### Communications Log
`Client` (linked, primary) · `Project` (linked, optional) · `Date` · `Type`¹¹ · `Summary` · `Author`¹²

¹¹ Comms Type: `Email` · `Call` · `Meeting` · `Note`
¹² Author: `Mallorie` · `Andy`

### Credentials
`Client` (linked, primary) · `Tool Name` · `Username / Login` · `Access Type`¹³ · `Notes` · `Date Added` · `Active` (checkbox)

¹³ Access Type: `Admin` · `Editor` · `View Only` · `API Key`

---

## 6. TASK TEMPLATES (PHASE AUTO-CREATION)

When a phase is activated, tasks are auto-created from these templates:

**AUDIT_PHASES** (activates sub-phases: Discovery + Proposal)
- Discovery: send proposal, schedule 2 audit sessions, conduct 2 sessions, collect credentials (5 tasks)
- Proposal: process transcripts, build audit document, ROI model, QA review, schedule results meeting, send contract (6 tasks)

**BUILD_PHASES** (sub-phases: Onboarding → Build → QA → Launch)
- Onboarding: 4 tasks · Build: 2 tasks · QA: 3 tasks · Launch: 1 task

**RETAINER_PHASES**
- 3 tasks: setup intake, 30-day referral ask, 90-day case study request

> Tasks for activities Fireflies/automation handles are intentionally absent from templates (e.g., "conduct audit call", "send welcome email") to avoid duplication.

---

## 7. NAMING CONVENTIONS & PATTERNS

### Files
- Backend routes: `camelCase.ts` (e.g., `emailQueue.ts`)
- Services/templates: `camelCase.ts` (e.g., `onboarding.ts`, `emailPrompts.ts`)
- Frontend pages: `app/{feature}/page.tsx` or `app/{entity}/[id]/page.tsx`
- Frontend components: `PascalCase.tsx`

### TypeScript Types
- Entities: `Client`, `Project`, `ProjectPhase`, `Task`, `EmailQueueEntry`, `CommunicationsLog`, `Credential`
- Raw Airtable records: `Airtable{Entity}` (with nested `fields` object)
- Enums as union types: `ClientStage`, `ProjectStatus`, `TaskStatus`, `PhaseType`, `EmailType`, `EmailStatus`, `Assignee`, `TaskType`, `CommsType`, `AccessType`
- Request bodies: `Create{Entity}Body`, `Update{Entity}Body`
- Webhook payloads: `{Service}WebhookPayload`

### Functions
- CRUD: `list{Entity}`, `get{Entity}`, `create{Entity}`, `update{Entity}`, `delete{Entity}`, `find{Entity}By{Field}`
- Event handlers: `handle{Event}` (e.g., `handleAuditContractSigned`, `handleFirefliesSessionEnded`)
- Builders: `build{Purpose}` (e.g., `buildEmailPrompt`, `buildRawMessage`)
- Transforms: `to{Type}` (e.g., `toRecord`, `toProject`, `toProjectPhase`)

### Frontend Components
- Boards/Panels: `{Feature}Board` / `{Feature}Panel`
- Cards/Lists: `{Entity}Card` / `{Entity}List`
- Forms: `{Entity}Form`
- Badges/Pills: `{Label}Badge` / `{Label}Pill`

### Styling
- Tailwind CSS 4 utility classes throughout
- Custom palette: gold `#C4AF5A` · cream `#EDE4C8` · dark green `#162C1A`
- Fonts: Playfair Display (headings) · DM Sans (body) · Inter (utility)
- Locale: `en-AU` for date formatting

---

## 8. CONSTRAINTS, QUIRKS & TECHNICAL DEBT

| Area | Issue |
|------|-------|
| **No auth** | All routes unauthenticated; security relies entirely on network isolation |
| **Fireflies client matching** | Filters Mallorie's email from attendee list to find client — breaks if a third party joins or client uses a different email |
| **Tally HMAC dual-format** | Tries hex (64 chars) then base64 (44 chars) — added for compatibility, exact Tally format uncertain |
| **Interview guide fallback** | Silently falls back to non-web-search version if Claude's `web_search` tool fails; user can't tell |
| **Generation failures** | Failed Claude drafts still create queue entries with `Generation Failed: true`; Mallorie must write manually |
| **Frontend EmailType enum** | Frontend `lib/api.ts` missing 4 of the 12 email types present in backend (`Referral Outreach`, `Post-Intro-Call`, `Post-Audit-Call`, `Post-Results-Meeting`) — UI can't generate these from dashboard |
| **Timezone** | Dates stored as `YYYY-MM-DD` strings, no timezone handling; all comparisons assume midnight UTC |
| **No DB migrations** | Airtable schema managed manually via `AIRTABLE_SETUP.md`; no versioning or migration tooling |
| **No email retry logic** | If Gmail send fails, entry stays in queue as `Pending Review`; no automatic retry |
| **No rate limiting** | No throttling on any endpoint |
| **No CI/CD config** | No GitHub Actions or equivalent; deployments via Railway git integration |
| **Duplicate trigger for Post-Demo Email** | Queued by both `handleFirefliesSessionEnded("demo")` and `handlePhaseCompleted` — could create duplicate entries |
| **PORT inconsistency** | Code defaults to 3001, `.env.example` says 3000; Railway presumably sets explicitly |

---

## 9. DIRECTORY MAP

```
larrikin-hq/
├── src/
│   ├── server.ts               # Express app, route mounting, CORS, health endpoint
│   ├── routes/
│   │   ├── clients.ts          # GET/POST/PATCH clients + queue-outreach
│   │   ├── projects.ts         # GET/POST/PATCH/DELETE projects + activate-phase + engagement
│   │   ├── tasks.ts            # GET/POST/PATCH tasks + complete
│   │   ├── phases.ts           # POST/PATCH/DELETE phases (triggers handlePhaseCompleted)
│   │   ├── emailQueue.ts       # Queue CRUD + generate + send + discard
│   │   ├── credentials.ts      # Credential CRUD
│   │   └── webhooks.ts         # DocuSign + Tally + Fireflies handlers + HMAC validation
│   ├── services/
│   │   ├── airtable.ts         # DB layer (~430 lines) — all Airtable operations
│   │   ├── claude.ts           # AI layer (~150 lines) — email gen + interview guides
│   │   ├── gmail.ts            # Email sending (~48 lines)
│   │   └── onboarding.ts       # Workflow engine (~530 lines) — core business logic
│   ├── templates/
│   │   ├── emailPrompts.ts     # 12 email type prompt builders (~220 lines)
│   │   └── taskTemplates.ts    # Phase task templates (~120 lines)
│   └── types/
│       └── index.ts            # All shared TypeScript types (~350 lines)
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Mallorie's dashboard (pipeline/projects/tasks/queue tabs)
│   │   ├── clients/[id]/page.tsx  # Client detail + timeline
│   │   └── andy/page.tsx       # Andy's QA dashboard
│   ├── components/
│   │   ├── PipelineBoard.tsx   # Kanban by client stage
│   │   ├── EmailQueuePanel.tsx # Email queue by status
│   │   ├── TaskList.tsx        # Filterable task list
│   │   ├── ProjectCard.tsx     # Engagement card with phases
│   │   ├── ClientForm.tsx      # Client create/edit
│   │   ├── ProjectForm.tsx     # Project create/edit
│   │   └── TaskForm.tsx        # Task create/edit
│   ├── lib/api.ts              # HTTP client + all frontend types + transform helpers
│   └── next.config.ts          # API proxy rewrites to backend
├── memory/                     # Project context docs (not loaded at runtime)
├── AIRTABLE_SETUP.md           # Canonical schema definition — source of truth for table/field names
├── SYSTEM.md                   # This file — LLM system overview
├── railway.json                # Deployment config
├── package.json                # Backend deps + build/dev/start scripts
└── .env.example                # All required environment variable names
```

---

*Generated from static analysis of larrikin-hq source. Last updated: April 2026.*
