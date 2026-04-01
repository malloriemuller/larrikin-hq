import { EmailType, EmailDraftContext } from '../types/index';

interface PromptResult {
  userPrompt: string;
  suggestedSubject: string;
}

export function buildEmailPrompt(type: EmailType, ctx: EmailDraftContext): PromptResult {
  switch (type) {
    case 'Welcome Email':
      return buildWelcomeEmailPrompt(ctx);
    case 'Interview Guide':
      return buildInterviewGuidePrompt(ctx);
    case 'Post-Interview Thank-You':
      return buildPostInterviewThankYouPrompt(ctx);
    case 'Pre-Meeting Preview':
      return buildPreMeetingPreviewPrompt(ctx);
    case 'Proposal Follow-Up':
      return buildProposalFollowUpPrompt(ctx);
    case 'Milestone Notification':
      return buildMilestoneNotificationPrompt(ctx);
    case 'Post-Demo Email':
      return buildPostDemoEmailPrompt(ctx);
    case 'Retainer Onboarding Email':
      return buildRetainerOnboardingEmailPrompt(ctx);
    case 'Referral Outreach':
      return buildReferralOutreachPrompt(ctx);
    case 'Post-Intro-Call':
      return buildPostIntroCallPrompt(ctx);
    case 'Post-Audit-Call':
      return buildPostAuditCallPrompt(ctx);
    case 'Post-Results-Meeting':
      return buildPostResultsMeetingPrompt(ctx);
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

// ─── Individual Prompt Builders ───────────────────────────────────────────────

function buildWelcomeEmailPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `Welcome to Larrikin — your audit starts here`,
    userPrompt: `Generate a welcome email for ${ctx.clientName} at ${ctx.company}.

Context: Their audit contract has just been signed. This email confirms we're underway and sets a warm, confident tone for the engagement. Next steps are: they'll receive a short intake form to complete before their first interview session.

Keep it under 150 words. Mention we're excited to dig into their systems, confirm what's coming next (intake form, then interview sessions), and make them feel like they're in capable hands. Do not use bullet points.`,
  };
}

function buildInterviewGuidePrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `Interview guide — ${ctx.clientName} / ${ctx.company}`,
    userPrompt: `Generate a tailored interview guide for an AI operations audit with ${ctx.clientName} at ${ctx.company}.

This is delivered to Mallorie (the auditor), not the client. It should read as a practical working document — not an email to the client.

Intake responses:
${ctx.intakeResponses ?? 'No intake data available.'}

${ctx.additionalContext ? `Additional context: ${ctx.additionalContext}` : ''}

Structure the guide as:
1. Key themes to explore based on the intake (2–3 sentences)
2. Opening questions (3–5 questions to start the conversation)
3. Deeper probes (5–8 questions to explore specific pain points or opportunities)
4. Closing questions (2–3 questions about priorities and decision-making)

Keep questions open-ended and focused on uncovering operational friction and automation potential.`,
  };
}

function buildPostInterviewThankYouPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `Thank you — great conversation today`,
    userPrompt: `Generate a post-interview thank-you email for ${ctx.clientName} at ${ctx.company}.

Context: We've just wrapped up one of their audit interview sessions. This email thanks them for their time, confirms what happens next (Mallorie processes the transcript, builds the audit document, and schedules a results presentation), and sets a realistic timeline expectation.

Keep it under 120 words. Warm and direct — not effusive. Do not use bullet points.`,
  };
}

function buildPreMeetingPreviewPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `What to expect in our results meeting`,
    userPrompt: `Generate a pre-meeting preview email for ${ctx.clientName} at ${ctx.company}.

Context: Their audit results meeting is coming up. This email prepares them for the session — what we'll cover, what they should think about bringing to the conversation, and a brief framing of the audit output they'll receive.

Project: ${ctx.projectName ?? 'AI Operations Audit'}
${ctx.additionalContext ? `Additional context: ${ctx.additionalContext}` : ''}

Keep it under 150 words. No bullet points. Confident and preparatory in tone.`,
  };
}

function buildProposalFollowUpPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `Following up on your Larrikin proposal`,
    userPrompt: `Generate a proposal follow-up email for ${ctx.clientName} at ${ctx.company}.

Context: A proposal and contract have been sent. This follow-up checks in without being pushy, briefly re-anchors the value, and invites any questions or a call to talk through it.

${ctx.additionalContext ? `Additional context: ${ctx.additionalContext}` : ''}

Keep it under 100 words. Low-pressure, genuine, direct.`,
  };
}

function buildMilestoneNotificationPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `Project update — milestone complete`,
    userPrompt: `Generate a milestone notification email for ${ctx.clientName} at ${ctx.company}.

Context: A key project milestone has been reached. This is a brief, positive update letting them know progress is on track.

Project: ${ctx.projectName ?? 'your project'}
${ctx.additionalContext ? `Milestone details: ${ctx.additionalContext}` : ''}

Keep it under 100 words. Confident, brief, and forward-looking. No bullet points.`,
  };
}

function buildPostDemoEmailPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `After today's demo — next steps`,
    userPrompt: `Generate a post-demo email for ${ctx.clientName} at ${ctx.company}.

Context: We've just walked them through the built system in a demo meeting. This email summarises the moment, confirms what they now have access to, and outlines any remaining next steps (user guide, feedback period, retainer conversation if relevant).

Project: ${ctx.projectName ?? 'their custom build'}
${ctx.additionalContext ? `Additional context: ${ctx.additionalContext}` : ''}

Keep it under 150 words. Proud but grounded — this is a delivery moment. No bullet points unless listing truly distinct next steps.`,
  };
}

function buildRetainerOnboardingEmailPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `Your Larrikin retainer — how this works`,
    userPrompt: `Generate a retainer onboarding email for ${ctx.clientName} at ${ctx.company}.

Context: Their retainer contract has been signed. This email welcomes them into the ongoing relationship, explains how retainer requests work (they submit via intake form, Mallorie prioritises and turns around within the agreed SLA), and sets the tone for a long-term working relationship.

${ctx.additionalContext ? `Additional context: ${ctx.additionalContext}` : ''}

Keep it under 180 words. Warm, clear, and structured without being overly formal. Use plain prose.`,
  };
}

function buildReferralOutreachPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `Introduction — ${ctx.company}`,
    userPrompt: `Generate a warm outreach email to ${ctx.clientName} at ${ctx.company}.

Context: This is a first contact — they were referred to Larrikin by ${ctx.referrerName ?? 'a mutual contact'}. Larrikin is a small AI operations studio that builds custom automation systems for small businesses. The goal of this email is to open the door, not to pitch. Reference the referrer by name to establish trust. Propose a casual 15-minute call to see if there's a fit, and include the Calendly link for scheduling: ${process.env.CALENDLY_INTRO_URL ?? '[Calendly link]'}.

Audience: Small business owner — likely not technical, possibly skeptical of AI. Write like a real person, not a sales rep. No buzzwords, no jargon, no bullet points.

Keep it under 120 words. Plain-spoken, warm, and human.`,
  };
}

function buildPostIntroCallPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `Great to meet you — next steps`,
    userPrompt: `Generate a follow-up email to ${ctx.clientName} at ${ctx.company} after a 15-minute intro call with Mallorie.

Context: The call went well. This email should:
1. Briefly recap the main thing they talked about (pain point or opportunity) — use the additional context below if provided
2. Explain what the AI Audit is: one structured hour, recorded, followed by a findings document showing exactly where their business is losing time or money and what Larrikin would do about it — and that the audit is complimentary
3. Include a link to schedule the 60-minute audit call: ${process.env.CALENDLY_AUDIT_URL ?? '[Audit Calendly link]'}
4. Include a link to the short intake form they should complete before the audit: ${process.env.INTAKE_FORM_URL ?? '[Intake form link]'}

${ctx.additionalContext ? `Call notes / context: ${ctx.additionalContext}` : ''}

Tone: Warm, plain-spoken, no jargon. Write like a person. Under 180 words. No bullet points unless listing the two links.`,
  };
}

function buildPostAuditCallPrompt(ctx: EmailDraftContext): PromptResult {
  const summarySection = ctx.firefliesSummary
    ? `Fireflies meeting summary:\n${ctx.firefliesSummary}`
    : 'No Fireflies summary available — write a warm, general thank-you without referencing specific call content.';

  return {
    suggestedSubject: `Thank you — great conversation today`,
    userPrompt: `Generate a post-audit email to ${ctx.clientName} at ${ctx.company} after their 60-minute AI audit call.

Context: The audit call just ended and was recorded by Fireflies. This email should:
1. Thank them for their time and openness during the call
2. Include the Fireflies summary below (paraphrase key themes naturally — don't just paste it verbatim)
3. Let them know Mallorie is now reviewing everything and will come back within 5 business days with findings and recommended next steps
4. Keep the tone warm and reassuring — this is an exciting moment for them

${summarySection}

${ctx.additionalContext ? `Additional context: ${ctx.additionalContext}` : ''}

Keep it under 200 words. Plain prose, no bullet points. Don't use placeholder text — if you don't have specific call content, keep it warm and general.`,
  };
}

function buildPostResultsMeetingPrompt(ctx: EmailDraftContext): PromptResult {
  return {
    suggestedSubject: `Your Larrikin audit findings — next steps`,
    userPrompt: `Generate a follow-up email to ${ctx.clientName} at ${ctx.company} after their AI audit results meeting.

Context: Mallorie just walked them through the audit findings and recommended builds. This email should:
1. Thank them for their time and engagement in the meeting
2. Note that the presentation is attached (reference it as attached — do not describe its contents)
3. Include itemised pricing for the recommended build(s) if provided in additional context, otherwise note that pricing is outlined in the attached presentation
4. Make the next step crystal clear: "Reply to this email or let me know you're ready to move forward and I'll send the contract straight away."
5. Keep it low-pressure but clear — they should know exactly what to do next

${ctx.additionalContext ? `Build options and pricing: ${ctx.additionalContext}` : ''}

Keep it under 180 words. Confident, warm, no jargon. Plain prose.`,
  };
}
