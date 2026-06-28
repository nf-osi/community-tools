// Agent gallery registry. Add a new agent by appending an entry here.
import type { LucideIcon } from 'lucide-react';
import { Dna, FileSearch, Tags, BarChart3, Microscope } from 'lucide-react';

export type AgentStatus = 'available' | 'coming_soon';

export interface AgentMeta {
  id: string;
  name: string;
  blurb: string;          // one-line gallery card text
  tags: string[];
  icon: LucideIcon;
  accent: string;         // hex used for the card icon chip
  status: AgentStatus;
  route?: string;         // present when status === 'available'
}

export const AGENTS: AgentMeta[] = [
  {
    id: 'gwas',
    name: 'GWAS Agent',
    blurb: 'Run a genome-wide association study from genotype + phenotype files, with QC, PCA, and Manhattan/QQ plots written back to Synapse.',
    tags: ['Genomics', 'PLINK2', 'Association'],
    icon: Dna,
    accent: '#0d6e62',
    status: 'available',
    route: '/agents/gwas',
  },
  {
    id: 'variant-interpretation',
    name: 'Variant Interpretation',
    blurb: 'Annotate and prioritize variants from a VCF with ClinVar/COSMIC evidence and an NF driver-gene panel.',
    tags: ['Genomics', 'VCF', 'Annotation'],
    icon: FileSearch,
    accent: '#2c6fb0',
    status: 'coming_soon',
  },
  {
    id: 'metadata-assist',
    name: 'Metadata Assist',
    blurb: 'Auto-annotate Synapse files to NF-OSI standards by extracting metadata from protocols and manuscripts you upload alongside the data.',
    tags: ['Curation', 'Annotations', 'Extraction'],
    icon: Tags,
    accent: '#c4720c',
    status: 'coming_soon',
  },
  {
    id: 'rnaseq-de',
    name: 'RNA-seq Differential Expression',
    blurb: 'Compare two cohorts with DESeq2 + pathway enrichment and a written interpretation.',
    tags: ['Transcriptomics', 'DESeq2', 'GSEA'],
    icon: BarChart3,
    accent: '#7b3df0',
    status: 'coming_soon',
  },
  {
    id: 'immune-deconvolution',
    name: 'Immune Deconvolution',
    blurb: 'Estimate immune/cell-type composition from bulk RNA-seq across NF tumor types.',
    tags: ['Transcriptomics', 'Deconvolution'],
    icon: Microscope,
    accent: '#c0397e',
    status: 'coming_soon',
  },
];
