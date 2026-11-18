import * as THREE from 'three';
import { labAudio } from '../utils/labAudio.ts';

export interface TapWater {
  stream: THREE.Mesh;
  setRunning: (on: boolean) => void;
  /** tip = where the water leaves the spout, floorY = water line in the basin (room coordinates) */
  setAnchor: (tip: THREE.Vector3, floorY: number) => void;
  /** optional tap handle that turns when the water runs */
  setHandle: (node: THREE.Object3D | null) => void;
  update: (timeSec: number) => void;
  dispose: () => void;
}

const SPLASH_COUNT = 28;

/**
 * Running tap water: flowing tapered stream, splash droplets, ripples in the basin,
 * a turning handle and a soft water sound. Works for the procedural sink and for GLB sinks.
 */
export function createTapWater(parent: THREE.Group, tip: THREE.Vector3, floorY: number): TapWater {
  const tipPos = tip.clone();
  let floor = floorY;
  let target = 0;
  let opacity = 0;
  let lastT = 0;
  let handle: THREE.Object3D | null = null;
  let handleBase = 0;
  let handleCur = 0;

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(0, 0, 32, 128);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.45})`;
    ctx.fillRect(Math.random() * 28, Math.random() * 128, 2 + Math.random() * 3, 18 + Math.random() * 40);
  }
  const streamTex = new THREE.CanvasTexture(canvas);
  streamTex.wrapS = THREE.RepeatWrapping;
  streamTex.wrapT = THREE.RepeatWrapping;
  streamTex.repeat.set(1, 3);

  const streamMat = new THREE.MeshBasicMaterial({
    map: streamTex,
    color: 0x9fdcff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 1, 12, 1, true), streamMat);
  stream.visible = false;
  stream.frustumCulled = false;
  parent.add(stream);

  const pos = new Float32Array(SPLASH_COUNT * 3);
  const vel = new Float32Array(SPLASH_COUNT * 3);
  const life = new Float32Array(SPLASH_COUNT);
  const splashGeo = new THREE.BufferGeometry();
  splashGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const splashMat = new THREE.PointsMaterial({
    color: 0xd8f1ff,
    size: 0.022,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const splash = new THREE.Points(splashGeo, splashMat);
  splash.visible = false;
  splash.frustumCulled = false;
  parent.add(splash);

  const rippleGeo = new THREE.RingGeometry(0.02, 0.028, 24);
  const ripples: THREE.Mesh[] = [0, 1].map(() => {
    const m = new THREE.Mesh(
      rippleGeo,
      new THREE.MeshBasicMaterial({ color: 0xe0f4ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    parent.add(m);
    return m;
  });

  const respawn = (i: number) => {
    pos[i * 3] = tipPos.x + (Math.random() - 0.5) * 0.012;
    pos[i * 3 + 1] = floor + 0.004;
    pos[i * 3 + 2] = tipPos.z + (Math.random() - 0.5) * 0.012;
    vel[i * 3] = (Math.random() - 0.5) * 0.4;
    vel[i * 3 + 1] = 0.35 + Math.random() * 0.35;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    life[i] = 0.3 + Math.random() * 0.3;
  };
  for (let i = 0; i < SPLASH_COUNT; i++) {
    respawn(i);
    life[i] = Math.random() * 0.5;
  }

  return {
    stream,
    setRunning: (on) => {
      target = on ? 1 : 0;
      if (on) labAudio.startWater();
      else labAudio.stopWater();
    },
    setAnchor: (t, fy) => {
      tipPos.copy(t);
      floor = fy;
    },
    setHandle: (node) => {
      handle = node;
      handleBase = node ? node.rotation.y : 0;
      handleCur = 0;
    },
    update: (timeSec) => {
      const dt = Math.min(0.1, Math.max(0, timeSec - lastT));
      lastT = timeSec;
      opacity += (target - opacity) * Math.min(1, dt * 10);
      if (handle) {
        handleCur += ((target ? 0.75 : 0) - handleCur) * Math.min(1, dt * 8);
        handle.rotation.y = handleBase + handleCur;
      }
      const on = opacity > 0.02;
      stream.visible = on;
      splash.visible = on;
      ripples.forEach((r) => (r.visible = on));
      if (!on) return;

      const len = Math.max(0.02, tipPos.y - floor);
      stream.position.set(tipPos.x, floor + len / 2, tipPos.z);
      stream.scale.set(1 + Math.sin(timeSec * 24) * 0.07, len, 1 + Math.cos(timeSec * 21) * 0.07);
      streamMat.opacity = opacity * 0.8;
      streamTex.offset.y += dt * 2.6;

      for (let i = 0; i < SPLASH_COUNT; i++) {
        life[i] -= dt;
        if (life[i] <= 0) respawn(i);
        vel[i * 3 + 1] -= 2.4 * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (pos[i * 3 + 1] < floor) pos[i * 3 + 1] = floor;
      }
      splashGeo.attributes.position.needsUpdate = true;
      splashMat.opacity = opacity * 0.85;

      ripples.forEach((r, i) => {
        const ph = (timeSec * 1.6 + i * 0.5) % 1;
        r.position.set(tipPos.x, floor + 0.004, tipPos.z);
        r.scale.setScalar(0.5 + ph * 2.4);
        (r.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.5 * opacity;
      });
    },
    dispose: () => {
      labAudio.stopWater();
      parent.remove(stream, splash, ...ripples);
      stream.geometry.dispose();
      streamMat.dispose();
      streamTex.dispose();
      splashGeo.dispose();
      splashMat.dispose();
      rippleGeo.dispose();
      ripples.forEach((r) => (r.material as THREE.Material).dispose());
    },
  };
}
