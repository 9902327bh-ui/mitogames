import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ANATOMY_SYSTEMS,
  BIO_TOPICS,
  CHALLENGE_KINDS,
  DIFFICULTIES,
  ITEM_KINDS,
  MINI_DIAGRAMS,
  QUIZ_KINDS,
  SCENE_KINDS,
  SPECIMEN_PRESETS,
  STEP_ACTIONS,
  STEP_EFFECTS,
  getReadingTier,
  type SummaryLength,
} from '../../src/verbatimBio/constants/bioEnums.ts';
import type {
  BioExperiment,
  QuizQuestion,
  SummaryData,
  VideoMeta,
} from '../../src/verbatimBio/types.ts';
import { parseStreamSummary } from '../../src/verbatimBio/utils/parseStreamSummary.ts';
import { sanitizeBioExperiment, sanitizeQuizQuestion } from './validator.ts';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'experiments');

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const trimmed = rawUrl.trim();
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (
        segments.length >= 2 &&
        (segments[0] === 'shorts' || segments[0] === 'embed' || segments[0] === 'live')
      ) {
        const id = segments[1];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchYouTubeOEmbed(videoId: string): Promise<VideoMeta> {
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const fallback: VideoMeta = {
    videoId,
    url: canonicalUrl,
    title: `YouTube Biology Video (${videoId})`,
    authorName: 'YouTube Educator',
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 404) {
      throw new Error(
        'This YouTube video appears to be unavailable, deleted, or private. Please try a public biology video.',
      );
    }

    if (!res.ok) {
      return fallback;
    }

    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      videoId,
      url: canonicalUrl,
      title: data.title?.trim() || fallback.title,
      authorName: data.author_name?.trim() || fallback.authorName,
      thumbnailUrl: data.thumbnail_url?.trim() || fallback.thumbnailUrl,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('unavailable, deleted, or private')) {
      throw err;
    }
    return fallback;
  }
}

function getVocabularyInstruction(classLevel: number): string {
  const tier = getReadingTier(classLevel);
  if (tier === 'simple') {
    return `Target audience: Class ${classLevel} student (age ~9–13). Use clear, friendly words, short sentences, and vivid analogies.`;
  }
  if (tier === 'standard') {
    return `Target audience: Class ${classLevel} student (age ~13–16). Use standard secondary school biology terminology and clear cause-and-effect explanations.`;
  }
  return `Target audience: Class ${classLevel} senior student (age ~16–18). Use precise cellular, biochemical, and physiological terminology.`;
}

function getLengthInstruction(length: SummaryLength): string {
  if (length === 'short') {
    return 'Keep the overview concise (2–3 crisp sentences), 3 key points, and 3 timestamp highlights.';
  }
  if (length === 'detailed') {
    return 'Provide a rich, thorough overview (2–3 detailed paragraphs), 6 key points, and 5–6 timestamp highlights.';
  }
  return 'Provide a clear standard overview (1–2 well-structured paragraphs), 4–5 key points, and 4 timestamp highlights.';
}

export interface CachedVideoAnalysis {
  videoId: string;
  classLevel: number;
  summaryLength: SummaryLength;
  videoMeta: VideoMeta;
  summary: SummaryData;
  rawSummaryText?: string;
  experiment: BioExperiment;
  cachedAt: string;
}

function getCachePath(videoId: string, summaryLength: SummaryLength, classLevel: number): string {
  const tier = getReadingTier(classLevel);
  return path.join(STORAGE_DIR, `${videoId}_${summaryLength}_${tier}_v4.json`);
}

export function readCachedAnalysis(
  videoId: string,
  summaryLength: SummaryLength,
  classLevel: number,
): CachedVideoAnalysis | null {
  try {
    ensureStorageDir();
    const filePath = getCachePath(videoId, summaryLength, classLevel);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as CachedVideoAnalysis;
    if (!parsed || !parsed.experiment || !parsed.summary) return null;
    return {
      ...parsed,
      experiment: sanitizeBioExperiment(parsed.experiment, classLevel),
    };
  } catch {
    return null;
  }
}

