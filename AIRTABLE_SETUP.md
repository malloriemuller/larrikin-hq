# Airtable Setup Checklist

Before running the app, verify every table and field below exists in your Airtable base with exact names (including capitalisation and spacing).

---

## Table: Clients

| Field Name | Field Type | Notes |
|---|---|---|
| Name | Single line text | Primary field |
| Company | Single line text | |
| Email | Email | |
| Phone | Phone number | Optional |
| Stage | Single select | Options: Lead, Discovery, Proposal, Delivery, Retainer, Archived |
| Source | Single line text | Optional |
| Notes | Long text | |
| Created date | Date | |

---

## Table: Projects

| Field Name | Field Type | Notes |
|---|---|---|
| Name | Single line text | Primary field |
| Client | Link to Clients | |
| Type | Single select | Options: Audit, Build, Retainer |
| Status | Single select | Options: Not Started, In Progress, Complete, On Hold |
| Contract Status | Single select | Options: Not Required, Pending, Signed |
| Contract Date | Date | |
| Quoted Price | Currency | |
| Start date | Date | |
| Target end date | Date | |
| v1 Scope Notes | Long text | |
| Notes | Long text | |

---

## Table: Project Phases

| Field Name | Field Type | Notes |
|---|---|---|
| Phase name | Single line text | Primary field |
| Project | Link to Projects | |
| Order | Number | Integer |
| Status | Single select | Options: Pending, Active, Complete |
| Target date | Date | Optional |
| Billing Milestone | Checkbox | |
| Billing Amount | Currency | Optional |

---

## Table: Tasks

| Field Name | Field Type | Notes |
|---|---|---|
| Title | Single line text | Primary field |
| Project | Link to Projects | |
| Phase | Link to Project Phases | Optional |
| Description | Long text | Optional |
| Assignee | Single select | Options: Mallorie, Andy |
| Task Type | Single select | Options: Onboarding, Build, Maintenance, QA, Admin |
| Status | Single select | Options: To Do, In Progress, Done, Blocked |
| Priority | Single select | Options: High, Medium, Low |
| Due date | Date | Optional |
| Completed date | Date | Optional |

---

## Table: Email Queue

| Field Name | Field Type | Notes |
|---|---|---|
| Client | Link to Clients | Primary field (Airtable autonumber is fine — just ensure this link is first) |
| Project | Link to Projects | Optional |
| Email type | Single select | Options: Welcome Email, Interview Guide, Post-Interview Thank-You, Pre-Meeting Preview, Proposal Follow-Up, Milestone Notification, Post-Demo Email, Retainer Onboarding Email, Referral Outreach, Post-Intro-Call, Post-Audit-Call, Post-Results-Meeting |
| To | Email | |
| Subject | Single line text | |
| Body | Long text | |
| Status | Single select | Options: Pending Review, Approved, Sent, Auto-Sent |
| Generation Failed | Checkbox | |
| Created date | Date | |
| Sent date | Date | Optional |

---

## Table: Communications Log

| Field Name | Field Type | Notes |
|---|---|---|
| Client | Link to Clients | Primary field |
| Project | Link to Projects | Optional |
| Date | Date | |
| Type | Single select | Options: Email, Call, Meeting, Note |
| Summary | Long text | |
| Author | Single select | Options: Mallorie, Andy |

---

## Table: Credentials

| Field Name | Field Type | Notes |
|---|---|---|
| Client | Link to Clients | Primary field |
| Tool Name | Single line text | |
| Username / Login | Single line text | Note: slash and space in the field name — must match exactly |
| Access Type | Single select | Options: Admin, Editor, View Only, API Key |
| Notes | Long text | Optional |
| Date Added | Date | |
| Active | Checkbox | |

---

## After setup

1. Copy your Airtable **Base ID** from the API docs page (starts with `app...`)
2. Generate a **Personal Access Token** in Airtable with `data.records:read` and `data.records:write` scopes for this base
3. Add both to your `.env` file:

```
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
```

---

## Field naming gotchas

- `Username / Login` — includes a space before and after the slash. Airtable field names are case-sensitive.
- `v1 Scope Notes` — lowercase `v1`, not `V1`.
- `Task Type` — two words with a capital T on each.
- `Contract Status` — two words, both capitalised.
- `Generation Failed` — two words, both capitalised.
- `Billing Milestone` — two words, both capitalised.
- `Billing Amount` — two words, both capitalised.
