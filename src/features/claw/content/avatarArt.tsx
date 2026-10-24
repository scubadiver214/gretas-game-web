import type { AvatarArtId } from "./avatars";

/**
 * Inline SVG badges for the collectible avatars: original, simple shapes in
 * the avatar's palette so they stay crisp at any size. Locked avatars are
 * drawn as dark silhouettes.
 */

const EYE = "#14161C";

function Eyes({ y = 50, spread = 11, r = 3.2 }: { y?: number; spread?: number; r?: number }) {
  return (
    <>
      <circle cx={50 - spread} cy={y} r={r} fill={EYE} />
      <circle cx={50 + spread} cy={y} r={r} fill={EYE} />
      <circle cx={51 - spread} cy={y - 1} r={1} fill="#fff" />
      <circle cx={51 + spread} cy={y - 1} r={1} fill="#fff" />
    </>
  );
}

function Smile({ y = 60, w = 10 }: { y?: number; w?: number }) {
  return <path d={`M ${50 - w} ${y} Q 50 ${y + w * 0.9} ${50 + w} ${y}`} stroke={EYE} strokeWidth={3} fill="none" strokeLinecap="round" />;
}

function Cheeks({ y = 58, spread = 20, color = "#FF8FB1" }: { y?: number; spread?: number; color?: string }) {
  return (
    <>
      <ellipse cx={50 - spread} cy={y} rx={5} ry={3} fill={color} opacity={0.75} />
      <ellipse cx={50 + spread} cy={y} rx={5} ry={3} fill={color} opacity={0.75} />
    </>
  );
}

