import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type EasingFn = (t: number) => number;

export const Easings = {
  linear: (t: number) => t,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) {
      const u = t - 1.5 / d1;
      return n1 * u * u + 0.75;
    }
    if (t < 2.5 / d1) {
      const u = t - 2.25 / d1;
      return n1 * u * u + 0.9375;
    }
    const u = t - 2.625 / d1;
    return n1 * u * u + 0.984375;
  },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface ActiveTween {
  elapsed: number;
  duration: number;
  delay: number;
  ease: EasingFn;
  onStart?: () => void;
  started: boolean;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
}

export class TweenManager {
  private tweens: ActiveTween[] = [];
  private timers: Array<{ remaining: number; fn: () => void }> = [];

  add(opts: {
    duration: number;
    delay?: number;
    ease?: EasingFn;
    onStart?: () => void;
    onUpdate: (progress: number) => void;
    onComplete?: () => void;
  }): void {
    const reduced = prefersReducedMotion();
    const duration = reduced ? Math.min(0.15, opts.duration) : Math.max(0.01, opts.duration);
    const delay = reduced ? Math.min(0.05, opts.delay ?? 0) : Math.max(0, opts.delay ?? 0);

    this.tweens.push({
      elapsed: 0,
      duration,
      delay,
      ease: opts.ease ?? Easings.easeInOutCubic,
      onStart: opts.onStart,
      started: false,
      onUpdate: opts.onUpdate,
      onComplete: opts.onComplete,
    });
  }

  after(delaySeconds: number, fn: () => void): void {
    const reduced = prefersReducedMotion();
    const delay = reduced ? Math.min(0.12, delaySeconds) : Math.max(0, delaySeconds);
    if (delay <= 0) {
      fn();
      return;
    }
    this.timers.push({ remaining: delay, fn });
  }

  update(dt: number): void {
    // Update delayed callbacks
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const timer = this.timers[i];
      timer.remaining -= dt;
      if (timer.remaining <= 0) {
        this.timers.splice(i, 1);
        timer.fn();
      }
    }

    // Update active tweens
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      if (tw.delay > 0) {
        tw.delay -= dt;
        continue;
      }
      if (!tw.started) {
        tw.started = true;
        tw.onStart?.();
      }
      tw.elapsed += dt;
      const raw = Math.min(1, tw.elapsed / tw.duration);
      const eased = tw.ease(raw);
      tw.onUpdate(eased);
      if (raw >= 1) {
        this.tweens.splice(i, 1);
        tw.onComplete?.();
      }
    }
  }

  clear(): void {
    this.tweens = [];
    this.timers = [];
  }
}

export class CameraDollyController {
  private active = false;
  private elapsed = 0;
  private duration = 0.95;
  private startPos = new THREE.Vector3();
  private endPos = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private endTarget = new THREE.Vector3();
  private controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private onUserStart: () => void;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
    this.onUserStart = () => {
      // Cancel dolly cleanly if user orbits/pans manually
      this.active = false;
    };
    this.controls.addEventListener('start', this.onUserStart);
  }

  dollyTo(position: THREE.Vector3, target: THREE.Vector3, duration = 0.95): void {
    this.startPos.copy(this.camera.position);
    this.startTarget.copy(this.controls.target);
    this.endPos.copy(position);
    this.endTarget.copy(target);
    this.elapsed = 0;
    this.duration = prefersReducedMotion() ? 0.14 : Math.max(0.15, duration);
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.duration);
    const e = Easings.easeInOutCubic(t);
    this.camera.position.lerpVectors(this.startPos, this.endPos, e);
    this.controls.target.lerpVectors(this.startTarget, this.endTarget, e);
    this.controls.update();
    if (t >= 1) {
      this.active = false;
    }
  }

  dispose(): void {
    this.controls.removeEventListener('start', this.onUserStart);
  }
}
