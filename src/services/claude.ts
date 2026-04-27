import Anthropic from '@anthropic-ai/sdk';
import { EmailType, EmailDraftContext } from '../types/index';
import { buildEmailPrompt } from '../templates/emailPrompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are the writing voice for Larrikin AI Operations Studio. \
Larrikin is a two-person AI ops studio that builds custom automation systems for small businesses. \
The tone is warm, direct, and professional — never corporate, never over-effusive. \
Write in plain prose, no bullet points unless absolutely necessary. Keep emails concise. \
Always use the actual names and details provided — never use placeholders like [Name] or [Company]. \
Start every client-facing email with a greeting using their first name (e.g. "Hi Sarah,"). \
Return only the email body — no subject line, no sign-off, no meta-commentary about the email.`;

export interface EmailDraftResult {
  subject: string;
  body: string;
  failed: boolean;
}

export async function generateEmailDraft(
  emailType: EmailType,
  context: EmailDraftContext
): Promise<EmailDraftResult> {
  // Welcome Email is hardcoded — no LLM call
  if (emailType === 'Welcome Email') {
    const firstName = context.clientName.split(' ')[0];
    const intakeFormUrl = process.env.INTAKE_FORM_URL ?? '[intake form link]';
    return {
      subject: `Looking forward to our session, ${firstName}`,
      body: `Hi ${firstName},

Excited to dive into our first conversation. On this call, I will ask questions to help me learn more about ${context.company} and to get a real sense of where automation could make your day-to-day a little easier.

Before we meet, I'd love for you to take five minutes to fill out a short form. This helps me come in prepared and makes our time together much more useful:

${intakeFormUrl}

No other homework, just come ready to talk about how your business runs and where things feel clunky or time-consuming. That's where the good stuff usually hides.

See you soon,
Mallorie`,
      failed: false,
    };
  }

  const { userPrompt, suggestedSubject } = buildEmailPrompt(emailType, context);

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const body = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n')
      .trim();

    return { subject: suggestedSubject, body, failed: false };
  } catch (err) {
    console.error('[claude] email draft generation failed', {
      emailType,
      clientName: context.clientName,
      error: err,
    });
    return { subject: suggestedSubject, body: '', failed: true };
  }
}

// ─── Company Research Guide ───────────────────────────────────────────────────
// Pure company background research — used at audit kickoff before intake form
// is complete. No intake form references.

export async function generateCompanyResearchGuide(
  clientName: string,
  company: string
): Promise<InterviewGuideResult> {
  const subject = `Company Research Guide — ${clientName} / ${company}`;

  const userPrompt = `You are preparing Mallorie (an AI ops auditor) for an upcoming conversation with ${clientName}, who runs ${company}.

Use the web_search tool to research ${company} and ${clientName}. Look for:
- What the business does, their industry, approximate size, and location
- How they appear to operate day-to-day (tools, processes, team structure if visible)
- Any public signals about their growth stage, pain points, or technology usage
- Anything that suggests where automation or AI could make a meaningful difference

Then produce a concise background brief with the following structure:

## Business Overview
3–4 sentences covering what the business does, who they serve, and any notable context about their industry or size.

## Operational Signals
2–3 sentences on anything observable about how they run their business — tools mentioned, team mentions, processes visible from public channels, reviews, job listings, etc.

## Likely Pain Points & Opportunities
2–3 sentences identifying where this type of business typically struggles operationally and where AI/automation tends to have the highest impact. Informed by research where possible.

## Questions to Hold in Mind
3–5 open-ended questions Mallorie should be curious about going into the first conversation, based purely on research. These are not scripted questions — just useful angles to keep in mind.

Write for Mallorie — this is a working brief, not a client-facing document. Be direct and specific. If the business is not findable online, say so clearly and provide general industry context instead.`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await (client.messages.create as any)({
      model: MODEL,
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: userPrompt }],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (message.content as any[])
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { type: string; text: string }) => block.text)
      .join('\n')
      .trim();

    if (!body) {
      throw new Error('No text content in response');
    }

    return { subject, body, failed: false };
  } catch (err) {
    console.error('[claude] company research guide with search failed — falling back to no-search version', {
      clientName,
      company,
      error: err,
    });

    try {
      const fallbackPrompt = userPrompt.replace(/Use the web_search tool[^.]+\.\n/, '');
      const fallbackMessage = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: fallbackPrompt }],
      });

      const body = fallbackMessage.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('\n')
        .trim();

      return { subject, body, failed: false };
    } catch (fallbackErr) {
      console.error('[claude] company research guide fallback also failed', { error: fallbackErr });
      return { subject, body: '', failed: true };
    }
  }
}