function Shapes({ art, body, accent }: { art: AvatarArtId; body: string; accent: string }) {
  switch (art) {
    case "bear":
      return (
        <>
          <circle cx={30} cy={32} r={11} fill={body} />
          <circle cx={70} cy={32} r={11} fill={body} />
          <circle cx={30} cy={32} r={5} fill={accent} opacity={0.5} />
          <circle cx={70} cy={32} r={5} fill={accent} opacity={0.5} />
          <circle cx={50} cy={54} r={28} fill={body} />
          <ellipse cx={50} cy={64} rx={12} ry={9} fill="#F6DCC2" />
          <ellipse cx={50} cy={60} rx={4} ry={3} fill={EYE} />
          <Eyes y={48} spread={10} />
        </>
      );
    case "slime":
      return (
        <>
          <path d="M 18 70 Q 14 36 50 28 Q 86 36 82 70 Q 70 84 50 80 Q 30 84 18 70 Z" fill={body} />
          <circle cx={36} cy={32} r={6} fill={body} />
          <circle cx={62} cy={26} r={8} fill={body} />
          <circle cx={40} cy={46} r={3} fill="#fff" opacity={0.6} />
          <Eyes y={54} spread={12} r={4} />
          <Smile y={64} w={12} />
        </>
      );
    case "unicorn":
      return (
        <>
          <polygon points="50,6 44,34 56,34" fill={accent} />
          <polygon points="30,36 36,20 44,36" fill={body} />
          <polygon points="70,36 64,20 56,36" fill={body} />
          <circle cx={50} cy={56} r={28} fill={body} />
          <path d="M 22 44 Q 30 30 42 36 Q 34 48 22 44 Z" fill={accent} />
          <path d="M 20 56 Q 26 46 38 50 Q 30 60 20 56 Z" fill="#B78AFF" />
          <Eyes y={54} spread={11} />
          <Cheeks y={62} />
          <Smile y={66} w={8} />
        </>
      );
    case "robot":
      return (
        <>
          <rect x={48} y={10} width={4} height={12} fill={accent} />
          <circle cx={50} cy={10} r={5} fill={accent} />
          <rect x={22} y={24} width={56} height={50} rx={10} fill={body} />
          <rect x={30} y={34} width={40} height={20} rx={6} fill={EYE} />
          <circle cx={40} cy={44} r={5} fill={accent} />
          <circle cx={60} cy={44} r={5} fill={accent} />
          <rect x={34} y={60} width={32} height={6} rx={3} fill={EYE} />
          <rect x={14} y={38} width={8} height={18} rx={3} fill={body} />
          <rect x={78} y={38} width={8} height={18} rx={3} fill={body} />
        </>
      );
    case "dino":
      return (
        <>
          <polygon points="36,22 42,10 48,22" fill={accent} />
          <polygon points="50,18 56,6 62,18" fill={accent} />
          <polygon points="64,24 70,14 76,26" fill={accent} />
          <ellipse cx={52} cy={54} rx={30} ry={26} fill={body} />
          <ellipse cx={58} cy={64} rx={16} ry={10} fill="#C8F560" />
          <Eyes y={48} spread={10} />
          <Smile y={62} w={9} />
          <circle cx={74} cy={60} r={2} fill={EYE} />
        </>
      );
    case "claw":
      return (
        <>
          <rect x={47} y={6} width={6} height={22} fill="#C9D2E3" />
          <path d="M 34 30 L 66 30 L 60 46 L 40 46 Z" fill={body} />
          <path d="M 40 46 Q 24 62 30 84" stroke={body} strokeWidth={7} fill="none" strokeLinecap="round" />
          <path d="M 50 46 Q 50 66 50 86" stroke={body} strokeWidth={7} fill="none" strokeLinecap="round" />
          <path d="M 60 46 Q 76 62 70 84" stroke={body} strokeWidth={7} fill="none" strokeLinecap="round" />
          <circle cx={30} cy={84} r={5} fill={accent} />
          <circle cx={50} cy={86} r={5} fill={accent} />
          <circle cx={70} cy={84} r={5} fill={accent} />
        </>
      );
    case "dragon":
      return (
        <>
          <path d="M 18 60 Q 8 40 24 30 Q 30 44 34 50 Z" fill={accent} />
          <path d="M 82 60 Q 92 40 76 30 Q 70 44 66 50 Z" fill={accent} />
          <polygon points="38,26 42,12 48,28" fill={accent} />
          <polygon points="62,26 58,12 52,28" fill={accent} />
          <circle cx={50} cy={56} r={27} fill={body} />
          <ellipse cx={50} cy={68} rx={16} ry={9} fill="#C8F560" />
          <Eyes y={50} spread={11} />
          <circle cx={46} cy={66} r={2} fill={EYE} />
          <circle cx={54} cy={66} r={2} fill={EYE} />
        </>
      );
    case "champion":
      return (
        <>
          <polygon points="50,8 58,30 82,30 63,44 70,66 50,52 30,66 37,44 18,30 42,30" fill={body} />
          <circle cx={50} cy={46} r={14} fill={accent} />
          <Eyes y={44} spread={6} r={2.4} />
          <Smile y={50} w={6} />
          <rect x={26} y={74} width={48} height={14} rx={6} fill={body} />
          <rect x={34} y={78} width={32} height={6} rx={3} fill={accent} />
        </>
      );
    case "driver":
      return (
        <>
          <path d="M 20 56 Q 20 20 50 20 Q 80 20 80 56 Z" fill={body} />
          <rect x={18} y={54} width={64} height={8} rx={4} fill={accent} />
          <rect x={26} y={34} width={48} height={16} rx={6} fill="#BFE7FF" opacity={0.85} />
          <circle cx={50} cy={70} r={16} fill="#F6C9A0" />
          <Eyes y={68} spread={7} r={2.6} />
          <Smile y={76} w={6} />
          <circle cx={50} cy={28} r={5} fill={accent} />
        </>
      );
    case "princess":
      return (
        <>
          <polygon points="26,38 34,20 42,34 50,16 58,34 66,20 74,38" fill="#FFD54D" />
          <circle cx={34} cy={21} r={3} fill={accent} />
          <circle cx={50} cy={17} r={3} fill={accent} />
          <circle cx={66} cy={21} r={3} fill={accent} />
          <circle cx={50} cy={58} r={24} fill={body} />
          <circle cx={50} cy={60} r={17} fill="#F6C9A0" />
          <Eyes y={58} spread={7} r={2.6} />
          <Cheeks y={66} spread={11} />
          <Smile y={67} w={6} />
        </>
      );
    case "astronaut":
      return (
        <>
          <circle cx={50} cy={50} r={32} fill={body} />
          <circle cx={50} cy={50} r={24} fill="#1A2238" />
          <ellipse cx={42} cy={40} rx={8} ry={5} fill="#fff" opacity={0.35} />
          <circle cx={50} cy={54} r={14} fill="#F6C9A0" />
          <Eyes y={52} spread={6} r={2.4} />
          <Smile y={59} w={5} />
          <rect x={30} y={80} width={40} height={10} rx={5} fill={accent} />
          <circle cx={78} cy={28} r={3} fill={accent} />
          <circle cx={22} cy={70} r={2} fill={accent} />
        </>
      );
    case "puppy":
      return (
        <>
          <ellipse cx={24} cy={48} rx={9} ry={16} fill={body} />
          <ellipse cx={76} cy={48} rx={9} ry={16} fill={body} />
          <circle cx={50} cy={54} r={27} fill="#E8B47A" />
          <path d="M 22 36 L 78 36 L 76 28 Q 50 14 24 28 Z" fill={accent} />
          <rect x={22} y={34} width={56} height={5} fill="#E63946" />
          <ellipse cx={50} cy={66} rx={12} ry={9} fill="#fff" />
          <ellipse cx={50} cy={62} rx={4} ry={3} fill={EYE} />
          <circle cx={39} cy={50} r={3.2} fill={EYE} />
          <circle cx={61} cy={50} r={7} fill={EYE} />
          <rect x={56} y={42} width={30} height={4} fill={EYE} transform="rotate(-8 56 42)" />
        </>
      );
    default:
      return <circle cx={50} cy={50} r={28} fill={body} />;
  }
}

export function AvatarArt({ art, palette, size = 64, locked = false, title }: { art: AvatarArtId; palette: [string, string, string]; size?: number | string; locked?: boolean; title?: string }) {
  const [bg, body, accent] = palette;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <circle cx={50} cy={50} r={48} fill={locked ? "#1B2333" : bg} />
      {/* Locked avatars are a dark silhouette: the shapes stay recognisable, the colours do not. */}
      <g style={locked ? { filter: "grayscale(1) brightness(0.32) contrast(0.6)" } : undefined}>
        <Shapes art={art} body={body} accent={accent} />
      </g>
      {locked && (
        <>
          <rect x={38} y={46} width={24} height={20} rx={4} fill="#93A5BE" />
          <path d="M 42 46 V 40 A 8 8 0 0 1 58 40 V 46" stroke="#93A5BE" strokeWidth={4} fill="none" />
        </>
      )}
    </svg>
  );
}
