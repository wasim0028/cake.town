import styles from "./Wordmark.module.css";

/**
 * The caketown wordmark, set in Fraunces at full softness, with "town" in caramel and a
 * little cherry sitting on its "t", the one flourish in the brand.
 */
export function Wordmark({ size = "md", tone }: { size?: "md" | "lg"; tone?: "inverse" }) {
  return (
    <span className={`${styles.mark} ${styles[size]}`} data-tone={tone}>
      cake
      <span className={styles.k}>
        town
        <svg viewBox="0 0 12 14" className={styles.cherry} aria-hidden>
          <path d="M6 5 Q7 1 11 0.5" stroke="#5F7A4E" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <circle cx="5.5" cy="9" r="4.5" fill="#B2443A" />
          <circle cx="4" cy="7.6" r="1.2" fill="#fff" opacity="0.5" />
        </svg>
      </span>
    </span>
  );
}