export function writeCachedAnalysis(data: CachedVideoAnalysis): void {
  try {
    ensureStorageDir();
    const filePath = getCachePath(data.videoId, data.summaryLength, data.classLevel);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write experiment cache:', err);
  }
}

const BIO_EXPERIMENT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isBiology: {
      type: Type.BOOLEAN,
      description: 'True ONLY if the video teaches biology. False for music, gaming, coding, vlogs, pure chemistry, or pure physics.',
    },
    rejectionReason: { type: Type.STRING },
    sceneKind: { type: Type.STRING, enum: [...SCENE_KINDS] },
    specimenPreset: { type: Type.STRING, enum: [...SPECIMEN_PRESETS] },
    anatomySystem: { type: Type.STRING, enum: [...ANATOMY_SYSTEMS] },
    experimentTitle: { type: Type.STRING },
    slug: { type: Type.STRING },
    level: { type: Type.STRING },
    difficulty: { type: Type.STRING, enum: [...DIFFICULTIES] },
    classRange: { type: Type.STRING },
    topic: { type: Type.STRING, enum: [...BIO_TOPICS] },
    storyHook: { type: Type.STRING },
    conceptSummary: { type: Type.STRING },
    safetyTip: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          kind: { type: Type.STRING, enum: [...ITEM_KINDS] },
          color: { type: Type.STRING },
          label: { type: Type.STRING },
          scientificName: { type: Type.STRING },
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
          action: { type: Type.STRING, enum: [...STEP_ACTIONS] },
          sourceId: { type: Type.STRING },
          targetId: { type: Type.STRING },
          effect: { type: Type.STRING, enum: [...STEP_EFFECTS] },
          measurement: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.NUMBER },
              unit: { type: Type.STRING },
            },
            required: ['label', 'value', 'unit'],
          },
          whatHappened: { type: Type.STRING },
          whyItHappens: { type: Type.STRING },
          realLife: { type: Type.STRING },
          keyTerm: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
            },
            required: ['term', 'definition'],
          },
          miniDiagram: { type: Type.STRING, enum: [...MINI_DIAGRAMS] },
          scienceNote: { type: Type.STRING },
          hint: { type: Type.STRING },
          readouts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING },
              },
              required: ['label', 'value'],
            },
          },
          controlValues: {
            type: Type.OBJECT,
            properties: {
              light: { type: Type.NUMBER },
              co2: { type: Type.NUMBER },
              temp: { type: Type.NUMBER },
              label: { type: Type.STRING },
            },
            required: ['light', 'co2', 'temp'],
          },
        },
        required: [
          'stepNumber',
          'instruction',
          'action',
          'sourceId',
          'targetId',
          'effect',
          'measurement',
          'whatHappened',
          'whyItHappens',
          'realLife',
          'keyTerm',
          'miniDiagram',
          'scienceNote',
          'hint',
        ],
      },
    },
    challenges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          kind: { type: Type.STRING, enum: [...CHALLENGE_KINDS] },
          prompt: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
          afterStep: { type: Type.INTEGER },
        },
        required: ['id', 'kind', 'prompt', 'options', 'correctIndex', 'explanation'],
      },
    },
    observations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          what: { type: Type.STRING },
          why: { type: Type.STRING },
        },
        required: ['what', 'why'],
      },
    },
    keyTerms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
        },
        required: ['term', 'definition'],
      },
    },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          kind: { type: Type.STRING, enum: [...QUIZ_KINDS] },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
          sentenceWithBlank: { type: Type.STRING },
          blankAnswer: { type: Type.STRING },
          wordChips: { type: Type.ARRAY, items: { type: Type.STRING } },
          frontPrompt: { type: Type.STRING },
          backAnswer: { type: Type.STRING },
          diagramTitle: { type: Type.STRING },
          structureHint: { type: Type.STRING },
        },
        required: ['id', 'kind', 'question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: [
    'isBiology',
    'sceneKind',
    'experimentTitle',
    'slug',
    'level',
    'difficulty',
    'classRange',
    'topic',
    'storyHook',
    'conceptSummary',
    'safetyTip',
    'items',
    'steps',
    'challenges',
    'observations',
    'keyTerms',
    'quiz',
  ],
};

