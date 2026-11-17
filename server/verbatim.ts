import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, MediaResolution, ThinkingLevel, Type } from '@google/genai';
import type {
  ElectroAction,
  ElectroComponent,
  ElectroComponentKind,
  ElectroEffect,
  ElectroExperiment,
  ElectroPolarity,
  ElectroStep,
  HalfReaction,
  LabActionType,
  LabChemical,
  LabExperiment,
  LabStep,
  QuizQuestion,
  ReactionEffect,
  SceneKind,
  SummaryLength,
  SummaryResult,
  VesselType,
  VideoMetadata,
} from '../src/verbatim/types.ts';
import { parseStructuredPlainText } from '../src/verbatim/utils/parseStreamSummary.ts';
import { READY_MADE_EXPERIMENTS } from './readyMadeExperiments.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.VERBATIM_API_PORT || 3000);
const EXPERIMENTS_STORAGE_DIR = path.resolve(__dirname, '..', 'storage', 'experiments');

const VALID_VESSELS: VesselType[] = [
  'beaker',
  'flask',
  'test_tube',
  'dropper_bottle',
  'dish',
];
const VALID_ACTIONS: LabActionType[] = ['pour', 'drop', 'stir', 'heat'];
const VALID_EFFECTS: ReactionEffect[] = [
  'none',
  'fizz',
  'color_change',
  'foam_eruption',
  'precipitate',
  'heat_glow',
  'steam',
];

const VALID_ELECTRO_KINDS: ElectroComponentKind[] = [
  'battery',
  'cell_beaker',
  'electrode',
  'wire',
  'bulb',
  'switch',
  'voltmeter',
  'ammeter',
  'resistor',
  'salt_bridge',
  'electrolyte',
  'power_supply',
  'lemon',
  'coin',
  'nail',
  'container',
];

const VALID_ELECTRO_ACTIONS: ElectroAction[] = [
  'place',
  'connect',
  'pour_electrolyte',
  'close_switch',
  'open_switch',
  'observe',
  'measure',
];

const VALID_ELECTRO_EFFECTS: ElectroEffect[] = [
  'none',
  'electron_flow',
  'ion_migration',
  'bubbles_cathode',
  'bubbles_anode',
  'plating',
  'dissolving',
  'bulb_on',
  'bulb_off',
  'voltage_reading',
  'gas_collect',
  'color_change',
];

function extractYouTubeVideoId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    const vParam = parsed.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (
      segments.length >= 2 &&
      ['shorts', 'live', 'embed', 'v'].includes(segments[0]) &&
      /^[a-zA-Z0-9_-]{11}$/.test(segments[1])
    ) {
      return segments[1];
    }
  }

  return null;
}

async function fetchYouTubeMetadata(videoId: string): Promise<VideoMetadata> {
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const fallback: VideoMetadata = {
    videoId,
    canonicalUrl,
    title: 'YouTube Video',
    authorName: 'YouTube Channel',
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    return {
      videoId,
      canonicalUrl,
      title: data.title?.trim() || fallback.title,
      authorName: data.author_name?.trim() || fallback.authorName,
      thumbnailUrl: data.thumbnail_url?.trim() || fallback.thumbnailUrl,
    };
  } catch {
    return fallback;
  }
}

function buildLengthGuidance(length: SummaryLength): string {
  switch (length) {
    case 'short':
      return 'Summary length: 2 to 3 crisp sentences (~50 words). Include 3 key points and 3 timestamp highlights.';
    case 'detailed':
      return 'Summary length: 2 to 3 clear paragraphs (~170 words) detailing chemicals, quantities/order, and reaction steps. Include 5 key points and 5 timestamp highlights.';
    case 'standard':
    default:
      return 'Summary length: 1 to 2 tight paragraphs (~100 words) explaining the chemicals used, procedure steps, and chemical reaction. Include 4 key points and 4 timestamp highlights.';
  }
}

function buildTranscriptPrompt(metadata: VideoMetadata, length: SummaryLength): string {
  return [
    `Listen to the spoken content of this YouTube video ("${metadata.title}" by ${metadata.authorName}).`,
    `First, classify the video strictly into ONE category:`,
    `- ELECTRO: electricity, batteries, galvanic/voltaic cells, Daniell cells, electrolysis, electroplating, simple electrical circuits, bulbs/switches, anode/cathode, salt bridge, lemon battery, conductors vs insulators, or voltmeter/ammeter demonstrations.`,
    `- REACTION: chemical reactions, acids & bases, precipitations, combustion, displacement, catalysts, solutions, indicators, or stoichiometry demonstrations.`,
    `- NOT_SCIENCE: music, gaming, coding, vlogs, biology-only, or general chat.`,
    `If REACTION or ELECTRO, write a clean plain-text transcription summary focused strictly on the apparatus, chemicals/components, step-by-step procedure, and science actually mentioned or shown in the video.`,
    buildLengthGuidance(length),
    `Follow this exact plain-text template with zero Markdown formatting (no **, no ##, no backticks):`,
    `CATEGORY: <REACTION or ELECTRO or NOT_SCIENCE>`,
    `IS_CHEMISTRY: <YES if REACTION or ELECTRO, NO if NOT_SCIENCE>`,
    `REJECTION_REASON: <if NOT_SCIENCE, one brief polite sentence explaining what the video is actually about and that only chemistry & electricity science videos work; otherwise write NONE>`,
    `LANGUAGE: <spoken language>`,
    `TOPICS: <2 to 4 short topic words separated by commas>`,
    ``,
    `SUMMARY:`,
    `<concise plain-text summary>`,
    ``,
    `KEY POINTS:`,
    `- <point 1>`,
    `- <point 2>`,
    ``,
    `HIGHLIGHTS:`,
    `[MM:SS] <spoken moment>`,
    `[MM:SS] <spoken moment>`,
  ].join('\n');
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);

  if (
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('403')
  ) {
    return {
      status: 403,
      message:
        'Gemini API key is invalid or lacks permission. Check your API key in Settings > Secrets.',
    };
  }

  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    return {
      status: 429,
      message:
        'Rate limit or quota reached. Please wait a moment and try again, or verify your billing tier in Settings > Secrets.',
    };
  }

  if (
    rawMessage.includes('400') ||
    rawMessage.includes('INVALID_ARGUMENT') ||
    rawMessage.includes('unable to process') ||
    rawMessage.includes('private') ||
    rawMessage.includes('unavailable')
  ) {
    return {
      status: 400,
      message:
        'Unable to access or process this YouTube video. Make sure the video is public, has audio/speech, and is not age- or region-restricted.',
    };
  }

  return {
    status: 500,
    message:
      rawMessage || 'An unexpected error occurred while processing the video.',
  };
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildTranscriptParams(metadata: VideoMetadata, length: SummaryLength) {
  return {
    model: 'gemini-3.1-flash-lite',
    contents: [
      {
        fileData: {
          fileUri: metadata.canonicalUrl,
        },
        videoMetadata: {
          fps: 0.05,
        },
      },
      {
        text: buildTranscriptPrompt(metadata, length),
      },
    ],
    config: {
      systemInstruction:
        'You are a chemistry & electrochemistry educator and transcription analyst. Classify every video strictly as CATEGORY: ELECTRO, REACTION, or NOT_SCIENCE. Produce clean plain text without Markdown symbols capturing only apparatus, chemicals/components, and steps shown or spoken in the video.',
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MINIMAL,
      },
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
    },
  };
}

function sanitizeHexColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (trimmed === 'transparent') return 'transparent';
  return fallback;
}

function toSubscriptFormula(raw: string | undefined): string {
  if (!raw) return '';
  const map: Record<string, string> = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
  };
  return raw
    .trim()
    .replace(/([A-Za-z)\]])([0-9]+)/g, (_m, prefix: string, digits: string) => {
      const sub = digits
        .split('')
        .map((d) => map[d] ?? d)
        .join('');
      return `${prefix}${sub}`;
    });
}

function toSlug(title: string): string {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return clean || 'chemistry-experiment';
}

function clampFill01(val: unknown, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  // Normalize gracefully if a value looks like 0..100
  const scaled = num > 1.05 ? num / 100 : num;
  return Math.max(0, Math.min(1, Math.round(scaled * 100) / 100));
}

function clampFillDelta(val: unknown, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  const scaled = num > 0.5 ? num / 100 : num;
  return Math.max(0, Math.min(0.5, Math.round(scaled * 100) / 100));
}

function validateRawExperiment(raw: Partial<LabExperiment>): string[] {
  const errors: string[] = [];

  if (raw.isChemistry === false) {
    return [];
  }

  if (!Array.isArray(raw.vessels) || raw.vessels.length < 2) {
    errors.push('vessels must have at least 2 items');
  }

  const vesselIds = new Set<string>();
  for (const v of raw.vessels ?? []) {
    if (!v.id || typeof v.id !== 'string') {
      errors.push('every vessel must have a non-empty string id');
    } else {
      vesselIds.add(v.id.trim());
    }
    if (!VALID_VESSELS.includes(v.vesselType)) {
      errors.push(`invalid vesselType "${String(v.vesselType)}" on "${v.id}"`);
    }
    if (!['liquid', 'powder', 'empty'].includes(v.state)) {
      errors.push(`invalid state "${String(v.state)}" on "${v.id}"`);
    }
    const fill = Number(v.initialFillLevel);
    if (!Number.isFinite(fill) || fill < 0 || fill > 1) {
      errors.push(`initialFillLevel on "${v.id}" must be between 0 and 1`);
    }
  }

  if (!Array.isArray(raw.steps) || raw.steps.length < 3 || raw.steps.length > 7) {
    errors.push(`steps length must be 3..7 (received ${raw.steps?.length ?? 0})`);
  }

  for (const s of raw.steps ?? []) {
    if (!VALID_ACTIONS.includes(s.action)) {
      errors.push(`invalid step action "${String(s.action)}" at step ${s.stepNumber}`);
    }
    if (!VALID_EFFECTS.includes(s.effect)) {
      errors.push(`invalid step effect "${String(s.effect)}" at step ${s.stepNumber}`);
    }
    if (!s.sourceId || !vesselIds.has(s.sourceId.trim())) {
      errors.push(`step ${s.stepNumber} sourceId "${s.sourceId}" does not exist in vessels`);
    }
    if (!s.targetId || !vesselIds.has(s.targetId.trim())) {
      errors.push(`step ${s.stepNumber} targetId "${s.targetId}" does not exist in vessels`);
    }
    if ((s.action === 'pour' || s.action === 'drop') && s.sourceId === s.targetId) {
      errors.push(`step ${s.stepNumber} action "${s.action}" cannot use same sourceId and targetId`);
    }
    const delta = Number(s.fillDelta);
    if (!Number.isFinite(delta) || delta < 0 || delta > 0.5) {
      errors.push(`step ${s.stepNumber} fillDelta must be between 0 and 0.5`);
    }
  }

  return errors;
}

function buildFallbackQuiz(exp: LabExperiment): QuizQuestion[] {
  const reagents = exp.vessels.filter((v) => v.role === 'reagent' || v.state !== 'empty');
  const firstVessel = reagents[0];
  const firstStep = exp.steps[0];
  const notes = exp.steps.map((s) => s.scienceNote).filter(Boolean);

  const questions: QuizQuestion[] = [];
  if (firstVessel) {
    questions.push({
      id: 'quiz-1',
      question: `What is the chemical formula of ${firstVessel.name} used in "${exp.experimentTitle}"?`,
      options: [
        firstVessel.formula || 'H₂O',
        'He₂',
        'AuCl₃',
        'KrF₄',
      ].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 4),
      correctIndex: 0,
      explanation: `${firstVessel.name} is represented chemically as ${firstVessel.formula || firstVessel.name}.`,
    });
  }
  if (firstStep) {
    questions.push({
      id: 'quiz-2',
      question: `During "${firstStep.instruction}", why does this step matter scientifically?`,
      options: [
        notes[0] || firstStep.scienceNote,
        'It lowers gravity inside the laboratory glassware.',
        'It freezes the glass bench to absolute zero.',
        'It converts glass into plastic.',
      ],
      correctIndex: 0,
      explanation: notes[0] || firstStep.scienceNote,
    });
  }
  questions.push({
    id: 'quiz-3',
    question: 'Why must you put on safety gloves before touching vessels in the chemistry lab?',
    options: [
      'To make the glassware float',
      exp.safetyTip || 'To protect skin from reactive chemicals and prevent contamination.',
      'To change the pH meter reading',
      'To cool down the hot plate faster',
    ],
    correctIndex: 1,
    explanation: exp.safetyTip || 'Gloves protect your hands from chemical irritation and prevent sample contamination.',
  });
  return questions;
}

function normalizeQuiz(rawQuiz: Partial<QuizQuestion>[] | undefined, exp: LabExperiment): QuizQuestion[] {
  if (!Array.isArray(rawQuiz) || rawQuiz.length === 0) {
    return buildFallbackQuiz(exp);
  }
  const clean = rawQuiz
    .filter((q) => q.question && Array.isArray(q.options) && q.options.length >= 2)
    .slice(0, 5)
    .map((q, idx) => {
      const options = (q.options ?? []).map((o) => String(o).trim()).filter(Boolean).slice(0, 4);
      const correctIdx =
        typeof q.correctIndex === 'number' &&
        q.correctIndex >= 0 &&
        q.correctIndex < options.length
          ? q.correctIndex
          : 0;
      return {
        id: q.id?.trim() || `quiz-${idx + 1}`,
        question: q.question!.trim(),
        options,
        correctIndex: correctIdx,
        explanation:
          q.explanation?.trim() || 'Review the step science notes to reinforce this chemistry concept.',
      };
    });
  return clean.length >= 2 ? clean : buildFallbackQuiz(exp);
}

