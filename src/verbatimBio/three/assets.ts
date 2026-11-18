import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { TapWater } from './tapWater.ts';

/**
 * ONE place to tune the real 3D models. Put the files in /public/models/.
 * If a file is missing or fails to load, the procedural table, sink and plants stay in place.
 * Add ?labdebug=1 to the URL to print the node names and show a red marker at the detected spout tip.
 */
export const LAB_MODELS = {
  table: {
    url: '/models/lab_table.glb',
    fitLength: 8.0, // table is scaled so it is at least this long (x) ...
    fitDepth: 3.4, // ... and at least this deep (z)
    rotationY: 0, // extra rotation (radians) if the model faces the wrong way
    mirrorToRight: true, // flip the table so the sink ends up on the right, outside the item zone
    topTint: 0xd8c8ac, // counter colour (the original is near black). null keeps the original colour
    stripTopTexture: false,
    basinDepth: 0.12, // how far below the counter the water hits the basin
    spoutTipOverride: null as [number, number, number] | null, // set if auto-detect is off
    faucetNameRegex: /faucet|tap|spout|mixer|neck/i,
    handleNameRegex: /handle|knob|lever|valve/i,
  },
  plants: [
    { url: '/models/plant_a.glb', height: 0.55, rotationY: 0 },
    { url: '/models/plant_b.glb', height: 0.5, rotationY: 1.2 },
    { url: '/models/plant_a.glb', height: 0.62, rotationY: 2.4 },
  ],
};

const cache = new Map<string, Promise<THREE.Object3D | null>>();

export function loadGLB(url: string): Promise<THREE.Object3D | null> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<THREE.Object3D | null>((resolve) => {
      let settled = false;
      const done = (v: THREE.Object3D | null, msg?: string) => {
        if (settled) return;
        settled = true;
        if (!v && msg) console.warn(`[lab models] ${url}: ${msg} Using the built-in model instead.`);
        resolve(v);
      };
      const timer = window.setTimeout(() => done(null, 'timed out.'), 15000);
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(
        url,
        (g) => {
          window.clearTimeout(timer);
          done(g.scene);
        },
        undefined,
        () => {
          window.clearTimeout(timer);
          done(null, 'not found or could not be read.');
        },
      );
    });
    cache.set(url, p);
  }
  return p;
}

function setShadows(obj: THREE.Object3D) {
  obj.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

/** Scale a model to a height, centre it on x/z and put its base at y = 0. */
function wrapBase(root: THREE.Object3D, height: number, rotY: number): THREE.Group {
  const inner = cloneSkinned(root);
  const g = new THREE.Group();
  g.add(inner);
  inner.rotation.y = rotY;
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3());
  inner.scale.multiplyScalar(height / Math.max(size.y, 1e-4));
  g.updateMatrixWorld(true);
  box.setFromObject(g);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.x -= c.x;
  inner.position.z -= c.z;
  inner.position.y -= box.min.y;
  setShadows(g);
  return g;
}

export interface InstallOpts {
  group: THREE.Group;
  isSoftwareGl: boolean;
  benchTop: THREE.Object3D;
  cabinetBase: THREE.Object3D;
  sinkGroup: THREE.Object3D;
  floor: THREE.Object3D;
  benchPlants: THREE.Group[]; // mutated in place so the sway animation follows the new plants
  water: TapWater;
}

