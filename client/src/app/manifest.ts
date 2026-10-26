import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "caketown",
    short_name: "caketown",
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F7F1E7",
    theme_color: "#F7F1E7",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
