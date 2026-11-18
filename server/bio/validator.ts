import {
  ANATOMY_SYSTEMS,
  BIO_TOPICS,
  CHALLENGE_KINDS,
  DIFFICULTIES,
  ITEM_KINDS,
  MICROSCOPIC_ONLY_TERMS,
  MINI_DIAGRAMS,
  QUIZ_KINDS,
  SCENE_KINDS,
  SPECIMEN_PRESETS,
  STEP_ACTIONS,
  STEP_EFFECTS,
  type AnatomySystem,
  type BioTopic,
  type ChallengeKind,
  type Difficulty,
  type ItemKind,
  type MiniDiagramKind,
  type QuizKind,
  type SceneKind,
  type SpecimenPreset,
  type StepAction,
  type StepEffect,
} from '../../src/verbatimBio/constants/bioEnums.ts';
import type {
  BioExperiment,
  KeyTerm,
  LabChallenge,
  LabItem,
  LabObservation,
  LabStep,
  QuizQuestion,
  ReadoutBox,
} from '../../src/verbatimBio/types.ts';

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if ((allowed as readonly string[]).includes(normalized)) {
      return normalized as T;
    }
    const lower = normalized.toLowerCase();
    const match = allowed.find((a) => a.toLowerCase() === lower);
    if (match) return match;
  }
  return fallback;
}

function safeString(value: unknown, fallback: string, maxLen = 600): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().slice(0, maxLen);
  }
  return fallback;
}

function safeHexColor(value: unknown, fallback = '#10b981'): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      return trimmed;
    }
  }
  return fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function isMicroscopicOnlyName(text: string): boolean {
  const lower = text.toLowerCase();
  return MICROSCOPIC_ONLY_TERMS.some((term) => lower.includes(term));
}

const PRESERVED_SPECIAL_KINDS = new Set<ItemKind>([
  'leaf_factory',
  'stomata_gate',
  'roots_xylem',
  'xylem_pipe',
  'sun_switch',
  'chloroplast_plant',
  'chloroplast_panels',
  'sugar_maker',
  'co2_cloud',
  'water_molecules',
  'glucose_crate',
  'oxygen_bubbles',
  'phloem_conveyor',
  'photosynthesis_chamber',
  'bicarbonate_dropper',
  'heater_block',
  'control_console',
  'lamp_switch',
  'light_dial',
  'temp_dial',
  'optimum_button',
  'rate_graph_board',
]);

