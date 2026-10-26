import { ImageResponse } from "next/og";
import { CakeMark } from "@/lib/og";

// iPhones ignore SVG icons, so "Add to Home Screen" gets this PNG instead.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<CakeMark size={180} />, size);
}
