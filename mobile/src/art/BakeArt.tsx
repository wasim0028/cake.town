/**
 * Product illustrations for the app. Generated from the website's
 * client/src/components/art/BakeArt.tsx (same drawings, react-native-svg components).
 */
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polyline, RadialGradient, Rect, Stop } from "react-native-svg";
import type { ReactNode } from "react";

const C = {
  cream: "#F7EBD6",
  creamShade: "#E8D5B5",
  ganache: "#3A2117",
  ganacheHi: "#5E3A2A",
  choc: "#5B3424",
  red: "#A3312C",
  vanilla: "#EBC98A",
  caramel: "#C98A45",
  saffron: "#E5B556",
  mango: "#F2A93B",
  pineapple: "#F2CB4C",
  berry: "#B2443A",
  cherry: "#7E1F2A",
  blueberry: "#4B4E8C",
  pistachio: "#9BB07F",
  rose: "#D98AA0",
  crust: "#B8733A",
  crustDark: "#8A4B1F",
  golden: "#D9984A",
  pale: "#EBCB95",
  paper: "#E9D6B5",
  paperLine: "#CDB48C",
  shadow: "rgba(31,22,17,0.16)",
  honey: "#E9C48A",
};

/* ---------- helpers ---------- */

const frontY = (x: number, cx: number, rx: number, cy: number, ry: number) =>
  cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));

/** A drip of ganache/caramel along the front edge of a cake top. */
function dripPath(cx: number, cy: number, rx: number, ry: number, drips: [number, number][]) {
  const left = cx - rx;
  const right = cx + rx;
  let d = `M${left - 1} ${cy} `;
  let x = left;
  const w = rx * 0.11;
  for (const [pos, len] of drips) {
    const dx = left + pos * rx * 2;
    for (; x < dx - w / 2; x += 4) d += `L${x.toFixed(1)} ${frontY(x, cx, rx, cy, ry).toFixed(1)} `;
    const y = frontY(dx, cx, rx, cy, ry);
    d += `L${(dx - w / 2).toFixed(1)} ${y.toFixed(1)} C${(dx - w / 2).toFixed(1)} ${(y + len + w).toFixed(1)} ${(dx + w / 2).toFixed(1)} ${(y + len + w).toFixed(1)} ${(dx + w / 2).toFixed(1)} ${y.toFixed(1)} `;
    x = dx + w / 2;
  }
  for (; x <= right; x += 4) d += `L${x.toFixed(1)} ${frontY(x, cx, rx, cy, ry).toFixed(1)} `;
  d += `L${right + 1} ${cy} A${rx + 1} ${ry + 1} 0 0 0 ${left - 1} ${cy} Z`;
  return d;
}

function Shadow({ y = 162, rx = 66 }: { y?: number; rx?: number }) {
  return <Ellipse cx="100" cy={y} rx={rx} ry="9" fill={C.shadow} />;
}

function Rosette({ x, y, r = 7, fill = C.cream }: { x: number; y: number; r?: number; fill?: string }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill={fill} />
      <Path
        d={`M${x - r * 0.55} ${y} a${r * 0.55} ${r * 0.5} 0 1 1 ${r * 0.55} ${r * 0.45} a${r * 0.3} ${r * 0.28} 0 1 1 ${-r * 0.1} ${-r * 0.5}`}
        fill="none"
        stroke={C.creamShade}
        strokeWidth={r * 0.18}
        strokeLinecap="round"
      />
    </G>
  );
}

function Cherry({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  return (
    <G>
      <Path d={`M${x} ${y - r} q2 -8 7 -10`} stroke="#5E6B3A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Circle cx={x} cy={y} r={r} fill={C.cherry} />
      <Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.28} fill="#fff" opacity="0.45" />
    </G>
  );
}

function Shard({ x, y, rot = 0, s = 1 }: { x: number; y: number; rot?: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <Path d="M-4 6 L-2 -12 L7 -6 L5 8 Z" fill={C.ganache} />
      <Path d="M-2 -12 L7 -6 L4 -3 Z" fill={C.ganacheHi} />
    </G>
  );
}

/* ---------- cakes ---------- */

type Topping = "shards" | "cherries" | "crumbs" | "pineapple" | "mango" | "praline" | "rasmalai" | "photo" | "berries";