function inferItemKindFromLabel(label: string, sceneKind: SceneKind, fallback: ItemKind): ItemKind {
  if (PRESERVED_SPECIAL_KINDS.has(fallback)) {
    return fallback;
  }
  const l = label.toLowerCase();
  if (l.includes('hard hat')) return 'hard_hat_box';
  if (l.includes('safety') || l.includes('glove')) return 'safety_gear_box';
  if (sceneKind === 'factory') {
    if (l.includes('stomata') || l.includes('gate')) return 'stomata_gate';
    if (l.includes('xylem') || l.includes('pipe')) return 'xylem_pipe';
    if (l.includes('root')) return 'roots_xylem';
    if (l.includes('sun') || l.includes('light switch')) return 'sun_switch';
    if (l.includes('panel')) return 'chloroplast_panels';
    if (l.includes('sugar maker')) return 'sugar_maker';
    if (l.includes('chloroplast')) return 'chloroplast_plant';
    if (l.includes('co2') || l.includes('co₂')) return 'co2_cloud';
    if (l.includes('water') || l.includes('h2o') || l.includes('h₂o')) return 'water_molecules';
    if (l.includes('glucose') || l.includes('sugar')) return 'glucose_crate';
    if (l.includes('oxygen') || l.includes('o2') || l.includes('o₂')) return 'oxygen_bubbles';
    if (l.includes('phloem') || l.includes('conveyor')) return 'phloem_conveyor';
    if (l.includes('leaf') || l.includes('factory')) return 'leaf_factory';
  }
  if (sceneKind === 'control_panel') {
    if (l.includes('chamber') || l.includes('tank')) return 'photosynthesis_chamber';
    if (l.includes('bicarbonate') || l.includes('nahco')) return 'bicarbonate_dropper';
    if (l.includes('heater') || l.includes('bath')) return 'heater_block';
    if (l.includes('optimum')) return 'optimum_button';
    if (l.includes('temp') && l.includes('dial')) return 'temp_dial';
    if (l.includes('light') && l.includes('dial')) return 'light_dial';
    if (l.includes('lamp') && l.includes('switch')) return 'lamp_switch';
    if (l.includes('console')) return 'control_console';
    if (l.includes('graph')) return 'rate_graph_board';
    if (l.includes('pondweed') || l.includes('elodea')) return 'plant_sprig';
  }
  if (l.includes('onion')) return 'onion_bulb';
  if (l.includes('leaf') || l.includes('stomata') || l.includes('chloroplast')) return 'leaf_sample';
  if (l.includes('elodea') || l.includes('pondweed') || l.includes('sprig')) return 'plant_sprig';
  if (l.includes('potato')) return 'potato_strip';
  if (l.includes('seed')) return 'seeds';
  if (l.includes('sprout') || l.includes('bean')) return 'bean_sprout';
  if (l.includes('yeast') && l.includes('sachet')) return 'yeast_sachet';
  if (l.includes('forceps') || l.includes('tweezer')) return 'forceps';
  if (l.includes('needle')) return 'dissecting_needle';
  if (l.includes('pipette')) return 'pipette';
  if (l.includes('dropper')) return 'dropper';
  if (l.includes('iodine') || l.includes('methylene') || l.includes('safranin') || l.includes('stain')) {
    return 'stain_bottle';
  }
  if (l.includes('coverslip')) return 'coverslip';
  if (l.includes('tray')) return 'slide_tray';
  if (l.includes('slide')) return 'glass_slide';
  if (l.includes('objective') || l.includes('40x') || l.includes('lens')) return 'objective_lens';
  if (l.includes('focus') || l.includes('knob')) return 'focus_knob';
  if (l.includes('microscope')) return 'microscope';
  if (l.includes('petri')) return 'petri_dish';
  if (l.includes('watch')) return 'watch_glass';
  if (l.includes('cylinder')) return 'measuring_cylinder';
  if (l.includes('rack')) return 'test_tube_rack';
  if (l.includes('flask') && l.includes('balloon')) return 'flask_balloon';
  if (l.includes('conical') || l.includes('erlenmeyer')) return 'conical_flask';
  if (l.includes('tube')) return 'test_tube';
  if (l.includes('bath')) return 'water_bath';
  if (l.includes('beaker')) return 'beaker';
  if (l.includes('lamp') || l.includes('light')) return 'lamp';
  if (l.includes('ruler')) return 'ruler';
  if (l.includes('timer') || l.includes('clock')) return 'timer_dial';
  if (l.includes('thermometer') || l.includes('probe') || l.includes('balance') || l.includes('sensor')) {
    return 'thermometer';
  }
  if (l.includes('heart')) return 'heart_model';
  if (l.includes('lung')) return 'lung_model';
  if (l.includes('digest') || l.includes('stomach')) return 'digestive_model';
  if (l.includes('nerve') || l.includes('reflex')) return 'nerve_arc_model';
  if (l.includes('xylem') || l.includes('vascular')) return 'plant_vascular_model';
  if (l.includes('mitosis')) return 'mitosis_model';
  if (l.includes('dna')) return 'dna_model';
  if (sceneKind === 'microscope' && isMicroscopicOnlyName(label)) {
    return 'specimen_sample';
  }
  return fallback;
}

