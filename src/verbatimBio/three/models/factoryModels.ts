import * as THREE from 'three';
import {
  createGlassMaterial,
  createLeafMaterial,
  createOrganicMaterial,
  enableModelShadows,
  makeCanvasLabelTexture,
  type ModelBuildOptions,
} from './shared.ts';

export interface EquationState {
  co2: boolean;
  h2o: boolean;
  light: boolean;
  glucose: boolean;
  o2: boolean;
  completeGold: boolean;
}

export function drawEquationBoardCanvas(
  canvas: HTMLCanvasElement,
  state: EquationState,
): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = state.completeGold ? '#422006' : '#0f172a';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = state.completeGold ? '#facc15' : '#22c55e';
  ctx.lineWidth = state.completeGold ? 10 : 6;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.fillStyle = state.completeGold ? '#fde047' : '#86efac';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLAR LEAF FACTORY EQUATION', w / 2, 34);

  const drawTerm = (
    x: number,
    y: number,
    bw: number,
    bh: number,
    text: string,
    lit: boolean,
    activeBg: string,
    activeBorder: string,
  ) => {
    ctx.fillStyle = state.completeGold ? '#fef08a' : lit ? activeBg : '#1e293b';
    ctx.strokeStyle = state.completeGold ? '#eab308' : lit ? activeBorder : '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = state.completeGold || lit ? '#0f172a' : '#64748b';
    ctx.font = 'bold 30px monospace';
    ctx.fillText(text, x, y + 10);
  };

  const y = 94;
  drawTerm(92, y, 132, 62, '6CO₂', state.co2, '#e2e8f0', '#94a3b8');
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('+', 178, y + 10);

  drawTerm(262, y, 132, 62, '6H₂O', state.h2o, '#bae6fd', '#38bdf8');

  // Arrow + sunlight badge
  ctx.fillStyle = state.light || state.completeGold ? '#fde047' : '#475569';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(state.light ? '☀ SUNLIGHT' : 'LIGHT', 376, y - 16);
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('→', 376, y + 16);

  drawTerm(506, y, 168, 62, 'C₆H₁₂O₆', state.glucose, '#fef08a', '#f59e0b');
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('+', 608, y + 10);

  drawTerm(686, y, 124, 62, '6O₂ ↑', state.o2, '#cffafe', '#06b6d4');
}

