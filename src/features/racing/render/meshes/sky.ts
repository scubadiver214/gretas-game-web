import { BackSide, Color, ConeGeometry, Euler, Float32BufferAttribute, Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, Vector3, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "@/lib/rng";
import type { MeshKit } from "@/components/three/kit";
import type { RacingTextures } from "../textures";

export interface SkyTheme {
  zenith: string;
  mid: string;
  horizon: string;
  sunColor: string;
  /** Unit vector pointing at the sun. */
  sunDir: Vector3;
  /** The ring of far-off mountains: their rock colour, and whether they wear snow caps. */
  peaks: { color: string; snowCaps: boolean };
  /** How many clouds drift past, and how solid they look. */
  clouds: number;
  cloudOpacity: number;
}

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 zenith;
  uniform vec3 mid;
  uniform vec3 horizon;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    vec3 col = mix(horizon, mid, smoothstep(0.0, 0.28, h));
    col = mix(col, zenith, smoothstep(0.22, 0.95, h));
    float s = max(dot(d, normalize(sunDir)), 0.0);
    col += sunColor * (pow(s, 900.0) * 1.6 + pow(s, 14.0) * 0.28 + pow(s, 3.0) * 0.07);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** A sky dome, drifting clouds and a ring of far-off mountains. Follows the camera so the horizon never gets nearer. */
export class Sky {
  readonly group = new Group();
  private readonly clouds: { sprite: Sprite; angle: number; radius: number; speed: number }[] = [];

  constructor(theme: SkyTheme, kit: MeshKit, textures: RacingTextures) {
    const dome = new Mesh(
      kit.geo("sky-dome", () => new SphereGeometry(1900, 24, 14)),
      kit.track(
        new ShaderMaterial({
          side: BackSide,
          depthWrite: false,
          fog: false,
          uniforms: {
            zenith: { value: new Color(theme.zenith) },
            mid: { value: new Color(theme.mid) },
            horizon: { value: new Color(theme.horizon) },
            sunColor: { value: new Color(theme.sunColor) },
            sunDir: { value: theme.sunDir.clone() },
          },
          vertexShader: VERT,
          fragmentShader: FRAG,
        }),
      ),
    );
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.group.add(dome);

    const rnd = mulberry32(5);
    const cloudMat = kit.track(new SpriteMaterial({ map: textures.cloud, transparent: true, depthWrite: false, fog: false, opacity: theme.cloudOpacity }));
    for (let i = 0; i < theme.clouds; i++) {
      const sprite = new Sprite(cloudMat);
      const w = 260 + rnd() * 320;
      sprite.scale.set(w, w * 0.42, 1);
      const angle = rnd() * Math.PI * 2;
      const radius = 1100 + rnd() * 500;
      sprite.position.set(Math.cos(angle) * radius, 170 + rnd() * 240, Math.sin(angle) * radius);
      this.group.add(sprite);
      this.clouds.push({ sprite, angle, radius, speed: 0.0006 + rnd() * 0.0008 });
    }

    // Distant mountains: clusters of jagged, jittered cones merged into one mesh and fogged into the haze.
    const rock = kit.track(new MeshStandardMaterial({ color: "#ffffff", vertexColors: true, flatShading: true, roughness: 1, fog: true }));
    const baseRock = new Color(theme.peaks.color);
    const snow = new Color("#ffffff");
    const ranges = kit.geo(`far-mountains-${theme.peaks.color}-${theme.peaks.snowCaps}`, () => {
      const pieces: BufferGeometry[] = [];
      const m = new Matrix4();
      const q = new Quaternion();
      const e = new Euler();
      for (let i = 0; i < 16; i++) {
        const base = (i / 16) * Math.PI * 2 + rnd() * 0.3;
        const peaks = 3 + Math.floor(rnd() * 3);
        for (let k = 0; k < peaks; k++) {
          const g = new ConeGeometry(1, 1, 5 + Math.floor(rnd() * 3), 2);
          const pos = g.getAttribute("position");
          for (let v = 0; v < pos.count; v++) {
            const j = 1 + (rnd() - 0.5) * 0.35;
            pos.setXYZ(v, pos.getX(v) * j, pos.getY(v) * (0.9 + rnd() * 0.2), pos.getZ(v) * j);
          }
          const angle = base + (k - peaks / 2) * 0.05;
          const radius = 1250 + rnd() * 240;
          const height = 70 + rnd() * 200;
          const width = 150 + rnd() * 240;
          e.set(0, rnd() * Math.PI, 0);
          m.compose(new Vector3(Math.cos(angle) * radius, height / 2 - 6, Math.sin(angle) * radius), q.setFromEuler(e), new Vector3(width, height, width * (0.7 + rnd() * 0.5)));
          g.applyMatrix4(m);
          const flat = g.toNonIndexed();
          g.dispose();
          // Rock below, snow above the snow line (a little ragged, so it does not read as a stripe).
          const p = flat.getAttribute("position");
          const colors = new Float32Array(p.count * 3);
          const c = new Color();
          const shade = 0.88 + rnd() * 0.2;
          for (let v = 0; v < p.count; v++) {
            const up = (p.getY(v) + 6) / height;
            const line = 0.58 + Math.sin(p.getX(v) * 0.021 + p.getZ(v) * 0.017) * 0.06;
            c.copy(baseRock).multiplyScalar(shade);
            if (theme.peaks.snowCaps) c.lerp(snow, Math.min(1, Math.max(0, (up - line) * 9)));
            colors[v * 3] = c.r;
            colors[v * 3 + 1] = c.g;
            colors[v * 3 + 2] = c.b;
          }
          flat.setAttribute("color", new Float32BufferAttribute(colors, 3));
          pieces.push(flat);
        }
      }
      const merged = mergeGeometries(pieces, false);
      for (const g of pieces) g.dispose();
      return merged as BufferGeometry;
    });
    this.group.add(new Mesh(ranges, rock));
  }

  update(dt: number, camX: number, camZ: number): void {
    this.group.position.set(camX, 0, camZ);
    for (const c of this.clouds) {
      c.angle += c.speed * dt;
      c.sprite.position.x = Math.cos(c.angle) * c.radius;
      c.sprite.position.z = Math.sin(c.angle) * c.radius;
    }
  }
}