function defaultItemsForScene(sceneKind: SceneKind): LabItem[] {
  if (sceneKind === 'factory') {
    return [
      { id: 'leaf_factory', name: 'Cutaway Leaf Factory', kind: 'leaf_factory', color: '#22c55e', label: 'Leaf Factory' },
      { id: 'stomata_gate', name: 'Stomata Gate', kind: 'stomata_gate', color: '#16a34a', label: 'Stomata Gate' },
      { id: 'co2_cloud', name: 'CO₂ Air Cloud', kind: 'co2_cloud', color: '#64748b', label: 'CO₂ Cloud' },
      { id: 'roots', name: 'Plant Roots', kind: 'roots_xylem', color: '#92400e', label: 'Roots' },
      { id: 'xylem_pipe', name: 'Xylem Water Pipe', kind: 'xylem_pipe', color: '#0284c7', label: 'Xylem Pipe' },
      { id: 'sun_switch', name: 'Sunlight Switch', kind: 'sun_switch', color: '#facc15', label: 'Sun Switch' },
      { id: 'chloroplast', name: 'Chloroplast Power Plant', kind: 'chloroplast_plant', color: '#15803d', label: 'Chloroplast' },
      { id: 'chloroplast_panels', name: 'Chloroplast Solar Panels', kind: 'chloroplast_panels', color: '#16a34a', label: 'Chloroplast Panels' },
      { id: 'sugar_maker', name: 'Sugar Maker Machine', kind: 'sugar_maker', color: '#eab308', label: 'Sugar Maker' },
      { id: 'oxygen_bubbles', name: 'Oxygen Bubbles', kind: 'oxygen_bubbles', color: '#38bdf8', label: 'Oxygen Bubbles' },
      { id: 'glucose_crate', name: 'Glucose Crate', kind: 'glucose_crate', color: '#f59e0b', label: 'Glucose Crate' },
      { id: 'phloem_conveyor', name: 'Phloem Conveyor', kind: 'phloem_conveyor', color: '#d97706', label: 'Phloem Conveyor' },
    ];
  }
  if (sceneKind === 'control_panel') {
    return [
      { id: 'chamber', name: 'Photosynthesis Chamber', kind: 'photosynthesis_chamber', color: '#bae6fd', label: 'Chamber' },
      { id: 'pondweed', name: 'Elodea Pondweed', kind: 'plant_sprig', color: '#16a34a', label: 'Pondweed' },
      { id: 'lamp_switch', name: 'Lamp & Light Switch', kind: 'lamp_switch', color: '#fde047', label: 'Lamp Switch' },
      { id: 'console', name: 'Lab Control Console', kind: 'control_console', color: '#1e293b', label: 'Control Console' },
      { id: 'bicarbonate_dropper', name: 'NaHCO₃ Bicarbonate Dropper', kind: 'bicarbonate_dropper', color: '#38bdf8', label: 'Bicarbonate Dropper' },
      { id: 'heater_block', name: 'Water Bath Heater', kind: 'heater_block', color: '#ef4444', label: 'Water Bath Heater' },
      { id: 'rate_graph', name: 'Live Rate Graph Board', kind: 'rate_graph_board', color: '#0284c7', label: 'Rate Graph' },
    ];
  }
  if (sceneKind === 'microscope') {
    return [
      { id: 'slide', name: 'Glass Slide', kind: 'glass_slide', color: '#cbd5e1', label: 'Glass Slide' },
      { id: 'specimen', name: 'Specimen Peel', kind: 'specimen_sample', color: '#86efac', label: 'Specimen Peel' },
      { id: 'dropper', name: 'Water Dropper', kind: 'dropper', color: '#38bdf8', label: 'Water Dropper' },
      { id: 'stain', name: 'Stain Bottle', kind: 'stain_bottle', color: '#d97706', label: 'Iodine Stain' },
      { id: 'coverslip', name: 'Coverslip', kind: 'coverslip', color: '#e2e8f0', label: 'Coverslip' },
      { id: 'microscope', name: 'Compound Microscope', kind: 'microscope', color: '#0f766e', label: 'Microscope' },
      { id: 'objective', name: 'Objective Lens', kind: 'objective_lens', color: '#334155', label: '40x Objective' },
      { id: 'focus', name: 'Focus Knob', kind: 'focus_knob', color: '#475569', label: 'Fine Focus' },
    ];
  }
  if (sceneKind === 'process') {
    return [
      { id: 'specimen', name: 'Biological Sample', kind: 'plant_sprig', color: '#22c55e', label: 'Specimen' },
      { id: 'beaker', name: 'Reaction Beaker', kind: 'beaker', color: '#bae6fd', label: 'Beaker' },
      { id: 'reagent', name: 'Test Solution', kind: 'reagent_bottle', color: '#f59e0b', label: 'Solution' },
      { id: 'lamp', name: 'Adjustable Lamp / Heater', kind: 'lamp', color: '#fde047', label: 'Lamp / Heater' },
      { id: 'timer', name: 'Lab Timer', kind: 'timer_dial', color: '#14b8a6', label: 'Timer' },
      { id: 'thermometer', name: 'Digital Sensor', kind: 'thermometer', color: '#ef4444', label: 'Sensor' },
    ];
  }
  return [
    { id: 'system_model', name: 'Anatomical Model', kind: 'heart_model', color: '#ef4444', label: 'Anatomy Model' },
    { id: 'organ_a', name: 'Primary Structure', kind: 'organ_part', color: '#dc2626', label: 'Primary Organ' },
    { id: 'organ_b', name: 'Secondary Pathway', kind: 'organ_part', color: '#2563eb', label: 'Pathway' },
    { id: 'label_1', name: 'Structure Marker', kind: 'label_marker', color: '#10b981', label: 'Label Tag' },
  ];
}

