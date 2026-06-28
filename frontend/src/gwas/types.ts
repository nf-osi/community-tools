// Types for the GWAS agent frontend. The verdict shape mirrors
// hackathon/frontend/file-check.schema.json so the backend's structured
// output deserializes directly into FileCheckResult.

export interface SynapseFileSelection {
  id: string;
  name: string;
  contentType?: string;
  size?: number;
  annotations?: Record<string, unknown>;
  preview?: string;
}

export type TraitType = 'binary' | 'quantitative';

export type Engine = 'plink' | 'saige';

export interface UserParams {
  trait_type?: TraitType;
  pheno_name?: string;
  pheno_coding_01?: boolean;
  engine?: Engine;
}

// ---- file-check agent verdict (mirrors file-check.schema.json) ----

export type CheckStatus = 'ready' | 'needs_input' | 'blocked';

export type GwasRole =
  | 'genotype'
  | 'genotype_bim'
  | 'genotype_fam'
  | 'phenotype'
  | 'covariate'
  | 'unknown';

export interface RoleAssignment {
  file_id: string;
  file_name: string;
  assigned_role: GwasRole;
  confidence: number;
  reason: string;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueCategory = 'inputs' | 'appropriateness';

export interface CheckIssue {
  severity: IssueSeverity;
  category?: IssueCategory;
  code: string;
  message: string;
  suggestion?: string;
}

export type AppropriatenessVerdict =
  | 'appropriate'
  | 'questionable'
  | 'inappropriate'
  | 'unknown';

export interface Appropriateness {
  verdict: AppropriatenessVerdict;
  rationale: string;
}

export interface CheckQuestion {
  id: string;
  question: string;
  applies_to_role?: string;
  options?: string[];
}

export interface ResolvedContext {
  inputs: {
    genotype: { id: string; kind: 'vcf' | 'plink' };
    genotype_bim?: { id: string };
    genotype_fam?: { id: string };
    phenotype: { id: string };
    covariate?: { id: string };
  };
  output_parent_id?: string | null;
  params?: UserParams & Record<string, unknown>;
}

export interface FileCheckResult {
  status: CheckStatus;
  summary: string;
  appropriateness: Appropriateness;
  resolved_context: ResolvedContext | null;
  roles: RoleAssignment[];
  issues: CheckIssue[];
  questions: CheckQuestion[];
  unused_files: string[];
}

export interface SubmitResult {
  job_id: string;
  batchJobId?: string;
}

export interface SessionUser {
  id: string;
  synapseId: number;
  username: string;
}

export const STATUS_META: Record<
  CheckStatus,
  { label: string; color: string; bg: string }
> = {
  ready:       { label: 'Ready to run',   color: '#1d7a4f', bg: '#e1f1e8' },
  needs_input: { label: 'Needs input',    color: '#c4720c', bg: '#f6ecdc' },
  blocked:     { label: 'Blocked',        color: '#b0341d', bg: '#f6e2dd' },
};

export const SEVERITY_META: Record<
  IssueSeverity,
  { color: string; bg: string }
> = {
  error:   { color: '#b0341d', bg: '#f6e2dd' },
  warning: { color: '#c4720c', bg: '#f6ecdc' },
  info:    { color: '#125e81', bg: '#e8f3f9' },
};

export const APPROPRIATENESS_META: Record<
  AppropriatenessVerdict,
  { label: string; color: string; bg: string }
> = {
  appropriate:   { label: 'Appropriate',   color: '#1d7a4f', bg: '#e1f1e8' },
  questionable:  { label: 'Questionable',  color: '#c4720c', bg: '#f6ecdc' },
  inappropriate: { label: 'Not appropriate', color: '#b0341d', bg: '#f6e2dd' },
  unknown:       { label: 'Undetermined',  color: '#54585f', bg: '#f1f1ec' },
};
