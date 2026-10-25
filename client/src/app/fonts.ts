import localFont from "next/font/local";

/**
 * Fonts are self-hosted from npm (@fontsource-variable), so builds never depend on Google Fonts.
 *
 * Fraunces: a "soft" variable serif. Its SOFT axis rounds the letterforms like piped icing and
 * its WONK axis adds a hand-made lean. We animate SOFT and weight in the hero headline.
 * DM Sans: a quiet, legible sans for everything functional (prices, buttons, forms).
 */
export const fraunces = localFont({
  src: "../../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2",
  variable: "--font-display",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const dmSans = localFont({
  src: "../../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-normal.woff2",
  variable: "--font-body",
  weight: "100 1000",
  display: "swap",
  preload: true,
});
