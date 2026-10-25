import { Vector3 } from "three";
import type { WorldId } from "../world/track";
import type { SkyTheme } from "./meshes/sky";

/** Everything about a world's atmosphere. Props and terrain colours are built per world in render/meshes. */
export interface WorldTheme {
  id: WorldId;
  sky: SkyTheme;
  fog: { color: string; near: number; far: number };
  hemi: { sky: string; ground: string; intensity: number };
  sun: { color: string; intensity: number };
  /** Colour of the flat ground that carries on to the horizon, matching where the terrain fades out. */
  floor: string;
  /** Spray from the wheels: on the road, on the shoulders, and while drifting. */
  dust: { road: string; shoulder: string; drift: string };
  /** Falling snow around the camera (ambient, thickens in a storm). */
  snowfall: boolean;
  /** Falling rain around the camera (only during storms). */
  rainfall: boolean;
  /** Close, thick fog used at the peak of a storm. */
  storm?: { color: string; near: number; far: number; sun: number; hemi: number };
}

const DESERT_SUN = new Vector3(-0.55, 0.6, -0.58).normalize();
const WINTER_SUN = new Vector3(-0.62, 0.34, -0.7).normalize();
const ALPINE_SUN = new Vector3(-0.38, 0.82, -0.42).normalize();
const BEACH_SUN = new Vector3(-0.3, 0.74, -0.6).normalize();
const JUNGLE_SUN = new Vector3(-0.4, 0.7, -0.5).normalize();

/** World 1: warm desert afternoon, like the reference: deep blue overhead melting to peach at the horizon. */
export const DESERT_THEME: WorldTheme = {
  id: "desert",
  sky: { zenith: "#2c78d4", mid: "#6fb8f0", horizon: "#f7dcaa", sunColor: "#fff1c8", sunDir: DESERT_SUN, peaks: { color: "#b07a5c", snowCaps: false }, clouds: 16, cloudOpacity: 0.92 },
  fog: { color: "#f3d8a6", near: 240, far: 1750 },
  hemi: { sky: "#cfe8ff", ground: "#e9b878", intensity: 2.0 },
  sun: { color: "#fff0d4", intensity: 3.3 },
  floor: "#e8b66a",
  dust: { road: "#b98c5a", shoulder: "#e6c48a", drift: "#f4eee2" },
  snowfall: false,
  rainfall: false,
};

/** World 2: a crisp, hazy winter day. Low pale sun, pale-blue sky, icy mountains, snow in the air. */
export const WINTER_THEME: WorldTheme = {
  id: "winter",
  sky: { zenith: "#5d93d6", mid: "#a9cdf0", horizon: "#e8f2fb", sunColor: "#fff6e3", sunDir: WINTER_SUN, peaks: { color: "#8fa6c2", snowCaps: true }, clouds: 22, cloudOpacity: 0.95 },
  fog: { color: "#dbe8f4", near: 170, far: 1250 },
  hemi: { sky: "#dcecff", ground: "#c9dcef", intensity: 1.85 },
  sun: { color: "#fff1dc", intensity: 2.6 },
  floor: "#eef5fc",
  dust: { road: "#e8f2fb", shoulder: "#ffffff", drift: "#ffffff" },
  snowfall: true,
  rainfall: false,
  storm: { color: "#dce8f4", near: 12, far: 88, sun: 0.35, hemi: 0.62 },
};

/** World 3: a bright mountain day. Sun high and warm, deep blue sky, clear air, snowy peaks in the distance. */
export const ALPINE_THEME: WorldTheme = {
  id: "alpine",
  sky: { zenith: "#1f78ea", mid: "#5eb4ff", horizon: "#dff2ff", sunColor: "#fff8dc", sunDir: ALPINE_SUN, peaks: { color: "#7d8fae", snowCaps: true }, clouds: 11, cloudOpacity: 0.96 },
  fog: { color: "#cfe7fb", near: 360, far: 2300 },
  hemi: { sky: "#d4eaff", ground: "#86c460", intensity: 2.05 },
  sun: { color: "#fff6dc", intensity: 3.7 },
  floor: "#58b94a",
  dust: { road: "#cfcabd", shoulder: "#93c565", drift: "#f2f2ea" },
  snowfall: false,
  rainfall: false,
};

/** World 4: a hot, bright day by the sea. Turquoise sky, soft clouds, sun high over the water. */
export const BEACH_THEME: WorldTheme = {
  id: "beach",
  sky: { zenith: "#1a8fe0", mid: "#5ccaf2", horizon: "#e6f8ff", sunColor: "#fffbe0", sunDir: BEACH_SUN, peaks: { color: "#7fb0c8", snowCaps: false }, clouds: 12, cloudOpacity: 0.95 },
  fog: { color: "#d4f1fb", near: 320, far: 2100 },
  hemi: { sky: "#d6f1ff", ground: "#f0d9a0", intensity: 2.05 },
  sun: { color: "#fff4d6", intensity: 3.6 },
  floor: "#1d7fae",
  dust: { road: "#e6cf9c", shoulder: "#f3e2b4", drift: "#fff6e0" },
  snowfall: false,
  rainfall: true,
  storm: { color: "#6d8a9a", near: 16, far: 110, sun: 0.28, hemi: 0.5 },
};

/** World 5: steamy jungle. Humid green-gold haze, sunbeams through the canopy, hills fading into mist. */
export const JUNGLE_THEME: WorldTheme = {
  id: "jungle",
  sky: { zenith: "#2f86c8", mid: "#7fc4c6", horizon: "#e7f0c2", sunColor: "#fff3b8", sunDir: JUNGLE_SUN, peaks: { color: "#4f8a62", snowCaps: false }, clouds: 18, cloudOpacity: 0.9 },
  fog: { color: "#bfe0b0", near: 120, far: 1150 },
  hemi: { sky: "#d8f2d0", ground: "#4a8a3a", intensity: 1.9 },
  sun: { color: "#fff0c0", intensity: 3.0 },
  floor: "#2f7a34",
  dust: { road: "#a9744c", shoulder: "#6b8f3a", drift: "#e2d2b0" },
  snowfall: false,
  rainfall: false,
};

export const THEMES: Record<WorldId, WorldTheme> = {
  desert: DESERT_THEME,
  winter: WINTER_THEME,
  alpine: ALPINE_THEME,
  beach: BEACH_THEME,
  jungle: JUNGLE_THEME,
};
