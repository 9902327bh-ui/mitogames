import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type {
  ElectroComponent,
  ElectroEffect,
  ElectroExperiment,
  ElectroStep,
} from '../types.ts';
import { playLabTone } from '../utils/labAudio.ts';
import {
  buildLabRoom,
  createIronNailGeometry,
  createLabGlassMaterial,
  detectSoftwareWebGL,
  disposeSceneGraph,
  drawVesselLabelCanvas,
  makeForgedSteelTexture,
  makeVesselLabelTexture,
  smoothstep01,
} from '../three/LabRoom.ts';
import { LabHandCursor } from './LabHandCursor.tsx';

export interface Electro3DProps {
  experiment: ElectroExperiment;
  onFinish: (r: { accuracy: number; points: number }) => void;
  onNewVideo: () => void;
  onTakeQuiz?: (r: { accuracy: number; points: number }) => void;
}

type ElectroPhase =
  | 'gloves'
  | 'awaiting_source'
  | 'awaiting_target'
  | 'animating'
  | 'science_note'
  | 'label_diagram'
  | 'half_reactions'
  | 'completed';

interface ComponentRuntime {
  spec: ElectroComponent;
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  basePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  terminalPos: THREE.Vector3;
  shakeTimer: number;
  hoverAmount: number;
  placed: boolean;
  // Kind-specific handles
  liquidMesh?: THREE.Mesh;
  meniscusMesh?: THREE.Mesh;
  liquidMat?: THREE.MeshStandardMaterial;
  meniscusMat?: THREE.MeshStandardMaterial;
  clipPlane?: THREE.Plane;
  currentFill: number;
  targetFill: number;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  innerBottomY: number;
  innerHeight: number;
  profileRadius: number;
  h2GasMesh?: THREE.Mesh;
  o2GasMesh?: THREE.Mesh;
  bulbFilamentMat?: THREE.MeshStandardMaterial;
  bulbHaloMat?: THREE.MeshBasicMaterial;
  bulbHaloMesh?: THREE.Mesh;
  bulbLight?: THREE.PointLight;
  leverPivot?: THREE.Group;
  switchClosed?: boolean;
  needlePivot?: THREE.Group;
  needleAngle: number;
  needleVel: number;
  targetNeedleAngle: number;
  electrodeMesh?: THREE.Mesh;
  electrodeMat?: THREE.MeshStandardMaterial;
  electrodeScaleXZ: number;
  targetElectrodeScaleXZ: number;
  targetElectrodeColor?: THREE.Color;
  badgeTex?: THREE.CanvasTexture;
  badgeMat?: THREE.MeshBasicMaterial;
}

interface WireConnection {
  curve: THREE.CatmullRomCurve3;
  tubeMesh: THREE.Mesh;
  tubeGeo: THREE.TubeGeometry;
  mat: THREE.MeshStandardMaterial;
  clipStart: THREE.Group;
  clipEnd: THREE.Group;
  growProgress: number; // 0..1
  flowReversed: boolean;
}

interface ActiveParticle {
  active: boolean;
  kind: 'bubble_c' | 'bubble_a' | 'sparkle' | 'spark' | 'droplet';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  scale: number;
  color: THREE.Color;
}

interface IonParticle {
  mesh: THREE.Mesh;
  sprite: THREE.Sprite;
  isCation: boolean;
  beakerIdx: number;
  phase: number;
  yFrac: number;
  zOff: number;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _colorA = new THREE.Color();
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();

function makeAnalogMeterDialTexture(kind: 'voltmeter' | 'ammeter'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fefce8';
  ctx.fillRect(0, 0, 256, 192);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 248, 184);

  // Arc scale ticks
  const cx = 128;
  const cy = 152;
  const r = 98;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  for (let i = 0; i <= 10; i++) {
    const a = THREE.MathUtils.lerp(Math.PI * 1.15, Math.PI * 1.85, i / 10);
    const rIn = i % 2 === 0 ? r - 14 : r - 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }

  ctx.fillStyle = kind === 'voltmeter' ? '#0284c7' : '#d97706';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(kind === 'voltmeter' ? 'V' : 'A', cx, 108);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(kind === 'voltmeter' ? '0       1.5     3.0V' : '0      1.0     2.0A', cx, 174);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLemonSkinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i++) {
    const x = (i * 157 + 23) % 256;
    const y = (i * 211 + 41) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(202, 138, 4, 0.28)' : 'rgba(254, 249, 195, 0.32)';
    ctx.beginPath();
    ctx.arc(x, y, 1.8 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeIonSignTexture(sign: '+' | '−', bgColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sign, 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function resolveElectrodeColor(comp: ElectroComponent): string {
  const mat = (comp.material ?? comp.name).toLowerCase();
  if (/cu|copper|coin/.test(mat)) return '#d97706';
  if (/zn|zinc/.test(mat)) return '#94a3b8';
  if (/graphite|carbon|\bc\b/.test(mat)) return '#1f2937';
  if (/fe|iron|steel|nail/.test(mat)) return '#cbd5e1';
  if (/ag|silver/.test(mat)) return '#e2e8f0';
  return comp.color || '#94a3b8';
}

function createBeakerGeo(): {
  outerGeo: THREE.LatheGeometry;
  innerGeo: THREE.LatheGeometry;
  innerBottomY: number;
  innerHeight: number;
  profileRadius: number;
} {
  const ptsOuter = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.38, 0.0),
    new THREE.Vector2(0.4, 0.86),
    new THREE.Vector2(0.43, 0.91),
    new THREE.Vector2(0.39, 0.91),
  ];
  const innerBottomY = 0.03;
  const innerHeight = 0.8;
  const ptsInner = [
    new THREE.Vector2(0.0, innerBottomY),
    new THREE.Vector2(0.36, innerBottomY),
    new THREE.Vector2(0.37, innerBottomY + innerHeight),
    new THREE.Vector2(0.0, innerBottomY + innerHeight),
  ];
  return {
    outerGeo: new THREE.LatheGeometry(ptsOuter, 36),
    innerGeo: new THREE.LatheGeometry(ptsInner, 32),
    innerBottomY,
    innerHeight,
    profileRadius: 0.365,
  };
}

function makeCrocodileClip(colorHex: string): THREE.Group {
  const clip = new THREE.Group();
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.042, 0.14, 12),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 })
  );
  sleeve.rotation.x = Math.PI / 2;
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.036, 0.1),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.25 })
  );
  jaw.position.z = 0.09;
  clip.add(sleeve, jaw);
  return clip;
}

