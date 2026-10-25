import type { NextConfig } from "next";

/** Where the Express API runs. The browser never calls it directly: /api/v1/* is proxied
 *  through Next.js so auth cookies stay first-party (same origin as the site). */
const API_URL = process.env.API_URL ?? "http://localhost:5000";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@caketown/shared"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API_URL}/api/v1/:path*` }];
  },
};

export default config;