interface CakeLook {
  sponge: string;
  frosting: string;
  filling?: string;
  drip?: string;
  topping: Topping;
}

function cakeLook(name: string): CakeLook {
  const n = name.toLowerCase();
  if (n.includes("red velvet")) return { sponge: C.red, frosting: C.cream, topping: "crumbs" };
  if (n.includes("black forest")) return { sponge: C.choc, frosting: C.cream, topping: "cherries" };
  if (n.includes("pineapple")) return { sponge: C.vanilla, frosting: C.cream, topping: "pineapple" };
  if (n.includes("mango")) return { sponge: C.vanilla, frosting: C.mango, filling: "#F7D08A", topping: "mango" };
  if (n.includes("butterscotch")) return { sponge: C.caramel, frosting: C.cream, drip: C.caramel, topping: "praline" };
  if (n.includes("rasmalai")) return { sponge: C.saffron, frosting: C.cream, topping: "rasmalai" };
  if (n.includes("photo")) return { sponge: C.vanilla, frosting: C.cream, topping: "photo" };
  if (n.includes("mousse")) return { sponge: C.choc, frosting: "#2E1A12", filling: "#7A4A35", topping: "shards" };
  return { sponge: "#6B3F2A", frosting: C.ganache, filling: "#D9B48A", drip: C.ganache, topping: "shards" };
}

function CakeTopping({ topping, frosting }: { topping: Topping; frosting: string }) {
  const rim: [number, number][] = [
    [56, 76], [78, 69], [100, 66], [122, 69], [144, 76], [72, 87], [128, 87],
  ];
  const rosetteFill = frosting === C.cream ? "#FFF6E6" : C.cream;
  const rosettes = rim.slice(0, 5).map(([x, y], i) => <Rosette key={i} x={x} y={y} r={6.5} fill={rosetteFill} />);
  switch (topping) {
    case "cherries":
      return (
        <G>
          {rosettes}
          {rim.slice(0, 5).map(([x, y], i) => (
            <Cherry key={i} x={x + 1} y={y - 6} r={4.6} />
          ))}
          <Shard x={92} y={84} rot={-30} s={0.7} />
          <Shard x={110} y={85} rot={24} s={0.7} />
        </G>
      );
    case "crumbs":
      return (
        <G>
          {rosettes}
          {Array.from({ length: 22 }, (_, i) => (
            <Circle key={i} cx={66 + ((i * 37) % 70)} cy={74 + ((i * 13) % 16)} r={1.6 + (i % 3) * 0.5} fill={C.red} />
          ))}
        </G>
      );
    case "pineapple":
      return (
        <G>
          {rosettes}
          {[66, 100, 134].map((x, i) => (
            <G key={i} transform={`translate(${x} ${i === 1 ? 74 : 79})`}>
              <Path d="M-11 4 A12 12 0 0 1 11 4 Z" fill={C.pineapple} stroke="#D9A72E" strokeWidth="1.2" />
              <Path d="M-6 3 L-3 -4 M0 3 L0 -6 M6 3 L3 -4" stroke="#D9A72E" strokeWidth="1" />
            </G>
          ))}
          <Cherry x={100} y={66} r={4.5} />
        </G>
      );
    case "mango":
      return (
        <G>
          {[[70, 74], [86, 80], [104, 72], [120, 80], [134, 74], [96, 86]].map(([x, y], i) => (
            <Rect key={i} x={x! - 5} y={y! - 5} width="10" height="10" rx="2.5" fill={C.mango} stroke="#D98A1F" strokeWidth="1" transform={`rotate(${i * 17} ${x} ${y})`} />
          ))}
          <Path d="M92 66 q8 -9 16 0" stroke={C.pistachio} strokeWidth="3" fill="none" strokeLinecap="round" />
        </G>
      );
    case "praline":
      return (
        <G>
          {rosettes}
          {Array.from({ length: 14 }, (_, i) => (
            <Path key={i} d={`M${68 + ((i * 29) % 64)} ${74 + ((i * 11) % 14)} l3 -2 l2 3 z`} fill="#E3B160" />
          ))}
        </G>
      );
    case "rasmalai":
      return (
        <G>
          {[[72, 76], [100, 70], [128, 76]].map(([x, y], i) => (
            <G key={i}>
              <Ellipse cx={x} cy={y} rx="11" ry="5" fill="#FBF3E2" stroke={C.creamShade} />
              <Circle cx={x! - 3} cy={y! - 1} r="1.4" fill={C.saffron} />
              <Circle cx={x! + 3} cy={y} r="1.2" fill={C.pistachio} />
            </G>
          ))}
          {[[86, 84], [114, 85], [100, 82]].map(([x, y], i) => (
            <Path key={i} d={`M${x} ${y} q5 -6 9 0 q-4 4 -9 0`} fill={C.rose} />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <Circle key={i} cx={64 + ((i * 31) % 72)} cy={70 + ((i * 7) % 16)} r="1.5" fill={C.pistachio} />
          ))}
        </G>
      );
    case "photo":
      return (
        <G>
          <Rect x="74" y="66" width="52" height="22" rx="4" fill="#FFFDF8" stroke={C.creamShade} transform="skewX(-8)" />
          <G transform="skewX(-8)">
            <Circle cx="88" cy="73" r="3" fill={C.honey} />
            <Path d="M76 86 l12 -9 l8 6 l9 -8 l15 11 z" fill={C.pistachio} opacity="0.85" />
          </G>
          {rim.slice(0, 5).map(([x, y], i) => (i % 2 === 0 ? <Rosette key={i} x={x} y={y + 2} r={5} /> : null))}
        </G>
      );
    case "berries":
      return (
        <G>
          {rosettes}
          {[[70, 72], [95, 68], [118, 72], [140, 78]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r="4.5" fill={C.berry} />
          ))}
        </G>
      );
    case "shards":
    default:
      return (
        <G>
          {rosettes}
          <Shard x={84} y={72} rot={-14} />
          <Shard x={104} y={68} rot={8} s={1.2} />
          <Shard x={124} y={74} rot={22} />
          <Circle cx="94" cy="80" r="3.6" fill={C.berry} />
          <Circle cx="114" cy="80" r="3.2" fill={C.berry} />
          <Circle cx="100" cy="76" r="1.6" fill="#E9C48A" />
        </G>
      );
  }
}

