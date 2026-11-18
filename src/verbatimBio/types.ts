import type {
  AnatomySystem,
  BioTopic,
  ChallengeKind,
  Difficulty,
  ItemKind,
  MiniDiagramKind,
  QuizKind,
  SceneKind,
  SpecimenPreset,
  StepAction,
  StepEffect,
  SummaryLength,
} from './constants/bioEnums.ts';

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface StudentProfile {
  email: string;
  age: number;
  classLevel: number;
  gamePoints: number;
  quizPoints: number;
  xp: number;
  streak: number;
  bestStreak: number;
  badges: string[];
  completedMissions: string[];
  collectedTerms: KeyTerm[];
  teacherUnlockAll?: boolean;
}

export interface LabItem {
  id: string;
  name: string;
  kind: ItemKind;
  color: string;
  label: string;
  scientificName?: string;
}

export interface StepMeasurement {
  label: string;
  value: number;
  unit: string;
}

export interface ReadoutBox {
  label: string;
  value: string;
}

export interface ControlPanelValues {
  light: number;
  co2: number;
  temp: number;
  label?: string;
}

export interface LabStep {
  stepNumber: number;
  instruction: string;
  action: StepAction;
  sourceId: string;
  targetId: string;
  effect: StepEffect;
  measurement: StepMeasurement;
  whatHappened: string;
  whyItHappens: string;
  realLife: string;
  keyTerm: KeyTerm;
  miniDiagram: MiniDiagramKind;
  scienceNote: string;
  hint: string;
  readouts?: ReadoutBox[];
  controlValues?: ControlPanelValues;
}

export interface LabChallenge {
  id: string;
  kind: ChallengeKind;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  afterStep?: number;
}

export interface LabObservation {
  what: string;
  why: string;
}

export interface QuizQuestion {
  id: string;
  kind: QuizKind;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sentenceWithBlank?: string;
  blankAnswer?: string;
  wordChips?: string[];
  frontPrompt?: string;
  backAnswer?: string;
  diagramTitle?: string;
  structureHint?: string;
}

export interface BioExperiment {
  isBiology: boolean;
  rejectionReason?: string;
  sceneKind: SceneKind;
  specimenPreset?: SpecimenPreset;
  anatomySystem?: AnatomySystem;
  experimentTitle: string;
  slug: string;
  level: string;
  difficulty: Difficulty;
  classRange: string;
  topic: BioTopic;
  storyHook: string;
  conceptSummary: string;
  safetyTip: string;
  items: LabItem[];
  steps: LabStep[];
  challenges: LabChallenge[];
  observations: LabObservation[];
  keyTerms: KeyTerm[];
  quiz: QuizQuestion[];
}

export interface ReadyMadeExperimentMeta {
  id: string;
  minClass: number;
  maxClass: number;
  classBadge: string;
  accentColor: string;
  durationMinutes: number;
  experiment: BioExperiment;
}

export interface VideoMeta {
  videoId: string;
  url: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
}

export interface TimestampHighlight {
  time: string;
  title: string;
  detail: string;
}

export interface SummaryData {
  overview: string;
  keyPoints: string[];
  topics: string[];
  highlights: TimestampHighlight[];
}

export interface LabSessionRecord {
  id: string;
  videoMeta?: VideoMeta;
  summary?: SummaryData;
  rawSummaryText?: string;
  experiment: BioExperiment;
  completedAt: string;
  source: 'youtube' | 'ready_made';
  summaryLength?: SummaryLength;
  starsEarned?: number;
}

export interface LabCompletionResult {
  accuracyPct: number;
  rightClicks: number;
  wrongClicks: number;
  labPointsAwarded: number;
  stars: number;
  newlyUnlockedBadges: string[];
  collectedTerms: KeyTerm[];
}
