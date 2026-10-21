"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { BAKE } from "../config";
import { INGREDIENT_BY_ID, type IngredientId } from "../content/ingredients";
import type { IngredientItem, Item, PizzaItem } from "../engine/types";
import { badgeTexture } from "./textures";

export const PIZZA_R = 0.34;

const GOLDEN = new Color("#D08B3A");
const DARK = new Color("#9A5A22");
const BURNT = new Color("#2B1D12");
const WRONG = new Color("#FF2A2A");

/** Evenly spread, stable positions for topping pieces (golden-angle spiral). */
function scatter(seed: number, count: number, radius: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = (i + seed * 0.61) * 2.399963;
    const r = radius * Math.sqrt((i + 0.6) / count);
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

/** Colour of the crust for a bake level (dough -> golden -> dark -> charcoal). */
export function crustColor(dough: string, bake: number, out: Color): Color {
  const raw = out.set(dough);
  if (bake <= 0) return raw;
  if (bake < BAKE.cooked) return raw.lerp(GOLDEN, bake / BAKE.cooked);
  if (bake < BAKE.warning) return raw.copy(GOLDEN).lerp(DARK, (bake - BAKE.cooked) / (BAKE.warning - BAKE.cooked));
  return raw.copy(DARK).lerp(BURNT, Math.min(1, (bake - BAKE.warning) / (BAKE.burnt - BAKE.warning)));
}

function PieceGeometry({ id, prepped = true }: { id: IngredientId; prepped?: boolean }) {
  const s = prepped ? 1.35 : 1.8;
  switch (id) {
    case "pepperoni":
      return <cylinderGeometry args={[0.055 * s, 0.055 * s, 0.018, 12]} />;
    case "mushroom":
      return <sphereGeometry args={[0.045 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />;
    case "basil":
      return <boxGeometry args={[0.07, 0.01, 0.045]} />;
    case "olive":
      return <torusGeometry args={[0.026, 0.012, 6, 12]} />;
    case "pepper":
      return <boxGeometry args={[0.09 * s, 0.015, 0.025]} />;
    case "onion":
      return <torusGeometry args={[0.04 * s, 0.007, 4, 14]} />;
    case "pineapple":
      return <boxGeometry args={[0.05 * s, 0.03, 0.05 * s]} />;
    case "ham":
      return <boxGeometry args={[0.07 * s, 0.015, 0.055 * s]} />;
    case "chicken":
      return <dodecahedronGeometry args={[0.032 * s, 0]} />;
    default:
      return <boxGeometry args={[0.03 * s, 0.03 * s, 0.03 * s]} />;
  }
}

/** Red pulse for parts no ticket wants; 0 when the part is fine. */
function wrongGlow(wrong: boolean, t: number): number {
  return wrong ? 0.35 + (0.5 + 0.5 * Math.sin(t * 8)) * 0.9 : 0;
}

function setGlow(mat: MeshStandardMaterial | null, intensity: number): void {
  if (!mat) return;
  mat.emissive.copy(WRONG);
  mat.emissiveIntensity = intensity;
}

function ToppingLayer({ id, index, wrong }: { id: IngredientId; index: number; wrong: boolean }) {
  const pieces = useMemo(() => scatter(index + 2, id === "basil" ? 5 : 7, PIZZA_R * 0.72), [id, index]);
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const glow = wrongGlow(wrong, clock.getElapsedTime());
    group.current?.children.forEach((c) => setGlow((c as Mesh).material as MeshStandardMaterial, glow));
  });
  const y = 0.058 + index * 0.008;
  return (
    <group ref={group}>
      {pieces.map(([x, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[id === "olive" || id === "onion" ? Math.PI / 2 : 0, i * 1.3, 0]} castShadow>
          <PieceGeometry id={id} />
          <meshStandardMaterial color={INGREDIENT_BY_ID[id].color} />
        </mesh>
      ))}
    </group>
  );
}

/** Floating ✓ / ✗ badge over a pizza on the counter. */
function FeedbackBadge({ kind }: { kind: "ok" | "wrong" }) {
  const map = kind === "ok" ? badgeTexture("✓", "#22C55E") : badgeTexture("✗", "#EF4444");
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.42 + Math.sin(clock.getElapsedTime() * 5) * 0.03;
  });
  return (
    <group ref={ref} position={[0.26, 0.42, 0]}>
      <sprite scale={[0.26, 0.26, 0.26]} renderOrder={10}>
        <spriteMaterial map={map} depthTest={false} transparent />
      </sprite>
    </group>
  );
}

