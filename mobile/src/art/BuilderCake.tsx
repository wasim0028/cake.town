/**
 * Live preview for the cake designer. Any top shape (round, square, heart) is "extruded" by
 * stacking copies of it, so the side follows the outline exactly, with cream filling bands.
 * Toppings and the message are drawn on the top surface.
 */
import type { CakeFrostingId, CakeShapeId, CakeToppingId } from "@caketown/shared";
import { CAKE_FROSTINGS } from "@caketown/shared";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";

export const SPONGE_COLORS: Record<string, string> = {
  Vanilla: "#EBC98A",
  Chocolate: "#5B3424",
  "Red velvet": "#A3312C",
  Butterscotch: "#C98A45",
  Pineapple: "#F0CF6B",
  Mango: "#F2A93B",
};

/* Top outlines, centred on (0,0), already squashed for the 3/4 view. */
const SHAPES: Record<CakeShapeId, string> = {
  round: "M-110 0 A110 44 0 1 0 110 0 A110 44 0 1 0 -110 0 Z",
  square:
    "M-92 -38 Q-92 -44 -84 -44 L84 -44 Q92 -44 92 -38 L104 38 Q105 46 96 46 L-96 46 Q-105 46 -104 38 Z",
  heart:
    "M0 -14 C-14 -46 -112 -50 -112 -4 C-112 26 -54 40 0 56 C54 40 112 26 112 -4 C112 -50 14 -46 0 -14 Z",
};

/** Points on the top surface where toppings sit (same for every shape, all inside its outline). */
const SLOTS: Record<CakeToppingId, [number, number][]> = {
  berries: [[-62, -6], [-48, 10], [58, -4], [70, 10], [-8, 26]],
  "chocolate-shards": [[-30, -18], [30, -20], [0, -26]],
  sprinkles: Array.from({ length: 26 }, (_, i) => [((i * 47) % 150) - 75, ((i * 23) % 50) - 22] as [number, number]),
  macarons: [[-74, 4], [76, 2], [0, 34]],
  flowers: [[-40, 18], [44, 18], [-86, -8]],
  "gold-leaf": [[14, -6], [-16, 6], [38, -14]],
};

const HEIGHT = 92;
const STEP = 3;

export function BuilderCake({
  shape,
  sponge,
  frosting,
  toppings,
  message,
}: {
  shape: CakeShapeId;
  sponge: string;
  frosting: CakeFrostingId;
  toppings: CakeToppingId[];
  message?: string;
}) {
  const outline = SHAPES[shape];
  const spongeColor = SPONGE_COLORS[sponge] ?? SPONGE_COLORS.Vanilla!;
  const frostingColor = CAKE_FROSTINGS.find((f) => f.id === frosting)?.color ?? "#F7EBD6";
  const dark = frosting === "chocolate-ganache";
  const filling = dark ? "#D9B48A" : "#FBF3E4";
  const bands = [0.36, 0.68];

  // Stack of copies from the bottom up; filling bands where the layers meet.
  const layers: { y: number; fill: string }[] = [];
  for (let y = HEIGHT; y >= 0; y -= STEP) {
    const t = y / HEIGHT;
    const isBand = bands.some((b) => Math.abs(t - b) < 0.04);
    layers.push({ y, fill: isBand ? filling : spongeColor });
  }

  return (
    <Svg viewBox="-170 -140 340 330" width="100%" height="100%" accessible accessibilityLabel={`Preview: ${shape} ${sponge.toLowerCase()} cake`}>
      <Defs>
        <LinearGradient id="bc-shade" x1="0" x2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <Stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.7" stopColor="#fff" stopOpacity="0.07" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </LinearGradient>
      </Defs>

      {/* board */}
      <Ellipse cx="0" cy={HEIGHT + 34} rx="150" ry="46" fill="#8F5F2F" />
      <Ellipse cx="0" cy={HEIGHT + 28} rx="150" ry="46" fill="#C9945A" />
      <Ellipse cx="0" cy={HEIGHT + 28} rx="134" ry="38" fill="#D7A86E" />
      <Ellipse cx="0" cy={HEIGHT + 40} rx="118" ry="24" fill="rgba(31,22,17,0.22)" />

      <G key={`${shape}-${sponge}`}>
        {/* each slice gets the same left/right shading, so the side reads as curved */}
        {layers.map((l) => (
          <G key={l.y} transform={`translate(0 ${l.y})`}>
            <Path d={outline} fill={l.fill} />
            <Path d={outline} fill="url(#bc-shade)" />
          </G>
        ))}
      </G>

      {/* frosting on top, with a little lip spilling over the edge */}
      <G key={`${shape}-${frosting}`}>
        <Path d={outline} transform="translate(0 6)" fill={frostingColor} opacity={dark ? 1 : 0.92} />
        <Path d={outline} fill={frostingColor} />
        <Path d={outline} fill="none" stroke={dark ? "#24140D" : "#E8D5B5"} strokeWidth="2" />
        <Ellipse cx="-36" cy="-16" rx="34" ry="6" fill="#fff" opacity={dark ? 0.12 : 0.35} />
      </G>

      {message && (
        <SvgText
          x="0"
          y={toppings.includes("macarons") ? 8 : 16}
          textAnchor="middle"
          fontFamily="Fraunces_600SemiBold"
          fontSize={22}
          fill={dark ? "#F7EBD6" : "#5B3424"}
          transform="scale(1 0.62)"
        >
          {message.length > 24 ? `${message.slice(0, 23)}…` : message}
        </SvgText>
      )}

      {toppings.map((t) => (
        <G key={t}>
          {SLOTS[t].map(([x, y], i) => (
            <Topping key={i} kind={t} x={x} y={y} i={i} />
          ))}
        </G>
      ))}
    </Svg>
  );
}

