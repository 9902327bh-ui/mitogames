import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createTapWater } from './tapWater.ts';
import { installLabModels } from './assets.ts';

export interface LabRoomHandle {
  group: THREE.Group;
  pmremTarget: THREE.WebGLRenderTarget;
  faucetStreamMesh: THREE.Mesh;
  dustMotes: THREE.Points;
  benchPlants: THREE.Group[];
  setFaucetRunning: (running: boolean) => void;
  update: (timeSec: number) => void;
  dispose: () => void;
}

function makeOakBenchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  // Rich warm golden-oak tabletop (strong contrast behind glassware, plants, and dark instruments)
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#d7b284');
  grad.addColorStop(0.5, '#cea573');
  grad.addColorStop(1, '#c39763');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wood grain planks
  for (let i = 0; i < 6; i++) {
    const y = (i * 512) / 6;
    ctx.strokeStyle = 'rgba(130, 96, 56, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    for (let g = 0; g < 18; g++) {
      const gy = y + Math.random() * 82;
      ctx.strokeStyle = 'rgba(155, 114, 68, 0.08)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(170, gy + (Math.random() - 0.5) * 6, 340, gy + (Math.random() - 0.5) * 6, 512, gy);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

function makeStudioWallTexture(primary = '#7f998c', secondary = '#728c80', grout = '#60796d'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 512, 512);

  const cols = 8;
  const rows = 8;
  const cw = 512 / cols;
  const rh = 512 / rows;
  ctx.strokeStyle = grout;
  ctx.lineWidth = 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? primary : secondary;
      ctx.fillRect(c * cw + 2, r * rh + 2, cw - 4, rh - 4);
      ctx.strokeRect(c * cw, r * rh, cw, rh);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function makeWoodWainscotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#7c5838');
  grad.addColorStop(1, '#5d4027');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 10; i++) {
    const x = (i * 512) / 10;
    ctx.strokeStyle = 'rgba(42, 26, 14, 0.32)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(180, 134, 88, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 8, 0);
    ctx.lineTo(x + 8, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function makePosterTexture(kind: 'cell' | 'food_chain'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 340);
  ctx.fillStyle = kind === 'cell' ? '#0d7a5f' : '#0284c7';
  ctx.fillRect(0, 0, 256, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(kind === 'cell' ? 'PLANT CELL ATLAS' : 'ENERGY FLOW & CO₂', 128, 30);

  if (kind === 'cell') {
    // Stylized plant cell wall + nucleus + chloroplasts diagram on wall poster
    ctx.fillStyle = '#dcfce7';
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(42, 76, 172, 134, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath();
    ctx.ellipse(142, 146, 48, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a16207';
    ctx.beginPath();
    ctx.arc(84, 118, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#16a34a';
    [[68, 172], [110, 184], [176, 102], [182, 168]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#1e293b';
    ctx.font = '600 13px sans-serif';
    ctx.fillText('Cell Wall · Nucleus · Vacuole', 128, 248);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('400x Brightfield Reference', 128, 272);
  } else {
    // Food chain / Photosynthesis cycle poster
    const nodes = [
      { y: 92, bg: '#fef08a', stroke: '#ca8a04', text: '1. SUNLIGHT + CO₂' },
      { y: 158, bg: '#bbf7d0', stroke: '#16a34a', text: '2. PRODUCERS (PLANTS)' },
      { y: 224, bg: '#fed7aa', stroke: '#ea580c', text: '3. OXYGEN + GLUCOSE' },
    ];
    nodes.forEach((n, idx) => {
      ctx.fillStyle = n.bg;
      ctx.strokeStyle = n.stroke;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(34, n.y, 188, 38, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(n.text, 128, n.y + 23);

      if (idx < nodes.length - 1) {
        ctx.strokeStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(128, n.y + 40);
        ctx.lineTo(128, n.y + 62);
        ctx.stroke();
      }
    });
    ctx.fillStyle = '#334155';
    ctx.font = '11px sans-serif';
    ctx.fillText('Ecosystem Energy Balance', 128, 294);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPottedPlant(potColor: number, leafColor: number): THREE.Group {
  const g = new THREE.Group();
  const potMat = new THREE.MeshStandardMaterial({ color: potColor, roughness: 0.72 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.16, 16), potMat);
  pot.position.y = 0.08;
  g.add(pot);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.115, 0.03, 16), potMat);
  rim.position.y = 0.165;
  g.add(rim);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.105, 0.02, 14),
    new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 }),
  );
  soil.position.y = 0.16;
  g.add(soil);

  const leafMat = new THREE.MeshStandardMaterial({
    color: leafColor,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), leafMat);
    frond.position.set(Math.cos(angle) * 0.06, 0.22 + (i % 2) * 0.03, Math.sin(angle) * 0.06);
    frond.rotation.z = Math.cos(angle) * -0.55;
    frond.rotation.x = Math.sin(angle) * 0.55;
    g.add(frond);
  }
  return g;
}

export function createLabRoom(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  sceneKind = 'microscope',
): LabRoomHandle {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  // Rich, non-glaring backdrop colors so white apparatus, clear glassware, bubbles, and dials pop cleanly
  const isFactory = sceneKind === 'factory';
  const isControl = sceneKind === 'control_panel';
  const bgHex = isFactory ? 0x6f9478 : isControl ? 0x4c6273 : 0x7b9588;
  scene.background = new THREE.Color(bgHex);
  scene.fog = new THREE.Fog(bgHex, 13, 28);

  // Environment reflection for clean PBR glass & stainless steel
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTex.texture;
  pmrem.dispose();

  // Warm overhead key + cool window daylight fill
  const hemiLight = new THREE.HemisphereLight(0xf0f9ff, 0xd8c3a5, 0.95);
  hemiLight.position.set(0, 6, 0);
  group.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
  keyLight.position.set(2.4, 5.2, 3.6);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.bias = -0.0008;
  }
  group.add(keyLight);

  // Cool daylight streaming from the left window
  const windowLight = new THREE.DirectionalLight(0xe0f2fe, 0.72);
  windowLight.position.set(-5.0, 2.8, 1.5);
  group.add(windowLight);

  // 1. Clean Light-Oak Benchtop + White Cabinet Base
  const oakTex = track(makeOakBenchTexture());
  const benchTopMat = track(
    new THREE.MeshStandardMaterial({
      map: oakTex,
      roughness: 0.42,
      metalness: 0.04,
    }),
  );
  const benchTop = new THREE.Mesh(track(new THREE.BoxGeometry(8.6, 0.14, 3.9)), benchTopMat);
  benchTop.position.set(0, -0.07, 0.15);
  benchTop.receiveShadow = !isSoftwareGl;
  group.add(benchTop);

  // Protective dark slate-teal / moss / instrument lab mat so glass, droplets, crates & dials pop clearly
  const matColor = isFactory ? 0x22442e : isControl ? 0x182534 : 0x22323a;
  const matMat = track(
    new THREE.MeshStandardMaterial({
      color: matColor,
      roughness: 0.72,
      metalness: 0.06,
    }),
  );
  const benchMat = new THREE.Mesh(track(new THREE.BoxGeometry(4.8, 0.014, 2.35)), matMat);
  benchMat.position.set(-0.1, 0.007, 0.08);
  benchMat.receiveShadow = !isSoftwareGl;
  group.add(benchMat);

  const matBorder = new THREE.Mesh(
    track(new THREE.BoxGeometry(4.86, 0.008, 2.41)),
    track(
      new THREE.MeshStandardMaterial({
        color: isControl ? 0x0284c7 : 0x10b981,
        roughness: 0.45,
      }),
    ),
  );
  matBorder.position.set(-0.1, 0.004, 0.08);
  group.add(matBorder);

  // Warm walnut/wood cabinet base + sage floor
  const cabinetMat = track(
    new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.68 }),
  );
  const cabinetBase = new THREE.Mesh(track(new THREE.BoxGeometry(8.3, 1.7, 3.6)), cabinetMat);
  cabinetBase.position.set(0, -0.99, 0.15);
  group.add(cabinetBase);

  const floorMat = track(new THREE.MeshStandardMaterial({ color: 0x596d64, roughness: 0.85 }));
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(24, 24)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.84;
  group.add(floor);

  // 2. Side Sink + Curved Chrome Faucet (Right rear corner of bench)
  const sinkGroup = new THREE.Group();
  sinkGroup.position.set(3.25, 0.01, -0.75);
  const sinkRimMat = track(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.2 }));
  const sinkRim = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.04, 0.72)), sinkRimMat);
  sinkGroup.add(sinkRim);

  const basin = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.78, 0.06, 0.56)),
    track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })),
  );
  basin.position.y = -0.015;
  sinkGroup.add(basin);

  const chromeMat = track(
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.15 }),
  );
  const faucetBase = new THREE.Mesh(track(new THREE.CylinderGeometry(0.032, 0.04, 0.08, 12)), chromeMat);
  faucetBase.position.set(0, 0.04, -0.28);
  sinkGroup.add(faucetBase);

  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.08, -0.28),
    new THREE.Vector3(0, 0.34, -0.26),
    new THREE.Vector3(0, 0.38, -0.06),
    new THREE.Vector3(0, 0.25, 0.02),
  ]);
  const spout = new THREE.Mesh(track(new THREE.TubeGeometry(spoutCurve, 16, 0.018, 10, false)), chromeMat);
  sinkGroup.add(spout);

  const tapHandle = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.08, 0.025, 0.025)),
    track(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })),
  );
  tapHandle.position.set(0.11, 0.06, -0.28);
  sinkGroup.add(tapHandle);

  // Running water: stream + splash + ripples + turning handle + sound (also reused by the GLB sink)
  const water = createTapWater(group, new THREE.Vector3(3.25, 0.26, -0.73), 0.035);
  water.setHandle(tapHandle);
  group.add(sinkGroup);

  // 3. Muted Contrast Studio Back Wall + Warm Wood Wainscoting + Framed Posters + Shelf + Plants
  const wallPalette = isFactory
    ? ['#6f9678', '#62876b', '#52745a']
    : isControl
      ? ['#475b6d', '#3e5162', '#324252']
      : ['#789284', '#6c8678', '#5c7467'];
  const tileTex = track(makeStudioWallTexture(wallPalette[0], wallPalette[1], wallPalette[2]));
  const wallMat = track(
    new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.78,
      metalness: 0.02,
    }),
  );
  const backWall = new THREE.Mesh(track(new THREE.PlaneGeometry(16, 7)), wallMat);
  backWall.position.set(0, 1.65, -2.15);
  backWall.receiveShadow = !isSoftwareGl;
  group.add(backWall);

  // Warm wooden lower wainscot paneling + oak trim rail along the bottom behind bench
  const wainscotTex = track(makeWoodWainscotTexture());
  const wainscotMat = track(new THREE.MeshStandardMaterial({ map: wainscotTex, roughness: 0.65 }));
  const wainscotPanel = new THREE.Mesh(track(new THREE.PlaneGeometry(16, 1.55)), wainscotMat);
  wainscotPanel.position.set(0, 0.12, -2.13);
  group.add(wainscotPanel);

  const chairRail = new THREE.Mesh(
    track(new THREE.BoxGeometry(16, 0.06, 0.06)),
    track(new THREE.MeshStandardMaterial({ color: 0x9c7248, roughness: 0.5 })),
  );
  chairRail.position.set(0, 0.9, -2.12);
  group.add(chairRail);

  // Left sunlit window wall (muted sage/slate instead of glaring white)
  const sideWall = new THREE.Mesh(
    track(new THREE.PlaneGeometry(12, 7)),
    track(
      new THREE.MeshStandardMaterial({
        color: isControl ? 0x45596a : 0x728a7d,
        roughness: 0.85,
      }),
    ),
  );
  sideWall.rotation.y = Math.PI / 2;
  sideWall.position.set(-4.3, 1.65, 0);
  group.add(sideWall);

  // Window frame + sky pane on the left wall
  const windowFrameMat = track(new THREE.MeshStandardMaterial({ color: 0xd4c3aa, roughness: 0.48 }));
  const skyMat = track(
    new THREE.MeshBasicMaterial({ color: isControl ? 0x93c5fd : 0xbfe6f7 }),
  );
  const windowPane = new THREE.Mesh(track(new THREE.PlaneGeometry(2.6, 2.2)), skyMat);
  windowPane.rotation.y = Math.PI / 2;
  windowPane.position.set(-4.26, 1.75, -0.2);
  group.add(windowPane);

  const winTrimTop = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.12, 2.8)), windowFrameMat);
  winTrimTop.position.set(-4.24, 2.86, -0.2);
  const winTrimBot = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.1, 2.9)), benchTopMat);
  winTrimBot.position.set(-4.18, 0.65, -0.2);
  const winMullionV = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 2.2, 0.07)), windowFrameMat);
  winMullionV.position.set(-4.24, 1.75, -0.2);
  const winMullionH = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.07, 2.6)), windowFrameMat);
  winMullionH.position.set(-4.24, 1.75, -0.2);
  group.add(winTrimTop, winTrimBot, winMullionV, winMullionH);

  // Framed Posters on back wall (positioned cleanly in upper camera viewport)
  const posterFrameMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
  const cellPosterTex = track(makePosterTexture('cell'));
  const foodPosterTex = track(makePosterTexture('food_chain'));

  [
    { x: -2.15, tex: cellPosterTex },
    { x: -0.95, tex: foodPosterTex },
  ].forEach((p) => {
    const frame = new THREE.Mesh(track(new THREE.BoxGeometry(0.84, 1.06, 0.04)), posterFrameMat);
    frame.position.set(p.x, 1.24, -2.11);
    const canvasPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.76, 0.96)),
      track(new THREE.MeshStandardMaterial({ map: p.tex, roughness: 0.5 })),
    );
    canvasPlane.position.set(p.x, 1.24, -2.085);
    group.add(frame, canvasPlane);
  });

  // Wall Shelf (Upper Right) + Potted Plants
  const shelf = new THREE.Mesh(track(new THREE.BoxGeometry(1.95, 0.065, 0.4)), benchTopMat);
  shelf.position.set(1.75, 1.15, -1.94);
  group.add(shelf);

  const plantA = buildPottedPlant(0xd97706, 0x16a34a);
  plantA.position.set(1.15, 1.185, -1.92);
  const plantB = buildPottedPlant(0x0d9488, 0x22c55e);
  plantB.position.set(2.35, 1.185, -1.92);
  const windowPlant = buildPottedPlant(0xe11d48, 0x15803d);
  windowPlant.position.set(-4.16, 0.7, -0.45);
  group.add(plantA, plantB, windowPlant);

  const benchPlants = [plantA, plantB, windowPlant];

  // Decorative reference bottle on the shelf
  const jar = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.08, 0.08, 0.24, 14)),
    track(new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5, roughness: 0.15 })),
  );
  jar.position.set(1.75, 1.31, -1.92);
  const jarCap = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12)),
    track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })),
  );
  jarCap.position.set(1.75, 1.44, -1.92);
  group.add(jar, jarCap);

  // Subtle floating dust motes in the sunlight
  const moteCount = 48;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = (Math.random() - 0.5) * 5.2;
    motePositions[i * 3 + 1] = 0.35 + Math.random() * 2.2;
    motePositions[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
  }
  const moteGeom = track(new THREE.BufferGeometry());
  moteGeom.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = track(
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.025,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  const dustMotes = new THREE.Points(moteGeom, moteMat);
  group.add(dustMotes);

  const cleanupModels = installLabModels({
    group,
    isSoftwareGl,
    benchTop,
    cabinetBase,
    sinkGroup,
    floor,
    benchPlants,
    water,
  });

  scene.add(group);

  return {
    group,
    pmremTarget: envTex,
    faucetStreamMesh: water.stream,
    dustMotes,
    benchPlants,
    setFaucetRunning: (running: boolean) => water.setRunning(running),
    update: (timeSec: number) => {
      // Gentle idle plant sway + slow floating sunlight dust motes
      benchPlants.forEach((p, idx) => {
        p.rotation.z = Math.sin(timeSec * 0.9 + idx * 1.4) * 0.025;
      });
      dustMotes.position.y = Math.sin(timeSec * 0.4) * 0.04;
      water.update(timeSec);
    },
    dispose: () => {
      cleanupModels();
      water.dispose();
      envTex.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
}
