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
  /** Deeper explanation surfaced in the tool-details modal. */
  details: string;
  link?: string;
}

export const GWAS_TOOLS: GwasTool[] = [
  {
    name: 'PLINK 2',
    category: 'QC & structure',
    what: 'Variant/sample QC (call rate, MAF, HWE), LD pruning, and principal-component analysis. Always run, regardless of the chosen association engine.',
    why: 'The de-facto standard for genotype data — extremely fast and battle-tested for cleaning data and computing ancestry principal components.',
    goodFor: 'Quality control and deriving the PCs used to adjust for population structure.',
    details:
      'The pipeline filters variants and samples by missingness (--geno / --mind), minor-allele frequency (--maf) and Hardy–Weinberg equilibrium (--hwe), then LD-prunes (--indep-pairwise) to a roughly independent SNP set and runs --pca on it. Those principal components are the standard way to adjust association tests for ancestry/population structure, which would otherwise cause spurious associations. PLINK 2 is chosen because it is the fastest, most widely validated toolkit for these steps and reads/writes the .bed/.bim/.fam format directly.',
    link: 'https://www.cog-genomics.org/plink/2.0/',
  },
  {
    name: 'PLINK 2 — association (--glm)',
    category: 'Association engine',
    engine: 'plink',
    what: 'Per-variant linear/logistic regression, adjusting for principal components and any covariates.',
    why: 'Fast and simple; the right default when samples are unrelated and case/control counts are reasonably balanced.',
    goodFor: 'Quick, well-powered scans on unrelated individuals with balanced or quantitative traits.',
    details:
      'For each variant, --glm fits a linear (quantitative trait) or logistic (case/control) regression of phenotype on genotype dosage plus covariates (the PCs and any you supply). It assumes samples are independent and, for logistic regression, that case/control counts are not too extreme. When those assumptions hold it is extremely fast and well-powered. When they do not — relatedness or rare/imbalanced phenotypes — the test statistics become inflated or anti-conservative, which is why SAIGE exists as the alternative.',
    link: 'https://www.cog-genomics.org/plink/2.0/assoc',
  },
  {
    name: 'SAIGE',
    category: 'Association engine',
    engine: 'saige',
    what: 'Mixed-model association with saddlepoint approximation (SPA) / Firth correction. Uses the PLINK-derived PCs as covariates.',
    why: "Robust exactly where PLINK's assumptions break — it accounts for sample relatedness and corrects test statistics when case/control counts are small or imbalanced.",
    goodFor: 'Rare-disease and unbalanced case/control studies, and related or population-structured samples — the common NF setting.',
    details:
      'SAIGE runs in two steps: (1) fit a null logistic/linear mixed model that includes a genetic relationship matrix as a random effect (absorbing relatedness and structure) plus your covariates; (2) test each variant with a saddlepoint approximation that keeps the type-I error rate correct even at very unbalanced case:control ratios or low minor-allele counts. This is the method of choice for rare diseases and biobank-scale unbalanced phenotypes — directly relevant to NF cohorts, which are typically small and case-skewed. It is more computationally intensive than PLINK and is provided here as a heavier conda/bioconda install.',
    link: 'https://saigegit.github.io/SAIGE-doc/',
  },
  {
    name: 'pandas · matplotlib · SciPy',
    category: 'Visualization',
    what: 'Manhattan and QQ plots, the genomic-inflation factor (λ_GC), and the ranked top-hits table.',
    why: 'Standard, transparent Python tooling for reproducible GWAS diagnostics.',
    goodFor: 'Visual QC of the association results and spotting inflation or top signals.',
    details:
      'From the engine output the pipeline builds a Manhattan plot (with genome-wide 5e-8 and suggestive 1e-5 lines), a QQ plot of observed vs expected p-values, and computes the genomic-inflation factor λ_GC (median chi-square / 0.456). λ_GC near 1.0 indicates well-controlled stratification; values well above ~1.1 suggest residual confounding or strong polygenicity. These open, scriptable libraries keep the diagnostics fully reproducible.',
  },
  {
    name: 'Claude (Anthropic)',
    category: 'Interpretation',
    what: 'Writes a plain-language interpretation of the summary statistics, incorporating your notes/preferences and NF context.',
    why: 'Turns raw statistics into a researcher-readable narrative — the step that usually takes manual effort.',
    goodFor: 'A first-pass interpretation of inflation, significant signals, and caveats.',
    details:
      'A large language model summarizes the run — commenting on λ_GC, whether any signal reaches genome-wide significance, sample-size and stratification caveats, and any NF-relevant genes — and folds in your free-text notes. It is a first-pass narrative to orient a researcher, not a substitute for statistical review or the post-GWAS interpretation steps below.',
  },
];

