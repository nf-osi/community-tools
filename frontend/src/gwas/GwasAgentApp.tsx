import { useEffect, useState } from 'react';
import { Loader2, Play, Search, Dna, ArrowLeft } from 'lucide-react';
import { Link } from '../router';
import FileSelector from './components/FileSelector';
import FileCheckPanel from './components/FileCheckPanel';
import ToolsPanel from './components/ToolsPanel';
import { checkFiles, fetchSession, submitJob } from './api';
import { ENGINE_TOOLS } from './tools';
import type {
  Engine,
  FileCheckResult,
  SessionUser,
  SubmitResult,
  SynapseFileSelection,
  TraitType,
  UserParams,
} from './types';

const LOGIN_URL = `${import.meta.env.VITE_AUTH_BASE ?? ''}/api/auth/login`;

export default function GwasAgentApp() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [files, setFiles] = useState<SynapseFileSelection[]>([]);
  const [outputParent, setOutputParent] = useState('');
  const [traitType, setTraitType] = useState<TraitType>('binary');
  const [phenoName, setPhenoName] = useState('PHENO1');
  const [engine, setEngine] = useState<Engine>('plink');
  const [notes, setNotes] = useState('');

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<FileCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);

  useEffect(() => {
    fetchSession().then(({ user }) => setUser(user)).catch(() => {});
  }, []);

  const isLoggedIn = user !== null;
  const canCheck = files.length > 0 && !checking;

  async function runCheck() {
    setChecking(true);
    setError(null);
    setResult(null);
    setSubmitted(null);
    const params: UserParams = {
      trait_type: traitType,
      pheno_name: phenoName || undefined,
      engine,
    };
    try {
      const res = await checkFiles({
        selected_files: files,
        output_parent_id: outputParent.trim() || undefined,
        user_params: params,
        user_prompt: notes.trim() || undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File check failed.');
    } finally {
      setChecking(false);
    }
  }

  async function runAnalysis() {
    if (!result?.resolved_context) return;
    setSubmitting(true);
    setError(null);
    // Always carry the user's prompt into the job context, even if the
    // file-check agent didn't echo it into params.
    const trimmed = notes.trim();
    const context = trimmed
      ? {
          ...result.resolved_context,
          params: { ...(result.resolved_context.params ?? {}), user_prompt: trimmed },
        }
      : result.resolved_context;
    try {
      const res = await submitJob(context);
      setSubmitted(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const readyToRun = result?.status === 'ready' && !!result.resolved_context;

  return (
    <div className="min-h-screen" style={{ background: '#fafaf7' }}>
      {/* Prominent back-to-gallery control: fixed, vertically centered, left-aligned */}
      <Link
        to="/agents"
        aria-label="Back to Agent Gallery"
        title="Back to Agent Gallery"
        className="group fixed left-4 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 rounded-full border bg-white shadow-md px-3 py-3 2xl:pr-5 transition-colors hover:border-[#0d6e62]"
        style={{ borderColor: '#e2e2dc' }}
      >
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" style={{ color: '#0d6e62' }} />
        <span className="hidden 2xl:inline font-display font-medium text-sm" style={{ color: '#16181c' }}>
          Agent Gallery
        </span>
      </Link>

      {/* Masthead — mirrors the roadmap app's header treatment */}
      <div className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: '#e2e2dc' }}>
        <header className="max-w-4xl mx-auto px-10 pt-7 pb-5 flex items-end justify-between">
          <div className="flex items-start gap-5">
            <Dna className="w-10 h-10 mt-1" style={{ color: '#0d6e62' }} aria-hidden="true" />
            <div>
              <div className="font-display font-medium text-[15px] uppercase tracking-[0.18em]" style={{ color: '#8a8f98' }}>
                NF Data Portal · Agents
              </div>
              <h1 className="font-display font-semibold text-[40px] leading-[.98] tracking-[-0.025em] mt-1" style={{ color: '#16181c' }}>
                GWAS Agent
              </h1>
            </div>
          </div>
          <div className="pb-2">
            {isLoggedIn ? (
              <span className="text-sm font-medium" style={{ color: '#54585f' }}>{user!.username}</span>
            ) : (
              <a
                href={LOGIN_URL}
                className="font-display font-medium text-sm px-[22px] py-[11px] rounded-full"
                style={{ background: '#16181c', color: '#f6f6f3' }}
              >
                Log in with Synapse
              </a>
            )}
          </div>
        </header>
      </div>

      <main className="max-w-4xl mx-auto px-10 pt-8 pb-20 space-y-8">
        <FileSelector files={files} onChange={setFiles} />

        {/* Params */}
        <section>
          <h2 className="font-display font-semibold text-[15px] mb-3" style={{ color: '#16181c' }}>
            2 · Analysis settings
          </h2>

          <label className="block mb-4">
            <span className="text-[12px] uppercase tracking-[0.06em]" style={{ color: '#8a8f98' }}>Association engine</span>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as Engine)}
              className="mt-1 w-full sm:w-96 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: '#cfd0c9', color: '#16181c' }}
            >
              <option value="plink">PLINK 2 (--glm) — fast; unrelated, balanced</option>
              <option value="saige">SAIGE — mixed model; imbalanced / related</option>
            </select>
            <span className="block mt-1 text-[12px]" style={{ color: '#8a8f98' }}>
              {ENGINE_TOOLS.find((t) => t.engine === engine)?.goodFor}
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-[12px] uppercase tracking-[0.06em]" style={{ color: '#8a8f98' }}>Trait type</span>
              <select
                value={traitType}
                onChange={(e) => setTraitType(e.target.value as TraitType)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: '#cfd0c9', color: '#16181c' }}
              >
                <option value="binary">Binary (case/control)</option>
                <option value="quantitative">Quantitative</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] uppercase tracking-[0.06em]" style={{ color: '#8a8f98' }}>Phenotype column</span>
              <input
                value={phenoName}
                onChange={(e) => setPhenoName(e.target.value)}
                placeholder="PHENO1"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                style={{ borderColor: '#cfd0c9', color: '#16181c' }}
              />
            </label>
            <label className="block">
              <span className="text-[12px] uppercase tracking-[0.06em]" style={{ color: '#8a8f98' }}>Results folder (syn id)</span>
              <input
                value={outputParent}
                onChange={(e) => setOutputParent(e.target.value)}
                placeholder="syn200…"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                style={{ borderColor: '#cfd0c9', color: '#16181c' }}
              />
            </label>
          </div>

          <label className="block mt-4">
            <span className="text-[12px] uppercase tracking-[0.06em]" style={{ color: '#8a8f98' }}>
              Notes &amp; preferences <span className="normal-case tracking-normal">(optional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything the agent should know — e.g. analysis preferences (covariates to prioritize, MAF/QC thresholds, subset to specific chromosomes) or output preferences (extra plots, summary style)."
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm resize-y"
              style={{ borderColor: '#cfd0c9', color: '#16181c' }}
            />
            <span className="block mt-1 text-[12px]" style={{ color: '#8a8f98' }}>
              Free text. Used by the pre-flight check and passed to the analysis job.
            </span>
          </label>
        </section>

        {/* Check */}
        <section>
          <h2 className="font-display font-semibold text-[15px] mb-3" style={{ color: '#16181c' }}>
            3 · Pre-flight check
          </h2>
          <button
            onClick={runCheck}
            disabled={!canCheck}
            className="font-display font-medium text-sm px-5 py-2.5 rounded-full flex items-center gap-2 disabled:opacity-40"
            style={{ background: '#16181c', color: '#f6f6f3' }}
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {checking ? 'Checking files…' : 'Check my files'}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: '#f6e2dd', color: '#b0341d' }}>
              {error}
            </p>
          )}

          {result && (
            <div className="mt-4">
              <FileCheckPanel result={result} />
            </div>
          )}
        </section>

        {/* Run */}
        {result && (
          <section>
            <h2 className="font-display font-semibold text-[15px] mb-3" style={{ color: '#16181c' }}>
              4 · Run analysis
            </h2>
            {!isLoggedIn ? (
              <p className="text-sm" style={{ color: '#54585f' }}>
                <a href={LOGIN_URL} className="underline" style={{ color: '#125e81' }}>Log in with Synapse</a> to run the analysis on your files.
              </p>
            ) : submitted ? (
              <div className="rounded-xl border p-5" style={{ borderColor: '#cfe6d8', background: '#e1f1e8' }}>
                <p className="text-sm font-medium" style={{ color: '#1d7a4f' }}>
                  Job submitted — id <span className="font-mono">{submitted.job_id}</span>.
                </p>
                <p className="text-[13px] mt-1" style={{ color: '#54585f' }}>
                  Results will appear in your chosen Synapse folder when the run completes.
                </p>
              </div>
            ) : (
              <button
                onClick={runAnalysis}
                disabled={!readyToRun || submitting}
                title={readyToRun ? '' : 'Resolve the issues above first'}
                className="font-display font-medium text-sm px-5 py-2.5 rounded-full flex items-center gap-2 disabled:opacity-40"
                style={{ background: readyToRun ? '#0d6e62' : '#9aa0a6', color: '#fff' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {submitting ? 'Submitting…' : 'Run GWAS'}
              </button>
            )}
          </section>
        )}

        {/* Tools */}
        <section>
          <h2 className="font-display font-semibold text-[15px] mb-1" style={{ color: '#16181c' }}>
            Tools in this pipeline
          </h2>
          <p className="text-sm mb-3" style={{ color: '#8a8f98' }}>
            What runs on your data, why each tool was chosen, and what it's good for.
            The selected association engine is highlighted.
          </p>
          <ToolsPanel engine={engine} />
        </section>
      </main>
    </div>
  );
}