export function buildHardHatBox(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const boxMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.45 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.38 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.28), boxMat);
  base.position.y = 0.08;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.03, 0.29), trimMat);
  band.position.y = 0.15;
  g.add(base, band);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.11),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('HARD HAT', 'FACTORY SAFETY', '#ca8a04', '#ffffff'),
    }),
  );
  label.position.set(0, 0.08, 0.143);
  g.add(label);

  // Cute yellow factory hard hat sitting cleanly on top
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 0.165, 0);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.05 });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hatMat,
  );
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.028, 0.19), hatMat);
  ridge.position.y = 0.095;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.132, 0.015, 22), hatMat);
  brim.position.y = 0.008;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.014, 0.07), hatMat);
  visor.position.set(0, 0.008, 0.11);
  hatGroup.add(dome, ridge, brim, visor);
  g.add(hatGroup);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildLeafFactory(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Cutaway leaf cross-section backdrop wall behind the factory bench zone
  const lowerFloor = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.04, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.6 }),
  );
  lowerFloor.position.set(0, 0.02, -0.15);
  g.add(lowerFloor);

  // Leaf cutaway curved back canopy (waxy upper cuticle + palisade column cells + spongy layer)
  const backCutaway = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.92, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.68 }),
  );
  backCutaway.position.set(0, 0.48, -0.82);
  g.add(backCutaway);

  const upperCuticle = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.09, 0.34),
    new THREE.MeshStandardMaterial({
      color: 0x86efac,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85,
    }),
  );
  upperCuticle.position.set(0, 0.96, -0.7);
  g.add(upperCuticle);

  // Palisade column cells lined cleanly along upper wall
  const palisadeMat = createLeafMaterial(opts, 0x22c55e);
  const palisadeCells: THREE.Mesh[] = [];
  for (let i = 0; i < 11; i++) {
    const cell = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.36, 0.12), palisadeMat);
    cell.position.set(-1.1 + i * 0.22, 0.72, -0.74);
    palisadeCells.push(cell);
    g.add(cell);
  }
  g.userData.palisadeMat = palisadeMat;

  // Spongy mesophyll rounded cells along lower back wall
  const spongyMat = createOrganicMaterial(opts, 0x4ade80, 0.52);
  for (let i = 0; i < 8; i++) {
    const sc = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), spongyMat);
    sc.scale.set(1.2, 0.85, 0.7);
    sc.position.set(-0.98 + i * 0.28, 0.24 + (i % 2) * 0.12, -0.73);
    g.add(sc);
  }

  // Overhead Equation Board (6CO2 + 6H2O -> C6H12O6 + 6O2)
  const eqCanvas = document.createElement('canvas');
  eqCanvas.width = 768;
  eqCanvas.height = 148;
  const initialState: EquationState = {
    co2: false,
    h2o: false,
    light: false,
    glucose: false,
    o2: false,
    completeGold: false,
  };
  drawEquationBoardCanvas(eqCanvas, initialState);
  const eqTex = new THREE.CanvasTexture(eqCanvas);
  eqTex.colorSpace = THREE.SRGBColorSpace;

  const boardFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.44, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 }),
  );
  boardFrame.position.set(0, 1.32, -0.72);
  const boardFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.06, 0.38),
    new THREE.MeshBasicMaterial({ map: eqTex }),
  );
  boardFace.position.set(0, 1.32, -0.692);

  // Two brass support struts from cuticle to equation board
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.3 });
  [-0.78, 0.78].forEach((sx) => {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), strutMat);
    strut.position.set(sx, 1.05, -0.72);
    g.add(strut);
  });
  g.add(boardFrame, boardFace);
  g.userData.eqCanvas = eqCanvas;
  g.userData.eqTex = eqTex;
  g.userData.eqState = initialState;

  // Sprout Mascot wearing a cute yellow factory hard hat on the left-front factory deck
  const sprout = new THREE.Group();
  sprout.position.set(-1.12, 0.04, 0.28);
  const sproutBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 14),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 }),
  );
  sproutBody.scale.set(1, 1.18, 0.95);
  sproutBody.position.y = 0.13;
  // Smiling eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  [-0.036, 0.036].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), eyeMat);
    eye.position.set(ex, 0.15, 0.095);
    sprout.add(eye);
  });
  // Hard hat on Sprout
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25 });
  const sHatDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hatMat,
  );
  sHatDome.position.y = 0.21;
  const sHatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.015, 16), hatMat);
  sHatBrim.position.y = 0.215;
  // Tiny sprout leaf poking above hard hat
  const sLeaf = new THREE.Mesh(
    new THREE.ConeGeometry(0.028, 0.08, 6),
    new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.4 }),
  );
  sLeaf.position.set(0.03, 0.34, 0);
  sLeaf.rotation.z = -0.35;
  sprout.add(sproutBody, sHatDome, sHatBrim, sLeaf);
  g.add(sprout);
  g.userData.sproutMascot = sprout;

  // Fruit & Root Storage pods on the right side (swell in Step 8 when glucose arrives)
  const fruitPod = new THREE.Group();
  fruitPod.position.set(1.18, 0.18, -0.35);
  const apple = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 18, 16),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 }),
  );
  apple.scale.set(1.05, 0.92, 1.0);
  const appleStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.015, 0.06, 6),
    new THREE.MeshStandardMaterial({ color: 0x78350f }),
  );
  appleStem.position.y = 0.13;
  fruitPod.add(apple, appleStem);

  const rootPod = new THREE.Group();
  rootPod.position.set(1.18, 0.11, 0.02);
  const carrot = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.24, 14),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 }),
  );
  carrot.rotation.x = Math.PI * 0.48;
  rootPod.add(carrot);

  const storageLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.12),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('FRUIT & ROOT', 'SUGAR STORAGE', '#ea580c', '#ffffff'),
    }),
  );
  storageLabel.position.set(1.18, 0.42, -0.18);
  g.add(fruitPod, rootPod, storageLabel);
  g.userData.fruitStorage = fruitPod;
  g.userData.rootStorage = rootPod;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildStomataGate(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
  const frameBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.24), frameMat);
  frameBase.position.y = 0.02;
  g.add(frameBase);

  // Two posts + overhead sign "STOMATA GATE"
  [-0.24, 0.24].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.44, 10), frameMat);
    post.position.set(px, 0.22, 0);
    g.add(post);
  });
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.14, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.4 }),
  );
  signBoard.position.set(0, 0.47, 0);
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.12),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('STOMATA GATE', 'GUARD CELLS', '#16a34a', '#ecfdf5'),
    }),
  );
  signFace.position.set(0, 0.47, 0.022);
  g.add(signBoard, signFace);

  // Kidney-shaped hinged guard cells (start slightly closed, swing outward on open)
  const guardMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    roughness: 0.35,
    emissive: 0x16a34a,
    emissiveIntensity: 0.15,
  });

  const leftPivot = new THREE.Group();
  leftPivot.position.set(-0.2, 0.2, 0);
  const leftGuard = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.15, 8, 14), guardMat);
  leftGuard.scale.set(0.85, 1.0, 0.72);
  leftGuard.position.set(0.11, 0, 0);
  leftGuard.rotation.z = -0.18;
  leftPivot.add(leftGuard);

  const rightPivot = new THREE.Group();
  rightPivot.position.set(0.2, 0.2, 0);
  const rightGuard = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.15, 8, 14), guardMat);
  rightGuard.scale.set(0.85, 1.0, 0.72);
  rightGuard.position.set(-0.11, 0, 0);
  rightGuard.rotation.z = 0.18;
  rightPivot.add(rightGuard);

  g.add(leftPivot, rightPivot);
  g.userData.leftGuardPivot = leftPivot;
  g.userData.rightGuardPivot = rightPivot;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildRootsXylem(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.26, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.92 }),
  );
  soil.position.y = 0.06;
  g.add(soil);

  const rootMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
  const pumpBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.14, 12),
    rootMat,
  );
  pumpBase.position.y = 0.16;
  g.add(pumpBase);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.006, 0.22, 8), rootMat);
    strand.position.set(Math.cos(ang) * 0.1, 0.1, Math.sin(ang) * 0.1);
    strand.rotation.z = -Math.cos(ang) * 0.72;
    strand.rotation.x = Math.sin(ang) * 0.72;
    g.add(strand);
  }

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.1),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('ROOTS', 'WATER PUMP', '#92400e', '#fef3c7'),
    }),
  );
  badge.position.set(0, 0.26, 0.14);
  g.add(badge);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildXylemPipe(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const collarMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.35, metalness: 0.3 });
  const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.06, 16), collarMat);
  baseCollar.position.y = 0.03;
  const topCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.09, 0.06, 16), collarMat);
  topCollar.position.y = 0.68;
  g.add(baseCollar, topCollar);

  const glassPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 0.64, 18, 1, true),
    createGlassMaterial(opts, 0xbae6fd, 0.45),
  );
  glassPipe.position.y = 0.35;
  g.add(glassPipe);

  // Internal ascending water droplets animated in Bio3D
  const beadMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
    roughness: 0.15,
  });
  const waterBeads: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), beadMat);
    bead.position.set(Math.sin(i * 1.4) * 0.02, 0.12 + i * 0.09, Math.cos(i * 1.4) * 0.02);
    bead.visible = false;
    waterBeads.push(bead);
    g.add(bead);
  }
  g.userData.waterBeads = waterBeads;

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.1),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('XYLEM PIPE', 'H₂O LIFT', '#0284c7', '#f0f9ff'),
    }),
  );
  badge.position.set(0, 0.36, 0.09);
  g.add(badge);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildSunSwitch(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Pedestal + tactile yellow light switch
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.18, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 }),
  );
  box.position.y = 0.09;
  g.add(box);

  const lever = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.12, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.25 }),
  );
  lever.position.set(0, 0.18, 0.04);
  lever.rotation.x = -0.35;
  g.add(lever);
  g.userData.sunLever = lever;

  // Sun orb floating cleanly above with golden rays
  const sunGroup = new THREE.Group();
  sunGroup.position.set(0, 0.78, 0);
  const sunMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xfacc15,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });
  const sunCore = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 16), sunMat);
  sunGroup.add(sunCore);

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 6), sunMat);
    ray.position.set(Math.cos(ang) * 0.2, Math.sin(ang) * 0.2, 0);
    ray.rotation.z = ang - Math.PI / 2;
    sunGroup.add(ray);
  }
  g.add(sunGroup);

  // Sweeping light beam cones (start invisible until switch flipped)
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beamCone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 18, 1, true), beamMat);
  beamCone.position.set(0.45, 0.42, 0.05);
  beamCone.rotation.z = -0.78;
  g.add(beamCone);

  g.userData.sunGroup = sunGroup;
  g.userData.sunMat = sunMat;
  g.userData.beamMat = beamMat;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildChloroplastPlant(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Bean-shaped green Chloroplast Power Plant shell
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.38,
    emissive: 0x16a34a,
    emissiveIntensity: 0.14,
  });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 12, 20), hullMat);
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 1, 0.85);
  hull.position.set(0, 0.26, 0);
  g.add(hull);
  g.userData.chloroplastHullMat = hullMat;

  // Translucent top dome window showing stacked thylakoid solar panels
  const domeGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.18, 0.32),
    createGlassMaterial(opts, 0xbbf7d0, 0.36),
  );
  domeGlass.position.set(-0.08, 0.48, 0);
  g.add(domeGlass);

  // Glowing reaction core inside
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 14), coreMat);
  core.position.set(0.02, 0.28, 0.16);
  g.add(core);
  g.userData.coreMat = coreMat;

  // Smokestack chimney on left-back for O2 bubbles puff
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 0.24, 12),
    new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.45 }),
  );
  chimney.position.set(-0.28, 0.56, -0.06);
  g.add(chimney);

  // Sub-target 1: Stacked Thylakoid Solar Panels (clickable for Step 5!)
  const panelsGroup = new THREE.Group();
  panelsGroup.position.set(-0.1, 0.48, 0);
  panelsGroup.userData.subTargetKind = 'chloroplast_panels';
  panelsGroup.userData.subTargetId = 'chloroplast_panels';
  const discMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.25,
    roughness: 0.25,
    metalness: 0.15,
  });
  [-0.12, 0.04].forEach((sx) => {
    for (let k = 0; k < 4; k++) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.022, 14), discMat);
      disc.position.set(sx, -0.04 + k * 0.032, 0);
      panelsGroup.add(disc);
    }
  });
  g.add(panelsGroup);
  g.userData.panelsDiscMat = discMat;

  // Sub-target 2: Golden Sugar Maker machine on the right side (clickable for Step 6!)
  const sugarMakerGroup = new THREE.Group();
  sugarMakerGroup.position.set(0.36, 0.22, 0.12);
  sugarMakerGroup.userData.subTargetKind = 'sugar_maker';
  sugarMakerGroup.userData.subTargetId = 'sugar_maker';

  const smHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.24, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.25 }),
  );
  sugarMakerGroup.add(smHousing);

  const gearMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5, roughness: 0.25 });
  const gearA = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 8), gearMat);
  gearA.rotation.x = Math.PI / 2;
  gearA.position.set(-0.04, 0.06, 0.125);
  const gearB = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8), gearMat);
  gearB.rotation.x = Math.PI / 2;
  gearB.position.set(0.05, -0.02, 0.125);
  sugarMakerGroup.add(gearA, gearB);

  // Hexagonal sugar ring emerging on top of Sugar Maker
  const hexRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.015, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.45 }),
  );
  hexRing.position.set(0, 0.17, 0);
  hexRing.rotation.x = Math.PI / 4;
  sugarMakerGroup.add(hexRing);

  g.add(sugarMakerGroup);
  g.userData.sugarMakerGearA = gearA;
  g.userData.sugarMakerGearB = gearB;
  g.userData.sugarMakerHex = hexRing;

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.11),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('CHLOROPLAST', 'POWER PLANT', '#15803d', '#ecfdf5'),
    }),
  );
  badge.position.set(-0.05, 0.16, 0.23);
  g.add(badge);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildCo2Cloud(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Small labeled CO2 carrier tray + floating linear O=C=O molecules
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.05, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45 }),
  );
  tray.position.y = 0.025;
  g.add(tray);

  const cMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35 });
  const oMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });

  [
    { x: -0.04, y: 0.18, z: 0.02, ry: 0.3 },
    { x: 0.05, y: 0.28, z: -0.02, ry: -0.4 },
  ].forEach((m) => {
    const mol = new THREE.Group();
    mol.position.set(m.x, m.y, m.z);
    mol.rotation.y = m.ry;
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), cMat);
    const o1 = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), oMat);
    o1.position.x = -0.065;
    const o2 = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), oMat);
    o2.position.x = 0.065;
    mol.add(c, o1, o2);
    g.add(mol);
  });

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.09),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('CO₂ GAS', 'CARBON DIOXIDE', '#475569', '#f8fafc'),
    }),
  );
  badge.position.set(0, 0.08, 0.12);
  g.add(badge);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildWaterMolecules(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const tray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 }),
  );
  tray.position.y = 0.02;
  g.add(tray);

  const oMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2 });
  const hMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });

  [
    { x: -0.04, y: 0.14, z: 0.02 },
    { x: 0.05, y: 0.22, z: -0.02 },
  ].forEach((m) => {
    const mol = new THREE.Group();
    mol.position.set(m.x, m.y, m.z);
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), oMat);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), hMat);
    h1.position.set(-0.045, 0.035, 0);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), hMat);
    h2.position.set(0.045, 0.035, 0);
    mol.add(o, h1, h2);
    g.add(mol);
  });

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildGlucoseCrate(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const crateMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
  const slatMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.24), crateMat);
  box.position.y = 0.1;
  g.add(box);

  [-0.08, 0.08].forEach((sx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.21, 0.25), slatMat);
    rail.position.set(sx, 0.1, 0);
    g.add(rail);
  });

  // Glowing hexagonal sugar ring on top of crate
  const hexSugar = new THREE.Mesh(
    new THREE.TorusGeometry(0.065, 0.018, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 0.45 }),
  );
  hexSugar.rotation.x = Math.PI / 2;
  hexSugar.position.y = 0.215;
  g.add(hexSugar);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.1),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('GLUCOSE', 'C₆H₁₂O₆', '#d97706', '#fffbeb'),
    }),
  );
  label.position.set(0, 0.1, 0.123);
  g.add(label);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildOxygenBubbles(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.35 }),
  );
  base.position.y = 0.02;
  g.add(base);

  const bubMat = new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.78,
    roughness: 0.1,
  });

  // Diatomic O=O bubble pairs floating up
  [
    { x: -0.04, y: 0.16, z: 0.02, r: 0.048 },
    { x: 0.05, y: 0.24, z: -0.02, r: 0.042 },
    { x: 0.0, y: 0.34, z: 0.01, r: 0.052 },
  ].forEach((b) => {
    const pair = new THREE.Group();
    pair.position.set(b.x, b.y, b.z);
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(b.r, 14, 12), bubMat);
    b1.position.x = -b.r * 0.65;
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(b.r, 14, 12), bubMat);
    b2.position.x = b.r * 0.65;
    pair.add(b1, b2);
    g.add(pair);
  });

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.09),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('O₂ BUBBLES', 'OXYGEN GAS', '#0284c7', '#ecfeff'),
    }),
  );
  label.position.set(0, 0.06, 0.15);
  g.add(label);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildPhloemConveyor(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.45, metalness: 0.25 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });

  const track = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.07, 0.26), frameMat);
  track.position.y = 0.09;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.025, 0.22), beltMat);
  belt.position.y = 0.132;
  g.add(track, belt);

  // Conveyor rollers along edges
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.4, roughness: 0.3 });
  for (let i = -3; i <= 3; i++) {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.27, 10), rollerMat);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(i * 0.11, 0.09, 0);
    g.add(roller);
  }

  // Legs
  [-0.28, 0.28].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.22), frameMat);
    leg.position.set(lx, 0.045, 0);
    g.add(leg);
  });

  // Animated mini cargo slats moving across top belt
  const slats: THREE.Mesh[] = [];
  const slatMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.2), slatMat);
    slat.position.set(-0.27 + i * 0.18, 0.148, 0);
    slats.push(slat);
    g.add(slat);
  }
  g.userData.conveyorSlats = slats;

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.1),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('PHLOEM BELT', 'SUGAR DELIVERY', '#b45309', '#fffbeb'),
    }),
  );
  label.position.set(0, 0.08, 0.142);
  g.add(label);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}