function defaultActionForScene(sceneKind: SceneKind): StepAction {
  if (sceneKind === 'factory') return 'feed_plant';
  if (sceneKind === 'control_panel') return 'set_dial';
  if (sceneKind === 'microscope') return 'observe_sample';
  if (sceneKind === 'process') return 'measure_result';
  return 'highlight_organ';
}

function defaultDiagramForScene(sceneKind: SceneKind): MiniDiagramKind {
  if (sceneKind === 'factory') return 'factory_equation';
  if (sceneKind === 'control_panel') return 'limiting_factor_curve';
  if (sceneKind === 'microscope') return 'cell_wall_grid';
  if (sceneKind === 'process') return 'photosynthesis_eq';
  return 'heart_double_loop';
}

function defaultItemKindForScene(sceneKind: SceneKind): ItemKind {
  if (sceneKind === 'factory') return 'chloroplast_plant';
  if (sceneKind === 'control_panel') return 'control_console';
  if (sceneKind === 'microscope') return 'glass_slide';
  if (sceneKind === 'process') return 'beaker';
  return 'organ_part';
}

const FRIENDLY_EFFECT_LABELS: Record<StepEffect, string> = {
  none: 'Observed',
  bubbles: 'O₂ Bubbles Rising',
  color_change: 'Indicator Shift',
  cell_swell: 'Cells Swelled',
  cell_shrink: 'Plasmolysis Shrink',
  stain_absorb: 'Stain Absorbed',
  gas_balloon_inflate: 'CO₂ Gas Inflating',
  balloon_inflate: 'CO₂ Gas Inflating',
  growth: 'Growth Active',
  flow_animation: 'Flow Active',
  blood_flow: 'Circulation Active',
  mitosis_stage: 'Phase Advanced',
  dna_unzip: 'DNA Unzipping',
  highlight: 'Specimen Ready',
  lens_zoom: '400x Objective Active',
  lens_focus: 'Crisp Focal Plane',
  heat_glow: 'Thermal Energy Active',
  label_snap: 'Mounted on Stage',
  equation_co2: '6CO₂ Entered Leaf',
  equation_h2o: '6H₂O Pumped Up',
  light_beams: 'Sunlight Absorbed',
  chloroplast_glow: 'Reactants in Core',
  water_split: 'Water Split → H + O',
  equation_glucose: 'C₆H₁₂O₆ Assembled',
  equation_o2: '6O₂ Released Outside',
  fruit_swell: 'Food Delivered to Sinks',
  equation_complete: 'Balanced Factory Cycle',
  rate_update: 'Rate Recorded',
  limiting_co2: 'CO₂ Limiting Rate',
  denaturation: 'Enzymes Denatured',
  optimum_recovery: 'Peak Optimum Rate',
};

