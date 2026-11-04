import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Halftone, Button, Label, Riso, Screen, tap, Text, TopBar } from "@/components/ui";
import { Logo } from "@/components/Night";
import { t, type TKey } from "@/i18n";
import { LEGAL } from "@/lib/config";
import { isMock, loadPlans, purchase, restore, type Plan } from "@/lib/purchases";
import { C, F, RADIUS, T } from "@/lib/theme";
import { useSleep } from "@/store/useSleep";
import { track } from "@/lib/analytics";
import { notePaywall } from "@/lib/review";
import { scheduleTrialReminder } from "@/lib/trialReminder";

function planView(p: Plan) {
  return {
    title: p.id === "yearly" ? t("pw_yearly") : t("pw_weekly"),
    trial: p.trialDays ? t("pw_trial", { n: p.trialDays }) : null,
    price: p.id === "yearly" ? t("pw_per_year", { p: p.price }) : t("pw_per_week", { p: p.price }),
    sub: p.id === "yearly" && p.perWeek ? t("pw_a_week", { p: p.perWeek }) : t("pw_cancel"),
    badge: p.savePct ? t("pw_save", { n: p.savePct }) : null,
  };
}

export default function Paywall() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromOnboarding = from === "onboarding";
  useEffect(() => {
    track("paywall_view", { from: from ?? "direct" });
    notePaywall();
  }, []);
  const set = useSleep((s) => s.set);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sel, setSel] = useState<"yearly" | "weekly">("yearly");
  const [busy, setBusy] = useState(false);
  const [canClose, setCanClose] = useState(!fromOnboarding);

  useEffect(() => {
    loadPlans().then(setPlans);
    if (fromOnboarding) {
      const tm = setTimeout(() => setCanClose(true), 2500);
      return () => clearTimeout(tm);
    }
  }, []);

  const close = () => {
    track("paywall_close", { from: from ?? "direct" });
    if (router.canGoBack() && !fromOnboarding) router.back();
    else router.replace("/");
  };
  const plan = plans.find((p) => p.id === sel);
  const pv = plan ? planView(plan) : null;

  const buy = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      if (await purchase(plan)) {
        set({ isPro: true });
        if (plan.trialDays) scheduleTrialReminder(plan.trialDays);
        close();
      }
    } catch (e: any) {
      Alert.alert(t("pw_fail"), e?.message || t("pw_try"));
    } finally {
      setBusy(false);
    }
  };
  const doRestore = async () => {
    setBusy(true);
    try {
      if (await restore()) {
        set({ isPro: true });
        close();
      } else Alert.alert(t("pw_nothing"), t("pw_nothing_body"));
    } catch (e: any) {
      Alert.alert(t("pw_fail"), e?.message || t("pw_try"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll
      footer={
        <View>
          <Button title={pv?.trial ? t("pw_cta_trial", { trial: pv.trial }) : t("pw_cta")} onPress={buy} loading={busy} disabled={!plan} />
          {pv ? (
            <Text style={[T.small, { textAlign: "center", marginTop: 10, fontSize: 12 }]}>
              {pv.trial ? `${t("pw_fine_trial", { trial: pv.trial, price: pv.price })} ${t("pw_remind")}` : t("pw_fine", { price: pv.price })}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 8 }}>
            {[
              { l: t("pw_restore"), f: doRestore },
              { l: t("pw_terms"), f: () => Linking.openURL(LEGAL.terms) },
              { l: t("pw_privacy"), f: () => Linking.openURL(LEGAL.privacy) },
            ].map((x) => (
              <Pressable key={x.l} hitSlop={8} onPress={x.f}>
                <Text style={{ fontFamily: F.sansMed, fontSize: 12.5, color: C.muted, textDecorationLine: "underline" }}>{x.l}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      }
    >
      <View style={{ opacity: canClose ? 1 : 0 }} pointerEvents={canClose ? "auto" : "none"}>
        <TopBar close onBack={close} right={isMock ? <Label color={C.pink}>{t("pw_test")}</Label> : null} />
      </View>

      <Logo />
      <Riso style={{ fontSize: 40, lineHeight: 46, marginTop: 18 }}>{t("pw_title")}</Riso>
      <Text style={[T.body, { marginTop: 10 }]}>{t("pw_sub")}</Text>

      <View style={{ marginTop: 20 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12, paddingVertical: 9, borderTopWidth: 1, borderColor: C.rule }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: [C.pink, C.blue, C.yellow, C.ink][i - 1], alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: i === 3 ? C.ink : C.sheet }}>{i}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={T.h3}>{t(`pw_p${i}_t` as TKey)}</Text>
              <Text style={[T.small, { marginTop: 2 }]}>{t(`pw_p${i}_d` as TKey)}</Text>
            </View>
          </View>
        ))}
      </View>

      <Animated.View entering={FadeIn} style={{ gap: 10, marginTop: 16 }}>
        {plans.map((p) => {
          const v = planView(p);
          const on = p.id === sel;
          return (
            <Pressable
              key={p.id}
              onPress={() => (tap(), setSel(p.id))}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 16,
                borderRadius: RADIUS,
                borderWidth: on ? 2 : 1.5,
                borderColor: on ? C.ink : C.rule,
                backgroundColor: on ? C.sheet : "transparent",
                overflow: "hidden",
              }}
            >
              {on ? <Halftone color={C.pink} size={6} opacity={0.18} /> : null}
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.ink, alignItems: "center", justifyContent: "center" }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.pink }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: F.sansXBold, fontSize: 17 }}>{v.title}</Text>
                  {v.badge ? (
                    <View style={{ backgroundColor: C.yellow, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: F.monoBold, fontSize: 9.5, color: C.ink }}>{v.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[T.small, { marginTop: 2 }]}>{v.trial ? `${v.trial} · ${v.sub}` : v.sub}</Text>
              </View>
              <Text style={{ fontFamily: F.monoBold, fontSize: 14 }}>{v.price}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </Screen>
  );
}