// ─── Workflow Mapper ──────────────────────────────────────────────────────────

const WORKFLOW_MAPPER_SYSTEM_PROMPT = `You are a workflow analyst for Larrikin, an AI operations studio. Your job is to analyze raw notes or transcripts from a client discovery/audit session and extract a structured process map.

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

Be specific in recommendedApproach. Reference real tools (n8n, Airtable, Claude API, Zapier, Make, webhooks). Think like a builder.`;

export async function generateWorkflowMap(
  notes: string,
  hourlyRate?: number
): Promise<Record<string, unknown> | null> {
  let userMessage = notes;
  if (hourlyRate !== undefined && hourlyRate > 0) {
    userMessage += `\n\nThe client's average hourly labor cost is $${hourlyRate}/hour. Please add monthlyCostSaved and yearlyCostSaved fields to each workflow, and add a totalYearlySavings field to the root object.`;
  }

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: WORKFLOW_MAPPER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n')
      .trim();

    try {
      return JSON.parse(text);
    } catch {
      console.error('[claude] workflow-mapper: failed to parse JSON response', { text });
      return null;
    }
  } catch (err) {
    console.error('[claude] workflow-mapper error', err);
    throw err;
  }
}

// ─── Interview Guide with Web Search ─────────────────────────────────────────
// Generates a tailored call guide for Mallorie using web_search to research
// the client and their business before producing recommendations.

export interface InterviewGuideResult {
  subject: string;
  body: string;
  failed: boolean;
}

export async function generateInterviewGuideWithSearch(
  clientName: string,
  company: string,
  intakeResponses: string
): Promise<InterviewGuideResult> {
  const subject = `Interview guide — ${clientName} / ${company}`;

  const userPrompt = `You are preparing Mallorie (an AI ops auditor) for a 60-minute discovery interview with ${clientName}, who runs ${company}.

Before writing the guide, use the web_search tool to research ${company} and ${clientName}. Look for:
- What the business does, their industry, approximate size, and location
- Any public information about their operations, tools, or technology
- Anything that signals pain points, growth stage, or AI readiness

Then generate a practical interview guide using both the web research and the intake form responses below.

Intake form responses:
${intakeResponses}

Structure the guide as:

## Business Context
2–3 sentences summarising what you found about the business through research. Note anything that changes or sharpens your read of their intake responses.

## Key Themes to Explore
2–3 sentences identifying the biggest opportunities or friction points based on intake + research combined.

## Opening Questions
3–5 questions to start the conversation and build rapport.

## Deeper Probes
5–8 questions to explore specific pain points, workflows, or automation opportunities.

## Closing Questions
2–3 questions about priorities, decision-making, and timeline.

Keep questions open-ended. Focus on uncovering operational friction and automation potential. Write for Mallorie — this is a working document, not a client-facing email.`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await (client.messages.create as any)({
      model: MODEL,
      max_tokens: 4096,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text from response (may include tool_use blocks — filter to text only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (message.content as any[])
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { type: string; text: string }) => block.text)
      .join('\n')
      .trim();

    if (!body) {
      throw new Error('No text content in response');
    }

    return { subject, body, failed: false };
  } catch (err) {
    console.error('[claude] interview guide with search failed — falling back to no-search version', {
      clientName,
      company,
      error: err,
    });

    // Graceful fallback: generate without web search
    try {
      const fallbackMessage = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: userPrompt.replace(/use the web_search tool[^.]+\.\n/g, '') }],
      });

      const body = fallbackMessage.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('\n')
        .trim();

      return { subject, body, failed: false };
    } catch (fallbackErr) {
      console.error('[claude] interview guide fallback also failed', { error: fallbackErr });
      return { subject, body: '', failed: true };
    }
  }
}
