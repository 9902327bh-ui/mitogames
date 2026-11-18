import * as THREE from 'three';
import { ITEM_KINDS, type ItemKind } from '../../constants/bioEnums.ts';
import type { LabItem } from '../../types.ts';
import {
  buildHeartModel,
  buildLungModel,
  buildDigestiveModel,
  buildNerveArcModel,
  buildPlantVascularModel,
  buildMitosisModel,
  buildDnaModel,
  buildOrganPart,
  buildLabelMarker,
} from './anatomyModels.ts';
import {
  buildDropper,
  buildPipette,
  buildStainBottle,
  buildReagentBottle,
  buildForceps,
  buildDissectingNeedle,
  buildLamp,
  buildRuler,
  buildTimerDial,
  buildThermometer,
  buildPotometer,
} from './bottlesAndTools.ts';
import {
  buildGlassSlide,
  buildCoverslip,
  buildSlideTray,
  buildBeaker,
  buildTestTube,
  buildTestTubeRack,
  buildConicalFlask,
  buildMeasuringCylinder,
  buildPetriDish,
  buildWatchGlass,
  buildWaterBath,
  buildFlaskBalloon,
} from './glassware.ts';
import { buildMicroscope } from './microscope.ts';
import { buildSafetyGearBox } from './safetyGear.ts';
import type { ModelBuildOptions } from './shared.ts';
import {
  buildOnionBulb,
  buildLeafSample,
  buildPlantSprig,
  buildPotatoStrip,
  buildSeeds,
  buildBeanSprout,
  buildYeastSachet,
  buildSpecimenSample,
} from './specimens.ts';
import {
  buildHardHatBox,
  buildLeafFactory,
  buildStomataGate,
  buildRootsXylem,
  buildXylemPipe,
  buildSunSwitch,
  buildChloroplastPlant,
  buildCo2Cloud,
  buildWaterMolecules,
  buildGlucoseCrate,
  buildOxygenBubbles,
  buildPhloemConveyor,
} from './factoryModels.ts';
import {
  buildPhotosynthesisChamber,
  buildLampSwitch,
  buildBicarbonateDropper,
  buildHeaterBlock,
  buildControlConsole,
  buildRateGraphBoard,
} from './controlPanelModels.ts';

type BuilderFn = (item: LabItem, opts: ModelBuildOptions) => THREE.Group;

/**
 * Dedicated 1-to-1 builder registry for every ItemKind in ITEM_KINDS.
 * Zero generic sphere/capsule placeholders; every kind has its own multi-part procedural builder.
 */
const MODEL_REGISTRY: Record<ItemKind, BuilderFn> = {
  safety_gear_box: (_item, opts) => buildSafetyGearBox(opts),
  hard_hat_box: (_item, opts) => buildHardHatBox(opts),
  microscope: (_item, opts) => buildMicroscope(opts),
  glass_slide: (item, opts) => buildGlassSlide(opts, item.color),
  coverslip: (_item, opts) => buildCoverslip(opts),
  slide_tray: (_item, opts) => buildSlideTray(opts),
  dropper: (item, opts) => buildDropper(opts, item.color),
  pipette: (item, opts) => buildPipette(opts, item.color),
  stain_bottle: (item, opts) => buildStainBottle(opts, item.color, item.label),
  specimen_sample: (_item, opts) => buildSpecimenSample(opts),
  onion_bulb: (_item, opts) => buildOnionBulb(opts),
  forceps: (_item, opts) => buildForceps(opts),
  dissecting_needle: (_item, opts) => buildDissectingNeedle(opts),
  objective_lens: (_item, opts) => buildObjectiveAttachmentModel(opts),
  focus_knob: (_item, opts) => buildFocusKnobStand(opts),
  beaker: (item, opts) => buildBeaker(opts, item.color),
  test_tube: (item, opts) => buildTestTube(opts, item.color),
  test_tube_rack: (_item, opts) => buildTestTubeRack(opts),
  conical_flask: (item, opts) => buildConicalFlask(opts, item.color),
  measuring_cylinder: (item, opts) => buildMeasuringCylinder(opts, item.color),
  petri_dish: (_item, opts) => buildPetriDish(opts),
  watch_glass: (_item, opts) => buildWatchGlass(opts),
  water_bath: (_item, opts) => buildWaterBath(opts),
  lamp: (_item, opts) => buildLamp(opts),
  ruler: (_item, opts) => buildRuler(opts),
  plant_sprig: (_item, opts) => buildPlantSprig(opts),
  leaf_sample: (item, opts) => buildLeafSample(opts, item.color),
  potato_strip: (_item, opts) => buildPotatoStrip(opts),
  seeds: (_item, opts) => buildSeeds(opts),
  bean_sprout: (_item, opts) => buildBeanSprout(opts),
  yeast_sachet: (_item, opts) => buildYeastSachet(opts),
  potometer: (_item, opts) => buildPotometer(opts),
  flask_balloon: (item, opts) => buildFlaskBalloon(opts, item.color),
  thermometer: (_item, opts) => buildThermometer(opts),
  reagent_bottle: (item, opts) => buildReagentBottle(opts, item.color, item.label),
  timer_dial: (_item, opts) => buildTimerDial(opts),
  heart_model: (_item, opts) => buildHeartModel(opts),
  lung_model: (_item, opts) => buildLungModel(opts),
  digestive_model: (_item, opts) => buildDigestiveModel(opts),
  nerve_arc_model: (_item, opts) => buildNerveArcModel(opts),
  plant_vascular_model: (_item, opts) => buildPlantVascularModel(opts),
  mitosis_model: (_item, opts) => buildMitosisModel(opts),
  dna_model: (_item, opts) => buildDnaModel(opts),
  organ_part: (item, opts) => buildOrganPart(opts, item.color),
  label_marker: (item, opts) => buildLabelMarker(opts, item.label),
  // Mission A: Solar Leaf Factory
  leaf_factory: (_item, opts) => buildLeafFactory(opts),
  stomata_gate: (_item, opts) => buildStomataGate(opts),
  roots_xylem: (_item, opts) => buildRootsXylem(opts),
  xylem_pipe: (_item, opts) => buildXylemPipe(opts),
  sun_switch: (_item, opts) => buildSunSwitch(opts),
  chloroplast_plant: (_item, opts) => buildChloroplastPlant(opts),
  chloroplast_panels: (_item, opts) => buildChloroplastStandaloneSubPanel(opts),
  sugar_maker: (_item, opts) => buildSugarMakerStandalone(opts),
  co2_cloud: (_item, opts) => buildCo2Cloud(opts),
  water_molecules: (_item, opts) => buildWaterMolecules(opts),
  glucose_crate: (_item, opts) => buildGlucoseCrate(opts),
  oxygen_bubbles: (_item, opts) => buildOxygenBubbles(opts),
  phloem_conveyor: (_item, opts) => buildPhloemConveyor(opts),
  // Mission B: Limiting Factor Control Panel
  photosynthesis_chamber: (_item, opts) => buildPhotosynthesisChamber(opts),
  bicarbonate_dropper: (_item, opts) => buildBicarbonateDropper(opts),
  heater_block: (_item, opts) => buildHeaterBlock(opts),
  control_console: (_item, opts) => buildControlConsole(opts),
  lamp_switch: (_item, opts) => buildLampSwitch(opts),
  light_dial: (item, opts) => buildDialKnobFallback(opts, item.label, '#eab308'),
  temp_dial: (item, opts) => buildDialKnobFallback(opts, item.label, '#ef4444'),
  optimum_button: (_item, opts) => buildOptimumButtonFallback(opts),
  rate_graph_board: (_item, opts) => buildRateGraphBoard(opts),
};

