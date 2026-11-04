import { requestRecordingPermissionsAsync } from "expo-audio";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "@/components/SafeArea";
import Svg, { Circle, Path } from "react-native-svg";
import { KindTag, Logo, Wave } from "@/components/Night";
import { Arrow, Button, Card, Halftone, Label, Riso, Text } from "@/components/ui";
import { t, type TKey } from "@/i18n";
import { track } from "@/lib/analytics";
import { C, F, T } from "@/lib/theme";
import { useSleep } from "@/store/useSleep";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    track("onboarding_step", { step, name: ["cover", "how", "mic"][step] ?? String(step) });
  }, [step]);
  const Steps = [Cover, How, Mic];
  const Cur = Steps[step];
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.paper }}>
      <Animated.View key={step} entering={FadeIn.duration(250)} style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 16) + 4 }}>
        <Cur next={() => setStep((s) => s + 1)} />
      </Animated.View>
    </SafeAreaView>
  );
}

type P = { next: () => void };

const WAVE = [0.2, 0.5, 0.9, 0.7, 1, 0.6, 0.3, 0.8, 0.95, 0.5, 0.25, 0.6, 0.85, 0.4, 0.2, 0.7, 0.9, 0.55, 0.3, 0.15];

function Cover({ next }: P) {
  return (
    <View style={{ flex: 1 }}>
      <Halftone color={C.blue} size={8} opacity={0.12} />
      <View style={{ position: "absolute", right: -70, top: 30 }}>
        <Svg width={220} height={220}>
          <Circle cx={110} cy={110} r={90} fill={C.blue} />
          <Circle cx={145} cy={84} r={82} fill={C.paper} />
          <Circle cx={116} cy={116} r={90} fill="none" stroke={C.pink} strokeWidth={3} />
        </Svg>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ paddingTop: 12 }}>
          <Logo />
        </View>
        <Label style={{ marginTop: 190 }} color={C.ink2}>
          {t("ob_cover_issue")}
        </Label>
        <Riso style={{ fontSize: 42, lineHeight: 50, marginTop: 12 }}>{t("ob_cover_title")}</Riso>
        <Text style={[T.body, { fontSize: 17, lineHeight: 25, marginTop: 16 }]}>{t("ob_cover_body")}</Text>
        <Animated.View entering={FadeInDown.delay(400)}>
          <Card style={{ marginTop: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontFamily: F.display, fontSize: 22 }}>03:14</Text>
            <Wave wave={WAVE} color={C.pink} width={130} height={30} />
            <KindTag kind="talk" small />
          </Card>
        </Animated.View>
        <View style={{ flex: 1 }} />
        <Button title={t("ob_cover_cta")} onPress={next} right={<Arrow />} />
      </View>
    </View>
  );
}

function Frame({ kicker, title, children, footer }: { kicker: string; title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Label>{kicker}</Label>
        <Riso style={{ fontSize: 30, lineHeight: 38, marginTop: 12 }}>{title}</Riso>
        <View style={{ marginTop: 26 }}>{children}</View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 6 }}>{footer}</View>
    </View>
  );
}

function Steps({ prefix, colors }: { prefix: string; colors: string[] }) {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: "row", gap: 14, paddingVertical: 14, borderTopWidth: 1, borderColor: C.rule }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors[i - 1], alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: colors[i - 1] === C.blue ? C.sheet : C.ink }}>{i}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.h3}>{t(`${prefix}${i}` as TKey)}</Text>
            <Text style={[T.small, { marginTop: 3 }]}>{t(`${prefix}${i}_d` as TKey)}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

function How({ next }: P) {
  return (
    <Frame kicker={t("ob_how_kicker")} title={t("ob_how_title")} footer={<Button title={t("next")} onPress={next} />}>
      <Steps prefix="ob_how_" colors={[C.blue, C.pink, C.yellow]} />
    </Frame>
  );
}

function Mic(_: P) {
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const go = async () => {
    setBusy(true);
    const ok = Platform.OS === "web" ? true : !!(await requestRecordingPermissionsAsync().catch(() => null))?.granted;
    setBusy(false);
    if (!ok) {
      track("mic_denied", { where: "onboarding" });
      return setDenied(true);
    }
    useSleep.getState().set({ onboarded: true });
    track("onboarding_complete");
    router.replace({ pathname: "/paywall", params: { from: "onboarding" } });
  };
  return (
    <Frame kicker={t("ob_mic_kicker")} title={t("ob_mic_title")} footer={<Button title={t("ob_mic_cta")} onPress={go} loading={busy} />}>
      <Steps prefix="ob_mic_r" colors={[C.pink, C.blue, C.yellow]} />
      {denied ? <Text style={{ fontFamily: F.sansBold, color: C.pink, marginTop: 12 }}>{t("ob_mic_denied")}</Text> : null}
    </Frame>
  );
}
