"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Color, Mesh, Vector3, type AnimationAction, type Group, type MeshStandardMaterial } from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { CharacterId } from "@/features/player/types";
import type { CharacterPose, CharacterProps } from "./PrimitiveCharacter";

/** Height (world units) both models are normalised to; matches the primitive rig. */
const TARGET_HEIGHT = 1.8;

type ClipKey = CharacterPose | "run";

interface ModelSpec {
  url: string;
  clips: Record<ClipKey, string>;
  /** Material names that take the player's outfit colour. */
  recolor: readonly string[];
  /** Material names that take the player's hair colour. */
  hairRecolor: readonly string[];
  /** Extra Y rotation so the model faces +Z like the primitive rig. */
  facing: number;
}

/**
 * CC0 characters by Quaternius (via poly.pizza); see public/models/LICENSE.md.
 * Unused animation clips were stripped to keep the downloads small.
 */
export const MODELS: Record<CharacterId, ModelSpec> = {
  boy: {
    url: "/models/boy.glb",
    clips: {
      idle: "HumanArmature|Man_Idle",
      cook: "HumanArmature|Man_Clapping",
      bike: "HumanArmature|Man_Sitting",
      run: "HumanArmature|Man_Run",
    },
    recolor: ["Shirt"],
    hairRecolor: ["Hair"],
    facing: 0,
  },
  girl: {
    url: "/models/girl.glb",
    clips: {
      idle: "CharacterArmature|Idle",
      cook: "CharacterArmature|Interact",
      bike: "CharacterArmature|Idle_Neutral",
      run: "CharacterArmature|Run",
    },
    recolor: ["LimeGreen"], // the dress
    hairRecolor: ["Red"], // "Red" is the material name for her hair
    facing: 0,
  },
};

export function preloadCharacterModels(): void {
  if (typeof window === "undefined") return;
  for (const spec of Object.values(MODELS)) useGLTF.preload(spec.url);
}

function clipFor(spec: ModelSpec, pose: CharacterPose, pedaling: boolean): string {
  if (pose === "bike" && pedaling) return spec.clips.run;
  return spec.clips[pose];
}

/**
 * Animated glTF character. Suspends while the model loads; wrap in
 * <Suspense fallback={<PrimitiveCharacter/>}> (see Character.tsx).
 */
export function GltfCharacter({
  character,
  pose = "idle",
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pedaling = false,
  wobble = 0,
  color,
  hairColor,
}: CharacterProps) {
  const spec = MODELS[character];
  const gltf = useGLTF(spec.url);
  const root = useRef<Group>(null);
  const rig = useRef<Group>(null);

  // Each instance needs its own skeleton, and its own recolourable materials.
  const model = useMemo(() => {
    const obj = cloneSkeleton(gltf.scene) as Group;
    obj.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.frustumCulled = false; // skinned meshes report tiny rest-pose bounds
        const mat = o.material as MeshStandardMaterial;
        if (spec.recolor.includes(mat.name)) {
          const own = mat.clone();
          own.userData.recolor = true;
          o.material = own;
        } else if (spec.hairRecolor.includes(mat.name)) {
          const own = mat.clone();
          own.userData.hairRecolor = true;
          o.material = own;
        }
      }
    });
    obj.updateMatrixWorld(true);
    const box = new Box3().setFromObject(obj);
    const size = box.getSize(new Vector3());
    const fit = TARGET_HEIGHT / Math.max(0.0001, size.y);
    const center = box.getCenter(new Vector3());
    return { obj, fit, offset: new Vector3(-center.x * fit, -box.min.y * fit, -center.z * fit) };
  }, [gltf.scene, spec]);

  useEffect(() => {
    if (!color) return;
    const c = new Color(color);
    model.obj.traverse((o) => {
      if (o instanceof Mesh) {
        const mat = o.material as MeshStandardMaterial;
        if (mat.userData.recolor) mat.color.copy(c);
      }
    });
  }, [model, color]);

  useEffect(() => {
    if (!hairColor) return;
    const c = new Color(hairColor);
    model.obj.traverse((o) => {
      if (o instanceof Mesh) {
        const mat = o.material as MeshStandardMaterial;
        if (mat.userData.hairRecolor) mat.color.copy(c);
      }
    });
  }, [model, hairColor]);

  const { actions } = useAnimations(gltf.animations, rig);
  const current = useRef<AnimationAction | null>(null);
  useEffect(() => {
    const next = actions[clipFor(spec, pose, pedaling)] ?? actions[spec.clips.idle];
    if (!next || next === current.current) return;
    current.current?.fadeOut(0.25);
    next.reset().fadeIn(0.25).play();
    current.current = next;
  }, [actions, spec, pose, pedaling]);

  useFrame(({ clock }) => {
    if (root.current) root.current.rotation.z = rotation[2] + Math.sin(clock.getElapsedTime() * 18) * 0.25 * wobble;
  });

  // The primitive rig sits with bent legs; these models stand, so drop them
  // onto the pedals when riding (callers position both rigs identically).
  const poseOffsetY = pose === "bike" ? -0.48 : 0;

  return (
    <group ref={root} position={position} rotation={rotation} scale={scale}>
      <group ref={rig} rotation={[0, spec.facing, 0]} position={[0, poseOffsetY, 0]}>
        <primitive object={model.obj} position={model.offset} scale={model.fit} />
      </group>
    </group>
  );
}
