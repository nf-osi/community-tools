import React, { useState } from 'react';
import { X, Loader2, Wrench, Dna } from 'lucide-react';
import type { IdeaFormData, IdeaType, Priority, FocusArea } from '../types';
import { FOCUS_AREAS, PRIORITIES, IDEA_TYPES } from '../types';

interface Props {
  onSubmit: (data: IdeaFormData) => Promise<void>;
  onClose: () => void;
}


const IDEA_TYPE_CONFIG: Record<IdeaType, {
  icon: React.ReactNode;
  label: string;
  summaryLabel: string;
  summaryPlaceholder: string;
}> = {
  'Infrastructure': {
    icon: <Wrench className="w-4 h-4" />,
    label: 'Infrastructure',
    summaryLabel: 'Description & Use Case',
    summaryPlaceholder: 'Describe the improvement, the problem it solves, and who would benefit.',
  },
  'New Data': {
    icon: <Dna className="w-4 h-4" />,
    label: 'New Data',
    summaryLabel: 'Scientific Justification',
    summaryPlaceholder: 'Describe the data you\'d like to see, the research questions it would enable, and any examples from other disease areas.',
  },
};

const EMPTY: IdeaFormData = {
  title: '',
  summary: '',
  submitter: '',
  priority: 'Medium',
  ideaType: 'Infrastructure',
  focusArea: undefined,
  affectedUserType: '',
  grantTag: '',
  suggestedFunding: '',
};

export default function IdeaForm({ onSubmit, onClose }: Props) {
  const [form, setForm] = useState<IdeaFormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof IdeaFormData>(key: K, value: IdeaFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.summary.trim()) {
      setError('Title and description are required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        summary: form.summary.trim(),
        affectedUserType: form.affectedUserType?.trim() || undefined,
        grantTag: form.grantTag?.trim() || undefined,
        suggestedFunding: form.suggestedFunding?.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const typeConfig = IDEA_TYPE_CONFIG[form.ideaType];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idea-form-title"
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded shadow-2xl w-full max-w-lg mb-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 id="idea-form-title" className="text-lg font-bold text-gray-900">Submit an Idea</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Propose an infrastructure improvement or new data for the NF portal.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 rounded p-1.5 hover:bg-gray-100 transition-colors"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Idea type toggle — first and prominent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are you proposing?<span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {IDEA_TYPES.map((type) => {
                const cfg = IDEA_TYPE_CONFIG[type];
                const active = form.ideaType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set('ideaType', type)}
                    className={`flex items-center gap-2 px-4 py-3 rounded border text-sm font-medium transition-all ${
                      active
                        ? type === 'Infrastructure'
                          ? 'bg-brand-50 border-brand-300 text-brand-800 shadow-sm'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span aria-hidden="true">{cfg.icon}</span>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
              {error}
            </div>
          )}

          <Field label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={
                form.ideaType === 'New Data'
                  ? 'e.g. "Spatial transcriptomics for NF1 tumor microenvironment"'
                  : 'Short, descriptive title for your idea'
              }
              className={inputClass}
              required
              aria-required="true"
            />
          </Field>

          <Field label={typeConfig.summaryLabel} required hint={`${form.summary.length}/500`} hintId="summary-count">
            <textarea
              value={form.summary}
              onChange={(e) => set('summary', e.target.value.slice(0, 500))}
              placeholder={typeConfig.summaryPlaceholder}
              rows={4}
              className={inputClass}
              required
              aria-required="true"
              maxLength={500}
              aria-describedby="summary-count"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value as Priority)}
                className={inputClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>

            <Field label="Focus Area">
              <select
                value={form.focusArea ?? ''}
                onChange={(e) => set('focusArea', (e.target.value || undefined) as FocusArea | undefined)}
                className={inputClass}
              >
                <option value="">— Select —</option>
                {FOCUS_AREAS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Affected User Type" hint="Optional — e.g. Researcher, Patient, Clinician">
            <input
              type="text"
              value={form.affectedUserType ?? ''}
              onChange={(e) => set('affectedUserType', e.target.value)}
              placeholder="Who would be most impacted?"
              className={inputClass}
            />
          </Field>

          <Field label="Associated Grant / Initiative" hint="Optional">
            <input
              type="text"
              value={form.grantTag ?? ''}
              onChange={(e) => set('grantTag', e.target.value)}
              placeholder="e.g. NF1 Consortium, CTF Research Award"
              className={inputClass}
            />
          </Field>

          <Field label="Suggested Funding Source" hint="Optional — any ideas for how this could be funded?">
            <input
              type="text"
              value={form.suggestedFunding ?? ''}
              onChange={(e) => set('suggestedFunding', e.target.value)}
              placeholder="e.g. CDMRP, foundation grant..."
              className={inputClass}
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-shadow bg-gray-50 hover:bg-white';

function Field({
  label,
  required,
  hint,
  hintId,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  hintId?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span id={hintId} className="font-normal text-gray-400 text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
