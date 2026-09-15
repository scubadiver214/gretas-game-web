"use client";

import { Component, Suspense, type ReactNode } from "react";
import { GltfCharacter, preloadCharacterModels } from "./GltfCharacter";
import { PrimitiveCharacter, type CharacterProps } from "./PrimitiveCharacter";

export type { CharacterPose, CharacterProps } from "./PrimitiveCharacter";

preloadCharacterModels();

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[character] glTF model failed to load, using primitive rig", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The player's character: an animated glTF model, with the primitive rig shown
 * instantly while the model streams in and kept if loading fails (offline, etc).
 */
export function Character(props: CharacterProps) {
  const fallback = <PrimitiveCharacter {...props} />;
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GltfCharacter {...props} />
      </Suspense>
    </ModelBoundary>
  );
}
