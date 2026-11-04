import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text as RNText,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "@/components/SafeArea";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
import { script } from "@/i18n";
import { C, F, RADIUS, T } from "@/lib/theme";

export const tap = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
};

// ── Text ────────────────────────────────────────────────────────────
const CJK_RE = /[぀-ヿ㐀-鿿가-힯＀-￯]/;
function hasCJK(c: ReactNode): boolean {
  if (typeof c === "string") return CJK_RE.test(c);
  if (Array.isArray(c)) return c.some(hasCJK);
  return false;
}
const CJK_WEIGHT: Record<string, TextStyle["fontWeight"]> = {
  [F.display]: "900",
  [F.sans]: "400",
  [F.sansMed]: "500",
  [F.sansSemi]: "600",
  [F.sansBold]: "700",
  [F.sansXBold]: "800",
};

/** Manrope / Dela Gothic cover Latin + Cyrillic; Korean & Chinese fall back to the system font. */
export function Text({ style, ...p }: TextProps) {
  const base = { fontFamily: F.sans, color: C.ink };
  if (script() !== "cjk" || !hasCJK(p.children)) return <RNText maxFontSizeMultiplier={1.25} {...p} style={[base, style]} />;
  const flat: TextStyle = { ...base, ...((StyleSheet.flatten(style) ?? {}) as TextStyle) };
  const w = flat.fontFamily ? CJK_WEIGHT[flat.fontFamily] : undefined;
  if (w) {
    delete flat.fontFamily;
    flat.fontWeight = w;
  }
  if (typeof flat.letterSpacing === "number" && flat.letterSpacing < 0) flat.letterSpacing = 0;
  if (w && typeof flat.fontSize === "number" && flat.fontSize >= 28) {
    flat.fontSize = Math.round(flat.fontSize * 0.86);
    if (typeof flat.lineHeight === "number") flat.lineHeight = Math.round(flat.lineHeight * 0.92);
  }
  if (typeof flat.lineHeight === "number" && typeof flat.fontSize === "number")
    flat.lineHeight = Math.max(flat.lineHeight, Math.round(flat.fontSize * 1.3));
  return <RNText maxFontSizeMultiplier={1.25} {...p} style={flat} />;
}

export function Label({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[T.label, color ? { color } : null, style]}>{children}</Text>;
}

/**
 * Risograph headline: the same text printed twice, pink plate slightly off-register
 * under the ink plate.
 */
export function Riso({ children, style, under = C.pink, color = C.ink, offset = 2.5 }: { children: ReactNode; style?: StyleProp<TextStyle>; under?: string; color?: string; offset?: number }) {
  return (
    <View>
      <Text style={[T.display, style, { color: under, position: "absolute", left: offset, top: offset * 0.8, opacity: 0.9 }]} aria-hidden>
        {children}
      </Text>
      <Text style={[T.display, style, { color }]}>{children}</Text>
    </View>
  );
}

// ── Halftone dots ───────────────────────────────────────────────────
export function Halftone({ color = C.blue, size = 6, opacity = 0.18, style }: { color?: string; size?: number; opacity?: number; style?: StyleProp<ViewStyle> }) {
  const id = `ht${color.replace("#", "")}${size}`;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size} patternTransform="rotate(15)">
            <Circle cx={size / 2} cy={size / 2} r={size * 0.22} fill={color} opacity={opacity} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

// ── Layout ──────────────────────────────────────────────────────────
export function Screen({ children, scroll = false, footer, bg = C.paper, pad = 20 }: { children: ReactNode; scroll?: boolean; footer?: ReactNode; bg?: string; pad?: number }) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: pad }}>{children}</View>
  );
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ flex: 1 }}>{body}</View>
      {footer ? (
        <View style={{ paddingHorizontal: pad, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 4 }}>{footer}</View>
      ) : (
        <View style={{ height: insets.bottom }} />
      )}
    </SafeAreaView>
  );
}

