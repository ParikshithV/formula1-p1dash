/**
 * Editorial, two-tone system: near-black and off-white screens, square-cut Share Tech
 * type for anything that matters, a quiet grotesk for labels, and one red accent.
 */
export const tones = {
  dark: {
    bg: "#111111",
    band: "#1B1B1B",
    text: "#FFFFFF",
    muted: "#8C8C8C",
    dim: "#555555",
    line: "#262626",
  },
  light: {
    bg: "#ECECEC",
    band: "#DFDFDF",
    text: "#0E0E0E",
    muted: "#6B6B6B",
    dim: "#A3A3A3",
    line: "#D3D3D3",
  },
} as const;

export type Tone = keyof typeof tones;
export type Palette = (typeof tones)[Tone];

export const colors = {
  ...tones.dark,
  accent: "#EC1C0E",
  live: "#2FD158",
} as const;

export const fonts = {
  /** Data, numerals, headings. */
  mono: "ShareTechMono-Regular",
  /** Large proportional display lines and readable headlines. */
  display: "ShareTech-Regular",
  body: "Inter-Regular",
  bodyMedium: "Inter-Medium",
} as const;

/** Content column: designed at 400pt wide, capped and centred beyond `maxWidth`. */
export const layout = { designWidth: 400, maxWidth: 600 } as const;

/** Spread into scroll content containers to centre the column on wide screens. */
export const frameStyle = { width: "100%", maxWidth: layout.maxWidth, alignSelf: "center" } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40, section: 64, gutter: 24 } as const;

export const type = {
  wordmark: { fontFamily: fonts.bodyMedium, fontSize: 13, letterSpacing: 7 },
  title: { fontFamily: fonts.mono, fontSize: 68, lineHeight: 74, letterSpacing: -1.5 },
  heading: { fontFamily: fonts.mono, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  valueLg: { fontFamily: fonts.mono, fontSize: 36, lineHeight: 40, letterSpacing: -0.5 },
  value: { fontFamily: fonts.mono, fontSize: 22, lineHeight: 26 },
  headline: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
} as const;

/** Shared motion tokens so every transition feels like it belongs to the same system. */
export const motion = {
  spring: { damping: 18, stiffness: 220, mass: 0.8 },
  fast: 180,
  base: 280,
  slow: 600,
  stagger: 45,
  /** Cubic-bezier control points; beziers are the one easing Reanimated layout animations support on web too. */
  easeOut: [0.33, 1, 0.68, 1],
  easeIn: [0.32, 0, 0.67, 0],
} as const;
