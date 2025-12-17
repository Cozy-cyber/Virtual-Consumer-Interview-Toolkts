export enum AppStep {
  SETUP = 'SETUP',
  CLARIFYING = 'CLARIFYING',
  RESEARCHING = 'RESEARCHING',
  PREVIEW = 'PREVIEW',
  GUIDE_INPUT = 'GUIDE_INPUT', // Step 1: Input objectives
  GUIDE_REVIEW = 'GUIDE_REVIEW', // Step 1: Review generated guide
  MODE_SELECTION = 'MODE_SELECTION', // Step 2: Choose who interviews
  INTERVIEW = 'INTERVIEW',
  SUMMARY = 'SUMMARY'
}

export enum InterviewMode {
  MANUAL = 'MANUAL', // User interviews
  AUTO = 'AUTO' // AI interviews, user observes
}

export interface ReferenceMaterial {
  id: string;
  type: 'text' | 'file';
  name: string;
  content: string; // Text content or Base64 string for files
  mimeType?: string; // e.g. 'application/pdf'
}

export interface ResearchConfig {
  industry: string;
  targetAudience: string;
  clarifications?: string[];
  objectives?: string; // What user wants to learn
  userQuestions?: string; // Specific questions user has
  referenceMaterials?: ReferenceMaterial[]; // New: Context data
}

export interface ClarifyingQuestion {
  question: string;
  options: string[];
}

export interface PersonaDimensionScores {
  demographics: number; // 人口统计学
  psychographics: number; // 心理特征
  behaviors: number; // 行为特征
  needs: number; // 需求与痛点
}

export interface PersonaProfile {
  rawMarkdown: string; 
  name: string; 
  summary: string;
  imageUrl?: string; // Base64 string of the generated pixel art
  scores?: PersonaDimensionScores;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isAiInterviewer?: boolean; // To distinguish visual style in UI
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface InterviewSummary {
  keyInsights: string;
  painPoints: string;
  wantsNeeds: string;
  verdict: string;
}