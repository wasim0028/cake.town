import { Cake } from "./BakeArt";
import styles from "./HeroCake.module.css";

const SPRINKLES = [
  { x: 14, y: 8, c: "#E9C48A", d: 0, r: 160, dx: -14 },
  { x: 28, y: 2, c: "#B2443A", d: 1.6, r: -120, dx: 10 },
  { x: 74, y: 6, c: "#8FA87C", d: 0.8, r: 200, dx: 16 },
  { x: 86, y: 14, c: "#E9C48A", d: 2.4, r: -180, dx: -8 },
  { x: 58, y: 0, c: "#C8893B", d: 3.1, r: 140, dx: 12 },
  { x: 40, y: 12, c: "#F7EBD6", d: 4.0, r: -90, dx: -12 },
  { x: 66, y: 18, c: "#B2443A", d: 4.6, r: 220, dx: 6 },
];

/**
 * The hero's chocolate truffle cake on a wooden stand. It floats gently (CSS), its shadow on
 * the table breathes with it, and a few sprinkles drift down. All motion stops for people
 * who prefer reduced motion.
 */
export function HeroCake() {
  return (
    <div className={styles.wrap} aria-hidden>
      <div className={styles.sprinkles}>
        {SPRINKLES.map((s, i) => (
          <span
            key={i}
            style={
              {
                left: `${s.x}%`,
                top: `${s.y}%`,
                background: s.c,
                animationDelay: `${s.d}s`,
                "--drift-r": `${s.r}deg`,
                "--drift-x": `${s.dx}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <svg viewBox="0 0 400 430" className={styles.svg}>
        <defs>
          <linearGradient id="hero-wood" x1="0" x2="1">
            <stop offset="0" stopColor="#A8743D" />
            <stop offset="0.45" stopColor="#D2A066" />
            <stop offset="1" stopColor="#9C6A36" />
          </linearGradient>
          <linearGradient id="hero-stem" x1="0" x2="1">
            <stop offset="0" stopColor="#8F5F2F" />
            <stop offset="0.5" stopColor="#C8925A" />
            <stop offset="1" stopColor="#8F5F2F" />
          </linearGradient>
        </defs>
        <ellipse className={styles.tableShadow} cx="200" cy="404" rx="120" ry="14" fill="rgba(31,22,17,0.22)" />
        <g className={styles.float}>
          {/* stand */}
          <path d="M184 326 C188 350 188 372 172 392 L228 392 C212 372 212 350 216 326 Z" fill="url(#hero-stem)" />
          <ellipse cx="200" cy="394" rx="74" ry="12" fill="#8F5F2F" />
          <ellipse cx="200" cy="390" rx="74" ry="11" fill="url(#hero-wood)" />
          <ellipse cx="200" cy="322" rx="156" ry="22" fill="#8F5F2F" />
          <ellipse cx="200" cy="316" rx="156" ry="21" fill="url(#hero-wood)" />
          <ellipse cx="200" cy="314" rx="140" ry="16" fill="#fff" opacity="0.08" />
          {/* cake */}
          <g transform="translate(30 34) scale(1.7)">
            <Cake name="Chocolate Truffle Cake" />
          </g>
        </g>
      </svg>
    </div>
  );
}