export function PizzaMesh({ pizza, wrong = [], complete = false }: { pizza: PizzaItem; wrong?: readonly IngredientId[]; complete?: boolean }) {
  const dough = INGREDIENT_BY_ID[pizza.dough];
  const crustMat = useRef<MeshStandardMaterial>(null);
  const ringMat = useRef<MeshStandardMaterial>(null);
  const sauceMat = useRef<MeshStandardMaterial>(null);
  const cheeseMat = useRef<MeshStandardMaterial>(null);
  const thick = pizza.dough === "deep" ? 0.1 : pizza.dough === "thin" ? 0.03 : 0.05;
  const wrongSet = new Set(wrong);
  const wrongDough = wrongSet.has(pizza.dough);
  const wrongSauce = !!pizza.sauce && wrongSet.has(pizza.sauce);
  const wrongCheese = !!pizza.cheese && wrongSet.has(pizza.cheese);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (const m of [crustMat.current, ringMat.current]) {
      if (!m) continue;
      crustColor(dough.color, pizza.bake, m.color);
      setGlow(m, wrongGlow(wrongDough, t) * 0.6);
    }
    setGlow(sauceMat.current, wrongGlow(wrongSauce, t));
    const cheese = cheeseMat.current;
    if (cheese && pizza.cheese) {
      cheese.color.set(INGREDIENT_BY_ID[pizza.cheese].color);
      if (pizza.bake > 0) cheese.color.lerp(GOLDEN, Math.min(0.45, pizza.bake * 0.3));
      if (pizza.bake >= BAKE.burnt) cheese.color.lerp(BURNT, 0.7);
      setGlow(cheese, wrongGlow(wrongCheese, t));
    }
  });

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, thick / 2, 0]}>
        <cylinderGeometry args={[PIZZA_R, PIZZA_R * 0.94, thick, 28]} />
        <meshStandardMaterial ref={crustMat} color={dough.color} />
      </mesh>
      <mesh position={[0, thick, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PIZZA_R - 0.02, 0.028, 6, 28]} />
        <meshStandardMaterial ref={ringMat} color={dough.color} />
      </mesh>
      {pizza.sauce && (
        <mesh position={[0, thick + 0.006, 0]}>
          <cylinderGeometry args={[PIZZA_R - 0.05, PIZZA_R - 0.05, 0.012, 28]} />
          <meshStandardMaterial ref={sauceMat} color={INGREDIENT_BY_ID[pizza.sauce].color} />
        </mesh>
      )}
      {pizza.cheese && (
        <mesh position={[0, thick + 0.016, 0]}>
          <cylinderGeometry args={[PIZZA_R - 0.08, PIZZA_R - 0.07, 0.014, 12]} />
          <meshStandardMaterial ref={cheeseMat} color={INGREDIENT_BY_ID[pizza.cheese].color} />
        </mesh>
      )}
      <group position={[0, thick - 0.05, 0]}>
        {pizza.toppings.map((t, i) => (
          <ToppingLayer key={t} id={t} index={i} wrong={wrongSet.has(t)} />
        ))}
      </group>
      {pizza.sliced &&
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[0, thick + 0.06, 0]} rotation={[0, (i * Math.PI) / 3, 0]}>
            <boxGeometry args={[PIZZA_R * 2, 0.012, 0.014]} />
            <meshStandardMaterial color="#3B2414" />
          </mesh>
        ))}
      {wrong.length > 0 ? <FeedbackBadge kind="wrong" /> : complete ? <FeedbackBadge kind="ok" /> : null}
    </group>
  );
}

/** Raw or prepped ingredient sitting on a counter / in a chef's hands. */
export function IngredientMesh({ item }: { item: IngredientItem }) {
  const def = INGREDIENT_BY_ID[item.id];
  const group = useRef<Group>(null);
  const pile = useMemo(() => scatter(item.uid, 6, 0.12), [item.uid]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    if (def.category === "dough" && !item.prepped) {
      // Flatten as it's rolled out.
      const w = item.work;
      g.scale.set(1 + w * 1.4, 1 - w * 0.75, 1 + w * 1.4);
    } else if (!item.prepped && item.work > 0) {
      g.scale.setScalar(1 - item.work * 0.35);
      g.rotation.y = item.work * 6;
    } else {
      g.scale.setScalar(1);
    }
  });

  let body: React.ReactNode;
  if (def.category === "dough") {
    body = (
      <mesh position={[0, 0.1, 0]} scale={[1, 0.75, 1]} castShadow>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color={def.color} roughness={0.9} />
      </mesh>
    );
  } else if (def.category === "sauce") {
    body = (
      <group>
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.09, 0.12, 16]} />
          <meshStandardMaterial color="#F4F1EA" />
        </mesh>
        <mesh position={[0, 0.115, 0]}>
          <cylinderGeometry args={[0.105, 0.105, 0.02, 16]} />
          <meshStandardMaterial color={def.color} />
        </mesh>
      </group>
    );
  } else if (!item.prepped) {
    const raw = def.rawColor ?? def.color;
    body =
      def.category === "cheese" ? (
        <mesh position={[0, 0.07, 0]} castShadow>
          <boxGeometry args={[0.22, 0.14, 0.16]} />
          <meshStandardMaterial color={raw} />
        </mesh>
      ) : (
        <mesh position={[0, 0.1, 0]} castShadow>
          {item.id === "pepperoni" ? <capsuleGeometry args={[0.06, 0.2, 4, 10]} /> : item.id === "ham" ? <boxGeometry args={[0.22, 0.12, 0.16]} /> : <sphereGeometry args={[0.11, 14, 10]} />}
          <meshStandardMaterial color={raw} />
        </mesh>
      );
  } else {
    body = (
      <group>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.17, 0.15, 0.03, 18]} />
          <meshStandardMaterial color="#F4F1EA" />
        </mesh>
        {pile.map(([x, z], i) => (
          <mesh key={i} position={[x, 0.05 + (i % 3) * 0.015, z]} rotation={[0, i, 0]}>
            {def.category === "cheese" ? <boxGeometry args={[0.07, 0.015, 0.02]} /> : <PieceGeometry id={item.id} />}
            <meshStandardMaterial color={def.color} />
          </mesh>
        ))}
      </group>
    );
  }
  return <group ref={group}>{body}</group>;
}

export function ItemMesh({ item, wrong, complete }: { item: Item; wrong?: readonly IngredientId[]; complete?: boolean }) {
  return item.kind === "pizza" ? <PizzaMesh pizza={item} wrong={wrong} complete={complete} /> : <IngredientMesh item={item} />;
}