function Topping({ kind, x, y, i }: { kind: CakeToppingId; x: number; y: number; i: number }) {
  switch (kind) {
    case "berries":
      return (
        <G>
          <Circle cx={x} cy={y - 4} r="8" fill={i % 2 ? "#4B4E8C" : "#B2443A"} />
          <Circle cx={x - 2.5} cy={y - 6.5} r="2" fill="#fff" opacity="0.45" />
          {i % 2 === 0 && <Path d={`M${x - 3} ${y - 11} l3 -4 l3 4`} stroke="#5F7A4E" strokeWidth="2" fill="none" />}
        </G>
      );
    case "chocolate-shards":
      return (
        <G transform={`translate(${x} ${y - 14}) rotate(${(i - 1) * 18})`}>
          <Path d="M-7 14 L-4 -18 L12 -9 L9 16 Z" fill="#3A2117" />
          <Path d="M-4 -18 L12 -9 L7 -4 Z" fill="#6A4532" />
        </G>
      );
    case "sprinkles": {
      const colors = ["#E06C75", "#E9C48A", "#7FB0D9", "#9BB07F", "#C98AD9", "#F2A93B"];
      return <Rect x={x} y={y} width="8" height="3" rx="1.5" fill={colors[i % colors.length]} transform={`rotate(${(i * 61) % 180} ${x + 4} ${y + 1.5})`} />;
    }
    case "macarons": {
      const c = ["#E8A6B8", "#B9D3A0", "#F2D08A"][i % 3];
      return (
        <G transform={`translate(${x} ${y - 10})`}>
          <Ellipse cx="0" cy="8" rx="15" ry="7" fill={c} />
          <Ellipse cx="0" cy="5" rx="14" ry="3.5" fill="#FBF3E4" />
          <Ellipse cx="0" cy="1" rx="15" ry="7" fill={c} />
          <Ellipse cx="-4" cy="-1.5" rx="5" ry="2" fill="#fff" opacity="0.35" />
        </G>
      );
    }
    case "flowers":
      return (
        <G transform={`translate(${x} ${y - 4}) scale(1 0.7)`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse key={a} cx="0" cy="-8" rx="6" ry="9" fill={i % 2 ? "#F4C2CF" : "#F7EBD6"} transform={`rotate(${a})`} />
          ))}
          <Circle r="4.5" fill="#E9C48A" />
        </G>
      );
    case "gold-leaf":
      return <Path d={`M${x} ${y} l9 -5 l5 7 l-6 6 l-10 -2 z`} fill="#D9B44A" stroke="#B88E22" strokeWidth="0.8" />;
  }
}