export const ENGINE_TOOLS = GWAS_TOOLS.filter((t) => t.engine);

// Recommended interpretation steps that this agent does NOT run, so users know
// what to do next with the summary statistics it produces.
export interface PostGwasStep {
  name: string;
  tools: string;
  what: string;
  why: string;
  link?: string;
}

export const POST_GWAS_STEPS: PostGwasStep[] = [
  {
    name: 'Replication & meta-analysis',
    tools: 'METAL, GWAMA',
    what: 'Combine these summary statistics with other cohorts to confirm signals and boost power.',
    why: 'Single small cohorts (typical for NF) rarely reach genome-wide significance alone; replication is the standard bar for a credible hit.',
    link: 'https://genome.sph.umich.edu/wiki/METAL',
  },
  {
    name: 'Heritability & confounding check',
    tools: 'LD Score Regression (LDSC), GCTA-GREML',
    what: 'Estimate SNP-heritability and use the LDSC intercept to separate true polygenic signal from confounding/stratification.',
    why: 'Complements λ_GC: an inflated λ with an LDSC intercept near 1 points to polygenicity rather than bias. Runs on summary stats alone.',
    link: 'https://github.com/bulik/ldsc',
  },
  {
    name: 'Gene & pathway analysis',
    tools: 'MAGMA, FUMA',
    what: 'Aggregate per-variant signal to genes and test gene sets / pathways.',
    why: 'Moves from individual SNPs to interpretable genes and biological pathways — often more actionable than a single lead variant.',
    link: 'https://fuma.ctglab.nl/',
  },
  {
    name: 'Fine-mapping',
    tools: 'SuSiE, FINEMAP',
    what: 'Within each associated locus, compute credible sets of variants most likely to be causal.',
    why: 'GWAS hits are usually LD proxies; fine-mapping narrows a locus toward the variant(s) actually driving the signal.',
    link: 'https://stephenslab.github.io/susieR/',
  },
  {
    name: 'Functional annotation',
    tools: 'VEP, ANNOVAR, FUMA',
    what: 'Annotate top variants with predicted consequence, regulatory context, and eQTL links.',
    why: 'Adds biological meaning to lead variants — coding effect, nearby genes, and likely mechanism.',
    link: 'https://www.ensembl.org/info/docs/tools/vep/index.html',
  },
  {
    name: 'Rare-variant / gene-based tests',
    tools: 'SAIGE-GENE+, SKAT-O, burden tests',
    what: 'Aggregate rare variants within a gene (e.g. from WES/WGS) and test the gene as a unit.',
    why: 'Single-variant GWAS is underpowered for rare variants; gene-based tests are the right tool for NF1/NF2-style rare-variant burden on the portal’s exome/genome data.',
    link: 'https://saigegit.github.io/SAIGE-doc/docs/set.html',
  },
  {
    name: 'Polygenic scores',
    tools: 'PRS-CS, PRSice-2, LDpred2',
    what: 'Build and evaluate a polygenic score from the summary statistics.',
    why: 'Translates aggregate genetic signal into a per-individual risk score for downstream stratification or prediction work.',
    link: 'https://github.com/getian107/PRScs',
  },
];