export const Electro3D: React.FC<Electro3DProps> = ({
  experiment,
  onFinish,
  onNewVideo,
  onTakeQuiz,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<ElectroPhase>('gloves');
  const [stepIdx, setStepIdx] = useState(0);
  const [glovesOn, setGlovesOn] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [rightClicks, setRightClicks] = useState(0);
  const [wrongClicks, setWrongClicks] = useState(0);
  const [stepWrongCount, setStepWrongCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'error' | 'info' | 'good' } | null>(
    null
  );
  const [muted, setMuted] = useState(false);
  const [runSeed, setRunSeed] = useState(0);

  // Live electro telemetry state
  const [voltageVal, setVoltageVal] = useState(0);
  const [currentVal, setCurrentVal] = useState(0);
  const [electronLegendActive, setElectronLegendActive] = useState(false);

  // Labelled-diagram challenge state
  const labelableElectrodes = useMemo(() => {
    const candidates = experiment.components.filter(
      (c) => c.polarity === 'anode' || c.polarity === 'cathode'
    );
    const anode = candidates.find((c) => c.polarity === 'anode');
    const cathode = candidates.find((c) => c.polarity === 'cathode');
    return anode && cathode ? [anode, cathode] : [];
  }, [experiment.components]);

  const [assignedLabels, setAssignedLabels] = useState<Record<string, 'anode' | 'cathode'>>({});
  const [pickedLabelChip, setPickedLabelChip] = useState<'anode' | 'cathode' | null>(null);
  const [diagramShakeId, setDiagramShakeId] = useState<string | null>(null);

  // Cartoon hand / glove cursor
  const cursorDivRef = useRef<HTMLDivElement>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHovering, setCursorHovering] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const currentStep: ElectroStep | null = useMemo(
    () => (stepIdx < experiment.steps.length ? experiment.steps[stepIdx] : null),
    [experiment.steps, stepIdx]
  );

  const stateRef = useRef({
    phase,
    stepIdx,
    glovesOn,
    selectedSourceId,
    muted,
    stepWrongCount,
    rightClicks,
    wrongClicks,
    assignedLabels,
  });
  stateRef.current = {
    phase,
    stepIdx,
    glovesOn,
    selectedSourceId,
    muted,
    stepWrongCount,
    rightClicks,
    wrongClicks,
    assignedLabels,
  };

  const experimentRef = useRef(experiment);
  experimentRef.current = experiment;

  const toastTimerRef = useRef<number | null>(null);
  const showToast = (text: string, tone: 'error' | 'info' | 'good' = 'info') => {
    setToast({ text, tone });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const clockLabel = useMemo(() => {
    const mins = (glovesOn ? 2 : 0) + stepIdx * 4;
    const hh = 8 + Math.floor(mins / 60);
    const mm = mins % 60;
    return `DAY 1  ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} AM`;
  }, [glovesOn, stepIdx]);

  const totalSteps = experiment.steps.length + 1 + (labelableElectrodes.length === 2 ? 1 : 0);
  const completedCount =
    (glovesOn ? 1 : 0) + stepIdx + (phase === 'half_reactions' || phase === 'completed' ? 1 : 0);
  const progressPct =
    phase === 'completed'
      ? 100
      : Math.min(99, Math.round((completedCount / Math.max(1, totalSteps)) * 100));

  const accuracyPct = useMemo(() => {
    const total = rightClicks + wrongClicks;
    if (total === 0) return 100;
    return Math.max(0, Math.min(100, Math.round((rightClicks / total) * 100)));
  }, [rightClicks, wrongClicks]);

  const finalPoints = useMemo(
    () => accuracyPct + 20 * experiment.steps.length,
    [accuracyPct, experiment.steps.length]
  );

  const starCount = accuracyPct >= 90 ? 3 : accuracyPct >= 70 ? 2 : 1;

  const isTwoClickAction = (action: ElectroStep['action']) =>
    action === 'place' || action === 'connect' || action === 'pour_electrolyte';

  const handleRestart = () => {
    setPhase('gloves');
    setStepIdx(0);
    setGlovesOn(false);
    setSelectedSourceId(null);
    setRightClicks(0);
    setWrongClicks(0);
    setStepWrongCount(0);
    setShowHint(false);
    setToast(null);
    setVoltageVal(0);
    setCurrentVal(0);
    setElectronLegendActive(false);
    setAssignedLabels({});
    setPickedLabelChip(null);
    setRunSeed((s) => s + 1);
  };

  const handleManualHint = () => {
    if (!showHint && currentStep) {
      setWrongClicks((w) => w + 1);
      setShowHint(true);
      playLabTone('drop', muted);
    } else if (phase === 'gloves') {
      setShowHint(true);
    }
  };

  const finishLabAndRecord = () => {
    setPhase('completed');
    playLabTone('victory', muted);
    const total = rightClicks + wrongClicks;
    const finalAcc = total === 0 ? 100 : Math.round((rightClicks / total) * 100);
    const pts = finalAcc + 20 * experiment.steps.length;
    onFinish({ accuracy: finalAcc, points: pts });
  };

  const handleContinueAfterScience = () => {
    const nextIdx = stepIdx + 1;
    setShowHint(false);
    setStepWrongCount(0);
    setSelectedSourceId(null);
    if (nextIdx >= experiment.steps.length) {
      if (labelableElectrodes.length === 2) {
        setPhase('label_diagram');
      } else if (experiment.halfReactions.length > 0) {
        setPhase('half_reactions');
      } else {
        finishLabAndRecord();
      }
    } else {
      setStepIdx(nextIdx);
      const nextStep = experiment.steps[nextIdx];
      setPhase(
        isTwoClickAction(nextStep.action) && nextStep.sourceId !== nextStep.targetId
          ? 'awaiting_source'
          : 'awaiting_target'
      );
    }
  };

  const handleAssignDiagramLabel = (compId: string, label: 'anode' | 'cathode') => {
    const targetComp = labelableElectrodes.find((c) => c.id === compId);
    if (!targetComp) return;
    if (assignedLabels[compId]) return;

    if (targetComp.polarity === label) {
      const next = { ...assignedLabels, [compId]: label };
      setAssignedLabels(next);
      setPickedLabelChip(null);
      setRightClicks((r) => r + 1);
      playLabTone('chime', muted);
      showToast(`Correct! ${targetComp.name} is the ${label.toUpperCase()}!`, 'good');

      if (Object.keys(next).length === labelableElectrodes.length) {
        window.setTimeout(() => {
          if (experiment.halfReactions.length > 0) {
            setPhase('half_reactions');
          } else {
            finishLabAndRecord();
          }
        }, 650);
      }
    } else {
      setWrongClicks((w) => w + 1);
      setDiagramShakeId(compId);
      playLabTone('error', muted);
      showToast(
        label === 'anode'
          ? 'Remember: Oxidation (loss of electrons) happens at the Anode!'
          : 'Remember: Reduction (gain of electrons) happens at the Cathode!',
        'error'
      );
      window.setTimeout(() => setDiagramShakeId(null), 450);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && phase === 'science_note') {
        handleContinueAfterScience();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    const isSoftwareGl = detectSoftwareWebGL(renderer);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 960, container.clientHeight || 560, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.localClippingEnabled = true;

    if (!isSoftwareGl) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      renderer.shadowMap.enabled = false;
    }

    const scene = new THREE.Scene();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 560;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 40);
    const baseCamPos = new THREE.Vector3(0, 2.58, 6.22);
    const baseLookAt = new THREE.Vector3(0, 0.1, -0.05);
    camera.position.copy(baseCamPos);
    camera.lookAt(baseLookAt);

    const { trackTex, createdTextures, gbHit, peekingGloveGroup, updateMeterLines } = buildLabRoom(
      scene,
      renderer,
      isSoftwareGl,
      {
        includeHotPlate: false,
        initialMeterLines: ['VOLT 0.00V', 'CURR 0.00A', 'CIRCUIT   '],
        meterPosition: [-2.45, 0.25, -0.82],
      }
    );

    const glassMat = createLabGlassMaterial(isSoftwareGl);
    const hasGasCollect = experiment.steps.some((s) => s.effect === 'gas_collect');
    const pouredTargets = new Set(
      experiment.steps.filter((s) => s.action === 'pour_electrolyte').map((s) => s.targetId)
    );

    // --- COMPUTE SMART BENCH LAYOUT FOR COMPONENTS ---
    const centers = experiment.components.filter(
      (c) => c.kind === 'cell_beaker' || c.kind === 'lemon' || c.kind === 'container'
    );
    const metersAndLoads = experiment.components.filter(
      (c) =>
        c.kind === 'battery' ||
        c.kind === 'power_supply' ||
        c.kind === 'voltmeter' ||
        c.kind === 'ammeter' ||
        c.kind === 'bulb' ||
        c.kind === 'switch' ||
        c.kind === 'resistor'
    );
    const stagingItems = experiment.components.filter(
      (c) => !centers.includes(c) && !metersAndLoads.includes(c)
    );

    const layoutPosMap = new Map<string, THREE.Vector3>();
    // 1. Center cells / lemons
    centers.forEach((c, idx) => {
      const n = centers.length;
      const spread = n > 1 ? 1.38 : 0;
      const x = n === 1 ? 0 : (idx - (n - 1) / 2) * spread;
      layoutPosMap.set(c.id, new THREE.Vector3(x, 0, -0.08));
    });

    // 2. Upper/left bench apparatus
    const upperSlots: THREE.Vector3[] = [
      new THREE.Vector3(-1.82, 0, -0.1),
      new THREE.Vector3(1.52, 0, -0.25),
      new THREE.Vector3(-0.78, 0, -0.92),
      new THREE.Vector3(0.72, 0, -0.92),
      new THREE.Vector3(0.0, 0, -0.95),
      new THREE.Vector3(-1.55, 0, 0.55),
    ];
    metersAndLoads.forEach((c, idx) => {
      const slot = upperSlots[idx % upperSlots.length].clone();
      if (idx >= upperSlots.length) slot.x += 0.45 * (idx - upperSlots.length + 1);
      layoutPosMap.set(c.id, slot);
    });

    // 3. Front staging items (electrodes, wires, salt bridge, electrolyte, nail, coin)
    const stageCount = stagingItems.length;
    const stageStartX = -Math.min(2.1, (stageCount - 1) * 0.46);
    const stageStepX = stageCount > 1 ? Math.min(3.5, (stageCount - 1) * 0.9) / (stageCount - 1) : 0;
    stagingItems.forEach((c, idx) => {
      layoutPosMap.set(c.id, new THREE.Vector3(stageStartX + idx * stageStepX, 0, 0.88));
    });

    const clickableMeshes: THREE.Object3D[] = [gbHit];
    const compMap = new Map<string, ComponentRuntime>();
    const beakerCenters: THREE.Vector3[] = [];
    const steelTex = trackTex(makeForgedSteelTexture());
    const lemonTex = trackTex(makeLemonSkinTexture());

    // Build ONLY the components requested by experiment.components
    experiment.components.forEach((comp) => {
      const group = new THREE.Group();
      const basePos = (layoutPosMap.get(comp.id) ?? new THREE.Vector3(0, 0, 0)).clone();
      group.position.copy(basePos);

      const rt: ComponentRuntime = {
        spec: comp,
        group,
        hitMesh: new THREE.Mesh(),
        basePos: basePos.clone(),
        targetPos: basePos.clone(),
        terminalPos: new THREE.Vector3(basePos.x, basePos.y + 0.45, basePos.z),
        shakeTimer: 0,
        hoverAmount: 0,
        placed:
          comp.kind !== 'electrode' &&
          comp.kind !== 'salt_bridge' &&
          comp.kind !== 'coin' &&
          comp.kind !== 'nail',
        currentFill: 0,
        targetFill: 0,
        currentColor: new THREE.Color(comp.color || '#38bdf8'),
        targetColor: new THREE.Color(comp.color || '#38bdf8'),
        innerBottomY: 0.03,
        innerHeight: 0.8,
        profileRadius: 0.365,
        needleAngle: 0.95,
        needleVel: 0,
        targetNeedleAngle: 0.95,
        electrodeScaleXZ: 1,
        targetElectrodeScaleXZ: 1,
      };

      let hitGeo: THREE.BufferGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.95, 12);
      let hitY = 0.45;
      let terminalLocalY = 0.52;

      switch (comp.kind) {
        case 'battery': {
          // 9V battery block with + brass stud, - cap, and green charge-level LED bar
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.46, 0.68, 0.32),
            new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 })
          );
          body.position.y = 0.34;
          body.castShadow = !isSoftwareGl;
          const wrap = new THREE.Mesh(
            new THREE.BoxGeometry(0.47, 0.42, 0.33),
            new THREE.MeshStandardMaterial({ color: comp.color || '#f59e0b', roughness: 0.35 })
          );
          wrap.position.y = 0.44;
          const plusStud = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.09, 14),
            new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.85, roughness: 0.25 })
          );
          plusStud.position.set(0.11, 0.72, 0);
          const minusStud = new THREE.Mesh(
            new THREE.CylinderGeometry(0.065, 0.055, 0.08, 14),
            new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.25 })
          );
          minusStud.position.set(-0.11, 0.72, 0);
          const chargeBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.06, 0.02),
            new THREE.MeshStandardMaterial({
              color: '#22c55e',
              emissive: '#16a34a',
              emissiveIntensity: 0.8,
            })
          );
          chargeBar.position.set(0, 0.34, 0.168);
          group.add(body, wrap, plusStud, minusStud, chargeBar);
          terminalLocalY = 0.75;
          hitGeo = new THREE.BoxGeometry(0.62, 0.88, 0.48);
          hitY = 0.42;
          break;
        }

        case 'power_supply': {
          const chassis = new THREE.Mesh(
            new THREE.BoxGeometry(0.88, 0.62, 0.64),
            new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45, metalness: 0.25 })
          );
          chassis.position.y = 0.31;
          chassis.castShadow = !isSoftwareGl;
          const face = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.52, 0.03),
            new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.35 })
          );
          face.position.set(0, 0.31, 0.32);
          const display = new THREE.Mesh(
            new THREE.PlaneGeometry(0.38, 0.16),
            new THREE.MeshBasicMaterial({ color: '#ef4444' })
          );
          display.position.set(-0.14, 0.42, 0.34);
          const knob = new THREE.Mesh(
            new THREE.CylinderGeometry(0.075, 0.075, 0.07, 18),
            new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.7, roughness: 0.28 })
          );
          knob.rotation.x = Math.PI / 2;
          knob.position.set(0.2, 0.41, 0.35);
          const postPos = new THREE.Mesh(
            new THREE.CylinderGeometry(0.036, 0.036, 0.08, 12),
            new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.3 })
          );
          postPos.rotation.x = Math.PI / 2;
          postPos.position.set(0.22, 0.16, 0.35);
          const postNeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.036, 0.036, 0.08, 12),
            new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.3 })
          );
          postNeg.rotation.x = Math.PI / 2;
          postNeg.position.set(-0.22, 0.16, 0.35);
          group.add(chassis, face, display, knob, postPos, postNeg);
          terminalLocalY = 0.25;
          hitGeo = new THREE.BoxGeometry(1.0, 0.75, 0.75);
          hitY = 0.35;
          break;
        }

        case 'cell_beaker':
        case 'container':
        case 'electrolyte': {
          const isPourReagent = comp.kind === 'electrolyte';
          const scale = isPourReagent ? 0.78 : 1.0;
          const bGeo = createBeakerGeo();
          const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.5);
          const initFill = isPourReagent ? 0.72 : pouredTargets.has(comp.id) ? 0.12 : 0.62;
          const startCol = new THREE.Color(comp.color || '#38bdf8');

          const liquidMat = new THREE.MeshStandardMaterial({
            color: startCol.clone(),
            roughness: 0.16,
            metalness: 0.06,
            transparent: true,
            opacity: 0.82,
            clippingPlanes: [clipPlane],
            side: THREE.DoubleSide,
          });
          const liquidMesh = new THREE.Mesh(bGeo.innerGeo, liquidMat);
          liquidMesh.scale.setScalar(scale);
          liquidMesh.renderOrder = 1;

          const meniscusMat = new THREE.MeshStandardMaterial({
            color: startCol.clone(),
            roughness: 0.1,
            transparent: true,
            opacity: 0.88,
            side: THREE.DoubleSide,
          });
          const meniscusMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 28), meniscusMat);
          meniscusMesh.rotation.x = -Math.PI / 2;
          meniscusMesh.renderOrder = 2;

          const glassMesh = new THREE.Mesh(bGeo.outerGeo, glassMat);
          glassMesh.scale.setScalar(scale);
          glassMesh.castShadow = !isSoftwareGl;
          glassMesh.renderOrder = 3;

          group.add(liquidMesh, meniscusMesh, glassMesh);

          // Optional twin inverted gas collection tubes for water electrolysis
          if (!isPourReagent && hasGasCollect) {
            [-0.17, 0.17].forEach((tx, tIdx) => {
              const tubeGlass = new THREE.Mesh(
                new THREE.CylinderGeometry(0.068, 0.068, 0.72, 16, 1, true),
                glassMat
              );
              tubeGlass.position.set(tx, 0.58, 0);
              tubeGlass.renderOrder = 4;
              const cap = new THREE.Mesh(
                new THREE.SphereGeometry(0.068, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
                glassMat
              );
              cap.position.set(tx, 0.94, 0);
              cap.renderOrder = 4;

              const gasPocket = new THREE.Mesh(
                new THREE.CylinderGeometry(0.056, 0.056, 1, 14),
                new THREE.MeshStandardMaterial({
                  color: tIdx === 0 ? '#bae6fd' : '#fecaca',
                  transparent: true,
                  opacity: 0.72,
                  roughness: 0.15,
                })
              );
              gasPocket.position.set(tx, 0.93, 0);
              gasPocket.scale.set(1, 0.02, 1);
              gasPocket.visible = false;
              gasPocket.renderOrder = 2;

              group.add(tubeGlass, cap, gasPocket);
              if (tIdx === 0) rt.h2GasMesh = gasPocket;
              else rt.o2GasMesh = gasPocket;
            });
          }

          if (!isPourReagent) {
            beakerCenters.push(basePos.clone());
          }

          rt.liquidMesh = liquidMesh;
          rt.meniscusMesh = meniscusMesh;
          rt.liquidMat = liquidMat;
          rt.meniscusMat = meniscusMat;
          rt.clipPlane = clipPlane;
          rt.currentFill = initFill;
          rt.targetFill = initFill;
          rt.currentColor.copy(startCol);
          rt.targetColor.copy(startCol);
          rt.innerBottomY = bGeo.innerBottomY * scale;
          rt.innerHeight = bGeo.innerHeight * scale;
          rt.profileRadius = bGeo.profileRadius * scale;
          terminalLocalY = 0.85 * scale;
          hitGeo = new THREE.CylinderGeometry(0.45 * scale, 0.45 * scale, 1.05 * scale, 12);
          hitY = 0.5 * scale;
          break;
        }

        case 'electrode': {
          const eCol = resolveElectrodeColor(comp);
          const eMat = new THREE.MeshStandardMaterial({
            color: eCol,
            metalness: /graphite|carbon|\bc\b/i.test(comp.material ?? comp.name) ? 0.18 : 0.88,
            roughness: /graphite|carbon|\bc\b/i.test(comp.material ?? comp.name) ? 0.65 : 0.24,
          });
          const slab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.74, 0.05), eMat);
          slab.position.y = 0.37;
          slab.castShadow = !isSoftwareGl;
          const lug = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.09, 12),
            new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.85, roughness: 0.25 })
          );
          lug.position.y = 0.78;
          group.add(slab, lug);

          // Small 3D badge that updates from formula/material to "anode (-)" / "cathode (+)" once placed
          const badgeTex = trackTex(
            makeVesselLabelTexture(
              comp.material || comp.name,
              comp.formula || 'Electrode',
              '#38bdf8',
              '#0369a1'
            )
          );
          const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTex });
          const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.18), badgeMat);
          badge.position.set(0, 0.94, 0.04);
          group.add(badge);

          rt.electrodeMesh = slab;
          rt.electrodeMat = eMat;
          rt.targetElectrodeColor = new THREE.Color(eCol);
          rt.badgeTex = badgeTex;
          rt.badgeMat = badgeMat;
          terminalLocalY = 0.78;
          hitGeo = new THREE.BoxGeometry(0.42, 1.05, 0.36);
          hitY = 0.5;
          break;
        }

        case 'wire': {
          const wCol = comp.color || '#ef4444';
          const coil = new THREE.Mesh(
            new THREE.TorusGeometry(0.18, 0.03, 10, 28),
            new THREE.MeshStandardMaterial({ color: wCol, roughness: 0.42 })
          );
          coil.rotation.x = Math.PI / 2;
          coil.position.y = 0.05;
          const clip = makeCrocodileClip(wCol);
          clip.position.set(0.16, 0.07, 0.08);
          group.add(coil, clip);
          terminalLocalY = 0.1;
          hitGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.35, 12);
          hitY = 0.16;
          break;
        }

        case 'bulb': {
          const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.25, 0.14, 20),
            new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.45 })
          );
          base.position.y = 0.07;
          const brass = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.12, 0.14, 18),
            new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.85, roughness: 0.25 })
          );
          brass.position.y = 0.19;
          const bulbFilamentMat = new THREE.MeshStandardMaterial({
            color: '#94a3b8',
            emissive: new THREE.Color('#fef08a'),
            emissiveIntensity: 0,
            roughness: 0.3,
          });
          const filament = new THREE.Mesh(
            new THREE.TorusGeometry(0.055, 0.012, 8, 18),
            bulbFilamentMat
          );
          filament.position.y = 0.39;
          const globe = new THREE.Mesh(new THREE.SphereGeometry(0.18, 22, 18), glassMat);
          globe.position.y = 0.41;
          globe.renderOrder = 3;

          const bulbHaloMat = new THREE.MeshBasicMaterial({
            color: '#fde047',
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          const bulbHaloMesh = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 16), bulbHaloMat);
          bulbHaloMesh.position.y = 0.41;

          const bulbLight = new THREE.PointLight('#fef08a', 0, 3.6);
          bulbLight.position.y = 0.55;

          group.add(base, brass, filament, globe, bulbHaloMesh, bulbLight);
          rt.bulbFilamentMat = bulbFilamentMat;
          rt.bulbHaloMat = bulbHaloMat;
          rt.bulbHaloMesh = bulbHaloMesh;
          rt.bulbLight = bulbLight;
          terminalLocalY = 0.14;
          hitGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.72, 12);
          hitY = 0.35;
          break;
        }

        case 'switch': {
          const slate = new THREE.Mesh(
            new THREE.BoxGeometry(0.56, 0.1, 0.34),
            new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5 })
          );
          slate.position.y = 0.05;
          const postL = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12),
            new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.85, roughness: 0.25 })
          );
          postL.position.set(-0.18, 0.14, 0);
          const postR = postL.clone();
          postR.position.set(0.18, 0.14, 0);

          const leverPivot = new THREE.Group();
          leverPivot.position.set(-0.18, 0.17, 0);
          leverPivot.rotation.z = 0.82; // starts open
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.035, 0.03),
            new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.88, roughness: 0.2 })
          );
          blade.position.x = 0.18;
          const grip = new THREE.Mesh(
            new THREE.CylinderGeometry(0.032, 0.032, 0.12, 12),
            new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4 })
          );
          grip.rotation.z = Math.PI / 2;
          grip.position.x = 0.36;
          leverPivot.add(blade, grip);

          group.add(slate, postL, postR, leverPivot);
          rt.leverPivot = leverPivot;
          rt.switchClosed = false;
          terminalLocalY = 0.16;
          hitGeo = new THREE.BoxGeometry(0.68, 0.55, 0.48);
          hitY = 0.25;
          break;
        }

        case 'voltmeter':
        case 'ammeter': {
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.52, 0.34),
            new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.42 })
          );
          body.position.y = 0.28;
          body.castShadow = !isSoftwareGl;
          const face = new THREE.Mesh(
            new THREE.PlaneGeometry(0.56, 0.42),
            new THREE.MeshBasicMaterial({
              map: trackTex(makeAnalogMeterDialTexture(comp.kind)),
            })
          );
          face.position.set(0, 0.3, 0.175);

          const needlePivot = new THREE.Group();
          needlePivot.position.set(0, 0.18, 0.185);
          needlePivot.rotation.z = 0.95; // starts at 0 on left side
          const needle = new THREE.Mesh(
            new THREE.BoxGeometry(0.016, 0.22, 0.01),
            new THREE.MeshBasicMaterial({ color: '#dc2626' })
          );
          needle.position.y = 0.11;
          needlePivot.add(needle);

          group.add(body, face, needlePivot);
          rt.needlePivot = needlePivot;
          terminalLocalY = 0.2;
          hitGeo = new THREE.BoxGeometry(0.76, 0.65, 0.46);
          hitY = 0.3;
          break;
        }

        case 'resistor': {
          const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.56, 0.08, 0.28),
            new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 })
          );
          base.position.y = 0.04;
          const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.065, 0.065, 0.3, 16),
            new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.45 })
          );
          body.rotation.z = Math.PI / 2;
          body.position.y = 0.18;
          ['#dc2626', '#7c3aed', '#f59e0b'].forEach((bCol, i) => {
            const band = new THREE.Mesh(
              new THREE.CylinderGeometry(0.068, 0.068, 0.032, 16),
              new THREE.MeshStandardMaterial({ color: bCol, roughness: 0.4 })
            );
            band.rotation.z = Math.PI / 2;
            band.position.set(-0.07 + i * 0.06, 0.18, 0);
            group.add(band);
          });
          group.add(base, body);
          terminalLocalY = 0.16;
          hitGeo = new THREE.BoxGeometry(0.64, 0.35, 0.38);
          hitY = 0.15;
          break;
        }

        case 'salt_bridge': {
          const uCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.56, 0.06, 0),
            new THREE.Vector3(-0.54, 0.62, 0),
            new THREE.Vector3(0.0, 0.82, 0),
            new THREE.Vector3(0.54, 0.62, 0),
            new THREE.Vector3(0.56, 0.06, 0),
          ]);
          const bridgeGlass = new THREE.Mesh(new THREE.TubeGeometry(uCurve, 32, 0.062, 14, false), glassMat);
          bridgeGlass.renderOrder = 3;
          const agarGel = new THREE.Mesh(
            new THREE.TubeGeometry(uCurve, 32, 0.046, 12, false),
            new THREE.MeshStandardMaterial({
              color: '#f8fafc',
              roughness: 0.35,
              transparent: true,
              opacity: 0.88,
            })
          );
          group.add(agarGel, bridgeGlass);
          terminalLocalY = 0.65;
          hitGeo = new THREE.BoxGeometry(1.24, 0.9, 0.34);
          hitY = 0.44;
          break;
        }

        case 'lemon': {
          const lGeo = new THREE.SphereGeometry(0.3, 24, 18);
          lGeo.scale(1.38, 0.92, 0.94);
          const lemonMesh = new THREE.Mesh(
            lGeo,
            new THREE.MeshStandardMaterial({ map: lemonTex, roughness: 0.48 })
          );
          lemonMesh.position.y = 0.27;
          lemonMesh.castShadow = !isSoftwareGl;
          const leaf = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 10, 8),
            new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.55 })
          );
          leaf.scale.set(1.5, 0.3, 0.8);
          leaf.position.set(-0.38, 0.34, 0);
          group.add(lemonMesh, leaf);
          terminalLocalY = 0.48;
          hitGeo = new THREE.BoxGeometry(0.9, 0.65, 0.64);
          hitY = 0.28;
          break;
        }

        case 'coin': {
          const coin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 0.032, 24),
            new THREE.MeshStandardMaterial({
              color: comp.color || '#d97706',
              metalness: 0.9,
              roughness: 0.22,
            })
          );
          coin.rotation.z = Math.PI / 2;
          coin.position.y = 0.15;
          coin.castShadow = !isSoftwareGl;
          group.add(coin);
          rt.electrodeMesh = coin;
          terminalLocalY = 0.24;
          hitGeo = new THREE.BoxGeometry(0.36, 0.36, 0.36);
          hitY = 0.16;
          break;
        }

        case 'nail': {
          const nailMat = new THREE.MeshStandardMaterial({
            map: steelTex,
            color: '#cbd5e1',
            metalness: 0.86,
            roughness: 0.34,
          });
          const nailMesh = new THREE.Mesh(createIronNailGeometry(), nailMat);
          nailMesh.scale.setScalar(0.62);
          nailMesh.position.y = 0.02;
          nailMesh.castShadow = !isSoftwareGl;
          group.add(nailMesh);
          rt.electrodeMesh = nailMesh;
          rt.electrodeMat = nailMat;
          terminalLocalY = 0.42;
          hitGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.52, 12);
          hitY = 0.24;
          break;
        }
      }

      rt.terminalPos.set(basePos.x, basePos.y + terminalLocalY, basePos.z);

      // Plaque on bench in front of component
      const plaqueTex = trackTex(
        makeVesselLabelTexture(comp.name, comp.formula || comp.label, '#0ea5e9', '#0369a1')
      );
      const plaqueMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.24, 0.026),
        new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.4 })
      );
      plaqueMesh.position.set(basePos.x, 0.08, basePos.z + 0.46);
      plaqueMesh.rotation.x = -0.58;
      scene.add(plaqueMesh);

      const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
      hitMesh.position.y = hitY;
      hitMesh.userData.interactId = comp.id;
      group.add(hitMesh);
      rt.hitMesh = hitMesh;
      clickableMeshes.push(hitMesh);

      scene.add(group);
      compMap.set(comp.id, rt);
    });

    // Update liquid clipping planes initially for cell beakers / electrolytes
    compMap.forEach((rt) => {
      if (rt.liquidMesh && rt.meniscusMesh && rt.clipPlane) {
        const visible = rt.currentFill > 0.015;
        rt.liquidMesh.visible = visible;
        rt.meniscusMesh.visible = visible;
        if (visible) {
          const topY = rt.innerBottomY + rt.currentFill * rt.innerHeight;
          rt.clipPlane.constant = rt.group.position.y + topY;
          rt.meniscusMesh.position.y = topY;
          rt.meniscusMesh.scale.set(rt.profileRadius, rt.profileRadius, 1);
        }
      }
    });

    // --- PULSING GOLD RING HIGHLIGHT ---
    const goldRingMat = new THREE.MeshBasicMaterial({
      color: '#facc15',
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const goldRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 40), goldRingMat);
    goldRing.rotation.x = -Math.PI / 2;
    goldRing.position.y = 0.02;
    scene.add(goldRing);

    // --- ACTIVE WIRE CONNECTIONS + GLOWING ELECTRON DOTS ---
    const wireConnections: WireConnection[] = [];
    const MAX_ELECTRONS = 42;
    const electronSphereGeo = new THREE.SphereGeometry(0.036, 10, 10);
    const electronSphereMat = new THREE.MeshBasicMaterial({ color: '#fde047' });
    const electronInstanced = new THREE.InstancedMesh(
      electronSphereGeo,
      electronSphereMat,
      MAX_ELECTRONS
    );
    electronInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    electronInstanced.frustumCulled = false;
    _matrix.makeScale(0, 0, 0);
    for (let i = 0; i < MAX_ELECTRONS; i++) electronInstanced.setMatrixAt(i, _matrix);
    electronInstanced.instanceMatrix.needsUpdate = true;
    scene.add(electronInstanced);

    // --- ION MIGRATION PARTICLES ---
    const cationTex = trackTex(makeIonSignTexture('+', '#0284c7'));
    const anionTex = trackTex(makeIonSignTexture('−', '#e11d48'));
    const ionParticles: IonParticle[] = [];
    if (beakerCenters.length > 0) {
      for (let i = 0; i < 16; i++) {
        const isCation = i % 2 === 0;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.026, 10, 8),
          new THREE.MeshStandardMaterial({
            color: isCation ? '#38bdf8' : '#fb7185',
            emissive: isCation ? '#0369a1' : '#be123c',
            emissiveIntensity: 0.4,
          })
        );
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: isCation ? cationTex : anionTex, transparent: true })
        );
        sprite.scale.set(0.09, 0.09, 1);
        sprite.position.y = 0.055;
        mesh.add(sprite);
        mesh.visible = false;
        scene.add(mesh);
        ionParticles.push({
          mesh,
          sprite,
          isCation,
          beakerIdx: i % beakerCenters.length,
          phase: (i * 0.37) % 1,
          yFrac: 0.2 + ((i * 0.29) % 0.55),
          zOff: ((i % 5) - 2) * 0.06,
        });
      }
    }

    // --- POUR STREAM & GENERAL PARTICLE POOL ---
    const streamMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
    });
    const pourStream = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 1, 12), streamMat);
    pourStream.visible = false;
    scene.add(pourStream);

    const MAX_PARTICLES = 150;
    const pGeo = new THREE.SphereGeometry(0.026, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 });
    const particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleMesh.frustumCulled = false;
    _matrix.makeScale(0, 0, 0);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particleMesh.setMatrixAt(i, _matrix);
      particleMesh.setColorAt(i, _colorA.set('#ffffff'));
    }
    particleMesh.instanceMatrix.needsUpdate = true;
    scene.add(particleMesh);

    const particles: ActiveParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      kind: 'sparkle',
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      age: 0,
      life: 1,
      scale: 1,
      color: new THREE.Color('#ffffff'),
    }));

    const spawnParticles = (
      origin: THREE.Vector3,
      kind: ActiveParticle['kind'],
      colorHex: string,
      count: number
    ) => {
      let spawned = 0;
      for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
        const p = particles[i];
        if (p.active) continue;
        p.active = true;
        p.kind = kind;
        p.age = 0;
        p.pos.set(
          origin.x + (Math.random() - 0.5) * 0.24,
          origin.y + (Math.random() - 0.5) * 0.12,
          origin.z + (Math.random() - 0.5) * 0.24
        );
        if (kind === 'bubble_c' || kind === 'bubble_a') {
          p.vel.set((Math.random() - 0.5) * 0.08, 0.48 + Math.random() * 0.35, (Math.random() - 0.5) * 0.08);
          p.life = 0.9 + Math.random() * 0.5;
          p.scale = 0.65 + Math.random() * 0.6;
        } else if (kind === 'spark') {
          p.vel.set(
            (Math.random() - 0.5) * 1.4,
            0.5 + Math.random() * 0.9,
            (Math.random() - 0.5) * 1.4
          );
          p.life = 0.38 + Math.random() * 0.25;
          p.scale = 0.7 + Math.random() * 0.4;
        } else {
          p.vel.set(
            (Math.random() - 0.5) * 0.9,
            0.7 + Math.random() * 0.85,
            (Math.random() - 0.5) * 0.9
          );
          p.life = 0.7 + Math.random() * 0.45;
          p.scale = 0.8 + Math.random() * 0.5;
        }
        p.color.set(colorHex);
        spawned++;
      }
    };

    // --- ACTIVE STEP ANIMATION & CONTINUOUS CIRCUIT EFFECTS ---
    let activeEffects = new Set<ElectroEffect>();
    let targetVoltage = 0;
    let targetCurrent = 0;
    let gasGrowth = 0; // 0..1

    interface ActiveElectroAnim {
      step: ElectroStep;
      elapsed: number;
      duration: number;
      applied: boolean;
      srcStartPos: THREE.Vector3;
      srcEndPos: THREE.Vector3;
    }
    let activeAnim: ActiveElectroAnim | null = null;

    const addCurvedWire = (src: ComponentRuntime, tgt: ComponentRuntime, colorHex: string) => {
      const start = src.terminalPos.clone();
      const end = tgt.terminalPos.clone();
      const mid = start.clone().lerp(end, 0.5);
      mid.y = Math.max(start.y, end.y) + 0.34;
      mid.z += 0.14;
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.022, 10, false);
      const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 });
      const tubeMesh = new THREE.Mesh(tubeGeo, mat);
      tubeMesh.scale.set(1, 1, 1);

      const clipStart = makeCrocodileClip(colorHex);
      clipStart.position.copy(start);
      clipStart.lookAt(mid);
      const clipEnd = makeCrocodileClip(colorHex);
      clipEnd.position.copy(end);
      clipEnd.lookAt(mid);

      scene.add(tubeMesh, clipStart, clipEnd);
      wireConnections.push({
        curve,
        tubeMesh,
        tubeGeo,
        mat,
        clipStart,
        clipEnd,
        growProgress: 0,
        flowReversed: src.spec.polarity === 'cathode' || src.spec.polarity === 'positive',
      });
    };

    const getPlacementTarget = (src: ComponentRuntime, tgt: ComponentRuntime): THREE.Vector3 => {
      if (src.spec.kind === 'salt_bridge' && beakerCenters.length >= 2) {
        return beakerCenters[0].clone().lerp(beakerCenters[1], 0.5).setY(0.18);
      }
      if (tgt.spec.kind === 'lemon') {
        const isCoin = src.spec.kind === 'coin';
        return new THREE.Vector3(
          tgt.basePos.x + (isCoin ? 0.16 : -0.16),
          tgt.basePos.y + 0.34,
          tgt.basePos.z
        );
      }
      if (tgt.spec.kind === 'cell_beaker' || tgt.spec.kind === 'container') {
        const offset =
          src.spec.polarity === 'anode' || src.spec.polarity === 'negative' ? -0.15 : 0.15;
        return new THREE.Vector3(tgt.basePos.x + offset, tgt.basePos.y + 0.16, tgt.basePos.z);
      }
      return new THREE.Vector3(tgt.basePos.x, tgt.basePos.y + 0.25, tgt.basePos.z);
    };

    // --- POINTER / RAYCASTING ---
    const pointerNdc = new THREE.Vector2(0, 0);
    let smoothParallaxX = 0;
    let smoothParallaxY = 0;
    const raycaster = new THREE.Raycaster();
    let hoveredId: string | null = null;

    const updatePointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      pointerNdc.x = (lx / rect.width) * 2 - 1;
      pointerNdc.y = -(ly / rect.height) * 2 + 1;
      if (cursorDivRef.current) {
        cursorDivRef.current.style.transform = `translate3d(${lx - 14}px, ${ly - 6}px, 0)`;
      }
      setCursorVisible(true);
    };

    const onPointerMove = (e: PointerEvent) => updatePointer(e);
    const onPointerLeave = () => {
      setCursorVisible(false);
      hoveredId = null;
      setCursorHovering(false);
    };

    const triggerWrongClick = (targetRt?: ComponentRuntime) => {
      if (targetRt) targetRt.shakeTimer = 0.42;
      playLabTone('error', stateRef.current.muted);
      const nextWrong = stateRef.current.stepWrongCount + 1;
      setWrongClicks((w) => w + 1);
      setStepWrongCount(nextWrong);

      if (stateRef.current.phase === 'gloves') {
        showToast('Put on safety gloves first — click the mint-green glove box!', 'error');
        return;
      }
      if (nextWrong >= 2) {
        setShowHint(true);
        showToast('Hint unlocked below — follow the glowing gold ring!', 'info');
      } else {
        showToast('Wrong apparatus! Click the item with the pulsing gold ring.', 'error');
      }
    };

    const beginStepAnimation = (step: ElectroStep, src: ComponentRuntime, tgt: ComponentRuntime) => {
      setPhase('animating');
      setSelectedSourceId(null);
      if (step.action === 'place') {
        const dest = getPlacementTarget(src, tgt);
        src.placed = true;
        activeAnim = {
          step,
          elapsed: 0,
          duration: 1.05,
          applied: false,
          srcStartPos: src.group.position.clone(),
          srcEndPos: dest,
        };
      } else if (step.action === 'connect') {
        const wireCol = src.spec.color || (src.spec.polarity === 'anode' ? '#1e293b' : '#ef4444');
        addCurvedWire(src, tgt, wireCol);
        playLabTone('sparkle', stateRef.current.muted);
        spawnParticles(tgt.terminalPos, 'spark', '#fde047', 22);
        activeAnim = {
          step,
          elapsed: 0,
          duration: 0.95,
          applied: false,
          srcStartPos: src.group.position.clone(),
          srcEndPos: src.group.position.clone(),
        };
      } else if (step.action === 'pour_electrolyte') {
        playLabTone('pour', stateRef.current.muted);
        activeAnim = {
          step,
          elapsed: 0,
          duration: 1.45,
          applied: false,
          srcStartPos: src.group.position.clone(),
          srcEndPos: src.group.position.clone(),
        };
      } else {
        // close_switch / open_switch / observe / measure
        if (step.action === 'close_switch' && tgt.spec.kind === 'switch') {
          tgt.switchClosed = true;
        } else if (step.action === 'open_switch' && tgt.spec.kind === 'switch') {
          tgt.switchClosed = false;
        }
        playLabTone('chime', stateRef.current.muted);
        activeAnim = {
          step,
          elapsed: 0,
          duration: 1.15,
          applied: false,
          srcStartPos: src.group.position.clone(),
          srcEndPos: src.group.position.clone(),
        };
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      updatePointer(e);
      const st = stateRef.current;
      if (
        st.phase === 'animating' ||
        st.phase === 'science_note' ||
        st.phase === 'label_diagram' ||
        st.phase === 'half_reactions' ||
        st.phase === 'completed'
      ) {
        return;
      }

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length === 0) return;
      const clickedId = String(hits[0].object.userData.interactId ?? '');
      if (!clickedId) return;

      if (st.phase === 'gloves') {
        if (clickedId === '__glove_box__') {
          playLabTone('glove', st.muted);
          peekingGloveGroup.visible = false;
          setGlovesOn(true);
          setRightClicks((r) => r + 1);
          setShowHint(false);
          setStepWrongCount(0);
          const first = experimentRef.current.steps[0];
          setPhase(
            first && isTwoClickAction(first.action) && first.sourceId !== first.targetId
              ? 'awaiting_source'
              : 'awaiting_target'
          );
          showToast('Gloves on! Now follow the gold ring.', 'good');
        } else {
          triggerWrongClick(compMap.get(clickedId));
        }
        return;
      }

      const step = experimentRef.current.steps[st.stepIdx];
      if (!step) return;
      const src = compMap.get(step.sourceId);
      const tgt = compMap.get(step.targetId);
      if (!src || !tgt) return;

      if (st.phase === 'awaiting_source') {
        if (clickedId === step.sourceId) {
          playLabTone('pickup', st.muted);
          setRightClicks((r) => r + 1);
          setSelectedSourceId(clickedId);
          setPhase('awaiting_target');
          showToast(`Selected ${src.spec.name}. Now click ${tgt.spec.name}!`, 'info');
        } else {
          triggerWrongClick(compMap.get(clickedId));
        }
      } else if (st.phase === 'awaiting_target') {
        const expectedId = step.targetId;
        if (clickedId === expectedId || (!isTwoClickAction(step.action) && clickedId === step.sourceId)) {
          setRightClicks((r) => r + 1);
          beginStepAnimation(step, src, tgt);
        } else {
          triggerWrongClick(compMap.get(clickedId));
        }
      }
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerdown', onPointerDown);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => setContextLost(false);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(320, Math.floor(entry.contentRect.width));
      const h = Math.max(300, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resizeObserver.observe(container);

    // --- RENDER LOOP ---
    let rafId = 0;
    let lastTime = performance.now();
    let bubbleTimer = 0;

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      smoothParallaxX = THREE.MathUtils.damp(smoothParallaxX, pointerNdc.x * 0.28, 4.5, dt);
      smoothParallaxY = THREE.MathUtils.damp(smoothParallaxY, pointerNdc.y * 0.14, 4.5, dt);
      camera.position.set(
        baseCamPos.x + smoothParallaxX,
        baseCamPos.y + smoothParallaxY,
        baseCamPos.z
      );
      camera.lookAt(baseLookAt);

      raycaster.setFromCamera(pointerNdc, camera);
      const hoverHits = raycaster.intersectObjects(clickableMeshes, false);
      const nextHover =
        hoverHits.length > 0 ? String(hoverHits[0].object.userData.interactId ?? '') : null;
      if (nextHover !== hoveredId) {
        hoveredId = nextHover;
        setCursorHovering(Boolean(nextHover));
      }

      const st = stateRef.current;
      const step = experimentRef.current.steps[st.stepIdx];

      // Gold pulsing highlight ring
      let ringPos: THREE.Vector3 | null = null;
      if (st.phase === 'gloves') {
        ringPos = new THREE.Vector3(2.42, 0.02, 0.88);
      } else if (st.phase === 'awaiting_source' && step) {
        ringPos = compMap.get(step.sourceId)?.group.position ?? null;
      } else if (st.phase === 'awaiting_target' && step) {
        ringPos = compMap.get(step.targetId)?.group.position ?? null;
      }
      if (ringPos) {
        goldRing.visible = true;
        goldRing.position.set(ringPos.x, 0.025, ringPos.z);
        const pulse = 1 + Math.sin(now * 0.006) * 0.12;
        goldRing.scale.set(pulse, pulse, 1);
        goldRingMat.opacity = 0.65 + Math.sin(now * 0.006) * 0.3;
      } else {
        goldRing.visible = false;
      }

      // Sync electrode 3D badges when labelled in labelled-diagram step
      Object.entries(st.assignedLabels).forEach(([cid, pol]) => {
        const rt = compMap.get(cid);
        if (rt?.badgeTex) {
          const img = rt.badgeTex.image as HTMLCanvasElement | undefined;
          const ctx = img?.getContext('2d');
          if (ctx) {
            const sub =
              pol === 'anode'
                ? experimentRef.current.cellType === 'electrolytic'
                  ? 'ANODE (+)'
                  : 'ANODE (−)'
                : experimentRef.current.cellType === 'electrolytic'
                  ? 'CATHODE (−)'
                  : 'CATHODE (+)';
            drawVesselLabelCanvas(
              ctx,
              rt.spec.name,
              sub,
              pol === 'anode' ? '#ef4444' : '#2563eb',
              pol === 'anode' ? '#b91c1c' : '#1d4ed8'
            );
            rt.badgeTex.needsUpdate = true;
          }
        }
      });

      // Active step animation
      if (activeAnim) {
        activeAnim.elapsed += dt;
        const t = Math.min(1, activeAnim.elapsed / activeAnim.duration);
        const sSpec = activeAnim.step;
        const src = compMap.get(sSpec.sourceId);
        const tgt = compMap.get(sSpec.targetId);

        if (sSpec.action === 'place' && src && tgt) {
          const u = smoothstep01(t);
          src.group.position.lerpVectors(activeAnim.srcStartPos, activeAnim.srcEndPos, u);
          src.group.position.y += Math.sin(u * Math.PI) * 0.55;
          src.terminalPos.set(
            src.group.position.x,
            src.group.position.y + (src.spec.kind === 'electrode' ? 0.78 : 0.45),
            src.group.position.z
          );
          if (!activeAnim.applied && t > 0.75) {
            activeAnim.applied = true;
            playLabTone('chime', st.muted);
            spawnParticles(src.group.position, 'sparkle', '#facc15', 22);
            if (src.badgeTex && (src.spec.polarity === 'anode' || src.spec.polarity === 'cathode')) {
              const ctx = (src.badgeTex.image as HTMLCanvasElement).getContext('2d');
              if (ctx) {
                const sub =
                  src.spec.polarity === 'anode'
                    ? experimentRef.current.cellType === 'electrolytic'
                      ? 'anode (+)'
                      : 'anode (−)'
                    : experimentRef.current.cellType === 'electrolytic'
                      ? 'cathode (−)'
                      : 'cathode (+)';
                drawVesselLabelCanvas(ctx, src.spec.name, sub, '#38bdf8', '#0369a1');
                src.badgeTex.needsUpdate = true;
              }
            }
          }
        } else if (sSpec.action === 'pour_electrolyte' && src && tgt) {
          const dirSign = src.basePos.x < tgt.basePos.x ? 1 : -1;
          const hoverX = tgt.basePos.x - dirSign * 0.48;
          const hoverY = tgt.basePos.y + 1.1;
          const hoverZ = tgt.basePos.z;
          if (t < 0.28) {
            const u = smoothstep01(t / 0.28);
            src.group.position.set(
              THREE.MathUtils.lerp(src.basePos.x, hoverX, u),
              THREE.MathUtils.lerp(src.basePos.y, hoverY, u) + Math.sin(u * Math.PI) * 0.22,
              THREE.MathUtils.lerp(src.basePos.z, hoverZ, u)
            );
            src.group.rotation.z = 0;
            pourStream.visible = false;
          } else if (t < 0.74) {
            const u = (t - 0.28) / 0.46;
            const tilt = u < 0.2 ? smoothstep01(u / 0.2) : u > 0.85 ? smoothstep01((1 - u) / 0.15) : 1;
            src.group.position.set(hoverX, hoverY, hoverZ);
            src.group.rotation.z = -dirSign * 0.95 * tilt;
            src.currentFill = THREE.MathUtils.lerp(0.72, 0.28, smoothstep01(u));
            src.targetFill = src.currentFill;
            tgt.currentFill = THREE.MathUtils.lerp(0.12, 0.74, smoothstep01(u));
            tgt.targetFill = tgt.currentFill;
            tgt.currentColor.copy(src.currentColor);
            tgt.targetColor.copy(src.currentColor);

            pourStream.visible = u > 0.14 && u < 0.86;
            if (pourStream.visible) {
              streamMat.color.copy(src.currentColor);
              _vecA.set(hoverX + dirSign * 0.18, hoverY + 0.35, hoverZ);
              _vecB.set(tgt.basePos.x, tgt.basePos.y + tgt.currentFill * 0.8, tgt.basePos.z);
              _vecDir.subVectors(_vecB, _vecA);
              const len = Math.max(0.05, _vecDir.length());
              _vecDir.normalize();
              pourStream.position.copy(_vecA).lerp(_vecB, 0.5);
              pourStream.scale.set(1, len, 1);
              pourStream.quaternion.setFromUnitVectors(_upAxis, _vecDir);
            }
          } else {
            pourStream.visible = false;
            const u = smoothstep01((t - 0.74) / 0.26);
            src.group.position.set(
              THREE.MathUtils.lerp(hoverX, src.basePos.x, u),
              THREE.MathUtils.lerp(hoverY, src.basePos.y, u),
              THREE.MathUtils.lerp(hoverZ, src.basePos.z, u)
            );
            src.group.rotation.z = THREE.MathUtils.lerp(-dirSign * 0.95, 0, u);
          }
        }

        // Apply electrochemical effects mid-animation
        if (!activeAnim.applied && t >= 0.45) {
          activeAnim.applied = true;
          activeEffects.add(sSpec.effect);
          if (sSpec.effect === 'bulb_off') activeEffects.delete('bulb_on');
          if (typeof sSpec.voltage === 'number') {
            targetVoltage = sSpec.voltage;
            setVoltageVal(sSpec.voltage);
          }
          if (typeof sSpec.currentA === 'number') {
            targetCurrent = sSpec.currentA;
            setCurrentVal(sSpec.currentA);
          }
          if (sSpec.effect === 'electron_flow') {
            setElectronLegendActive(true);
            if (targetCurrent === 0) {
              targetCurrent = 0.65;
              setCurrentVal(0.65);
            }
          }
          if (sSpec.effect === 'bulb_off') {
            setElectronLegendActive(false);
            activeEffects.delete('electron_flow');
            targetCurrent = 0;
            setCurrentVal(0);
          }
          if (sSpec.resultingColor && tgt && tgt.liquidMat) {
            tgt.targetColor.set(sSpec.resultingColor);
            spawnParticles(tgt.group.position, 'sparkle', sSpec.resultingColor, 26);
          }
          if (sSpec.effect === 'plating' || sSpec.effect === 'dissolving') {
            compMap.forEach((c) => {
              if (c.spec.kind === 'electrode') {
                if (c.spec.polarity === 'cathode' && sSpec.effect === 'plating') {
                  c.targetElectrodeScaleXZ = 1.32;
                  c.targetElectrodeColor = new THREE.Color('#d97706');
                }
                if (c.spec.polarity === 'anode' && sSpec.effect === 'dissolving') {
                  c.targetElectrodeScaleXZ = 0.64;
                }
              }
            });
          }
          updateMeterLines(
            `VOLT ${targetVoltage.toFixed(2)}V`,
            `CURR ${targetCurrent.toFixed(2)}A`,
            activeEffects.has('electron_flow') ? 'ACTIVE    ' : 'READY     '
          );
          compMap.forEach((c) => {
            if (c.spec.kind === 'voltmeter') {
              c.targetNeedleAngle = THREE.MathUtils.lerp(
                0.95,
                -0.95,
                Math.min(1, Math.abs(targetVoltage) / 3.0)
              );
            } else if (c.spec.kind === 'ammeter') {
              c.targetNeedleAngle = THREE.MathUtils.lerp(
                0.95,
                -0.95,
                Math.min(1, Math.abs(targetCurrent) / 2.0)
              );
            }
          });
          playLabTone(
            sSpec.effect === 'bubbles_cathode' || sSpec.effect === 'bubbles_anode'
              ? 'bubbles'
              : 'sparkle',
            st.muted
          );
        }

        if (t >= 1) {
          pourStream.visible = false;
          if (src && sSpec.action === 'pour_electrolyte') {
            src.group.position.copy(src.basePos);
            src.group.rotation.z = 0;
          }
          activeAnim = null;
          setPhase('science_note');
        }
      }

      // Animate wire connections growing + continuous electrons along CatmullRomCurve3
      let activeWireCount = 0;
      wireConnections.forEach((wc) => {
        wc.growProgress = Math.min(1, wc.growProgress + dt * 2.2);
        wc.tubeGeo.setDrawRange(0, Math.floor(wc.growProgress * 28 * 10 * 6));
        activeWireCount++;
      });

      const showElectrons =
        activeWireCount > 0 &&
        (activeEffects.has('electron_flow') ||
          activeEffects.has('bulb_on') ||
          activeEffects.has('voltage_reading'));

      if (showElectrons) {
        const speed = 0.25 + Math.min(2.5, Math.abs(targetCurrent || 0.6)) * 0.28;
        const tBase = (now * 0.001 * speed) % 1;
        for (let i = 0; i < MAX_ELECTRONS; i++) {
          const wc = wireConnections[i % wireConnections.length];
          const localIdx = Math.floor(i / wireConnections.length);
          const perWire = Math.max(1, Math.floor(MAX_ELECTRONS / wireConnections.length));
          let u = (tBase + localIdx / perWire) % 1;
          if (wc.flowReversed) u = 1 - u;
          if (u <= wc.growProgress) {
            wc.curve.getPointAt(u, _vecA);
            _scaleVec.set(1, 1, 1);
          } else {
            _scaleVec.set(0, 0, 0);
          }
          _matrix.compose(_vecA, _quat, _scaleVec);
          electronInstanced.setMatrixAt(i, _matrix);
        }
        electronInstanced.instanceMatrix.needsUpdate = true;
      } else {
        _matrix.makeScale(0, 0, 0);
        for (let i = 0; i < MAX_ELECTRONS; i++) electronInstanced.setMatrixAt(i, _matrix);
        electronInstanced.instanceMatrix.needsUpdate = true;
      }

      // Animate ions inside electrolyte beakers
      const showIons =
        activeEffects.has('ion_migration') ||
        activeEffects.has('electron_flow') ||
        activeEffects.has('plating');
      ionParticles.forEach((ion) => {
        ion.mesh.visible = showIons;
        if (!showIons) return;
        const center = beakerCenters[ion.beakerIdx];
        if (!center) return;
        ion.phase = (ion.phase + dt * 0.24) % 1;
        const xSpan = ion.isCation
          ? THREE.MathUtils.lerp(-0.18, 0.18, ion.phase)
          : THREE.MathUtils.lerp(0.18, -0.18, ion.phase);
        const bob = Math.sin(now * 0.004 + ion.phase * 6.28) * 0.035;
        ion.mesh.position.set(center.x + xSpan, center.y + ion.yFrac * 0.55 + bob, center.z + ion.zOff);
      });

      // Continuous electrolysis bubbles & 2:1 gas collection
      const bubblingC = activeEffects.has('bubbles_cathode') || activeEffects.has('gas_collect');
      const bubblingA = activeEffects.has('bubbles_anode') || activeEffects.has('gas_collect');
      if (bubblingC || bubblingA) {
        bubbleTimer += dt;
        if (activeEffects.has('gas_collect')) {
          gasGrowth = Math.min(1, gasGrowth + dt * 0.18);
        }
        if (bubbleTimer > 0.09) {
          bubbleTimer = 0;
          compMap.forEach((c) => {
            if (c.spec.kind === 'electrode') {
              if (bubblingC && c.spec.polarity === 'cathode') {
                spawnParticles(c.group.position.clone().setY(0.28), 'bubble_c', '#e0f2fe', 2);
              }
              if (bubblingA && c.spec.polarity === 'anode') {
                spawnParticles(c.group.position.clone().setY(0.28), 'bubble_a', '#fecaca', 1);
              }
            }
          });
        }
      }

      // Update per-component visuals (liquid clipping, gas tubes, bulb glow, switch lever, meter spring, electrode plating/dissolving)
      compMap.forEach((c) => {
        if (c.shakeTimer > 0) {
          c.shakeTimer = Math.max(0, c.shakeTimer - dt);
          const freq = c.shakeTimer * 48;
          c.group.position.x = c.group.position.x + Math.sin(freq) * 0.03 * (c.shakeTimer / 0.42);
        }

        if (c.liquidMesh && c.meniscusMesh && c.clipPlane && c.liquidMat && c.meniscusMat) {
          c.currentFill = THREE.MathUtils.damp(c.currentFill, c.targetFill, 5, dt);
          c.currentColor.lerp(c.targetColor, Math.min(1, dt * 3.5));
          c.liquidMat.color.copy(c.currentColor);
          c.meniscusMat.color.copy(c.currentColor);
          const vis = c.currentFill > 0.015;
          c.liquidMesh.visible = vis;
          c.meniscusMesh.visible = vis;
          if (vis) {
            const topY = c.innerBottomY + c.currentFill * c.innerHeight;
            c.clipPlane.constant = c.group.position.y + topY;
            c.meniscusMesh.position.y = topY;
            c.meniscusMesh.scale.set(c.profileRadius, c.profileRadius, 1);
          }
        }

        // H2 : O2 2:1 gas collection ratio in inverted tubes
        if (c.h2GasMesh && c.o2GasMesh && gasGrowth > 0.01) {
          const h2Len = 0.52 * gasGrowth;
          const o2Len = 0.26 * gasGrowth; // 2:1 ratio
          c.h2GasMesh.visible = true;
          c.o2GasMesh.visible = true;
          c.h2GasMesh.scale.set(1, h2Len, 1);
          c.h2GasMesh.position.y = 0.93 - h2Len * 0.5;
          c.o2GasMesh.scale.set(1, o2Len, 1);
          c.o2GasMesh.position.y = 0.93 - o2Len * 0.5;
        }

        if (c.bulbFilamentMat && c.bulbHaloMat && c.bulbLight) {
          const on = activeEffects.has('bulb_on');
          const targetEmissive = on ? 2.8 : 0;
          c.bulbFilamentMat.emissiveIntensity = THREE.MathUtils.damp(
            c.bulbFilamentMat.emissiveIntensity,
            targetEmissive,
            5,
            dt
          );
          c.bulbHaloMat.opacity = THREE.MathUtils.damp(c.bulbHaloMat.opacity, on ? 0.58 : 0, 5, dt);
          c.bulbLight.intensity = THREE.MathUtils.damp(c.bulbLight.intensity, on ? 2.4 : 0, 5, dt);
        }

        if (c.leverPivot) {
          const targetRot = c.switchClosed ? 0 : 0.82;
          c.leverPivot.rotation.z = THREE.MathUtils.damp(c.leverPivot.rotation.z, targetRot, 9, dt);
        }

        if (c.needlePivot) {
          // Spring-damped overshoot on voltmeter / ammeter needle
          const stiffness = 68;
          const damping = 9.5;
          const force = -stiffness * (c.needleAngle - c.targetNeedleAngle);
          const dampF = -damping * c.needleVel;
          c.needleVel += (force + dampF) * dt;
          c.needleAngle += c.needleVel * dt;
          c.needlePivot.rotation.z = c.needleAngle;
        }

        if (c.electrodeMesh && c.electrodeMat) {
          c.electrodeScaleXZ = THREE.MathUtils.damp(
            c.electrodeScaleXZ,
            c.targetElectrodeScaleXZ,
            2.2,
            dt
          );
          c.electrodeMesh.scale.set(c.electrodeScaleXZ, 1, c.electrodeScaleXZ);
          if (c.targetElectrodeColor) {
            c.electrodeMat.color.lerp(c.targetElectrodeColor, Math.min(1, dt * 1.8));
          }
        }
      });

      // Update pooled particles
      let pDirty = false;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;
        pDirty = true;
        p.age += dt;
        if (p.age >= p.life) {
          p.active = false;
          _matrix.makeScale(0, 0, 0);
          particleMesh.setMatrixAt(i, _matrix);
          continue;
        }
        p.pos.addScaledVector(p.vel, dt);
        const fade = Math.sin((p.age / p.life) * Math.PI);
        const s = Math.max(0.01, p.scale * fade);
        _scaleVec.set(s, s, s);
        _matrix.compose(p.pos, _quat, _scaleVec);
        particleMesh.setMatrixAt(i, _matrix);
        particleMesh.setColorAt(i, p.color);
      }
      if (pDirty) {
        particleMesh.instanceMatrix.needsUpdate = true;
        if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      disposeSceneGraph(scene, renderer, createdTextures);
    };
  }, [experiment, runSeed]);

  const instructionText = useMemo(() => {
    if (phase === 'gloves') {
      return `Wear gloves to protect your hands! ${experiment.safetyTip}`;
    }
    if (phase === 'label_diagram') {
      return 'Circuit active! Label the Anode (Oxidation) and Cathode (Reduction) below.';
    }
    if (phase === 'half_reactions') {
      return 'Review the oxidation & reduction half-reactions behind this cell!';
    }
    if (!currentStep) {
      return 'Experiment complete! Review your results or take the bonus quiz.';
    }
    if (phase === 'awaiting_target' && selectedSourceId) {
      const targetName =
        experiment.components.find((c) => c.id === currentStep.targetId)?.name ?? 'the target';
      return `Step ${currentStep.stepNumber}: Now click ${targetName}.`;
    }
    return `Step ${currentStep.stepNumber}: ${currentStep.instruction}`;
  }, [phase, experiment, currentStep, selectedSourceId]);

  return (
    <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 shadow-xl overflow-hidden">
      {/* Top Bar */}
      <div className="px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm sm:text-base font-bold text-white truncate">
                {experiment.experimentTitle}
              </h2>
              {typeof experiment.level === 'number' && (
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md shrink-0">
                  LVL {experiment.level}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">
              Accuracy: <span className="text-emerald-400 font-semibold">{accuracyPct}%</span> · Step{' '}
              {Math.min(stepIdx + 1, experiment.steps.length)} of {experiment.steps.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute lab sound' : 'Mute lab sound'}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Lab</span>
          </button>
        </div>
      </div>

      {/* Interactive 3D Viewport */}
      <div
        ref={containerRef}
        className={`verbatim-viewport relative w-full h-[520px] sm:h-[580px] select-none overflow-hidden ${
          cursorVisible && phase !== 'label_diagram' && phase !== 'half_reactions'
            ? 'cursor-none'
            : 'cursor-pointer'
        }`}
      >
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />

        {contextLost && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center z-40">
            <ShieldAlert className="w-10 h-10 text-amber-400 mb-3" />
            <p className="text-base font-bold">3D Graphics Context Paused</p>
            <button
              type="button"
              onClick={handleRestart}
              className="mt-4 px-4 py-2 text-sm font-semibold bg-sky-600 rounded-lg cursor-pointer"
            >
              Reload 3D Bench
            </button>
          </div>
        )}

        {/* Top-Left Electrical Telemetry Card */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/95 border border-slate-700 rounded-xl p-3 text-white shadow-lg min-w-[190px]">
          <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold mb-2">
            Circuit Telemetry
          </p>
          <div className="grid grid-cols-3 gap-2 text-center font-mono tabular-nums">
            <div className="bg-slate-800 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400">VOLT</div>
              <div className="text-sm font-bold text-cyan-300">{voltageVal.toFixed(2)}V</div>
            </div>
            <div className="bg-slate-800 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400">CURR</div>
              <div className="text-sm font-bold text-amber-300">{currentVal.toFixed(2)}A</div>
            </div>
            <div className="bg-slate-800 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400">CELL</div>
              <div className="text-[11px] font-bold text-emerald-300 uppercase pt-0.5">
                {experiment.cellType === 'electrolytic'
                  ? 'ELEC'
                  : experiment.cellType === 'circuit'
                    ? 'CIRC'
                    : 'GALV'}
              </div>
            </div>
          </div>

          {electronLegendActive && (
            <div className="mt-2.5 pt-2 border-t border-slate-700/80 space-y-1 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-yellow-300">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-300" />
                <span>e⁻ flow: anode → cathode</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-300">
                <ArrowRight className="w-3 h-3" />
                <span>Current (I): cathode → anode</span>
              </div>
            </div>
          )}
        </div>

        {/* Top-Right Status Badge */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-md ${
              glovesOn
                ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200'
                : 'bg-amber-950/95 border-amber-500/60 text-amber-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{glovesOn ? 'Gloves On' : 'Gloves Required'}</span>
          </div>
        </div>

        {toast && (
          <div
            role="status"
            className={`absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xl border ${
              toast.tone === 'error'
                ? 'bg-red-950/95 border-red-500 text-red-100'
                : toast.tone === 'good'
                  ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                  : 'bg-slate-900/95 border-sky-500 text-sky-100'
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Bottom-Left Labster-Style Instruction HUD */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[440px] z-10 bg-[#0b3b60]/95 border-2 border-[#38bdf8]/70 rounded-xl shadow-2xl overflow-hidden text-white">
          <div className="px-4 py-2 bg-[#072b47] border-b border-sky-400/30 flex items-center justify-between gap-3 text-xs font-mono">
            <span className="text-sky-200 font-semibold">{clockLabel}</span>
            <div className="flex items-center gap-2">
              <span className="text-sky-300 font-bold">PROGRESS: {progressPct}%</span>
              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="p-3.5 flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <p className="text-xs sm:text-sm font-medium leading-snug text-white">
                {instructionText}
              </p>
              {showHint && (
                <p className="text-xs text-amber-200 bg-amber-950/80 border border-amber-400/40 rounded-lg px-2.5 py-1.5">
                  Hint:{' '}
                  {phase === 'gloves'
                    ? 'Click the mint-green glove box on the front-right of the bench!'
                    : currentStep?.hint}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleManualHint}
              disabled={
                phase === 'completed' ||
                phase === 'science_note' ||
                phase === 'label_diagram' ||
                phase === 'half_reactions'
              }
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Hint</span>
            </button>
          </div>
        </div>

        {/* Post-Step "The science behind it" Modal */}
        {phase === 'science_note' && currentStep && (
          <div className="absolute inset-0 z-30 bg-slate-950/75 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white text-slate-900 rounded-2xl border-2 border-amber-500 shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-amber-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-display text-lg font-bold">The science behind it</h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{currentStep.scienceNote}</p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center font-mono text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400">VOLT</div>
                  <div className="font-bold text-sky-700">
                    {(currentStep.voltage ?? voltageVal).toFixed(2)} V
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400">CURR</div>
                  <div className="font-bold text-amber-600">
                    {(currentStep.currentA ?? currentVal).toFixed(2)} A
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400">EFFECT</div>
                  <div className="font-bold text-emerald-700 capitalize">
                    {currentStep.effect.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleContinueAfterScience}
                className="w-full py-2.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors cursor-pointer"
              >
                {stepIdx + 1 >= experiment.steps.length ? 'Label the Electrodes' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Labelled-Diagram Challenge: Drag or Tap Anode / Cathode */}
        {phase === 'label_diagram' && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white text-slate-900 rounded-2xl border-2 border-sky-500 shadow-2xl p-6 space-y-5">
              <div className="flex items-center gap-2.5 text-sky-700">
                <Zap className="w-5 h-5" />
                <div>
                  <h3 className="font-display text-lg font-bold">Label the Electrodes</h3>
                  <p className="text-xs text-slate-500">
                    Drag each label (or tap a label then tap an electrode) onto the diagram.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {(['anode', 'cathode'] as const).map((lbl) => {
                  const alreadyUsed = Object.values(assignedLabels).includes(lbl);
                  const active = pickedLabelChip === lbl;
                  return (
                    <button
                      key={lbl}
                      type="button"
                      draggable={!alreadyUsed}
                      onDragStart={(ev) => ev.dataTransfer.setData('text/plain', lbl)}
                      onClick={() => setPickedLabelChip(active ? null : lbl)}
                      disabled={alreadyUsed}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-grab active:cursor-grabbing disabled:opacity-35 ${
                        lbl === 'anode'
                          ? active
                            ? 'bg-red-600 text-white border-red-700'
                            : 'bg-red-50 text-red-800 border-red-300 hover:border-red-500'
                          : active
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-blue-50 text-blue-800 border-blue-300 hover:border-blue-500'
                      }`}
                    >
                      {lbl === 'anode' ? 'Anode (Oxidation − e⁻ loss)' : 'Cathode (Reduction + e⁻ gain)'}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {labelableElectrodes.map((el) => {
                  const assigned = assignedLabels[el.id];
                  const shaking = diagramShakeId === el.id;
                  return (
                    <div
                      key={el.id}
                      onDragOver={(ev) => ev.preventDefault()}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        const lbl = ev.dataTransfer.getData('text/plain');
                        if (lbl === 'anode' || lbl === 'cathode') {
                          handleAssignDiagramLabel(el.id, lbl);
                        }
                      }}
                      onClick={() => {
                        if (pickedLabelChip) handleAssignDiagramLabel(el.id, pickedLabelChip);
                      }}
                      className={`p-4 rounded-2xl border-2 text-center space-y-2 transition-all cursor-pointer ${
                        assigned
                          ? assigned === 'anode'
                            ? 'bg-red-50 border-red-500'
                            : 'bg-blue-50 border-blue-500'
                          : shaking
                            ? 'bg-red-50 border-red-400 animate-pulse'
                            : 'bg-slate-50 border-dashed border-slate-300 hover:border-sky-400'
                      }`}
                    >
                      <div
                        className="w-8 h-14 mx-auto rounded-md border border-slate-400 shadow-inner"
                        style={{ backgroundColor: resolveElectrodeColor(el) }}
                      />
                      <div className="text-sm font-bold text-slate-900">{el.name}</div>
                      <div className="text-xs font-mono text-slate-500">{el.formula || el.material}</div>
                      <div className="pt-1">
                        {assigned ? (
                          <span
                            className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              assigned === 'anode'
                                ? 'bg-red-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            ✓ {assigned.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">
                            Drop label here
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Half-Reactions Science Card (Oxidation = Red, Reduction = Blue) */}
        {phase === 'half_reactions' && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white text-slate-900 rounded-2xl border-2 border-indigo-500 shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-indigo-700">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-display text-lg font-bold">
                  The science behind it — Half-Reactions
                </h3>
              </div>

              <div className="space-y-3">
                {experiment.halfReactions.map((hr, idx) => {
                  const isOx = hr.type === 'oxidation';
                  return (
                    <div
                      key={`${hr.at}-${idx}`}
                      className={`p-3.5 rounded-xl border-2 ${
                        isOx
                          ? 'bg-red-50 border-red-300 text-red-950'
                          : 'bg-blue-50 border-blue-300 text-blue-950'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide mb-1">
                        <span>
                          {hr.at} · {hr.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            isOx ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                          }`}
                        >
                          {isOx ? 'Loses e⁻' : 'Gains e⁻'}
                        </span>
                      </div>
                      <p className="font-mono text-sm sm:text-base font-bold">{hr.equation}</p>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
                Electrons always travel through the external wire from the <strong>anode</strong>{' '}
                (oxidation) to the <strong>cathode</strong> (reduction), while conventional current
                is drawn in the opposite direction.
              </p>

              <button
                type="button"
                onClick={finishLabAndRecord}
                className="w-full py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
              >
                Finish Experiment & View Score
              </button>
            </div>
          </div>
        )}

        {/* Final Celebration Summary Modal */}
        {phase === 'completed' && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white text-slate-900 rounded-2xl border-2 border-amber-400 shadow-2xl p-6 sm:p-7 space-y-5 text-center">
              <div className="flex justify-center gap-2">
                {[1, 2, 3].map((starNum) => (
                  <Star
                    key={starNum}
                    className={`w-10 h-10 ${
                      starNum <= starCount
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200 fill-slate-100'
                    }`}
                  />
                ))}
              </div>

              <div>
                <h3 className="font-display text-2xl font-bold text-slate-900">
                  Circuit Complete!
                </h3>
                <div className="mt-3 flex items-center justify-center gap-4">
                  <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase text-emerald-700">
                      Accuracy
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-900">
                      {accuracyPct}%
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-sky-50 border border-sky-200 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase text-sky-700">
                      Lab Points
                    </div>
                    <div className="text-xl font-bold font-mono text-sky-900">+{finalPoints}</div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                {experiment.conceptSummary}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={onNewVideo}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Next video
                </button>
                {onTakeQuiz && (
                  <button
                    type="button"
                    onClick={() => onTakeQuiz({ accuracy: accuracyPct, points: finalPoints })}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>Take the quiz (+Bonus)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <LabHandCursor
          cursorDivRef={cursorDivRef}
          cursorVisible={cursorVisible && phase !== 'label_diagram' && phase !== 'half_reactions'}
          cursorHovering={cursorHovering}
          glovesOn={glovesOn}
        />
      </div>
    </div>
  );
};