export function Cake({ name = "", look: lookOverride }: { name?: string; look?: CakeLook }) {
  const look = lookOverride ?? cakeLook(name);
  const n = name.toLowerCase();
  if (n.includes("cheesecake")) return <Cheesecake />;
  const cx = 100;
  const rx = 62;
  const top = 78;
  const bottom = 146;
  const ry = 15;
  const filling = look.filling ?? C.cream;
  const id = `g${look.sponge.slice(1)}${look.frosting.slice(1)}`;
  return (
    <G>
      <Defs>
        <LinearGradient id={`${id}-side`} x1="0" x2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <Stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.7" stopColor="#fff" stopOpacity="0.06" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.26" />
        </LinearGradient>
      </Defs>
      <Shadow y={bottom + ry - 2} rx={70} />
      {/* body */}
      <Path d={`M${cx - rx} ${top} L${cx - rx} ${bottom} A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom} L${cx + rx} ${top} Z`} fill={look.sponge} />
      {/* filling layers */}
      {[0.38, 0.7].map((t, i) => {
        const y = top + (bottom - top) * t;
        return (
          <Path
            key={i}
            d={`M${cx - rx} ${y} A${rx} ${ry} 0 0 0 ${cx + rx} ${y} L${cx + rx} ${y + 6} A${rx} ${ry} 0 0 1 ${cx - rx} ${y + 6} Z`}
            fill={filling}
          />
        );
      })}
      <Path d={`M${cx - rx} ${top} L${cx - rx} ${bottom} A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom} L${cx + rx} ${top} Z`} fill={`url(#${id}-side)`} />
      {/* top */}
      {look.drip ? (
        <Path d={dripPath(cx, top, rx, ry, [[0.08, 10], [0.2, 20], [0.33, 8], [0.47, 26], [0.6, 12], [0.74, 22], [0.88, 9]])} fill={look.drip} />
      ) : null}
      <Ellipse cx={cx} cy={top} rx={rx} ry={ry} fill={look.drip ? look.drip : look.frosting} />
      {look.drip && look.frosting !== look.drip ? <Ellipse cx={cx} cy={top} rx={rx - 6} ry={ry - 3} fill={look.frosting} /> : null}
      <Ellipse cx={cx - 18} cy={top - 5} rx={22} ry={3} fill="#fff" opacity={look.frosting === C.cream ? 0.25 : 0.12} />
      <CakeTopping topping={look.topping} frosting={look.frosting} />
    </G>
  );
}

