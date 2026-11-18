import * as THREE from 'three';
import { createGlassMaterial, enableModelShadows, type ModelBuildOptions } from './shared.ts';

export interface MicroscopeRefs {
  turretGroup: THREE.Group;
  coarseKnob: THREE.Group;
  fineKnob: THREE.Group;
  stageGroup: THREE.Group;
  stageSlideGroup: THREE.Group;
  stageLiquidDrop: THREE.Mesh;
  stageCoverslip: THREE.Mesh;
  lampGlowMat: THREE.MeshStandardMaterial;
  lampBeam: THREE.Mesh;
}

export function buildMicroscope(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.28,
    metalness: 0.18,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.55,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.16,
    metalness: 0.88,
  });
  const tealAccentMat = new THREE.MeshStandardMaterial({
    color: 0x0d7a5f,
    roughness: 0.32,
    metalness: 0.25,
  });

  // 1. Heavy contoured base with rubber feet
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.075, 0.82), darkMetalMat);
  foot.position.set(0, 0.038, 0);
  g.add(foot);

  const baseDeck = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.055, 0.72), bodyMat);
  baseDeck.position.set(0, 0.095, -0.02);
  g.add(baseDeck);

  // Bottom illuminator LED condenser lamp
  const lampRing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 0.055, 24), darkMetalMat);
  lampRing.position.set(0, 0.145, 0.12);
  g.add(lampRing);

  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });
  const lampLens = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.016, 20), lampGlowMat);
  lampLens.position.set(0, 0.175, 0.12);
  g.add(lampLens);

  // Subtle upward light beam cone from condenser to stage
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lampBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.085, 0.22, 16, 1, true), beamMat);
  lampBeam.position.set(0, 0.285, 0.12);
  g.add(lampBeam);

  // 2. Curved C-arm pillar
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.12, -0.25),
    new THREE.Vector3(0, 0.36, -0.32),
    new THREE.Vector3(0, 0.66, -0.28),
    new THREE.Vector3(0, 0.84, -0.08),
    new THREE.Vector3(0, 0.86, 0.1),
  ]);
  const armTube = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 26, 0.072, 14, false), bodyMat);
  g.add(armTube);

  // Structural teal side spine accent
  const spineStrip = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.36, 0.08), tealAccentMat);
  spineStrip.position.set(0, 0.42, -0.3);
  g.add(spineStrip);

  // 3. Stage assembly with aperture, spring clips, and mounted slide/stain/coverslip placeholders
  const stageGroup = new THREE.Group();
  stageGroup.position.set(0, 0.41, 0.08);

  const stagePlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.032, 0.44), darkMetalMat);
  stageGroup.add(stagePlate);

  // Condenser aperture disc
  const aperture = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.036, 18),
    createGlassMaterial(opts.isSoftwareGl, 0xffffff, 0.28),
  );
  aperture.position.set(0, 0, 0.04);
  stageGroup.add(aperture);

  // Two chrome spring stage clips
  [-0.12, 0.12].forEach((cx) => {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.16), chromeMat);
    clip.position.set(cx, 0.022, -0.04);
    clip.rotation.y = cx < 0 ? 0.15 : -0.15;
    stageGroup.add(clip);
  });

  // Mounted slide group (initially hidden until Step 1 place_slide!)
  const stageSlideGroup = new THREE.Group();
  stageSlideGroup.position.set(0, 0.024, 0.04);
  stageSlideGroup.visible = false;

  const mountedSlide = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.01, 0.11),
    createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.5),
  );
  stageSlideGroup.add(mountedSlide);

  const mountedSample = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.004, 0.065),
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.72,
      roughness: 0.4,
    }),
  );
  mountedSample.position.y = 0.007;
  stageSlideGroup.add(mountedSample);

  const stageLiquidDrop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.038, 0.006, 16),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      roughness: 0.12,
    }),
  );
  stageLiquidDrop.position.y = 0.009;
  stageLiquidDrop.visible = false;
  stageSlideGroup.add(stageLiquidDrop);

  const stageCoverslip = new THREE.Mesh(
    new THREE.BoxGeometry(0.082, 0.004, 0.082),
    createGlassMaterial(opts.isSoftwareGl, 0xf8fafc, 0.52),
  );
  stageCoverslip.position.y = 0.014;
  stageCoverslip.visible = false;
  stageSlideGroup.add(stageCoverslip);

  stageGroup.add(stageSlideGroup);
  g.add(stageGroup);

  // 4. Coarse & Fine Focus Knobs (Left and Right coaxial drums)
  const coarseKnob = new THREE.Group();
  coarseKnob.position.set(0, 0.25, -0.27);
  [-0.11, 0.11].forEach((kx) => {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.045, 20), darkMetalMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.x = kx;
    coarseKnob.add(drum);
  });
  g.add(coarseKnob);

  const fineKnob = new THREE.Group();
  fineKnob.position.set(0, 0.25, -0.27);
  [-0.145, 0.145].forEach((kx) => {
    const fineDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.035, 16), chromeMat);
    fineDrum.rotation.z = Math.PI / 2;
    fineDrum.position.x = kx;
    fineKnob.add(fineDrum);
  });
  g.add(fineKnob);

  // 5. Head Assembly + Inclined Monocular Eyepiece Tube
  const headHub = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.14, 20), bodyMat);
  headHub.position.set(0, 0.88, 0.1);
  g.add(headHub);

  const drawTubeGroup = new THREE.Group();
  drawTubeGroup.position.set(0, 0.94, 0.1);
  drawTubeGroup.rotation.x = -0.58; // classic comfortable 33-deg viewing inclination
  const neckTube = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.28, 18), bodyMat);
  neckTube.position.y = 0.13;
  drawTubeGroup.add(neckTube);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.035, 18), chromeMat);
  collar.position.y = 0.27;
  drawTubeGroup.add(collar);

  const eyepieceRim = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.052, 0.08, 20), darkMetalMat);
  eyepieceRim.position.y = 0.32;
  drawTubeGroup.add(eyepieceRim);

  const ocularLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.015, 18),
    createGlassMaterial(opts.isSoftwareGl, 0x38bdf8, 0.45),
  );
  ocularLens.position.y = 0.36;
  drawTubeGroup.add(ocularLens);
  g.add(drawTubeGroup);

  // 6. Revolving 3-Lens Objective Nosepiece Turret (4x Red, 10x Yellow, 40x Blue)
  const turretGroup = new THREE.Group();
  turretGroup.position.set(0, 0.78, 0.12);

  const nosePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 0.045, 22), darkMetalMat);
  turretGroup.add(nosePlate);

  const objectiveSpecs = [
    { angle: 0, length: 0.11, bandColor: 0xef4444 }, // 4x (active forward initially)
    { angle: (Math.PI * 2) / 3, length: 0.14, bandColor: 0xfacc15 }, // 10x
    { angle: (Math.PI * 4) / 3, length: 0.18, bandColor: 0x2563eb }, // 40x high power
  ];

  objectiveSpecs.forEach((spec) => {
    const objWrap = new THREE.Group();
    objWrap.rotation.y = spec.angle;

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.019, spec.length, 14), chromeMat);
    barrel.position.set(0, -0.025 - spec.length / 2, 0.055);
    barrel.rotation.x = 0.12;
    objWrap.add(barrel);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.018, 14),
      new THREE.MeshStandardMaterial({ color: spec.bandColor, roughness: 0.35 }),
    );
    band.position.set(0, -0.045, 0.055);
    band.rotation.x = 0.12;
    objWrap.add(band);

    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 0.024, 12), darkMetalMat);
    tip.position.set(0, -0.025 - spec.length - 0.008, 0.046);
    tip.rotation.x = 0.12;
    objWrap.add(tip);

    turretGroup.add(objWrap);
  });

  g.add(turretGroup);

  const refs: MicroscopeRefs = {
    turretGroup,
    coarseKnob,
    fineKnob,
    stageGroup,
    stageSlideGroup,
    stageLiquidDrop,
    stageCoverslip,
    lampGlowMat,
    lampBeam,
  };
  g.userData.microscopeRefs = refs;
  // Also expose refs for objective_lens & focus_knob clicks on microscope sub-parts
  turretGroup.userData.microscopePart = 'objective_lens';
  coarseKnob.userData.microscopePart = 'focus_knob';
  fineKnob.userData.microscopePart = 'focus_knob';

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}
