---
name: Larrikin Command Center — project overview
description: Full-stack internal ops app for Larrikin AI Operations Studio — architecture, stack, decisions, and deployment targets
type: project
---

Larrikin Command Center is a full-stack internal ops app being built for Mallorie and Andy at Larrikin AI Operations Studio. It manages client onboarding pipeline, project/task tracking, and an email approval queue.

**Stack:** Node.js + Express + TypeScript backend (Railway) + Next.js 16 frontend (Vercel). Data layer is Airtable REST API. Email via Gmail API + Google OAuth. AI via Anthropic Claude API (claude-sonnet-4-20250514). Webhooks from DocuSign, Tally/Typeform, Fireflies.

**Architecture decisions:**
- Monorepo with two separate package.json files: root (backend), frontend/ (Next.js)
- No auth in v1 — two routes: / (Mallorie) and /andy (Andy)
- Projects and tasks are first-class objects; onboarding is a workflow that calls them
- Frontend uses NEXT_PUBLIC_API_URL env var to reach Railway backend
- Webhook handlers: raw body → HMAC-SHA256 validation, then async processing after 200 ACK
- DocuSign identifies project type via custom field "Project Type" (Audit/Build/Retainer)
- Fireflies matches client by parsing "Client Name — Session N" meeting title format
- Task templates are scoped by project type: Audit→Discovery+Proposal, Build→Delivery, Retainer→Retainer
- Claude email drafts: if generation fails, still creates Email Queue record with Generation Failed=true
- Gmail: accepts refresh token as env var, exchanges for access tokens via googleapis

**Build location:** /Users/malloriemuller/larrikin-hq/ (project root, not a subdirectory)

**Why:** Mallorie and Andy need a daily-use internal tool to manage their two-person AI ops studio — client pipeline, email approvals, task tracking.

**How to apply:** All future work on this app should treat this as the authoritative architecture. No auth, no separate onboarding system — everything goes through the core project/task/email APIs.
