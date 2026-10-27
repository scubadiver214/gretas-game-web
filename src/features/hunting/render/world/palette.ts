import { Color, Vector3 } from "three";
import { SUN_DIR } from "../../config";

/** Sky and light colours for the lakeside (sRGB hex, converted to linear by three.js). */
export const LAKESIDE = {
  zenith: new Color("#1d6ad6"),
  horizon: new Color("#b2dbf7"),
  ground: new Color("#56683f"),
  sun: new Color("#fff2d8"),
  fog: new Color("#c4dcf2"),
  fogDensity: 0.00095,
  waterShallow: new Color("#38a9c2"),
  waterDeep: new Color("#0f5f92"),
  foam: new Color("#e9f6f4"),
  hemiSky: new Color("#cfe6ff"),
  hemiGround: new Color("#5d6d3c"),
} as const;

export const SUN_VECTOR = new Vector3(SUN_DIR.x, SUN_DIR.y, SUN_DIR.z).normalize();