export function TopBar({ title, right, onBack, close, dark }: { title?: string; right?: ReactNode; onBack?: () => void; close?: boolean; dark?: boolean }) {
  const fg = dark ? C.nightInk : C.ink;
  return (
    <View style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Pressable
        hitSlop={14}
        accessibilityRole="button"
        onPress={() => {
          tap();
          if (onBack) onBack();
          else if (router.canGoBack()) router.back();
          else router.replace("/");
        }}
        style={{ width: 40, height: 40, justifyContent: "center" }}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          {close ? (
            <Path d="M5 5 L19 19 M19 5 L5 19" stroke={fg} strokeWidth={2.2} strokeLinecap="round" />
          ) : (
            <Path d="M15 4 L7 12 L15 20" stroke={fg} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>
      </Pressable>
      {title ? <Label color={dark ? C.nightMuted : C.ink2}>{title}</Label> : <View />}
      <View style={{ minWidth: 40, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

// ── Buttons: a pill with the pink plate printed a little off ────────
type BtnVariant = "blue" | "ink" | "pink" | "outline" | "ghost" | "moon";
const BTN: Record<BtnVariant, { bg: string; fg: string; plate: string | null; border?: string }> = {
  blue: { bg: C.blue, fg: C.sheet, plate: C.pink },
  ink: { bg: C.ink, fg: C.sheet, plate: C.pink },
  pink: { bg: C.pink, fg: C.ink, plate: C.blue },
  moon: { bg: C.nightInk, fg: C.night, plate: C.pink },
  outline: { bg: "transparent", fg: C.ink, plate: null, border: C.ink },
  ghost: { bg: "transparent", fg: C.ink2, plate: null },
};

export function Button({
  title,
  onPress,
  variant = "blue",
  disabled,
  loading,
  small,
  style,
  right,
  dark,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  right?: ReactNode;
  dark?: boolean;
}) {
  const v = BTN[variant];
  const fg = dark && (variant === "ghost" || variant === "outline") ? C.nightInk : v.fg;
  const inactive = disabled || loading;
  const h = small ? 42 : 56;
  return (
    <Pressable accessibilityRole="button" disabled={inactive} onPressIn={() => tap()} onPress={onPress} style={[{ opacity: inactive && !loading ? 0.4 : 1 }, style]}>
      {({ pressed }) => (
        <View style={{ height: h }}>
          {v.plate ? <View style={{ position: "absolute", left: 3, top: 3, right: -3, bottom: -3, borderRadius: h / 2, backgroundColor: v.plate }} /> : null}
          <View
            style={{
              flex: 1,
              borderRadius: h / 2,
              backgroundColor: v.bg,
              borderWidth: v.border ? 1.5 : 0,
              borderColor: dark ? C.nightInk : v.border,
              paddingHorizontal: small ? 18 : 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: right ? "space-between" : "center",
              transform: [{ translateX: pressed && v.plate ? 2 : 0 }, { translateY: pressed && v.plate ? 2 : 0 }],
            }}
          >
            {loading ? (
              <ActivityIndicator color={fg} />
            ) : (
              <>
                <Text style={{ fontFamily: F.sansXBold, fontSize: small ? 14.5 : 16.5, color: fg }}>{title}</Text>
                {right}
              </>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function Arrow({ color = C.sheet, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 12 H19 M13 6 L19 12 L13 18" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Lock({ color = C.muted, size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 11 V8 a5 5 0 0 1 10 0 V11" stroke={color} strokeWidth={2.6} fill="none" />
      <Path d="M5 11 H19 V21 H5 Z" fill={color} />
    </Svg>
  );
}

export function ProTag() {
  return (
    <View style={{ backgroundColor: C.yellow, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontFamily: F.monoBold, fontSize: 9.5, letterSpacing: 1, color: C.ink }}>PRO</Text>
    </View>
  );
}

export function Card({ children, style, dots }: { children: ReactNode; style?: StyleProp<ViewStyle>; dots?: string }) {
  return (
    <View style={[{ backgroundColor: C.sheet, borderRadius: RADIUS, padding: 18, overflow: "hidden" }, style]}>
      {dots ? <Halftone color={dots} /> : null}
      {children}
    </View>
  );
}

export function Row({ title, value, onPress, right }: { title: string; value?: string; onPress?: () => void; right?: ReactNode }) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => (tap(), onPress?.())}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderColor: C.rule, opacity: pressed ? 0.6 : 1, gap: 12 })}
    >
      <Text style={{ fontFamily: F.sansSemi, fontSize: 16, flex: 1 }}>{title}</Text>
      {value ? <Text style={{ fontFamily: F.monoMed, fontSize: 12, color: C.muted }}>{value}</Text> : null}
      {right}
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => (tap(), onPress())}
      style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: on ? C.ink : C.rule, backgroundColor: on ? C.ink : "transparent" }}
    >
      <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: on ? C.sheet : C.ink2 }}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => (tap(), onChange(!value))}
      style={{ width: 52, height: 30, borderRadius: 15, backgroundColor: value ? C.blue : C.rule, padding: 3, flexDirection: "row", justifyContent: value ? "flex-end" : "flex-start" }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: value ? C.sheet : "#fff" }} />
    </Pressable>
  );
}