export async function streamYouTubeBiologyAnalysis(params: {
  videoId: string;
  videoMeta: VideoMeta;
  classLevel: number;
  summaryLength: SummaryLength;
  onStage: (stage: string) => void;
  onSummaryChunk: (chunk: string) => void;
}): Promise<{ summary: SummaryData; rawSummaryText: string; experiment: BioExperiment }> {
  const { videoMeta, classLevel, summaryLength, onStage, onSummaryChunk } = params;
  const ai = getGenAIClient();
  const vocabRule = getVocabularyInstruction(classLevel);
  const lengthRule = getLengthInstruction(summaryLength);

  onStage('Checking science topic and transcribing video');

  const summaryPrompt = `You are a biology educator analyzing the YouTube video "${videoMeta.title}" by "${videoMeta.authorName}" (${videoMeta.url}).
${vocabRule}
${lengthRule}

Produce clean plain text (no markdown code fences) structured strictly with these four headings:
Summary:
<plain text overview>

Key Points:
- <point 1>
- <point 2>

Topics:
<comma-separated biology or subject topics>

Highlights:
- [MM:SS] <Title> — <1-sentence explanation>

If the video is NOT biology (e.g., music, gaming, coding, vlogs, chemistry-only, physics-only), summarize what the video is actually about honestly and note in Key Points that it is outside biology.`;

  let rawSummaryText = '';
  try {
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: videoMeta.url,
                mimeType: 'video/mp4',
              },
            },
            { text: summaryPrompt },
          ],
        },
      ],
    });

    for await (const chunk of stream) {
      const piece = chunk.text ?? '';
      if (piece) {
        rawSummaryText += piece;
        onSummaryChunk(piece);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/403|404|not found|unavailable|private|permission/i.test(msg)) {
      throw new Error(
        'We could not access this YouTube video (it may be private, age-restricted, or unavailable). Please check the link and try another public video.',
      );
    }
    throw new Error(`Unable to analyze video with Gemini: ${msg}`);
  }

  const summary = parseStreamSummary(rawSummaryText, videoMeta.title);

  onStage('Building interactive 3D biology lab');

  const labPrompt = `Based on the YouTube video "${videoMeta.title}" (${videoMeta.url}) and this summary:
${rawSummaryText}

${vocabRule}

Classify this video and build a complete BioExperiment JSON object:
1. Decide isBiology:
   - False if the video is music, gaming, coding, vlogs, pure chemistry, or pure physics. Give a friendly rejectionReason.
   - True if it covers biology (microscopy, cells, photosynthesis, osmosis, fermentation, enzymes, genetics, mitosis, DNA, ecology, microbiology, plant or human physiology).
2. Choose sceneKind ('microscope' | 'process' | 'body_system' | 'factory' | 'control_panel') and matching specimenPreset or anatomySystem.
   - PHOTOSYNTHESIS ROUTING RULE (Class ${classLevel}):
     * If the video is primarily about photosynthesis and Class ${classLevel} <= 8: MUST set sceneKind = 'factory'. Build "The Solar Factory" cutaway leaf interior adapted to the video's examples/wording using items from: leaf_factory, stomata_gate, co2_cloud, roots_xylem, xylem_pipe, sun_switch, water_molecules, chloroplast_plant, chloroplast_panels, sugar_maker, oxygen_bubbles, glucose_crate, phloem_conveyor; actions from: open_gate, pump_water, toggle_sun, feed_plant, split_water, build_sugar, release_oxygen, ship_glucose, close_gate; 3 readouts (SUNLIGHT, CO₂ IN, O₂ OUT); miniDiagram = 'factory_equation'.
     * If the video is primarily about photosynthesis and Class ${classLevel} >= 9: MUST set sceneKind = 'control_panel'. Build the "Limiting Factor Control Panel" pondweed lab adapted to the video's wording/values using items from: plant_sprig, photosynthesis_chamber, lamp_switch, control_console, light_dial, bicarbonate_dropper, heater_block, temp_dial, optimum_button, rate_graph_board; actions from: place_specimen, set_light, set_dial, add_reagent, warm_bath, press_optimum; include controlValues { light, co2, temp, label } and 3 readouts (RATE, LIMITING FACTOR, TEMP °C) per step; miniDiagram = 'limiting_factor_curve'.
3. No real animal dissection and no gore. Include a clear safetyTip.
4. CRITICAL BENCH ITEM RULE:
   - In 'microscope', 'process', and 'body_system', every item in items[] sits on the physical lab bench (e.g., glass_slide, coverslip, dropper, stain_bottle, onion_bulb, leaf_sample, forceps, microscope, objective_lens, focus_knob, beaker, test_tube, water_bath, lamp, ruler, plant_sprig, potato_strip, flask_balloon, reagent_bottle, thermometer, timer_dial, heart_model, lung_model, mitosis_model, dna_model, plant_vascular_model, organ_part, label_marker).
   - In 'microscope' mode, NEVER put microscopic structures or organelles (like stomata, guard cells, chloroplasts, thylakoids, nucleus, vacuole, mitochondria) as bench items[] — those belong ONLY in scienceNote, keyTerms, and the microscope eyepiece view! (In 'factory' mode, use the dedicated factory machine kinds listed above.)
   - Do NOT include safety_gear_box or hard_hat_box in items[] (safety gear is added automatically as Step 0).
5. Create 4 to 9 bench items with unique short IDs.
6. Create 3 to 9 sequential steps where sourceId and targetId match items[].id. Every step MUST include whatHappened, whyItHappens, realLife, keyTerm {term, definition}, miniDiagram, scienceNote, and hint.
7. Create 4 varied quiz questions mixing 'mcq', 'fill_blank', 'flashcard', and 'label_diagram'.`;

  const labResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: videoMeta.url,
              mimeType: 'video/mp4',
            },
          },
          { text: labPrompt },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: BIO_EXPERIMENT_RESPONSE_SCHEMA,
    },
  });

  const jsonText = (labResponse.text ?? '{}').trim();
  let parsedRaw: unknown = {};
  try {
    parsedRaw = JSON.parse(jsonText);
  } catch {
    parsedRaw = {};
  }

  const experiment = sanitizeBioExperiment(parsedRaw, classLevel);

  return { summary, rawSummaryText, experiment };
}