function Cheesecake() {
  return (
    <G>
      <Shadow y={152} rx={70} />
      <Path d="M38 108 L38 140 A62 14 0 0 0 162 140 L162 108 Z" fill="#F4E4C3" />
      <Path d="M38 132 A62 14 0 0 0 162 132 L162 140 A62 14 0 0 1 38 140 Z" fill="#B9813F" />
      <Path d="M38 108 L38 140 A62 14 0 0 0 162 140 L162 108 Z" fill="url(#cheese-side)" />
      <Defs>
        <LinearGradient id="cheese-side" x1="0" x2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0.12" />
          <Stop offset="0.4" stopColor="#000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </LinearGradient>
      </Defs>
      <Path d={dripPath(100, 108, 62, 14, [[0.12, 8], [0.3, 14], [0.52, 6], [0.7, 16], [0.88, 7]])} fill="#5B3F7A" />
      <Ellipse cx="100" cy="108" rx="62" ry="14" fill="#5B3F7A" />
      {[[74, 104], [92, 110], [110, 103], [128, 109], [100, 98], [84, 99], [118, 97]].map(([x, y], i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r="5" fill={C.blueberry} />
          <Circle cx={x! - 1.5} cy={y! - 1.5} r="1.3" fill="#fff" opacity="0.4" />
        </G>
      ))}
      <Path d="M140 102 q6 -10 12 -4" stroke={C.pistachio} strokeWidth="3" fill="none" strokeLinecap="round" />
    </G>
  );
}

/* ---------- breads ---------- */


function Sourdough() {
  return (
    <G>
      <Shadow y={152} rx={66} />
      <Defs>
        <RadialGradient id="boule" cx="0.4" cy="0.35" r="0.75">
          <Stop offset="0" stopColor="#CE8D4E" />
          <Stop offset="1" stopColor={C.crustDark} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="100" cy="112" rx="66" ry="44" fill="url(#boule)" />
      <Path d="M62 96 C82 84 116 90 138 124" stroke="#EBC48D" strokeWidth="7" fill="none" strokeLinecap="round" />
      <Path d="M64 100 C84 90 114 96 134 126" stroke={C.crustDark} strokeWidth="2" fill="none" opacity="0.6" />
      {Array.from({ length: 16 }, (_, i) => (
        <Circle key={i} cx={58 + ((i * 41) % 84)} cy={86 + ((i * 17) % 40)} r={1.4} fill="#fff" opacity="0.5" />
      ))}
    </G>
  );
}

function SandwichLoaf({ seeds = true, swirl = false }: { seeds?: boolean; swirl?: boolean }) {
  return (
    <G>
      <Shadow y={154} rx={64} />
      <Path d="M42 150 L42 104 C42 72 66 64 100 64 C134 64 158 72 158 104 L158 150 Z" fill={swirl ? "#C98A4B" : "#B97A42"} />
      <Path d="M42 104 C42 72 66 64 100 64 C134 64 158 72 158 104 C140 96 60 96 42 104 Z" fill={C.crustDark} opacity="0.55" />
      {swirl &&
        [0, 1, 2, 3].map((i) => (
          <Path key={i} d={`M${52 + i * 28} 148 C${44 + i * 28} 126 ${78 + i * 28} 112 ${66 + i * 28} 86`} stroke={C.ganache} strokeWidth="7" fill="none" strokeLinecap="round" />
        ))}
      {seeds &&
        Array.from({ length: 18 }, (_, i) => (
          <Ellipse key={i} cx={52 + ((i * 23) % 96)} cy={72 + ((i * 7) % 18)} rx="2.6" ry="1.4" fill="#EAD7AE" transform={`rotate(${i * 40} ${52 + ((i * 23) % 96)} ${72 + ((i * 7) % 18)})`} />
        ))}
    </G>
  );
}

