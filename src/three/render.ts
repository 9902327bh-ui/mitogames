import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type RenderQuality = 'high' | 'medium' | 'low';

export interface BiologyRenderPipeline {
  readonly quality: RenderQuality;
  readonly bloomEnabled: boolean;
  readonly bloomStrength: number;
  update: (dt: number) => void;
  resize: (width: number, height: number) => void;
  render: () => void;
  dispose: () => void;
}

export interface RenderPipelineOptions {
  isSoftwareGl?: boolean;
  onQualityChange?: (quality: RenderQuality) => void;
}

function initialQuality(isSoftwareGl: boolean): RenderQuality {
  if (isSoftwareGl) return 'low';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (window.matchMedia?.('(max-width: 760px)').matches ?? false);
  const cores = navigator.hardwareConcurrency || 8;
  const dpr = window.devicePixelRatio || 1;
  return mobile || cores <= 4 || dpr > 1.75 ? 'medium' : 'high';
}

export function createBiologyRenderPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: RenderPipelineOptions = {},
): BiologyRenderPipeline {
  const { isSoftwareGl = false, onQualityChange } = options;
  let quality = initialQuality(isSoftwareGl);
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  let output: OutputPass | null = null;
  let probeElapsed = 0;
  let probeFrames = 0;
  let underBudgetElapsed = 0;
  let disposed = false;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const ensureBloom = () => {
    if (composer || disposed) return;
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.42, 0.88);
      composer.addPass(bloom);
      output = new OutputPass();
      composer.addPass(output);
    } catch {
      composer?.dispose();
      composer = null;
      bloom = null;
      output = null;
    }
  };

  const applyQuality = (next: RenderQuality) => {
    if (quality === next) return;
    quality = next;
    renderer.shadowMap.enabled = !isSoftwareGl && quality !== 'low';
    if (quality === 'high') ensureBloom();
    onQualityChange?.(quality);
  };

  renderer.shadowMap.enabled = !isSoftwareGl && quality !== 'low';
  if (quality === 'high') ensureBloom();
  onQualityChange?.(quality);

  return {
    get quality() { return quality; },
    get bloomEnabled() { return Boolean(composer && quality === 'high'); },
    get bloomStrength() { return bloom?.strength ?? 0; },
    update(dt) {
      if (disposed || !Number.isFinite(dt) || dt <= 0) return;
      if (probeElapsed < 2) {
        probeElapsed += dt;
        probeFrames += 1;
        if (probeElapsed >= 2) {
          const fps = probeFrames / probeElapsed;
          const probedQuality: RenderQuality = isSoftwareGl || fps < 32
            ? 'low'
            : fps < 52 ? 'medium' : quality;
          applyQuality(probedQuality);
        }
      } else if (!isSoftwareGl && dt > 1 / 40) {
        underBudgetElapsed += dt;
        if (underBudgetElapsed >= 3) {
          applyQuality(quality === 'high' ? 'medium' : 'low');
          underBudgetElapsed = 0;
        }
      } else {
        underBudgetElapsed = 0;
      }
    },
    resize(width, height) {
      renderer.setSize(width, height, false);
      if (composer) composer.setSize(width, height);
      if (bloom) bloom.setSize(width, height);
    },
    render() {
      if (composer && quality === 'high') composer.render();
      else renderer.render(scene, camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      bloom?.dispose();
      output?.dispose();
      composer?.dispose();
      composer = null;
      bloom = null;
      output = null;
    },
  };
}

function makeSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.30)');
    gradient.addColorStop(0.42, 'rgba(15, 23, 42, 0.17)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createContactShadowResources(): {
  attach: (object: THREE.Object3D) => THREE.Mesh;
  dispose: () => void;
} {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const texture = makeSoftShadowTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x1e293b,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  return {
    attach(object) {
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const shadow = new THREE.Mesh(geometry, material);
      shadow.name = 'BiologyContactShadow';
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, 0.009, 0);
      shadow.scale.set(
        THREE.MathUtils.clamp(Math.max(size.x, 0.28) * 1.25, 0.34, 1.8),
        THREE.MathUtils.clamp(Math.max(size.z, 0.28) * 1.25, 0.34, 1.65),
        1,
      );
      shadow.renderOrder = 1;
      object.add(shadow);
      return shadow;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

export function disposeSceneResources(scene: THREE.Scene): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    const renderable = object as THREE.Mesh;
    if (renderable.geometry) geometries.add(renderable.geometry);
    const list = Array.isArray(renderable.material) ? renderable.material : renderable.material ? [renderable.material] : [];
    for (const material of list) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}
