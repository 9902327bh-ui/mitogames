import * as THREE from 'three';
import type { PhotosynthesisReading } from '../../utils/photosynthesisRate.ts';
import {
  createGlassMaterial,
  createLeafMaterial,
  enableModelShadows,
  makeCanvasLabelTexture,
  type ModelBuildOptions,
} from './shared.ts';

export function drawRateGraphCanvas(
  canvas: HTMLCanvasElement,
  readings: PhotosynthesisReading[],
): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0b1623';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('LIVE PHOTOSYNTHESIS RATE', 18, 28);

  const latest = readings[readings.length - 1];
  ctx.textAlign = 'right';
  ctx.fillStyle = latest?.limitingFactor.includes('Denatured')
    ? '#f87171'
    : latest?.limitingFactor.includes('Optimum')
      ? '#34d399'
      : '#fbbf24';
  ctx.fillText(
    latest ? `${latest.rate} bub/min` : 'Standby',
    w - 18,
    28,
  );

  // Plot area
  const px = 48;
  const py = 46;
  const pw = w - 68;
  const ph = h - 86;

  ctx.fillStyle = '#0f1f30';
  ctx.fillRect(px, py, pw, ph);

  // Grid lines (0 to 50 bubbles/min)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const gy = py + (ph * g) / 4;
    ctx.beginPath();
    ctx.moveTo(px, gy);
    ctx.lineTo(px + pw, gy);
    ctx.stroke();

    const val = Math.round(45 - (45 * g) / 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(val), px - 6, gy + 4);
  }

  // Axes
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px, py + ph);
  ctx.lineTo(px + pw, py + ph);
  ctx.stroke();

  if (readings.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Place pondweed & switch on lamp to plot readings', px + pw / 2, py + ph / 2);
    return;
  }

  // Polyline across 9 possible steps
  const maxRate = 45;
  const pts = readings.map((r, i) => {
    const x = px + (i / 8) * (pw - 24) + 12;
    const y = py + ph - Math.min(1, r.rate / maxRate) * (ph - 10) - 4;
    return { x, y, r };
  });

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  pts.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  pts.forEach((p) => {
    const isHotDrop = p.r.temp >= 45;
    const isOpt = p.r.label.includes('Optimum');
    ctx.fillStyle = isHotDrop ? '#ef4444' : isOpt ? '#10b981' : '#facc15';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b1623';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(p.r.rate), p.x, p.y - 9);
  });

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Trial Step (Light → CO₂ → Temp → Optimum)', px + pw / 2, h - 14);
}