function Focaccia() {
  return (
    <G>
      <Shadow y={152} rx={70} />
      <Rect x="32" y="84" width="136" height="64" rx="16" fill="#C9883F" />
      <Rect x="32" y="80" width="136" height="60" rx="16" fill="#E2B162" />
      {Array.from({ length: 15 }, (_, i) => (
        <Ellipse key={i} cx={46 + (i % 5) * 27} cy={92 + Math.floor(i / 5) * 18} rx="4" ry="3" fill="#C98A3E" />
      ))}
      {[[60, 100], [102, 92], [138, 112], [84, 124]].map(([x, y], i) => (
        <G key={i} stroke="#5F7A4E" strokeWidth="2" strokeLinecap="round">
          <Path d={`M${x} ${y} l14 -6`} />
          <Path d={`M${x! + 4} ${y! - 2} l-2 -5 M${x! + 8} ${y! - 3} l1 -5 M${x! + 6} ${y! - 2} l3 4`} />
        </G>
      ))}
    </G>
  );
}

function Brioche() {
  return (
    <G>
      <Shadow y={152} rx={66} />
      <Rect x="40" y="110" width="120" height="40" rx="10" fill="#A85F27" />
      {[[66, 108, 28], [100, 98, 32], [134, 108, 28]].map(([x, y, r], i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r={r} fill="#C9762E" />
          <Ellipse cx={x! - r! * 0.3} cy={y! - r! * 0.45} rx={r! * 0.45} ry={r! * 0.2} fill="#fff" opacity="0.28" />
        </G>
      ))}
    </G>
  );
}

/* ---------- pastries ---------- */

function Croissant({ almond = false }: { almond?: boolean }) {
  // A fat crescent, divided into the rolled layers by curved seams.
  const body =
    "M26 132 C30 100 64 74 100 74 C136 74 170 100 174 132 C162 126 148 124 138 132 C126 142 112 140 100 136 C88 140 74 142 62 132 C52 124 38 126 26 132 Z";
  const seams = [
    "M56 90 C64 104 66 118 62 132",
    "M78 79 C88 96 92 116 88 138",
    "M122 79 C112 96 108 116 112 138",
    "M144 90 C136 104 134 118 138 132",
  ];
  return (
    <G>
      <Shadow y={150} rx={72} />
      <Defs>
        <RadialGradient id="croissant" cx="0.45" cy="0.25" r="0.85">
          <Stop offset="0" stopColor="#F0BE6E" />
          <Stop offset="0.6" stopColor="#D08A3E" />
          <Stop offset="1" stopColor="#A2602A" />
        </RadialGradient>
      </Defs>
      <Path d={body} fill="url(#croissant)" stroke="#9A5A22" strokeWidth="1.4" strokeLinejoin="round" />
      {seams.map((d) => (
        <Path key={d} d={d} stroke="#9A5A22" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.75" />
      ))}
      <Path d="M86 86 C96 82 106 82 114 86" stroke="#fff" strokeOpacity="0.4" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M60 100 C64 96 70 92 74 92" stroke="#fff" strokeOpacity="0.3" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Path d="M126 92 C132 93 138 96 142 100" stroke="#fff" strokeOpacity="0.3" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {almond &&
        [[70, 98, -30], [86, 88, -10], [100, 84, 10], [116, 88, 30], [132, 98, 40], [94, 100, 60], [110, 100, -40], [78, 110, 20], [124, 110, -20]].map(([x, y, r], i) => (
          <Ellipse key={i} cx={x} cy={y} rx="5" ry="2.6" fill="#F4E4C8" stroke="#D3A464" strokeWidth="0.8" transform={`rotate(${r} ${x} ${y})`} />
        ))}
      {almond &&
        Array.from({ length: 18 }, (_, i) => <Circle key={`s${i}`} cx={66 + ((i * 37) % 70)} cy={84 + ((i * 13) % 30)} r="1.2" fill="#fff" opacity="0.8" />)}
    </G>
  );
}

