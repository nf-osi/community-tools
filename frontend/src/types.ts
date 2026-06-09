export interface User {
  id: string;
  username: string;
}

export type IdeaType = 'Infrastructure' | 'New Data';

export const IDEA_TYPE_BADGE: Record<IdeaType, string> = {
  'Infrastructure': 'bg-blue-50 text-blue-700',
  'New Data':       'bg-emerald-50 text-emerald-700',
};

export const IDEA_TYPES: IdeaType[] = ['Infrastructure', 'New Data'];

export type Status =
  | 'Proposed'
  | 'Under Consideration'
  | 'In Progress'
  | 'Completed'
  | "Won't Pursue";

export type Priority = 'Low' | 'Medium' | 'High';

export type FocusArea =
  | 'Data Contribution'
  | 'Data Discovery'
  | 'Data Access & Governance'
  | 'Analytical Capabilities'
  | 'Community & Sustainability'
  | 'Other';

export interface Idea {
  id: string;
  title: string;
  summary: string;
  submitter: string;
  priority: Priority;
  status: Status;
  votes: number;
  voters: string[];
  communitySubmitted: boolean;
  ideaType?: IdeaType;
  focusArea?: FocusArea;
  grantTag?: string;
  affectedUserType?: string;
  suggestedFunding?: string;
  targetDate?: string;
  completedDate?: string;
  threadId?: string;
}

export interface IdeaFormData {
  title: string;
  summary: string;
  submitter?: string;
  priority: Priority;
  ideaType: IdeaType;
  focusArea?: FocusArea;
  affectedUserType?: string;
  grantTag?: string;
  suggestedFunding?: string;
}

export const STATUS_COLORS: Record<Status, string> = {
  'Proposed': 'bg-slate-100 text-slate-700',
  'Under Consideration': 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
  "Won't Pursue": 'bg-red-100 text-red-600',
};

export const FOCUS_AREA_COLORS: Record<FocusArea, string> = {
  'Data Contribution':        'bg-blue-50 text-blue-700',
  'Data Discovery':           'bg-indigo-50 text-indigo-700',
  'Data Access & Governance': 'bg-teal-50 text-teal-700',
  'Analytical Capabilities':  'bg-purple-50 text-purple-700',
  'Community & Sustainability':'bg-orange-50 text-orange-700',
  'Other':                    'bg-gray-100 text-gray-600',
};

export const ALL_STATUSES: Status[] = [
  'Proposed',
  'Under Consideration',
  'In Progress',
  'Completed',
  "Won't Pursue",
];

export const FOCUS_AREAS: FocusArea[] = [
  'Data Contribution',
  'Data Discovery',
  'Data Access & Governance',
  'Analytical Capabilities',
  'Community & Sustainability',
  'Other',
];

export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];
