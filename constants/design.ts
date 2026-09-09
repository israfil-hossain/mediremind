export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 34, fontWeight: "700" as const, letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: "700" as const, letterSpacing: -0.3 },
  h1: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.2 },
  h2: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "500" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "500" as const },
};

export const accents = {
  emerald: "#10B981",
  teal: "#14B8A6",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  amber: "#F59E0B",
  rose: "#F43F5E",
  sky: "#0EA5E9",
};

export const blobs = {
  light: ["#BBF7D0", "#BAE6FD", "#DDD6FE"],
  dark: ["#0F3D33", "#12324F", "#241A4D"],
};

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

export const cardShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
};
