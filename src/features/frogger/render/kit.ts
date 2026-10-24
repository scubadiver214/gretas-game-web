import type { Texture } from "three";
import { MeshKit } from "@/components/three/kit";
import { barkTexture, grassTexture, logEndTexture, shellTexture, truckLogoTexture } from "./textures";

/**
 * Shared geometries, materials and textures for one renderer. Meshes reuse
 * these, so building a level never allocates new GPU resources, and
 * `dispose()` frees everything when the game unmounts.
 */
export class Kit extends MeshKit {
  readonly textures: { bark: Texture; logEnd: Texture; shell: Texture; truckLogo: Texture; grass: Texture };

  constructor() {
    super();
    this.textures = {
      bark: this.texture(barkTexture()),
      logEnd: this.texture(logEndTexture()),
      shell: this.texture(shellTexture()),
      truckLogo: this.texture(truckLogoTexture()),
      grass: this.texture(grassTexture()),
    };
  }
}
