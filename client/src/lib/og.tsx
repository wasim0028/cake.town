import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

/** Shared look for social share images (1200×630): cream card, cocoa type, the cake mark. */
export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = join(process.cwd(), "assets/og");
  const [display, body, bodySemi, bodyExt, bodySemiExt] = await Promise.all(
    ["Fraunces-SemiBold", "DMSans-Regular", "DMSans-SemiBold", "DMSans-Regular-ext", "DMSans-SemiBold-ext"].map((f) => readFile(join(dir, `${f}.woff`))),
  );
  // The "-ext" files carry the ₹ sign; the renderer falls back to them for glyphs the others lack.
  return [
    { name: "Fraunces", data: display!, weight: 600 as const, style: "normal" as const },
    { name: "DM Sans", data: body!, weight: 400 as const, style: "normal" as const },
    { name: "DM Sans", data: bodySemi!, weight: 600 as const, style: "normal" as const },
    { name: "DM Sans Ext", data: bodyExt!, weight: 400 as const, style: "normal" as const },
    { name: "DM Sans Ext", data: bodySemiExt!, weight: 600 as const, style: "normal" as const },
  ];
}

export function CakeMark({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#1F1611" />
      <path d="M14 30 L14 46 A18 5 0 0 0 50 46 L50 30 Z" fill="#6B3F2A" />
      <path d="M14 37 A18 5 0 0 0 50 37 L50 40 A18 5 0 0 1 14 40 Z" fill="#D9B48A" />
      <ellipse cx="32" cy="30" rx="18" ry="5" fill="#C8893B" />
      <path d="M33 22 Q35 15 41 14" stroke="#8FA87C" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="24" r="5" fill="#B2443A" />
    </svg>
  );
}

export function OgFrame({ children, footer }: { children: ReactNode; footer?: [string, string] }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F7F1E7", color: "#1F1611", padding: 64, fontFamily: "DM Sans, DM Sans Ext" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <CakeMark size={72} />
        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 44 }}>
          cake<span style={{ color: "#A86A22" }}>town</span>
        </div>
      </div>
      {children}
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#6F6158" }}>
        <span>{footer?.[0] ?? ""}</span>
        <span>{footer?.[1] ?? ""}</span>
      </div>
    </div>
  );
}
