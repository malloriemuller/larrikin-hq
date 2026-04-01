'use client';

import { useState } from 'react';
import { createClient, ClientStage } from '@/lib/api';

const STAGES: ClientStage[] = ['Lead', 'Discovery', 'Proposal', 'Delivery', 'Retainer'];

interface ClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
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
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-md bg-[#162C1A] rounded-[4px] border border-[rgba(196,175,90,0.18)] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-[rgba(196,175,90,0.12)] px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C4AF5A] mb-0.5" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>New Client</div>
            <h2 className="text-xl font-bold text-[#EDE4C8]">Add to pipeline</h2>
          </div>
          <button onClick={onCancel} className="text-[rgba(237,228,200,0.35)] hover:text-[#EDE4C8] transition-colors text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah Jones" className={inputCls} required />
            </Field>
            <Field label="Company *">
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Jones & Co" className={inputCls} required />
            </Field>
          </div>

          <Field label="Email *">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@example.com" className={inputCls} required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" className={inputCls} />
            </Field>
            <Field label="Stage">
              <select value={stage} onChange={(e) => setStage(e.target.value as ClientStage)} className={inputCls}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Source">
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Referral, LinkedIn, etc." className={inputCls} />
          </Field>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-sm px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 min-h-[44px] rounded-sm border border-[rgba(196,175,90,0.20)] text-base text-[rgba(237,228,200,0.50)] hover:text-[#EDE4C8] hover:border-[rgba(196,175,90,0.45)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 min-h-[44px] rounded-sm bg-[#C4AF5A] text-[#0E1B11] text-base font-bold hover:bg-[#D4BF6A] transition-colors disabled:opacity-50">
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
      <label className="text-[11px] font-semibold uppercase tracking-widest text-[rgba(237,228,200,0.45)]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full min-h-[42px] px-3 rounded-sm border border-[rgba(196,175,90,0.18)] bg-[rgba(0,0,0,0.25)] text-base text-[#EDE4C8] placeholder-[rgba(237,228,200,0.25)] focus:outline-none focus:border-[rgba(196,175,90,0.50)] transition-colors';
