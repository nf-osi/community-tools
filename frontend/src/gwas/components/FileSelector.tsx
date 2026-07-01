import { useState } from 'react';
import { Plus, X, FileText, Loader2 } from 'lucide-react';
import { resolveEntity } from '../api';
import type { SynapseFileSelection } from '../types';

interface Props {
  files: SynapseFileSelection[];
  onChange: (files: SynapseFileSelection[]) => void;
}

const SYN_ID_RE = /^syn\d+$/i;

function humanSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) { n /= 1024; u++; }
  return `${n.toFixed(n < 10 && u > 0 ? 1 : 0)} ${units[u]}`;
}

export default function FileSelector({ files, onChange }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles() {
    setError(null);
    // Accept multiple ids separated by space, tab, comma, or newline.
    const tokens = text.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) {
      setError('Enter one or more Synapse file ids.');
      return;
    }
    const invalid = tokens.filter((t) => !SYN_ID_RE.test(t));
    if (invalid.length) {
      const shown = invalid.slice(0, 5).join(', ') + (invalid.length > 5 ? '…' : '');
      setError(`Not valid Synapse ids (expected syn12345678): ${shown}`);
      return;
    }
    // Normalize + dedupe against the current selection and within the batch.
    const existing = new Set(files.map((f) => f.id.toLowerCase()));
    const seen = new Set<string>();
    const toAdd: string[] = [];
    for (const t of tokens) {
      const id = t.toLowerCase();
      if (existing.has(id) || seen.has(id)) continue;
      seen.add(id);
      toAdd.push(id);
    }
    if (toAdd.length === 0) {
      setError('Those files are already selected.');
      return;
    }
    setBusy(true);
    try {
      // Resolve name / contentType / preview per id; fall back to a bare
      // reference if the backend endpoint isn't available.
      const resolved = await Promise.all(
        toAdd.map((id) => resolveEntity(id).catch(() => ({ id, name: id }))),
      );
      onChange([...files, ...resolved]);
      setText('');
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    onChange(files.filter((f) => f.id !== id));
  }

  return (
    <section>
      <h2 className="font-display font-semibold text-[15px] mb-1" style={{ color: '#16181c' }}>
        1 · Select input files
      </h2>
      <p className="text-sm mb-4" style={{ color: '#8a8f98' }}>
        Add the Synapse files for your GWAS — genotypes (VCF or PLINK&nbsp;.bed/.bim/.fam),
        a phenotype table, and optionally a covariate table.
      </p>

      <div className="flex gap-2 mb-1 items-start">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter submits; plain Enter inserts a newline.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addFiles(); }
          }}
          rows={2}
          placeholder="syn12345678  syn23456789, syn34567890&#10;(one or more ids)"
          aria-label="Synapse file ids"
          className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono resize-y"
          style={{ borderColor: '#cfd0c9', color: '#16181c' }}
        />
        <button
          onClick={addFiles}
          disabled={busy}
          className="font-display font-medium text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40 flex-shrink-0"
          style={{ background: '#16181c', color: '#f6f6f3' }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </div>
      <p className="text-[12px] mb-4" style={{ color: '#8a8f98' }}>
        Paste one or more ids separated by space, tab, comma, or newline. ⌘/Ctrl+Enter to add.
      </p>
      {error && <p className="text-sm mb-3" style={{ color: '#b0341d' }}>{error}</p>}

      {files.length === 0 ? (
        <div
          className="rounded-lg border border-dashed px-4 py-8 text-center text-sm"
          style={{ borderColor: '#cfd0c9', color: '#8a8f98' }}
        >
          No files selected yet.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border" style={{ borderColor: '#e2e2dc' }}>
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#8a8f98' }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" style={{ color: '#16181c' }}>
                  {f.name}
                </div>
                <div className="text-[12px] font-mono" style={{ color: '#8a8f98' }}>
                  {f.id}{f.size != null ? ` · ${humanSize(f.size)}` : ''}
                  {f.preview ? ' · preview loaded' : ''}
                </div>
              </div>
              <button
                onClick={() => remove(f.id)}
                aria-label={`Remove ${f.name}`}
                className="p-1 rounded hover:bg-gray-100"
                style={{ color: '#8a8f98' }}
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
