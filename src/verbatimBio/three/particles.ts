import * as THREE from 'three';

export type ParticleKind =
  | 'bubble'
  | 'droplet'
  | 'steam'
  | 'blood_red'
  | 'blood_blue'
  | 'xylem_water'
  | 'sparkle';

interface ParticleSlot {
  active: boolean;
  kind: ParticleKind;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  baseScale: number;
  wobblePhase: number;
}

const POOL_SIZE = 180;

export class LabParticleSystem {
  public readonly mesh: THREE.InstancedMesh;
  private slots: ParticleSlot[] = [];
  private cursor = 0;
  private readonly dummy = new THREE.Object3D();
  private readonly tmpColor = new THREE.Color();

  constructor() {
    const geom = new THREE.SphereGeometry(0.032, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
    });
    this.mesh = new THREE.InstancedMesh(geom, mat, POOL_SIZE);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < POOL_SIZE; i++) {
      this.slots.push({
        active: false,
        kind: 'bubble',
        age: 0,
        life: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        baseScale: 1,
        wobblePhase: i * 0.7,
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.tmpColor.setHex(0xffffff));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  emit(
    kind: ParticleKind,
    origin: THREE.Vector3,
    count = 8,
    spread = 0.08,
    hexColor?: number,
  ): void {
    for (let n = 0; n < count; n++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % POOL_SIZE;
      const slot = this.slots[idx];
      slot.active = true;
      slot.kind = kind;
      slot.age = 0;
      slot.wobblePhase = Math.random() * Math.PI * 2;
      slot.pos.set(
        origin.x + (Math.random() - 0.5) * spread,
        origin.y + (Math.random() - 0.5) * (spread * 0.4),
        origin.z + (Math.random() - 0.5) * spread,
      );

      if (kind === 'bubble') {
        slot.life = 1.0 + Math.random() * 0.9;
        slot.vel.set((Math.random() - 0.5) * 0.05, 0.34 + Math.random() * 0.22, (Math.random() - 0.5) * 0.05);
        slot.baseScale = 0.55 + Math.random() * 0.6;
        this.tmpColor.setHex(hexColor ?? 0xdbeafe);
      } else if (kind === 'droplet') {
        slot.life = 0.45 + Math.random() * 0.25;
        slot.vel.set((Math.random() - 0.5) * 0.04, -0.75 - Math.random() * 0.25, (Math.random() - 0.5) * 0.04);
        slot.baseScale = 0.75 + Math.random() * 0.3;
        this.tmpColor.setHex(hexColor ?? 0x38bdf8);
      } else if (kind === 'steam') {
        slot.life = 1.4 + Math.random() * 0.8;
        slot.vel.set((Math.random() - 0.5) * 0.09, 0.26 + Math.random() * 0.14, (Math.random() - 0.5) * 0.09);
        slot.baseScale = 0.85 + Math.random() * 0.75;
        this.tmpColor.setHex(hexColor ?? 0xf1f5f9);
      } else if (kind === 'blood_red' || kind === 'blood_blue') {
        slot.life = 1.2 + Math.random() * 0.6;
        slot.vel.set(
          (kind === 'blood_red' ? 0.12 : -0.12) + (Math.random() - 0.5) * 0.12,
          0.18 + (Math.random() - 0.5) * 0.16,
          (Math.random() - 0.5) * 0.1,
        );
        slot.baseScale = 0.65 + Math.random() * 0.35;
        this.tmpColor.setHex(kind === 'blood_red' ? 0xef4444 : 0x2563eb);
      } else if (kind === 'xylem_water') {
        slot.life = 1.3 + Math.random() * 0.5;
        slot.vel.set((Math.random() - 0.5) * 0.04, 0.42 + Math.random() * 0.15, (Math.random() - 0.5) * 0.04);
        slot.baseScale = 0.6 + Math.random() * 0.35;
        this.tmpColor.setHex(hexColor ?? 0x0ea5e9);
      } else {
        // sparkle
        slot.life = 0.9 + Math.random() * 0.5;
        slot.vel.set(
          (Math.random() - 0.5) * 0.55,
          0.35 + Math.random() * 0.45,
          (Math.random() - 0.5) * 0.55,
        );
        slot.baseScale = 0.5 + Math.random() * 0.45;
        this.tmpColor.setHex(hexColor ?? 0xfbbf24);
      }

      this.mesh.setColorAt(idx, this.tmpColor);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number, timeSec: number): void {
    let anyUpdated = false;
    for (let i = 0; i < POOL_SIZE; i++) {
      const slot = this.slots[i];
      if (!slot.active) continue;
      anyUpdated = true;
      slot.age += dt;
      if (slot.age >= slot.life) {
        slot.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      const lifePct = slot.age / slot.life;
      slot.pos.addScaledVector(slot.vel, dt);

      if (slot.kind === 'bubble' || slot.kind === 'steam') {
        slot.pos.x += Math.sin(timeSec * 5 + slot.wobblePhase) * 0.0018;
      }
      if (slot.kind === 'sparkle') {
        slot.vel.y -= 0.65 * dt;
      }

      const fade = lifePct < 0.2 ? lifePct / 0.2 : 1 - (lifePct - 0.2) / 0.8;
      const s = Math.max(0.001, slot.baseScale * fade);
      this.dummy.position.copy(slot.pos);
      if (slot.kind === 'droplet') {
        this.dummy.scale.set(s * 0.72, s * 1.45, s * 0.72);
      } else {
        this.dummy.scale.set(s, s, s);
      }
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    if (anyUpdated) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
