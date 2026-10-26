"use client";

import { useId, useMemo, useState } from "react";
import { formatINR } from "@caketown/shared";
import styles from "./RevenueChart.module.css";

interface Point {
  date: string; // YYYY-MM-DD
  revenue: number; // paise
  orders: number;
}

const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const longFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Round a max value up to a tidy axis top (₹1k, 2k, 2.5k, 5k, 10k…). */
function niceMax(v: number) {
  if (v <= 0) return 100_000;
  const rupees = v / 100;
  const pow = 10 ** Math.floor(Math.log10(rupees));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= rupees)! * pow;
  return step * 100;
}
const short = (paise: number) => {
  const r = paise / 100;
  const trim = (n: number) => String(Number(n.toFixed(2)));
  return r >= 100_000 ? `₹${trim(r / 100_000)}L` : r >= 1000 ? `₹${trim(r / 1000)}k` : `₹${trim(r)}`;
};
/** 5 gridlines when the top is 2.5 or 5 (×10ⁿ) so every tick is a round number; 4 otherwise. */
function tickCount(maxPaise: number) {
  const r = maxPaise / 100;
  const lead = r / 10 ** Math.floor(Math.log10(r));
  return lead === 2.5 || lead === 5 ? 5 : 4;
}

/**
 * Daily revenue, last 30 days. One series, so no legend: the panel title names it.
 * Bars grow from one baseline, 4px rounded tops, hover/focus tooltip, and a table view.
 */
export function RevenueChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  const W = 720;
  const H = 240;
  const pad = { top: 12, right: 8, bottom: 26, left: 48 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.revenue))), [data]);
  const band = iw / Math.max(1, data.length);
  const barW = Math.min(18, band - 2);
  const y = (v: number) => pad.top + ih - (v / max) * ih;
  const n = tickCount(max);
  const ticks = Array.from({ length: n + 1 }, (_, i) => (i / n) * max);
  const h = hover !== null ? data[hover] : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.toggle}>
        <button type="button" onClick={() => setAsTable((t) => !t)} className="text-link">
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>
      {asTable ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col" className="num">Orders</th>
                <th scope="col" className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <td>{longFmt.format(new Date(`${d.date}T12:00:00+05:30`))}</td>
                  <td className="num">{d.orders}</td>
                  <td className="num">{formatINR(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.chart}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-desc`} onMouseLeave={() => setHover(null)}>
            <desc id={`${id}-desc`}>
              Daily revenue for the last {data.length} days. Total {formatINR(data.reduce((s, d) => s + d.revenue, 0))}.
            </desc>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} className={styles.grid} />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={styles.axis}>
                  {short(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = pad.left + i * band + (band - barW) / 2;
              const top = y(d.revenue);
              const hgt = pad.top + ih - top;
              const r = Math.min(4, hgt / 2, barW / 2);
              return (
                <g key={d.date}>
                  {/* hit target: the whole column, bigger than the bar */}
                  <rect
                    x={pad.left + i * band}
                    y={pad.top}
                    width={band}
                    height={ih}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${longFmt.format(new Date(`${d.date}T12:00:00+05:30`))}: ${formatINR(d.revenue)}, ${d.orders} orders`}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className={styles.hit}
                  />
                  {hgt > 0 && (
                    <path
                      d={`M${x} ${pad.top + ih} V${top + r} Q${x} ${top} ${x + r} ${top} H${x + barW - r} Q${x + barW} ${top} ${x + barW} ${top + r} V${pad.top + ih} Z`}
                      className={styles.bar}
                      data-dim={hover !== null && hover !== i ? "" : undefined}
                      pointerEvents="none"
                    />
                  )}
                  {(i % 5 === 4 || i === data.length - 1) && (
                    <text x={pad.left + i * band + band / 2} y={H - 8} textAnchor="middle" className={styles.axis}>
                      {dayFmt.format(new Date(`${d.date}T12:00:00+05:30`))}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={pad.left} x2={W - pad.right} y1={pad.top + ih} y2={pad.top + ih} className={styles.baseline} />
          </svg>
          {h && hover !== null && (
            <div className={styles.tip} style={{ left: `${((pad.left + hover * band + band / 2) / W) * 100}%` }} role="status">
              <strong>{formatINR(h.revenue)}</strong>
              <span>
                {h.orders} order{h.orders === 1 ? "" : "s"} · {longFmt.format(new Date(`${h.date}T12:00:00+05:30`))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