export function drawConsoleDisplayCanvas(
  canvas: HTMLCanvasElement,
  params: { light: number; co2: number; temp: number; rate: number; limitingFactor: string },
): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#091521';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  ctx.fillStyle = '#7dd3fc';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`RATE: ${params.rate} bubbles/min`, 14, 28);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '14px monospace';
  ctx.fillText(
    `L:${params.light}  CO₂:${params.co2.toFixed(2)}%  T:${params.temp}°C`,
    14,
    54,
  );

  const isWarn = params.limitingFactor.includes('CO₂') || params.limitingFactor.includes('Denatured');
  ctx.fillStyle = isWarn ? '#7f1d1d' : '#064e3b';
  ctx.beginPath();
  ctx.roundRect(12, 68, w - 24, 34, 6);
  ctx.fill();

  ctx.fillStyle = isWarn ? '#fecaca' : '#6ee7b7';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Limiting factor: ${params.limitingFactor}`, w / 2, 90);
}

export function buildPhotosynthesisChamber(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Stainless rim base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.34, 0.06, 24),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.55, roughness: 0.3 }),
  );
  base.position.y = 0.03;
  g.add(base);

  // Glass cylinder tank
  const glassTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.68, 24, 1, true),
    createGlassMaterial(opts, 0xe0f2fe, 0.34),
  );
  glassTank.position.y = 0.4;
  g.add(glassTank);

  // Top rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.29, 0.015, 10, 26),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.2 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.74;
  g.add(rim);

  // Clear water fill
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.32,
    roughness: 0.12,
  });
  const waterBody = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.56, 22), waterMat);
  waterBody.position.y = 0.34;
  g.add(waterBody);
  g.userData.chamberWaterMat = waterMat;

  // Clip-on digital thermometer on right rim
  const thermStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.55, 8),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 }),
  );
  thermStem.position.set(0.22, 0.42, 0.05);
  const thermBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 }),
  );
  thermBulb.position.set(0.22, 0.14, 0.05);
  g.add(thermStem, thermBulb);

  // Submerged Elodea weed (hidden until Step 1 lowers pondweed inside)
  const submergedWeed = new THREE.Group();
  submergedWeed.position.set(0, 0.1, 0);
  submergedWeed.visible = false;

  const weedStemMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.45 });
  const weedLeafMat = createLeafMaterial(opts, 0x22c55e);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.42, 8), weedStemMat);
  stem.position.y = 0.21;
  submergedWeed.add(stem);

  for (let i = 0; i < 12; i++) {
    const ang = i * 1.15;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.032), weedLeafMat);
    leaf.position.set(Math.cos(ang) * 0.055, 0.08 + i * 0.028, Math.sin(ang) * 0.055);
    leaf.rotation.y = -ang;
    leaf.rotation.z = 0.22;
    submergedWeed.add(leaf);
  }

  // Inverted glass funnel cap catching bubbles
  const funnel = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.14, 16, 1, true),
    createGlassMaterial(opts, 0xe0f2fe, 0.42),
  );
  funnel.position.y = 0.48;
  submergedWeed.add(funnel);

  g.add(submergedWeed);
  g.userData.submergedWeed = submergedWeed;
  g.userData.weedLeafMat = weedLeafMat;

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.1),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('CHAMBER', 'ELODEA TANK', '#0284c7', '#f0f9ff'),
    }),
  );
  badge.position.set(0, 0.06, 0.345);
  g.add(badge);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildLampSwitch(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Base + ruler + switch button + articulated arm + bulb + light cone
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.06, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }),
  );
  base.position.y = 0.03;
  g.add(base);

  const switchBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.045, 0.07),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.2 }),
  );
  switchBtn.position.set(0, 0.075, 0.06);
  g.add(switchBtn);
  g.userData.switchBtn = switchBtn;

  // Measurement ruler strip along the front-right base
  const ruler = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.015, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.45 }),
  );
  ruler.position.set(0.35, 0.012, 0.14);
  g.add(ruler);

  // Stand & shade aimed toward the chamber
  const metalMat = opts.materials?.metal(0x94a3b8, 0.7, 0.25) ?? new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.25 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.62, 10), metalMat);
  pole.position.set(-0.04, 0.34, -0.04);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 10), metalMat);
  arm.position.set(0.08, 0.62, -0.02);
  arm.rotation.z = -Math.PI / 3;
  g.add(pole, arm);

  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.18, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, side: THREE.DoubleSide }),
  );
  shade.position.set(0.2, 0.56, 0);
  shade.rotation.z = Math.PI / 2.2;
  g.add(shade);

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfde047,
    emissiveIntensity: 0.15,
    roughness: 0.15,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), bulbMat);
  bulb.position.set(0.24, 0.54, 0);
  g.add(bulb);

  const lightConeMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const lightCone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.95, 16, 1, true), lightConeMat);
  lightCone.position.set(0.65, 0.45, 0);
  lightCone.rotation.z = Math.PI / 2;
  g.add(lightCone);

  g.userData.bulbMat = bulbMat;
  g.userData.lightConeMat = lightConeMat;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildBicarbonateDropper(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Blue glass NaHCO3 dropper bottle
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.095, 0.24, 16),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.22 }),
  );
  body.position.set(-0.04, 0.12, 0);
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.045, 0.06, 12),
    new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.25 }),
  );
  neck.position.set(-0.04, 0.26, 0);
  const bulb = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.032, 0.055, 8, 12),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }),
  );
  bulb.position.set(-0.04, 0.34, 0);
  g.add(body, neck, bulb);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.11),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('NaHCO₃', 'CO₂ SOURCE', '#0369a1', '#f0f9ff'),
    }),
  );
  label.position.set(-0.04, 0.12, 0.096);
  g.add(label);

  // Small dish of white bicarbonate tablets beside the bottle
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.075, 0.025, 16),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 }),
  );
  dish.position.set(0.14, 0.015, 0.05);
  g.add(dish);
  const tabMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
  [-0.02, 0.03].forEach((tx, idx) => {
    const tab = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.015, 12), tabMat);
    tab.position.set(0.14 + tx, 0.035, 0.04 + idx * 0.02);
    g.add(tab);
  });

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildHeaterBlock(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.18, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42 }),
  );
  housing.position.y = 0.09;
  g.add(housing);

  const hotPlateMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xef4444,
    emissiveIntensity: 0.15,
    metalness: 0.45,
    roughness: 0.3,
  });
  const hotPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 20), hotPlateMat);
  hotPlate.position.y = 0.19;
  g.add(hotPlate);
  g.userData.heaterPlateMat = hotPlateMat;

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.11),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('WATER BATH', 'HEATER', '#dc2626', '#fff1f2'),
    }),
  );
  badge.position.set(0, 0.09, 0.153);
  g.add(badge);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildRateGraphBoard(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 300;
  drawRateGraphCanvas(canvas, []);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  // Stand + crisp upright wall monitor screen
  const standFoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.04, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 }),
  );
  standFoot.position.y = 0.02;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.036, 0.45, 12),
    new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 }),
  );
  pole.position.set(0, 0.24, -0.04);

  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.86, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.38 }),
  );
  bezel.position.set(0, 0.72, 0);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.32, 0.76),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  screen.position.set(0, 0.72, 0.033);

  g.add(standFoot, pole, bezel, screen);
  g.userData.graphCanvas = canvas;
  g.userData.graphTex = tex;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}

export function buildControlConsole(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Slanted instrument console chassis
  const baseBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.24, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.2 }),
  );
  baseBox.position.y = 0.12;
  g.add(baseBox);

  const panelDeck = new THREE.Mesh(
    new THREE.BoxGeometry(1.44, 0.06, 0.56),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42 }),
  );
  panelDeck.position.set(0, 0.25, 0.02);
  panelDeck.rotation.x = 0.18;
  g.add(panelDeck);

  // Backplane LCD display showing bubble counter + Limiting factor badge
  const lcdCanvas = document.createElement('canvas');
  lcdCanvas.width = 420;
  lcdCanvas.height = 114;
  drawConsoleDisplayCanvas(lcdCanvas, {
    light: 0,
    co2: 0.04,
    temp: 25,
    rate: 0,
    limitingFactor: 'Light',
  });
  const lcdTex = new THREE.CanvasTexture(lcdCanvas);
  lcdTex.colorSpace = THREE.SRGBColorSpace;

  const lcdBezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.28, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }),
  );
  lcdBezel.position.set(-0.18, 0.44, -0.22);
  const lcdFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 0.24),
    new THREE.MeshBasicMaterial({ map: lcdTex }),
  );
  lcdFace.position.set(-0.18, 0.44, -0.193);
  g.add(lcdBezel, lcdFace);
  g.userData.consoleCanvas = lcdCanvas;
  g.userData.consoleTex = lcdTex;

  // Helper to build rotary dial + pointer + notch buttons
  const makeDialBase = (x: number, title: string, accentHex: string) => {
    const dGroup = new THREE.Group();
    dGroup.position.set(x, 0.29, 0.06);
    dGroup.rotation.x = 0.18;

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.145, 0.035, 22),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 }),
    );
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.078, 0.045, 18),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.25 }),
    );
    knob.position.y = 0.032;

    const pointer = new THREE.Group();
    pointer.position.y = 0.058;
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.012, 0.085),
      new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 0.4 }),
    );
    needle.position.z = -0.028;
    pointer.add(needle);

    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.08),
      new THREE.MeshBasicMaterial({
        map: makeCanvasLabelTexture(title, 'DIAL', accentHex, '#f8fafc'),
      }),
    );
    lbl.position.set(0, 0.018, 0.17);
    lbl.rotation.x = -Math.PI / 3;

    dGroup.add(rim, knob, pointer, lbl);
    g.add(dGroup);
    return { dGroup, pointer };
  };

  // Dial 1: LIGHT (with clickable notches 100, 200, 250)
  const lightDial = makeDialBase(-0.48, 'LIGHT', '#eab308');
  g.userData.lightPointer = lightDial.pointer;

  const makeNotchButton = (
    parent: THREE.Group,
    id: string,
    text: string,
    bx: number,
    bz: number,
    colorHex: number,
  ) => {
    const btnGroup = new THREE.Group();
    btnGroup.position.set(bx, 0.035, bz);
    btnGroup.userData.subTargetId = id;
    btnGroup.userData.subTargetKind = id.startsWith('light') ? 'light_dial' : 'temp_dial';

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.035, 0.032, 14),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.25,
        roughness: 0.3,
      }),
    );
    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.075, 0.042),
      new THREE.MeshBasicMaterial({
        map: makeCanvasLabelTexture(text, '', '#0f172a', '#ffffff'),
      }),
    );
    lbl.rotation.x = -Math.PI / 2;
    lbl.position.y = 0.018;
    btnGroup.add(cap, lbl);
    parent.add(btnGroup);
  };

  makeNotchButton(lightDial.dGroup, 'light_100', '100', -0.11, -0.09, 0xfef08a);
  makeNotchButton(lightDial.dGroup, 'light_200', '200', 0.0, -0.14, 0xfacc15);
  makeNotchButton(lightDial.dGroup, 'light_250', '250', 0.11, -0.09, 0xf97316);

  // Dial 2: CO2
  const co2Dial = makeDialBase(-0.1, 'CO₂ %', '#0284c7');
  g.userData.co2Pointer = co2Dial.pointer;

  // Dial 3: TEMPERATURE (with clickable notches 35°C, 50°C)
  const tempDial = makeDialBase(0.28, 'TEMP °C', '#ef4444');
  g.userData.tempPointer = tempDial.pointer;
  makeNotchButton(tempDial.dGroup, 'temp_35', '35°C', -0.08, -0.12, 0xfb923c);
  makeNotchButton(tempDial.dGroup, 'temp_50', '50°C', 0.09, -0.12, 0xef4444);

  // Green "Optimum" Preset Button on the far right of console
  const optBtnGroup = new THREE.Group();
  optBtnGroup.position.set(0.57, 0.3, 0.07);
  optBtnGroup.rotation.x = 0.18;
  optBtnGroup.userData.subTargetId = 'optimum_btn';
  optBtnGroup.userData.subTargetKind = 'optimum_button';

  const optPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.055, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    }),
  );
  const optFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.11),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabelTexture('OPTIMUM', 'PRESET', '#047857', '#ecfdf5'),
    }),
  );
  optFace.rotation.x = -Math.PI / 2;
  optFace.position.y = 0.03;
  optBtnGroup.add(optPad, optFace);
  g.add(optBtnGroup);
  g.userData.optimumBtnMesh = optPad;

  // Sprout Mascot wearing crisp white Lab Coat + teal Safety Goggles standing right side of console
  const sprout = new THREE.Group();
  sprout.position.set(0.55, 0.28, -0.2);
  const coatMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.38 });
  const goggleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.2 });

  const coatTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.105, 0.18, 14), coatMat);
  coatTorso.position.y = 0.09;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 14), greenMat);
  head.position.y = 0.22;
  // Goggles across eyes
  const goggleStrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.088, 0.025, 16),
    new THREE.MeshStandardMaterial({ color: 0x0f172a }),
  );
  goggleStrap.position.y = 0.23;
  [-0.032, 0.032].forEach((gx) => {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 12), goggleMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(gx, 0.23, 0.08);
    sprout.add(lens);
  });
  const sLeaf = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.075, 6), greenMat);
  sLeaf.position.set(0.02, 0.32, 0);
  sLeaf.rotation.z = -0.35;
  sprout.add(coatTorso, head, goggleStrap, sLeaf);
  g.add(sprout);

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}
