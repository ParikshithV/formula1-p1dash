export const colors = {
  bg: "#0B0B0F",
  surface: "#15151C",
  surfaceAlt: "#1E1E28",
  surfaceRaised: "#262632",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#F5F5F7",
  textMuted: "#A0A0AB",
  textDim: "#62626E",
  accent: "#E10600",
  accentSoft: "rgba(225,6,0,0.14)",
  live: "#2ED47A",
  gold: "#F5C542",
  silver: "#C9CED6",
  bronze: "#D08A4E",
} as const;

export const fonts = {
  light: "TitilliumWeb-Light",
  regular: "TitilliumWeb-Regular",
  semibold: "TitilliumWeb-SemiBold",
  bold: "TitilliumWeb-Bold",
  black: "TitilliumWeb-Black",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export const type = {
  display: { fontFamily: fonts.black, fontSize: 34, lineHeight: 40, color: colors.text },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.text },
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  caption: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    color: colors.textDim,
  },
} as const;

export const podiumColor = (position: number) =>
  position === 1 ? colors.gold : position === 2 ? colors.silver : position === 3 ? colors.bronze : colors.textDim;