function normalizeLabExperiment(raw: Partial<LabExperiment>): LabExperiment {
  const rawVessels: LabChemical[] = (raw.vessels ?? []).map((v, idx) => {
    const vesselType: VesselType = VALID_VESSELS.includes(v.vesselType)
      ? v.vesselType
      : 'beaker';
    const role: 'reagent' | 'workspace' =
      v.role === 'workspace' ? 'workspace' : 'reagent';
    const state: 'liquid' | 'powder' | 'empty' =
      v.state === 'powder' || v.state === 'empty' || v.state === 'liquid'
        ? v.state
        : role === 'workspace'
          ? 'empty'
          : 'liquid';
    const initialFillLevel =
      state === 'empty' ? 0 : clampFill01(v.initialFillLevel, 0.72);
    return {
      id: v.id?.trim() || `vessel_${idx + 1}`,
      name: v.name?.trim() || `Chemical ${idx + 1}`,
      formula: toSubscriptFormula(v.formula) || '',
      vesselType,
      role,
      initialColor:
        state === 'empty'
          ? sanitizeHexColor(v.initialColor, 'transparent')
          : sanitizeHexColor(v.initialColor, '#38BDF8'),
      initialFillLevel,
      state,
    };
  });

  // Promote an empty vessel to workspace if Gemini omitted role:"workspace", and only add a fallback if none exist
  let hasWorkspace = rawVessels.some((v) => v.role === 'workspace');
  if (!hasWorkspace) {
    const emptyIdx = rawVessels.findIndex((v) => v.state === 'empty' || v.initialFillLevel === 0);
    if (emptyIdx !== -1) {
      rawVessels[emptyIdx] = { ...rawVessels[emptyIdx], role: 'workspace' };
      hasWorkspace = true;
    }
  }
  if (!hasWorkspace && rawVessels.length < 2) {
    rawVessels.push({
      id: 'reaction_flask',
      name: 'Reaction Flask',
      formula: 'Mix',
      vesselType: 'flask',
      role: 'workspace',
      initialColor: 'transparent',
      initialFillLevel: 0,
      state: 'empty',
    });
  }

  const vessels = rawVessels.slice(0, 6);
  const vesselIds = new Set(vessels.map((v) => v.id));
  const fallbackTarget = vessels.find((v) => v.role === 'workspace') ?? vessels[vessels.length - 1];
  const fallbackReagent = vessels.find((v) => v.id !== fallbackTarget.id) ?? vessels[0];

  const rawSteps = (raw.steps ?? []).slice(0, 7);
  const steps: LabStep[] = rawSteps.map((s, idx) => {
    const action: LabActionType = VALID_ACTIONS.includes(s.action)
      ? s.action
      : 'pour';

    let targetId =
      s.targetId && vesselIds.has(s.targetId.trim())
        ? s.targetId.trim()
        : fallbackTarget.id;

    let sourceId =
      s.sourceId && vesselIds.has(s.sourceId.trim())
        ? s.sourceId.trim()
        : fallbackReagent.id;

    if (action === 'stir' || action === 'heat') {
      sourceId = targetId;
    } else if (sourceId === targetId) {
      const other = vessels.find((v) => v.id !== targetId);
      if (other) {
        sourceId = other.id;
      }
    }

    const tempVal = Number(s.temperatureC);
    const phVal = Number(s.ph);
    const massVal = Number(s.massDeltaGrams);

    return {
      stepNumber: idx + 1,
      instruction: s.instruction?.trim() || `Perform step ${idx + 1}.`,
      action,
      sourceId,
      targetId,
      amountLabel:
        s.amountLabel?.trim() ||
        (action === 'drop'
          ? '5 drops'
          : action === 'stir'
            ? 'Stir 5s'
            : action === 'heat'
              ? '75 °C'
              : '30 mL'),
      resultingColor: sanitizeHexColor(s.resultingColor, '#0EA5E9'),
      fillDelta:
        action === 'stir' || action === 'heat'
          ? 0
          : clampFillDelta(s.fillDelta, action === 'drop' ? 0.12 : 0.28),
      temperatureC: Number.isFinite(tempVal)
        ? Math.max(0, Math.min(120, Math.round(tempVal * 10) / 10))
        : action === 'heat'
          ? 75.0
          : 22.0,
      ph: Number.isFinite(phVal)
        ? Math.max(0.5, Math.min(14, Math.round(phVal * 10) / 10))
        : 7.0,
      massDeltaGrams:
        action === 'stir' || action === 'heat'
          ? 0
          : Number.isFinite(massVal)
            ? Math.max(1, Math.min(200, Math.round(massVal * 10) / 10))
            : 25,
      effect: VALID_EFFECTS.includes(s.effect) ? s.effect : 'color_change',
      scienceNote:
        s.scienceNote?.trim() ||
        'Combining these substances triggers a measurable chemical interaction.',
      hint:
        s.hint?.trim() ||
        (action === 'stir' || action === 'heat'
          ? `Click the ${vessels.find((v) => v.id === targetId)?.name ?? 'vessel'} to ${action} it.`
          : `Click ${vessels.find((v) => v.id === sourceId)?.name ?? 'the source'} first, then ${vessels.find((v) => v.id === targetId)?.name ?? 'the target'}.`),
    };
  });

  const baseExperiment: LabExperiment = {
    isChemistry: true,
    experimentTitle: raw.experimentTitle?.trim() || 'Chemistry Lab Experiment',
    slug: toSlug(raw.experimentTitle?.trim() || 'chemistry-experiment'),
    level: typeof raw.level === 'number' && raw.level >= 1 ? raw.level : 1,
    difficulty: raw.difficulty === 'Intermediate' ? 'Intermediate' : 'Beginner',
    conceptSummary:
      raw.conceptSummary?.trim() ||
      'Observe how the chemicals react step by step to create a measurable transformation.',
    safetyTip:
      raw.safetyTip?.trim() ||
      'Always wear nitrile gloves before touching laboratory reagents or glassware.',
    vessels,
    steps,
  };

  baseExperiment.quiz = normalizeQuiz(raw.quiz, baseExperiment);
  return baseExperiment;
}

