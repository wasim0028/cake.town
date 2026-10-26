import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "caketown: fresh baked happiness, delivered";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame footer={["Cakes made to order · eggless options", "Delivered in a slot you choose"]}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontFamily: "Fraunces", fontSize: 92, lineHeight: 1.02, letterSpacing: -2, maxWidth: 900 }}>Fresh baked happiness, delivered.</div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
