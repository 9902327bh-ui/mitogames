export type SummaryLength = 'short' | 'standard' | 'detailed';

export interface TranscriptHighlight {
  timestamp: string;
  point: string;
}

export interface VideoMetadata {
  videoId: string;
  canonicalUrl: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
}

export type VesselType =
  | 'beaker'
  | 'flask'
  | 'test_tube'
  | 'dropper_bottle'
  | 'dish';

export type LabActionType = 'pour' | 'drop' | 'stir' | 'heat';

export type ReactionEffect =
  | 'none'
  | 'fizz'
  | 'color_change'
  | 'foam_eruption'
  | 'precipitate'
  | 'heat_glow'
  | 'steam';

export interface LabChemical {
  id: string;
  name: string;
  formula: string;
  vesselType: VesselType;
  role: 'reagent' | 'workspace';
  initialColor: string;
  initialFillLevel: number; // 0..1
  state: 'liquid' | 'powder' | 'empty';
}

export interface LabStep {
  stepNumber: number;
  instruction: string;
  action: LabActionType;
  sourceId: string;
  targetId: string;
  amountLabel: string;
  resultingColor: string;
  fillDelta: number; // 0..0.5
  temperatureC: number;
  ph: number;
  massDeltaGrams: number;
  effect: ReactionEffect;
  scienceNote: string;
  hint: string;
}

export type SceneKind = 'reaction' | 'electro';

export type ElectroComponentKind =
  | 'battery'
  | 'cell_beaker'
  | 'electrode'
  | 'wire'
  | 'bulb'
  | 'switch'
  | 'voltmeter'
  | 'ammeter'
  | 'resistor'
  | 'salt_bridge'
  | 'electrolyte'
  | 'power_supply'
  | 'lemon'
  | 'coin'
  | 'nail'
  | 'container';

export type ElectroPolarity = 'anode' | 'cathode' | 'positive' | 'negative';

export type ElectroAction =
  | 'place'
  | 'connect'
  | 'pour_electrolyte'
  | 'close_switch'
  | 'open_switch'
  | 'observe'
  | 'measure';

export type ElectroEffect =
  | 'none'
  | 'electron_flow'
  | 'ion_migration'
  | 'bubbles_cathode'
  | 'bubbles_anode'
  | 'plating'
  | 'dissolving'
  | 'bulb_on'
  | 'bulb_off'
  | 'voltage_reading'
  | 'gas_collect'
  | 'color_change';

export interface HalfReaction {
  at: 'anode' | 'cathode';
  equation: string;
  type: 'oxidation' | 'reduction';
}

export interface ElectroComponent {
  id: string;
  name: string;
  formula?: string;
  kind: ElectroComponentKind;
  color: string;
  polarity?: ElectroPolarity;
  material?: string;
  label: string;
}

export interface ElectroStep {
  stepNumber: number;
  instruction: string;
  action: ElectroAction;
  sourceId: string;
  targetId: string;
  effect: ElectroEffect;
  voltage?: number;
  currentA?: number;
  resultingColor?: string;
  scienceNote: string;
  hint: string;
}

export interface QuizQuestion {
  id: string;
  kind?: 'mcq' | 'fill_blank' | 'flashcard' | 'electron_flow';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  blankAnswer?: string;
  blankChips?: string[];
  flashcardFront?: string;
  flashcardBack?: string;
}

export interface LabExperiment {
  isChemistry: boolean;
  rejectionReason?: string;
  experimentTitle: string;
  slug?: string;
  level?: number;
  difficulty: 'Beginner' | 'Intermediate';
  conceptSummary: string;
  safetyTip: string;
  vessels: LabChemical[];
  steps: LabStep[];
  quiz?: QuizQuestion[];
}

export interface ElectroExperiment {
  isScience: boolean;
  rejectionReason?: string;
  experimentTitle: string;
  slug?: string;
  level?: number;
  difficulty: 'Beginner' | 'Intermediate';
  cellType?: 'galvanic' | 'electrolytic' | 'circuit';
  conceptSummary: string;
  safetyTip: string;
  components: ElectroComponent[];
  steps: ElectroStep[];
  halfReactions: HalfReaction[];
  quiz?: QuizQuestion[];
}

export interface SummaryResult {
  id: string;
  createdAt: string;
  length: SummaryLength;
  video: VideoMetadata;
  summary: string;
  keyPoints: string[];
  transcriptHighlights: TranscriptHighlight[];
  topics: string[];
  spokenLanguage: string;
  isChemistry: boolean;
  sceneKind?: SceneKind;
  rejectionReason?: string;
  experiment?: LabExperiment;
  electroExperiment?: ElectroExperiment;
}

export interface StudentProfile {
  email: string;
  age: number;
  classLevel: string;
}

export interface ReadyMadeExperiment {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  minClass: number;
  maxClass: number;
  classBadge: string;
  accentColor: string;
  sceneKind?: SceneKind;
  result: SummaryResult;
}

export interface SummarizeRequest {
  url: string;
  length: SummaryLength;
  studentAge?: number;
  studentClass?: string;
}

export interface SummarizeApiResponse {
  result?: SummaryResult;
  error?: string;
}