function buildDefaultReadouts(
  sceneKind: SceneKind,
  stepIdx: number,
  action: StepAction,
  effect: StepEffect,
  measurementLabel: string,
  measurementValue: number,
  measurementUnit: string,
): ReadoutBox[] {
  const metricText = `${measurementValue} ${measurementUnit}`.trim();
  const effectLabel = FRIENDLY_EFFECT_LABELS[effect] ?? 'Active Change';

  if (sceneKind === 'factory') {
    return [
      { label: 'SUNLIGHT', value: stepIdx >= 2 ? 'Shining' : 'Standby' },
      { label: 'CO₂ IN', value: stepIdx >= 0 ? '6CO₂ Ready' : 'Closed' },
      { label: 'O₂ OUT', value: stepIdx >= 6 ? '6O₂ Released' : effectLabel },
    ];
  }

  if (sceneKind === 'control_panel') {
    return [
      { label: 'RATE', value: `${measurementValue} bubbles/min` },
      { label: 'LIMITING FACTOR', value: effect === 'limiting_co2' ? 'CO₂' : effect === 'denaturation' ? 'Denatured' : 'Light / Temp' },
      { label: 'TEMP °C', value: stepIdx >= 7 ? '50 °C' : stepIdx >= 6 ? '35 °C' : '25 °C' },
    ];
  }

  if (sceneKind === 'microscope') {
    const objLabel =
      action === 'switch_objective' || action === 'focus_lens' || action === 'observe_sample'
        ? '40x Objective'
        : stepIdx >= 3
          ? '10x Objective'
          : '4x Objective';
    return [
      { label: 'OBJECTIVE', value: objLabel },
      { label: measurementLabel.toUpperCase(), value: metricText },
      { label: 'STAGE STATE', value: effectLabel },
    ];
  }

  if (sceneKind === 'process') {
    return [
      { label: measurementLabel.toUpperCase(), value: metricText },
      { label: 'ELAPSED', value: `${(stepIdx + 1) * 4} min` },
      { label: 'OBSERVATION', value: effectLabel },
    ];
  }

  return [
    { label: measurementLabel.toUpperCase(), value: metricText },
    { label: 'PHASE', value: `Stage ${stepIdx + 1}` },
    { label: 'PHYSIOLOGY', value: effectLabel },
  ];
}

export function sanitizeQuizQuestion(raw: unknown, index: number): QuizQuestion {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kind: QuizKind = pickEnum(obj.kind, QUIZ_KINDS, 'mcq');
  const rawOptions = Array.isArray(obj.options)
    ? obj.options
        .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
        .map((o) => o.trim().slice(0, 180))
    : [];

  const options =
    rawOptions.length >= 2
      ? rawOptions.slice(0, 4)
      : ['Cell membrane', 'Nucleus', 'Mitochondria', 'Chloroplast'];

  let correctIndex = Math.trunc(safeNumber(obj.correctIndex, 0));
  if (correctIndex < 0 || correctIndex >= options.length) {
    correctIndex = 0;
  }

  const question = safeString(
    obj.question,
    `Question ${index + 1}: Which biological structure plays the key role in this experiment?`,
    300,
  );

  const explanation = safeString(
    obj.explanation,
    'Review the science notes from the 3D biology lab to see how each structure works.',
    450,
  );

  const wordChips = Array.isArray(obj.wordChips)
    ? obj.wordChips
        .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
        .map((w) => w.trim())
        .slice(0, 6)
    : undefined;

  const blankAnswer =
    typeof obj.blankAnswer === 'string' && obj.blankAnswer.trim()
      ? obj.blankAnswer.trim()
      : options[correctIndex];

  return {
    id: safeString(obj.id, `q-${index + 1}`, 40),
    kind,
    question,
    options,
    correctIndex,
    explanation,
    sentenceWithBlank:
      kind === 'fill_blank'
        ? safeString(obj.sentenceWithBlank, `${question} Answer: _____`, 320)
        : undefined,
    blankAnswer: kind === 'fill_blank' ? blankAnswer : undefined,
    wordChips:
      kind === 'fill_blank'
        ? wordChips && wordChips.length >= 2
          ? Array.from(new Set([blankAnswer, ...wordChips])).slice(0, 5)
          : options
        : undefined,
    frontPrompt:
      kind === 'flashcard'
        ? safeString(obj.frontPrompt, question, 240)
        : undefined,
    backAnswer:
      kind === 'flashcard'
        ? safeString(obj.backAnswer, options[correctIndex] ?? explanation, 300)
        : undefined,
    diagramTitle:
      kind === 'label_diagram'
        ? safeString(obj.diagramTitle, 'Identify the highlighted biological structure', 160)
        : undefined,
    structureHint:
      kind === 'label_diagram'
        ? safeString(obj.structureHint, 'Look at its position and role described in the lab.', 200)
        : undefined,
  };
}

