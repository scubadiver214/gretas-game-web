"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BackSide, Mesh, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry, type Texture, type Vector3 } from "three";
import { LAKESIDE, SUN_VECTOR } from "./palette";

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w;
}`;

const FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uTime;
uniform float uClouds;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.5));
  col = mix(col, uGround, smoothstep(0.0, -0.12, h));

  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 900.0) * 6.0 + pow(sd, 18.0) * 0.22 + pow(sd, 3.0) * 0.06);

  if (h > 0.0 && uClouds > 0.0) {
    vec2 cp = d.xz / (h + 0.12) * 1.25 + vec2(uTime * 0.0045, uTime * 0.0016);
    float base = fbm(cp * 1.15);
    float detail = fbm(cp * 3.7 + 4.0);
    float c = base * 0.78 + detail * 0.32;
    float cover = smoothstep(0.5, 0.76, c) * uClouds;
    float light = fbm(cp * 1.15 + uSunDir.xz * 0.09) * 0.78 + detail * 0.32;
    float lit = clamp(0.62 + (c - light) * 3.2, 0.0, 1.0);
    vec3 shadowCol = mix(uZenith, vec3(0.62, 0.68, 0.78), 0.72);
    vec3 cloudCol = mix(shadowCol, vec3(1.05, 1.03, 1.0), lit);
    cloudCol += uSunColor * pow(sd, 6.0) * 0.25 * (1.0 - cover);
    cover *= smoothstep(0.0, 0.16, h);
    col = mix(col, cloudCol, cover * 0.97);
  }
  col = mix(col, uHorizon, exp(-max(h, 0.0) * 14.0) * 0.55);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeSkyMaterial(clouds = 1): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: LAKESIDE.zenith },
      uHorizon: { value: LAKESIDE.horizon },
      uGround: { value: LAKESIDE.ground },
      uSunDir: { value: SUN_VECTOR },
      uSunColor: { value: LAKESIDE.sun },
      uTime: { value: 0 },
      uClouds: { value: clouds },
    },
  });
}

/** Image-based lighting from the sky only (soft, cloud-free) for the gun metal and wood. */
export function useSkyEnvironment(): Texture | null {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const scene = new Scene();
    const mat = makeSkyMaterial(0.35);
    const geo = new SphereGeometry(100, 32, 16);
    scene.add(new Mesh(geo, mat));
    const rt = pmrem.fromScene(scene, 0.02, 0.1, 500);
    pmrem.dispose();
    mat.dispose();
    geo.dispose();
    return rt;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return env.texture;
}

function tickSky(material: ShaderMaterial, mesh: Mesh | null, cameraPos: Vector3, t: number): void {
  material.uniforms.uTime.value = t;
  mesh?.position.copy(cameraPos);
}

/** Sky dome that follows the camera (and therefore the reflection camera too). */
export function Sky() {
  const material = useMemo(() => makeSkyMaterial(1), []);
  const geometry = useMemo(() => new SphereGeometry(2500, 48, 24), []);
  const mesh = useRef<Mesh>(null);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );
  useFrame(({ camera, clock }) => tickSky(material, mesh.current, camera.position, clock.elapsedTime));
  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
