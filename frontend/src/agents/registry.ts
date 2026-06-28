// Agent gallery registry. Add a new agent by appending an entry here.
import type { LucideIcon } from 'lucide-react';
import { Dna, FileSearch, Tags, Network } from 'lucide-react';

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
    id: 'knowledge-graph',
    name: 'Knowledge & Discourse Graph',
    blurb: 'Build a knowledge graph of entities and relationships from a file, plus a discourse graph of questions, claims, and evidence — written back to Synapse.',
    tags: ['Knowledge Graph', 'Discourse', 'Extraction'],
    icon: Network,
    accent: '#7b3df0',
    status: 'coming_soon',
  },
];
