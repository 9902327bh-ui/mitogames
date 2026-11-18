import * as THREE from 'three';
import { enableModelShadows, makeCanvasLabelTexture, type ModelBuildOptions } from './shared.ts';

export function buildSafetyGearBox(opts: ModelBuildOptions = {}): THREE.Group {
  const g = new THREE.Group();

  // Crisp nitrile dispenser box with clean teal accent & hinged lid
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.05,
  });
  const baseBox = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.24, 0.34), boxMat);
  baseBox.position.y = 0.12;
  g.add(baseBox);

  // Teal trim stripe
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x0d7a5f, roughness: 0.32 });
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(0.548, 0.055, 0.348), bandMat);
  topTrim.position.y = 0.21;
  g.add(topTrim);

  // Front crisp canvas label ("GLOVES & COAT")
  const labelTex = makeCanvasLabelTexture('SAFETY GEAR', 'GLOVES + LAB COAT', '#0d9488', '#f0fdfa');
  const labelPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.16),
    new THREE.MeshBasicMaterial({ map: labelTex }),
  );
  labelPlane.position.set(0, 0.11, 0.172);
  g.add(labelPlane);

  // Oval dispensing slot on top
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.09), slotMat);
  slot.position.set(-0.08, 0.241, 0);
  g.add(slot);

  // Protruding sky-blue nitrile glove cuff + thumb silhouette emerging from slot
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.42,
    metalness: 0.05,
  });
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.13, 14), gloveMat);
  cuff.position.set(-0.08, 0.28, 0);
  cuff.rotation.z = 0.18;
  g.add(cuff);

  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.045, 4, 8), gloveMat);
    finger.position.set(-0.13 + f * 0.025, 0.355 - Math.abs(f - 1.5) * 0.008, 0);
    finger.rotation.z = 0.18 + (f - 1.5) * 0.12;
    g.add(finger);
  }

  // Folded crisp white mini lab-coat collar sitting next to glove cuff on lid
  const coatMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
  const foldedCoat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.22), coatMat);
  foldedCoat.position.set(0.14, 0.26, 0.01);
  g.add(foldedCoat);

  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.012, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 }),
  );
  badge.position.set(0.17, 0.285, 0.04);
  g.add(badge);

  g.userData.cuff = cuff;
  g.userData.coat = foldedCoat;

  enableModelShadows(g, opts.isSoftwareGl);
  return g;
}
