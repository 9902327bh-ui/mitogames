export const SCENE_KINDS = ['microscope', 'process', 'body_system', 'factory', 'control_panel'] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

export const DIFFICULTIES = ['Beginner', 'Intermediate'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const BIO_TOPICS = [
  'Cell Biology',
  'Plant Biology',
  'Human Physiology',
  'Genetics',
  'Ecology',
  'Microbiology',
] as const;
export type BioTopic = (typeof BIO_TOPICS)[number];

export const ITEM_KINDS = [
  // Safety gear (Step 0)
  'safety_gear_box',
  'hard_hat_box',
  // Microscope bench items
  'microscope',
  'glass_slide',
  'coverslip',
  'slide_tray',
  'dropper',
  'pipette',
  'stain_bottle',
  'specimen_sample',
  'onion_bulb',
  'forceps',
  'dissecting_needle',
  'objective_lens',
  'focus_knob',
  // Process lab bench items
  'beaker',
  'test_tube',
  'test_tube_rack',
  'conical_flask',
  'measuring_cylinder',
  'petri_dish',
  'watch_glass',
  'water_bath',
  'lamp',
  'ruler',
  'plant_sprig',
  'leaf_sample',
  'potato_strip',
  'seeds',
  'bean_sprout',
  'yeast_sachet',
  'potometer',
  'flask_balloon',
  'thermometer',
  'reagent_bottle',
  'timer_dial',
  // Body system / macro 3D anatomy & genetics models
  'heart_model',
  'lung_model',
  'digestive_model',
  'nerve_arc_model',
  'plant_vascular_model',
  'mitosis_model',
  'dna_model',
  'organ_part',
  'label_marker',
  // Mission A: Solar Leaf Factory items & interactive assemblies
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
  // Mission B: Limiting Factor Control Panel items & sub-controls
  'photosynthesis_chamber',
  'bicarbonate_dropper',
  'heater_block',
  'control_console',
  'lamp_switch',
  'light_dial',
  'temp_dial',
  'optimum_button',
  'rate_graph_board',
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/**
 * Microscopic organelles/structures MUST only appear inside the circular Cell View
 * viewport (EyepieceCanvas), NEVER as standalone 3D items on the lab bench.
 */
export const MICROSCOPIC_ONLY_TERMS = [
  'stomata',
  'stoma',
  'guard cell',
  'guard cells',
  'chloroplast',
  'chloroplasts',
  'thylakoid',
  'thylakoids',
  'grana',
  'granum',
  'nucleus',
  'nucleolus',
  'vacuole',
  'central vacuole',
  'cell wall',
  'mitochondria',
  'mitochondrion',
  'ribosome',
  'ribosomes',
  'endoplasmic reticulum',
  'golgi',
  'lysosome',
  'cytoplasm',
  'alveoli',
  'red blood cell',
  'white blood cell',
] as const;

export const STEP_ACTIONS = [
  // Canonical biological step actions
  'place_slide',
  'add_water',
  'add_stain',
  'place_coverslip',
  'switch_objective',
  'focus_lens',
  'observe_sample',
  'label_structure',
  // Process lab actions
  'place_specimen',
  'pour_solution',
  'add_reagent',
  'heat_sample',
  'set_light',
  'wait_timelapse',
  'measure_result',
  'record_data',
  // Body system actions
  'highlight_organ',
  'animate_flow',
  'attach_label',
  'advance_stage',
  'trigger_impulse',
  // Mission A & B photosynthesis actions
  'open_gate',
  'close_gate',
  'pump_water',
  'toggle_sun',
  'feed_plant',
  'split_water',
  'build_sugar',
  'release_oxygen',
  'ship_glucose',
  'set_dial',
  'warm_bath',
  'press_optimum',
] as const;
export type StepAction = (typeof STEP_ACTIONS)[number];

export const STEP_EFFECTS = [
  'none',
  'bubbles',
  'color_change',
  'cell_swell',
  'cell_shrink',
  'stain_absorb',
  'gas_balloon_inflate',
  'balloon_inflate',
  'growth',
  'flow_animation',
  'blood_flow',
  'mitosis_stage',
  'dna_unzip',
  'highlight',
  'lens_zoom',
  'lens_focus',
  'heat_glow',
  'label_snap',
  // Mission A & B effects
  'equation_co2',
  'equation_h2o',
  'light_beams',
  'chloroplast_glow',
  'water_split',
  'equation_glucose',
  'equation_o2',
  'fruit_swell',
  'equation_complete',
  'rate_update',
  'limiting_co2',
  'denaturation',
  'optimum_recovery',
] as const;
export type StepEffect = (typeof STEP_EFFECTS)[number];

export const MINI_DIAGRAMS = [
  'cell_wall_grid',
  'membrane_transport',
  'osmosis_water',
  'photosynthesis_eq',
  'fermentation_eq',
  'starch_iodine',
  'heart_double_loop',
  'alveoli_exchange',
  'mitosis_pmat',
  'xylem_transpiration',
  'dna_zipper',
  'enzyme_lock_key',
  'factory_equation',
  'limiting_factor_curve',
] as const;
export type MiniDiagramKind = (typeof MINI_DIAGRAMS)[number];

export const CHALLENGE_KINDS = [
  'predict',
  'label',
  'variables',
  'fix_mistake',
] as const;
export type ChallengeKind = (typeof CHALLENGE_KINDS)[number];

export const QUIZ_KINDS = [
  'mcq',
  'fill_blank',
  'flashcard',
  'label_diagram',
] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];

export const SUMMARY_LENGTHS = ['short', 'standard', 'detailed'] as const;
export type SummaryLength = (typeof SUMMARY_LENGTHS)[number];

export const SPECIMEN_PRESETS = [
  'onion_peel',
  'cheek_cells',
  'leaf_stomata',
  'pond_microbes',
  'blood_smear',
  'yeast_cells',
  'paramecium',
  'generic_cells',
] as const;
export type SpecimenPreset = (typeof SPECIMEN_PRESETS)[number];

export const ANATOMY_SYSTEMS = [
  'heart_circulation',
  'respiratory_lungs',
  'digestive_tract',
  'reflex_arc',
  'plant_vascular',
  'mitosis_stages',
  'dna_replication',
] as const;
export type AnatomySystem = (typeof ANATOMY_SYSTEMS)[number];

export const CLASS_LEVELS = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  { id: 'first_slide', name: 'First Slide', description: 'Complete your first microscope mission.' },
  { id: 'bubble_master', name: 'Bubble Master', description: 'Complete a photosynthesis or fermentation bubble lab.' },
  { id: 'osmosis_pro', name: 'Osmosis Pro', description: 'Master water movement across cell membranes.' },
  { id: 'heartbeat_hero', name: 'Heartbeat Hero', description: 'Complete a human physiology or circulation mission.' },
  { id: 'perfect_score', name: 'Perfect Score', description: 'Finish a lab mission with 100% accuracy.' },
  { id: 'no_hint_run', name: 'No-Hint Run', description: 'Complete a mission without using hints.' },
  { id: 'five_step_streak', name: '5-Step Streak', description: 'Reach a 5-step consecutive streak.' },
];

export const XP_RANKS = [
  { name: 'Cell Explorer', minXp: 0 },
  { name: 'Tissue Tracker', minXp: 250 },
  { name: 'Organ Expert', minXp: 650 },
  { name: 'Bio Master', minXp: 1200 },
] as const;

export function getXpRank(xp: number): { name: string; nextMinXp: number | null; progressPct: number } {
  let currentIdx = 0;
  for (let i = 0; i < XP_RANKS.length; i++) {
    if (xp >= XP_RANKS[i].minXp) currentIdx = i;
  }
  const current = XP_RANKS[currentIdx];
  const next = XP_RANKS[currentIdx + 1] ?? null;
  if (!next) {
    return { name: current.name, nextMinXp: null, progressPct: 100 };
  }
  const span = next.minXp - current.minXp;
  const progressPct = Math.min(100, Math.max(0, Math.round(((xp - current.minXp) / span) * 100)));
  return { name: current.name, nextMinXp: next.minXp, progressPct };
}

export function getReadingTier(classLevel: number): 'simple' | 'standard' | 'advanced' {
  if (classLevel <= 7) return 'simple';
  if (classLevel <= 10) return 'standard';
  return 'advanced';
}
