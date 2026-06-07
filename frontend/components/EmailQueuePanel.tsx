'use client';

import { useState } from 'react';
import { EmailQueueEntry, updateEmailQueueEntry, sendEmail, discardEmail } from '@/lib/api';

interface EmailQueuePanelProps {
  entries: EmailQueueEntry[];
  onRefresh: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--cream)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '0.75rem',
  color: 'var(--foreground)',
  outline: 'none',
  fontSize: '1rem',
  fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
};

const focusStyle: React.CSSProperties = {
  borderColor: 'var(--ember)',
  boxShadow: '0 0 0 3px oklch(0.68 0.16 50 / 0.12)',
};

function EmailCard({ entry, onRefresh }: { entry: EmailQueueEntry; onRefresh: () => void }) {
  const [subject, setSubject] = useState(entry.fields.Subject);
  const [body, setBody] = useState(entry.fields.Body);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [subjectFocused, setSubjectFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);

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
    <div
      className="overflow-hidden transition-colors"
      style={{
        border: `1px solid ${expanded ? 'oklch(0.85 0.015 65)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
      }}
    >
      {/* Collapsed header */}
      <button
        className="w-full text-left px-5 py-4 min-h-[80px] flex items-start justify-between gap-4 transition-colors"
        style={{ backgroundColor: expanded ? 'var(--muted)' : 'var(--background)' }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
            >
              {entry.fields['Email Type']}
            </span>
            {entry.fields['Generation Failed'] && (
              <span
                className="text-[11px] font-medium px-2 py-0.5"
                style={{
                  color: 'var(--error)',
                  backgroundColor: 'oklch(0.55 0.18 25 / 0.08)',
                  border: '1px solid oklch(0.55 0.18 25 / 0.2)',
                  borderRadius: '3px',
                }}
              >
                Draft failed
              </span>
            )}
          </div>
          <p
            className="text-lg font-bold leading-snug"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-fraunces), serif' }}
          >
            {subject || '(No subject)'}
          </p>
          <p
            className="text-[12px] mt-1 uppercase tracking-[0.10em]"
            style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            To: {entry.fields.To}
          </p>
        </div>
        <svg
          className={`w-4 h-4 flex-none mt-1.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--faint)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div
          className="px-5 pb-5 pt-4"
          style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--cream)' }}
        >
          <div className="mb-4">
            <label
              className="block text-[11px] font-semibold uppercase tracking-[0.22em] mb-2"
              style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
            >
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setSubjectFocused(true)}
              onBlur={() => setSubjectFocused(false)}
              style={{ ...inputStyle, minHeight: '48px', ...(subjectFocused ? focusStyle : {}) }}
            />
          </div>
          <div className="mb-5">
            <label
              className="block text-[11px] font-semibold uppercase tracking-[0.22em] mb-2"
              style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
            >
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              onFocus={() => setBodyFocused(true)}
              onBlur={() => setBodyFocused(false)}
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
                resize: 'vertical',
                lineHeight: '1.6',
                ...(bodyFocused ? focusStyle : {}),
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center justify-center min-h-[44px] px-5 text-[12px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50 sm:flex-none uppercase tracking-[0.12em]"
              style={{
                backgroundColor: 'var(--ink)',
                color: 'var(--background)',
                borderRadius: '9999px',
                border: 'none',
                fontFamily: 'var(--font-inter), sans-serif',
                cursor: sending ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Sending…' : 'Send email'}
            </button>
            {hasEdits && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center min-h-[44px] px-5 text-[12px] transition-opacity hover:opacity-70 disabled:opacity-50 sm:flex-none uppercase tracking-[0.12em]"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--muted-foreground)',
                  borderRadius: 'var(--radius)',
                  backgroundColor: 'transparent',
                  fontFamily: 'var(--font-inter), sans-serif',
                }}
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
            )}
            <button
              onClick={handleDiscard}
              className="flex items-center justify-center min-h-[44px] px-5 text-[12px] transition-opacity hover:opacity-80 sm:flex-none sm:ml-auto uppercase tracking-[0.12em]"
              style={{
                color: 'var(--error)',
                backgroundColor: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
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
      <div
        className="text-base text-center py-12 italic"
        style={{
          color: 'var(--muted-foreground)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
        }}
      >
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