function PainAuChocolat() {
  return (
    <G>
      <Shadow y={150} rx={64} />
      <Rect x="44" y="84" width="112" height="56" rx="16" fill="#C67F35" />
      {[0, 1, 2, 3].map((i) => (
        <Path key={i} d={`M48 ${94 + i * 12} q52 -6 104 0`} stroke="#E7B06A" strokeWidth="3" fill="none" strokeLinecap="round" />
      ))}
      <Rect x="38" y="102" width="12" height="16" rx="4" fill={C.ganache} />
      <Rect x="150" y="102" width="12" height="16" rx="4" fill={C.ganache} />
    </G>
  );
}

function CinnamonRoll() {
  const pts: string[] = [];
  for (let t = 0; t < Math.PI * 7; t += 0.2) {
    const r = 3 + t * 2.15;
    pts.push(`${(100 + r * Math.cos(t)).toFixed(1)},${(106 + r * Math.sin(t) * 0.82).toFixed(1)}`);
  }
  return (
    <G>
      <Shadow y={152} rx={62} />
      <Ellipse cx="100" cy="112" rx="56" ry="40" fill="#B9773E" />
      <Ellipse cx="100" cy="106" rx="54" ry="44" fill="#D49A5B" />
      <Polyline points={pts.join(" ")} fill="none" stroke="#8A4B1F" strokeWidth="5" strokeLinecap="round" />
      <Path d="M58 92 l14 18 l10 -22 l12 26 l10 -24 l12 24 l10 -20 l12 16" stroke="#FFF6E8" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
    </G>
  );
}

function Eclair() {
  return (
    <G>
      <Shadow y={146} rx={70} />
      <Rect x="30" y="92" width="140" height="44" rx="22" fill="#D9A35E" />
      <Rect x="30" y="86" width="140" height="28" rx="14" fill={C.ganache} />
      <Path d="M44 92 q40 -6 90 0" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[60, 84, 108, 132].map((x) => (
        <Circle key={x} cx={x} cy="100" r="1.8" fill="#E9C48A" />
      ))}
    </G>
  );
}

function Danish() {
  return (
    <G>
      <Shadow y={150} rx={60} />
      {[[78, 88], [122, 88], [78, 126], [122, 126]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r="26" fill="#DDA55E" stroke="#B9773E" strokeWidth="1.2" />
      ))}
      <Circle cx="100" cy="107" r="30" fill="#F3D27A" />
      {[[90, 100], [110, 102], [100, 116]].map(([x, y], i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r="7" fill={C.berry} />
          <Circle cx={x! - 2} cy={y! - 2} r="1.6" fill="#fff" opacity="0.45" />
        </G>
      ))}
      <Path d="M96 92 q4 -6 10 -4" stroke={C.pistachio} strokeWidth="3" fill="none" strokeLinecap="round" />
    </G>
  );
}

/* ---------- cupcakes & muffins ---------- */

function Wrapper({ fill = C.paper, line = C.paperLine }: { fill?: string; line?: string }) {
  return (
    <G>
      <Path d="M60 118 L140 118 L130 166 L70 166 Z" fill={fill} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const t = (i + 1) / 8;
        return <Path key={i} d={`M${60 + 80 * t} 118 L${70 + 60 * t} 166`} stroke={line} strokeWidth="1.6" />;
      })}
    </G>
  );
}

function Cupcake({ frosting, sponge, sprinkles = false, cherry = false }: { frosting: string; sponge: string; sprinkles?: boolean; cherry?: boolean }) {
  const shade = "rgba(0,0,0,0.08)";
  return (
    <G>
      <Shadow y={168} rx={44} />
      <Wrapper />
      <Ellipse cx="100" cy="118" rx="42" ry="8" fill={sponge} />
      <Ellipse cx="100" cy="110" rx="46" ry="15" fill={frosting} />
      <Ellipse cx="100" cy="114" rx="46" ry="11" fill={shade} />
      <Ellipse cx="100" cy="94" rx="37" ry="14" fill={frosting} />
      <Ellipse cx="100" cy="98" rx="37" ry="10" fill={shade} />
      <Ellipse cx="100" cy="79" rx="26" ry="12" fill={frosting} />
      <Path d="M86 74 Q100 46 112 72 Z" fill={frosting} />
      <Ellipse cx="90" cy="76" rx="8" ry="3" fill="#fff" opacity="0.3" />
      {sprinkles &&
        ["#E06C75", "#E9C48A", "#7FB0D9", "#9BB07F", "#C98AD9", "#F2A93B"].flatMap((col, i) => [
          <Rect key={`a${i}`} x={74 + i * 9} y={92 + (i % 2) * 14} width="6" height="2.4" rx="1.2" fill={col} transform={`rotate(${i * 50} ${77 + i * 9} ${93 + (i % 2) * 14})`} />,
          <Rect key={`b${i}`} x={84 + i * 6} y={80 - (i % 3) * 3} width="5" height="2.2" rx="1.1" fill={col} transform={`rotate(${i * 70} ${86 + i * 6} ${81})`} />,
        ])}
      {cherry && <Cherry x={102} y={58} r={6} />}
    </G>
  );
}

