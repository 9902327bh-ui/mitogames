import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function smoothstep01(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

export function detectSoftwareWebGL(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    return /SwiftShader|llvmpipe|Software|Mesa/i.test(rendererName);
  } catch {
    return false;
  }
}

export function makeWoodWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6b4228';
  ctx.fillRect(0, 0, 512, 512);

  const plankCount = 6;
  const plankH = 512 / plankCount;
  const plankTones = ['#6b4228', '#75492c', '#5e3921', '#70462b', '#663e25', '#784c2e'];
  for (let p = 0; p < plankCount; p++) {
    const y0 = p * plankH;
    ctx.fillStyle = plankTones[p % plankTones.length];
    ctx.fillRect(0, y0, 512, plankH);

    for (let g = 0; g < 28; g++) {
      const gy = y0 + ((g * 3.1 + p * 7) % (plankH - 4)) + 2;
      ctx.strokeStyle = g % 3 === 0 ? 'rgba(38, 20, 10, 0.22)' : 'rgba(168, 114, 72, 0.14)';
      ctx.lineWidth = g % 4 === 0 ? 1.8 : 1.0;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(
        160,
        gy + Math.sin(g + p) * 3,
        340,
        gy - Math.cos(g + p) * 3,
        512,
        gy
      );
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(34, 18, 9, 0.55)';
    ctx.fillRect(0, y0 + plankH - 3, 512, 3);
  }

  ctx.fillStyle = 'rgba(34, 18, 9, 0.42)';
  for (let p = 0; p < plankCount; p++) {
    const jx = ((p * 193 + 96) % 440) + 36;
    ctx.fillRect(jx, p * plankH, 2.5, plankH);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

export function makeWoodFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4e3322';
  ctx.fillRect(0, 0, 512, 512);
  for (let p = 0; p < 8; p++) {
    const y0 = p * 64;
    ctx.fillStyle = p % 2 === 0 ? '#543725' : '#492f1f';
    ctx.fillRect(0, y0, 512, 62);
    ctx.fillStyle = 'rgba(26, 15, 8, 0.5)';
    ctx.fillRect(0, y0 + 62, 512, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

export function makeEpoxyBenchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#383c42';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 65; i++) {
    const cx = (i * 197 + 43) % 512;
    const cy = (i * 271 + 89) % 512;
    const rad = 36 + (i % 5) * 18;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
    const light = i % 2 === 0;
    grad.addColorStop(0, light ? 'rgba(130, 138, 148, 0.16)' : 'rgba(28, 30, 34, 0.22)');
    grad.addColorStop(1, 'rgba(56, 60, 66, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 2200; i++) {
    const x = (i * 173 + 29) % 512;
    const y = (i * 311 + 61) % 512;
    const r = i % 4 === 0 ? 1.4 : 0.85;
    ctx.fillStyle =
      i % 5 === 0 ? 'rgba(185, 192, 202, 0.14)' : 'rgba(20, 22, 26, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

export function makeSafetyPosterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(10, 10, 236, 236);

  ctx.fillStyle = '#0f172a';
  ctx.save();
  ctx.translate(78, 62);
  ctx.rotate(-0.45);
  ctx.fillRect(-10, -28, 20, 56);
  ctx.restore();

  ctx.save();
  ctx.translate(178, 62);
  ctx.rotate(0.45);
  ctx.fillRect(-10, -28, 20, 56);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(82, 118, 6, 0, Math.PI * 2);
  ctx.arc(174, 118, 6, 0, Math.PI * 2);
  ctx.arc(174, 140, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillRect(42, 165, 68, 24);
  ctx.fillRect(142, 165, 76, 24);

  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SAFETY FIRST', 128, 226);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeSharpsBinLabelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 246);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(16, 16, 224, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHEMICAL WASTE', 128, 48);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 145, 42, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(128, 145, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('HANDLE WITH GLOVES', 128, 225);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeVesselLabelTexture(
  name: string,
  subLabel: string,
  borderColor = '#0ea5e9',
  subColor = '#0369a1'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  drawVesselLabelCanvas(ctx, name, subLabel, borderColor, subColor);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function drawVesselLabelCanvas(
  ctx: CanvasRenderingContext2D,
  name: string,
  subLabel: string,
  borderColor = '#0ea5e9',
  subColor = '#0369a1'
) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 182);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  const cleanName = name.length > 18 ? `${name.slice(0, 17)}…` : name;
  ctx.fillText(cleanName, 256, 82);

  ctx.fillStyle = subColor;
  ctx.font = 'bold 36px monospace';
  const cleanSub = subLabel.length > 18 ? `${subLabel.slice(0, 17)}…` : subLabel;
  ctx.fillText(cleanSub || 'Mix', 256, 146);
}

export function makeMeterScreenTexture(line1: string, line2: string, line3: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  drawMeterLines(ctx, line1, line2, line3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawMeterLines(
  ctx: CanvasRenderingContext2D,
  line1: string,
  line2: string,
  line3: string
) {
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 256, 192);
  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(line1, 18, 54);
  ctx.fillText(line2, 18, 108);
  ctx.fillText(line3, 18, 162);
}

export function makeForgedSteelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#737c88';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 420; i++) {
    const x = (i * 137 + 19) % 256;
    const y = (i * 223 + 37) % 256;
    const rx = 2 + (i % 6);
    const ry = 1.5 + (i % 4);
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(30, 36, 44, 0.36)'
        : i % 2 === 0
          ? 'rgba(180, 190, 204, 0.25)'
          : 'rgba(84, 92, 102, 0.32)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (i % 7) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(35, 42, 50, 0.25)';
  ctx.lineWidth = 1;
  for (let p = 0; p < 256; p += 16) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createIronNailGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.025, 0.075),
    new THREE.Vector2(0.03, 0.34),
    new THREE.Vector2(0.034, 0.59),
    new THREE.Vector2(0.044, 0.61),
    new THREE.Vector2(0.088, 0.642),
    new THREE.Vector2(0.09, 0.668),
    new THREE.Vector2(0.084, 0.676),
    new THREE.Vector2(0.0, 0.676),
  ];
  return new THREE.LatheGeometry(pts, 28);
}

export function createLabGlassMaterial(isSoftwareGl: boolean): THREE.Material {
  if (isSoftwareGl) {
    return new THREE.MeshStandardMaterial({
      color: '#cfe9ff',
      transparent: true,
      opacity: 0.44,
      roughness: 0.08,
      metalness: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: '#dff2ff',
    roughness: 0.05,
    metalness: 0.04,
    transmission: 0.78,
    ior: 1.52,
    thickness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    specularIntensity: 1.0,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export interface LabRoomOptions {
  includeHotPlate?: boolean;
  initialMeterLines?: [string, string, string];
  meterPosition?: [number, number, number];
}

export interface LabRoomHandle {
  trackTex: <T extends THREE.Texture>(t: T) => T;
  createdTextures: THREE.Texture[];
  gbHit: THREE.Mesh;
  gloveBoxGroup: THREE.Group;
  peekingGloveGroup: THREE.Group;
  gloveBoxPos: THREE.Vector3;
  meterGroup: THREE.Group;
  updateMeterLines: (line1: string, line2: string, line3: string) => void;
  hotPlatePos: THREE.Vector3;
  hotPlateLight: THREE.PointLight;
  heatingCoilMat: THREE.MeshStandardMaterial;
}

export function buildLabRoom(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  options: LabRoomOptions = {}
): LabRoomHandle {
  const {
    includeHotPlate = true,
    initialMeterLines = ['pH   7.0', 'TEMP 22.0C', 'MASS 0g'],
    meterPosition = [-1.32, 0.14, -0.85],
  } = options;

  scene.background = new THREE.Color('#2d1c12');

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  roomEnv.dispose();
  pmrem.dispose();

  const hemiLight = new THREE.HemisphereLight('#fff7ed', '#432818', 0.92);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight('#fffbeb', 1.55);
  keyLight.position.set(-2.5, 6.2, 4.5);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -5.5;
    keyLight.shadow.camera.right = 5.5;
    keyLight.shadow.camera.top = 4.5;
    keyLight.shadow.camera.bottom = -4.5;
    keyLight.shadow.bias = -0.0005;
  }
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight('#bae6fd', 0.6);
  fillLight.position.set(4, 3.8, 3.5);
  scene.add(fillLight);

  const createdTextures: THREE.Texture[] = [];
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    createdTextures.push(t);
    return t;
  };

  // --- WALLS & OAK FLOOR ---
  const wallTex = trackTex(makeWoodWallTexture());
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.78,
    metalness: 0.04,
  });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8.5), wallMat);
  backWall.position.set(0, 2.15, -2.1);
  backWall.receiveShadow = !isSoftwareGl;
  scene.add(backWall);

  const wallTrim = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.16, 0.08),
    new THREE.MeshStandardMaterial({ color: '#3b2314', roughness: 0.65 })
  );
  wallTrim.position.set(0, 0.42, -2.06);
  scene.add(wallTrim);

  const floorTex = trackTex(makeWoodFloorTexture());
  const labFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 14),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8, metalness: 0.04 })
  );
  labFloor.rotation.x = -Math.PI / 2;
  labFloor.position.set(0, -2.02, 1.5);
  labFloor.receiveShadow = !isSoftwareGl;
  scene.add(labFloor);

  const seamMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 8.5, 0.08),
    new THREE.MeshStandardMaterial({ color: '#3b2314', roughness: 0.68 })
  );
  seamMesh.position.set(3.45, 2.15, -2.06);
  scene.add(seamMesh);

  // --- EPOXY LAB BENCH & WHITE/GRAY CABINETRY ---
  const labTableGroup = new THREE.Group();
  const benchTex = trackTex(makeEpoxyBenchTexture());
  const benchMat = new THREE.MeshStandardMaterial({
    map: benchTex,
    roughness: 0.42,
    metalness: 0.12,
  });
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.18, 3.1), benchMat);
  benchTop.position.set(0, -0.09, -0.2);
  benchTop.castShadow = !isSoftwareGl;
  benchTop.receiveShadow = !isSoftwareGl;
  labTableGroup.add(benchTop);

  const cabinetMat = new THREE.MeshStandardMaterial({
    color: '#e5e7eb',
    roughness: 0.56,
    metalness: 0.04,
  });
  const cabinetSeamMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.7,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#2d3136',
    roughness: 0.72,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: '#9ca3af',
    metalness: 0.85,
    roughness: 0.24,
  });

  const addHorizontalHandle = (x: number, y: number, z: number) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.028, 0.03), handleMat);
    bar.position.set(x, y, z + 0.045);
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.045), handleMat);
    postL.position.set(x - 0.145, y, z + 0.022);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.045), handleMat);
    postR.position.set(x + 0.145, y, z + 0.022);
    labTableGroup.add(bar, postL, postR);
  };

  const addVerticalHandle = (x: number, y: number, z: number) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.28, 0.03), handleMat);
    bar.position.set(x, y, z + 0.045);
    const postT = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.045), handleMat);
    postT.position.set(x, y + 0.125, z + 0.022);
    const postB = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.045), handleMat);
    postB.position.set(x, y - 0.125, z + 0.022);
    labTableGroup.add(bar, postT, postB);
  };

  const upperCabinetCore = new THREE.Mesh(new THREE.BoxGeometry(7.24, 0.4, 2.75), cabinetMat);
  upperCabinetCore.position.set(0, -0.38, -0.18);
  labTableGroup.add(upperCabinetCore);

  [
    { x: -2.6, w: 1.94 },
    { x: 0.0, w: 3.16 },
    { x: 2.6, w: 1.94 },
  ].forEach((d) => {
    const face = new THREE.Mesh(new THREE.BoxGeometry(d.w, 0.34, 0.04), cabinetMat);
    face.position.set(d.x, -0.38, 1.2);
    labTableGroup.add(face);
    addHorizontalHandle(d.x, -0.38, 1.22);
  });

  [-1.605, 1.605].forEach((sx) => {
    const vSeam = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.36, 0.045), cabinetSeamMat);
    vSeam.position.set(sx, -0.38, 1.2);
    labTableGroup.add(vSeam);
  });
  const drawerBottomSeam = new THREE.Mesh(new THREE.BoxGeometry(7.26, 0.018, 0.045), cabinetSeamMat);
  drawerBottomSeam.position.set(0, -0.56, 1.2);
  labTableGroup.add(drawerBottomSeam);

  [-2.6, 2.6].forEach((sideX, idx) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.98, 1.33, 2.75), cabinetMat);
    box.position.set(sideX, -1.235, -0.18);
    box.castShadow = !isSoftwareGl;
    box.receiveShadow = !isSoftwareGl;
    labTableGroup.add(box);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.92, 1.27, 0.04), cabinetMat);
    door.position.set(sideX, -1.235, 1.2);
    labTableGroup.add(door);

    const handleX = idx === 0 ? sideX + 0.68 : sideX - 0.68;
    addVerticalHandle(handleX, -1.24, 1.22);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.12, 2.68), plinthMat);
    plinth.position.set(sideX, -1.96, -0.2);
    labTableGroup.add(plinth);
  });

  const centerRecessBack = new THREE.Mesh(new THREE.BoxGeometry(3.22, 1.33, 2.02), cabinetMat);
  centerRecessBack.position.set(0, -1.235, -0.55);
  centerRecessBack.receiveShadow = !isSoftwareGl;
  labTableGroup.add(centerRecessBack);

  [-1.185, -0.395, 0.395, 1.185].forEach((dx, dIdx) => {
    const cDoor = new THREE.Mesh(new THREE.BoxGeometry(0.77, 1.26, 0.04), cabinetMat);
    cDoor.position.set(dx, -1.235, 0.47);
    labTableGroup.add(cDoor);
    const handleOffset = dIdx % 2 === 0 ? 0.24 : -0.24;
    addVerticalHandle(dx + handleOffset, -1.08, 0.49);
  });

  [-0.79, 0.0, 0.79].forEach((sx) => {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.014, 1.28, 0.045), cabinetSeamMat);
    seam.position.set(sx, -1.235, 0.475);
    labTableGroup.add(seam);
  });

  const centerPlinth = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.12, 1.98), plinthMat);
  centerPlinth.position.set(0, -1.96, -0.56);
  labTableGroup.add(centerPlinth);

  scene.add(labTableGroup);

  // --- SAFETY POSTER & WALL MICROPIPETTE ---
  const posterTex = trackTex(makeSafetyPosterTexture());
  const posterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.55 })
  );
  posterMesh.position.set(-1.55, 2.25, -2.07);
  scene.add(posterMesh);

  const pipetteHolder = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.72, 0.08),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 })
  );
  pipetteHolder.position.set(0.7, 2.22, -2.05);
  scene.add(pipetteHolder);

  const pipetteGroup = new THREE.Group();
  const pipBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.032, 0.52, 16),
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.35 })
  );
  const pipPlunger = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.14, 16),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4 })
  );
  pipPlunger.position.y = 0.32;
  const pipTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.025, 0.24, 14),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 })
  );
  pipTip.rotation.x = Math.PI;
  pipTip.position.y = -0.36;
  pipetteGroup.add(pipBody, pipPlunger, pipTip);
  pipetteGroup.position.set(0.7, 2.2, -1.96);
  scene.add(pipetteGroup);

  // --- HOT PLATE & RING STAND (OPTIONAL FOR REACTION LAB) ---
  const hotPlatePos = new THREE.Vector3(-2.45, 0, -0.35);
  const hotPlateLight = new THREE.PointLight('#fb923c', 0, 3.5);
  hotPlateLight.position.set(-2.45, 0.6, -0.35);
  const heatingCoilMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    emissive: new THREE.Color('#f97316'),
    emissiveIntensity: 0,
    roughness: 0.4,
  });

  if (includeHotPlate) {
    scene.add(hotPlateLight);
    const hotPlateGroup = new THREE.Group();
    hotPlateGroup.position.copy(hotPlatePos);

    const hpBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.18, 0.95),
      new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.35, metalness: 0.15 })
    );
    hpBase.position.y = 0.09;
    hpBase.castShadow = !isSoftwareGl;
    hpBase.receiveShadow = !isSoftwareGl;
    hotPlateGroup.add(hpBase);

    const hpFrontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.09, 0.04),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 })
    );
    hpFrontPanel.position.set(0, 0.08, 0.47);
    hotPlateGroup.add(hpFrontPanel);

    const hpKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.3 })
    );
    hpKnob.rotation.x = Math.PI / 2;
    hpKnob.position.set(-0.22, 0.08, 0.49);
    hotPlateGroup.add(hpKnob);

    const hpTopDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.44, 0.05, 32),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.35, metalness: 0.45 })
    );
    hpTopDisk.position.y = 0.205;
    hpTopDisk.receiveShadow = !isSoftwareGl;
    hotPlateGroup.add(hpTopDisk);

    const heatingCoil = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.025, 12, 32),
      heatingCoilMat
    );
    heatingCoil.rotation.x = Math.PI / 2;
    heatingCoil.position.y = 0.232;
    hotPlateGroup.add(heatingCoil);

    const standMetalMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.85,
      roughness: 0.22,
    });
    const standRod = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.05, 16), standMetalMat);
    standRod.position.set(-0.18, 1.15, -0.35);
    standRod.castShadow = !isSoftwareGl;
    hotPlateGroup.add(standRod);

    const clampArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.42), standMetalMat);
    clampArm.position.set(-0.08, 1.38, -0.15);
    hotPlateGroup.add(clampArm);
    scene.add(hotPlateGroup);
  }

  // --- BENCH DIGITAL TELEMETRY STAND ---
  const meterTex = trackTex(
    makeMeterScreenTexture(initialMeterLines[0], initialMeterLines[1], initialMeterLines[2])
  );
  const meterScreenMat = new THREE.MeshBasicMaterial({ map: meterTex });
  const meterGroup = new THREE.Group();
  meterGroup.position.set(meterPosition[0], meterPosition[1], meterPosition[2]);
  meterGroup.rotation.x = -0.35;
  const meterBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.54, 0.16),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 })
  );
  const meterScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.4), meterScreenMat);
  meterScreen.position.z = 0.085;
  meterGroup.add(meterBody, meterScreen);
  scene.add(meterGroup);

  const updateMeterLines = (line1: string, line2: string, line3: string) => {
    const img = meterTex.image as HTMLCanvasElement | undefined;
    const ctx = img?.getContext('2d');
    if (ctx) {
      drawMeterLines(ctx, line1, line2, line3);
      meterTex.needsUpdate = true;
    }
  };

  // --- RED BIOHAZARD / SHARPS BIN (BACK RIGHT) ---
  const binGroup = new THREE.Group();
  binGroup.position.set(2.58, 0, -0.92);
  const binBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 1.05, 0.72),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.42 })
  );
  binBody.position.y = 0.525;
  binBody.castShadow = !isSoftwareGl;
  binGroup.add(binBody);

  const binLid = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.14, 0.78),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 })
  );
  binLid.position.y = 1.1;
  binGroup.add(binLid);

  const binLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.64),
    new THREE.MeshBasicMaterial({ map: trackTex(makeSharpsBinLabelTexture()) })
  );
  binLabel.position.set(0, 0.56, 0.365);
  binGroup.add(binLabel);
  scene.add(binGroup);

  // --- MINT-GREEN GLOVE BOX (FRONT RIGHT) ---
  const gloveBoxPos = new THREE.Vector3(2.42, 0, 0.88);
  const gloveBoxGroup = new THREE.Group();
  gloveBoxGroup.position.copy(gloveBoxPos);
  gloveBoxGroup.rotation.y = -0.22;

  const gbMat = new THREE.MeshStandardMaterial({ color: '#34d399', roughness: 0.45 });
  const gbBox = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.36, 0.56), gbMat);
  gbBox.position.y = 0.18;
  gbBox.castShadow = !isSoftwareGl;
  gbBox.receiveShadow = !isSoftwareGl;
  gloveBoxGroup.add(gbBox);

  const gbSlot = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.22),
    new THREE.MeshBasicMaterial({ color: '#064e3b' })
  );
  gbSlot.rotation.x = -Math.PI / 2;
  gbSlot.position.y = 0.362;
  gloveBoxGroup.add(gbSlot);

  const peekingGloveGroup = new THREE.Group();
  const blueGloveMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.42 });
  for (let f = -1.5; f <= 1.5; f += 1) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.12, 4, 8), blueGloveMat);
    finger.position.set(f * 0.065, 0.43, 0);
    finger.rotation.z = f * -0.14;
    peekingGloveGroup.add(finger);
  }
  gloveBoxGroup.add(peekingGloveGroup);

  const gbLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.84, 0.28),
    new THREE.MeshBasicMaterial({
      map: trackTex(makeVesselLabelTexture('Safety Gloves', 'CLICK TO WEAR')),
    })
  );
  gbLabel.position.set(0, 0.18, 0.285);
  gloveBoxGroup.add(gbLabel);

  const gbHit = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.72, 0.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  gbHit.position.y = 0.32;
  gbHit.userData.interactId = '__glove_box__';
  gloveBoxGroup.add(gbHit);
  scene.add(gloveBoxGroup);

  return {
    trackTex,
    createdTextures,
    gbHit,
    gloveBoxGroup,
    peekingGloveGroup,
    gloveBoxPos,
    meterGroup,
    updateMeterLines,
    hotPlatePos,
    hotPlateLight,
    heatingCoilMat,
  };
}

export function disposeSceneGraph(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  createdTextures: THREE.Texture[]
) {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
      obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m?.dispose());
    }
  });
  createdTextures.forEach((t) => t.dispose());
  if (scene.environment) scene.environment.dispose();
  renderer.dispose();
}
