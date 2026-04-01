import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  handleAuditContractSigned,
  handleBuildContractSigned,
  handleRetainerContractSigned,
  handleIntakeFormSubmitted,
  handleFirefliesSessionEnded,
} from '../services/onboarding';
import {
  DocuSignWebhookPayload,
  TallyWebhookPayload,
  FirefliesWebhookPayload,
  ProjectType,
} from '../types/index';

const router = Router();

// ─── Signature validation helpers ─────────────────────────────────────────────

function validateHmacSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // Support both raw hex and "sha256=hex" formats
  const incoming = signatureHeader.replace(/^sha256=/, '');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(incoming, 'hex'));
}

// ─── DocuSign webhook ─────────────────────────────────────────────────────────

router.post('/docusign', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const signature = req.headers['x-docusign-signature-1'] as string | undefined;
  const secret = process.env.DOCUSIGN_WEBHOOK_SECRET ?? '';

  if (!validateHmacSignature(rawBody, signature, secret)) {
    console.warn('[webhooks/docusign] invalid signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let payload: DocuSignWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  // Only process envelope-completed events
  if (payload.event !== 'envelope-completed') {
    res.status(200).json({ received: true, skipped: true });
    return;
  }

  const summary = payload.data.envelopeSummary;
  const clientEmail = summary.recipients.signers[0]?.email;

  if (!clientEmail) {
    console.error('[webhooks/docusign] no signer email in payload', { envelopeId: payload.data.envelopeId });
    res.status(200).json({ received: true });
    return;
  }

  // Read project type from custom field
  const customFields = summary.customFields?.textCustomFields ?? [];
  const projectTypeField = customFields.find((f) => f.name === 'Project Type');
  const projectType = projectTypeField?.value as ProjectType | undefined;

  if (!projectType || !['Audit', 'Build', 'Retainer'].includes(projectType)) {
    console.error('[webhooks/docusign] missing or invalid Project Type custom field', {
      envelopeId: payload.data.envelopeId,
      customFields,
    });
    res.status(200).json({ received: true, error: 'Unknown project type' });
    return;
  }

  // Acknowledge immediately, process async
  res.status(200).json({ received: true });

  try {
    switch (projectType) {
      case 'Audit':
        await handleAuditContractSigned(clientEmail, payload.data.envelopeId);
        break;
      case 'Build':
        await handleBuildContractSigned(clientEmail, payload.data.envelopeId);
        break;
      case 'Retainer':
        await handleRetainerContractSigned(clientEmail, payload.data.envelopeId);
        break;
    }
  } catch (err) {
    console.error('[webhooks/docusign] onboarding flow failed', {
      projectType,
      clientEmail,
      envelopeId: payload.data.envelopeId,
      error: err,
    });
  }
});

// ─── Tally/Typeform intake form webhook ───────────────────────────────────────

router.post('/intake-form', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const signature = req.headers['tally-signature'] as string | undefined;
  const secret = process.env.TALLY_WEBHOOK_SECRET ?? '';

  if (!validateHmacSignature(rawBody, signature, secret)) {
    console.warn('[webhooks/intake-form] invalid signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let payload: TallyWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  if (payload.eventType !== 'FORM_RESPONSE') {
    res.status(200).json({ received: true, skipped: true });
    return;
  }

  // Extract email field and format all responses as readable text
  const fields = payload.data.fields;
  const emailField = fields.find(
    (f) => f.type === 'INPUT_EMAIL' || f.label.toLowerCase().includes('email')
  );
  const clientEmail = emailField?.value as string | undefined;

  if (!clientEmail) {
    console.error('[webhooks/intake-form] no email field found in submission', {
      responseId: payload.data.responseId,
    });
    res.status(200).json({ received: true, error: 'No email found' });
    return;
  }

  const intakeResponses = fields
    .filter((f) => f.value !== null && f.value !== '')
    .map((f) => `${f.label}: ${Array.isArray(f.value) ? f.value.join(', ') : f.value}`)
    .join('\n');

  res.status(200).json({ received: true });

  try {
    await handleIntakeFormSubmitted(clientEmail, intakeResponses);
  } catch (err) {
    console.error('[webhooks/intake-form] processing failed', {
      responseId: payload.data.responseId,
      clientEmail,
      error: err,
    });
  }
});

// ─── Fireflies webhook ────────────────────────────────────────────────────────

router.post('/fireflies', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const signature = req.headers['x-fireflies-signature'] as string | undefined;
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET ?? '';

  if (!validateHmacSignature(rawBody, signature, secret)) {
    console.warn('[webhooks/fireflies] invalid signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let payload: FirefliesWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  if (!payload.title) {
    console.error('[webhooks/fireflies] no meeting title in payload', { meetingId: payload.meetingId });
    res.status(200).json({ received: true, error: 'No meeting title' });
    return;
  }

  res.status(200).json({ received: true });

  try {
    await handleFirefliesSessionEnded(payload.title, payload.summary, payload.attendees);
  } catch (err) {
    console.error('[webhooks/fireflies] processing failed', {
      meetingId: payload.meetingId,
      title: payload.title,
      error: err,
    });
  }
});

export default router;
