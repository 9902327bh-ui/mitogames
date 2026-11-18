import * as THREE from 'three';
import type { RenderQuality } from './render.ts';

type MaterialRole = 'glass' | 'liquid' | 'organic' | 'waxy' | 'leaf' | 'metal' | 'plastic';

function colorKey(color: THREE.ColorRepresentation): string {
  return new THREE.Color(color).getHexString();
}

function createLeafMaps(): { color: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#777777';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 122);
    ctx.quadraticCurveTo(50, 64, 64, 6);
    ctx.stroke();
    for (let y = 20; y < 118; y += 15) {
      const width = Math.sin((y / 128) * Math.PI) * 48;
      ctx.beginPath();
      ctx.moveTo(64, y);
      ctx.quadraticCurveTo(64 - width * 0.55, y - 10, 64 - width, y - 18);
      ctx.moveTo(64, y);
      ctx.quadraticCurveTo(64 + width * 0.55, y - 10, 64 + width, y - 18);
      ctx.stroke();
    }
  }
  const bump = new THREE.CanvasTexture(canvas);
  const color = new THREE.CanvasTexture(canvas);
  color.colorSpace = THREE.SRGBColorSpace;
  return { color, bump };
}

export class BiologyMaterialLibrary {
  private cache = new Map<string, THREE.Material>();
  private independent = new Set<THREE.Material>();
  private physical = new Map<THREE.MeshPhysicalMaterial, { transmission: number; clearcoat: number }>();
  private leafMaps: { color: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null = null;
  private quality: RenderQuality = 'high';

  private keyed<T extends THREE.Material>(role: MaterialRole, color: THREE.ColorRepresentation, extra: string, make: () => T): T {
    const key = `${role}:${colorKey(color)}:${extra}`;
    let material = this.cache.get(key) as T | undefined;
    if (!material) {
      material = make();
      material.name = `Bio${role[0].toUpperCase()}${role.slice(1)}-${key}`;
      this.cache.set(key, material);
      if (material instanceof THREE.MeshPhysicalMaterial) {
        this.physical.set(material, { transmission: material.transmission, clearcoat: material.clearcoat });
        this.applyPhysicalQuality(material);
      }
    }
    return material;
  }

  glass(color: THREE.ColorRepresentation = 0xe0f2fe, opacity = 0.38, isSoftwareGl = false): THREE.MeshPhysicalMaterial {
    return this.keyed('glass', color, `${opacity.toFixed(2)}:${isSoftwareGl}`, () => new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.07,
      metalness: 0.015,
      transmission: isSoftwareGl ? 0 : 0.78,
      transparent: true,
      opacity: isSoftwareGl ? Math.max(opacity, 0.42) : 0.92,
      ior: 1.47,
      thickness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.045,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.15,
    }));
  }

  liquid(color: THREE.ColorRepresentation, opacity = 0.64, cache = false): THREE.MeshPhysicalMaterial {
    const make = () => new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.12,
      metalness: 0.015,
      transparent: true,
      opacity,
      clearcoat: 0.86,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 0.8,
    });
    if (cache) return this.keyed('liquid', color, opacity.toFixed(2), make);
    const material = make();
    this.independent.add(material);
    this.physical.set(material, { transmission: material.transmission, clearcoat: material.clearcoat });
    this.applyPhysicalQuality(material);
    return material;
  }

  organic(color: THREE.ColorRepresentation, roughness = 0.38): THREE.MeshPhysicalMaterial {
    return this.keyed('organic', color, roughness.toFixed(2), () => new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      clearcoat: 0.58,
      clearcoatRoughness: 0.32,
      emissive: new THREE.Color(color).multiplyScalar(0.025),
      emissiveIntensity: 0.36,
      envMapIntensity: 0.72,
    }));
  }

  waxy(color: THREE.ColorRepresentation, roughness = 0.28): THREE.MeshPhysicalMaterial {
    return this.keyed('waxy', color, roughness.toFixed(2), () => new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      clearcoat: 0.82,
      clearcoatRoughness: 0.2,
      envMapIntensity: 0.82,
      side: THREE.DoubleSide,
    }));
  }

  leaf(color: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
    return this.keyed('leaf', color, 'veined', () => {
      if (!this.leafMaps) this.leafMaps = createLeafMaps();
      return new THREE.MeshPhysicalMaterial({
        color,
        map: this.leafMaps.color,
        bumpMap: this.leafMaps.bump,
        bumpScale: 0.012,
        roughness: 0.4,
        metalness: 0,
        clearcoat: 0.48,
        clearcoatRoughness: 0.28,
        side: THREE.DoubleSide,
        envMapIntensity: 0.75,
      });
    });
  }

  metal(color: THREE.ColorRepresentation, metalness = 0.78, roughness = 0.22): THREE.MeshStandardMaterial {
    return this.keyed('metal', color, `${metalness.toFixed(2)}:${roughness.toFixed(2)}`, () => new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      envMapIntensity: 1.1,
    }));
  }

  plastic(color: THREE.ColorRepresentation, roughness = 0.32): THREE.MeshPhysicalMaterial {
    return this.keyed('plastic', color, roughness.toFixed(2), () => new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      clearcoat: 0.38,
      clearcoatRoughness: 0.3,
    }));
  }

  setQuality(quality: RenderQuality): void {
    this.quality = quality;
    this.physical.forEach((_, material) => this.applyPhysicalQuality(material));
    this.cache.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMapIntensity = quality === 'high' ? 1.1 : quality === 'medium' ? 0.65 : 0.18;
      }
    });
  }

  private applyPhysicalQuality(material: THREE.MeshPhysicalMaterial): void {
    const original = this.physical.get(material);
    if (!original) return;
    material.transmission = this.quality === 'low' ? 0 : original.transmission;
    material.clearcoat = this.quality === 'low' ? Math.min(0.2, original.clearcoat) : original.clearcoat;
    material.envMapIntensity = this.quality === 'high' ? 1 : this.quality === 'medium' ? 0.55 : 0.16;
    material.needsUpdate = true;
  }

  dispose(): void {
    this.cache.forEach((material) => material.dispose());
    this.independent.forEach((material) => material.dispose());
    this.cache.clear();
    this.independent.clear();
    this.physical.clear();
    this.leafMaps?.color.dispose();
    this.leafMaps?.bump.dispose();
    this.leafMaps = null;
  }
}

export function createBiologyMaterialLibrary(): BiologyMaterialLibrary {
  return new BiologyMaterialLibrary();
}
