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
