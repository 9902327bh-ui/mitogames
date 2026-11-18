import * as THREE from 'three';
import { enableModelShadows, makeCanvasLabelTexture, type ModelBuildOptions } from './shared.ts';

export function buildHeartModel(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 20), standMat);
  base.position.y = 0.02;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 12), standMat);
  rod.position.y = 0.12;
  g.add(base, rod);

  const heartBody = new THREE.Group();
  heartBody.position.y = 0.42;

  // Blue right atrium/ventricle + Red left atrium/ventricle
  const rightMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.32,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.12,
  });
  const leftMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.32,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.15,
  });

  const rightChamber = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), rightMat);
  rightChamber.scale.set(0.85, 1.28, 0.88);
  rightChamber.position.set(-0.085, -0.02, 0);
  rightChamber.rotation.z = -0.22;
  heartBody.add(rightChamber);

  const leftChamber = new THREE.Mesh(new THREE.SphereGeometry(0.185, 22, 18), leftMat);
  leftChamber.scale.set(0.92, 1.38, 0.92);
  leftChamber.position.set(0.085, -0.04, 0);
  leftChamber.rotation.z = 0.22;
  heartBody.add(leftChamber);

  // Ascending Aorta arch
  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, 0.14, 0),
    new THREE.Vector3(0.05, 0.32, 0),
    new THREE.Vector3(-0.04, 0.34, -0.02),
    new THREE.Vector3(-0.1, 0.2, -0.04),
  ]);
  const aorta = new THREE.Mesh(new THREE.TubeGeometry(aortaCurve, 20, 0.046, 12, false), leftMat);
  heartBody.add(aorta);

  // Pulmonary Trunk
  const pulmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.07, 0.12, 0.04),
    new THREE.Vector3(-0.04, 0.27, 0.04),
    new THREE.Vector3(-0.18, 0.28, 0.02),
  ]);
  const pulmonary = new THREE.Mesh(new THREE.TubeGeometry(pulmCurve, 14, 0.036, 10, false), rightMat);
  heartBody.add(pulmonary);

  // Movable white valve flaps
  const valveMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const valveL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.04), valveMat);
  valveL.position.set(0.08, 0.07, 0.15);
  const valveR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.04), valveMat);
  valveR.position.set(-0.08, 0.07, 0.15);
  heartBody.add(valveL, valveR);

  g.add(heartBody);
  g.userData.heartBody = heartBody;
  g.userData.rightChamber = rightChamber;
  g.userData.leftChamber = leftChamber;
  g.userData.valves = [valveL, valveR];

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildLungModel(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const trachMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
  const lungMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.45,
    emissive: 0xdb2777,
    emissiveIntensity: 0.08,
  });

  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.24, 0.04, 20),
    new THREE.MeshStandardMaterial({ color: 0x1e293b }),
  );
  stand.position.y = 0.02;
  g.add(stand);

  const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.28, 14), trachMat);
  trachea.position.y = 0.56;
  g.add(trachea);

  const lobes: THREE.Mesh[] = [];
  [-1, 1].forEach((side) => {
    const bronchus = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 12), trachMat);
    bronchus.position.set(side * 0.07, 0.43, 0);
    bronchus.rotation.z = side * 0.72;
    g.add(bronchus);

    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 16), lungMat);
    lobe.scale.set(0.85, 1.45, 0.78);
    lobe.position.set(side * 0.165, 0.31, 0);
    lobe.rotation.z = side * -0.14;
    g.add(lobe);
    lobes.push(lobe);
  });

  g.userData.lungLobes = lobes;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildDigestiveModel(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.45 });
  const stomachMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });

  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.22, 0.04, 18),
    new THREE.MeshStandardMaterial({ color: 0x1e293b }),
  );
  stand.position.y = 0.02;
  g.add(stand);

  const esophagus = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.26, 12), tubeMat);
  esophagus.position.set(0, 0.54, 0);
  g.add(esophagus);

  const stomach = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 14), stomachMat);
  stomach.scale.set(1.25, 0.85, 0.75);
  stomach.position.set(0.06, 0.37, 0);
  stomach.rotation.z = -0.35;
  g.add(stomach);

  const intestineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.08, 0.26, 0.02),
    new THREE.Vector3(0.08, 0.21, 0.04),
    new THREE.Vector3(-0.09, 0.16, 0.02),
    new THREE.Vector3(0.08, 0.11, 0.03),
  ]);
  const intestine = new THREE.Mesh(new THREE.TubeGeometry(intestineCurve, 22, 0.032, 10, false), tubeMat);
  g.add(intestine);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildNerveArcModel(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const cordMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.45 });
  const nerveMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.25,
    roughness: 0.3,
  });

  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 18), cordMat);
  cord.position.set(0, 0.32, 0);
  g.add(cord);

  const arcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.26, 0.12, 0),
    new THREE.Vector3(-0.14, 0.28, 0),
    new THREE.Vector3(0, 0.34, 0),
    new THREE.Vector3(0.16, 0.26, 0),
    new THREE.Vector3(0.28, 0.12, 0),
  ]);
  const arc = new THREE.Mesh(new THREE.TubeGeometry(arcCurve, 20, 0.02, 10, false), nerveMat);
  g.add(arc);

  const impulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 1.0 }),
  );
  impulse.position.set(-0.26, 0.12, 0);
  g.add(impulse);

  g.userData.impulseOrb = impulse;
  g.userData.arcCurve = arcCurve;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildPlantVascularModel(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Soil pot + root hairs at base
  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.19, 0.14, 18),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }),
  );
  soil.position.y = 0.07;
  g.add(soil);

  for (let r = 0; r < 6; r++) {
    const a = (r / 6) * Math.PI * 2;
    const rootHair = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.004, 0.15, 8),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 }),
    );
    rootHair.position.set(Math.cos(a) * 0.11, 0.08, Math.sin(a) * 0.11);
    rootHair.rotation.z = Math.cos(a) * 0.7;
    rootHair.rotation.x = Math.sin(a) * 0.7;
    g.add(rootHair);
  }

  // Cutaway stem showing hollow sky-blue Xylem vessel + amber Phloem
  const stemOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.085, 0.44, 16, 1, false, 0, Math.PI * 1.4),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.45, side: THREE.DoubleSide }),
  );
  stemOuter.position.y = 0.34;
  g.add(stemOuter);

  const xylemTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.44, 12),
    new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      roughness: 0.2,
    }),
  );
  xylemTube.position.set(-0.015, 0.34, 0.02);
  g.add(xylemTube);

  const phloemTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.44, 10),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 }),
  );
  phloemTube.position.set(0.025, 0.34, 0.02);
  g.add(phloemTube);

  // Leaf canopy top
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.38 });
  [-1, 0, 1].forEach((idx) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), leafMat);
    leaf.scale.set(1.3, 0.28, 0.85);
    leaf.position.set(idx * 0.11, 0.58 + (idx === 0 ? 0.05 : 0), 0);
    leaf.rotation.z = idx * -0.35;
    g.add(leaf);
  });

  g.userData.xylemTube = xylemTube;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildMitosisModel(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.04, 20),
    new THREE.MeshStandardMaterial({ color: 0x1e293b }),
  );
  stand.position.y = 0.02;
  g.add(stand);

  const cellPivot = new THREE.Group();
  cellPivot.position.y = 0.36;

  // Translucent dividing membrane shell
  const membrane = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 24, 20),
    new THREE.MeshPhysicalMaterial({
      color: 0xddd6fe,
      transparent: true,
      opacity: 0.34,
      roughness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  cellPivot.add(membrane);

  // Centrosomes at opposite poles + cyan spindle fibers
  const centrosomeMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.35 });
  [-0.22, 0.22].forEach((px) => {
    const pole = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), centrosomeMat);
    pole.position.x = px;
    cellPivot.add(pole);
  });

  // 4 X-shaped Chromosomes (each with left & right chromatid halves so they split smoothly in Anaphase!)
  const chromMatL = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.32 });
  const chromMatR = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.32 });
  const chromatids: Array<{ left: THREE.Mesh; right: THREE.Mesh; baseY: number; baseZ: number }> = [];

  [
    { y: 0.08, z: 0.04 },
    { y: -0.08, z: 0.04 },
    { y: 0.04, z: -0.07 },
    { y: -0.04, z: -0.07 },
  ].forEach((pos) => {
    const left = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.06, 4, 8), chromMatL);
    left.position.set(-0.015, pos.y, pos.z);
    left.rotation.z = 0.25;
    const right = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.06, 4, 8), chromMatR);
    right.position.set(0.015, pos.y, pos.z);
    right.rotation.z = -0.25;
    cellPivot.add(left, right);
    chromatids.push({ left, right, baseY: pos.y, baseZ: pos.z });
  });

  g.add(cellPivot);
  g.userData.membrane = membrane;
  g.userData.chromatids = chromatids;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildDnaModel(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.22, 0.04, 18),
    new THREE.MeshStandardMaterial({ color: 0x1e293b }),
  );
  stand.position.y = 0.02;
  g.add(stand);

  const strandAMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
  const strandBMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.3 });
  const rungColors = [0x10b981, 0xf59e0b, 0xef4444, 0x06b6d4];

  for (let i = 0; i < 12; i++) {
    const y = 0.09 + i * 0.045;
    const angle = i * 0.55;
    const x = Math.cos(angle) * 0.11;
    const z = Math.sin(angle) * 0.11;

    const beadA = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), strandAMat);
    beadA.position.set(x, y, z);
    const beadB = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), strandBMat);
    beadB.position.set(-x, y, -z);
    g.add(beadA, beadB);

    const rung = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: rungColors[i % rungColors.length], roughness: 0.4 }),
    );
    rung.position.set(0, y, 0);
    rung.rotation.z = Math.PI / 2;
    rung.rotation.y = -angle;
    g.add(rung);
  }

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildOrganPart(opts: ModelBuildOptions = {}, colorHex = '#ef4444'): THREE.Group {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.16, 0.03, 18),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }),
  );
  pad.position.y = 0.015;
  g.add(pad);

  const organMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.35,
    metalness: 0.05,
  });
  const chamber = new THREE.Mesh(new THREE.TorusKnotGeometry(0.085, 0.028, 48, 8, 2, 3), organMat);
  chamber.position.y = 0.16;
  g.add(chamber);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildLabelMarker(opts: ModelBuildOptions = {}, labelText = 'MARKER'): THREE.Group {
  const g = new THREE.Group();
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x0d7a5f, metalness: 0.4, roughness: 0.3 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.025, 16), pinMat);
  base.position.y = 0.012;
  g.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10), pinMat);
  pole.position.y = 0.13;
  g.add(pole);

  const tex = makeCanvasLabelTexture(labelText.toUpperCase(), 'TAG PIN', '#0d7a5f', '#ecfdf5');
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.11, 0.02),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }),
  );
  flag.position.set(0.08, 0.22, 0);
  g.add(flag);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}
