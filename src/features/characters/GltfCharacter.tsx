"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Color, Mesh, Vector3, type AnimationAction, type Group, type MeshStandardMaterial, type Object3D } from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { CharacterId } from "@/features/player/types";
import type { CharacterPose, CharacterProps } from "./PrimitiveCharacter";

/** Height (world units) both models are normalised to; matches the primitive rig. */
const TARGET_HEIGHT = 1.8;

type ClipKey = CharacterPose;

/** Which player choice paints a material. `outfitShade` is the outfit colour, a touch lighter. */
type Paint = "outfit" | "outfitShade" | "hair" | "skin";

interface ModelSpec {
  url: string;
  clips: Record<ClipKey, string>;
  /** Keyed by "Material" or "Mesh/Material" (the mesh form wins). */
  paint: Readonly<Record<string, Paint>>;
  /** Fixed colours for parts the player doesn't pick, same keys as `paint`. */
  tint?: Readonly<Record<string, string>>;
  /** Extra Y rotation so the model faces +Z like the primitive rig. */
  facing: number;
}

/**
 * CC0 characters by Quaternius (via poly.pizza); see public/models/LICENSE.md.
 * Both share one skeleton and clip set, so the sword from the girl's file can
 * ride on either character's back.
 */
export const MODELS: Record<CharacterId, ModelSpec> = {
  boy: {
    url: "/models/boy.glb",
    clips: {
      idle: "CharacterArmature|Idle",
      cook: "CharacterArmature|Interact",
      bike: "CharacterArmature|Idle_Neutral",
      run: "CharacterArmature|Run",
    },
    paint: { Green: "outfit", LightGreen: "outfitShade", Hair: "hair", Eyebrows: "hair", Skin: "skin" },
    tint: { Brown: "#3B2F26", Brown2: "#2B231D" },
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
    paint: { "Medieval_Body/LightBrown": "outfit", White: "hair", Skin: "skin" },
    tint: { DarkBrown: "#1D1C22", "Medieval_Feet/LightBrown": "#2A2930" },
    facing: 0,
  },
};

const SWORD_FILE = MODELS.girl.url;
const SWORD_NODE = "Sword";
const BACK_BONE = "Chest";

export function preloadCharacterModels(): void {
  if (typeof window === "undefined") return;
  for (const spec of Object.values(MODELS)) useGLTF.preload(spec.url);
}

function clipFor(spec: ModelSpec, pose: CharacterPose, pedaling: boolean): string {
  if (pose === "bike" && pedaling) return spec.clips.run;
  return spec.clips[pose];
}

function lookup<T>(table: Readonly<Record<string, T>> | undefined, o: Object3D, material: string): T | undefined {
  if (!table) return undefined;
  for (const owner of [o.name, o.parent?.name]) {
    const hit = owner ? table[`${owner}/${material}`] : undefined;
    if (hit !== undefined) return hit;
  }
  return table[material];
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
  skinColor,
}: CharacterProps) {
  const spec = MODELS[character];
  const gltf = useGLTF(spec.url);
  const swordFile = useGLTF(SWORD_FILE);
  const root = useRef<Group>(null);
  const rig = useRef<Group>(null);

  // Each instance needs its own skeleton, and its own recolourable materials.
  const model = useMemo(() => {
    const obj = cloneSkeleton(gltf.scene) as Group;
    obj.getObjectByName(SWORD_NODE)?.removeFromParent();
    obj.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.castShadow = true;
      o.frustumCulled = false; // skinned meshes report tiny rest-pose bounds
      const mat = o.material as MeshStandardMaterial;
      const paint = lookup(spec.paint, o, mat.name);
      const tint = lookup(spec.tint, o, mat.name);
      if (!paint && !tint) return;
      const own = mat.clone();
      if (paint) own.userData.paint = paint;
      if (tint) own.color.set(tint);
      o.material = own;
    });
    obj.updateMatrixWorld(true);
    const box = new Box3().setFromObject(obj);
    const size = box.getSize(new Vector3());
    const fit = TARGET_HEIGHT / Math.max(0.0001, size.y);
    const center = box.getCenter(new Vector3());

    // Sword slung across the back, hilt over the right shoulder. Offsets are in
    // chest-bone space, where the armature is 100x smaller than the world.
    const source = swordFile.scene.getObjectByName(SWORD_NODE);
    const chest = obj.getObjectByName(BACK_BONE);
    if (source && chest) {
      const sword = source.clone();
      sword.position.set(-0.0011, 0.0016, -0.0012);
      sword.rotation.set(0, 0, 0.6);
      sword.scale.setScalar(1);
      sword.traverse((o) => {
        if (o instanceof Mesh) {
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      chest.add(sword);
    }

    return { obj, fit, offset: new Vector3(-center.x * fit, -box.min.y * fit, -center.z * fit) };
  }, [gltf.scene, swordFile.scene, spec]);

  useEffect(() => {
    const outfit = color ? new Color(color) : null;
    const shade = outfit ? outfit.clone().offsetHSL(0, 0, 0.07) : null;
    const hair = hairColor ? new Color(hairColor) : null;
    const skin = skinColor ? new Color(skinColor) : null;
    const pick: Record<Paint, Color | null> = { outfit, outfitShade: shade, hair, skin };
    model.obj.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const mat = o.material as MeshStandardMaterial;
      const want = mat.userData.paint ? pick[mat.userData.paint as Paint] : null;
      if (want) mat.color.copy(want);
    });
  }, [model, color, hairColor, skinColor]);

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
