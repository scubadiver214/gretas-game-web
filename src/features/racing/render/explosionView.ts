import {
  AdditiveBlending,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type WebGLRenderer,
} from "three";

const SLOTS = 4;

const RIPPLE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RIPPLE_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uCenter;
  uniform float uRadius;
  uniform float uWidth;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    vec2 delta = uv - uCenter;
    float d = length(delta);
    float ring = smoothstep(uRadius + uWidth, uRadius, d) * smoothstep(uRadius - uWidth * 0.35, uRadius, d);
    vec2 dir = d > 0.0001 ? delta / d : vec2(0.0);
    uv += dir * ring * uStrength;
    uv = clamp(uv, 0.001, 0.999);
    gl_FragColor = texture2D(tDiffuse, uv);
    #include <colorspace_fragment>
  }
`;

interface Slot {
  active: boolean;
  distort: boolean;
  age: number;
  life: number;
  power: number;
  x: number;
  y: number;
  z: number;
  flash: Mesh;
  fire: Mesh;
  ring: Mesh;
  dust: Mesh;
  flashMat: MeshBasicMaterial;
  fireMat: MeshBasicMaterial;
  ringMat: MeshBasicMaterial;
  dustMat: MeshBasicMaterial;
}

/**
 * The picture of a blast: a flash, a fireball, a shockwave ring and a dust ring.
 * Up to four at once. On a machine that can spare a frame, a big blast also
 * ripples the picture for a moment. Phones skip that pass and keep the rings.
 */
export class ExplosionView {
  readonly group = new Group();
  private readonly slots: Slot[] = [];
  private readonly sphere: SphereGeometry;
  private readonly ringGeo: RingGeometry;
  private readonly ripple: Ripple | null;
  private next = 0;

  constructor(lowPower: boolean) {
    this.sphere = new SphereGeometry(1, 12, 9);
    this.ringGeo = new RingGeometry(0.72, 1, 32);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.ripple = lowPower ? null : new Ripple();
    for (let i = 0; i < SLOTS; i++) this.slots.push(this.makeSlot());
  }

  /** Compiles the ripple shader ahead of the first blast so that frame doesn't hitch. */
  warm(renderer: WebGLRenderer): void {
    this.ripple?.warm(renderer);
  }

  spawn(x: number, y: number, z: number, power: number, distort: boolean): void {
    const slot = this.slots[this.next];
    this.next = (this.next + 1) % SLOTS;
    slot.active = true;
    slot.distort = distort && this.ripple !== null;
    slot.age = 0;
    slot.life = 0.7 + power * 0.28;
    slot.power = power;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.flash.visible = true;
    slot.fire.visible = true;
    slot.ring.visible = true;
    slot.dust.visible = true;
    this.place(slot, 0);
  }

  update(dt: number): void {
    let ripple: Slot | null = null;
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.age += dt;
      if (slot.age >= slot.life) {
        this.hide(slot);
        continue;
      }
      this.place(slot, slot.age / slot.life);
      if (slot.distort && slot.age < 0.48 && (!ripple || slot.power > ripple.power)) ripple = slot;
    }
    if (ripple) this.ripple?.arm(ripple);
    else this.ripple?.clear();
  }

  /**
   * Draws the scene, rippling it when a big blast is on screen.
   * Returns false when the caller should draw the scene the normal way.
   */
  present(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): boolean {
    return this.ripple?.present(renderer, scene, camera) ?? false;
  }

  resize(width: number, height: number): void {
    this.ripple?.resize(width, height);
  }

  clear(): void {
    for (const slot of this.slots) this.hide(slot);
    this.ripple?.clear();
  }

  dispose(): void {
    this.clear();
    this.sphere.dispose();
    this.ringGeo.dispose();
    for (const slot of this.slots) {
      slot.flashMat.dispose();
      slot.fireMat.dispose();
      slot.ringMat.dispose();
      slot.dustMat.dispose();
    }
    this.ripple?.dispose();
  }

  private makeSlot(): Slot {
    const flashMat = new MeshBasicMaterial({ color: "#fff6d0", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
    const fireMat = new MeshBasicMaterial({ color: "#ff6a12", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
    const ringMat = new MeshBasicMaterial({ color: "#ffe29a", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
    const dustMat = new MeshBasicMaterial({ color: "#d2c0a4", transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const flash = new Mesh(this.sphere, flashMat);
    const fire = new Mesh(this.sphere, fireMat);
    const ring = new Mesh(this.ringGeo, ringMat);
    const dust = new Mesh(this.ringGeo, dustMat);
    for (const mesh of [flash, fire, ring, dust]) {
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 6;
      this.group.add(mesh);
    }
    flash.renderOrder = 8;
    return { active: false, distort: false, age: 0, life: 1, power: 1, x: 0, y: 0, z: 0, flash, fire, ring, dust, flashMat, fireMat, ringMat, dustMat };
  }

  private hide(slot: Slot): void {
    slot.active = false;
    slot.distort = false;
    slot.flash.visible = false;
    slot.fire.visible = false;
    slot.ring.visible = false;
    slot.dust.visible = false;
  }

  private place(slot: Slot, t: number): void {
    const p = slot.power;
    const y = slot.y + 0.4;
    const flashT = Math.min(1, slot.age / 0.16);
    slot.flash.visible = slot.age < 0.16;
    slot.flash.position.set(slot.x, y + 1.1, slot.z);
    const flashSize = (0.6 + p * 1.4) * (1 + flashT * 7);
    slot.flash.scale.setScalar(flashSize);
    slot.flashMat.opacity = slot.flash.visible ? 1 - flashT : 0;

    const fireSize = (0.7 + p * 1.6) * (1 + t * 4.2);
    slot.fire.position.set(slot.x, y + 0.8 + t * 1.6, slot.z);
    slot.fire.scale.setScalar(fireSize);
    slot.fireMat.opacity = (1 - t) * (0.55 + p * 0.4);

    const ringSize = t * (7 + p * 11);
    slot.ring.position.set(slot.x, slot.y + 0.35, slot.z);
    slot.ring.scale.setScalar(Math.max(0.01, ringSize));
    slot.ringMat.opacity = (1 - t) * 0.8;

    const dustT = Math.min(1, Math.max(0, (slot.age - 0.08) / (slot.life - 0.08)));
    slot.dust.position.set(slot.x, slot.y + 0.2, slot.z);
    slot.dust.scale.setScalar(Math.max(0.01, dustT * (5 + p * 7)));
    slot.dustMat.opacity = (1 - dustT) * 0.45;
  }
}

/** One expanding ripple over the whole picture. Only the strongest live blast drives it. */
class Ripple {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: ShaderMaterial;
  private readonly quad: Mesh;
  private target: WebGLRenderTarget | null = null;
  private width = 0;
  private height = 0;
  private armed = false;
  private age = 0;
  private power = 0;
  private x = 0;
  private y = 0;
  private z = 0;
  private readonly center = new Vector3();

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uCenter: { value: new Vector2(0.5, 0.5) },
        uRadius: { value: 0.1 },
        uWidth: { value: 0.06 },
        uStrength: { value: 0 },
      },
      vertexShader: RIPPLE_VERT,
      fragmentShader: RIPPLE_FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  warm(renderer: WebGLRenderer): void {
    this.resize(8, 8);
    renderer.compile(this.scene, this.camera);
  }

  arm(slot: Slot): void {
    this.armed = true;
    this.age = slot.age;
    this.power = slot.power;
    this.x = slot.x;
    this.y = slot.y + 1.2;
    this.z = slot.z;
  }

  clear(): void {
    this.armed = false;
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (this.target && this.width === w && this.height === h) return;
    this.target?.dispose();
    this.target = new WebGLRenderTarget(w, h, { depthBuffer: true, minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false });
    this.width = w;
    this.height = h;
  }

  present(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): boolean {
    if (!this.armed || !this.target || this.power < 0.2) return false;
    camera.updateMatrixWorld();
    this.center.set(this.x, this.y, this.z).project(camera);
    if (this.center.z > 1) return false;
    const u = clamp01(this.age / 0.42);
    const uniforms = this.material.uniforms;
    (uniforms.uCenter.value as Vector2).set(this.center.x * 0.5 + 0.5, this.center.y * 0.5 + 0.5);
    uniforms.uRadius.value = 0.02 + u * 0.7;
    uniforms.uWidth.value = 0.04 + (1 - u) * 0.04;
    uniforms.uStrength.value = this.power * (1 - u) * 0.03;
    uniforms.tDiffuse.value = this.target.texture;
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
    return true;
  }

  dispose(): void {
    this.target?.dispose();
    this.target = null;
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
