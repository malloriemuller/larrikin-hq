'use client';

import { useState } from 'react';
import { EmailQueueEntry, updateEmailQueueEntry, sendEmail, discardEmail } from '@/lib/api';

interface EmailQueuePanelProps {
  entries: EmailQueueEntry[];
  onRefresh: () => void;
}

function EmailCard({ entry, onRefresh }: { entry: EmailQueueEntry; onRefresh: () => void }) {
  const [subject, setSubject] = useState(entry.fields.Subject);
  const [body, setBody] = useState(entry.fields.Body);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const hasEdits = subject !== entry.fields.Subject || body !== entry.fields.Body;

  async function handleSave() {
    setSaving(true);
    try {
      await updateEmailQueueEntry(entry.id, { Subject: subject, Body: body });
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      if (hasEdits) await updateEmailQueueEntry(entry.id, { Subject: subject, Body: body });
      await sendEmail(entry.id);
      onRefresh();
    } finally {
      setSending(false);
    }
  }

  async function handleDiscard() {
    if (!confirm('Discard this email draft?')) return;
    await discardEmail(entry.id);
    onRefresh();
  }

  return (
    <div className="rounded-[3px] border border-[rgba(196,175,90,0.13)] overflow-hidden hover:border-[rgba(196,175,90,0.30)] transition-colors">
      {/* Collapsed header */}
      <button
        className="w-full text-left px-5 py-4 min-h-[80px] flex items-start justify-between gap-4 bg-[#162C1A] hover:bg-[#1E3B23] transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span
              className="text-[11px] font-semibold text-[#C4AF5A] uppercase tracking-[0.22em]"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {entry.fields['Email Type']}
            </span>
            {entry.fields['Generation Failed'] && (
              <span className="text-[11px] font-medium text-red-400 bg-red-900/20 px-2 py-0.5 rounded-sm border border-red-800/30">
                Draft failed
              </span>
            )}
          </div>
          <p
            className="text-lg font-bold text-[#EDE4C8] leading-snug"
            style={{ fontFamily: 'var(--font-playfair), serif' }}
          >
            {subject || '(No subject)'}
          </p>
          <p
            className="text-[12px] text-[rgba(237,228,200,0.50)] mt-1 uppercase tracking-[0.10em]"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            To: {entry.fields.To}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-[rgba(237,228,200,0.30)] flex-none mt-1.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-[rgba(196,175,90,0.10)] pt-4 bg-[#0E1B11]">
          <div className="mb-4">
            <label
              className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgba(237,228,200,0.45)] mb-2"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-[rgba(196,175,90,0.18)] rounded-[3px] px-3 py-3 text-base min-h-[48px] focus:outline-none focus:border-[rgba(196,175,90,0.50)] bg-[rgba(0,0,0,0.25)] text-[#EDE4C8]"
            />
          </div>
          <div className="mb-5">
            <label
              className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgba(237,228,200,0.45)] mb-2"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full border border-[rgba(196,175,90,0.18)] rounded-[3px] px-3 py-3 text-base focus:outline-none focus:border-[rgba(196,175,90,0.50)] font-mono resize-y leading-relaxed bg-[rgba(0,0,0,0.25)] text-[#EDE4C8]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center justify-center min-h-[44px] px-5 rounded-[3px] bg-[#C4AF5A] text-[#0E1B11] text-[12px] font-bold hover:bg-[#D4BF6A] disabled:opacity-50 transition-colors sm:flex-none uppercase tracking-[0.12em]"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {sending ? 'Sending…' : 'Send email'}
            </button>
            {hasEdits && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center min-h-[44px] px-5 rounded-[3px] border border-[rgba(196,175,90,0.25)] text-[rgba(237,228,200,0.70)] text-[12px] hover:border-[rgba(196,175,90,0.50)] hover:text-[#EDE4C8] disabled:opacity-50 transition-colors sm:flex-none uppercase tracking-[0.12em]"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
            )}
            <button
              onClick={handleDiscard}
              className="flex items-center justify-center min-h-[44px] px-5 rounded-[3px] text-red-400/60 text-[12px] hover:text-red-400 transition-colors sm:flex-none sm:ml-auto uppercase tracking-[0.12em]"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmailQueuePanel({ entries, onRefresh }: EmailQueuePanelProps) {
  if (entries.length === 0) {
    return (
      <div className="text-base text-[rgba(237,228,200,0.35)] text-center py-12 border border-dashed border-[rgba(196,175,90,0.15)] rounded-[3px] italic">
        No emails pending review
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <EmailCard key={entry.id} entry={entry} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
