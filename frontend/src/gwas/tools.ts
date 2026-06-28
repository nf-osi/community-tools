// Single source of truth describing the tools the GWAS agent runs, so the UI
// can explain what's available and why each tool was chosen.
import type { Engine } from './types';

export interface GwasTool {
  name: string;
  category: 'QC & structure' | 'Association engine' | 'Visualization' | 'Interpretation';
  /** Set when this tool is a user-selectable association engine. */
  engine?: Engine;
  what: string;
  why: string;
  goodFor: string;
}

export const GWAS_TOOLS: GwasTool[] = [
  {
    name: 'PLINK 2',
    category: 'QC & structure',
    what: 'Variant/sample QC (call rate, MAF, HWE), LD pruning, and principal-component analysis. Always run, regardless of the chosen association engine.',
    why: 'The de-facto standard for genotype data — extremely fast and battle-tested for cleaning data and computing ancestry principal components.',
    goodFor: 'Quality control and deriving the PCs used to adjust for population structure.',
  },
  {
    name: 'PLINK 2 — association (--glm)',
    category: 'Association engine',
    engine: 'plink',
    what: 'Per-variant linear/logistic regression, adjusting for principal components and any covariates.',
    why: 'Fast and simple; the right default when samples are unrelated and case/control counts are reasonably balanced.',
    goodFor: 'Quick, well-powered scans on unrelated individuals with balanced or quantitative traits.',
  },
  {
    name: 'SAIGE',
    category: 'Association engine',
    engine: 'saige',
    what: 'Mixed-model association with saddlepoint approximation (SPA) / Firth correction. Uses the PLINK-derived PCs as covariates.',
    why: "Robust exactly where PLINK's assumptions break — it accounts for sample relatedness and corrects test statistics when case/control counts are small or imbalanced.",
    goodFor: 'Rare-disease and unbalanced case/control studies, and related or population-structured samples — the common NF setting.',
  },
  {
    name: 'pandas · matplotlib · SciPy',
    category: 'Visualization',
    what: 'Manhattan and QQ plots, the genomic-inflation factor (λ_GC), and the ranked top-hits table.',
    why: 'Standard, transparent Python tooling for reproducible GWAS diagnostics.',
    goodFor: 'Visual QC of the association results and spotting inflation or top signals.',
  },
  {
    name: 'Claude (Anthropic)',
    category: 'Interpretation',
    what: 'Writes a plain-language interpretation of the summary statistics, incorporating your notes/preferences and NF context.',
    why: 'Turns raw statistics into a researcher-readable narrative — the step that usually takes manual effort.',
    goodFor: 'A first-pass interpretation of inflation, significant signals, and caveats.',
  },
];

export const ENGINE_TOOLS = GWAS_TOOLS.filter((t) => t.engine);
