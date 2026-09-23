"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { CharacterId } from "@/features/player/types";

export type CharacterPose = "idle" | "cook" | "bike";

export interface CharacterProps {
  character: CharacterId;
  pose?: CharacterPose;
  /** Scales the whole rig; default rig is ~1.8 units tall. */
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Set true when the bike is moving so the legs pedal. */
  pedaling?: boolean;
  /** Wobble intensity (0..1) used by delivery when hitting an obstacle. */
  wobble?: number;
  /** Outfit colour override (the player's avatar colour). */
  color?: string;
  /** Hair colour override. */
  hairColor?: string;
}

/** Hip height: legs hang below this, torso/arms/head sit above it. */
const BODY_Y = 0.6;
const SKIN = "#F6C9A0";
const EYE = "#2B2D42";
const STYLE: Record<
  CharacterId,
  { top: string; bottom: string; hair: string; shoes: string; accent: string }
> = {
  boy: { top: "#3B82F6", bottom: "#2B2D42", hair: "#5A3A1B", shoes: "#F2542D", accent: "#FDE68A" },
  girl: { top: "#E85D9A", bottom: "#7C3AED", hair: "#F2B134", shoes: "#0E9594", accent: "#FDE68A" },
};

/**
 * A simple, friendly low-poly character built entirely from primitives. Used
 * as the instant fallback while the glTF model streams in (and if it fails).
 */
export function PrimitiveCharacter({
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
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const style = { ...STYLE[character], ...(color && { top: color }), ...(hairColor && { hair: hairColor }) };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (body.current) {
      body.current.position.y = BODY_Y + (pose === "bike" ? 0 : Math.sin(t * 2.2) * 0.02);
    }
    if (root.current) {
      root.current.rotation.z = rotation[2] + Math.sin(t * 18) * 0.25 * wobble;
    }
    if (pose === "bike") {
      const speed = pedaling ? 9 : 0;
      const a = Math.sin(t * speed);
      if (leftLeg.current) leftLeg.current.rotation.x = -1.2 + a * 0.5;
      if (rightLeg.current) rightLeg.current.rotation.x = -1.2 - a * 0.5;
      if (leftArm.current) leftArm.current.rotation.x = -0.9;
      if (rightArm.current) rightArm.current.rotation.x = -0.9;
    } else if (pose === "cook") {
      // Gentle kneading motion.
      const a = Math.sin(t * 4) * 0.25;
      if (leftArm.current) leftArm.current.rotation.x = -1.1 + a;
      if (rightArm.current) rightArm.current.rotation.x = -1.1 - a;
      if (leftLeg.current) leftLeg.current.rotation.x = 0;
      if (rightLeg.current) rightLeg.current.rotation.x = 0;
    } else {
      const a = Math.sin(t * 2.2) * 0.12;
      if (leftArm.current) leftArm.current.rotation.x = a;
      if (rightArm.current) rightArm.current.rotation.x = -a;
      if (leftLeg.current) leftLeg.current.rotation.x = 0;
      if (rightLeg.current) rightLeg.current.rotation.x = 0;
    }
  });

  const lean = pose === "bike" ? 0.35 : 0;

  return (
    <group ref={root} position={position} rotation={rotation} scale={scale}>
      {/* Legs pivot at the hip (y=0.6). */}
      <group ref={leftLeg} position={[-0.13, 0.6, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <boxGeometry args={[0.18, 0.56, 0.18]} />
          <meshStandardMaterial color={style.bottom} />
        </mesh>
        <mesh position={[0, -0.58, 0.04]} castShadow>
          <boxGeometry args={[0.2, 0.1, 0.28]} />
          <meshStandardMaterial color={style.shoes} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.13, 0.6, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <boxGeometry args={[0.18, 0.56, 0.18]} />
          <meshStandardMaterial color={style.bottom} />
        </mesh>
        <mesh position={[0, -0.58, 0.04]} castShadow>
          <boxGeometry args={[0.2, 0.1, 0.28]} />
          <meshStandardMaterial color={style.shoes} />
        </mesh>
      </group>

      <group ref={body} rotation={[lean, 0, 0]} position={[0, BODY_Y, 0]}>
        {/* Torso */}
        <mesh position={[0, 0.32, 0]} castShadow>
          <boxGeometry args={[0.5, 0.62, 0.3]} />
          <meshStandardMaterial color={style.top} />
        </mesh>
        {character === "girl" && (
          <mesh position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[0.36, 0.44, 0.22, 12]} />
            <meshStandardMaterial color={style.top} />
          </mesh>
        )}
        {pose === "cook" && (
          <mesh position={[0, 0.25, 0.17]}>
            <boxGeometry args={[0.4, 0.55, 0.03]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        )}

        {/* Arms pivot at the shoulder. */}
        <group ref={leftArm} position={[-0.33, 0.58, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <boxGeometry args={[0.14, 0.5, 0.14]} />
            <meshStandardMaterial color={style.top} />
          </mesh>
          <mesh position={[0, -0.52, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.33, 0.58, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <boxGeometry args={[0.14, 0.5, 0.14]} />
            <meshStandardMaterial color={style.top} />
          </mesh>
          <mesh position={[0, -0.52, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        </group>

        {/* Head */}
        <group position={[0, 0.98, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.3, 24, 24]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.1, 0.04, 0.26]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color={EYE} />
          </mesh>
          <mesh position={[0.1, 0.04, 0.26]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color={EYE} />
          </mesh>
          {/* Smile */}
          <mesh position={[0, -0.08, 0.27]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.08, 0.016, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#C0392B" />
          </mesh>
          {/* Cheeks */}
          <mesh position={[-0.18, -0.04, 0.2]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#F7A9A8" />
          </mesh>
          <mesh position={[0.18, -0.04, 0.2]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#F7A9A8" />
          </mesh>

          {/* Hair */}
          {pose !== "bike" && (
            <mesh position={[0, 0.16, -0.02]}>
              <sphereGeometry args={[0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color={style.hair} />
            </mesh>
          )}
          {character === "girl" && (
            <>
              <mesh position={[-0.3, -0.02, -0.05]}>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshStandardMaterial color={style.hair} />
              </mesh>
              <mesh position={[0.3, -0.02, -0.05]}>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshStandardMaterial color={style.hair} />
              </mesh>
              <mesh position={[0.2, 0.26, 0.05]} rotation={[0, 0, 0.5]}>
                <boxGeometry args={[0.16, 0.08, 0.06]} />
                <meshStandardMaterial color="#F2542D" />
              </mesh>
            </>
          )}

          {/* Pose accessories */}
          {pose === "cook" && (
            <group position={[0, 0.3, 0]}>
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.22, 0.22, 0.14, 16]} />
                <meshStandardMaterial color="#FFFFFF" />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <sphereGeometry args={[0.26, 16, 12]} />
                <meshStandardMaterial color="#FFFFFF" />
              </mesh>
            </group>
          )}
          {pose === "bike" && (
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.33, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={style.accent} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}
