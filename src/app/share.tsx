import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Platform, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import Svg, { Circle } from "react-native-svg";
import { hhmm, KindTag, Logo, Wave } from "@/components/Night";
import { Button, Halftone, Screen, Text, TopBar } from "@/components/ui";
import { t, type TKey } from "@/i18n";
import { track } from "@/lib/analytics";
import { noteWin } from "@/lib/review";
import { C, F, KIND_COLOR, T } from "@/lib/theme";
import { useSleep } from "@/store/useSleep";

export default function Share() {
  const params = useLocalSearchParams<{ night?: string; clip?: string }>();
  const night = useSleep((s) => s.nights.find((n) => n.id === params.night));
  const clip = night?.clips.find((c) => c.id === params.clip);
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState<"img" | "audio" | null>(null);
  const web = Platform.OS === "web";
  if (!night || !clip)
    return (
      <Screen>
        <TopBar close />
      </Screen>
    );

  const shareImage = async () => {
    if (web || !ref.current) return;
    setBusy("img");
    try {
      const uri = await captureRef(ref, { format: "png", quality: 1, result: "tmpfile" });
      track("share_start", { kind: "card", clip: clip.kind, quote: clip.kind === "talk" && !!clip.text });
      await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
      if (night.n > 1) noteWin({ chance: 0.5 });
    } catch {}
    setBusy(null);
  };
  const shareAudio = async () => {
    if (web || !clip.uri) return;
    setBusy("audio");
    try {
      track("share_start", { kind: "audio", clip: clip.kind });
      await Sharing.shareAsync(clip.uri, { mimeType: "audio/mp4", UTI: "public.mpeg-4-audio" });
      if (night.n > 1) noteWin({ chance: 0.5 });
    } catch {}
    setBusy(null);
  };

  const col = KIND_COLOR[clip.kind];
  const headline =
    clip.kind === "talk" && clip.text
      ? null
      : clip.kind === "snore"
        ? t("sh_snored", { n: night.summary.snoreMin })
        : t("sh_sound", { kind: t(`k_${clip.kind}` as TKey), time: hhmm(clip.at) });

  return (
    <Screen
      footer={
        <View style={{ gap: 10 }}>
          {web ? <Text style={[T.small, { textAlign: "center" }]}>{t("sh_web")}</Text> : null}
          <Button title={t("sh_image")} onPress={shareImage} loading={busy === "img"} disabled={web} />
          {clip.uri ? <Button variant="outline" title={t("sh_audio")} onPress={shareAudio} loading={busy === "audio"} disabled={web} /> : null}
        </View>
      }
    >
      <TopBar close title={t("sh_title")} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View ref={ref} collapsable={false} style={{ width: 320, aspectRatio: 9 / 14, backgroundColor: C.paper, borderRadius: 18, overflow: "hidden", padding: 22 }}>
          <Halftone color={C.blue} size={7} opacity={0.16} />
          <View style={{ position: "absolute", right: -40, top: 90 }}>
            <Svg width={200} height={200}>
              <Circle cx={100} cy={100} r={80} fill={col} opacity={0.9} />
              <Circle cx={108} cy={106} r={80} fill="none" stroke={C.blue} strokeWidth={2} opacity={0.6} />
            </Svg>
          </View>
          <Logo size={20} />
          <View style={{ flex: 1, justifyContent: "center" }}>
            {headline ? (
              <Text style={{ fontFamily: F.display, fontSize: 34, lineHeight: 42 }}>{headline}</Text>
            ) : (
              <>
                <Text style={{ fontFamily: F.sansXBold, fontSize: 16 }}>{t("sh_at", { time: hhmm(clip.at) })}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 32, lineHeight: 40, marginTop: 8 }}>“{clip.text}”</Text>
              </>
            )}
            <View style={{ marginTop: 18 }}>
              <Wave wave={clip.wave} color={C.ink} width={276} height={40} />
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <KindTag kind={clip.kind} />
            <Text style={{ fontFamily: F.monoMed, fontSize: 9, color: C.ink2 }}>{t("sh_footer")}</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
