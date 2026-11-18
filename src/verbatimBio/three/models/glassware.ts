import * as THREE from 'three';
import {
  createGlassMaterial,
  enableModelShadows,
  makeCanvasLabelTexture,
  makeGraduationsTexture,
  type ModelBuildOptions,
} from './shared.ts';

export function buildGlassSlide(opts: ModelBuildOptions = {}, tintColor = '#7dd3fc'): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, new THREE.Color(tintColor).getHex(), 0.62);

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.022, 0.18), glassMat);
  slide.position.y = 0.015;
  g.add(slide);

  // Frosted white label end
  const frostMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.62 });
  const frostedEnd = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.024, 0.178), frostMat);
  frostedEnd.position.set(-0.175, 0.016, 0);
  g.add(frostedEnd);

  // Faint circular sample prep ring
  const prepRing = new THREE.Mesh(
    new THREE.RingGeometry(0.04, 0.048, 18),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
  );
  prepRing.rotation.x = -Math.PI / 2;
  prepRing.position.set(0.05, 0.027, 0);
  g.add(prepRing);

  // Subtle drop / smear holder ring at center
  const dropRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.052, 0.006, 18),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.0,
      roughness: 0.1,
    }),
  );
  dropRing.position.set(0.05, 0.028, 0);
  g.add(dropRing);
  g.userData.slideDrop = dropRing;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildCoverslip(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Blue plastic square coverslip box base so the ultra-thin glass square is clearly visible
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.026, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 }),
  );
  tray.position.y = 0.013;
  g.add(tray);

  const innerPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.21, 0.008, 0.21),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 }),
  );
  innerPad.position.y = 0.028;
  g.add(innerPad);

  const glassSlip = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.01, 0.16),
    createGlassMaterial(opts.isSoftwareGl, 0xbae6fd, 0.72),
  );
  glassSlip.position.set(0, 0.038, 0);
  glassSlip.rotation.y = 0.14;
  g.add(glassSlip);

  g.userData.slipMesh = glassSlip;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildSlideTray(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.035, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.45 }),
  );
  base.position.y = 0.018;
  g.add(base);

  for (let i = -1; i <= 1; i++) {
    const slotSlide = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.012, 0.26),
      createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.42),
    );
    slotSlide.position.set(i * 0.16, 0.04, 0);
    g.add(slotSlide);
  }

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildBeaker(opts: ModelBuildOptions = {}, liquidHex = '#bae6fd'): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.34);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.46, 26, 1, true), glassMat);
  body.position.y = 0.23;
  g.add(body);

  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.018, 24), glassMat);
  bottom.position.y = 0.009;
  g.add(bottom);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.224, 0.012, 10, 28),
    glassMat,
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.46;
  g.add(rim);

  // Pour spout lip
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.06, 10), glassMat);
  spout.position.set(0.225, 0.455, 0);
  spout.rotation.z = -Math.PI / 2.2;
  g.add(spout);

  // Graduation markings overlay
  const gradTex = makeGraduationsTexture(250, 'mL');
  const gradCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.218, 0.199, 0.38, 24, 1, true, -0.7, 1.4),
    new THREE.MeshBasicMaterial({ map: gradTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  gradCyl.position.y = 0.22;
  g.add(gradCyl);

  // Inner animated liquid cylinder + meniscus ring
  const liqColor = new THREE.Color(liquidHex);
  const liqMat = new THREE.MeshStandardMaterial({
    color: liqColor,
    transparent: true,
    opacity: 0.58,
    roughness: 0.12,
    metalness: 0.05,
  });
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.186, 0.28, 22), liqMat);
  liquid.position.y = 0.15;
  g.add(liquid);

  const meniscus = new THREE.Mesh(
    new THREE.TorusGeometry(0.192, 0.006, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
  );
  meniscus.rotation.x = Math.PI / 2;
  meniscus.position.y = 0.29;
  g.add(meniscus);

  // Hidden specimen inside beaker (becomes visible when specimen placed in beaker!)
  const submergedSpecimen = new THREE.Group();
  submergedSpecimen.position.set(0, 0.14, 0);
  submergedSpecimen.visible = false;
  g.add(submergedSpecimen);

  g.userData.liquidMesh = liquid;
  g.userData.meniscusMesh = meniscus;
  g.userData.liquidMat = liqMat;
  g.userData.submergedSlot = submergedSpecimen;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildTestTube(opts: ModelBuildOptions = {}, liquidHex = '#38bdf8'): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.38);

  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.095, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0x0d7a5f, roughness: 0.45 }),
  );
  stand.position.y = 0.02;
  g.add(stand);

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.44, 18, 1, true), glassMat);
  tube.position.y = 0.26;
  g.add(tube);

  const baseCap = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glassMat);
  baseCap.position.y = 0.045;
  g.add(baseCap);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.008, 8, 18), glassMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.48;
  g.add(rim);

  const liqMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(liquidHex),
    transparent: true,
    opacity: 0.72,
    roughness: 0.15,
  });
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16), liqMat);
  liq.position.y = 0.17;
  g.add(liq);

  g.userData.liquidMesh = liq;
  g.userData.liquidMat = liqMat;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildTestTubeRack(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55 });

  const bot = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.025, 0.16), woodMat);
  bot.position.y = 0.012;
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.025, 0.16), plateMat);
  top.position.y = 0.24;
  g.add(bot, top);

  [-0.25, 0.25].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.23, 10), woodMat);
    post.position.set(px, 0.125, 0);
    g.add(post);
  });

  const colors = ['#38bdf8', '#22c55e', '#f59e0b'];
  [-0.14, 0, 0.14].forEach((tx, idx) => {
    const miniTube = buildTestTube(opts, colors[idx]);
    miniTube.scale.setScalar(0.74);
    miniTube.position.set(tx, 0.025, 0);
    g.add(miniTube);
  });

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildConicalFlask(opts: ModelBuildOptions = {}, liquidHex = '#fde047'): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.36);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.22, 0.34, 24, 1, true), glassMat);
  body.position.y = 0.18;
  g.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 20, 1, true), glassMat);
  neck.position.y = 0.42;
  g.add(neck);

  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.015, 24), glassMat);
  bottom.position.y = 0.008;
  g.add(bottom);

  const liqMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(liquidHex),
    transparent: true,
    opacity: 0.7,
    roughness: 0.15,
  });
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.205, 0.18, 22), liqMat);
  liq.position.y = 0.1;
  g.add(liq);

  g.userData.liquidMesh = liq;
  g.userData.liquidMat = liqMat;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildMeasuringCylinder(opts: ModelBuildOptions = {}, liquidHex = '#38bdf8'): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.34);

  const hexBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.14, 0.03, 6),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 }),
  );
  hexBase.position.y = 0.015;
  g.add(hexBase);

  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.56, 20, 1, true), glassMat);
  cyl.position.y = 0.31;
  g.add(cyl);

  const gradTex = makeGraduationsTexture(100, 'mL');
  const marks = new THREE.Mesh(
    new THREE.CylinderGeometry(0.069, 0.069, 0.46, 16, 1, true, -0.7, 1.4),
    new THREE.MeshBasicMaterial({ map: gradTex, transparent: true, side: THREE.DoubleSide }),
  );
  marks.position.y = 0.3;
  g.add(marks);

  const liq = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(liquidHex), transparent: true, opacity: 0.65 }),
  );
  liq.position.y = 0.2;
  g.add(liq);

  g.userData.liquidMesh = liq;
  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildPetriDish(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.44);

  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.055, 24), glassMat);
  dish.position.y = 0.028;
  g.add(dish);

  const agar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.025, 22),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, transparent: true, opacity: 0.78, roughness: 0.25 }),
  );
  agar.position.y = 0.025;
  g.add(agar);

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.025, 24), glassMat);
  lid.position.set(0.08, 0.068, 0);
  lid.rotation.z = -0.15;
  g.add(lid);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildWatchGlass(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.5);

  const saucer = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28),
    glassMat,
  );
  saucer.position.y = 0.16;
  g.add(saucer);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildWaterBath(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.28,
    metalness: 0.65,
  });

  // Insulated outer housing
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.3, 0.54), metalMat);
  tank.position.y = 0.15;
  g.add(tank);

  // Dark inner bath cavity + shimmering warm water
  const cavity = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.24, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }),
  );
  cavity.position.y = 0.19;
  g.add(cavity);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.68,
    roughness: 0.1,
  });
  const water = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.4), waterMat);
  water.position.y = 0.21;
  g.add(water);

  // Front control panel with temperature canvas readout + knob
  const dispTex = makeCanvasLabelTexture('37°C / 78°C', 'WATER BATH', '#ea580c', '#0f172a');
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.11),
    new THREE.MeshBasicMaterial({ map: dispTex }),
  );
  display.position.set(-0.08, 0.14, 0.272);
  g.add(display);

  const dial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.03, 16),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 }),
  );
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.18, 0.14, 0.278);
  g.add(dial);

  g.userData.waterMat = waterMat;
  g.userData.dial = dial;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildFlaskBalloon(opts: ModelBuildOptions = {}, balloonHex = '#f97316'): THREE.Group {
  const g = new THREE.Group();
  const glassMat = createGlassMaterial(opts.isSoftwareGl, 0xe0f2fe, 0.36);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.23, 0.34, 24, 1, true), glassMat);
  body.position.y = 0.18;
  g.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.13, 20, 1, true), glassMat);
  neck.position.y = 0.415;
  g.add(neck);

  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.015, 24), glassMat);
  bottom.position.y = 0.008;
  g.add(bottom);

  // Yeast + glucose mixture inside
  const liqMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.78,
    roughness: 0.25,
  });
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.21, 0.17, 22), liqMat);
  liq.position.y = 0.095;
  g.add(liq);

  // Yeast foam layer
  const foam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.145, 0.025, 20),
    new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.85 }),
  );
  foam.position.y = 0.185;
  foam.visible = false;
  g.add(foam);

  // Inflatable rubber balloon stretched over flask neck
  const balloonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(balloonHex),
    roughness: 0.32,
    metalness: 0.05,
  });
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.082, 0.05, 20), balloonMat);
  cuff.position.y = 0.47;
  g.add(cuff);

  // Balloon dome starts limp/small and inflates smoothly during yeast fermentation
  const balloonDome = new THREE.Group();
  balloonDome.position.set(0, 0.495, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), balloonMat);
  bulb.position.y = 0.16;
  bulb.scale.set(0.55, 0.25, 0.45); // starts deflated/limp!
  balloonDome.add(bulb);
  g.add(balloonDome);

  g.userData.liquidMesh = liq;
  g.userData.foamMesh = foam;
  g.userData.balloonBulb = bulb;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}
