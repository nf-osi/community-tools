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
  const [synId, setSynId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFile() {
    const id = synId.trim();
    setError(null);
    if (!SYN_ID_RE.test(id)) {
      setError('Enter a Synapse file id like syn12345678.');
      return;
    }
    if (files.some((f) => f.id === id)) {
      setError('That file is already selected.');
      return;
    }
    setBusy(true);
    try {
      // Resolve name / contentType / preview from the backend. If the endpoint
      // isn't available yet, fall back to a bare reference the user can keep.
      const resolved = await resolveEntity(id).catch(() => ({ id, name: id }));
      onChange([...files, resolved]);
      setSynId('');
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

      <div className="flex gap-2 mb-4">
        <input
          value={synId}
          onChange={(e) => setSynId(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addFile(); }}
          placeholder="syn12345678"
          aria-label="Synapse file id"
          className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono"
          style={{ borderColor: '#cfd0c9', color: '#16181c' }}
        />
        <button
          onClick={addFile}
          disabled={busy}
          className="font-display font-medium text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: '#16181c', color: '#f6f6f3' }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </div>
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
