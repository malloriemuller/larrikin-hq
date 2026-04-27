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

// RFC 2047 encode the subject when it contains non-ASCII characters (e.g. em dash).
// Without this, multi-byte UTF-8 bytes in the header are decoded as Latin-1
// by receiving clients, producing garbage like Ã¢Â€Â" instead of —.
function encodeSubject(subject: string): string {
  if (/^[\x00-\x7F]*$/.test(subject)) return subject;
  return `=?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
}

function buildRawMessage(to: string, subject: string, body: string): string {
  const message = [
    `From: Larrikin AI <${FROM_ADDRESS}>`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
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