/** Loads the GLBs in the background and swaps them in. Returns a cleanup function. */
export function installLabModels(o: InstallOpts): () => void {
  if (o.isSoftwareGl) return () => {};
  let dead = false;
  const added: THREE.Object3D[] = [];
  const ownedMats: THREE.Material[] = [];
  const debug = typeof location !== 'undefined' && /labdebug=1/.test(location.search);

  // ---- plants ----
  LAB_MODELS.plants.forEach((cfg, i) => {
    void loadGLB(cfg.url).then((root) => {
      if (dead || !root) return;
      const old = o.benchPlants[i];
      if (!old) return;
      const holder = new THREE.Group();
      holder.position.copy(old.position);
      holder.add(wrapBase(root, cfg.height, cfg.rotationY));
      o.group.add(holder);
      old.visible = false;
      o.benchPlants[i] = holder;
      added.push(holder);
    });
  });

  // ---- lab table with sink and faucet ----
  const T = LAB_MODELS.table;
  void loadGLB(T.url).then((root) => {
    if (dead || !root) return;
    const mirror = new THREE.Group();
    const holder = new THREE.Group();
    const inner = cloneSkinned(root);
    holder.add(inner);
    mirror.add(holder);

    const v = new THREE.Vector3();
    const box = new THREE.Box3();
    const tb = new THREE.Box3();

    // long side along x, then fit the bench footprint
    mirror.updateMatrixWorld(true);
    box.setFromObject(mirror).getSize(v);
    if (v.z > v.x) inner.rotation.y = Math.PI / 2;
    inner.rotation.y += T.rotationY;
    mirror.updateMatrixWorld(true);
    box.setFromObject(mirror).getSize(v);
    inner.scale.multiplyScalar(Math.max(T.fitLength / v.x, T.fitDepth / v.z));
    mirror.updateMatrixWorld(true);

    // find the counter top: the widest slab in the upper part of the model
    const full = box.setFromObject(mirror).clone();
    const totalH = full.max.y - full.min.y;
    let topMesh: THREE.Mesh | null = null;
    let topArea = 0;
    holder.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      tb.setFromObject(m);
      tb.getSize(v);
      if (v.y > 0.35 * totalH || tb.max.y < full.min.y + 0.45 * totalH) return;
      if (v.x * v.z > topArea) {
        topArea = v.x * v.z;
        topMesh = m;
      }
    });
    const top = topMesh as THREE.Mesh | null;
    let topY = full.min.y + totalH * 0.55;
    if (top) {
      tb.setFromObject(top);
      const c = tb.getCenter(new THREE.Vector3());
      topY = tb.max.y;
      inner.position.x -= c.x;
      inner.position.z -= c.z - 0.15;
    } else {
      console.warn('[lab models] could not find the counter top, using an estimate.');
    }
    inner.position.y -= topY;

    if (top && T.topTint !== null) {
      const mats = (Array.isArray(top.material) ? top.material : [top.material]).map((mm) => {
        const c = mm.clone() as THREE.MeshStandardMaterial;
        if (c.color) c.color.setHex(T.topTint as number);
        if (T.stripTopTexture) c.map = null;
        ownedMats.push(c);
        return c;
      });
      top.material = Array.isArray(top.material) ? mats : mats[0];
    }

    const detect = () => {
      mirror.updateMatrixWorld(true);
      const fBox = new THREE.Box3();
      let handle: THREE.Object3D | null = null;
      let count = 0;
      holder.traverse((n) => {
        if (T.faucetNameRegex.test(n.name)) {
          const b = new THREE.Box3().setFromObject(n);
          if (!b.isEmpty() && b.getSize(new THREE.Vector3()).x < T.fitLength * 0.3) {
            fBox.union(b);
            count++;
          }
        }
        if (!handle && T.handleNameRegex.test(n.name)) handle = n;
      });
      return { fBox, handle: handle as THREE.Object3D | null, count };
    };

    let det = detect();
    if (T.mirrorToRight && det.count > 0 && det.fBox.getCenter(new THREE.Vector3()).x < -2.4) {
      mirror.scale.x = -1;
      det = detect();
    }

    let tip = new THREE.Vector3(3.1, 0.3, -0.2);
    if (T.spoutTipOverride) tip = new THREE.Vector3(...T.spoutTipOverride);
    else if (det.count > 0) {
      const s = det.fBox.getSize(new THREE.Vector3());
      const c = det.fBox.getCenter(new THREE.Vector3());
      tip = new THREE.Vector3(c.x, det.fBox.min.y + s.y * 0.72, det.fBox.max.z - s.z * 0.05);
    } else {
      console.warn('[lab models] faucet not found by name. Set spoutTipOverride in LAB_MODELS.table.');
    }
    o.water.setAnchor(tip, -T.basinDepth);
    if (det.handle) o.water.setHandle(det.handle);

    // lower the floor if the table is shorter than the built-in cabinet
    box.setFromObject(mirror);
    if (box.min.y > -3 && box.min.y < -1) (o.floor as THREE.Object3D).position.y = box.min.y - 0.005;

    setShadows(mirror);
    o.group.add(mirror);
    added.push(mirror);
    o.benchTop.visible = false;
    o.cabinetBase.visible = false;
    o.sinkGroup.visible = false;

    if (debug) {
      const names: string[] = [];
      holder.traverse((n) => names.push(n.name || '(unnamed)'));
      console.info('[lab models] table nodes:', names, 'faucet nodes:', det.count, 'tip:', tip.toArray());
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.03), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      marker.position.copy(tip);
      o.group.add(marker);
      added.push(marker);
    }
  });

  return () => {
    dead = true;
    added.forEach((a) => a.parent?.remove(a));
    ownedMats.forEach((m) => m.dispose());
  };
}
