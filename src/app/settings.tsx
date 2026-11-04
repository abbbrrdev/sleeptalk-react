import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, View } from "react-native";
import { Logo } from "@/components/Night";
import { Button, Chip, Label, Row, Screen, tap, Text, Toggle, TopBar } from "@/components/ui";
import { LANGS, t, type Lang } from "@/i18n";
import { APP_VERSION, LEGAL } from "@/lib/config";
import { deleteFile, demoNight, fileSize } from "@/lib/engine";
import { isMock, restore } from "@/lib/purchases";
import { C, F, T } from "@/lib/theme";
import { useSleep, type Sensitivity } from "@/store/useSleep";
import { planComeback } from "@/lib/comeback";
import { ensurePermission, sleepPlan } from "@/lib/nudges";
import { isAnalyticsOff, setAnalyticsOff, track } from "@/lib/analytics";
import { canOpenReview, openWriteReview } from "@/lib/review";

const BED_TIMES: [number, number][] = [
  [21, 30],
  [22, 0],
  [22, 30],
  [23, 0],
  [23, 30],
];
const replan = () => setTimeout(() => planComeback(sleepPlan()), 50);

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <Label style={{ marginBottom: 6 }}>{title}</Label>
      <View style={{ borderTopWidth: 1, borderColor: C.ink }}>{children}</View>
    </View>
  );
}

export default function Settings() {
  const s = useSleep();
  const [statsOff, setStatsOff] = useState(false);
  useEffect(() => {
    isAnalyticsOff().then(setStatsOff);
  }, []);
  const dev = __DEV__ || isMock;
  const clips = s.nights.flatMap((n) => n.clips).filter((c) => c.uri);
  const mb = (clips.reduce((a, c) => a + fileSize(c.uri), 0) / 1048576).toFixed(1);

  const seed = () => {
    for (let i = 4; i >= 1; i--) useSleep.getState().addNight(demoNight(`demo${Date.now()}${i}`, i, i + 2));
  };
  const reset = () => {
    const go = () => {
      useSleep.getState().nights.forEach((n) => n.clips.forEach((c) => deleteFile(c.uri)));
      useSleep.getState().resetAll();
      router.replace("/onboarding");
    };
    if (Platform.OS === "web") return go();
    Alert.alert(t("st_dev_reset_q"), undefined, [
      { text: t("cancel"), style: "cancel" },
      { text: t("st_dev_reset_ok"), style: "destructive", onPress: go },
    ]);
  };

  return (
    <Screen scroll>
      <TopBar title={t("st_title")} />

      <Group title={t("st_recording")}>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.rule }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: 16, marginBottom: 10 }}>{t("st_sensitivity")}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["low", "normal", "high"] as Sensitivity[]).map((v) => (
              <Chip key={v} label={t(`st_sens_${v}` as any)} on={s.sensitivity === v} onPress={() => {
                  if (v !== s.sensitivity) track("sensitivity_change", { from: s.sensitivity, to: v });
                  s.set({ sensitivity: v });
                }}
              />
            ))}
          </View>
          <Text style={[T.small, { marginTop: 10 }]}>{t("st_sens_d")}</Text>
        </View>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.rule }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: 16, marginBottom: 10 }}>{t("st_speech_lang")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LANGS.map((l) => (
              <Chip key={l.code} label={l.name} on={(s.speechLang ?? s.lang) === l.code} onPress={() => s.set({ speechLang: l.code })} />
            ))}
          </View>
        </View>
        <Row title={t("st_storage")} value={t("st_storage_d", { n: clips.length, mb })} />
        {!s.isPro ? <Text style={[T.small, { paddingVertical: 10 }]}>{t("st_keep_free")}</Text> : null}
      </Group>

      <Group title={t("st_reminders")}>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.rule }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: 16 }}>{t("st_rem_bed")}</Text>
              <Text style={[T.small, { marginTop: 2 }]}>{t("st_rem_bed_d")}</Text>
            </View>
            <Toggle
              value={s.reminder.on}
              onChange={async (v) => {
                if (v && !(await ensurePermission())) return;
                s.set({ reminder: { ...s.reminder, on: v } });
                replan();
              }}
            />
          </View>
          {s.reminder.on ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {BED_TIMES.map(([h, m]) => (
                <Chip
                  key={`${h}:${m}`}
                  label={`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`}
                  on={s.reminder.h === h && s.reminder.m === m}
                  onPress={() => {
                    s.set({ reminder: { on: true, h, m } });
                    replan();
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.rule, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: 16 }}>{t("st_nudges")}</Text>
            <Text style={[T.small, { marginTop: 2 }]}>{t("st_nudges_hint")}</Text>
          </View>
          <Toggle
            value={s.nudges}
            onChange={async (v) => {
              if (v && !(await ensurePermission())) return;
              s.set({ nudges: v });
              replan();
            }}
          />
        </View>
      </Group>

      <Group title={t("st_language")}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 14 }}>
          {[{ code: null as Lang | null, name: t("st_auto") }, ...LANGS.map((l) => ({ code: l.code as Lang | null, name: l.name }))].map((l) => (
            <Chip key={l.code ?? "auto"} label={l.name} on={s.lang === l.code} onPress={() => s.set({ lang: l.code })} />
          ))}
        </View>
      </Group>

      <Group title={t("st_sub")}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderColor: C.rule }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: 16 }}>{s.isPro ? t("st_pro") : t("st_free")}</Text>
          {s.isPro ? (
            <Button small variant="outline" title={t("st_manage")} onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")} />
          ) : (
            <Button small variant="pink" title={t("st_upgrade")} onPress={() => router.push("/paywall")} />
          )}
        </View>
        <Row
          title={t("st_restore")}
          onPress={async () => {
            const ok = await restore().catch(() => false);
            if (ok) s.set({ isPro: true });
            else if (Platform.OS !== "web") Alert.alert(t("pw_nothing"), t("pw_nothing_body"));
          }}
        />
        <Row title={t("pw_terms")} onPress={() => Linking.openURL(LEGAL.terms)} />
        <Row title={t("pw_privacy")} onPress={() => Linking.openURL(LEGAL.privacy)} />
        {canOpenReview() ? <Row title={t("st_rate")} onPress={openWriteReview} /> : null}
        <Row title={t("st_analytics")} right={<Toggle value={!statsOff} onChange={(v) => (setStatsOff(!v), setAnalyticsOff(!v))} />} />
        <Text style={[T.small, { paddingVertical: 10 }]}>{t("st_analytics_d")}</Text>
      </Group>

      {dev ? (
        <Group title={t("st_dev")}>
          <Text style={[T.small, { paddingTop: 10 }]}>{t("st_dev_hint")}</Text>
          <Row title={t("st_dev_pro")} right={<Toggle value={s.isPro} onChange={(v) => s.set({ isPro: v })} />} />
          <Row title={t("st_dev_seed")} onPress={seed} />
          <Pressable onPress={() => (tap(), reset())} style={{ paddingVertical: 15 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 16, color: C.pink }}>{t("st_dev_reset")}</Text>
          </Pressable>
        </Group>
      ) : null}

      <View style={{ alignItems: "center", marginTop: 36, gap: 8 }}>
        <Logo size={22} />
        <Text style={[T.small, { fontFamily: F.mono, fontSize: 10 }]}>{t("st_footer", { v: APP_VERSION })}</Text>
      </View>
    </Screen>
  );
}