async function applyExperimentAssetCache(experiment: LabExperiment): Promise<LabExperiment> {
  const slug = toSlug(experiment.experimentTitle);
  const filePath = path.join(EXPERIMENTS_STORAGE_DIR, `${slug}.json`);

  await fs.mkdir(EXPERIMENTS_STORAGE_DIR, { recursive: true });

  try {
    const existingRaw = await fs.readFile(filePath, 'utf-8');
    const cached = JSON.parse(existingRaw) as LabExperiment;
    const nextLevel = (typeof cached.level === 'number' ? cached.level : 1) + 1;

    // Reuse cached vessels/scene layout instead of regenerating from scratch
    const cachedVesselIds = new Set(cached.vessels.map((v) => v.id));
    const stepsCompatible = experiment.steps.every(
      (s) => cachedVesselIds.has(s.sourceId) && cachedVesselIds.has(s.targetId)
    );

    const updated: LabExperiment = {
      ...experiment,
      slug,
      level: nextLevel,
      difficulty: nextLevel >= 2 ? 'Intermediate' : experiment.difficulty,
      vessels: cached.vessels,
      steps: stepsCompatible ? experiment.steps : cached.steps,
      quiz: experiment.quiz?.length ? experiment.quiz : cached.quiz,
    };

    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch {
    const fresh: LabExperiment = {
      ...experiment,
      slug,
      level: 1,
    };
    await fs.writeFile(filePath, JSON.stringify(fresh, null, 2), 'utf-8');
    return fresh;
  }
}

const LAB_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isChemistry: { type: Type.BOOLEAN },
    rejectionReason: { type: Type.STRING },
    experimentTitle: { type: Type.STRING },
    difficulty: { type: Type.STRING },
    conceptSummary: { type: Type.STRING },
    safetyTip: { type: Type.STRING },
    vessels: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          formula: { type: Type.STRING },
          vesselType: { type: Type.STRING },
          role: { type: Type.STRING },
          initialColor: { type: Type.STRING },
          initialFillLevel: { type: Type.NUMBER },
          state: { type: Type.STRING },
        },
        required: [
          'id',
          'name',
          'formula',
          'vesselType',
          'role',
          'initialColor',
          'initialFillLevel',
          'state',
        ],
      },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          instruction: { type: Type.STRING },
          action: { type: Type.STRING },
          sourceId: { type: Type.STRING },
          targetId: { type: Type.STRING },
          amountLabel: { type: Type.STRING },
          resultingColor: { type: Type.STRING },
          fillDelta: { type: Type.NUMBER },
          temperatureC: { type: Type.NUMBER },
          ph: { type: Type.NUMBER },
          massDeltaGrams: { type: Type.NUMBER },
          effect: { type: Type.STRING },
          scienceNote: { type: Type.STRING },
          hint: { type: Type.STRING },
        },
        required: [
          'stepNumber',
          'instruction',
          'action',
          'sourceId',
          'targetId',
          'amountLabel',
          'resultingColor',
          'fillDelta',
          'temperatureC',
          'ph',
          'massDeltaGrams',
          'effect',
          'scienceNote',
          'hint',
        ],
      },
    },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
        required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: [
    'isChemistry',
    'experimentTitle',
    'difficulty',
    'conceptSummary',
    'safetyTip',
    'vessels',
    'steps',
    'quiz',
  ],
};

async function generateLabFromTranscript(
  ai: GoogleGenAI,
  title: string,
  summary: string,
  keyPoints: string[],
  highlights: Array<{ timestamp: string; point: string }>,
  studentAge = 13,
  studentClass = 'Class 8'
): Promise<LabExperiment> {
  const transcriptText = [
    `Experiment Video Title: ${title}`,
    `Summary: ${summary}`,
    `Key Points:\n${keyPoints.map((p) => `- ${p}`).join('\n')}`,
    highlights.length > 0
      ? `Highlights:\n${highlights.map((h) => `[${h.timestamp}] ${h.point}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const basePrompt = [
    `Convert this video transcription into a guided 3D virtual school chemistry lab JSON for a student (Age ${studentAge}, ${studentClass}).`,
    `STRICT RULES:`,
    `1. Use ONLY chemicals, apparatus, and actions that are actually mentioned or shown in the transcript. NEVER invent extra chemicals.`,
    `2. If the transcript is NOT chemistry (for example biology, physics without chemistry, general chat), set "isChemistry": false and provide a clear "rejectionReason".`,
    `3. Output 3 to 7 steps, in the EXACT order shown in the video, each demonstrating what the video does.`,
    `4. Allowed "vesselType" ONLY: "beaker", "flask", "test_tube", "dropper_bottle", "dish".`,
    `5. Allowed "action" ONLY: "pour", "drop", "stir", "heat".`,
    `6. Allowed "effect" ONLY: "none", "fizz", "color_change", "foam_eruption", "precipitate", "heat_glow", "steam".`,
    `7. Every vessel MUST have a short "name", correct chemical "formula" using Unicode subscript characters (like H₂O₂, NaHCO₃, CH₃COOH, CuSO₄), realistic hex "initialColor", realistic "initialFillLevel" strictly between 0 and 1 (0 for an empty reaction vessel, 0.55..0.85 for full reagent vessels), and "state" ("liquid", "powder", or "empty").`,
    `8. Every step MUST reference valid vessel IDs from "vessels" for "sourceId" and "targetId" (for "stir" and "heat", sourceId and targetId MUST be the same vessel id; for "pour" and "drop", sourceId and targetId MUST be different vessel ids).`,
    `9. "fillDelta" MUST be strictly between 0 and 0.5 (0 for "stir" and "heat"; e.g. 0.12..0.4 for "pour"/"drop").`,
    `10. Include realistic "resultingColor" (hex), "temperatureC", "ph" (0.5..14), "massDeltaGrams", a clear "hint" (e.g. "Click the flask first, then the beaker"), and a 1–2 sentence "scienceNote" pitched cleanly for Age ${studentAge} (${studentClass}).`,
    `11. Include "safetyTip" and a 2-sentence "conceptSummary".`,
    `12. Include 4 multiple-choice "quiz" questions testing the chemistry from these exact steps.`,
    ``,
    `TRANSCRIPTION:\n${transcriptText}`,
  ].join('\n');

  let lastValidationErrors: string[] = [];
  let lastRawParsed: Partial<LabExperiment> | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}\n\nPREVIOUS ATTEMPT FAILED VALIDATION WITH THESE ERRORS:\n- ${lastValidationErrors.join('\n- ')}\nFix every single validation error above while keeping the same strict rules.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ text: prompt }],
        config: {
          systemInstruction:
            'You design scientifically accurate 3D school chemistry lab simulations strictly grounded in the video transcript. Always return valid JSON matching the schema.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: LAB_RESPONSE_SCHEMA,
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as Partial<LabExperiment>;
      lastRawParsed = parsed;

      if (parsed.isChemistry === false) {
        return {
          isChemistry: false,
          rejectionReason:
            parsed.rejectionReason?.trim() ||
            'This video is not about chemistry. Please paste a chemistry experiment video.',
          experimentTitle: parsed.experimentTitle?.trim() || title,
          difficulty: 'Beginner',
          conceptSummary: '',
          safetyTip: '',
          vessels: [],
          steps: [],
        };
      }

      const errors = validateRawExperiment(parsed);
      if (errors.length === 0) {
        const normalized = normalizeLabExperiment(parsed);
        return applyExperimentAssetCache(normalized);
      }
      lastValidationErrors = errors;
    } catch (err) {
      lastValidationErrors = [err instanceof Error ? err.message : 'Invalid JSON output'];
    }
  }

  // Fallback after 1 retry if minor field normalization resolves it cleanly
  if (lastRawParsed && Array.isArray(lastRawParsed.vessels) && Array.isArray(lastRawParsed.steps)) {
    const normalized = normalizeLabExperiment(lastRawParsed);
    return applyExperimentAssetCache(normalized);
  }

  throw new Error(
    `Failed to build valid 3D lab simulation after retry: ${lastValidationErrors.join('; ')}`
  );
}

