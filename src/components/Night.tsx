import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { t, type TKey } from "@/i18n";
import type { SoundKind } from "@/lib/detector";
import { C, F, KIND_COLOR } from "@/lib/theme";
import type { Clip } from "@/store/useSleep";
import { Text } from "./ui";

/** Little moon + speech bubble mark. */
export function Logo({ size = 28, dark }: { size?: number; dark?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Svg width={size * 1.3} height={size} viewBox="0 0 52 40">
        <Circle cx={18} cy={20} r={16} fill={C.blue} />
        <Circle cx={25} cy={14} r={13} fill={dark ? C.night : C.paper} />
        <Path d="M28 8 h20 a4 4 0 0 1 4 4 v10 a4 4 0 0 1 -4 4 h-10 l-6 6 v-6 h-4 a4 4 0 0 1 -4 -4 v-10 a4 4 0 0 1 4 -4 z" fill={C.pink} transform="translate(-2 2)" />
        <Path d="M36 13 h6 l-6 7 h6" stroke={dark ? C.night : C.ink} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <Text style={{ fontFamily: F.display, fontSize: size * 0.68, color: dark ? C.nightInk : C.ink }}>sleeptalk</Text>
    </View>
  );
}

export function KindTag({ kind, small }: { kind: SoundKind; small?: boolean }) {
  const bg = KIND_COLOR[kind];
  const fg = kind === "cough" || kind === "snore" ? C.sheet : C.ink;
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, borderRadius: 12, paddingHorizontal: small ? 7 : 9, paddingVertical: small ? 2 : 3 }}>
      <Text style={{ fontFamily: F.monoBold, fontSize: small ? 9 : 10, letterSpacing: 0.8, color: fg, textTransform: "uppercase" }}>{t(`k_${kind}_s` as TKey)}</Text>
    </View>
  );
}

/** Bars of a clip's loudness. `progress` 0..1 colors the played part. */
export function Wave({ wave, color, progress = 0, height = 36, width = 220, base = C.rule }: { wave: number[]; color: string; progress?: number; height?: number; width?: number; base?: string }) {
  const n = wave.length || 1;
  const bw = width / n;
  return (
    <Svg width={width} height={height}>
      {wave.map((v, i) => {
        const h = Math.max(3, v * (height - 2));
        const played = i / n < progress;
        return <Rect key={i} x={i * bw + bw * 0.18} y={(height - h) / 2} width={bw * 0.64} height={h} rx={bw * 0.3} fill={played || progress === 0 ? color : base} opacity={played || progress === 0 ? 1 : 1} />;
      })}
    </Svg>
  );
}

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/**
 * The night as a strip: grey loudness per minute, coloured ticks for clips,
 * hour labels underneath. Tap targets are handled by the report list.
 */
export function Timeline({
  minutes,
  clips,
  startedAt,
  endedAt,
  height = 96,
  dark,
  locked,
}: {
  minutes: number[];
  clips: Clip[];
  startedAt: number;
  endedAt: number;
  height?: number;
  dark?: boolean;
  locked?: Set<string>;
}) {
  const [w, setW] = useState(0);
  const total = Math.max(1, endedAt - startedAt);
  const plotH = height - 22;
  const mid = plotH / 2;
  const x = (ms: number) => (ms / total) * w;
  const hours: number[] = [];
  const first = new Date(startedAt);
  first.setMinutes(0, 0, 0);
  for (let h = first.getTime() + 3600_000; h < endedAt; h += 3600_000) hours.push(h);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Line x1={0} x2={w} y1={mid} y2={mid} stroke={dark ? C.night3 : C.rule} strokeWidth={1} />
          {minutes.map((v, i) => {
            const h = Math.max(1.5, v * (plotH - 8));
            return <Rect key={i} x={(i / minutes.length) * w} y={mid - h / 2} width={Math.max(1, w / minutes.length - 0.4)} height={h} fill={dark ? C.night3 : "#C9C1B2"} />;
          })}
          {clips.map((c) => {
            const cx = x(c.offset + c.durationMs / 2);
            const col = KIND_COLOR[c.kind];
            const isLocked = locked?.has(c.id);
            return (
              <G key={c.id}>
                <Rect x={x(c.offset)} y={4} width={Math.max(3, x(c.durationMs))} height={plotH - 8} rx={1.5} fill={col} opacity={isLocked ? 0.35 : 0.9} />
                <Circle cx={cx} cy={4} r={3.5} fill={col} />
              </G>
            );
          })}
          {hours.map((h) => (
            <G key={h}>
              <Line x1={x(h - startedAt)} x2={x(h - startedAt)} y1={plotH} y2={plotH + 4} stroke={dark ? C.nightMuted : C.muted} />
              <SvgText x={x(h - startedAt)} y={height - 4} fontSize={9} fontFamily={F.monoMed} fill={dark ? C.nightMuted : C.muted} textAnchor="middle">
                {hhmm(h).slice(0, 2)}
              </SvgText>
            </G>
          ))}
        </Svg>
      )}
    </View>
  );
}

export { hhmm };
