import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Award,
  CheckCircle2,
  FlaskConical,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { LabChemical, LabExperiment, LabStep, ReactionEffect, VesselType } from '../types.ts';
import { playLabTone } from '../utils/labAudio.ts';
import {
  buildLabRoom,
  createIronNailGeometry,
  createLabGlassMaterial,
  detectSoftwareWebGL,
  disposeSceneGraph,
  makeForgedSteelTexture,
  makeVesselLabelTexture,
  smoothstep01,
} from '../three/LabRoom.ts';
import { LabHandCursor } from './LabHandCursor.tsx';

export interface Lab3DProps {
  experiment: LabExperiment;
  onFinish: (r: { accuracy: number; points: number }) => void;
  onNewVideo: () => void;
  onTakeQuiz?: (r: { accuracy: number; points: number }) => void;
}

type LabPhase =
  | 'gloves' // Step 0: click glove box
  | 'awaiting_source' // Pour / Drop first click
  | 'awaiting_target' // Pour / Drop second click, or Stir / Heat single click
  | 'animating' // Active 3D step animation
  | 'science_note' // Post-step modal waiting for Continue
  | 'completed'; // Final stars & summary screen

interface VesselRuntime {
  spec: LabChemical;
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  liquidMesh: THREE.Mesh;
  meniscusMesh: THREE.Mesh;
  liquidMat: THREE.MeshStandardMaterial;
  meniscusMat: THREE.MeshStandardMaterial;
  clipPlane: THREE.Plane;
  basePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  baseRotZ: number;
  targetRotZ: number;
  currentFill: number;
  targetFill: number;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  innerBottomY: number;
  innerHeight: number;
  profileRadiusAt: (normH: number) => number;
  shakeTimer: number;
  hoverAmount: number;
  isNailVessel: boolean;
  nailMesh?: THREE.Mesh;
  nailMat?: THREE.MeshStandardMaterial;
}

interface ActiveParticle {
  active: boolean;
  kind: 'bubble' | 'foam' | 'precipitate' | 'steam' | 'sparkle' | 'droplet' | 'powder';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  scale: number;
  color: THREE.Color;
}

// Pre-allocated scratch vectors/colors to avoid GC pressure inside animation loop
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _colorA = new THREE.Color();
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();

interface VesselShapeInfo {
  outerGeo: THREE.BufferGeometry;
  innerGeo: THREE.BufferGeometry;
  innerBottomY: number;
  innerHeight: number;
  topY: number;
  profileRadiusAt: (normH: number) => number;
}

function createVesselGeometry(vesselType: VesselType): VesselShapeInfo {
  const ptsOuter: THREE.Vector2[] = [];
  const ptsInner: THREE.Vector2[] = [];
  let innerBottomY = 0.04;
  let innerHeight = 0.72;
  let topY = 0.9;
  let profileRadiusAt = (_normH: number) => 0.3;

  switch (vesselType) {
    case 'flask': {
      // Erlenmeyer conical flask
      ptsOuter.push(
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.38, 0.0),
        new THREE.Vector2(0.41, 0.08),
        new THREE.Vector2(0.14, 0.65),
        new THREE.Vector2(0.14, 0.9),
        new THREE.Vector2(0.18, 0.94),
        new THREE.Vector2(0.15, 0.95),
        new THREE.Vector2(0.12, 0.9)
      );
      innerBottomY = 0.03;
      innerHeight = 0.62;
      topY = 0.95;
      ptsInner.push(
        new THREE.Vector2(0.0, innerBottomY),
        new THREE.Vector2(0.35, innerBottomY),
        new THREE.Vector2(0.375, 0.08),
        new THREE.Vector2(0.125, innerBottomY + innerHeight),
        new THREE.Vector2(0.0, innerBottomY + innerHeight)
      );
      profileRadiusAt = (n) => {
        const clamped = Math.max(0, Math.min(1, n));
        return THREE.MathUtils.lerp(0.35, 0.125, clamped);
      };
      break;
    }
    case 'test_tube': {
      ptsOuter.push(
        new THREE.Vector2(0.0, 0.06),
        new THREE.Vector2(0.09, 0.08),
        new THREE.Vector2(0.135, 0.16),
        new THREE.Vector2(0.135, 0.96),
        new THREE.Vector2(0.16, 0.99),
        new THREE.Vector2(0.125, 0.99)
      );
      innerBottomY = 0.085;
      innerHeight = 0.82;
      topY = 0.99;
      ptsInner.push(
        new THREE.Vector2(0.0, innerBottomY),
        new THREE.Vector2(0.105, 0.15),
        new THREE.Vector2(0.118, innerBottomY + innerHeight),
        new THREE.Vector2(0.0, innerBottomY + innerHeight)
      );
      profileRadiusAt = (n) => (n < 0.08 ? 0.09 : 0.115);
      break;
    }
    case 'dropper_bottle': {
      ptsOuter.push(
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.22, 0.0),
        new THREE.Vector2(0.23, 0.52),
        new THREE.Vector2(0.11, 0.64),
        new THREE.Vector2(0.11, 0.78),
        new THREE.Vector2(0.0, 0.78)
      );
      innerBottomY = 0.03;
      innerHeight = 0.5;
      topY = 1.02;
      ptsInner.push(
        new THREE.Vector2(0.0, innerBottomY),
        new THREE.Vector2(0.2, innerBottomY),
        new THREE.Vector2(0.205, innerBottomY + innerHeight),
        new THREE.Vector2(0.0, innerBottomY + innerHeight)
      );
      profileRadiusAt = () => 0.198;
      break;
    }
    case 'dish': {
      ptsOuter.push(
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.39, 0.0),
        new THREE.Vector2(0.42, 0.24),
        new THREE.Vector2(0.45, 0.27),
        new THREE.Vector2(0.41, 0.27)
      );
      innerBottomY = 0.025;
      innerHeight = 0.2;
      topY = 0.27;
      ptsInner.push(
        new THREE.Vector2(0.0, innerBottomY),
        new THREE.Vector2(0.365, innerBottomY),
        new THREE.Vector2(0.395, innerBottomY + innerHeight),
        new THREE.Vector2(0.0, innerBottomY + innerHeight)
      );
      profileRadiusAt = (n) => THREE.MathUtils.lerp(0.365, 0.39, n);
      break;
    }
    case 'beaker':
    default: {
      ptsOuter.push(
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.33, 0.0),
        new THREE.Vector2(0.35, 0.84),
        new THREE.Vector2(0.385, 0.89),
        new THREE.Vector2(0.34, 0.89)
      );
      innerBottomY = 0.03;
      innerHeight = 0.78;
      topY = 0.89;
      ptsInner.push(
        new THREE.Vector2(0.0, innerBottomY),
        new THREE.Vector2(0.31, innerBottomY),
        new THREE.Vector2(0.325, innerBottomY + innerHeight),
        new THREE.Vector2(0.0, innerBottomY + innerHeight)
      );
      profileRadiusAt = (n) => THREE.MathUtils.lerp(0.31, 0.322, n);
      break;
    }
  }

  return {
    outerGeo: new THREE.LatheGeometry(ptsOuter, 36),
    innerGeo: new THREE.LatheGeometry(ptsInner, 32),
    innerBottomY,
    innerHeight,
    topY,
    profileRadiusAt,
  };
}

