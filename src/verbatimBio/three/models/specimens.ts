import * as THREE from 'three';
import { createLeafMaterial, enableModelShadows, makeCanvasLabelTexture, type ModelBuildOptions } from './shared.ts';

export function buildOnionBulb(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const tray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.025, 22),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
  );
  tray.position.y = 0.012;
  g.add(tray);

  // Layered papery purple-amber onion bulb half
  const bulbMat = opts.materials?.waxy(0xb45309, 0.42) ?? new THREE.MeshPhysicalMaterial({ color: 0xb45309, roughness: 0.42, clearcoat: 0.4 });
  const bulb = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0, -0.13),
      new THREE.Vector2(0.065, -0.125),
      new THREE.Vector2(0.125, -0.085),
      new THREE.Vector2(0.15, -0.025),
      new THREE.Vector2(0.14, 0.055),
      new THREE.Vector2(0.1, 0.105),
      new THREE.Vector2(0.045, 0.137),
      new THREE.Vector2(0, 0.145),
    ], 32),
    bulbMat,
  );
  bulb.scale.set(1, 0.92, 0.85);
  bulb.position.set(-0.03, 0.13, 0);
  g.add(bulb);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 12), bulbMat);
  tip.position.set(-0.03, 0.27, 0);
  g.add(tip);

  // Translucent peeled epidermis layer resting beside bulb
  const peelShape = new THREE.Shape();
  peelShape.moveTo(-0.07, 0);
  peelShape.quadraticCurveTo(-0.04, 0.07, 0.015, 0.08);
  peelShape.quadraticCurveTo(0.08, 0.045, 0.07, -0.01);
  peelShape.quadraticCurveTo(0, -0.055, -0.07, 0);
  const peelGeom = new THREE.ExtrudeGeometry(peelShape, {
    depth: 0.005,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  const peel = new THREE.Mesh(
    peelGeom,
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.82,
      roughness: 0.3,
    }),
  );
  peel.position.set(0.11, 0.03, 0.04);
  peel.rotation.z = 0.1;
  g.add(peel);

  g.userData.peelSheet = peel;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildLeafSample(opts: ModelBuildOptions = {}, colorHex = '#22c55e'): THREE.Group {
  const g = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.15, 0.08, 0.22, 0.24, 0, 0.44);
  shape.bezierCurveTo(-0.22, 0.24, -0.15, 0.08, 0, 0);

  const leafGeom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  leafGeom.center();

  const leafMat = createLeafMaterial(opts, new THREE.Color(colorHex));
  const blade = new THREE.Mesh(leafGeom, leafMat);
  blade.rotation.x = -Math.PI / 2 + 0.18;
  blade.position.y = 0.055;
  g.add(blade);

  // Midrib and petiole stem
  const veinMat = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.45 });
  const midrib = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.01, 0.48, 8), veinMat);
  midrib.rotation.x = Math.PI / 2 - 0.18;
  midrib.position.set(0, 0.055, 0.04);
  g.add(midrib);

  // Fine diagonal veins make the specimen read as a leaf at game-camera distance.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const y = 0.025 + i * 0.045;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.055, y),
        new THREE.Vector3(side * 0.075, 0.057, y + 0.035),
        new THREE.Vector3(side * (0.13 - i * 0.01), 0.055, y + 0.07),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.0022, 5, false), veinMat));
    }
  }

  g.userData.leafMat = leafMat;
  g.userData.veinMat = veinMat;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildPlantSprig(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
  const leafMat = createLeafMaterial(opts, 0x22c55e);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.42, 10), stemMat);
  stem.position.y = 0.21;
  g.add(stem);

  // Whorls of Elodea pondweed leaves along the stem
  for (let tier = 0; tier < 6; tier++) {
    const y = 0.08 + tier * 0.058;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + tier * 0.45;
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.032, 0.095), leafMat);
      leaf.position.set(Math.cos(a) * 0.042, y, Math.sin(a) * 0.042);
      leaf.rotation.y = -a;
      leaf.rotation.x = 0.72;
      g.add(leaf);
    }
  }

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildPotatoStrip(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.025, 20),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
  );
  dish.position.y = 0.012;
  g.add(dish);

  const fleshMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.55 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 });

  const strips: THREE.Group[] = [];
  [-0.06, 0.06].forEach((offset) => {
    const strip = new THREE.Group();
    strip.position.set(offset, 0.045, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.045, 0.28), fleshMat);
    strip.add(bar);
    const skinCap = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.048, 0.025), skinMat);
    skinCap.position.z = -0.14;
    strip.add(skinCap);
    g.add(strip);
    strips.push(strip);
  });

  g.userData.potatoStrips = strips;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildSeeds(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.18, 0.025, 20),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 }),
  );
  dish.position.y = 0.012;
  g.add(dish);

  const seedMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });
  [
    [-0.06, -0.04],
    [0.05, -0.05],
    [0, 0.05],
    [-0.07, 0.06],
    [0.07, 0.04],
  ].forEach(([sx, sz], idx) => {
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), seedMat);
    seed.scale.set(1.25, 0.75, 0.9);
    seed.position.set(sx, 0.042, sz);
    seed.rotation.y = idx * 0.9;
    g.add(seed);
  });

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildBeanSprout(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const cottonMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 20), cottonMat);
  pad.position.y = 0.015;
  g.add(pad);

  const rootCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, 0),
    new THREE.Vector3(0.04, 0.02, 0.04),
    new THREE.Vector3(0.09, 0.018, 0.09),
  ]);
  const root = new THREE.Mesh(
    new THREE.TubeGeometry(rootCurve, 12, 0.01, 8, false),
    new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.6 }),
  );
  g.add(root);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.016, 0.22, 10),
    new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.4 }),
  );
  stem.position.y = 0.14;
  g.add(stem);

  [-1, 1].forEach((side) => {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 }),
    );
    leaf.scale.set(1.3, 0.22, 0.8);
    leaf.position.set(side * 0.055, 0.25, 0);
    leaf.rotation.z = side * -0.35;
    g.add(leaf);
  });

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildYeastSachet(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const tex = makeCanvasLabelTexture('ACTIVE YEAST', 'S. cerevisiae', '#d97706', '#fef3c7');
  const packet = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.035, 0.3),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }),
  );
  packet.position.y = 0.02;
  g.add(packet);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildSpecimenSample(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const preset = opts.specimenPreset ?? 'onion_peel';

  if (preset === 'leaf_stomata') {
    return buildLeafSample(opts, '#22c55e');
  }
  if (preset === 'onion_peel') {
    return buildOnionBulb(opts);
  }

  // Petri carrier dish with macroscopic biological sample swatch (never microscopic organelles!)
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.19, 0.028, 22),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 }),
  );
  dish.position.y = 0.014;
  g.add(dish);

  const sampleColor =
    preset === 'cheek_cells'
      ? 0xfbcfe8
      : preset === 'blood_smear'
        ? 0xfca5a5
        : preset === 'pond_microbes' || preset === 'paramecium'
          ? 0x6ee7b7
          : 0xfde68a;

  const sampleSwatch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.12, 0.012, 18),
    new THREE.MeshStandardMaterial({
      color: sampleColor,
      transparent: true,
      opacity: 0.85,
      roughness: 0.3,
    }),
  );
  sampleSwatch.position.y = 0.032;
  g.add(sampleSwatch);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}
