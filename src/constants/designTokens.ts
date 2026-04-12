const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (expanded.length !== 6) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }

  const int = Number.parseInt(expanded, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

export const withOpacity = (hexColor: string, opacity: number) => {
  const [r, g, b] = hexToRgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1)})`;
};

export const COLORS = {
  background: {
    primary: "#080809",
    elevated: "#0f0f11",
    subtle: "#15151a",
    overlay: "rgba(8, 8, 9, 0.72)",
  },
  foreground: {
    primary: "#e8e8ea",
    secondary: "#6b6b70",
    tertiary: "#4f4f55",
    inverse: "#080809",
  },
  accent: {
    iceBlue: "#b8c5d6",
    frost: "#8a9bb0",
    crystal: "#d8e3ef",
  },
  border: {
    default: "rgba(255,255,255,0.04)",
    hover: "rgba(255,255,255,0.08)",
    strong: "rgba(255,255,255,0.14)",
    accent: "rgba(184,197,214,0.35)",
  },
  status: {
    success: "#7fd19f",
    warning: "#f2c879",
    danger: "#f09aa4",
    info: "#8fb8e6",
  },
  theater: {
    curtain: "#5a0f17",
    curtainDeep: "#2f060b",
    curtainShadow: "#1d0408",
    curtainHighlight: "#7e1a24",
    stage: "#170d0f",
    stageEdge: "#2b171b",
    spotlight: "#f2d59b",
    marqueeGold: "#e8be74",
  },
} as const;

export const THEATER_THEME = {
  curtainStripeOpacity: 0.18,
  curtainGlowOpacity: 0.22,
  stageLightOpacity: 0.16,
  backdrop: {
    top: "#2a0a10",
    middle: "#14090c",
    bottom: "#080809",
  },
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    sans: "System",
    mono: "Menlo",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    "2xl": 32,
  },
  lineHeight: {
    tight: 16,
    normal: 22,
    relaxed: 28,
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  letterSpacing: {
    tight: -0.25,
    normal: 0,
    wide: 0.3,
  },
} as const;

export const SPACING = {
  base: 4,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  padding: {
    input: 12,
    button: 14,
    card: 16,
    section: 24,
    page: 24,
  },
  gap: {
    tight: 6,
    default: 12,
    roomy: 20,
  },
} as const;

export const BORDER_RADIUS = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  pill: 999,
  button: 9,
  card: 8,
} as const;

export const SHADOWS = {
  none: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  iceGlowSm: {
    shadowColor: COLORS.accent.iceBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 0,
  },
  iceGlowMd: {
    shadowColor: COLORS.accent.iceBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 0,
  },
  theaterSpotlight: {
    shadowColor: COLORS.theater.spotlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 0,
  },
} as const;

export const ANIMATION = {
  duration: {
    fast: 120,
    normal: 200,
    slow: 320,
    slower: 500,
  },
  easing: {
    standard: "ease-in-out",
    enter: "ease-out",
    exit: "ease-in",
  },
  transition: {
    all: "all 200ms ease-in-out",
    colors: "background-color 200ms ease-in-out, border-color 200ms ease-in-out, color 200ms ease-in-out",
    transform: "transform 200ms ease-in-out",
  },
} as const;

export const Z_INDEX = {
  base: 0,
  content: 10,
  sticky: 100,
  overlay: 500,
  modal: 1000,
  toast: 1100,
  tooltip: 1200,
} as const;

export const COMPONENT_SIZES = {
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
  button: {
    sm: 34,
    md: 42,
    lg: 48,
  },
  logo: {
    sm: 20,
    md: 28,
    lg: 36,
  },
  card: {
    compact: 120,
    default: 180,
    spacious: 240,
  },
} as const;

export const LAYOUT = {
  maxWidth: {
    content: 1120,
    reading: 720,
    narrow: 540,
  },
  header: {
    height: 64,
    compactHeight: 52,
  },
  container: {
    horizontalPadding: 24,
    verticalPadding: 20,
  },
} as const;

export const OPACITY = {
  disabled: 0.4,
  subtle: 0.72,
  muted: 0.56,
  strong: 0.9,
  full: 1,
} as const;

export const BUTTON_VARIANTS = {
  primary: {
    bg: COLORS.accent.iceBlue,
    text: COLORS.foreground.inverse,
    border: "transparent",
    hover: COLORS.accent.frost,
    active: withOpacity(COLORS.accent.iceBlue, 0.86),
  },
  secondary: {
    bg: COLORS.background.elevated,
    text: COLORS.foreground.primary,
    border: COLORS.border.default,
    hover: COLORS.background.subtle,
    active: withOpacity(COLORS.background.subtle, 0.92),
  },
  ghost: {
    bg: "transparent",
    text: COLORS.foreground.primary,
    border: COLORS.border.default,
    hover: withOpacity(COLORS.accent.iceBlue, 0.08),
    active: withOpacity(COLORS.accent.iceBlue, 0.16),
  },
  destructive: {
    bg: withOpacity(COLORS.status.danger, 0.2),
    text: COLORS.status.danger,
    border: withOpacity(COLORS.status.danger, 0.4),
    hover: withOpacity(COLORS.status.danger, 0.28),
    active: withOpacity(COLORS.status.danger, 0.36),
  },
} as const;

export const TASTE_TAG_VARIANTS = {
  default: {
    bg: withOpacity(COLORS.foreground.primary, 0.08),
    text: COLORS.foreground.primary,
    border: COLORS.border.default,
  },
  accent: {
    bg: withOpacity(COLORS.accent.iceBlue, 0.14),
    text: COLORS.accent.iceBlue,
    border: COLORS.border.accent,
  },
} as const;

export const MATCH_SCORE_COLORS = {
  high: {
    bg: withOpacity("#9fe8bf", 0.16),
    text: "#9fe8bf",
    border: withOpacity("#9fe8bf", 0.34),
  },
  medium: {
    bg: withOpacity("#f0d495", 0.16),
    text: "#f0d495",
    border: withOpacity("#f0d495", 0.34),
  },
  low: {
    bg: withOpacity("#f2a5ad", 0.16),
    text: "#f2a5ad",
    border: withOpacity("#f2a5ad", 0.34),
  },
} as const;

export const ICEBERG_LOGO = {
  base: COLORS.foreground.primary,
  top: COLORS.accent.iceBlue,
  glow: COLORS.accent.crystal,
  opacity: {
    solid: 1,
    soft: 0.82,
    faint: 0.4,
  },
} as const;

export const getMatchScoreColors = (score: number) => {
  if (score >= 90) return MATCH_SCORE_COLORS.high;
  if (score >= 80) return MATCH_SCORE_COLORS.medium;
  return MATCH_SCORE_COLORS.low;
};

export const DESIGN_TOKENS = {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATION,
  Z_INDEX,
  COMPONENT_SIZES,
  LAYOUT,
  OPACITY,
  BUTTON_VARIANTS,
  TASTE_TAG_VARIANTS,
  MATCH_SCORE_COLORS,
  ICEBERG_LOGO,
  THEATER_THEME,
  withOpacity,
  getMatchScoreColors,
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
