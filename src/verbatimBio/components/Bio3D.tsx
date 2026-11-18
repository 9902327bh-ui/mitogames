import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Lightbulb,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createBiologyRenderPipeline,
  createContactShadowResources,
  disposeSceneResources,
} from '../../three/render.ts';
import { createBiologyMaterialLibrary } from '../../three/materials.ts';
import type { ItemKind, StepAction } from '../constants/bioEnums.ts';
import { createLabRoom, type LabRoomHandle } from '../three/LabRoom.ts';
import { buildLabItemModel } from '../three/models/index.ts';
import type { MicroscopeRefs } from '../three/models/microscope.ts';
import {
  drawEquationBoardCanvas,
  type EquationState,
} from '../three/models/factoryModels.ts';
import {
  drawConsoleDisplayCanvas,
  drawRateGraphCanvas,
} from '../three/models/controlPanelModels.ts';
import { LabParticleSystem } from '../three/particles.ts';
import { CameraDollyController, Easings, TweenManager } from '../three/tween.ts';
import type {
  BioExperiment,
  KeyTerm,
  LabCompletionResult,
  LabItem,
  LabStep,
} from '../types.ts';
import { labAudio } from '../utils/labAudio.ts';
import {
  computePhotosynthesisRate,
  type PhotosynthesisReading,
} from '../utils/photosynthesisRate.ts';
import { MiniDiagram } from './game/MiniDiagram.tsx';
import { EyepieceCanvas } from './labs/EyepieceCanvas.tsx';
import { LabHandCursor } from './LabHandCursor.tsx';

export type LabPhase =
  | 'safety_gear'
  | 'awaiting_source'
  | 'awaiting_target'
  | 'animating'
  | 'science_note'
  | 'completed';

interface Bio3DProps {
  experiment: BioExperiment;
  studentBadges: string[];
  onMissionComplete: (result: LabCompletionResult) => void;
  onGoToQuiz: () => void;
  onNextVideo: () => void;
}

const SINGLE_CLICK_ACTIONS = new Set<StepAction>([
  'switch_objective',
  'focus_lens',
  'observe_sample',
  'heat_sample',
  'set_light',
  'wait_timelapse',
  'measure_result',
  'record_data',
  'highlight_organ',
  'advance_stage',
  'trigger_impulse',
  'toggle_sun',
  'split_water',
  'build_sugar',
  'close_gate',
  'set_dial',
  'press_optimum',
]);