function Muffin() {
  return (
    <G>
      <Shadow y={168} rx={44} />
      <Wrapper fill="#F1E2C6" line="#D8C29C" />
      <Path d="M52 122 C50 74 150 74 148 122 C130 128 70 128 52 122 Z" fill="#C9884A" />
      <Path d="M58 104 C70 82 132 82 142 104" stroke="#E0A867" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" />
      {[[74, 104], [98, 96], [122, 104], [86, 114], [112, 114], [132, 114], [66, 116]].map(([x, y], i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r="5.5" fill={C.blueberry} />
          <Circle cx={x! - 1.6} cy={y! - 1.6} r="1.4" fill="#fff" opacity="0.4" />
        </G>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <Circle key={i} cx={64 + ((i * 29) % 72)} cy={92 + ((i * 11) % 22)} r="2.2" fill="#EBC48D" />
      ))}
    </G>
  );
}

/* ---------- cookies ---------- */

function ChipCookie({ x, y, r, chips = C.ganache, base = "#C88B4D", raisins = false }: { x: number; y: number; r: number; chips?: string; base?: string; raisins?: boolean }) {
  return (
    <G>
      <Circle cx={x} cy={y + r * 0.1} r={r} fill="#9A6431" />
      <Circle cx={x} cy={y} r={r} fill={base} />
      <Circle cx={x} cy={y} r={r * 0.82} fill="#fff" opacity="0.06" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = i * 2.4;
        const d = r * (0.2 + ((i * 37) % 60) / 100);
        return raisins ? (
          <Ellipse key={i} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d} rx={r * 0.09} ry={r * 0.06} fill="#4A2A1C" />
        ) : (
          <Path key={i} d={`M${x + Math.cos(a) * d} ${y + Math.sin(a) * d} l${r * 0.12} ${-r * 0.04} l${-r * 0.03} ${r * 0.12} z`} fill={chips} strokeLinejoin="round" stroke={chips} strokeWidth="2" />
        );
      })}
      {raisins &&
        Array.from({ length: 6 }, (_, i) => (
          <Path key={`o${i}`} d={`M${x - r * 0.6 + i * r * 0.22} ${y - r * 0.3 + ((i * 13) % 20)} l4 1`} stroke="#E8C990" strokeWidth="2" strokeLinecap="round" />
        ))}
    </G>
  );
}

function CookieStack({ raisins = false }: { raisins?: boolean }) {
  const base = raisins ? "#C7955A" : "#C88B4D";
  return (
    <G>
      <Shadow y={156} rx={68} />
      <ChipCookie x={66} y={90} r={32} base={base} raisins={raisins} />
      <ChipCookie x={136} y={88} r={34} base={base} raisins={raisins} />
      <ChipCookie x={100} y={116} r={44} base={base} raisins={raisins} />
    </G>
  );
}

function Biscotti() {
  return (
    <G>
      <Shadow y={152} rx={66} />
      {[44, 84, 124].map((x, i) => (
        <G key={i} transform={`rotate(${-12 + i * 4} ${x + 16} 110)`}>
          <Rect x={x} y="70" width="32" height="78" rx="10" fill="#B9813F" />
          <Rect x={x + 3} y="73" width="26" height="72" rx="8" fill="#E8C07E" />
          {[[10, 18], [18, 40], [8, 56], [20, 64]].map(([dx, dy], j) => (
            <Ellipse key={j} cx={x + dx!} cy={73 + dy!} rx="5" ry="3.4" fill="#F4E4C8" stroke="#C99A62" strokeWidth="1" />
          ))}
        </G>
      ))}
    </G>
  );
}