export async function generateQuizForExperiment(params: {
  experiment: BioExperiment;
  classLevel: number;
}): Promise<QuizQuestion[]> {
  const { experiment, classLevel } = params;
  const ai = getGenAIClient();
  const vocabRule = getVocabularyInstruction(classLevel);

  const prompt = `Generate 4 fresh, varied biology quiz questions for "${experiment.experimentTitle}" (${experiment.topic}).
Concept summary: ${experiment.conceptSummary}
Key terms: ${experiment.keyTerms.map((t) => `${t.term}: ${t.definition}`).join('; ')}
Observations: ${experiment.observations.map((o) => `${o.what} (${o.why})`).join('; ')}

${vocabRule}

Include one of each kind: 'mcq', 'fill_blank', 'flashcard', and 'label_diagram'.
For 'fill_blank', provide sentenceWithBlank (with _____), blankAnswer, and 4 wordChips including blankAnswer.
For 'flashcard', provide frontPrompt and backAnswer plus 4 options.
For 'label_diagram', provide diagramTitle, structureHint, and 4 options.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: BIO_EXPERIMENT_RESPONSE_SCHEMA.properties.quiz.items,
      },
    },
  });

  const text = (response.text ?? '[]').trim();
  let parsed: unknown[] = [];
  try {
    const raw = JSON.parse(text);
    if (Array.isArray(raw)) parsed = raw;
  } catch {
    parsed = [];
  }

  if (parsed.length === 0) {
    return experiment.quiz;
  }

  return parsed.slice(0, 6).map((q, idx) => sanitizeQuizQuestion(q, idx));
}