// =========================================================================
// ELECTROCHEMISTRY / ELECTRICITY 3D PIPELINE
// =========================================================================

function validateRawElectro(raw: Partial<ElectroExperiment>): string[] {
  const errors: string[] = [];
  if (raw.isScience === false) return [];

  if (!Array.isArray(raw.components) || raw.components.length < 2) {
    errors.push('components must have at least 2 items');
  }

  const ids = new Set<string>();
  for (const c of raw.components ?? []) {
    if (!c.id || typeof c.id !== 'string') {
      errors.push('every component must have a non-empty string id');
    } else {
      ids.add(c.id.trim());
    }
    if (!VALID_ELECTRO_KINDS.includes(c.kind)) {
      errors.push(`invalid component kind "${String(c.kind)}" on "${c.id}"`);
    }
  }

  if (!Array.isArray(raw.steps) || raw.steps.length < 3 || raw.steps.length > 8) {
    errors.push(`steps length must be 3..8 (received ${raw.steps?.length ?? 0})`);
  }

  for (const s of raw.steps ?? []) {
    if (!VALID_ELECTRO_ACTIONS.includes(s.action)) {
      errors.push(`invalid action "${String(s.action)}" at step ${s.stepNumber}`);
    }
    if (!VALID_ELECTRO_EFFECTS.includes(s.effect)) {
      errors.push(`invalid effect "${String(s.effect)}" at step ${s.stepNumber}`);
    }
    if (!s.sourceId || !ids.has(s.sourceId.trim())) {
      errors.push(`step ${s.stepNumber} sourceId "${s.sourceId}" missing from components`);
    }
    if (!s.targetId || !ids.has(s.targetId.trim())) {
      errors.push(`step ${s.stepNumber} targetId "${s.targetId}" missing from components`);
    }
  }

  if (!Array.isArray(raw.halfReactions) || raw.halfReactions.length === 0) {
    errors.push('halfReactions must include at least 1 half-reaction equation');
  }

  return errors;
}

function buildElectroFallbackQuiz(exp: ElectroExperiment): QuizQuestion[] {
  const anodeComp = exp.components.find((c) => c.polarity === 'anode');
  const cathodeComp = exp.components.find((c) => c.polarity === 'cathode');
  const oxReaction = exp.halfReactions.find((h) => h.type === 'oxidation');
  const isElectrolytic = exp.cellType === 'electrolytic';

  const questions: QuizQuestion[] = [];

  questions.push({
    id: 'electro-q1',
    kind: 'mcq',
    question: `In "${exp.experimentTitle}", which electrode acts as the ANODE where oxidation occurs?`,
    options: [
      anodeComp ? `${anodeComp.name} (${anodeComp.formula || anodeComp.material || 'Anode'})` : 'Zinc (Zn) electrode',
      cathodeComp ? `${cathodeComp.name} (${cathodeComp.formula || cathodeComp.material || 'Cathode'})` : 'Copper (Cu) electrode',
      'Salt bridge agar tube',
      'Plastic insulator sleeve',
    ],
    correctIndex: 0,
    explanation: `Oxidation (loss of electrons) always takes place at the anode${
      anodeComp ? ` (${anodeComp.name})` : ''
    }.`,
  });

  questions.push({
    id: 'electro-q2',
    kind: 'fill_blank',
    question: oxReaction
      ? `Fill in the missing particle for oxidation at the anode: "${oxReaction.equation.replace(/2?\s*e⁻/i, '____')}"`
      : 'Fill in the missing particle lost during oxidation at the anode: Zn → Zn²⁺ + ____',
    options: ['2e⁻', '2H₂O', 'Na⁺', 'SO₄²⁻'],
    correctIndex: 0,
    blankAnswer: '2e⁻',
    blankChips: ['2e⁻', 'e⁻', 'H₂', 'Cu²⁺'],
    explanation: 'During oxidation, atoms lose negatively charged electrons (e⁻).',
  });

  questions.push({
    id: 'electro-q3',
    kind: 'flashcard',
    question: 'Flashcard Review: What does OXIDATION mean in electrochemistry?',
    options: ['Loss of electrons'],
    correctIndex: 0,
    flashcardFront: 'OIL RIG — What happens during OXIDATION at the Anode?',
    flashcardBack: 'Oxidation Is Loss of electrons (e⁻ leave the anode into the wire).',
    explanation: 'Remember OIL RIG: Oxidation Is Loss, Reduction Is Gain!',
  });

  questions.push({
    id: 'electro-q4',
    kind: 'electron_flow',
    question: `Which way do electrons (e⁻) flow through the external wire in this ${
      isElectrolytic ? 'electrolytic' : 'galvanic / circuit'
    } setup?`,
    options: [
      'From Anode to Cathode through the wire',
      'From Cathode to Anode through the wire',
      'Through the liquid inside the beaker as free metal wires',
      'Electrons stay motionless inside the switch',
    ],
    correctIndex: 0,
    explanation:
      'In both galvanic and electrolytic cells, electrons ALWAYS travel in the external wire from the anode (oxidation) to the cathode (reduction).',
  });

  return questions;
}

function normalizeElectroQuiz(
  rawQuiz: Partial<QuizQuestion>[] | undefined,
  exp: ElectroExperiment
): QuizQuestion[] {
  if (!Array.isArray(rawQuiz) || rawQuiz.length < 2) {
    return buildElectroFallbackQuiz(exp);
  }
  const clean = rawQuiz
    .filter((q) => q.question)
    .slice(0, 5)
    .map((q, idx) => {
      const options = Array.isArray(q.options)
        ? q.options.map((o) => String(o).trim()).filter(Boolean).slice(0, 4)
        : ['Anode to Cathode'];
      const correctIdx =
        typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length
          ? q.correctIndex
          : 0;
      const kind =
        q.kind === 'fill_blank' || q.kind === 'flashcard' || q.kind === 'electron_flow' || q.kind === 'mcq'
          ? q.kind
          : 'mcq';
      return {
        id: q.id?.trim() || `electro-q-${idx + 1}`,
        kind,
        question: q.question!.trim(),
        options: options.length > 0 ? options : ['Anode to Cathode'],
        correctIndex: correctIdx,
        explanation: q.explanation?.trim() || 'Review the half-reactions and electron flow direction.',
        blankAnswer: q.blankAnswer?.trim(),
        blankChips: Array.isArray(q.blankChips) ? q.blankChips.map(String) : undefined,
        flashcardFront: q.flashcardFront?.trim(),
        flashcardBack: q.flashcardBack?.trim(),
      };
    });
  return clean.length >= 2 ? clean : buildElectroFallbackQuiz(exp);
}