function sanitizeChallenges(raw: unknown): LabChallenge[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .slice(0, 4)
    .map((c, idx) => {
      const kind: ChallengeKind = pickEnum(c.kind, CHALLENGE_KINDS, 'predict');
      const rawOpts = Array.isArray(c.options)
        ? c.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0).slice(0, 4)
        : [];
      const options =
        rawOpts.length >= 2
          ? rawOpts
          : ['Increases steadily', 'Decreases sharply', 'Stays unchanged'];
      let correctIndex = Math.trunc(safeNumber(c.correctIndex, 0));
      if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;

      return {
        id: safeString(c.id, `challenge-${idx + 1}`, 40),
        kind,
        prompt: safeString(
          c.prompt,
          'Predict what will happen biologically in the next stage of this experiment:',
          280,
        ),
        options,
        correctIndex,
        explanation: safeString(
          c.explanation,
          'Observing variables helps connect cause and effect in living systems.',
          340,
        ),
        afterStep: Math.max(1, Math.trunc(safeNumber(c.afterStep, idx + 1))),
      };
    });
}

export function sanitizeBioExperiment(raw: unknown, classLevel = 8): BioExperiment {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const isBiology = typeof obj.isBiology === 'boolean' ? obj.isBiology : true;
  const sceneKind: SceneKind = pickEnum(obj.sceneKind, SCENE_KINDS, 'microscope');
  const difficulty: Difficulty = pickEnum(
    obj.difficulty,
    DIFFICULTIES,
    classLevel <= 7 ? 'Beginner' : 'Intermediate',
  );
  const topic: BioTopic = pickEnum(obj.topic, BIO_TOPICS, 'Cell Biology');
  const specimenPreset: SpecimenPreset = pickEnum(
    obj.specimenPreset,
    SPECIMEN_PRESETS,
    'generic_cells',
  );
  const anatomySystem: AnatomySystem = pickEnum(
    obj.anatomySystem,
    ANATOMY_SYSTEMS,
    'heart_circulation',
  );

  if (!isBiology) {
    return {
      isBiology: false,
      rejectionReason: safeString(
        obj.rejectionReason,
        'This video does not appear to cover a biology topic or experiment. Please try a biology video such as microscopy, plant physiology, genetics, or human anatomy.',
        500,
      ),
      sceneKind: 'microscope',
      specimenPreset: 'generic_cells',
      anatomySystem: 'heart_circulation',
      experimentTitle: safeString(obj.experimentTitle, 'Non-Biology Video', 120),
      slug: 'not-biology',
      level: `Class ${classLevel}`,
      difficulty,
      classRange: `Class ${classLevel}`,
      topic,
      storyHook: '',
      conceptSummary: '',
      safetyTip: 'Always verify your video source before starting a lab activity.',
      items: [],
      steps: [],
      challenges: [],
      observations: [],
      keyTerms: [],
      quiz: [],
    };
  }

  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const items: LabItem[] = rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .slice(0, 16)
    .map((item, idx) => {
      const fallbackKind = defaultItemKindForScene(sceneKind);
      const rawName = safeString(item.name, `Lab Tool ${idx + 1}`, 80);
      const rawLabel = safeString(item.label, rawName, 48);
      const pickedKind = pickEnum(item.kind, ITEM_KINDS, fallbackKind);
      const kind = inferItemKindFromLabel(rawLabel, sceneKind, pickedKind);
      // Enforce Rule 2: Microscopic organelles are never placed on the bench as raw objects in microscope mode
      const sanitizedName =
        sceneKind === 'microscope' && isMicroscopicOnlyName(rawName)
          ? 'Specimen Leaf Peel'
          : rawName;
      const sanitizedLabel =
        sceneKind === 'microscope' && isMicroscopicOnlyName(rawLabel)
          ? 'Specimen Peel'
          : rawLabel;

      const id = safeString(item.id, `item_${idx + 1}`, 48).replace(/[^a-zA-Z0-9_-]/g, '_');
      return {
        id,
        name: sanitizedName,
        kind: kind === 'safety_gear_box' || kind === 'hard_hat_box' ? fallbackKind : kind, // Step 0 is always spawned automatically
        color: safeHexColor(item.color, '#10b981'),
        label: sanitizedLabel,
        scientificName:
          typeof item.scientificName === 'string' && item.scientificName.trim()
            ? item.scientificName.trim().slice(0, 80)
            : undefined,
      };
    });

  const finalItems = items.length >= 2 ? items : defaultItemsForScene(sceneKind);
  const itemIds = new Set(finalItems.map((i) => i.id));
  const firstId = finalItems[0].id;
  const secondId = finalItems[1]?.id ?? firstId;

  const rawSteps = Array.isArray(obj.steps) ? obj.steps : [];
  const steps: LabStep[] = rawSteps
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
    .slice(0, 10)
    .map((s, idx) => {
      const m = (s.measurement && typeof s.measurement === 'object'
        ? s.measurement
        : {}) as Record<string, unknown>;
      const kt = (s.keyTerm && typeof s.keyTerm === 'object'
        ? s.keyTerm
        : {}) as Record<string, unknown>;
      const rawSource = safeString(s.sourceId, firstId, 48).replace(/[^a-zA-Z0-9_-]/g, '_');
      const rawTarget = safeString(s.targetId, secondId, 48).replace(/[^a-zA-Z0-9_-]/g, '_');
      const sourceId = itemIds.has(rawSource) ? rawSource : firstId;
      const targetId = itemIds.has(rawTarget) ? rawTarget : secondId;
      const action = pickEnum(s.action, STEP_ACTIONS, defaultActionForScene(sceneKind));
      const effect = pickEnum(s.effect, STEP_EFFECTS, 'highlight');
      const measurementLabel = safeString(m.label, 'Progress', 48);
      const measurementValue = safeNumber(m.value, (idx + 1) * 20);
      const measurementUnit = safeString(m.unit, '%', 24);
      const scienceNote = safeString(
        s.scienceNote ?? s.whyItHappens,
        'This step reveals key biological structure and function.',
        400,
      );

      const rawReadouts = Array.isArray(s.readouts)
        ? s.readouts
            .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
            .slice(0, 3)
            .map((r) => ({
              label: safeString(r.label, 'METRIC', 24).toUpperCase(),
              value: safeString(r.value, 'Active', 40),
            }))
        : [];

      const readouts =
        rawReadouts.length === 3
          ? rawReadouts
          : buildDefaultReadouts(
              sceneKind,
              idx,
              action,
              effect,
              measurementLabel,
              measurementValue,
              measurementUnit,
            );

      const rawControlValues =
        s.controlValues && typeof s.controlValues === 'object'
          ? (s.controlValues as Record<string, unknown>)
          : null;

      return {
        stepNumber: idx + 1,
        instruction: safeString(s.instruction, `Complete step ${idx + 1} of the biology procedure.`, 260),
        action,
        sourceId,
        targetId,
        effect,
        measurement: {
          label: measurementLabel,
          value: measurementValue,
          unit: measurementUnit,
        },
        whatHappened: safeString(
          s.whatHappened,
          safeString(s.instruction, 'You prepared and activated the biological specimen.', 260),
          320,
        ),
        whyItHappens: safeString(s.whyItHappens, scienceNote, 400),
        realLife: safeString(
          s.realLife,
          'Biologists use this exact technique in hospitals, botanical labs, and classrooms every day.',
          260,
        ),
        keyTerm: {
          term: safeString(kt.term, topic, 64),
          definition: safeString(
            kt.definition,
            'An essential concept observed during this biological investigation.',
            220,
          ),
        },
        miniDiagram: pickEnum(s.miniDiagram, MINI_DIAGRAMS, defaultDiagramForScene(sceneKind)),
        scienceNote,
        hint: safeString(
          s.hint,
          sourceId === targetId
            ? `Click ${finalItems.find((i) => i.id === sourceId)?.label ?? 'the highlighted equipment'}.`
            : `Click ${finalItems.find((i) => i.id === sourceId)?.label ?? 'the source item'} and then ${finalItems.find((i) => i.id === targetId)?.label ?? 'the target'}.`,
          220,
        ),
        readouts,
        controlValues: rawControlValues
          ? {
              light: safeNumber(rawControlValues.light, 50),
              co2: safeNumber(rawControlValues.co2, 0.04),
              temp: safeNumber(rawControlValues.temp, 25),
              label:
                typeof rawControlValues.label === 'string' && rawControlValues.label.trim()
                  ? rawControlValues.label.trim().slice(0, 48)
                  : undefined,
            }
          : undefined,
      };
    });

  const finalSteps: LabStep[] =
    steps.length > 0
      ? steps
      : [
          {
            stepNumber: 1,
            instruction: `Inspect ${finalItems[0].label} on the lab bench.`,
            action: defaultActionForScene(sceneKind),
            sourceId: firstId,
            targetId: secondId,
            effect: 'highlight',
            measurement: { label: 'Step', value: 1, unit: 'of 1' },
            whatHappened: `You examined ${finalItems[0].label} carefully on the bench.`,
            whyItHappens: 'Careful observation reveals the structure and function of living systems.',
            realLife: 'Scientists begin every investigation with close structural observation.',
            keyTerm: { term: topic, definition: 'Study of living organisms and their processes.' },
            miniDiagram: defaultDiagramForScene(sceneKind),
            scienceNote: 'Observe the biological specimen carefully.',
            hint: `Click ${finalItems[0].label} to inspect it.`,
            readouts: buildDefaultReadouts(sceneKind, 0, defaultActionForScene(sceneKind), 'highlight', 'Step', 1, 'of 1'),
          },
        ];

  const rawObs = Array.isArray(obj.observations) ? obj.observations : [];
  const observations: LabObservation[] = rawObs
    .filter((o): o is Record<string, unknown> => Boolean(o && typeof o === 'object'))
    .slice(0, 6)
    .map((o) => ({
      what: safeString(o.what, 'Clear structural changes become visible.', 260),
      why: safeString(o.why, 'Biological membranes and organelles respond to experimental conditions.', 320),
    }));

  if (observations.length === 0) {
    observations.push({
      what: 'Key cellular or physiological features become clearly distinguishable.',
      why: 'Controlled experimental setup isolates the biological mechanism.',
    });
  }

  const rawTerms = Array.isArray(obj.keyTerms) ? obj.keyTerms : [];
  const keyTerms: KeyTerm[] = rawTerms
    .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
    .slice(0, 8)
    .map((t) => ({
      term: safeString(t.term, 'Biological Structure', 64),
      definition: safeString(t.definition, 'A specialized component essential for living systems.', 220),
    }));

  const rawQuiz = Array.isArray(obj.quiz) ? obj.quiz : [];
  const quiz: QuizQuestion[] = rawQuiz
    .slice(0, 8)
    .map((q, idx) => sanitizeQuizQuestion(q, idx));

  const challenges = sanitizeChallenges(obj.challenges);

  const title = safeString(obj.experimentTitle, 'Interactive Biology Investigation', 120);
  const slug = safeString(
    obj.slug,
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bio-lab',
    80,
  );

  return {
    isBiology: true,
    sceneKind,
    specimenPreset,
    anatomySystem,
    experimentTitle: title,
    slug,
    level: safeString(obj.level, `Class ${classLevel}`, 32),
    difficulty,
    classRange: safeString(obj.classRange, `Class ${Math.max(4, classLevel - 1)}–${Math.min(12, classLevel + 1)}`, 32),
    topic,
    storyHook: safeString(
      obj.storyHook,
      `Investigate ${title} in the 3D virtual biology laboratory.`,
      260,
    ),
    conceptSummary: safeString(
      obj.conceptSummary,
      'Explore the biological mechanisms demonstrated in this video through an interactive 3D lab.',
      500,
    ),
    safetyTip: safeString(
      obj.safetyTip,
      'Put on gloves and lab coat before starting, and handle glass slides gently.',
      260,
    ),
    items: finalItems,
    steps: finalSteps,
    challenges,
    observations,
    keyTerms,
    quiz,
  };
}