function detectSoftwareWebGL(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const str = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
      if (str.includes('swiftshader') || str.includes('llvmpipe') || str.includes('software')) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

function computeBenchLayout(
  items: LabItem[],
  sceneKind: string,
): Map<string, THREE.Vector3> {
  const positions = new Map<string, THREE.Vector3>();
  const placed: THREE.Vector3[] = [];
  let hasCenterpiece = false;

  const isFree = (candidate: THREE.Vector3, minDist = 0.48) =>
    placed.every((p) => Math.hypot(p.x - candidate.x, p.z - candidate.z) >= minDist);

  const fallbackSlots: THREE.Vector3[] = [
    new THREE.Vector3(-1.32, 0, 0.35),
    new THREE.Vector3(-0.78, 0, 0.58),
    new THREE.Vector3(-0.22, 0, 0.65),
    new THREE.Vector3(0.45, 0, 0.62),
    new THREE.Vector3(1.05, 0, 0.48),
    new THREE.Vector3(1.52, 0, 0.25),
    new THREE.Vector3(-1.62, 0, -0.18),
    new THREE.Vector3(1.38, 0, -0.28),
    new THREE.Vector3(-0.92, 0, -0.35),
    new THREE.Vector3(0.75, 0, -0.38),
  ];

  const assignPreferred = (pref: THREE.Vector3): THREE.Vector3 => {
    if (isFree(pref, 0.42)) {
      placed.push(pref);
      return pref;
    }
    const open = fallbackSlots.find((s) => isFree(s, 0.44));
    const chosen = (open ?? pref.clone().add(new THREE.Vector3(placed.length * 0.45, 0, 0.2))).clone();
    placed.push(chosen);
    return chosen;
  };

  items.forEach((item) => {
    let preferred: THREE.Vector3 | null = null;

    if (item.kind === 'safety_gear_box' || item.kind === 'hard_hat_box') {
      preferred =
        sceneKind === 'factory' || sceneKind === 'control_panel'
          ? new THREE.Vector3(-1.82, 0.0, 0.36)
          : new THREE.Vector3(-1.78, 0.0, -0.32);
    } else if (sceneKind === 'factory') {
      if (item.kind === 'leaf_factory') preferred = new THREE.Vector3(0.0, 0.0, -0.22);
      else if (item.kind === 'sun_switch') preferred = new THREE.Vector3(-1.42, 0.0, -0.35);
      else if (item.kind === 'roots_xylem') preferred = new THREE.Vector3(-1.12, 0.0, 0.58);
      else if (item.kind === 'xylem_pipe') preferred = new THREE.Vector3(-0.76, 0.0, 0.18);
      else if (item.kind === 'co2_cloud') preferred = new THREE.Vector3(-0.34, 0.0, 0.72);
      else if (item.kind === 'stomata_gate') preferred = new THREE.Vector3(-0.08, 0.0, 0.32);
      else if (item.kind === 'water_molecules') preferred = new THREE.Vector3(0.32, 0.0, 0.74);
      else if (item.kind === 'chloroplast_plant') preferred = new THREE.Vector3(0.3, 0.0, -0.06);
      else if (item.kind === 'oxygen_bubbles') preferred = new THREE.Vector3(0.78, 0.0, 0.7);
      else if (item.kind === 'glucose_crate') preferred = new THREE.Vector3(0.88, 0.0, 0.28);
      else if (item.kind === 'phloem_conveyor') preferred = new THREE.Vector3(1.36, 0.0, 0.44);
    } else if (sceneKind === 'control_panel') {
      if (item.kind === 'lamp_switch') preferred = new THREE.Vector3(-1.18, 0.0, -0.08);
      else if (item.kind === 'photosynthesis_chamber') preferred = new THREE.Vector3(-0.32, 0.0, -0.14);
      else if (item.kind === 'plant_sprig') preferred = new THREE.Vector3(-0.88, 0.0, 0.56);
      else if (item.kind === 'bicarbonate_dropper') preferred = new THREE.Vector3(-1.42, 0.0, 0.52);
      else if (item.kind === 'heater_block') preferred = new THREE.Vector3(0.42, 0.0, -0.24);
      else if (item.kind === 'rate_graph_board') preferred = new THREE.Vector3(1.24, 0.0, -0.58);
      else if (item.kind === 'control_console') preferred = new THREE.Vector3(0.46, 0.0, 0.48);
    } else if (sceneKind === 'microscope') {
      if (item.kind === 'microscope') preferred = new THREE.Vector3(0.12, 0.0, -0.28);
      else if (item.kind === 'objective_lens') preferred = new THREE.Vector3(0.95, 0.0, -0.32);
      else if (item.kind === 'focus_knob') preferred = new THREE.Vector3(-0.72, 0.0, -0.32);
      else if (item.kind === 'glass_slide') preferred = new THREE.Vector3(-0.95, 0.0, 0.15);
      else if (
        item.kind === 'specimen_sample' ||
        item.kind === 'onion_bulb' ||
        item.kind === 'leaf_sample'
      ) {
        preferred = new THREE.Vector3(-0.38, 0.0, 0.42);
      } else if (item.kind === 'dropper' || item.kind === 'pipette') {
        preferred = new THREE.Vector3(0.88, 0.0, 0.35);
      } else if (item.kind === 'stain_bottle') {
        preferred = new THREE.Vector3(1.48, 0.0, 0.18);
      } else if (item.kind === 'coverslip') {
        preferred = new THREE.Vector3(-1.42, 0.0, 0.02);
      }
    } else if (sceneKind === 'process') {
      if (
        !hasCenterpiece &&
        (item.kind === 'beaker' || item.kind === 'flask_balloon' || item.kind === 'conical_flask')
      ) {
        hasCenterpiece = true;
        preferred = new THREE.Vector3(0.05, 0.0, 0.05);
      } else if (item.kind === 'water_bath') {
        preferred = new THREE.Vector3(0.88, 0.0, -0.25);
      } else if (item.kind === 'lamp') {
        preferred = new THREE.Vector3(-1.18, 0.0, -0.15);
      } else if (item.kind === 'ruler') {
        preferred = new THREE.Vector3(-0.58, 0.0, 0.65);
      } else if (item.kind === 'timer_dial') {
        preferred = new THREE.Vector3(1.5, 0.0, 0.35);
      } else if (item.kind === 'thermometer') {
        preferred = new THREE.Vector3(0.92, 0.0, 0.58);
      } else if (item.kind === 'beaker') {
        preferred = new THREE.Vector3(-0.92, 0.0, 0.35);
      }
    } else if (sceneKind === 'body_system') {
      if (
        !hasCenterpiece &&
        (item.kind === 'heart_model' ||
          item.kind === 'lung_model' ||
          item.kind === 'digestive_model' ||
          item.kind === 'nerve_arc_model' ||
          item.kind === 'plant_vascular_model' ||
          item.kind === 'mitosis_model' ||
          item.kind === 'dna_model')
      ) {
        hasCenterpiece = true;
        preferred = new THREE.Vector3(0, 0.0, -0.15);
      } else if (item.kind === 'lung_model') {
        preferred = new THREE.Vector3(0.95, 0.0, -0.22);
      }
    }

    const pos = assignPreferred(preferred ?? fallbackSlots[0]);
    positions.set(item.id, pos);
  });

  return positions;
}

function formatClockTime(completedSteps: number): string {
  const totalMinutes = 8 * 60 + 4 + completedSteps * 4;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const h12 = hrs > 12 ? hrs - 12 : hrs;
  return `DAY 1  ${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
}

export const Bio3D: React.FC<Bio3DProps> = ({
  experiment,
  studentBadges,
  onMissionComplete,
  onGoToQuiz,
  onNextVideo,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Core game state machine
  const [phase, setPhase] = useState<LabPhase>('safety_gear');
  const [stepIndex, setStepIndex] = useState(0);
  const [rightClicks, setRightClicks] = useState(0);
  const [wrongClicks, setWrongClicks] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; kind: 'error' | 'info' } | null>(null);
  const [glovesOn, setGlovesOn] = useState(false);
  const [safetyDone, setSafetyDone] = useState(false);
  const [muted, setMuted] = useState(labAudio.muted);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [completionResult, setCompletionResult] = useState<LabCompletionResult | null>(null);

  // Microscope optical viewport states
  const [showCellViewModal, setShowCellViewModal] = useState(false);
  const [eyepieceZoom, setEyepieceZoom] = useState(40);
  const [eyepieceStained, setEyepieceStained] = useState(false);
  const [eyepieceStainColor, setEyepieceStainColor] = useState('#d97706');
  const [eyepieceFocused, setEyepieceFocused] = useState(false);

  // Live readings for control_panel completion modal
  const [rateReadings, setRateReadings] = useState<PhotosynthesisReading[]>([]);
  const rateReadingsRef = useRef<PhotosynthesisReading[]>([]);

  // Live simulation states reflected in tick()
  const simStateRef = useRef({
    bubbleRate: 0,
    bubblePos: new THREE.Vector3(0.05, 0.14, 0.05),
    steamRate: 0,
    steamPos: new THREE.Vector3(0.85, 0.32, -0.25),
    xylemRate: 0,
    xylemBeadsActive: false,
    conveyorActive: false,
    bloodFlowActive: false,
    heartbeatRate: 0,
    lungBreathing: false,
    mitosisPhase: 0,
    slideMounted: false,
    eqState: {
      co2: false,
      h2o: false,
      light: false,
      glucose: false,
      o2: false,
      completeGold: false,
    } as EquationState,
    controlState: {
      light: 0,
      co2: 0.04,
      temp: 25,
      rate: 0,
      limitingFactor: 'Light',
    },
  });

  // Synchronized refs for Three.js raycasting loop
  const phaseRef = useRef<LabPhase>(phase);
  phaseRef.current = phase;
  const stepIndexRef = useRef<number>(stepIndex);
  stepIndexRef.current = stepIndex;

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    room: LabRoomHandle;
    tweens: TweenManager;
    dolly: CameraDollyController;
    particles: LabParticleSystem;
    itemGroups: Map<string, THREE.Group>;
    subTargetObjects: Map<string, THREE.Object3D>;
    basePositions: Map<string, THREE.Vector3>;
    arrowIndicator: THREE.Group;
    highlightRing: THREE.Mesh;
    dropperStream: THREE.Mesh;
  } | null>(null);

  const currentStep: LabStep | undefined = experiment.steps[stepIndex];

  const allItemsWithSafety = useMemo<LabItem[]>(() => {
    const isFactory = experiment.sceneKind === 'factory';
    const isControl = experiment.sceneKind === 'control_panel';
    const safetyItem: LabItem = {
      id: '__safety_gear__',
      name: isFactory
        ? 'Yellow Safety Hard Hat Box'
        : isControl
          ? 'Lab Coat & Safety Goggles Box'
          : 'Safety Gloves & Lab Coat Box',
      kind: isFactory ? 'hard_hat_box' : 'safety_gear_box',
      color: isFactory ? '#eab308' : '#0d9488',
      label: isFactory ? 'Hard Hat Box' : isControl ? 'Coat & Goggles Box' : 'Gloves & Coat Box',
    };
    return [safetyItem, ...experiment.items];
  }, [experiment.items, experiment.sceneKind]);

  const showToast = useCallback((text: string, kind: 'error' | 'info' = 'error') => {
    setToastMsg({ text, kind });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 2400);
  }, []);

  const resetExperiment = useCallback(() => {
    labAudio.playClick();
    setPhase('safety_gear');
    setStepIndex(0);
    setRightClicks(0);
    setWrongClicks(0);
    setUsedHint(false);
    setHintVisible(false);
    setGlovesOn(false);
    setSafetyDone(false);
    setSelectedSourceId(null);
    setCompletionResult(null);
    setShowCellViewModal(false);
    setEyepieceZoom(40);
    setEyepieceStained(false);
    setEyepieceFocused(false);
    setRateReadings([]);
    rateReadingsRef.current = [];
    simStateRef.current = {
      bubbleRate: 0,
      bubblePos: new THREE.Vector3(0.05, 0.14, 0.05),
      steamRate: 0,
      steamPos: new THREE.Vector3(0.85, 0.32, -0.25),
      xylemRate: 0,
      xylemBeadsActive: false,
      conveyorActive: false,
      bloodFlowActive: false,
      heartbeatRate: 0,
      lungBreathing: false,
      mitosisPhase: 0,
      slideMounted: false,
      eqState: { co2: false, h2o: false, light: false, glucose: false, o2: false, completeGold: false },
      controlState: { light: 0, co2: 0.04, temp: 25, rate: 0, limitingFactor: 'Light' },
    };

    // Reset 3D mesh positions/visibility
    const refs = sceneRefs.current;
    if (refs) {
      refs.tweens.clear();
      refs.itemGroups.forEach((grp, id) => {
        grp.visible = true;
        grp.scale.set(1, 1, 1);
        grp.rotation.set(0, 0, 0);
        const base = refs.basePositions.get(id);
        if (base) grp.position.copy(base);
        const microRefs = grp.userData.microscopeRefs as MicroscopeRefs | undefined;
        if (microRefs) {
          microRefs.stageSlideGroup.visible = false;
          microRefs.stageLiquidDrop.visible = false;
          microRefs.stageCoverslip.visible = false;
          microRefs.turretGroup.rotation.y = 0;
        }
        if (grp.userData.balloonBulb instanceof THREE.Mesh) {
          grp.userData.balloonBulb.scale.set(0.55, 0.25, 0.45);
        }
        if (grp.userData.foamMesh instanceof THREE.Mesh) {
          grp.userData.foamMesh.visible = false;
        }
        if (grp.userData.lightConeMat instanceof THREE.MeshBasicMaterial) {
          grp.userData.lightConeMat.opacity = 0;
        }
        if (grp.userData.bulbMat instanceof THREE.MeshStandardMaterial) {
          grp.userData.bulbMat.emissiveIntensity = 0.15;
        }
        if (grp.userData.leftGuardPivot instanceof THREE.Group && grp.userData.rightGuardPivot instanceof THREE.Group) {
          grp.userData.leftGuardPivot.rotation.y = 0;
          grp.userData.rightGuardPivot.rotation.y = 0;
        }
        if (grp.userData.beamMat instanceof THREE.MeshBasicMaterial) {
          grp.userData.beamMat.opacity = 0;
        }
        if (grp.userData.sunMat instanceof THREE.MeshStandardMaterial) {
          grp.userData.sunMat.emissiveIntensity = 0.35;
        }
        if (Array.isArray(grp.userData.waterBeads)) {
          (grp.userData.waterBeads as THREE.Mesh[]).forEach((b) => {
            b.visible = false;
          });
        }
        if (grp.userData.fruitStorage instanceof THREE.Group) {
          grp.userData.fruitStorage.scale.setScalar(1);
        }
        if (grp.userData.rootStorage instanceof THREE.Group) {
          grp.userData.rootStorage.scale.setScalar(1);
        }
        if (grp.userData.eqCanvas instanceof HTMLCanvasElement && grp.userData.eqTex instanceof THREE.CanvasTexture) {
          drawEquationBoardCanvas(grp.userData.eqCanvas, simStateRef.current.eqState);
          grp.userData.eqTex.needsUpdate = true;
        }
        if (grp.userData.submergedWeed instanceof THREE.Group) {
          grp.userData.submergedWeed.visible = false;
        }
        if (grp.userData.weedLeafMat instanceof THREE.MeshStandardMaterial) {
          grp.userData.weedLeafMat.color.setHex(0x22c55e);
        }
        if (grp.userData.heaterPlateMat instanceof THREE.MeshStandardMaterial) {
          grp.userData.heaterPlateMat.emissiveIntensity = 0.15;
        }
        if (grp.userData.graphCanvas instanceof HTMLCanvasElement && grp.userData.graphTex instanceof THREE.CanvasTexture) {
          drawRateGraphCanvas(grp.userData.graphCanvas, []);
          grp.userData.graphTex.needsUpdate = true;
        }
        if (grp.userData.consoleCanvas instanceof HTMLCanvasElement && grp.userData.consoleTex instanceof THREE.CanvasTexture) {
          drawConsoleDisplayCanvas(grp.userData.consoleCanvas, simStateRef.current.controlState);
          grp.userData.consoleTex.needsUpdate = true;
        }
        if (grp.userData.lightPointer instanceof THREE.Group) grp.userData.lightPointer.rotation.y = 0;
        if (grp.userData.co2Pointer instanceof THREE.Group) grp.userData.co2Pointer.rotation.y = 0;
        if (grp.userData.tempPointer instanceof THREE.Group) grp.userData.tempPointer.rotation.y = 0;
      });
      refs.dolly.dollyTo(new THREE.Vector3(0, 1.88, 3.88), new THREE.Vector3(0, 0.44, -0.05), 0.7);
    }
  }, []);

  // Reset when switching experiments
  useEffect(() => {
    resetExperiment();
  }, [experiment.slug, resetExperiment]);

  const finishMission = useCallback(
    (finalRight: number, finalWrong: number) => {
      labAudio.playVictory();
      const total = Math.max(1, finalRight + finalWrong);
      const accuracyPct = Math.round((finalRight / total) * 100);
      const labPointsAwarded = accuracyPct + 20 * experiment.steps.length;
      const stars = accuracyPct >= 90 ? 3 : accuracyPct >= 70 ? 2 : 1;

      const unlocked: string[] = [];
      const addBadge = (id: string) => {
        if (!studentBadges.includes(id) && !unlocked.includes(id)) unlocked.push(id);
      };
      if (experiment.sceneKind === 'microscope') addBadge('first_slide');
      if (
        experiment.slug.includes('photosynthesis') ||
        experiment.slug.includes('yeast')
      ) {
        addBadge('bubble_master');
      }
      if (experiment.slug.includes('osmosis')) addBadge('osmosis_pro');
      if (experiment.sceneKind === 'body_system') addBadge('heartbeat_hero');
      if (accuracyPct === 100) addBadge('perfect_score');
      if (!usedHint) addBadge('no_hint_run');

      const collectedTerms: KeyTerm[] = [
        ...experiment.keyTerms,
        ...experiment.steps.map((s) => s.keyTerm),
      ];

      const res: LabCompletionResult = {
        accuracyPct,
        rightClicks: finalRight,
        wrongClicks: finalWrong,
        labPointsAwarded,
        stars,
        newlyUnlockedBadges: unlocked,
        collectedTerms,
      };
      setCompletionResult(res);
      setPhase('completed');
      onMissionComplete(res);

      const refs = sceneRefs.current;
      if (refs) {
        refs.particles.emit('sparkle', new THREE.Vector3(0, 0.65, 0), 26, 0.85);
      }
    },
    [experiment, onMissionComplete, studentBadges, usedHint],
  );

  // Trigger bespoke 2-4s animation for a given step
  const playStepAnimation = useCallback(
    (step: LabStep) => {
      const refs = sceneRefs.current;
      if (!refs) {
        setPhase('science_note');
        return;
      }

      setPhase('animating');
      setHintVisible(false);
      setSelectedSourceId(null);

      const sourceGrp = refs.itemGroups.get(step.sourceId);
      const targetObj =
        refs.subTargetObjects.get(step.targetId) ?? refs.itemGroups.get(step.targetId);
      const targetGrp = refs.itemGroups.get(step.targetId);
      const sourceBase = refs.basePositions.get(step.sourceId) ?? new THREE.Vector3();
      const targetBase = new THREE.Vector3();
      if (targetObj) {
        targetObj.getWorldPosition(targetBase);
      } else {
        targetBase.copy(refs.basePositions.get(step.targetId) ?? new THREE.Vector3());
      }

      // Find microscope group if scene is microscope
      let microGrp: THREE.Group | undefined;
      refs.itemGroups.forEach((grp) => {
        if (grp.userData.itemKind === 'microscope') microGrp = grp;
      });
      const microRefs = microGrp?.userData.microscopeRefs as MicroscopeRefs | undefined;

      // Dolly camera smoothly toward target area
      const focusTarget = targetBase.clone().add(new THREE.Vector3(0, 0.3, 0));
      const focusCamPos = focusTarget.clone().add(new THREE.Vector3(0.32, 1.25, 2.35));
      refs.dolly.dollyTo(focusCamPos, focusTarget, 0.9);

      const action = step.action;
      const effect = step.effect;
      let animDuration = 2.1;

      const findByKind = (kind: ItemKind): THREE.Group | undefined => {
        let found: THREE.Group | undefined;
        refs.itemGroups.forEach((g) => {
          if (g.userData.itemKind === kind) found = g;
        });
        return found;
      };

      const refreshFactoryBoard = () => {
        const lf = findByKind('leaf_factory');
        if (
          lf &&
          lf.userData.eqCanvas instanceof HTMLCanvasElement &&
          lf.userData.eqTex instanceof THREE.CanvasTexture
        ) {
          drawEquationBoardCanvas(lf.userData.eqCanvas, simStateRef.current.eqState);
          lf.userData.eqTex.needsUpdate = true;
        }
      };

      const recordControlReading = (
        light: number,
        co2: number,
        temp: number,
        labelOverride?: string,
      ) => {
        const res = computePhotosynthesisRate(light, co2, temp);
        const limitingFactor = labelOverride ?? res.limitingFactor;
        simStateRef.current.controlState = {
          light,
          co2,
          temp,
          rate: res.rate,
          limitingFactor,
        };
        const reading: PhotosynthesisReading = {
          step: step.stepNumber,
          label: labelOverride || `Step ${step.stepNumber}`,
          light,
          co2,
          temp,
          rate: res.rate,
          limitingFactor,
        };
        const nextList = [...rateReadingsRef.current, reading];
        rateReadingsRef.current = nextList;
        setRateReadings(nextList);

        const consoleGrp = findByKind('control_console');
        if (consoleGrp) {
          if (
            consoleGrp.userData.consoleCanvas instanceof HTMLCanvasElement &&
            consoleGrp.userData.consoleTex instanceof THREE.CanvasTexture
          ) {
            drawConsoleDisplayCanvas(consoleGrp.userData.consoleCanvas, simStateRef.current.controlState);
            consoleGrp.userData.consoleTex.needsUpdate = true;
          }
          if (consoleGrp.userData.lightPointer instanceof THREE.Group) {
            consoleGrp.userData.lightPointer.rotation.y = -(light / 250) * 2.1 + 0.9;
          }
          if (consoleGrp.userData.co2Pointer instanceof THREE.Group) {
            consoleGrp.userData.co2Pointer.rotation.y = -((co2 - 0.04) / 0.16) * 2.0 + 0.9;
          }
          if (consoleGrp.userData.tempPointer instanceof THREE.Group) {
            consoleGrp.userData.tempPointer.rotation.y = -((temp - 20) / 35) * 2.1 + 0.9;
          }
        }

        const graphGrp = findByKind('rate_graph_board');
        if (
          graphGrp &&
          graphGrp.userData.graphCanvas instanceof HTMLCanvasElement &&
          graphGrp.userData.graphTex instanceof THREE.CanvasTexture
        ) {
          drawRateGraphCanvas(graphGrp.userData.graphCanvas, nextList);
          graphGrp.userData.graphTex.needsUpdate = true;
        }

        const chamberGrp = findByKind('photosynthesis_chamber');
        if (chamberGrp) {
          const worldC = new THREE.Vector3();
          chamberGrp.getWorldPosition(worldC);
          simStateRef.current.bubblePos.copy(worldC).add(new THREE.Vector3(0, 0.56, 0));
          simStateRef.current.bubbleRate = Math.max(0.4, res.rate / 7.2);
          if (chamberGrp.userData.weedLeafMat instanceof THREE.MeshStandardMaterial) {
            chamberGrp.userData.weedLeafMat.color.setHex(temp >= 45 ? 0xd9f99d : 0x22c55e);
          }
        }
        const heaterGrp = findByKind('heater_block');
        if (heaterGrp) {
          const worldH = new THREE.Vector3();
          heaterGrp.getWorldPosition(worldH);
          simStateRef.current.steamPos.copy(worldH).add(new THREE.Vector3(0, 0.24, 0));
          simStateRef.current.steamRate = temp >= 34 ? (temp >= 45 ? 3.5 : 1.8) : 0;
          if (heaterGrp.userData.heaterPlateMat instanceof THREE.MeshStandardMaterial) {
            heaterGrp.userData.heaterPlateMat.emissiveIntensity = temp >= 45 ? 1.15 : temp >= 34 ? 0.65 : 0.15;
          }
        }
      };

      if (action === 'place_slide' && sourceGrp && microGrp && microRefs) {
        animDuration = 2.3;
        const stageWorld = microGrp.position.clone().add(new THREE.Vector3(0, 0.56, 0.12));
        refs.tweens.add({
          duration: 0.75,
          ease: Easings.easeOutBack,
          onStart: () => labAudio.playGlassClink(),
          onUpdate: (p) => {
            sourceGrp.position.y = sourceBase.y + p * 0.48;
          },
          onComplete: () => {
            refs.tweens.add({
              duration: 1.0,
              ease: Easings.easeInOutCubic,
              onUpdate: (p) => {
                sourceGrp.position.lerpVectors(
                  new THREE.Vector3(sourceBase.x, sourceBase.y + 0.48, sourceBase.z),
                  stageWorld,
                  p,
                );
              },
              onComplete: () => {
                labAudio.playClipSnap();
                sourceGrp.visible = false;
                microRefs.stageSlideGroup.visible = true;
                simStateRef.current.slideMounted = true;
              },
            });
          },
        });
      } else if ((action === 'add_water' || action === 'add_stain') && sourceGrp) {
        animDuration = 2.6;
        if (action === 'add_water') {
          refs.room.setFaucetRunning(true);
          refs.tweens.after(2.0, () => refs.room.setFaucetRunning(false));
        }
        const dropTarget =
          simStateRef.current.slideMounted && microGrp
            ? microGrp.position.clone().add(new THREE.Vector3(0, 0.68, 0.12))
            : targetBase.clone().add(new THREE.Vector3(0, 0.48, 0));
        const bottleItem = experiment.items.find((i) => i.id === step.sourceId);
        const dropHex = action === 'add_stain' ? bottleItem?.color || '#d97706' : '#38bdf8';
        const dropColorNum = new THREE.Color(dropHex).getHex();

        refs.tweens.add({
          duration: 0.8,
          ease: Easings.easeInOutCubic,
          onStart: () => labAudio.playGlassClink(),
          onUpdate: (p) => {
            sourceGrp.position.lerpVectors(
              sourceBase,
              new THREE.Vector3(dropTarget.x, dropTarget.y + 0.15, dropTarget.z),
              p,
            );
            sourceGrp.rotation.z = p * 0.45;
          },
          onComplete: () => {
            labAudio.playSqueeze();
            refs.tweens.after(0.18, () => {
              labAudio.playDrip();
              refs.particles.emit('droplet', dropTarget.clone().add(new THREE.Vector3(0, -0.05, 0)), 8, 0.04, dropColorNum);
              if (microRefs && simStateRef.current.slideMounted) {
                microRefs.stageLiquidDrop.visible = true;
                const mat = microRefs.stageLiquidDrop.material as THREE.MeshStandardMaterial;
                mat.color.setHex(dropColorNum);
                microRefs.stageLiquidDrop.scale.set(0.3, 1, 0.3);
                refs.tweens.add({
                  duration: 1.0,
                  ease: Easings.easeOutCubic,
                  onUpdate: (p) => {
                    const s = 0.3 + p * 0.85;
                    microRefs.stageLiquidDrop.scale.set(s, 1, s);
                  },
                });
              }
              if (action === 'add_stain') {
                setEyepieceStained(true);
                setEyepieceStainColor(dropHex);
                // Also tint target leaf or peel if visible
                if (targetGrp?.userData.leafMat instanceof THREE.MeshStandardMaterial) {
                  targetGrp.userData.leafMat.color.set(dropHex);
                }
              }
            });
            refs.tweens.add({
              delay: 0.65,
              duration: 0.75,
              ease: Easings.easeInOutCubic,
              onUpdate: (p) => {
                sourceGrp.position.lerpVectors(
                  new THREE.Vector3(dropTarget.x, dropTarget.y + 0.15, dropTarget.z),
                  sourceBase,
                  p,
                );
                sourceGrp.rotation.z = (1 - p) * 0.45;
              },
            });
          },
        });
      } else if (action === 'place_coverslip' && sourceGrp && microGrp && microRefs) {
        animDuration = 2.3;
        const stageSpot = microGrp.position.clone().add(new THREE.Vector3(0, 0.56, 0.12));
        refs.tweens.add({
          duration: 0.8,
          ease: Easings.easeInOutCubic,
          onUpdate: (p) => {
            sourceGrp.position.lerpVectors(sourceBase, stageSpot.clone().add(new THREE.Vector3(0, 0.16, 0)), p);
            sourceGrp.rotation.z = p * (Math.PI / 4); // Classic 45° coverslip tilt!
          },
          onComplete: () => {
            refs.tweens.add({
              duration: 0.9,
              ease: Easings.easeOutCubic,
              onUpdate: (p) => {
                sourceGrp.position.y = stageSpot.y + 0.16 * (1 - p);
                sourceGrp.rotation.z = (Math.PI / 4) * (1 - p);
              },
              onComplete: () => {
                labAudio.playGlassClink();
                sourceGrp.visible = false;
                microRefs.stageCoverslip.visible = true;
              },
            });
          },
        });
      } else if (action === 'switch_objective' && microRefs) {
        animDuration = 2.0;
        const startRot = microRefs.turretGroup.rotation.y;
        const endRot = startRot + (Math.PI * 4) / 3;
        refs.tweens.add({
          duration: 1.25,
          ease: Easings.easeInOutCubic,
          onStart: () => labAudio.playKnobClick(),
          onUpdate: (p) => {
            microRefs.turretGroup.rotation.y = startRot + (endRot - startRot) * p;
          },
          onComplete: () => {
            setEyepieceZoom(400);
            setShowCellViewModal(true);
          },
        });
      } else if (action === 'focus_lens' || action === 'observe_sample') {
        animDuration = 2.0;
        if (microRefs) {
          refs.tweens.add({
            duration: 1.35,
            ease: Easings.easeInOutSine,
            onStart: () => labAudio.playKnobClick(),
            onUpdate: (p) => {
              microRefs.fineKnob.rotation.x = p * Math.PI * 3;
              microRefs.stageGroup.position.y = 0.41 + Math.sin(p * Math.PI) * 0.025;
              microRefs.lampGlowMat.emissiveIntensity = 1.4 + p * 0.9;
            },
            onComplete: () => {
              setEyepieceFocused(true);
              setShowCellViewModal(true);
            },
          });
        } else {
          setEyepieceFocused(true);
          setShowCellViewModal(true);
        }
      } else if (action === 'place_specimen' && sourceGrp && targetGrp) {
        animDuration = 2.2;
        const containerTop = targetBase.clone().add(new THREE.Vector3(0, 0.56, 0));
        const containerInside = targetBase.clone().add(new THREE.Vector3(0, 0.16, 0));
        refs.tweens.add({
          duration: 0.75,
          ease: Easings.easeOutCubic,
          onStart: () => labAudio.playWhoosh(),
          onUpdate: (p) => {
            sourceGrp.position.lerpVectors(sourceBase, containerTop, p);
          },
          onComplete: () => {
            refs.tweens.add({
              duration: 0.85,
              ease: Easings.easeInOutCubic,
              onUpdate: (p) => {
                sourceGrp.position.lerpVectors(containerTop, containerInside, p);
                sourceGrp.scale.setScalar(1 - p * 0.25);
              },
              onComplete: () => {
                labAudio.playBubble();
                refs.particles.emit('bubble', containerInside.clone().add(new THREE.Vector3(0, 0.15, 0)), 10, 0.08);
              },
            });
          },
        });
      } else if ((action === 'pour_solution' || action === 'add_reagent') && sourceGrp && targetGrp) {
        animDuration = 2.5;
        const pourSpot = targetBase.clone().add(new THREE.Vector3(-0.28, 0.62, 0));
        const stepColor =
          experiment.items.find((i) => i.id === step.sourceId)?.color ?? '#38bdf8';
        const colorNum = new THREE.Color(stepColor).getHex();

        refs.tweens.add({
          duration: 0.75,
          ease: Easings.easeInOutCubic,
          onUpdate: (p) => {
            sourceGrp.position.lerpVectors(sourceBase, pourSpot, p);
          },
          onComplete: () => {
            labAudio.playPourStream();
            refs.tweens.add({
              duration: 1.0,
              ease: Easings.easeInOutSine,
              onUpdate: (p) => {
                sourceGrp.rotation.z = -Math.sin(p * Math.PI) * 1.05; // 60° tilt pour!
                if (p > 0.2 && p < 0.8 && Math.random() < 0.45) {
                  refs.particles.emit(
                    'droplet',
                    targetBase.clone().add(new THREE.Vector3(0, 0.48, 0)),
                    3,
                    0.04,
                    colorNum,
                  );
                }
                if (targetGrp.userData.liquidMesh instanceof THREE.Mesh) {
                  targetGrp.userData.liquidMesh.scale.y = 1 + Math.sin(p * Math.PI * 0.5) * 0.25;
                }
                if (effect === 'color_change' && targetGrp.userData.leafMat instanceof THREE.MeshStandardMaterial) {
                  targetGrp.userData.leafMat.color.lerp(new THREE.Color(0x1e1b4b), 0.06);
                }
              },
              onComplete: () => {
                if (effect === 'bubbles') {
                  simStateRef.current.bubbleRate = Math.max(simStateRef.current.bubbleRate, 2);
                }
                if (step.sourceId.includes('yeast') && targetGrp.userData.foamMesh instanceof THREE.Mesh) {
                  targetGrp.userData.foamMesh.visible = true;
                }
                refs.tweens.add({
                  duration: 0.65,
                  ease: Easings.easeInOutCubic,
                  onUpdate: (p) => {
                    sourceGrp.position.lerpVectors(pourSpot, sourceBase, p);
                    sourceGrp.rotation.z = 0;
                  },
                });
              },
            });
          },
        });
      } else if (action === 'open_gate') {
        animDuration = 2.4;
        const gateGrp = targetGrp ?? findByKind('stomata_gate');
        const co2Grp = sourceGrp ?? findByKind('co2_cloud');
        refs.tweens.add({
          duration: 1.0,
          ease: Easings.easeOutBack,
          onStart: () => labAudio.playWhoosh(),
          onUpdate: (p) => {
            if (gateGrp?.userData.leftGuardPivot instanceof THREE.Group && gateGrp.userData.rightGuardPivot instanceof THREE.Group) {
              gateGrp.userData.leftGuardPivot.rotation.y = -p * 0.85;
              gateGrp.userData.rightGuardPivot.rotation.y = p * 0.85;
            }
          },
          onComplete: () => {
            if (co2Grp && gateGrp) {
              const cBase = co2Grp.position.clone();
              const insideLeaf = gateGrp.position.clone().add(new THREE.Vector3(0, 0.14, -0.28));
              refs.tweens.add({
                duration: 1.0,
                ease: Easings.easeInOutCubic,
                onUpdate: (p) => {
                  co2Grp.position.lerpVectors(cBase, insideLeaf, p);
                  co2Grp.scale.setScalar(1 - p * 0.3);
                },
                onComplete: () => {
                  simStateRef.current.eqState.co2 = true;
                  refreshFactoryBoard();
                  refs.particles.emit('sparkle', insideLeaf, 12, 0.25, 0x94a3b8);
                  co2Grp.position.copy(sourceBase);
                  co2Grp.scale.setScalar(1);
                },
              });
            } else {
              simStateRef.current.eqState.co2 = true;
              refreshFactoryBoard();
            }
          },
        });
      } else if (action === 'pump_water') {
        animDuration = 2.4;
        refs.room.setFaucetRunning(true);
        refs.tweens.after(2.0, () => refs.room.setFaucetRunning(false));
        const pipeGrp = targetGrp ?? findByKind('xylem_pipe');
        simStateRef.current.xylemBeadsActive = true;
        refs.tweens.add({
          duration: 1.5,
          ease: Easings.easeInOutSine,
          onStart: () => labAudio.playPourStream(),
          onUpdate: (p) => {
            if (sourceGrp) sourceGrp.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.18);
            if (pipeGrp) {
              refs.particles.emit('xylem_water', pipeGrp.position.clone().add(new THREE.Vector3(0, 0.15, 0)), 1, 0.04);
            }
          },
          onComplete: () => {
            simStateRef.current.eqState.h2o = true;
            refreshFactoryBoard();
          },
        });
      } else if (action === 'toggle_sun') {
        animDuration = 2.3;
        const sunGrp = sourceGrp ?? findByKind('sun_switch');
        const leafGrp = findByKind('leaf_factory');
        const plantGrp = findByKind('chloroplast_plant');
        refs.tweens.add({
          duration: 1.4,
          ease: Easings.easeOutCubic,
          onStart: () => labAudio.playKnobClick(),
          onUpdate: (p) => {
            if (sunGrp?.userData.sunLever instanceof THREE.Mesh) {
              sunGrp.userData.sunLever.rotation.x = -0.35 + p * 0.7;
            }
            if (sunGrp?.userData.sunMat instanceof THREE.MeshStandardMaterial) {
              sunGrp.userData.sunMat.emissiveIntensity = 0.35 + p * 0.9;
            }
            if (sunGrp?.userData.beamMat instanceof THREE.MeshBasicMaterial) {
              sunGrp.userData.beamMat.opacity = p * 0.28;
            }
            if (leafGrp?.userData.palisadeMat instanceof THREE.MeshStandardMaterial) {
              leafGrp.userData.palisadeMat.emissiveIntensity = 0.1 + p * 0.55;
            }
            if (plantGrp?.userData.chloroplastHullMat instanceof THREE.MeshStandardMaterial) {
              plantGrp.userData.chloroplastHullMat.emissiveIntensity = 0.14 + p * 0.45;
            }
          },
          onComplete: () => {
            simStateRef.current.eqState.light = true;
            refreshFactoryBoard();
          },
        });
      } else if (action === 'feed_plant') {
        animDuration = 2.5;
        const plantGrp = targetGrp ?? findByKind('chloroplast_plant');
        const co2Grp = findByKind('co2_cloud');
        const waterGrp = findByKind('water_molecules');
        const co2Base = co2Grp ? co2Grp.position.clone() : new THREE.Vector3();
        const waterBase = waterGrp ? waterGrp.position.clone() : new THREE.Vector3();
        const corePos = (plantGrp?.position ?? targetBase).clone().add(new THREE.Vector3(0, 0.28, 0));

        refs.tweens.add({
          duration: 1.45,
          ease: Easings.easeInOutCubic,
          onStart: () => labAudio.playWhoosh(),
          onUpdate: (p) => {
            if (co2Grp) {
              co2Grp.position.lerpVectors(co2Base, corePos, p);
              co2Grp.scale.setScalar(1 - p * 0.45);
            }
            if (waterGrp) {
              waterGrp.position.lerpVectors(waterBase, corePos, p);
              waterGrp.scale.setScalar(1 - p * 0.45);
            }
            if (plantGrp?.userData.coreMat instanceof THREE.MeshStandardMaterial) {
              plantGrp.userData.coreMat.emissiveIntensity = 0.35 + p * 1.1;
            }
          },
          onComplete: () => {
            refs.particles.emit('sparkle', corePos, 16, 0.35, 0x4ade80);
            if (co2Grp) {
              co2Grp.position.copy(refs.basePositions.get(co2Grp.userData.itemId) ?? co2Base);
              co2Grp.scale.setScalar(1);
            }
            if (waterGrp) {
              waterGrp.position.copy(refs.basePositions.get(waterGrp.userData.itemId) ?? waterBase);
              waterGrp.scale.setScalar(1);
            }
          },
        });
      } else if (action === 'split_water') {
        animDuration = 2.4;
        const plantGrp = findByKind('chloroplast_plant');
        const o2Pos = (plantGrp?.position ?? targetBase).clone().add(new THREE.Vector3(-0.22, 0.65, 0));
        refs.tweens.add({
          duration: 1.5,
          ease: Easings.easeOutCubic,
          onStart: () => labAudio.playBubble(),
          onUpdate: (p) => {
            if (plantGrp?.userData.panelsDiscMat instanceof THREE.MeshStandardMaterial) {
              plantGrp.userData.panelsDiscMat.emissiveIntensity = 0.25 + Math.sin(p * Math.PI * 3) * 1.25;
            }
            if (Math.random() < 0.35) {
              refs.particles.emit('bubble', o2Pos, 2, 0.08);
            }
          },
          onComplete: () => {
            refs.particles.emit('sparkle', targetBase, 14, 0.3, 0x38bdf8);
          },
        });
      } else if (action === 'build_sugar') {
        animDuration = 2.5;
        const plantGrp = findByKind('chloroplast_plant');
        const crateGrp = findByKind('glucose_crate');
        refs.tweens.add({
          duration: 1.7,
          ease: Easings.easeInOutCubic,
          onStart: () => labAudio.playKnobClick(),
          onUpdate: (p) => {
            if (plantGrp?.userData.sugarMakerGearA instanceof THREE.Mesh) {
              plantGrp.userData.sugarMakerGearA.rotation.z = p * Math.PI * 6;
            }
            if (plantGrp?.userData.sugarMakerGearB instanceof THREE.Mesh) {
              plantGrp.userData.sugarMakerGearB.rotation.z = -p * Math.PI * 7.5;
            }
            if (plantGrp?.userData.sugarMakerHex instanceof THREE.Mesh) {
              plantGrp.userData.sugarMakerHex.rotation.z = p * Math.PI * 2;
              plantGrp.userData.sugarMakerHex.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.45);
            }
            if (crateGrp) {
              crateGrp.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.25);
            }
          },
          onComplete: () => {
            simStateRef.current.eqState.glucose = true;
            refreshFactoryBoard();
            if (crateGrp) refs.particles.emit('sparkle', crateGrp.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 14, 0.28, 0xfacc15);
          },
        });
      } else if (action === 'release_oxygen') {
        animDuration = 2.4;
        const o2Grp = sourceGrp ?? findByKind('oxygen_bubbles');
        const gateGrp = targetGrp ?? findByKind('stomata_gate');
        if (o2Grp && gateGrp) {
          const gateExit = gateGrp.position.clone().add(new THREE.Vector3(0, 0.36, 0.35));
          refs.tweens.add({
            duration: 1.5,
            ease: Easings.easeInOutCubic,
            onStart: () => labAudio.playBubble(),
            onUpdate: (p) => {
              o2Grp.position.lerpVectors(sourceBase, gateExit, p);
              if (Math.random() < 0.35) {
                refs.particles.emit('bubble', gateExit, 1, 0.08);
              }
            },
            onComplete: () => {
              simStateRef.current.eqState.o2 = true;
              refreshFactoryBoard();
              refs.particles.emit('sparkle', gateExit, 18, 0.35, 0x38bdf8);
              o2Grp.position.copy(sourceBase);
            },
          });
        }
      } else if (action === 'ship_glucose') {
        animDuration = 2.6;
        const crateGrp = sourceGrp ?? findByKind('glucose_crate');
        const beltGrp = targetGrp ?? findByKind('phloem_conveyor');
        const leafGrp = findByKind('leaf_factory');
        simStateRef.current.conveyorActive = true;
        if (crateGrp && beltGrp) {
          const beltStart = beltGrp.position.clone().add(new THREE.Vector3(-0.26, 0.16, 0));
          const beltEnd = beltGrp.position.clone().add(new THREE.Vector3(0.32, 0.16, -0.25));
          refs.tweens.add({
            duration: 0.7,
            ease: Easings.easeOutCubic,
            onStart: () => labAudio.playWhoosh(),
            onUpdate: (p) => {
              crateGrp.position.lerpVectors(sourceBase, beltStart, p);
            },
            onComplete: () => {
              refs.tweens.add({
                duration: 1.1,
                ease: Easings.linear,
                onUpdate: (p) => {
                  crateGrp.position.lerpVectors(beltStart, beltEnd, p);
                  if (leafGrp?.userData.fruitStorage instanceof THREE.Group) {
                    leafGrp.userData.fruitStorage.scale.setScalar(1 + p * 0.35);
                  }
                  if (leafGrp?.userData.rootStorage instanceof THREE.Group) {
                    leafGrp.userData.rootStorage.scale.setScalar(1 + p * 0.28);
                  }
                },
                onComplete: () => {
                  refs.particles.emit('sparkle', beltEnd, 14, 0.25, 0xf59e0b);
                  crateGrp.position.copy(sourceBase);
                },
              });
            },
          });
        }
      } else if (action === 'close_gate') {
        animDuration = 2.4;
        const gateGrp = sourceGrp ?? findByKind('stomata_gate');
        const leafGrp = findByKind('leaf_factory');
        refs.tweens.add({
          duration: 1.2,
          ease: Easings.easeInOutCubic,
          onStart: () => labAudio.playClipSnap(),
          onUpdate: (p) => {
            if (gateGrp?.userData.leftGuardPivot instanceof THREE.Group && gateGrp.userData.rightGuardPivot instanceof THREE.Group) {
              gateGrp.userData.leftGuardPivot.rotation.y = -(1 - p) * 0.85;
              gateGrp.userData.rightGuardPivot.rotation.y = (1 - p) * 0.85;
            }
          },
          onComplete: () => {
            simStateRef.current.eqState = {
              co2: true,
              h2o: true,
              light: true,
              glucose: true,
              o2: true,
              completeGold: true,
            };
            refreshFactoryBoard();
            if (leafGrp) {
              refs.particles.emit('sparkle', leafGrp.position.clone().add(new THREE.Vector3(0, 1.15, -0.4)), 28, 0.7, 0xfacc15);
            }
          },
        });
      } else if (experiment.sceneKind === 'control_panel' && (action === 'set_dial' || action === 'warm_bath' || action === 'press_optimum' || action === 'set_light' || (action === 'place_specimen' && step.targetId === 'chamber') || (action === 'add_reagent' && step.targetId === 'chamber'))) {
        animDuration = 2.4;
        const cv = step.controlValues ?? { light: 100, co2: 0.04, temp: 25 };

        if (action === 'place_specimen') {
          const chamberGrp = findByKind('photosynthesis_chamber');
          if (sourceGrp && chamberGrp) {
            const top = chamberGrp.position.clone().add(new THREE.Vector3(0, 0.72, 0));
            const inside = chamberGrp.position.clone().add(new THREE.Vector3(0, 0.24, 0));
            refs.tweens.add({
              duration: 1.3,
              ease: Easings.easeInOutCubic,
              onStart: () => labAudio.playWhoosh(),
              onUpdate: (p) => {
                if (p < 0.5) sourceGrp.position.lerpVectors(sourceBase, top, p * 2);
                else sourceGrp.position.lerpVectors(top, inside, (p - 0.5) * 2);
              },
              onComplete: () => {
                sourceGrp.visible = false;
                if (chamberGrp.userData.submergedWeed instanceof THREE.Group) {
                  chamberGrp.userData.submergedWeed.visible = true;
                }
                recordControlReading(cv.light, cv.co2, cv.temp, cv.label);
              },
            });
          }
        } else if (action === 'set_light') {
          const lampGrp = findByKind('lamp_switch');
          refs.tweens.add({
            duration: 1.1,
            ease: Easings.easeOutCubic,
            onStart: () => labAudio.playKnobClick(),
            onUpdate: (p) => {
              if (lampGrp?.userData.bulbMat instanceof THREE.MeshStandardMaterial) {
                lampGrp.userData.bulbMat.emissiveIntensity = 0.2 + p * 1.1;
              }
              if (lampGrp?.userData.lightConeMat instanceof THREE.MeshBasicMaterial) {
                lampGrp.userData.lightConeMat.opacity = p * 0.22;
              }
            },
            onComplete: () => recordControlReading(cv.light, cv.co2, cv.temp, cv.label),
          });
        } else if (action === 'add_reagent') {
          const chamberGrp = findByKind('photosynthesis_chamber');
          const dropperGrp = sourceGrp ?? findByKind('bicarbonate_dropper');
          if (dropperGrp && chamberGrp) {
            const pourPos = chamberGrp.position.clone().add(new THREE.Vector3(-0.18, 0.85, 0));
            refs.tweens.add({
              duration: 1.35,
              ease: Easings.easeInOutCubic,
              onStart: () => labAudio.playSqueeze(),
              onUpdate: (p) => {
                if (p < 0.45) dropperGrp.position.lerpVectors(sourceBase, pourPos, p / 0.45);
                else if (p < 0.75) {
                  dropperGrp.rotation.z = -0.65;
                  if (Math.random() < 0.4) {
                    refs.particles.emit('droplet', chamberGrp.position.clone().add(new THREE.Vector3(0, 0.56, 0)), 2, 0.03, 0x38bdf8);
                  }
                } else {
                  dropperGrp.position.lerpVectors(pourPos, sourceBase, (p - 0.75) / 0.25);
                  dropperGrp.rotation.z = 0;
                }
              },
              onComplete: () => {
                labAudio.playBubble();
                recordControlReading(cv.light, cv.co2, cv.temp, cv.label);
              },
            });
          }
        } else if (action === 'warm_bath') {
          const heaterGrp = sourceGrp ?? findByKind('heater_block');
          refs.tweens.add({
            duration: 1.3,
            ease: Easings.easeInOutSine,
            onStart: () => labAudio.playKnobClick(),
            onUpdate: (p) => {
              if (heaterGrp?.userData.heaterPlateMat instanceof THREE.MeshStandardMaterial) {
                heaterGrp.userData.heaterPlateMat.emissiveIntensity = 0.2 + p * 0.6;
              }
            },
            onComplete: () => recordControlReading(cv.light, cv.co2, cv.temp, cv.label),
          });
        } else {
          // Dial clicks (light_100, light_200, light_250, temp_50) and press_optimum
          const lampGrp = findByKind('lamp_switch');
          refs.tweens.add({
            duration: 1.15,
            ease: Easings.easeOutBack,
            onStart: () => labAudio.playKnobClick(),
            onUpdate: (p) => {
              if (targetObj) {
                targetObj.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.22);
              }
              if (lampGrp?.userData.bulbMat instanceof THREE.MeshStandardMaterial) {
                lampGrp.userData.bulbMat.emissiveIntensity = 0.6 + (cv.light / 250) * 1.4;
              }
              if (lampGrp?.userData.lightConeMat instanceof THREE.MeshBasicMaterial) {
                lampGrp.userData.lightConeMat.opacity = 0.14 + (cv.light / 250) * 0.2;
              }
            },
            onComplete: () => {
              recordControlReading(cv.light, cv.co2, cv.temp, cv.label);
              if (action === 'press_optimum') {
                refs.particles.emit('sparkle', targetBase, 22, 0.45, 0x10b981);
              }
            },
          });
        }
      } else if (action === 'set_light' || (action === 'measure_result' && step.sourceId === 'ruler')) {
        animDuration = 2.2;
        let lampGrp: THREE.Group | undefined;
        refs.itemGroups.forEach((grp) => {
          if (grp.userData.itemKind === 'lamp') lampGrp = grp;
        });
        if (lampGrp) {
          const lampStart = lampGrp.position.clone();
          const lampCloser = new THREE.Vector3(-0.62, lampStart.y, lampStart.z);
          refs.tweens.add({
            duration: 1.2,
            ease: Easings.easeInOutCubic,
            onStart: () => labAudio.playClick(),
            onUpdate: (p) => {
              if (action === 'measure_result') {
                lampGrp!.position.lerpVectors(lampStart, lampCloser, p);
              }
              if (lampGrp!.userData.bulbMat instanceof THREE.MeshStandardMaterial) {
                lampGrp!.userData.bulbMat.emissiveIntensity = 0.8 + p * 1.4;
              }
              if (lampGrp!.userData.lightConeMat instanceof THREE.MeshBasicMaterial) {
                lampGrp!.userData.lightConeMat.opacity = 0.22;
              }
            },
            onComplete: () => {
              labAudio.playBubble();
              simStateRef.current.bubbleRate = action === 'measure_result' ? 5 : 3;
            },
          });
        }
      } else if (action === 'heat_sample') {
        animDuration = 2.4;
        simStateRef.current.steamRate = 2;
        refs.tweens.add({
          duration: 1.5,
          ease: Easings.easeInOutSine,
          onStart: () => labAudio.playBubble(),
          onUpdate: (p) => {
            if (targetGrp?.userData.waterMat instanceof THREE.MeshStandardMaterial) {
              targetGrp.userData.waterMat.emissiveIntensity = 0.2 + p * 0.45;
            }
            if (effect === 'color_change') {
              refs.itemGroups.forEach((grp) => {
                if (grp.userData.leafMat instanceof THREE.MeshStandardMaterial) {
                  grp.userData.leafMat.color.lerp(new THREE.Color(0xfef3c7), 0.05);
                }
              });
            }
          },
        });
      } else if (action === 'wait_timelapse') {
        animDuration = 2.6;
        refs.tweens.add({
          duration: 2.2,
          ease: Easings.easeInOutSine,
          onStart: () => labAudio.playWhoosh(),
          onUpdate: (p) => {
            if (sourceGrp?.userData.clockHand instanceof THREE.Group) {
              sourceGrp.userData.clockHand.rotation.z = -p * Math.PI * 8;
            }
            if (effect === 'cell_shrink') {
              refs.itemGroups.forEach((grp) => {
                const strips = grp.userData.potatoStrips as THREE.Group[] | undefined;
                if (strips) {
                  strips.forEach((st, i) => {
                    st.scale.set(1 - p * 0.28, 1 - p * 0.24, 1 - p * 0.14);
                    st.rotation.z = (i === 0 ? -1 : 1) * p * 0.2;
                  });
                }
              });
            } else if (effect === 'cell_swell') {
              refs.itemGroups.forEach((grp) => {
                const strips = grp.userData.potatoStrips as THREE.Group[] | undefined;
                if (strips) {
                  strips.forEach((st) => {
                    st.scale.set(1 + p * 0.24, 1 + p * 0.22, 1 + p * 0.12);
                  });
                }
              });
            } else if (effect === 'balloon_inflate' || effect === 'gas_balloon_inflate') {
              if (targetGrp?.userData.foamMesh instanceof THREE.Mesh) {
                targetGrp.userData.foamMesh.visible = true;
              }
              if (targetGrp?.userData.balloonBulb instanceof THREE.Mesh) {
                const sx = 0.55 + p * 0.85;
                const sy = 0.25 + p * 1.25;
                targetGrp.userData.balloonBulb.scale.set(sx, sy, sx);
              }
              simStateRef.current.bubbleRate = 4;
            }
          },
          onComplete: () => {
            if (effect === 'balloon_inflate' || effect === 'gas_balloon_inflate') {
              labAudio.playBalloonStretch();
            }
          },
        });
      } else if (
        action === 'highlight_organ' ||
        action === 'animate_flow' ||
        action === 'advance_stage' ||
        action === 'attach_label' ||
        action === 'trigger_impulse'
      ) {
        animDuration = 2.3;
        if (experiment.anatomySystem === 'heart_circulation') {
          simStateRef.current.heartbeatRate = 1.6;
          simStateRef.current.bloodFlowActive = true;
          labAudio.playHeartbeat();
        } else if (experiment.anatomySystem === 'respiratory_lungs') {
          simStateRef.current.lungBreathing = true;
          labAudio.playWhoosh();
        } else if (experiment.anatomySystem === 'plant_vascular') {
          simStateRef.current.xylemRate = 3;
          labAudio.playPourStream();
        } else if (experiment.anatomySystem === 'mitosis_stages') {
          simStateRef.current.mitosisPhase = Math.min(4, simStateRef.current.mitosisPhase + 1);
          labAudio.playSuccess();
        }

        if (sourceGrp) {
          refs.tweens.add({
            duration: 1.1,
            ease: Easings.easeOutCubic,
            onUpdate: (p) => {
              if (action === 'attach_label' && targetGrp) {
                sourceGrp.position.lerpVectors(
                  sourceBase,
                  targetBase.clone().add(new THREE.Vector3(0.28, 0.35, 0.18)),
                  p,
                );
              } else {
                sourceGrp.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.22);
              }
            },
          });
        }
      } else {
        // Generic clean lift + sparkle pulse fallback for any custom YouTube step
        animDuration = 2.0;
        if (sourceGrp) {
          refs.tweens.add({
            duration: 1.2,
            ease: Easings.easeOutCubic,
            onStart: () => labAudio.playSuccess(),
            onUpdate: (p) => {
              sourceGrp.position.y = sourceBase.y + Math.sin(p * Math.PI) * 0.32;
            },
          });
        }
      }

      refs.tweens.after(animDuration, () => {
        labAudio.playSuccess();
        setPhase('science_note');
      });
    },
    [experiment.anatomySystem, experiment.items],
  );

  // Build & mount Three.js scene once per experiment
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const isSoftwareGl = detectSoftwareWebGL(renderer);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 45);
    camera.position.set(0, 1.88, 3.88);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.44, -0.05);
    controls.minDistance = 1.6;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI * 0.47;

    const room = createLabRoom(scene, renderer, isSoftwareGl, experiment.sceneKind);
    const tweens = new TweenManager();
    const dolly = new CameraDollyController(camera, controls);
    const particles = new LabParticleSystem();
    const materials = createBiologyMaterialLibrary();
    const renderPipeline = createBiologyRenderPipeline(renderer, scene, camera, {
      isSoftwareGl,
      onQualityChange: (quality) => {
        particles.setQuality(quality);
        materials.setQuality(quality);
      },
    });
    const contactShadows = createContactShadowResources();
    scene.add(particles.mesh);

    // Build bench items from experiment + Step 0 safety gear box
    const hasMicroscope = allItemsWithSafety.some((i) => i.kind === 'microscope');
    const hasChloroplastPlant = allItemsWithSafety.some((i) => i.kind === 'chloroplast_plant');
    const hasControlConsole = allItemsWithSafety.some((i) => i.kind === 'control_console');

    const isSubTargetKind = (kind: ItemKind) =>
      (hasMicroscope && (kind === 'objective_lens' || kind === 'focus_knob')) ||
      (hasChloroplastPlant && (kind === 'chloroplast_panels' || kind === 'sugar_maker')) ||
      (hasControlConsole && (kind === 'light_dial' || kind === 'temp_dial' || kind === 'optimum_button'));

    const renderableItems = allItemsWithSafety.filter((i) => !isSubTargetKind(i.kind));
    const itemGroups = new Map<string, THREE.Group>();
    const subTargetObjects = new Map<string, THREE.Object3D>();
    const basePositions = computeBenchLayout(renderableItems, experiment.sceneKind);

    renderableItems.forEach((item) => {
      const grp = buildLabItemModel(item, {
        isSoftwareGl,
        specimenPreset: experiment.specimenPreset,
        materials,
      });
      const pos = basePositions.get(item.id) ?? new THREE.Vector3(0, 0, 0);
      grp.position.copy(pos);
      contactShadows.attach(grp);
      scene.add(grp);
      itemGroups.set(item.id, grp);

      // Register embedded interactive sub-targets (chloroplast_panels, sugar_maker, dial notches, optimum_btn)
      grp.traverse((child) => {
        if (typeof child.userData.subTargetId === 'string') {
          child.userData.itemId = child.userData.subTargetId;
          subTargetObjects.set(child.userData.subTargetId, child);
        }
      });
    });

    // Map any alternate Gemini-generated IDs for embedded sub-targets onto the composite sub-meshes
    experiment.items.forEach((item) => {
      if (isSubTargetKind(item.kind) && !subTargetObjects.has(item.id)) {
        const subKind = item.kind;
        let matchObj: THREE.Object3D | undefined;
        subTargetObjects.forEach((obj) => {
          if (!matchObj && obj.userData.subTargetKind === subKind) {
            matchObj = obj;
          }
        });
        if (matchObj) {
          subTargetObjects.set(item.id, matchObj);
        }
      }
    });

    // Floating emerald target arrow indicator + subtle ground selection ring
    const arrowIndicator = new THREE.Group();
    const arrowCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.16, 14),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.15,
        roughness: 0.2,
        metalness: 0.08,
      }),
    );
    arrowCone.rotation.x = Math.PI;
    arrowIndicator.add(arrowCone);
    scene.add(arrowIndicator);

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.88,
      roughness: 0.24,
      side: THREE.DoubleSide,
    });
    const highlightRing = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.26, 28),
      ringMaterial,
    );
    highlightRing.rotation.x = -Math.PI / 2;
    highlightRing.position.y = 0.016;
    scene.add(highlightRing);

    const targetLabelCanvas = document.createElement('canvas');
    targetLabelCanvas.width = 512;
    targetLabelCanvas.height = 128;
    const targetLabelContext = targetLabelCanvas.getContext('2d');
    const targetLabelTexture = new THREE.CanvasTexture(targetLabelCanvas);
    targetLabelTexture.colorSpace = THREE.SRGBColorSpace;
    const targetLabel = new THREE.Sprite(new THREE.SpriteMaterial({
      map: targetLabelTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }));
    targetLabel.name = 'CurrentBiologyTargetLabel';
    targetLabel.scale.set(0.86, 0.22, 1);
    targetLabel.visible = false;
    targetLabel.raycast = () => {};
    scene.add(targetLabel);
    let targetLabelText = '';
    const drawTargetLabel = (label: string) => {
      if (!targetLabelContext || label === targetLabelText) return;
      targetLabelText = label;
      targetLabelContext.clearRect(0, 0, 512, 128);
      targetLabelContext.fillStyle = 'rgba(15,23,42,.94)';
      targetLabelContext.beginPath();
      targetLabelContext.roundRect(4, 8, 504, 112, 22);
      targetLabelContext.fill();
      targetLabelContext.strokeStyle = '#facc15';
      targetLabelContext.lineWidth = 5;
      targetLabelContext.stroke();
      targetLabelContext.fillStyle = '#fef3c7';
      targetLabelContext.font = '700 34px system-ui, sans-serif';
      targetLabelContext.textAlign = 'center';
      targetLabelContext.textBaseline = 'middle';
      const maxWidth = 460;
      let text = label;
      while (text.length > 4 && targetLabelContext.measureText(text).width > maxWidth) text = `${text.slice(0, -2)}…`;
      targetLabelContext.fillText(text, 256, 66);
      targetLabelTexture.needsUpdate = true;
    };

    const dropperStream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 }),
    );
    dropperStream.visible = false;
    scene.add(dropperStream);

    sceneRefs.current = {
      scene,
      camera,
      controls,
      room,
      tweens,
      dolly,
      particles,
      itemGroups,
      subTargetObjects,
      basePositions,
      arrowIndicator,
      highlightRing,
      dropperStream,
    };

    // Enforce zero OS cursor on the WebGL canvas element directly
    renderer.domElement.style.cursor = 'none';

    const canvasWithHelper = renderer.domElement as HTMLCanvasElement & {
      __getActiveTargetScreenPoint?: () => { id: string; x: number; y: number } | null;
    };
    canvasWithHelper.__getActiveTargetScreenPoint = () => {
      const curPhase = phaseRef.current;
      let targetId: string | null = null;
      if (curPhase === 'safety_gear') targetId = '__safety_gear__';
      else if (curPhase === 'awaiting_source') {
        targetId = experiment.steps[stepIndexRef.current]?.sourceId ?? null;
      } else if (curPhase === 'awaiting_target') {
        targetId = experiment.steps[stepIndexRef.current]?.targetId ?? null;
      }
      if (!targetId) return null;
      let obj: THREE.Object3D | undefined =
        subTargetObjects.get(targetId) ?? itemGroups.get(targetId);
      if ((!obj || !obj.visible) && experiment.sceneKind === 'microscope') {
        itemGroups.forEach((grp) => {
          if (grp.userData.itemKind === 'microscope') obj = grp;
        });
      }
      if (!obj) return null;
      const box = new THREE.Box3().setFromObject(obj);
      const center = new THREE.Vector3();
      if (!box.isEmpty()) box.getCenter(center);
      else obj.getWorldPosition(center);
      center.project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return {
        id: targetId,
        x: r.left + (center.x * 0.5 + 0.5) * r.width,
        y: r.top + (-center.y * 0.5 + 0.5) * r.height,
      };
    };

    // Raycasting helpers
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const findItemIdFromObject = (obj: THREE.Object3D | null): string | null => {
      let cur: THREE.Object3D | null = obj;
      while (cur) {
        if (typeof cur.userData.microscopePart === 'string') {
          const partKind = cur.userData.microscopePart as ItemKind;
          const matchingItem = experiment.items.find((i) => i.kind === partKind);
          if (matchingItem) return matchingItem.id;
        }
        if (typeof cur.userData.itemId === 'string') {
          return cur.userData.itemId;
        }
        cur = cur.parent;
      }
      return null;
    };

    const hoverMaterialOriginals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    let activeHoverId: string | null = null;
    const restoreHoveredGroup = (id: string | null) => {
      if (!id) return;
      const group = itemGroups.get(id);
      if (!group) return;
      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const original = hoverMaterialOriginals.get(child);
        if (!original) return;
        const current = Array.isArray(child.material) ? child.material : [child.material];
        child.material = original;
        current.forEach((material) => material.dispose());
        hoverMaterialOriginals.delete(child);
      });
    };
    const setHoveredGroup = (id: string | null) => {
      if (id === activeHoverId) return;
      restoreHoveredGroup(activeHoverId);
      activeHoverId = id;
      const group = id ? itemGroups.get(id) : undefined;
      if (!group) return;
      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || hoverMaterialOriginals.has(child)) return;
        const originals = Array.isArray(child.material) ? child.material : [child.material];
        const lifted = originals.map((material) => {
          const clone = material.clone() as THREE.Material & { color?: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number };
          clone.color?.lerp(new THREE.Color(0x6ee7b7), 0.12);
          if (clone.emissive) {
            clone.emissive.lerp(new THREE.Color(0x34d399), 0.36);
            clone.emissiveIntensity = Math.max(clone.emissiveIntensity ?? 0, 0.32);
          }
          return clone;
        });
        hoverMaterialOriginals.set(child, child.material);
        child.material = Array.isArray(child.material) ? lifted : lifted[0];
      });
    };

    const getPointerCoords = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (ev: MouseEvent) => {
      getPointerCoords(ev);
      raycaster.setFromCamera(pointerNdc, camera);
      const targets = Array.from(itemGroups.values());
      const hits = raycaster.intersectObjects(targets, true);
      const hitId = hits.length > 0 ? findItemIdFromObject(hits[0].object) : null;
      setHoveredGroup(hitId);
      setHoveredItemId(hitId);
    };

    const onPointerDown = (ev: MouseEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const shakeObject = (itemId: string) => {
      const grp = itemGroups.get(itemId);
      const base = basePositions.get(itemId);
      if (!grp || !base) return;
      const errorFlash = new THREE.PointLight(0xf43f5e, 1.8, 1.25, 2);
      errorFlash.position.set(0, 0.42, 0);
      grp.add(errorFlash);
      tweens.add({
        duration: 0.42,
        ease: Easings.easeOutCubic,
        onUpdate: (p) => { errorFlash.intensity = 1.8 * (1 - p); },
        onComplete: () => { grp.remove(errorFlash); },
      });
      tweens.add({
        duration: 0.36,
        ease: Easings.linear,
        onUpdate: (p) => {
          grp.position.x = base.x + Math.sin(p * Math.PI * 6) * 0.045;
        },
        onComplete: () => {
          grp.position.x = base.x;
        },
      });
    };

    const popObject = (itemId: string) => {
      const target = itemGroups.get(itemId) ?? subTargetObjects.get(itemId)?.parent;
      if (!target) return;
      const baseScale = target.scale.clone();
      const pulseScale = baseScale.clone().multiplyScalar(1.13);
      const worldPosition = new THREE.Vector3();
      (subTargetObjects.get(itemId) ?? target).getWorldPosition(worldPosition);
      particles.emit('sparkle', worldPosition, 14, 0.24, 0xfacc15);
      tweens.add({
        duration: 0.2,
        ease: Easings.easeOutBack,
        onUpdate: (p) => { target.scale.copy(baseScale).lerp(pulseScale, p); },
        onComplete: () => tweens.add({
          duration: 0.24,
          ease: Easings.easeOutCubic,
          onUpdate: (p) => { target.scale.copy(pulseScale).lerp(baseScale, p); },
        }),
      });
    };

    const onClick = (ev: MouseEvent) => {
      // Ignore orbit-drag releases
      const dx = ev.clientX - pointerDownPos.x;
      const dy = ev.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 8) return;

      const curPhase = phaseRef.current;
      if (curPhase === 'animating' || curPhase === 'science_note' || curPhase === 'completed') {
        return;
      }

      getPointerCoords(ev);
      raycaster.setFromCamera(pointerNdc, camera);
      const targets = Array.from(itemGroups.values());
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length === 0) return;

      const clickedId = findItemIdFromObject(hits[0].object);
      if (!clickedId) return;

      // Step 0: Safety gear + hand wash enforcement!
      if (curPhase === 'safety_gear') {
        if (clickedId === '__safety_gear__') {
          labAudio.playGloveSnap();
          setRightClicks((r) => r + 1);
          setGlovesOn(true);
          setPhase('animating');

          room.setFaucetRunning(true);
          particles.emit('droplet', new THREE.Vector3(3.25, 0.12, -0.73), 10, 0.08, 0x38bdf8);

          const boxGrp = itemGroups.get('__safety_gear__');
          if (boxGrp) {
            particles.emit('sparkle', boxGrp.position.clone().add(new THREE.Vector3(0, 0.35, 0)), 14, 0.25, 0x38bdf8);
            tweens.add({
              duration: 0.75,
              ease: Easings.easeOutBack,
              onUpdate: (p) => {
                boxGrp.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.2);
              },
            });
          }
          const safetyToast =
            experiment.sceneKind === 'factory'
              ? 'Hands washed & Hard Hat ON! Ready for Step 1.'
              : experiment.sceneKind === 'control_panel'
                ? 'Hands washed, Lab Coat & Goggles ON! Ready for Step 1.'
                : 'Hands washed, Gloves & Lab Coat ON! Ready for Step 1.';
          tweens.after(0.95, () => {
            room.setFaucetRunning(false);
            setSafetyDone(true);
            setPhase('awaiting_source');
            showToast(safetyToast, 'info');
          });
        } else {
          labAudio.playGentleError();
          setWrongClicks((w) => w + 1);
          shakeObject(clickedId);
          showToast(
            experiment.sceneKind === 'factory'
              ? 'Put on your factory hard hat first!'
              : 'Wash hands & put on safety gear first!',
            'error',
          );
        }
        return;
      }

      const step = experiment.steps[stepIndexRef.current];
      if (!step) return;

      const isSingleClickStep =
        step.sourceId === step.targetId || SINGLE_CLICK_ACTIONS.has(step.action);

      if (curPhase === 'awaiting_source') {
        // Also allow clicking microscope sub-parts (turret/knob) during lens/focus steps
        const clickedMicroForSubStep =
          clickedId === 'microscope' &&
          (step.action === 'switch_objective' || step.action === 'focus_lens');
        // Allow clicking water_molecules OR co2_cloud in Step 4 feed_plant
        const clickedWaterSupplyAlias =
          step.action === 'feed_plant' && clickedId === 'water_molecules';
        // Also allow clicking subTarget aliases matched by ItemKind
        const expectedItemKind = experiment.items.find((i) => i.id === step.sourceId)?.kind;
        const clickedKindAlias =
          expectedItemKind &&
          subTargetObjects.get(step.sourceId)?.userData.subTargetId === clickedId;

        if (clickedId === step.sourceId || clickedMicroForSubStep || clickedWaterSupplyAlias || clickedKindAlias) {
          setRightClicks((r) => r + 1);
          popObject(clickedId);
          if (isSingleClickStep) {
            playStepAnimation(step);
          } else {
            labAudio.playClick();
            const activeSrcId = clickedWaterSupplyAlias ? 'water_molecules' : step.sourceId;
            setSelectedSourceId(activeSrcId);
            const srcGrp = itemGroups.get(activeSrcId);
            const srcBase = basePositions.get(activeSrcId);
            if (srcGrp && srcBase) {
              tweens.add({
                duration: 0.28,
                ease: Easings.easeOutBack,
                onUpdate: (p) => {
                  srcGrp.position.y = srcBase.y + p * 0.14;
                },
              });
            }
            setPhase('awaiting_target');
          }
        } else {
          labAudio.playGentleError();
          setWrongClicks((w) => w + 1);
          shakeObject(clickedId);
          const expectedLabel =
            experiment.items.find((i) => i.id === step.sourceId)?.label ?? 'the highlighted tool';
          showToast(`Not quite! Select ${expectedLabel} first.`, 'error');
        }
        return;
      }

      if (curPhase === 'awaiting_target') {
        if (clickedId === step.sourceId || clickedId === selectedSourceId) {
          // Allow clicking source again to cancel selection smoothly
          labAudio.playClick();
          const resetId = selectedSourceId ?? step.sourceId;
          const srcGrp = itemGroups.get(resetId);
          const srcBase = basePositions.get(resetId);
          if (srcGrp && srcBase) srcGrp.position.y = srcBase.y;
          setSelectedSourceId(null);
          setPhase('awaiting_source');
          return;
        }

        // Ergonomic allowance: if slide is already on microscope stage, clicking microscope ALSO hits slide/specimen
        const stageAliasValid =
          simStateRef.current.slideMounted &&
          clickedId === 'microscope' &&
          (step.action === 'add_water' ||
            step.action === 'add_stain' ||
            step.action === 'place_coverslip');

        const targetKindAlias =
          subTargetObjects.get(step.targetId)?.userData.subTargetId === clickedId;

        if (clickedId === step.targetId || stageAliasValid || targetKindAlias) {
          setRightClicks((r) => r + 1);
          popObject(clickedId);
          playStepAnimation(step);
        } else {
          labAudio.playGentleError();
          setWrongClicks((w) => w + 1);
          shakeObject(clickedId);
          const expectedTarget =
            experiment.items.find((i) => i.id === step.targetId)?.label ?? 'the highlighted target';
          showToast(`Aim for ${expectedTarget}.`, 'error');
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderPipeline.resize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Pre-allocated tick vectors (zero per-frame allocations)
    const tmpTargetPos = new THREE.Vector3();
    const targetBounds = new THREE.Box3();
    const targetBoundsSize = new THREE.Vector3();
    const targetBoundsCenter = new THREE.Vector3();
    let rafId = 0;
    let prevNow = performance.now();
    const startNow = prevNow;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - prevNow) * 0.001);
      prevNow = now;
      const timeSec = (now - startNow) * 0.001;

      controls.update();
      dolly.update(dt);
      tweens.update(dt);
      room.update(timeSec);
      particles.update(dt, timeSec);
      renderPipeline.update(dt);

      // Update floating target arrow + ground ring above ONLY the active interactive object
      const curPhase = phaseRef.current;
      let expectedId: string | null = null;
      if (curPhase === 'safety_gear') {
        expectedId = '__safety_gear__';
      } else if (curPhase === 'awaiting_source') {
        expectedId = experiment.steps[stepIndexRef.current]?.sourceId ?? null;
      } else if (curPhase === 'awaiting_target') {
        expectedId = experiment.steps[stepIndexRef.current]?.targetId ?? null;
      }

      let expectedObj: THREE.Object3D | undefined = expectedId
        ? (subTargetObjects.get(expectedId) ?? itemGroups.get(expectedId))
        : undefined;
      if (expectedId && (!expectedObj || !expectedObj.visible) && experiment.sceneKind === 'microscope') {
        itemGroups.forEach((grp) => {
          if (grp.userData.itemKind === 'microscope') expectedObj = grp;
        });
      }
      if (expectedObj && expectedObj.visible) {
        arrowIndicator.visible = true;
        targetLabel.visible = true;
        expectedObj.getWorldPosition(tmpTargetPos);
        const isSub = expectedObj !== itemGroups.get(expectedId ?? '');
        const arrowHeightOffset =
          expectedObj.userData.itemKind === 'microscope'
            ? 1.15
            : isSub
              ? 0.42
              : 0.72;
        arrowIndicator.position.set(
          tmpTargetPos.x,
          tmpTargetPos.y + arrowHeightOffset + Math.sin(timeSec * 4.5) * 0.07,
          tmpTargetPos.z,
        );
        arrowIndicator.rotation.y = timeSec * 1.4;
        highlightRing.visible = !isSub;
        highlightRing.position.set(tmpTargetPos.x, 0.016, tmpTargetPos.z);
        const pulse = 1 + Math.sin(timeSec * 4) * 0.14;
        ringMaterial.emissiveIntensity = 0.78 + Math.sin(timeSec * 4) * 0.28;
        targetBounds.setFromObject(expectedObj);
        if (!targetBounds.isEmpty()) {
          targetBounds.getSize(targetBoundsSize);
          targetBounds.getCenter(targetBoundsCenter);
          targetLabel.position.set(targetBoundsCenter.x, targetBounds.max.y + 0.16, targetBoundsCenter.z);
          const labelScale = THREE.MathUtils.clamp(0.72 + targetBoundsSize.x * 0.08, 0.72, 1.12);
          targetLabel.scale.set(labelScale, labelScale * 0.26, 1);
        } else {
          targetLabel.position.set(tmpTargetPos.x, tmpTargetPos.y + arrowHeightOffset + 0.12, tmpTargetPos.z);
        }
        drawTargetLabel(expectedId === '__safety_gear__'
          ? experiment.sceneKind === 'factory' ? 'Yellow hard hat' : 'Safety gloves and coat'
          : experiment.items.find((item) => item.id === expectedId)?.label ?? 'Next item');
        const ringScale = pulse * THREE.MathUtils.clamp(Math.max(targetBoundsSize.x, targetBoundsSize.z, 0.5) * 0.9, 0.9, 2.5);
        highlightRing.scale.set(ringScale, ringScale, 1);
      } else {
        arrowIndicator.visible = false;
        highlightRing.visible = false;
        targetLabel.visible = false;
      }

      // Ongoing biological idle / process particle streams (capped nicely)
      const sim = simStateRef.current;
      if (sim.bubbleRate > 0 && Math.random() < sim.bubbleRate * dt * 3.5) {
        particles.emit('bubble', sim.bubblePos, 1, 0.08);
      }
      if (sim.steamRate > 0 && Math.random() < sim.steamRate * dt * 3.0) {
        particles.emit('steam', sim.steamPos, 1, 0.14);
      }
      if (sim.xylemRate > 0 && Math.random() < sim.xylemRate * dt * 3.5) {
        particles.emit('xylem_water', new THREE.Vector3(0, 0.12, 0.02), 1, 0.04);
      }
      if (sim.xylemBeadsActive) {
        itemGroups.forEach((grp) => {
          const beads = grp.userData.waterBeads as THREE.Mesh[] | undefined;
          if (beads) {
            beads.forEach((b, idx) => {
              b.visible = true;
              b.position.y = 0.08 + ((timeSec * 0.38 + idx * 0.11) % 0.56);
            });
          }
        });
      }
      if (sim.conveyorActive) {
        itemGroups.forEach((grp) => {
          const slats = grp.userData.conveyorSlats as THREE.Mesh[] | undefined;
          if (slats) {
            slats.forEach((s, idx) => {
              s.position.x = -0.3 + ((timeSec * 0.35 + idx * 0.16) % 0.6);
            });
          }
        });
      }
      // Subtle Sprout mascot idle bounce in Factory & Control Panel
      itemGroups.forEach((grp) => {
        if (grp.userData.sproutMascot instanceof THREE.Group) {
          grp.userData.sproutMascot.position.y = 0.04 + Math.abs(Math.sin(timeSec * 2.4)) * 0.02;
        }
        if (grp.userData.submergedWeed instanceof THREE.Group && grp.userData.submergedWeed.visible) {
          grp.userData.submergedWeed.rotation.z = Math.sin(timeSec * 1.6) * 0.045;
        }
      });
      if (sim.bloodFlowActive && Math.random() < dt * 7) {
        particles.emit('blood_blue', new THREE.Vector3(-0.08, 0.42, 0), 1, 0.08);
        particles.emit('blood_red', new THREE.Vector3(0.08, 0.45, 0), 1, 0.08);
      }

      // Continuous anatomical beats (heart chambers, breathing lungs, mitosis chromatids)
      if (sim.heartbeatRate > 0) {
        itemGroups.forEach((grp) => {
          if (grp.userData.rightChamber instanceof THREE.Mesh && grp.userData.leftChamber instanceof THREE.Mesh) {
            const beat = 1 + Math.pow(Math.max(0, Math.sin(timeSec * 4.2)), 6) * 0.09;
            grp.userData.rightChamber.scale.set(0.85 * beat, 1.28 * beat, 0.88 * beat);
            grp.userData.leftChamber.scale.set(0.92 * beat, 1.38 * beat, 0.92 * beat);
          }
        });
      }
      if (sim.lungBreathing) {
        itemGroups.forEach((grp) => {
          const lobes = grp.userData.lungLobes as THREE.Mesh[] | undefined;
          if (lobes) {
            const breath = 1 + Math.sin(timeSec * 2.2) * 0.08;
            lobes.forEach((l) => l.scale.set(0.85 * breath, 1.45 * breath, 0.78 * breath));
          }
        });
      }
      if (sim.mitosisPhase > 0) {
        itemGroups.forEach((grp) => {
          const chromatids = grp.userData.chromatids as
            | Array<{ left: THREE.Mesh; right: THREE.Mesh; baseY: number; baseZ: number }>
            | undefined;
          if (chromatids) {
            chromatids.forEach((pair, idx) => {
              if (sim.mitosisPhase === 1) {
                // Prophase: spread clusters
                pair.left.position.set(-0.02, pair.baseY, pair.baseZ);
                pair.right.position.set(0.02, pair.baseY, pair.baseZ);
              } else if (sim.mitosisPhase === 2) {
                // Metaphase: equator line-up
                const eqY = -0.11 + idx * 0.072;
                pair.left.position.set(-0.015, eqY, 0);
                pair.right.position.set(0.015, eqY, 0);
              } else {
                // Anaphase / Telophase: sister chromatids pulled to opposite poles
                const eqY = -0.11 + idx * 0.072;
                pair.left.position.set(-0.15, eqY, 0);
                pair.right.position.set(0.15, eqY, 0);
              }
            });
          }
        });
      }

      renderPipeline.render();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('mousedown', onPointerDown);
      renderer.domElement.removeEventListener('click', onClick);
      restoreHoveredGroup(activeHoverId);
      dolly.dispose();
      controls.dispose();
      particles.dispose();
      room.dispose();
      renderPipeline.dispose();
      contactShadows.dispose();
      materials.dispose();
      disposeSceneResources(scene);
      renderer.dispose();
    };
  }, [allItemsWithSafety, experiment, playStepAnimation, showToast]);

  const handleContinueScienceNote = useCallback(() => {
    labAudio.playClick();
    if (stepIndex + 1 >= experiment.steps.length) {
      finishMission(rightClicks, wrongClicks);
    } else {
      setStepIndex((i) => i + 1);
      setHintVisible(false);
      setPhase('awaiting_source');
    }
  }, [experiment.steps.length, finishMission, rightClicks, stepIndex, wrongClicks]);

  // Enter key triggers Continue inside "The science behind it" modal
  useEffect(() => {
    if (phase !== 'science_note') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleContinueScienceNote();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleContinueScienceNote, phase]);

  const progressPct = Math.round(
    ((!safetyDone ? 0 : stepIndex + (phase === 'science_note' || phase === 'completed' ? 1 : 0)) /
      Math.max(1, experiment.steps.length)) *
      100,
  );

  const isFactory = experiment.sceneKind === 'factory';
  const isControl = experiment.sceneKind === 'control_panel';

  const instructionText =
    phase === 'safety_gear'
      ? isFactory
        ? 'Put on your yellow factory hard hat first!'
        : isControl
          ? 'Put on your lab coat and goggles first!'
          : 'Put on gloves and lab coat first!'
      : !safetyDone
        ? isFactory
          ? 'Washing hands and putting on hard hat...'
          : 'Washing hands and putting on safety gear...'
        : phase === 'completed'
          ? 'Experiment complete!'
          : currentStep?.instruction ?? 'Complete the biology investigation.';

  const holdingLabel = selectedSourceId
    ? experiment.items.find((i) => i.id === selectedSourceId)?.label ?? null
    : null;

  const badgeRequiredText = isFactory
    ? 'Hard Hat Required'
    : isControl
      ? 'Safety Gear Required'
      : 'Gloves Required';
  const badgeOnText = isFactory
    ? 'Hard Hat On'
    : isControl
      ? 'Safety Gear On'
      : 'Gloves On';

  return (
    <div
      data-lab-canvas-stage="true"
      className="relative w-full h-[640px] rounded-2xl overflow-hidden border border-[#C6DBD0] bg-[#789284] shadow-md select-none"
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-none"
        aria-label={`Interactive 3D biology lab for ${experiment.experimentTitle}`}
      />

      {/* Cartoon Hand Cursor following pointer over the 3D bench (automatically hides over HUD buttons) */}
      <LabHandCursor
        active={phase !== 'science_note' && phase !== 'completed'}
        isHoveringTarget={Boolean(hoveredItemId)}
        holdingLabel={holdingLabel}
      />

      {/* Top-Left: Subtle hovered label & Microscope Cell View opener */}
      <div data-hide-hand-cursor="true" className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        {experiment.sceneKind === 'microscope' && (
          <button
            type="button"
            onClick={() => {
              labAudio.playClick();
              setShowCellViewModal((v) => !v);
            }}
            className="px-3 py-1.5 rounded-lg bg-white/95 border border-[#C6DBD0] text-xs font-semibold text-[#11241B] shadow-sm hover:bg-[#EFF7F2] flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#0D7A5F]" />
            <span>{showCellViewModal ? 'Hide Cell View' : 'Microscope Cell View'}</span>
          </button>
        )}
        {hoveredItemId && (
          <div className="px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold shadow-sm pointer-events-none">
            {hoveredItemId === '__safety_gear__'
              ? isFactory
                ? 'Hard Hat Safety Box'
                : 'Gloves & Lab Coat Box'
              : experiment.items.find((i) => i.id === hoveredItemId)?.label ?? hoveredItemId}
          </div>
        )}
      </div>

      {/* Top-Right: Safety Gear Status Badge + Sound Mute + Camera Reset */}
      <div data-hide-hand-cursor="true" className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm flex items-center gap-1.5 ${
            glovesOn
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {glovesOn ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
          )}
          <span>{glovesOn ? badgeOnText : badgeRequiredText}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            labAudio.muted = !muted;
            setMuted(labAudio.muted);
          }}
          aria-label={muted ? 'Unmute lab audio' : 'Mute lab audio'}
          className="p-2 rounded-lg bg-white/95 border border-[#C6DBD0] text-[#11241B] hover:bg-[#EFF7F2] shadow-sm cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            labAudio.playClick();
            sceneRefs.current?.dolly.dollyTo(
              new THREE.Vector3(0, 1.88, 3.88),
              new THREE.Vector3(0, 0.44, -0.05),
              0.7,
            );
          }}
          aria-label="Reset camera view"
          className="p-2 rounded-lg bg-white/95 border border-[#C6DBD0] text-[#11241B] hover:bg-[#EFF7F2] shadow-sm cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Gentle Error / Info Toast */}
      {toastMsg && (
        <div
          role="status"
          className={`absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg border pointer-events-none ${
            toastMsg.kind === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-[#0D7A5F] text-white border-[#0A634D]'
          }`}
        >
          {toastMsg.text}
        </div>
      )}

      {/* Bottom-Left Dark-Blue Instruction HUD (NO bottom chip bar!) */}
      <div
        data-hide-hand-cursor="true"
        className="absolute bottom-4 left-4 z-10 w-[340px] max-w-[calc(100%-2rem)] rounded-2xl bg-[#0F1E36] text-white border border-[#1E3A5F] shadow-xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between text-[11px] font-mono text-[#93C5FD]">
          <span>{formatClockTime(stepIndex)}</span>
          <span className="font-bold text-white">PROGRESS: {progressPct}%</span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-[#1E3A5F] overflow-hidden">
          <div
            className="h-full bg-[#10B981] transition-all duration-300"
            style={{ width: `${Math.max(4, progressPct)}%` }}
          />
        </div>

        <p className="text-sm font-medium text-white leading-snug">{instructionText}</p>

        {hintVisible && currentStep && (
          <p className="text-xs text-amber-200 bg-[#172C4D] border border-amber-400/30 rounded-lg px-2.5 py-2">
            Hint:{' '}
            {phase === 'safety_gear'
              ? isFactory
                ? 'Click the yellow Hard Hat Box on the front-left bench.'
                : 'Click the Gloves & Lab Coat box on the bench.'
              : currentStep.hint}
          </p>
        )}

        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            disabled={phase === 'animating' || phase === 'science_note' || phase === 'completed'}
            onClick={() => {
              labAudio.playClick();
              if (!hintVisible) {
                setUsedHint(true);
                setWrongClicks((w) => w + 1);
              }
              setHintVisible((h) => !h);
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-45 text-[#0F172A] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Hint</span>
          </button>

          <span className="text-[11px] font-mono text-[#94A3B8]">
            {!safetyDone
              ? 'Step 0 (Safety)'
              : `Step ${Math.min(stepIndex + 1, experiment.steps.length)} of ${experiment.steps.length}`}
          </span>
        </div>
      </div>

      {/* Centered Circular Microscope Cell View Viewport */}
      {showCellViewModal && (
        <EyepieceCanvas
          preset={experiment.specimenPreset ?? 'onion_peel'}
          magnification={eyepieceZoom}
          stained={eyepieceStained}
          stainColor={eyepieceStainColor}
          focused={eyepieceFocused}
          centeredModal
          onClose={() => setShowCellViewModal(false)}
        />
      )}

      {/* Centered "The science behind it" Modal (shown after EVERY completed step) */}
      {phase === 'science_note' && currentStep && (
        <div
          className="fixed inset-0 z-40 bg-[#07140F]/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="biology-step-note-title"
        >
          <div className="max-w-2xl w-full max-h-[90vh] bg-white border border-[#D8E6DE] rounded-3xl shadow-[0_28px_90px_rgba(0,0,0,.3)] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#0B5D49] to-[#128064] px-5 sm:px-7 py-5 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-emerald-100" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[.18em] font-bold text-emerald-100">Step insight</p>
                  <h3 id="biology-step-note-title" className="font-display text-lg sm:text-xl font-bold truncate">
                    The science behind it
                  </h3>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 font-mono text-xs font-bold text-white">
                {currentStep.stepNumber} / {experiment.steps.length}
              </span>
            </div>

            <div className="p-5 sm:p-7 space-y-5 overflow-y-auto bg-[#F8FBF9]">
              <section className="rounded-2xl border border-[#DCEAE1] bg-white p-4 sm:p-5 shadow-sm">
                <p className="text-[10px] uppercase tracking-[.16em] font-extrabold text-[#0D7A5F] mb-2">What happened</p>
                <p className="text-sm sm:text-base text-[#24372E] leading-relaxed">{currentStep.scienceNote}</p>
              </section>

              <section className="rounded-2xl border border-[#DCEAE1] bg-white p-4 sm:p-5 shadow-sm">
                <p className="text-[10px] uppercase tracking-[.16em] font-extrabold text-[#64786C] mb-3">Lab readout</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(currentStep.readouts && currentStep.readouts.length === 3
                  ? currentStep.readouts
                  : [
                      {
                        label: currentStep.measurement.label.toUpperCase(),
                        value: `${currentStep.measurement.value} ${currentStep.measurement.unit}`.trim(),
                      },
                      { label: 'STEP', value: `${currentStep.stepNumber} of ${experiment.steps.length}` },
                      {
                        label: 'OBSERVATION',
                        value: currentStep.effect.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                      },
                    ]
                ).map((box) => (
                  <div
                    key={box.label}
                    className="min-w-0 rounded-xl bg-[#F3F8F5] border border-[#E0EBE4] p-3 text-left"
                  >
                    <p className="text-[10px] uppercase font-mono font-bold text-[#607568] tracking-wide mb-1">
                      {box.label}
                    </p>
                    <p className="font-mono text-sm font-bold text-[#19372A] leading-snug break-words">
                      {box.value}
                    </p>
                  </div>
                ))}
                </div>
              </section>

              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[.16em] font-extrabold text-[#0D7A5F] mb-1">Key term</p>
                <p className="text-sm text-[#33483B] leading-relaxed">
                  <span className="font-extrabold text-[#0B5D49]">{currentStep.keyTerm.term}</span>
                  <span className="text-[#75877C]"> · </span>{currentStep.keyTerm.definition}
                </p>
              </section>

              <div className="rounded-2xl border border-[#DCEAE1] bg-white p-3 sm:p-4 shadow-sm">
                <MiniDiagram kind={currentStep.miniDiagram} />
              </div>
            </div>

            <div className="px-5 sm:px-7 py-4 bg-white border-t border-[#E3EFE8] flex items-center justify-between gap-4">
              <span className="hidden sm:block text-xs text-[#718278]">Take a moment to review this step.</span>
              <button
                type="button"
                onClick={handleContinueScienceNote}
                className="ml-auto px-6 py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#0A634D] active:scale-[.98] text-white text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-900/15 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {stepIndex + 1 >= experiment.steps.length ? 'Finish Experiment' : 'Continue'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {phase === 'completed' && completionResult && (
        <div
          className="fixed inset-0 z-40 bg-[#0B1D14]/55 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-lg w-full bg-white border border-[#C6DBD0] rounded-2xl shadow-2xl p-7 text-center space-y-5">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-8 h-8 ${
                    s <= completionResult.stars
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-[#DCECE3]'
                  }`}
                />
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#0D7A5F]">Biology Lab Complete</p>
              <h2 className="font-display text-2xl font-bold text-[#11241B]">
                {experiment.experimentTitle}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F6FAF7] border border-[#DCECE3] p-3.5">
                <p className="text-xs text-[#4E6B5D]">Accuracy</p>
                <p className="font-mono text-2xl font-bold text-[#11241B] mt-0.5">
                  {completionResult.accuracyPct}%
                </p>
              </div>
              <div className="rounded-xl bg-[#ECF7F1] border border-[#BFE2CF] p-3.5">
                <p className="text-xs text-[#0D7A5F]">Lab Points</p>
                <p className="font-mono text-2xl font-bold text-[#0D7A5F] mt-0.5 flex items-center justify-center gap-1">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>+{completionResult.labPointsAwarded}</span>
                </p>
              </div>
            </div>

            {isControl && rateReadings.length > 0 && (
              <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] p-3 text-left space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-sky-300">
                  <span>RECORDED PHOTOSYNTHESIS RATE PROFILE</span>
                  <span>Peak: {Math.max(...rateReadings.map((r) => r.rate))} bub/min</span>
                </div>
                <svg viewBox="0 0 340 86" className="w-full h-22">
                  <line x1="28" y1="8" x2="28" y2="66" stroke="#475569" strokeWidth="1.2" />
                  <line x1="28" y1="66" x2="328" y2="66" stroke="#475569" strokeWidth="1.2" />
                  {rateReadings.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                      points={rateReadings
                        .map((r, i) => {
                          const x = 36 + (i / Math.max(1, rateReadings.length - 1)) * 280;
                          const y = 62 - Math.min(1, r.rate / 45) * 50;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ')}
                    />
                  )}
                  {rateReadings.map((r, i) => {
                    const x = 36 + (i / Math.max(1, rateReadings.length - 1)) * 280;
                    const y = 62 - Math.min(1, r.rate / 45) * 50;
                    const dotColor = r.temp >= 45 ? '#EF4444' : r.label.includes('Optimum') ? '#10B981' : '#FACC15';
                    return (
                      <g key={r.step}>
                        <circle cx={x} cy={y} r="3.6" fill={dotColor} />
                        <text x={x} y={y - 6} textAnchor="middle" fontSize="8" fill="#E2E8F0">
                          {r.rate}
                        </text>
                        <text x={x} y="78" textAnchor="middle" fontSize="7.5" fill="#94A3B8">
                          S{r.step}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            <p className="text-xs text-[#365245] leading-relaxed bg-[#FAFDFB] border border-[#E3EFE8] rounded-xl p-3.5 text-left">
              {experiment.conceptSummary}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={resetExperiment}
                className="px-4 py-2.5 rounded-lg border border-[#C6DBD0] text-xs font-semibold text-[#11241B] hover:bg-[#EFF7F2] cursor-pointer"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  labAudio.playClick();
                  onNextVideo();
                }}
                className="px-4 py-2.5 rounded-lg border border-[#C6DBD0] text-xs font-semibold text-[#11241B] hover:bg-[#EFF7F2] cursor-pointer"
              >
                Next video
              </button>
              <button
                type="button"
                onClick={() => {
                  labAudio.playClick();
                  onGoToQuiz();
                }}
                className="px-5 py-2.5 rounded-lg bg-[#0D7A5F] hover:bg-[#0A634D] text-white text-xs font-semibold cursor-pointer"
              >
                Take the quiz (+Bonus)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