function normalizeElectroExperiment(raw: Partial<ElectroExperiment>): ElectroExperiment {
  const rawComponents: ElectroComponent[] = (raw.components ?? []).map((c, idx) => {
    const kind: ElectroComponentKind = VALID_ELECTRO_KINDS.includes(c.kind) ? c.kind : 'electrode';
    const polarity: ElectroPolarity | undefined =
      c.polarity === 'anode' ||
      c.polarity === 'cathode' ||
      c.polarity === 'positive' ||
      c.polarity === 'negative'
        ? c.polarity
        : undefined;
    return {
      id: c.id?.trim() || `comp_${idx + 1}`,
      name: c.name?.trim() || `Part ${idx + 1}`,
      formula: toSubscriptFormula(c.formula),
      kind,
      color: sanitizeHexColor(c.color, '#38bdf8'),
      polarity,
      material: c.material?.trim(),
      label: c.label?.trim() || c.name?.trim() || `Part ${idx + 1}`,
    };
  });

  const components = rawComponents.slice(0, 9);
  const compIds = new Set(components.map((c) => c.id));
  const fallbackFirst = components[0]?.id ?? 'comp_1';
  const fallbackSecond = components[1]?.id ?? fallbackFirst;

  const steps: ElectroStep[] = (raw.steps ?? []).slice(0, 8).map((s, idx) => {
    const action: ElectroAction = VALID_ELECTRO_ACTIONS.includes(s.action) ? s.action : 'observe';
    const sourceId = s.sourceId && compIds.has(s.sourceId.trim()) ? s.sourceId.trim() : fallbackFirst;
    const targetId = s.targetId && compIds.has(s.targetId.trim()) ? s.targetId.trim() : fallbackSecond;
    const effect: ElectroEffect = VALID_ELECTRO_EFFECTS.includes(s.effect)
      ? s.effect
      : 'electron_flow';

    return {
      stepNumber: idx + 1,
      instruction: s.instruction?.trim() || `Complete step ${idx + 1}.`,
      action,
      sourceId,
      targetId,
      effect,
      voltage: typeof s.voltage === 'number' && Number.isFinite(s.voltage) ? Number(s.voltage.toFixed(2)) : undefined,
      currentA: typeof s.currentA === 'number' && Number.isFinite(s.currentA) ? Number(s.currentA.toFixed(2)) : undefined,
      resultingColor: s.resultingColor ? sanitizeHexColor(s.resultingColor, '#38bdf8') : undefined,
      scienceNote:
        s.scienceNote?.trim() ||
        'Electrons travel through the external circuit from the anode (oxidation) toward the cathode (reduction).',
      hint:
        s.hint?.trim() ||
        `Click ${components.find((c) => c.id === sourceId)?.name ?? 'source'} and then ${
          components.find((c) => c.id === targetId)?.name ?? 'target'
        }.`,
    };
  });

  const halfReactions: HalfReaction[] =
    Array.isArray(raw.halfReactions) && raw.halfReactions.length > 0
      ? raw.halfReactions.slice(0, 4).map((hr) => ({
          at: hr.at === 'cathode' ? 'cathode' : 'anode',
          type: hr.type === 'reduction' ? 'reduction' : 'oxidation',
          equation: toSubscriptFormula(hr.equation) || hr.equation || 'Zn → Zn²⁺ + 2e⁻',
        }))
      : [
          { at: 'anode', type: 'oxidation', equation: 'Anode loses electrons (Oxidation)' },
          { at: 'cathode', type: 'reduction', equation: 'Cathode gains electrons (Reduction)' },
        ];

  const cellType: 'galvanic' | 'electrolytic' | 'circuit' =
    raw.cellType === 'electrolytic' || raw.cellType === 'circuit' ? raw.cellType : 'galvanic';

  const baseElectro: ElectroExperiment = {
    isScience: true,
    experimentTitle: raw.experimentTitle?.trim() || 'Electrochemistry 3D Lab',
    slug: toSlug(raw.experimentTitle?.trim() || 'electro-experiment'),
    level: typeof raw.level === 'number' && raw.level >= 1 ? raw.level : 1,
    difficulty: raw.difficulty === 'Intermediate' ? 'Intermediate' : 'Beginner',
    cellType,
    conceptSummary:
      raw.conceptSummary?.trim() ||
      'Electrons flow externally from the anode (oxidation) to the cathode (reduction) while ions complete the internal circuit.',
    safetyTip:
      raw.safetyTip?.trim() ||
      'Wear insulated nitrile gloves before handling electrolytes, cells, or live wire terminals.',
    components,
    steps,
    halfReactions,
  };

  baseElectro.quiz = normalizeElectroQuiz(raw.quiz, baseElectro);
  return baseElectro;
}

