import * as THREE from 'three';
import type { BiologyMaterialLibrary } from '../../../three/materials.ts';

export interface ModelBuildOptions {
  isSoftwareGl?: boolean;
  specimenPreset?: string;
  materials?: BiologyMaterialLibrary;
}

export function createGlassMaterial(
  options: boolean | ModelBuildOptions = false,
  tintHex: THREE.ColorRepresentation = 0xe0f2fe,
  opacity = 0.38,
): THREE.MeshPhysicalMaterial {
  const isSoftwareGl = typeof options === 'boolean' ? options : Boolean(options.isSoftwareGl);
  const library = typeof options === 'boolean' ? undefined : options.materials;
  if (library) return library.glass(tintHex, opacity, isSoftwareGl);
  return new THREE.MeshPhysicalMaterial({
    color: tintHex,
    roughness: 0.08,
    metalness: 0.02,
    transmission: isSoftwareGl ? 0 : 0.72,
    transparent: true,
    opacity: isSoftwareGl ? Math.max(opacity, 0.42) : 0.92,
    ior: 1.47,
    thickness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function createLiquidMaterial(
  options: ModelBuildOptions,
  color: THREE.ColorRepresentation,
  opacity = 0.64,
): THREE.MeshPhysicalMaterial {
  if (options.materials) return options.materials.liquid(color, opacity);
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, transparent: true, opacity, clearcoat: 0.86, clearcoatRoughness: 0.08, side: THREE.DoubleSide, depthWrite: false });
}

export function createOrganicMaterial(
  options: ModelBuildOptions,
  color: THREE.ColorRepresentation,
  roughness = 0.38,
): THREE.MeshPhysicalMaterial {
  if (options.materials) return options.materials.organic(color, roughness);
  return new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 0.58, clearcoatRoughness: 0.32, envMapIntensity: 0.72 });
}

export function createLeafMaterial(options: ModelBuildOptions, color: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  if (options.materials) return options.materials.leaf(color);
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.48, side: THREE.DoubleSide });
}

export function makeCanvasLabelTexture(
  title: string,
  subtitle: string,
  accentHex = '#0d7a5f',
  bgHex = '#ffffff',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 256, 26);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.slice(0, 16), 128, 70);

  ctx.fillStyle = '#475569';
  ctx.font = '18px monospace';
  ctx.fillText(subtitle.slice(0, 22), 128, 102);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeGraduationsTexture(maxLabel = 250, unit = 'mL'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';

  for (let i = 1; i <= 5; i++) {
    const y = 230 - i * 38;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(84, y);
    ctx.stroke();

    const val = Math.round((maxLabel / 5) * i);
    ctx.fillText(`${val}${i === 5 ? ` ${unit}` : ''}`, 92, y + 6);

    if (i < 5) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, y - 19);
      ctx.lineTo(64, y - 19);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function enableModelShadows(group: THREE.Object3D, isSoftwareGl = false): void {
  if (isSoftwareGl) return;
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}