export const Lab3D: React.FC<Lab3DProps> = ({
  experiment,
  onFinish,
  onNewVideo,
  onTakeQuiz,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<LabPhase>('gloves');
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

  // Live digital instrument readout state
  const [phValue, setPhValue] = useState(7.0);
  const [tempValue, setTempValue] = useState(22.0);
  const [massValue, setMassValue] = useState(0);

  // Cartoon hand cursor state (DOM ref moves directly without re-rendering React!)
  const cursorDivRef = useRef<HTMLDivElement>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHovering, setCursorHovering] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const currentStep: LabStep | null = useMemo(
    () => (stepIdx < experiment.steps.length ? experiment.steps[stepIdx] : null),
    [experiment.steps, stepIdx]
  );

  // Refs for syncing React state cleanly into Three.js animation loop without stale closures
  const stateRef = useRef({
    phase,
    stepIdx,
    glovesOn,
    selectedSourceId,
    muted,
    stepWrongCount,
    rightClicks,
    wrongClicks,
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

  // Clock readout: starts DAY 1 08:00 AM and advances 4 mins per completed step
  const clockLabel = useMemo(() => {
    const mins = (glovesOn ? 2 : 0) + stepIdx * 4;
    const hh = 8 + Math.floor(mins / 60);
    const mm = mins % 60;
    return `DAY 1  ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} AM`;
  }, [glovesOn, stepIdx]);

  const totalSteps = experiment.steps.length + 1; // +1 for gloves step
  const completedCount = (glovesOn ? 1 : 0) + stepIdx + (phase === 'completed' ? 0 : 0);
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
    setPhValue(7.0);
    setTempValue(22.0);
    setMassValue(0);
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

  const handleContinueAfterScience = () => {
    const nextIdx = stepIdx + 1;
    setShowHint(false);
    setStepWrongCount(0);
    setSelectedSourceId(null);
    if (nextIdx >= experiment.steps.length) {
      setPhase('completed');
      playLabTone('victory', muted);
      const total = rightClicks + wrongClicks;
      const finalAcc = total === 0 ? 100 : Math.round((rightClicks / total) * 100);
      const pts = finalAcc + 20 * experiment.steps.length;
      onFinish({ accuracy: finalAcc, points: pts });
    } else {
      setStepIdx(nextIdx);
      const nextStep = experiment.steps[nextIdx];
      setPhase(
        nextStep.action === 'pour' || nextStep.action === 'drop'
          ? 'awaiting_source'
          : 'awaiting_target'
      );
    }
  };

  // Keyboard accessibility for science modal Continue & Hint
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
    const baseCamPos = new THREE.Vector3(0, 2.52, 6.28);
    const baseLookAt = new THREE.Vector3(0, 0.05, -0.05);
    camera.position.copy(baseCamPos);
    camera.lookAt(baseLookAt);

    const {
      trackTex,
      createdTextures,
      gbHit,
      gloveBoxPos,
      peekingGloveGroup,
      updateMeterLines,
      hotPlatePos,
      hotPlateLight,
      heatingCoilMat,
    } = buildLabRoom(scene, renderer, isSoftwareGl, {
      includeHotPlate: true,
      initialMeterLines: ['pH   7.0', 'TEMP 22.0C', 'MASS 0g'],
    });

    // --- 6. BUILD 3D VESSELS FROM EXPERIMENT DATA ---
    const glassMat = createLabGlassMaterial(isSoftwareGl);

    const clickableMeshes: THREE.Object3D[] = [gbHit];
    const vesselsMap = new Map<string, VesselRuntime>();

    const count = experiment.vessels.length;
    const startX = -Math.min(1.55, (count - 1) * 0.44);
    const stepX = count > 1 ? (Math.min(2.75, (count - 1) * 0.92)) / (count - 1) : 0;
    const useSpaciousRows = count > 4;
    const rowColumns = 4;

    experiment.vessels.forEach((v, idx) => {
      const shapeInfo = createVesselGeometry(v.vesselType);
      const group = new THREE.Group();

      const xPos = useSpaciousRows
        ? ((idx % rowColumns) - (Math.min(rowColumns, count - Math.floor(idx / rowColumns) * rowColumns) - 1) / 2) * 1.02
        : startX + idx * stepX;
      const zPos = useSpaciousRows
        ? Math.floor(idx / rowColumns) * 0.72 + (v.role === 'workspace' ? 0.48 : 0.06)
        : v.role === 'workspace' ? 0.56 : idx % 2 === 0 ? 0.08 : 0.28;
      const basePos = new THREE.Vector3(xPos, 0, zPos);
      group.position.copy(basePos);

      const glassMesh = new THREE.Mesh(shapeInfo.outerGeo, glassMat);
      glassMesh.castShadow = !isSoftwareGl;
      glassMesh.renderOrder = 3;
      group.add(glassMesh);

      // Extra details for test_tube rack base or dropper_bottle bulb
      if (v.vesselType === 'test_tube') {
        const holder = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.21, 0.12, 20),
          new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.5, roughness: 0.35 })
        );
        holder.position.y = 0.06;
        group.add(holder);
      } else if (v.vesselType === 'dropper_bottle') {
        const collar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.115, 0.115, 0.07, 20),
          new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5 })
        );
        collar.position.y = 0.79;
        const bulb = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.065, 0.12, 6, 12),
          new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.65 })
        );
        bulb.position.y = 0.92;
        group.add(collar, bulb);
      }

      // Clipping plane + interior liquid mesh
      const initFill = v.state === 'empty' ? 0 : Math.max(0, Math.min(1, v.initialFillLevel));
      const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

      const startColor =
        v.initialColor && v.initialColor !== 'transparent'
          ? new THREE.Color(v.initialColor)
          : new THREE.Color('#bae6fd');

      const isNailVessel = /\bnail\b|nails/i.test(`${v.name} ${v.id}`);
      const isPowder = v.state === 'powder';
      const liquidMat = new THREE.MeshStandardMaterial({
        color: startColor.clone(),
        roughness: isPowder ? 0.92 : 0.18,
        metalness: isPowder ? 0.02 : 0.06,
        transparent: !isPowder,
        opacity: isPowder ? 1 : 0.84,
        clippingPlanes: [clipPlane],
        side: THREE.DoubleSide,
      });

      const liquidMesh = new THREE.Mesh(shapeInfo.innerGeo, liquidMat);
      liquidMesh.visible = !isNailVessel && initFill > 0.01;
      liquidMesh.renderOrder = 1;
      group.add(liquidMesh);

      const meniscusMat = new THREE.MeshStandardMaterial({
        color: startColor.clone(),
        roughness: isPowder ? 0.92 : 0.12,
        transparent: !isPowder,
        opacity: isPowder ? 1 : 0.9,
        side: THREE.DoubleSide,
      });
      const meniscusMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 28), meniscusMat);
      meniscusMesh.rotation.x = -Math.PI / 2;
      meniscusMesh.visible = !isNailVessel && initFill > 0.01;
      meniscusMesh.renderOrder = 2;
      group.add(meniscusMesh);

      let nailMesh: THREE.Mesh | undefined;
      let nailMat: THREE.MeshStandardMaterial | undefined;
      if (isNailVessel) {
        const steelTex = trackTex(makeForgedSteelTexture());
        nailMat = new THREE.MeshStandardMaterial({
          map: steelTex,
          color: '#cbd5e1',
          metalness: 0.86,
          roughness: 0.34,
        });
        nailMesh = new THREE.Mesh(createIronNailGeometry(), nailMat);
        nailMesh.scale.setScalar(0.56);
        nailMesh.castShadow = !isSoftwareGl;
        if (v.vesselType === 'dish') {
          // Rest small and centered cleanly inside the shallow glass dish
          nailMesh.rotation.set(0, 0.38, -1.44, 'YXZ');
          nailMesh.position.set(-0.172, 0.032, 0.068);
        } else {
          nailMesh.rotation.set(0, 0.2, -0.34, 'YXZ');
          nailMesh.position.set(0.04, 0.04, 0);
        }
        nailMesh.renderOrder = 2;
        group.add(nailMesh);
      }

      // Angled bench label plaque in front of the vessel
      const plaqueTex = trackTex(makeVesselLabelTexture(v.name, v.formula));
      const plaqueMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.28, 0.03),
        new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.4 })
      );
      plaqueMesh.position.set(xPos, 0.1, zPos + 0.52);
      plaqueMesh.rotation.x = -0.58;
      scene.add(plaqueMesh);

      // Clickable hitbox
      const hitMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 1.15, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.position.y = 0.55;
      hitMesh.userData.interactId = v.id;
      group.add(hitMesh);
      clickableMeshes.push(hitMesh);

      scene.add(group);

      vesselsMap.set(v.id, {
        spec: v,
        group,
        hitMesh,
        liquidMesh,
        meniscusMesh,
        liquidMat,
        meniscusMat,
        clipPlane,
        basePos: basePos.clone(),
        targetPos: basePos.clone(),
        baseRotZ: 0,
        targetRotZ: 0,
        currentFill: initFill,
        targetFill: initFill,
        currentColor: startColor.clone(),
        targetColor: startColor.clone(),
        innerBottomY: shapeInfo.innerBottomY,
        innerHeight: shapeInfo.innerHeight,
        profileRadiusAt: shapeInfo.profileRadiusAt,
        shakeTimer: 0,
        hoverAmount: 0,
        isNailVessel,
        nailMesh,
        nailMat,
      });
    });

    // --- 7. PULSING GOLD HIGHLIGHT RING ---
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      emissive: new THREE.Color('#eab308'),
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.6,
    });
    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.032, 12, 40), ringMat);
    goldRing.rotation.x = Math.PI / 2;
    scene.add(goldRing);

    // --- 8. GLASS STIRRING ROD (FOR STIR STEPS) ---
    const stirRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.15, 14),
      new THREE.MeshPhysicalMaterial({
        color: '#e0f2fe',
        roughness: 0.08,
        transparent: true,
        opacity: 0.72,
      })
    );
    stirRod.visible = false;
    scene.add(stirRod);

    // --- 9. POUR STREAM CYLINDER ---
    const streamMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.85,
      roughness: 0.15,
    });
    const pourStream = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1, 12), streamMat);
    pourStream.visible = false;
    scene.add(pourStream);

    // --- 10. INSTANCED PARTICLE POOL (FIZZ, FOAM, PRECIPITATE, STEAM, SPARKLE, DROPLET, POWDER) ---
    const MAX_PARTICLES = 140;
    const particleGeo = new THREE.SphereGeometry(0.045, 10, 10);
    const particleMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.35,
      transparent: true,
      opacity: 0.88,
    });
    const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
    particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleMesh.frustumCulled = false;
    const particles: ActiveParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      kind: 'bubble',
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      age: 0,
      life: 1,
      scale: 0,
      color: new THREE.Color('#ffffff'),
    }));
    // Hide unused instances initially
    _matrix.makeScale(0, 0, 0);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particleMesh.setMatrixAt(i, _matrix);
      particleMesh.setColorAt(i, _colorA.set('#ffffff'));
    }
    scene.add(particleMesh);

    const spawnParticles = (
      origin: THREE.Vector3,
      effect: ReactionEffect,
      colorHex: string,
      burstCount = 24
    ) => {
      if (effect === 'none') return;
      const baseCol = new THREE.Color(colorHex === 'transparent' ? '#bae6fd' : colorHex);
      let spawned = 0;
      for (let i = 0; i < MAX_PARTICLES && spawned < burstCount; i++) {
        const p = particles[i];
        if (p.active) continue;
        p.active = true;
        p.age = 0;
        const rx = (Math.random() - 0.5) * 0.26;
        const rz = (Math.random() - 0.5) * 0.26;

        if (effect === 'fizz') {
          p.kind = 'bubble';
          p.pos.set(origin.x + rx, origin.y + 0.12 + Math.random() * 0.2, origin.z + rz);
          p.vel.set((Math.random() - 0.5) * 0.12, 0.55 + Math.random() * 0.55, (Math.random() - 0.5) * 0.12);
          p.life = 1.2 + Math.random() * 0.7;
          p.scale = 0.45 + Math.random() * 0.45;
          p.color.set('#e0f2fe');
        } else if (effect === 'foam_eruption') {
          p.kind = 'foam';
          p.pos.set(origin.x + rx * 0.7, origin.y + 0.48, origin.z + rz * 0.7);
          const angle = Math.random() * Math.PI * 2;
          const spread = 0.2 + Math.random() * 0.45;
          p.vel.set(Math.cos(angle) * spread, 0.9 + Math.random() * 0.9, Math.sin(angle) * spread);
          p.life = 1.7 + Math.random() * 0.8;
          p.scale = 1.15 + Math.random() * 1.15;
          p.color.copy(baseCol).lerp(new THREE.Color('#ffffff'), 0.45);
        } else if (effect === 'precipitate') {
          p.kind = 'precipitate';
          p.pos.set(origin.x + rx, origin.y + 0.42 + Math.random() * 0.12, origin.z + rz);
          p.vel.set((Math.random() - 0.5) * 0.05, -0.25 - Math.random() * 0.2, (Math.random() - 0.5) * 0.05);
          p.life = 1.8 + Math.random() * 0.6;
          p.scale = 0.55 + Math.random() * 0.45;
          p.color.copy(baseCol);
        } else if (effect === 'steam' || effect === 'heat_glow') {
          p.kind = 'steam';
          p.pos.set(origin.x + rx, origin.y + 0.68, origin.z + rz);
          p.vel.set((Math.random() - 0.5) * 0.14, 0.65 + Math.random() * 0.45, (Math.random() - 0.5) * 0.14);
          p.life = 1.6 + Math.random() * 0.9;
          p.scale = 1.1 + Math.random() * 0.9;
          p.color.set('#f8fafc');
        } else {
          // color_change -> sparkles
          p.kind = 'sparkle';
          p.pos.set(origin.x + rx * 1.3, origin.y + 0.35 + Math.random() * 0.35, origin.z + rz * 1.3);
          p.vel.set((Math.random() - 0.5) * 0.4, 0.35 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4);
          p.life = 1.0 + Math.random() * 0.5;
          p.scale = 0.5 + Math.random() * 0.4;
          p.color.set(Math.random() > 0.5 ? '#fde047' : '#38bdf8');
        }
        spawned++;
      }
    };

    const spawnTransferParticles = (
      fromPos: THREE.Vector3,
      toPos: THREE.Vector3,
      kind: 'droplet' | 'powder',
      colorHex: string
    ) => {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (p.active) continue;
        p.active = true;
        p.kind = kind;
        p.age = 0;
        p.life = 0.55;
        p.pos.set(
          fromPos.x + (kind === 'powder' ? (Math.random() - 0.5) * 0.1 : 0),
          fromPos.y,
          fromPos.z + (kind === 'powder' ? (Math.random() - 0.5) * 0.1 : 0)
        );
        p.vel.set(
          (toPos.x - fromPos.x) * 1.4,
          -1.4 - Math.random() * 0.5,
          (toPos.z - fromPos.z) * 1.4
        );
        p.scale = kind === 'droplet' ? 0.85 : 0.48;
        p.color.set(colorHex === 'transparent' ? '#bae6fd' : colorHex);
        break;
      }
    };

    // --- 11. ANIMATION STATE MACHINE ---
    interface ActiveStepAnim {
      step: LabStep;
      elapsed: number;
      duration: number;
      appliedEffect: boolean;
      appliedFinishTelemetry: boolean;
      dropSpawnAccum: number;
      startTemp: number;
      srcStartPos: THREE.Vector3;
      srcStartFill: number;
      tgtStartFill: number;
      tgtStartColor: THREE.Color;
      tgtEndColor: THREE.Color;
      nailTransferred: boolean;
    }
    let activeAnim: ActiveStepAnim | null = null;
    let currentPhVal = 7.0;
    let currentTempVal = 22.0;
    let currentMassVal = 0;
    let hotGlowVal = 0;

    // Redraw persistent meter canvas texture in-place (zero GPU texture churn)
    const updateMeterTexture = (ph: number, temp: number, mass: number) => {
      updateMeterLines(
        `pH   ${ph.toFixed(1)}`,
        `TEMP ${temp.toFixed(1)}C`,
        `MASS ${mass.toFixed(0)}g`
      );
    };

    // Pointer / Raycasting state
    const pointerNdc = new THREE.Vector2(0, 0);
    let smoothParallaxX = 0;
    let smoothParallaxY = 0;
    const raycaster = new THREE.Raycaster();
    let hoveredInteractId: string | null = null;

    const triggerStepAnimation = (step: LabStep) => {
      setPhase('animating');
      setShowHint(false);
      playLabTone(step.action, stateRef.current.muted);

      const src = vesselsMap.get(step.sourceId);
      const tgt = vesselsMap.get(step.targetId);

      const duration =
        step.action === 'heat'
          ? 2.4
          : step.action === 'stir'
            ? 1.8
            : step.action === 'drop'
              ? 1.75
              : 2.05;

      activeAnim = {
        step,
        elapsed: 0,
        duration,
        appliedEffect: false,
        appliedFinishTelemetry: false,
        dropSpawnAccum: 0,
        startTemp: currentTempVal,
        srcStartPos: src ? src.group.position.clone() : new THREE.Vector3(),
        srcStartFill: src ? src.currentFill : 0,
        tgtStartFill: tgt ? tgt.currentFill : 0,
        tgtStartColor: tgt ? tgt.currentColor.clone() : new THREE.Color('#bae6fd'),
        tgtEndColor: new THREE.Color(
          step.resultingColor === 'transparent' ? '#bae6fd' : step.resultingColor
        ),
        nailTransferred: false,
      };
    };

    const handleInteractClick = (interactId: string) => {
      const s = stateRef.current;
      if (s.phase === 'animating' || s.phase === 'science_note' || s.phase === 'completed') {
        return;
      }

      // Step 0: Must click glove box first
      if (s.phase === 'gloves') {
        if (interactId === '__glove_box__') {
          playLabTone('success', s.muted);
          setGlovesOn(true);
          setRightClicks((r) => r + 1);
          setShowHint(false);
          setStepWrongCount(0);
          peekingGloveGroup.visible = false;
          showToast('Gloves equipped! Now follow Step 1.', 'good');
          const first = experimentRef.current.steps[0];
          if (first) {
            setPhase(
              first.action === 'pour' || first.action === 'drop'
                ? 'awaiting_source'
                : 'awaiting_target'
            );
          } else {
            setPhase('completed');
          }
        } else {
          playLabTone('error', s.muted);
          setWrongClicks((w) => w + 1);
          const v = vesselsMap.get(interactId);
          if (v) v.shakeTimer = 0.45;
          showToast('Put on safety gloves first — click the green glove box!', 'error');
        }
        return;
      }

      const step = experimentRef.current.steps[s.stepIdx];
      if (!step) return;

      if (s.phase === 'awaiting_source') {
        if (interactId === step.sourceId) {
          playLabTone('success', s.muted);
          setRightClicks((r) => r + 1);
          setSelectedSourceId(interactId);
          const srcVessel = vesselsMap.get(interactId);
          if (srcVessel) {
            srcVessel.targetPos.y = 0.36;
          }
          setPhase('awaiting_target');
          const targetName = vesselsMap.get(step.targetId)?.spec.name ?? 'target vessel';
          showToast(`Selected ${srcVessel?.spec.name}. Now click ${targetName}!`, 'info');
        } else {
          playLabTone('error', s.muted);
          setWrongClicks((w) => w + 1);
          const nextWrong = s.stepWrongCount + 1;
          setStepWrongCount(nextWrong);
          const v = vesselsMap.get(interactId);
          if (v) v.shakeTimer = 0.45;
          if (nextWrong >= 2) {
            setShowHint(true);
            showToast('Hint unlocked below!', 'info');
          } else {
            showToast('Not that vessel — follow the pulsing gold ring!', 'error');
          }
        }
        return;
      }

      if (s.phase === 'awaiting_target') {
        if (interactId === step.targetId) {
          setRightClicks((r) => r + 1);
          triggerStepAnimation(step);
        } else if (interactId === s.selectedSourceId) {
          showToast(
            `Now click ${vesselsMap.get(step.targetId)?.spec.name ?? 'the highlighted vessel'}!`,
            'info'
          );
        } else {
          playLabTone('error', s.muted);
          setWrongClicks((w) => w + 1);
          const nextWrong = s.stepWrongCount + 1;
          setStepWrongCount(nextWrong);
          const v = vesselsMap.get(interactId);
          if (v) v.shakeTimer = 0.45;
          if (nextWrong >= 2) {
            setShowHint(true);
            showToast('Hint unlocked below!', 'info');
          } else {
            showToast('Wrong target — click the vessel with the gold ring!', 'error');
          }
        }
      }
    };

    const updatePointerFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      pointerNdc.set((localX / rect.width) * 2 - 1, -(localY / rect.height) * 2 + 1);
      if (cursorDivRef.current) {
        cursorDivRef.current.style.transform = `translate3d(${localX - 10}px, ${localY - 6}px, 0)`;
      }
      setCursorVisible(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      updatePointerFromClient(e.clientX, e.clientY);
    };

    const onPointerLeave = () => {
      setCursorVisible(false);
      setCursorHovering(false);
      hoveredInteractId = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.interactId as string | undefined;
        if (hitId) {
          handleInteractClick(hitId);
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
    const onContextRestored = () => {
      setContextLost(false);
    };
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

    // --- 12. MAIN RENDER LOOP ---
    let rafId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Smooth camera parallax
      smoothParallaxX = THREE.MathUtils.damp(smoothParallaxX, pointerNdc.x * 0.28, 4.5, dt);
      smoothParallaxY = THREE.MathUtils.damp(smoothParallaxY, pointerNdc.y * 0.14, 4.5, dt);
      camera.position.set(
        baseCamPos.x + smoothParallaxX,
        baseCamPos.y + smoothParallaxY,
        baseCamPos.z
      );
      camera.lookAt(baseLookAt);

      // Hover raycast
      raycaster.setFromCamera(pointerNdc, camera);
      const hoverHits = raycaster.intersectObjects(clickableMeshes, false);
      const nextHovered =
        hoverHits.length > 0
          ? ((hoverHits[0].object.userData.interactId as string) ?? null)
          : null;
      if (nextHovered !== hoveredInteractId) {
        hoveredInteractId = nextHovered;
        setCursorHovering(Boolean(nextHovered));
      }

      // Highlight ring placement
      const s = stateRef.current;
      const step = experimentRef.current.steps[s.stepIdx];
      let ringTargetPos: THREE.Vector3 | null = null;
      if (s.phase === 'gloves') {
        ringTargetPos = gloveBoxPos;
      } else if (s.phase === 'awaiting_source' && step) {
        ringTargetPos = vesselsMap.get(step.sourceId)?.basePos ?? null;
      } else if (s.phase === 'awaiting_target' && step) {
        ringTargetPos = vesselsMap.get(step.targetId)?.basePos ?? null;
      }

      if (ringTargetPos) {
        goldRing.visible = true;
        const pulse = 1 + Math.sin(now * 0.006) * 0.09;
        goldRing.position.set(ringTargetPos.x, 0.035, ringTargetPos.z);
        goldRing.scale.set(pulse, pulse, 1);
        ringMat.emissiveIntensity = 0.75 + Math.sin(now * 0.008) * 0.35;
      } else {
        goldRing.visible = false;
      }

      // Step animation progression (smoothstep keyframed motion — zero damp stutter)
      let activeSrcId: string | null = null;
      let activeTgtMoveId: string | null = null;

      if (activeAnim) {
        activeAnim.elapsed += dt;
        const t = Math.min(1, activeAnim.elapsed / activeAnim.duration);
        const animStep = activeAnim.step;
        const src = vesselsMap.get(animStep.sourceId);
        const tgt = vesselsMap.get(animStep.targetId);

        if ((animStep.action === 'pour' || animStep.action === 'drop') && src && tgt) {
          activeSrcId = src.spec.id;
          const isPour = animStep.action === 'pour';
          const pourFromRight = src.basePos.x >= tgt.basePos.x;
          const dirSign = pourFromRight ? 1 : -1;
          const hoverOffsetX = isPour ? dirSign * 0.56 : dirSign * 0.06;
          const hoverY = 1.28;
          const hoverX = tgt.basePos.x + hoverOffsetX;
          const hoverZ = tgt.basePos.z;
          const maxTilt = isPour ? dirSign * 1.06 : dirSign * 0.14;

          if (t < 0.28) {
            // Stage 1: Smooth arc lift & travel above target
            const u = smoothstep01(t / 0.28);
            const arcLift = Math.sin(u * Math.PI) * 0.28;
            src.group.position.set(
              THREE.MathUtils.lerp(activeAnim.srcStartPos.x, hoverX, u),
              THREE.MathUtils.lerp(activeAnim.srcStartPos.y, hoverY, u) + arcLift,
              THREE.MathUtils.lerp(activeAnim.srcStartPos.z, hoverZ, u)
            );
            src.group.rotation.z = 0;
            pourStream.visible = false;
          } else if (t < 0.72) {
            // Stage 2: Smooth tilt & continuous stream/fill interpolation
            const u = (t - 0.28) / 0.44;
            const tiltWeight = Math.min(1, u < 0.2 ? smoothstep01(u / 0.2) : u > 0.85 ? smoothstep01((1 - u) / 0.15) : 1);
            src.group.position.set(hoverX, hoverY, hoverZ);
            src.group.rotation.z = maxTilt * tiltWeight;

            // Continuous liquid level & color transition
            const pourEase = smoothstep01(u);
            if (!src.isNailVessel) {
              const endSrcFill = Math.max(0.05, activeAnim.srcStartFill - animStep.fillDelta);
              src.targetFill = THREE.MathUtils.lerp(activeAnim.srcStartFill, endSrcFill, pourEase);
              src.currentFill = src.targetFill;
            } else {
              src.targetFill = 0;
              src.currentFill = 0;
            }
            const endTgtFill = Math.min(0.95, activeAnim.tgtStartFill + animStep.fillDelta);
            tgt.targetFill = THREE.MathUtils.lerp(activeAnim.tgtStartFill, endTgtFill, pourEase);
            tgt.currentFill = tgt.targetFill;
            tgt.targetColor.copy(activeAnim.tgtEndColor);
            tgt.currentColor.copy(activeAnim.tgtStartColor).lerp(activeAnim.tgtEndColor, pourEase);

            if (src.isNailVessel && !activeAnim.nailTransferred && u > 0.35) {
              activeAnim.nailTransferred = true;
              if (src.nailMesh) {
                src.group.remove(src.nailMesh);
                src.nailMesh.rotation.set(0, 0.2, -0.34, 'YXZ');
                src.nailMesh.position.set(0.04, 0.04, 0);
                tgt.group.add(src.nailMesh);
                tgt.nailMesh = src.nailMesh;
                tgt.nailMat = src.nailMat;
                src.nailMesh = undefined;
              }
            }

            if (!activeAnim.appliedEffect && u > 0.4) {
              activeAnim.appliedEffect = true;
              currentPhVal = animStep.ph;
              currentTempVal = animStep.temperatureC;
              currentMassVal += animStep.massDeltaGrams;
              setPhValue(currentPhVal);
              setTempValue(currentTempVal);
              setMassValue(currentMassVal);
              updateMeterTexture(currentPhVal, currentTempVal, currentMassVal);
              spawnParticles(tgt.basePos, animStep.effect, animStep.resultingColor, 34);
            }

            // Stream or droplet/powder particles from exact tilted rim lip
            if (!src.isNailVessel && u > 0.14 && u < 0.88) {
              const lipLocalY = src.innerBottomY + src.innerHeight * 0.92;
              const lipSin = Math.sin(src.group.rotation.z);
              const lipCos = Math.cos(src.group.rotation.z);
              _vecA.set(
                src.group.position.x - lipSin * lipLocalY - dirSign * 0.14 * lipCos,
                src.group.position.y + lipCos * lipLocalY - 0.04,
                src.group.position.z
              );
              const tgtTopY = tgt.basePos.y + tgt.innerBottomY + tgt.currentFill * tgt.innerHeight;
              _vecB.set(tgt.basePos.x, tgtTopY, tgt.basePos.z);

              if (isPour && src.spec.state !== 'powder') {
                pourStream.visible = true;
                streamMat.color.copy(src.currentColor);
                _vecDir.subVectors(_vecB, _vecA);
                const len = Math.max(0.05, _vecDir.length());
                _vecDir.normalize();
                pourStream.position.copy(_vecA).lerp(_vecB, 0.5);
                pourStream.scale.set(1, len, 1);
                pourStream.quaternion.setFromUnitVectors(_upAxis, _vecDir);
              } else {
                pourStream.visible = false;
                activeAnim.dropSpawnAccum += dt;
                if (activeAnim.dropSpawnAccum > 0.075) {
                  activeAnim.dropSpawnAccum = 0;
                  spawnTransferParticles(
                    _vecA,
                    _vecB,
                    src.spec.state === 'powder' ? 'powder' : 'droplet',
                    src.spec.initialColor
                  );
                }
              }
            } else {
              pourStream.visible = false;
            }
          } else {
            // Stage 3: Smooth return back to resting position
            pourStream.visible = false;
            const u = smoothstep01((t - 0.72) / 0.28);
            const arcLift = Math.sin(u * Math.PI) * 0.22;
            src.group.position.set(
              THREE.MathUtils.lerp(hoverX, src.basePos.x, u),
              THREE.MathUtils.lerp(hoverY, src.basePos.y, u) + arcLift,
              THREE.MathUtils.lerp(hoverZ, src.basePos.z, u)
            );
            src.group.rotation.z = 0;
            src.targetPos.copy(src.basePos);
            src.targetRotZ = 0;
          }
        } else if (animStep.action === 'stir' && tgt) {
          stirRod.visible = true;
          const orbitAngle = t * Math.PI * 6;
          const plunge = t < 0.15 ? smoothstep01(t / 0.15) : t > 0.85 ? smoothstep01((1 - t) / 0.15) : 1;
          stirRod.position.set(
            tgt.basePos.x + Math.cos(orbitAngle) * 0.09 * plunge,
            tgt.basePos.y + THREE.MathUtils.lerp(1.35, 0.68, plunge),
            tgt.basePos.z + Math.sin(orbitAngle) * 0.09 * plunge
          );
          stirRod.rotation.z = Math.sin(orbitAngle) * 0.14 * plunge;
          const stirEase = smoothstep01(t);
          tgt.currentColor.copy(activeAnim.tgtStartColor).lerp(activeAnim.tgtEndColor, stirEase);
          tgt.targetColor.copy(activeAnim.tgtEndColor);

          if (t > 0.35 && !activeAnim.appliedEffect) {
            activeAnim.appliedEffect = true;
            currentPhVal = animStep.ph;
            currentTempVal = animStep.temperatureC;
            setPhValue(currentPhVal);
            setTempValue(currentTempVal);
            updateMeterTexture(currentPhVal, currentTempVal, currentMassVal);
            spawnParticles(tgt.basePos, animStep.effect, animStep.resultingColor, 28);
          }
        } else if (animStep.action === 'heat' && tgt) {
          activeTgtMoveId = tgt.spec.id;
          if (t < 0.22) {
            const u = smoothstep01(t / 0.22);
            tgt.group.position.set(
              THREE.MathUtils.lerp(tgt.basePos.x, hotPlatePos.x, u),
              THREE.MathUtils.lerp(tgt.basePos.y, 0.23, u) + Math.sin(u * Math.PI) * 0.32,
              THREE.MathUtils.lerp(tgt.basePos.z, hotPlatePos.z, u)
            );
          } else if (t < 0.78) {
            const u = (t - 0.22) / 0.56;
            tgt.group.position.set(hotPlatePos.x, 0.23, hotPlatePos.z);
            hotGlowVal = THREE.MathUtils.damp(hotGlowVal, 2.2, 5, dt);
            const interpolatedTemp = THREE.MathUtils.lerp(
              activeAnim.startTemp,
              animStep.temperatureC,
              smoothstep01(u)
            );
            currentTempVal = Math.round(interpolatedTemp * 10) / 10;
            setTempValue(currentTempVal);
            tgt.currentColor.copy(activeAnim.tgtStartColor).lerp(activeAnim.tgtEndColor, smoothstep01(u));
            tgt.targetColor.copy(activeAnim.tgtEndColor);

            activeAnim.dropSpawnAccum += dt;
            if (activeAnim.dropSpawnAccum > 0.16) {
              activeAnim.dropSpawnAccum = 0;
              spawnParticles(tgt.group.position, 'steam', '#ffffff', 3);
              updateMeterTexture(currentPhVal, currentTempVal, currentMassVal);
            }
            if (u > 0.35 && !activeAnim.appliedEffect) {
              activeAnim.appliedEffect = true;
              currentPhVal = animStep.ph;
              setPhValue(currentPhVal);
              spawnParticles(tgt.group.position, animStep.effect, animStep.resultingColor, 26);
            }
          } else {
            const u = smoothstep01((t - 0.78) / 0.22);
            tgt.group.position.set(
              THREE.MathUtils.lerp(hotPlatePos.x, tgt.basePos.x, u),
              THREE.MathUtils.lerp(0.23, tgt.basePos.y, u) + Math.sin(u * Math.PI) * 0.28,
              THREE.MathUtils.lerp(hotPlatePos.z, tgt.basePos.z, u)
            );
            hotGlowVal = THREE.MathUtils.damp(hotGlowVal, 0, 5, dt);
            tgt.targetPos.copy(tgt.basePos);
          }
        }

        if (t >= 1) {
          pourStream.visible = false;
          stirRod.visible = false;
          hotGlowVal = 0;
          if (src) {
            src.group.position.copy(src.basePos);
            src.group.rotation.z = 0;
            src.targetPos.copy(src.basePos);
            src.targetRotZ = 0;
          }
          if (tgt) {
            tgt.group.position.copy(tgt.basePos);
            tgt.group.rotation.z = 0;
            tgt.targetPos.copy(tgt.basePos);
            tgt.targetRotZ = 0;
          }
          updateMeterTexture(animStep.ph, animStep.temperatureC, currentMassVal);
          setPhValue(animStep.ph);
          setTempValue(animStep.temperatureC);
          playLabTone('success', stateRef.current.muted);
          activeAnim = null;
          setPhase('science_note');
        }
      } else {
        hotGlowVal = THREE.MathUtils.damp(hotGlowVal, 0, 5, dt);
      }

      heatingCoilMat.emissiveIntensity = hotGlowVal;
      hotPlateLight.intensity = hotGlowVal * 1.1;

      // Update every vessel transform, fill clipping plane, color & shake
      vesselsMap.forEach((v, id) => {
        const isHovered = hoveredInteractId === id;
        v.hoverAmount = THREE.MathUtils.damp(v.hoverAmount, isHovered ? 0.04 : 0, 10, dt);

        if (v.shakeTimer > 0) {
          v.shakeTimer = Math.max(0, v.shakeTimer - dt);
        }
        const shakeOffset =
          v.shakeTimer > 0 ? Math.sin(v.shakeTimer * 48) * 0.06 * (v.shakeTimer / 0.45) : 0;

        if (id !== activeSrcId && id !== activeTgtMoveId) {
          v.group.position.x =
            THREE.MathUtils.damp(v.group.position.x, v.targetPos.x, 9, dt) + shakeOffset;
          v.group.position.y = THREE.MathUtils.damp(
            v.group.position.y,
            v.targetPos.y + v.hoverAmount,
            9,
            dt
          );
          v.group.position.z = THREE.MathUtils.damp(v.group.position.z, v.targetPos.z, 9, dt);
          v.group.rotation.z = THREE.MathUtils.damp(v.group.rotation.z, v.targetRotZ, 9, dt);
        }

        v.currentFill = THREE.MathUtils.damp(v.currentFill, v.targetFill, 5, dt);
        v.currentColor.lerp(v.targetColor, Math.min(1, dt * 4));
        v.liquidMat.color.copy(v.currentColor);
        v.meniscusMat.color.copy(v.currentColor);

        const visible = !v.isNailVessel && v.currentFill > 0.012;
        v.liquidMesh.visible = visible;
        v.meniscusMesh.visible = visible;
        if (visible) {
          const localTopY = v.innerBottomY + v.currentFill * v.innerHeight;
          v.clipPlane.constant = v.group.position.y + localTopY;
          v.meniscusMesh.position.y = localTopY;
          const r = v.profileRadiusAt(v.currentFill);
          v.meniscusMesh.scale.set(r, r, 1);
        }
        // Copper-deposit tint if a forged nail sits inside a heated/reacting solution
        if (v.nailMat && v.currentFill > 0.15 && v.targetColor.getHexString() === '10b981') {
          _colorA.set('#c26d3a');
          v.nailMat.color.lerp(_colorA, Math.min(1, dt * 1.4));
        }
      });

      // Update pooled particles
      let anyParticleUpdated = false;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;
        anyParticleUpdated = true;
        p.age += dt;
        if (p.age >= p.life) {
          p.active = false;
          _matrix.makeScale(0, 0, 0);
          particleMesh.setMatrixAt(i, _matrix);
          continue;
        }
        p.pos.addScaledVector(p.vel, dt);
        if (p.kind === 'foam') {
          p.vel.y -= 1.6 * dt;
        } else if (p.kind === 'steam') {
          p.scale += dt * 0.45;
        }
        const fade = Math.sin((p.age / p.life) * Math.PI);
        const sVal = Math.max(0.01, p.scale * fade);
        _scaleVec.set(sVal, sVal, sVal);
        _matrix.compose(p.pos, _quat, _scaleVec);
        particleMesh.setMatrixAt(i, _matrix);
        particleMesh.setColorAt(i, p.color);
      }
      if (anyParticleUpdated) {
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
    if (!currentStep) {
      return 'Experiment complete! Review your results or take the bonus quiz.';
    }
    if (phase === 'awaiting_source') {
      return `Step ${currentStep.stepNumber}: ${currentStep.instruction}`;
    }
    if (phase === 'awaiting_target' && selectedSourceId) {
      const targetName =
        experiment.vessels.find((v) => v.id === currentStep.targetId)?.name ?? 'the target vessel';
      return `Step ${currentStep.stepNumber}: Now click ${targetName} to ${currentStep.action}.`;
    }
    return `Step ${currentStep.stepNumber}: ${currentStep.instruction}`;
  }, [phase, experiment, currentStep, selectedSourceId]);

  return (
    <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 shadow-xl overflow-hidden">
      {/* Top Bar */}
      <div className="px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
            <FlaskConical className="w-5 h-5" />
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
          cursorVisible ? 'cursor-none' : 'cursor-pointer'
        }`}
      >
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />

        {/* WebGL Context Lost Fallback */}
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

        {/* Top-Left Digital Instrument Card (No backdrop-blur over WebGL!) */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/95 border border-slate-700 rounded-xl p-3 text-white shadow-lg min-w-[168px]">
          <p className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold mb-2">
            Lab Telemetry
          </p>
          <div className="grid grid-cols-3 gap-2.5 text-center font-mono tabular-nums">
            <div className="bg-slate-800 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400">pH</div>
              <div className="text-sm font-bold text-cyan-300">{phValue.toFixed(1)}</div>
            </div>
            <div className="bg-slate-800 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400">TEMP</div>
              <div className="text-sm font-bold text-amber-300">{tempValue.toFixed(1)}°</div>
            </div>
            <div className="bg-slate-800 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400">MASS</div>
              <div className="text-sm font-bold text-emerald-300">{massValue.toFixed(0)}g</div>
            </div>
          </div>
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

        {/* Short Toast Banner */}
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

        {/* Bottom-Left Labster-Style Instruction HUD (Solid translucent, NO backdrop-blur) */}
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
              disabled={phase === 'completed' || phase === 'science_note'}
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
            <div className="max-w-md w-full bg-white text-slate-900 rounded-2xl border-2 border-sky-500 shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-sky-700">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-display text-lg font-bold">The science behind it</h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{currentStep.scienceNote}</p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center font-mono text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400">pH</div>
                  <div className="font-bold text-sky-700">{currentStep.ph.toFixed(1)}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400">TEMP</div>
                  <div className="font-bold text-amber-600">
                    {currentStep.temperatureC.toFixed(1)} °C
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
                {stepIdx + 1 >= experiment.steps.length ? 'Finish Experiment' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Final Experiment Summary Modal */}
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
                  Experiment Complete!
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
          cursorVisible={cursorVisible}
          cursorHovering={cursorHovering}
          glovesOn={glovesOn}
        />
      </div>
    </div>
  );
};
