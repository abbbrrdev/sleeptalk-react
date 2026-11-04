import type { TextStyle } from "react-native";
import type { SoundKind } from "./detector";

/**
 * "Risograph zine": cream stock, fluorescent pink and federal blue inks that
 * never quite line up, a yellow for laughs, halftone dots. Night screens print
 * the same inks on midnight paper. No gradients, no glow.
 */
export const C = {
  paper: "#F3EEE4",
  sheet: "#FBF8F1",
  ink: "#1B1A1F",
  ink2: "#46434B",
  muted: "#8A847A",
  rule: "#DDD5C7",
  blue: "#2F4FCE",
  blueSoft: "#D9DFF6",
  pink: "#FF4F9A",
  pinkSoft: "#FFD7E8",
  yellow: "#FFD43D",
  night: "#15142C",
  night2: "#24234A",
  night3: "#33315E",
  nightInk: "#EEE9FF",
  nightMuted: "#8D89B8",
} as const;

export const KIND_COLOR: Record<SoundKind, string> = {
  talk: C.pink,
  snore: C.blue,
  laugh: C.yellow,
  cough: C.ink,
  other: C.muted,
};

export const F = {
  display: "DelaGothicOne_400Regular",
  sans: "Manrope_400Regular",
  sansMed: "Manrope_500Medium",
  sansSemi: "Manrope_600SemiBold",
  sansBold: "Manrope_700Bold",
  sansXBold: "Manrope_800ExtraBold",
  mono: "MartianMono_400Regular",
  monoMed: "MartianMono_500Medium",
  monoBold: "MartianMono_700Bold",
} as const;

export const T = {
  display: { fontFamily: F.display, fontSize: 40, lineHeight: 46, color: C.ink },
  h1: { fontFamily: F.display, fontSize: 30, lineHeight: 36, color: C.ink },
  h2: { fontFamily: F.display, fontSize: 21, lineHeight: 27, color: C.ink },
  h3: { fontFamily: F.sansBold, fontSize: 16.5, lineHeight: 22, color: C.ink },
  body: { fontFamily: F.sansMed, fontSize: 16, lineHeight: 23, color: C.ink2 },
  small: { fontFamily: F.sansMed, fontSize: 13.5, lineHeight: 19, color: C.muted },
  label: { fontFamily: F.monoMed, fontSize: 10, lineHeight: 14, letterSpacing: 1, textTransform: "uppercase", color: C.muted },
} satisfies Record<string, TextStyle>;

export const RADIUS = 14;