function Nankhatai() {
  return (
    <G>
      <Shadow y={154} rx={66} />
      {[[68, 92, 28], [134, 94, 28], [100, 120, 34]].map(([x, y, r], i) => (
        <G key={i}>
          <Circle cx={x} cy={y! + 3} r={r} fill="#C99A5A" />
          <Circle cx={x} cy={y} r={r} fill={C.pale} />
          {[0, 72, 144, 216, 288].map((a) => (
            <Path
              key={a}
              d={`M${x} ${y} m0 ${-r! * 0.28} l0 ${-r! * 0.38}`}
              transform={`rotate(${a + i * 20} ${x} ${y})`}
              stroke="#D3A464"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}
          <Circle cx={x} cy={y} r={r! * 0.16} fill={C.pistachio} />
        </G>
      ))}
    </G>
  );
}

function Macaroons() {
  return (
    <G>
      <Shadow y={152} rx={66} />
      {[[66, 104], [134, 104], [100, 122]].map(([x, y], i) => (
        <G key={i}>
          <Rect x={x! - 30} y={y! + 14} width="60" height="12" rx="6" fill={C.ganache} />
          <Path d={`M${x! - 30} ${y! + 18} C${x! - 32} ${y! - 30} ${x! + 32} ${y! - 30} ${x! + 30} ${y! + 18} Z`} fill="#F3E3C4" />
          {Array.from({ length: 7 }, (_, j) => (
            <Path key={j} d={`M${x! - 18 + j * 6} ${y! - 6 + ((j * 5) % 12)} l3 -4`} stroke="#C98A45" strokeWidth="2" strokeLinecap="round" />
          ))}
        </G>
      ))}
    </G>
  );
}

/* ---------- pick the drawing for a product ---------- */

function pick(name: string, category: string): ReactNode {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  if (c.includes("bread")) {
    if (n.includes("sourdough")) return <Sourdough />;
    if (n.includes("focaccia")) return <Focaccia />;
    if (n.includes("brioche")) return <Brioche />;
    if (n.includes("babka")) return <SandwichLoaf seeds={false} swirl />;
    return <SandwichLoaf />;
  }
  if (c.includes("pastr")) {
    if (n.includes("pain au")) return <PainAuChocolat />;
    if (n.includes("cinnamon")) return <CinnamonRoll />;
    if (n.includes("clair")) return <Eclair />;
    if (n.includes("danish")) return <Danish />;
    return <Croissant almond={n.includes("almond")} />;
  }
  if (c.includes("cupcake") || n.includes("muffin") || n.includes("cupcake")) {
    if (n.includes("muffin")) return <Muffin />;
    if (n.includes("red velvet")) return <Cupcake frosting={C.cream} sponge={C.red} cherry />;
    if (n.includes("chocolate")) return <Cupcake frosting="#4A2B1E" sponge={C.choc} sprinkles={false} cherry />;
    return <Cupcake frosting="#FBEFDD" sponge={C.vanilla} sprinkles />;
  }
  if (c.includes("cookie") || c.includes("biscuit")) {
    if (n.includes("biscotti")) return <Biscotti />;
    if (n.includes("nankhatai")) return <Nankhatai />;
    if (n.includes("macaroon")) return <Macaroons />;
    if (n.includes("oat")) return <CookieStack raisins />;
    return <CookieStack />;
  }
  return <Cake name={name} />;
}

export function BakeArt({ name, category, size = 120, title }: { name: string; category: string; size?: number; title?: string }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size} accessible={Boolean(title)} accessibilityLabel={title}>
      {pick(name, category)}
    </Svg>
  );
}

/** Category tiles reuse a representative drawing. */
export function CategoryArt({ slug, size = 96 }: { slug: string; size?: number }) {
  const map: Record<string, [string, string]> = {
    cakes: ["Chocolate Truffle Cake", "cakes"],
    breads: ["Classic Sourdough Loaf", "breads"],
    pastries: ["Butter Croissant", "pastries"],
    cupcakes: ["Red Velvet Cupcakes", "cupcakes"],
    cookies: ["Chocolate Chip Cookies", "cookies"],
  };
  const [name, cat] = map[slug] ?? ["", slug];
  return <BakeArt name={name} category={cat} size={size} />;
}

export { C as bakePalette };