async function applyElectroAssetCache(exp: ElectroExperiment): Promise<ElectroExperiment> {
  const slug = `electro-${toSlug(exp.experimentTitle)}`;
  const filePath = path.join(EXPERIMENTS_STORAGE_DIR, `${slug}.json`);
  await fs.mkdir(EXPERIMENTS_STORAGE_DIR, { recursive: true });

  try {
    const existingRaw = await fs.readFile(filePath, 'utf-8');
    const cached = JSON.parse(existingRaw) as ElectroExperiment;
    const nextLevel = (typeof cached.level === 'number' ? cached.level : 1) + 1;
    const cachedIds = new Set(cached.components.map((c) => c.id));
    const stepsCompatible = exp.steps.every(
      (s) => cachedIds.has(s.sourceId) && cachedIds.has(s.targetId)
    );
    const updated: ElectroExperiment = {
      ...exp,
      slug,
      level: nextLevel,
      difficulty: nextLevel >= 2 ? 'Intermediate' : exp.difficulty,
      components: cached.components,
      steps: stepsCompatible ? exp.steps : cached.steps,
      halfReactions: exp.halfReactions.length ? exp.halfReactions : cached.halfReactions,
      quiz: exp.quiz?.length ? exp.quiz : cached.quiz,
    };
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch {
    const fresh: ElectroExperiment = { ...exp, slug, level: 1 };
    await fs.writeFile(filePath, JSON.stringify(fresh, null, 2), 'utf-8');
    return fresh;
  }
}

const ELECTRO_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isScience: { type: Type.BOOLEAN },
    rejectionReason: { type: Type.STRING },
    experimentTitle: { type: Type.STRING },
    difficulty: { type: Type.STRING },
    cellType: { type: Type.STRING },
    conceptSummary: { type: Type.STRING },
    safetyTip: { type: Type.STRING },
    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          formula: { type: Type.STRING },
          kind: { type: Type.STRING },
          color: { type: Type.STRING },
          polarity: { type: Type.STRING },
          material: { type: Type.STRING },
          label: { type: Type.STRING },
        },
        required: ['id', 'name', 'kind', 'color', 'label'],
      },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          instruction: { type: Type.STRING },
          action: { type: Type.STRING },
          sourceId: { type: Type.STRING },
          targetId: { type: Type.STRING },
          effect: { type: Type.STRING },
          voltage: { type: Type.NUMBER },
          currentA: { type: Type.NUMBER },
          resultingColor: { type: Type.STRING },
          scienceNote: { type: Type.STRING },
          hint: { type: Type.STRING },
        },
        required: [
          'stepNumber',
          'instruction',
          'action',
          'sourceId',
          'targetId',
          'effect',
          'scienceNote',
          'hint',
        ],
      },
    },
    halfReactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          at: { type: Type.STRING },
          equation: { type: Type.STRING },
          type: { type: Type.STRING },
        },
        required: ['at', 'equation', 'type'],
      },
    },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          kind: { type: Type.STRING },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
          blankAnswer: { type: Type.STRING },
          blankChips: { type: Type.ARRAY, items: { type: Type.STRING } },
          flashcardFront: { type: Type.STRING },
          flashcardBack: { type: Type.STRING },
        },
        required: ['id', 'kind', 'question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: [
    'isScience',
    'experimentTitle',
    'difficulty',
    'cellType',
    'conceptSummary',
    'safetyTip',
    'components',
    'steps',
    'halfReactions',
    'quiz',
  ],
};

