import * as THREE from 'three';

export interface ModelBuildOptions {
  isSoftwareGl?: boolean;
  specimenPreset?: string;
}

export function createGlassMaterial(isSoftwareGl = false, tintHex = 0xe0f2fe, opacity = 0.38): THREE.MeshPhysicalMaterial {
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
