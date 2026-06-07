'use client';

import { useState } from 'react';
import { createClient, ClientStage } from '@/lib/api';

const STAGES: ClientStage[] = ['Lead', 'Discovery', 'Proposal', 'Delivery', 'Retainer'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '42px',
  padding: '0 0.75rem',
  backgroundColor: 'var(--cream)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--foreground)',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
};

const focusStyle: React.CSSProperties = {
  borderColor: 'var(--ember)',
  boxShadow: '0 0 0 3px oklch(0.68 0.16 50 / 0.12)',
};

interface ClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function Input({ value, onChange, placeholder, type = 'text', required }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
    />
  );
}

function SelectInput({ value, onChange, children }: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
    >
      {children}
    </select>
  );
}

export default function ClientForm({ onSuccess, onCancel }: ClientFormProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<ClientStage>('Lead');
  const [source, setSource] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !email.trim()) {
      setError('Name, company, and email are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createClient({
        Name: name.trim(),
        Company: company.trim(),
        Email: email.trim(),
        Phone: phone.trim() || undefined,
        Stage: stage,
        Source: source.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'oklch(0 0 0 / 0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-md shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.22em] mb-0.5"
              style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
            >
              New Client
            </div>
            <h2
              className="text-xl font-bold"
              style={{ color: 'var(--foreground)', fontFamily: 'var(--font-fraunces), serif' }}
            >
              Add to pipeline
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-2xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *">
              <Input value={name} onChange={setName} placeholder="Sarah Jones" required />
            </Field>
            <Field label="Company *">
              <Input value={company} onChange={setCompany} placeholder="Jones & Co" required />
            </Field>
          </div>

          <Field label="Email *">
            <Input type="email" value={email} onChange={setEmail} placeholder="sarah@example.com" required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input value={phone} onChange={setPhone} placeholder="+1 555 000 0000" />
            </Field>
            <Field label="Stage">
              <SelectInput value={stage} onChange={v => setStage(v as ClientStage)}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </Field>
          </div>

          <Field label="Source">
            <Input value={source} onChange={setSource} placeholder="Referral, LinkedIn, etc." />
          </Field>

          {error && (
            <p
              className="text-sm px-3 py-2"
              style={{
                color: 'var(--error)',
                backgroundColor: 'oklch(0.55 0.18 25 / 0.08)',
                border: '1px solid oklch(0.55 0.18 25 / 0.2)',
                borderRadius: 'var(--radius)',
              }}
            >
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[44px] text-base transition-opacity hover:opacity-70"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--muted-foreground)',
                backgroundColor: 'transparent',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-h-[44px] text-base font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                borderRadius: '9999px',
                backgroundColor: 'var(--ink)',
                color: 'var(--background)',
                fontFamily: 'var(--font-inter), sans-serif',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Adding…' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
