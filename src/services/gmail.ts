import { google } from 'googleapis';

const FROM_ADDRESS = process.env.GMAIL_FROM_ADDRESS ?? 'hello@thelarrikin.ai';

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  return oauth2Client;
}

function buildRawMessage(to: string, subject: string, body: string): string {
  const message = [
    `From: Larrikin AI <${FROM_ADDRESS}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\n');

  return Buffer.from(message).toString('base64url');
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: SendEmailParams): Promise<void> {
  const auth = getOAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = buildRawMessage(to, subject, body);

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  console.log('[gmail] email sent', { to, subject });
}
