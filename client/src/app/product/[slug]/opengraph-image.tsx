import { ImageResponse } from "next/og";
import { formatINR } from "@caketown/shared";
import { CakeMark, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";
import { getProduct } from "@/lib/server-api";

export const alt = "A caketown product";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

/** Product share card: name, price, short line, and the photo when there is one. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  const fonts = await ogFonts();
  if (!p) return new ImageResponse(<OgFrame><div style={{ fontFamily: "Fraunces", fontSize: 80 }}>caketown</div></OgFrame>, { ...size, fonts });
  // Ask Cloudinary for a JPEG crop so the renderer never has to decode AVIF/WebP.
  const photo = p.images[0]?.url.replace("/upload/", "/upload/f_jpg,c_fill,w_520,h_520,q_80/");
  return new ImageResponse(
    (
      <OgFrame footer={[`${p.category.name}${p.egglessOption.available || p.dietary.includes("eggless") ? " · eggless available" : ""}`, "Delivered in a slot you choose"]}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
            <div style={{ fontFamily: "Fraunces", fontSize: p.name.length > 28 ? 64 : 80, lineHeight: 1.04, letterSpacing: -1.5 }}>{p.name}</div>
            {p.shortDescription && <div style={{ fontSize: 30, color: "#6F6158", lineHeight: 1.35 }}>{p.shortDescription}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              <div style={{ display: "flex", padding: "10px 26px", borderRadius: 999, background: "#1F1611", color: "#F7F1E7", fontSize: 32, fontWeight: 600 }}>
                {p.variants.length > 1 ? `From ${formatINR(p.priceFrom)}` : formatINR(p.priceFrom)}
              </div>
              {p.rating.count > 0 && <div style={{ fontSize: 28, color: "#6F6158" }}>★ {p.rating.average.toFixed(1)} · {p.rating.count} reviews</div>}
            </div>
          </div>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} width={300} height={300} style={{ borderRadius: 999, objectFit: "cover", border: "14px solid #EFE5D3" }} alt="" />
          ) : (
            <div style={{ width: 300, height: 300, borderRadius: 999, background: "#EFE5D3", border: "14px solid #E4D6BE", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CakeMark size={170} />
            </div>
          )}
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
