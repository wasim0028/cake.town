import styles from "./not-found.module.css";

/** A sponge that sank in the middle, with "404" piped on top. It wobbles once, sheepishly. */
export function NotFoundArt() {
  return (
    <svg viewBox="0 0 320 260" className={styles.art} aria-hidden>
      <ellipse cx="160" cy="226" rx="128" ry="16" fill="rgba(31,22,17,0.14)" />
      <ellipse cx="160" cy="214" rx="136" ry="22" fill="var(--plate-rim)" />
      <ellipse cx="160" cy="210" rx="136" ry="20" fill="var(--plate)" />
      <g className={styles.wobble}>
        <path d="M58 140 L58 196 A102 20 0 0 0 262 196 L262 140 Z" fill="#EBC98A" />
        <path d="M58 168 A102 20 0 0 0 262 168 L262 176 A102 20 0 0 1 58 176 Z" fill="#F7EBD6" />
        {/* the sunken top */}
        <path d="M58 140 C70 124 100 122 120 136 C140 150 180 150 200 136 C220 122 250 124 262 140 C250 158 70 158 58 140 Z" fill="#F7EBD6" />
        <path d="M88 134 C110 132 120 146 160 146 C200 146 210 132 232 134" stroke="#E8D5B5" strokeWidth="3" fill="none" strokeLinecap="round" />
        <text x="160" y="149" textAnchor="middle" fontFamily="var(--font-display-stack)" fontSize="30" fontWeight="700" fill="#A86A22" style={{ fontVariationSettings: '"SOFT" 100' }}>
          404
        </text>
        {/* a few crumbs that fell off */}
        <circle cx="282" cy="206" r="3" fill="#D9B07A" />
        <circle cx="292" cy="212" r="2" fill="#D9B07A" />
        <circle cx="40" cy="210" r="2.4" fill="#D9B07A" />
      </g>
    </svg>
  );
}
