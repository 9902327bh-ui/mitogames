import * as THREE from 'three';
import {
  createGlassMaterial,
  enableModelShadows,
  makeCanvasLabelTexture,
  type ModelBuildOptions,
} from './shared.ts';

export function buildDropper(opts: ModelBuildOptions = {}, liquidHex = '#38bdf8'): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.44);

  // Small stand cradle so it rests clearly on the bench
  const holder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.08, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }),
  );
  holder.position.y = 0.02;
  g.add(holder);

  const dropperPipette = new THREE.Group();
  dropperPipette.position.y = 0.25;

  const glassTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.012, 0.28, 14), glassMat);
  glassTube.position.y = -0.02;
  dropperPipette.add(glassTube);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.065, 12), glassMat);
  tip.rotation.x = Math.PI;
  tip.position.y = -0.19;
  dropperPipette.add(tip);

  const innerLiq = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.009, 0.16, 12),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(liquidHex), transparent: true, opacity: 0.8 }),
  );
  innerLiq.position.y = -0.05;
  dropperPipette.add(innerLiq);

  // Colored silicone squeeze bulb
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.42,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 12), bulbMat);
  bulb.scale.set(1, 1.45, 1);
  bulb.position.y = 0.16;
  dropperPipette.add(bulb);

  g.add(dropperPipette);
  g.userData.pipetteGroup = dropperPipette;
  g.userData.squeezeBulb = bulb;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildPipette(opts: ModelBuildOptions = {}, liquidHex = '#0ea5e9'): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x0d7a5f, roughness: 0.38 });

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.32, 14), bodyMat);
  barrel.position.y = 0.26;
  g.add(barrel);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.055), gripMat);
  handle.position.y = 0.38;
  g.add(handle);

  const plunger = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.06, 12),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }),
  );
  plunger.position.y = 0.47;
  g.add(plunger);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.014, 0.11, 12),
    createGlassMaterial(opts.isSoftwareGl, new THREE.Color(liquidHex).getHex(), 0.55),
  );
  tip.rotation.x = Math.PI;
  tip.position.y = 0.05;
  g.add(tip);

  g.userData.squeezeBulb = plunger;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildStainBottle(
  opts: ModelBuildOptions = {},
  stainHex = '#d97706',
  labelText = 'STAIN',
): THREE.Group {
  const g = new THREE.Group();
  const col = new THREE.Color(stainHex);
  const isAmber = labelText.toLowerCase().includes('iodine') || col.r > 0.7 && col.g > 0.3;
  const bottleMat = new THREE.MeshPhysicalMaterial({
    color: isAmber ? 0x92400e : col.getHex(),
    roughness: 0.14,
    metalness: 0.05,
    transparent: true,
    opacity: 0.84,
    clearcoat: 0.9,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.115, 0.25, 20), bottleMat);
  body.position.y = 0.125;
  g.add(body);

  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.11, 0.065, 20), bottleMat);
  shoulder.position.y = 0.28;
  g.add(shoulder);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), bottleMat);
  neck.position.y = 0.335;
  g.add(neck);

  // Removable dropper cap + bulb + inner pipette stem
  const dropperAssembly = new THREE.Group();
  dropperAssembly.position.y = 0.36;

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.05, 16),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }),
  );
  dropperAssembly.add(cap);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }),
  );
  bulb.scale.set(1, 1.4, 1);
  bulb.position.y = 0.055;
  dropperAssembly.add(bulb);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.007, 0.18, 10),
    createGlassMaterial(opts.isSoftwareGl, col.getHex(), 0.58),
  );
  stem.position.y = -0.09;
  dropperAssembly.add(stem);

  g.add(dropperAssembly);

  // Crisp bottle label on front curved face
  const tex = makeCanvasLabelTexture(labelText.toUpperCase(), 'BIO REAGENT', stainHex, '#fffbeb');
  const labelArc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.116, 0.116, 0.13, 20, 1, true, -0.85, 1.7),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  labelArc.position.y = 0.13;
  g.add(labelArc);

  g.userData.dropperAssembly = dropperAssembly;
  g.userData.squeezeBulb = bulb;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildReagentBottle(
  opts: ModelBuildOptions = {},
  liquidHex = '#38bdf8',
  labelText = 'SOLUTION',
): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.42);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.135, 0.3, 22), glassMat);
  body.position.y = 0.15;
  g.add(body);

  const liq = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.122, 0.21, 20),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(liquidHex),
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
    }),
  );
  liq.position.y = 0.11;
  g.add(liq);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.11, 0.075, 20), glassMat);
  neck.position.y = 0.335;
  g.add(neck);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.055, 18),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 }),
  );
  cap.position.y = 0.395;
  g.add(cap);

  const tex = makeCanvasLabelTexture(labelText.toUpperCase(), 'LAB SOLUTION', liquidHex, '#ffffff');
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.136, 0.136, 0.15, 20, 1, true, -0.9, 1.8),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  label.position.y = 0.155;
  g.add(label);

  g.userData.liquidMesh = liq;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildForceps(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.18,
  });

  // Twin spring-steel blades angled together at tips
  [-1, 1].forEach((side) => {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.34), steelMat);
    blade.position.set(side * 0.018, 0.03, 0);
    blade.rotation.y = side * -0.08;
    g.add(blade);
  });

  const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.02, 0.04), steelMat);
  hinge.position.set(0, 0.03, -0.16);
  g.add(hinge);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildDissectingNeedle(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x0d7a5f, roughness: 0.45 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.14 });

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 14), handleMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.025, -0.05);
  g.add(handle);

  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.14, 10), steelMat);
  needle.rotation.x = Math.PI / 2;
  needle.position.set(0, 0.025, 0.12);
  g.add(needle);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildLamp(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 20), bodyMat);
  base.position.y = 0.025;
  g.add(base);

  const poleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.05, 0),
    new THREE.Vector3(-0.06, 0.34, 0),
    new THREE.Vector3(0.04, 0.56, 0),
    new THREE.Vector3(0.18, 0.5, 0),
  ]);
  const arm = new THREE.Mesh(new THREE.TubeGeometry(poleCurve, 20, 0.022, 10, false), accentMat);
  g.add(arm);

  const shadeGroup = new THREE.Group();
  shadeGroup.position.set(0.22, 0.46, 0);
  shadeGroup.rotation.z = 0.55;

  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.18, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.5, side: THREE.DoubleSide }),
  );
  shadeGroup.add(shade);

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfacc15,
    emissiveIntensity: 0.35,
    roughness: 0.15,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), bulbMat);
  bulb.position.y = -0.05;
  shadeGroup.add(bulb);

  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lightCone = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.32, 0.65, 20, 1, true), coneMat);
  lightCone.position.y = -0.38;
  shadeGroup.add(lightCone);

  g.add(shadeGroup);
  g.userData.bulbMat = bulbMat;
  g.userData.lightConeMat = coneMat;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildRuler(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#78350f';
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  for (let cm = 0; cm <= 20; cm++) {
    const x = 24 + (cm / 20) * 464;
    const tickH = cm % 5 === 0 ? 44 : 24;
    ctx.lineWidth = cm % 5 === 0 ? 3.5 : 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, tickH);
    ctx.stroke();
    if (cm % 5 === 0) {
      ctx.fillText(`${cm}`, x, 72);
    }
  }
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('CENTIMETERS (cm)', 256, 108);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.024, 0.14),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 }),
  );
  body.position.y = 0.012;
  g.add(body);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildTimerDial(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.17, 0.07, 24),
    new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.32, metalness: 0.15 }),
  );
  housing.rotation.x = Math.PI / 2.6;
  housing.position.y = 0.17;
  g.add(housing);

  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.05, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.4 }),
  );
  stand.position.y = 0.025;
  g.add(stand);

  // Clock dial face canvas
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92);
    ctx.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 24),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  face.rotation.x = -Math.PI / 2 + Math.PI / 2.6;
  face.position.set(0, 0.184, 0.032);
  g.add(face);

  // Rotating second hand
  const handPivot = new THREE.Group();
  handPivot.position.set(0, 0.186, 0.036);
  handPivot.rotation.x = -Math.PI / 2 + Math.PI / 2.6;
  const hand = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.1, 0.008),
    new THREE.MeshStandardMaterial({ color: 0xef4444 }),
  );
  hand.position.y = 0.045;
  handPivot.add(hand);
  g.add(handPivot);

  g.userData.clockHand = handPivot;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildThermometer(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 0.045), bodyMat);
  body.position.y = 0.2;
  g.add(body);

  const tex = makeCanvasLabelTexture('TEMP / MASS', 'LIVE SENSOR', '#ef4444', '#0f172a');
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.11),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  screen.position.set(0, 0.27, 0.024);
  g.add(screen);

  // Mercury / sensor bar that rises smoothly
  const mercury = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.16, 10),
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.3 }),
  );
  mercury.position.set(0, 0.11, 0.025);
  g.add(mercury);

  const probe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.006, 0.24, 10),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 }),
  );
  probe.position.set(0, 0.03, 0);
  g.add(probe);

  g.userData.mercury = mercury;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildPotometer(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.44);

  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.04, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.45 }),
  );
  stand.position.y = 0.02;
  g.add(stand);

  const tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 0.38, 0),
    new THREE.Vector3(-0.2, 0.1, 0),
    new THREE.Vector3(0.22, 0.1, 0),
    new THREE.Vector3(0.22, 0.26, 0),
  ]);
  const capTube = new THREE.Mesh(new THREE.TubeGeometry(tubeCurve, 20, 0.018, 10, false), glassMat);
  g.add(capTube);

  const reservoir = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 16), glassMat);
  reservoir.position.set(0.22, 0.32, 0);
  g.add(reservoir);

  const sprig = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.45 }),
  );
  sprig.position.set(-0.2, 0.46, 0);
  g.add(sprig);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}
