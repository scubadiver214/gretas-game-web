"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, PlaneGeometry, Vector4, type ShaderMaterial } from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { LAKE } from "../../config";
import { LAKESIDE, SUN_VECTOR } from "./palette";

const VERT = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec3 vWorld;
void main() {
  vUv = textureMatrix * vec4(position, 1.0);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/** Keep lakeDist() in step with engine/lake.ts. */
const FRAG = /* glsl */ `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform float uTime;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uFoam;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec4 uLake;
varying vec4 vUv;
varying vec3 vWorld;

float lakeDist(vec2 p) {
  vec2 d = (p - uLake.xy) / uLake.zw;
  float base = length(d);
  float a = atan(d.y, d.x);
  float wobble = 0.035 * sin(a * 3.0 + 1.3) + 0.022 * sin(a * 7.0 + 0.4) + 0.012 * sin(a * 13.0 + 2.1);
  float spit = 0.07 * exp(-(((p.x + 11.0) * (p.x + 11.0)) / 46.0 + ((p.y + 3.0) * (p.y + 3.0)) / 7.0));
  return base - wobble + spit;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec2 wave(vec2 p, vec2 dir, float freq, float amp, float speed, float t) {
  return dir * (amp * freq * cos(dot(dir, p) * freq + t * speed));
}

vec2 waveGrad(vec2 p, float t) {
  vec2 g = vec2(0.0);
  g += wave(p, normalize(vec2(0.8, 0.6)), 0.9, 0.028, 0.9, t);
  g += wave(p, normalize(vec2(-0.5, 0.86)), 1.7, 0.016, 1.4, t);
  g += wave(p, normalize(vec2(0.95, -0.3)), 3.1, 0.009, 2.1, t);
  g += wave(p, normalize(vec2(-0.2, -0.98)), 5.3, 0.005, 2.9, t);
  g += wave(p, normalize(vec2(0.62, -0.78)), 8.9, 0.0028, 3.7, t);
  g += wave(p, normalize(vec2(-0.9, 0.2)), 13.7, 0.0016, 4.6, t);
  vec2 q = p * 0.35 + vec2(t * 0.07, -t * 0.05);
  float e = 0.15;
  float n0 = vnoise(q);
  g += vec2(vnoise(q + vec2(e, 0.0)) - n0, vnoise(q + vec2(0.0, e)) - n0) * 0.22;
  return g;
}

void main() {
  vec3 toEye = cameraPosition - vWorld;
  float dist = length(toEye);
  vec3 V = toEye / dist;
  float fade = 1.0 / (1.0 + dist * 0.03);
  vec2 g = waveGrad(vWorld.xz, uTime) * (0.25 + 0.75 * fade);
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));

  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec4 uv = vUv;
  uv.xy += g * 0.36 * uv.w * (0.35 + 0.65 * fade);
  vec3 refl = texture2DProj(tDiffuse, uv).rgb;

  float ld = lakeDist(vWorld.xz);
  float shallow = smoothstep(0.95, 1.0, ld);
  vec3 body = mix(uDeep, uShallow, 0.3 + shallow * 0.5);
  float rmix = clamp(0.52 + fres * 0.6, 0.0, 0.94) * (1.0 - shallow * 0.2);
  vec3 col = mix(body, refl * vec3(0.92, 0.98, 1.02), rmix);

  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 320.0) * 2.5 + pow(max(dot(N, H), 0.0), 40.0) * 0.06;
  col += uSunColor * spec;

  float lap = smoothstep(0.982, 0.998, ld + 0.005 * sin(uTime * 1.2 + vWorld.x * 0.6 + vWorld.z * 0.4));
  col = mix(col, uFoam, lap * 0.35);

  float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const WATER_SHADER = {
  name: "LakeWater",
  uniforms: {
    color: { value: new Color(0xffffff) },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uTime: { value: 0 },
    uShallow: { value: LAKESIDE.waterShallow },
    uDeep: { value: LAKESIDE.waterDeep },
    uFoam: { value: LAKESIDE.foam },
    uSunDir: { value: SUN_VECTOR },
    uSunColor: { value: LAKESIDE.sun },
    uFogColor: { value: LAKESIDE.fog },
    uFogDensity: { value: LAKESIDE.fogDensity },
    uLake: { value: new Vector4(LAKE.cx, LAKE.cz, LAKE.rx, LAKE.rz) },
  },
  vertexShader: VERT,
  fragmentShader: FRAG,
};

/** The lake: a planar mirror with procedural ripples, Fresnel, sun glints and lapping at the shore. */
export function Water({ lowPower }: { lowPower: boolean }) {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const scale = lowPower ? 0.35 : 0.5;
  const w = Math.max(256, Math.round(size.width * dpr * scale));
  const h = Math.max(256, Math.round(size.height * dpr * scale));
  const reflector = useMemo(() => {
    const geo = new PlaneGeometry(1800, 1100);
    const r = new Reflector(geo, { textureWidth: w, textureHeight: h, clipBias: 0.002, multisample: lowPower ? 0 : 4, shader: WATER_SHADER });
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, 0, -380);
    return r;
    // Size changes are handled by setSize below; rebuilding the mirror on resize would flash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowPower]);
  useEffect(() => {
    reflector.getRenderTarget().setSize(w, h);
  }, [reflector, w, h]);
  useEffect(
    () => () => {
      reflector.geometry.dispose();
      reflector.dispose();
    },
    [reflector],
  );
  useFrame(({ clock }) => setTime(reflector, clock.elapsedTime));
  return <primitive object={reflector} />;
}

function setTime(r: Reflector, t: number): void {
  (r.material as ShaderMaterial).uniforms.uTime.value = t;
}