async function generateElectroFromTranscript(
  ai: GoogleGenAI,
  title: string,
  summary: string,
  keyPoints: string[],
  highlights: Array<{ timestamp: string; point: string }>,
  studentAge = 13,
  studentClass = 'Class 8'
): Promise<ElectroExperiment> {
  const transcriptText = [
    `Experiment Video Title: ${title}`,
    `Summary: ${summary}`,
    `Key Points:\n${keyPoints.map((p) => `- ${p}`).join('\n')}`,
    highlights.length > 0
      ? `Highlights:\n${highlights.map((h) => `[${h.timestamp}] ${h.point}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const basePrompt = [
    `Convert this video transcription into a guided 3D Electricity & Electrochemistry simulation JSON for a student (Age ${studentAge}, ${studentClass}).`,
    `STRICT RULES:`,
    `1. Include ONLY the apparatus, electrodes, electrolytes, batteries, lemons, coins, nails, bulbs, switches, salt bridges, or wires ACTUALLY mentioned or shown in the transcript. NEVER invent extra equipment.`,
    `2. If not science/electricity/electrochemistry, set "isScience": false with "rejectionReason".`,
    `3. Allowed component "kind": "battery", "cell_beaker", "electrode", "wire", "bulb", "switch", "voltmeter", "ammeter", "resistor", "salt_bridge", "electrolyte", "power_supply", "lemon", "coin", "nail", "container".`,
    `4. Set "cellType" to "galvanic", "electrolytic", or "circuit". Use accurate electrochemistry: electrons flow through the external wire from anode (oxidation) to cathode (reduction). In a galvanic cell anode is negative; in electrolysis anode is positive and cathode negative. Conventional current is opposite to electron flow.`,
    `5. Output 3 to 8 steps in exact video order. Allowed "action": "place", "connect", "pour_electrolyte", "close_switch", "open_switch", "observe", "measure".`,
    `6. Allowed "effect": "none", "electron_flow", "ion_migration", "bubbles_cathode", "bubbles_anode", "plating", "dissolving", "bulb_on", "bulb_off", "voltage_reading", "gas_collect", "color_change".`,
    `7. Every step sourceId and targetId MUST exist in components[]. Include realistic "voltage", "currentA", 1–2 sentence "scienceNote" (half-reactions / electron direction pitched for Age ${studentAge}, ${studentClass}), and clear "hint".`,
    `8. Include readable "halfReactions": [{ "at": "anode"|"cathode", "equation": "...", "type": "oxidation"|"reduction" }].`,
    `9. Include 4 "quiz" questions covering: (a) kind="mcq" (which electrode is anode), (b) kind="fill_blank" (complete the half-reaction with blankAnswer and blankChips), (c) kind="flashcard" (flashcardFront & flashcardBack for oxidation = loss of electrons), and (d) kind="electron_flow" (which way do electrons flow).`,
    ``,
    `TRANSCRIPTION:\n${transcriptText}`,
  ].join('\n');

  let lastErrors: string[] = [];
  let lastRaw: Partial<ElectroExperiment> | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}\n\nPREVIOUS ATTEMPT FAILED VALIDATION:\n- ${lastErrors.join('\n- ')}\nFix every single validation error above while obeying all rules.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ text: prompt }],
        config: {
          systemInstruction:
            'You design scientifically accurate 3D electricity & electrochemistry simulations grounded strictly in the transcript. Always return valid JSON matching the schema.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: ELECTRO_RESPONSE_SCHEMA,
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<ElectroExperiment>;
      lastRaw = parsed;

      if (parsed.isScience === false) {
        return {
          isScience: false,
          rejectionReason:
            parsed.rejectionReason?.trim() ||
            'This video is not about science circuits or electrochemistry.',
          experimentTitle: parsed.experimentTitle?.trim() || title,
          difficulty: 'Beginner',
          conceptSummary: '',
          safetyTip: '',
          components: [],
          steps: [],
          halfReactions: [],
        };
      }

      const errs = validateRawElectro(parsed);
      if (errs.length === 0) {
        const normalized = normalizeElectroExperiment(parsed);
        return applyElectroAssetCache(normalized);
      }
      lastErrors = errs;
    } catch (err) {
      lastErrors = [err instanceof Error ? err.message : 'Invalid JSON output'];
    }
  }

  if (lastRaw && Array.isArray(lastRaw.components) && Array.isArray(lastRaw.steps)) {
    const normalized = normalizeElectroExperiment(lastRaw);
    return applyElectroAssetCache(normalized);
  }

  throw new Error(
    `Failed to build valid 3D electro lab after retry: ${lastErrors.join('; ')}`
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/experiments/ready-made', (req, res) => {
    const rawClass = String(req.query.classLevel ?? '8');
    const classNumMatch = rawClass.match(/\d+/);
    const classNum = classNumMatch ? Number(classNumMatch[0]) : 8;

    const sorted = [...READY_MADE_EXPERIMENTS].sort((a, b) => {
      const aMatch = classNum >= a.minClass && classNum <= a.maxClass ? 0 : 1;
      const bMatch = classNum >= b.minClass && classNum <= b.maxClass ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return Math.abs(a.minClass - classNum) - Math.abs(b.minClass - classNum);
    });

    res.json({
      classLevel: rawClass,
      experiments: sorted.map((item) => ({
        ...item,
        recommended: classNum >= item.minClass && classNum <= item.maxClass,
      })),
    });
  });

  app.post('/api/quiz', async (req, res) => {
    const body = req.body as {
      experimentTitle?: string;
      conceptSummary?: string;
      scienceNotes?: string[];
      sceneKind?: SceneKind;
      studentAge?: number;
      studentClass?: string;
      existingQuiz?: QuizQuestion[];
    };

    if (Array.isArray(body?.existingQuiz) && body.existingQuiz.length >= 3) {
      res.json({ quiz: body.existingQuiz });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      return;
    }

    const isElectro = body.sceneKind === 'electro';
    try {
      const ai = createGeminiClient(apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          {
            text: [
              isElectro
                ? `Write 4 electrochemistry quiz items for a student (Age ${body.studentAge ?? 13}, ${body.studentClass ?? 'Class 8'}): (1) kind="mcq" on which electrode is anode, (2) kind="fill_blank" on a half-reaction with blankAnswer and blankChips, (3) kind="flashcard" (flashcardFront & flashcardBack explaining oxidation = loss of electrons), (4) kind="electron_flow" (which way electrons flow).`
                : `Write 4 short, clear multiple-choice chemistry quiz questions for a student (Age ${body.studentAge ?? 13}, ${body.studentClass ?? 'Class 8'}).`,
              `Base them ONLY on this experiment:`,
              `Title: ${body.experimentTitle ?? 'Science Lab'}`,
              `Concept: ${body.conceptSummary ?? ''}`,
              `Step notes:\n${(body.scienceNotes ?? []).map((n) => `- ${n}`).join('\n')}`,
            ].join('\n'),
          },
        ],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    kind: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    blankAnswer: { type: Type.STRING },
                    blankChips: { type: Type.ARRAY, items: { type: Type.STRING } },
                    flashcardFront: { type: Type.STRING },
                    flashcardBack: { type: Type.STRING },
                  },
                  required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
                },
              },
            },
            required: ['quiz'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as { quiz?: QuizQuestion[] };
      res.json({ quiz: parsed.quiz ?? [] });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/summarize/stream', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add your key in Settings > Secrets.',
      });
      return;
    }

    const body = req.body as {
      url?: string;
      length?: SummaryLength;
      studentAge?: number;
      studentClass?: string;
    };
    const rawUrl = typeof body?.url === 'string' ? body.url : '';
    const length: SummaryLength =
      body?.length === 'short' || body?.length === 'detailed'
        ? body.length
        : 'standard';
    const studentAge =
      typeof body?.studentAge === 'number' && body.studentAge >= 5 && body.studentAge <= 25
        ? body.studentAge
        : 13;
    const studentClass =
      typeof body?.studentClass === 'string' && body.studentClass.trim()
        ? body.studentClass.trim()
        : 'Class 8';

    const videoId = extractYouTubeVideoId(rawUrl);
    if (!videoId) {
      res.status(400).json({
        error:
          'Please enter a valid YouTube video URL (for example, https://www.youtube.com/watch?v=... or https://youtu.be/...).',
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (event: string, payload: unknown) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      }
    };

    try {
      const metadata = await fetchYouTubeMetadata(videoId);
      sendEvent('metadata', { video: metadata, length });

      const ai = createGeminiClient(apiKey);
      const stream = await ai.models.generateContentStream(
        buildTranscriptParams(metadata, length)
      );

      let accumulated = '';
      for await (const chunk of stream) {
        const text = chunk.text ?? '';
        if (text) {
          accumulated += text;
          sendEvent('chunk', { text });
        }
      }

      const parsed = parseStructuredPlainText(accumulated);

      if (parsed.category === 'not_science' || !parsed.isChemistry) {
        const reason =
          parsed.rejectionReason && parsed.rejectionReason.toUpperCase() !== 'NONE'
            ? parsed.rejectionReason
            : 'This video is not chemistry or electrochemistry related. Please paste a chemistry reaction or electricity/electrochemistry video.';
        sendEvent('not_chemistry', {
          error: reason,
          video: metadata,
          topics: parsed.topics,
        });
        res.end();
        return;
      }

      if (!parsed.summary) {
        throw new Error('Model response did not contain a transcription summary.');
      }

      sendEvent('stage', { stage: 'building_lab' });

      if (parsed.category === 'electro') {
        const electroExperiment = await generateElectroFromTranscript(
          ai,
          metadata.title,
          parsed.summary,
          parsed.keyPoints,
          parsed.transcriptHighlights,
          studentAge,
          studentClass
        );

        if (!electroExperiment.isScience) {
          sendEvent('not_chemistry', {
            error:
              electroExperiment.rejectionReason ||
              'This video does not demonstrate a science circuit or electrochemistry experiment.',
            video: metadata,
            topics: parsed.topics,
          });
          res.end();
          return;
        }

        const result: SummaryResult = {
          id: `${videoId}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          length,
          video: metadata,
          summary: parsed.summary,
          keyPoints: parsed.keyPoints,
          transcriptHighlights: parsed.transcriptHighlights,
          topics: parsed.topics,
          spokenLanguage: parsed.spokenLanguage,
          isChemistry: true,
          sceneKind: 'electro',
          electroExperiment,
        };

        sendEvent('done', { result });
        res.end();
        return;
      }

      const experiment = await generateLabFromTranscript(
        ai,
        metadata.title,
        parsed.summary,
        parsed.keyPoints,
        parsed.transcriptHighlights,
        studentAge,
        studentClass
      );

      if (!experiment.isChemistry) {
        sendEvent('not_chemistry', {
          error:
            experiment.rejectionReason ||
            'This video does not demonstrate a chemistry experiment.',
          video: metadata,
          topics: parsed.topics,
        });
        res.end();
        return;
      }

      const result: SummaryResult = {
        id: `${videoId}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        length,
        video: metadata,
        summary: parsed.summary,
        keyPoints: parsed.keyPoints,
        transcriptHighlights: parsed.transcriptHighlights,
        topics: parsed.topics,
        spokenLanguage: parsed.spokenLanguage,
        isChemistry: true,
        sceneKind: 'reaction',
        experiment,
      };

      sendEvent('done', { result });
      res.end();
    } catch (err) {
      const formatted = formatGeminiError(err);
      sendEvent('error', { error: formatted.message });
      res.end();
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