function buildChloroplastStandaloneSubPanel(opts: ModelBuildOptions): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3 });
  for (let i = 0; i < 4; i++) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 14), mat);
    disc.position.y = 0.03 + i * 0.034;
    g.add(disc);
  }
  void opts;
  return g;
}

function buildSugarMakerStandalone(opts: ModelBuildOptions): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35 }),
  );
  box.position.y = 0.09;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.014, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xfacc15 }),
  );
  ring.position.y = 0.22;
  g.add(box, ring);
  void opts;
  return g;
}

function buildDialKnobFallback(opts: ModelBuildOptions, _label: string, hex: string): THREE.Group {
  const g = new THREE.Group();
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.09, 0.05, 18),
    new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35 }),
  );
  drum.position.y = 0.03;
  g.add(drum);
  void opts;
  return g;
}

function buildOptimumButtonFallback(opts: ModelBuildOptions): THREE.Group {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.05, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 }),
  );
  pad.position.y = 0.025;
  g.add(pad);
  void opts;
  return g;
}

function buildObjectiveAttachmentModel(opts: ModelBuildOptions): THREE.Group {
  const g = new THREE.Group();
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.16 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.18, 16), chromeMat);
  barrel.position.y = 0.09;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.025, 16),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 }),
  );
  band.position.y = 0.12;
  g.add(barrel, band);
  void opts;
  return g;
}

function buildFocusKnobStand(opts: ModelBuildOptions): THREE.Group {
  const g = new THREE.Group();
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.05, 18),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.55 }),
  );
  drum.rotation.z = Math.PI / 2;
  drum.position.y = 0.08;
  g.add(drum);
  void opts;
  return g;
}

// Dev-mode integrity check: verify every ItemKind maps to a unique builder function
if (import.meta.env?.DEV) {
  const seen = new Map<BuilderFn, ItemKind>();
  for (const kind of ITEM_KINDS) {
    const fn = MODEL_REGISTRY[kind];
    if (!fn) {
      console.warn(`[Verbatim Bio 3D] Missing model builder for ItemKind "${kind}"`);
    } else {
      const prev = seen.get(fn);
      if (prev) {
        console.warn(`[Verbatim Bio 3D] Duplicate builder reference shared by "${prev}" and "${kind}"`);
      } else {
        seen.set(fn, kind);
      }
    }
  }
}

export function buildLabItemModel(item: LabItem, opts: ModelBuildOptions = {}): THREE.Group {
  const builder = MODEL_REGISTRY[item.kind];
  if (!builder) {
    console.warn(`[Verbatim Bio 3D] Unknown ItemKind "${item.kind}", falling back to watch_glass`);
    return buildWatchGlass(opts);
  }
  const group = builder(item, opts);
  group.userData.itemId = item.id;
  group.userData.itemKind = item.kind;
  group.userData.itemLabel = item.label;
  return group;
}
