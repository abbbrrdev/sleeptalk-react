import { Redirect, router } from "expo-router";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { hhmm, KindTag, Logo, Timeline } from "@/components/Night";
import { Arrow, Button, Card, Halftone, Label, Lock, Riso, Screen, tap, Text } from "@/components/ui";
import { locale, t } from "@/i18n";
import { C, F, T } from "@/lib/theme";
import { FREE_NIGHTS, unlockedIds, useSleep, type Night } from "@/store/useSleep";

function Gear() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M4 7 H20 M4 17 H20" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={9} cy={7} r={2.6} fill={C.paper} stroke={C.ink} strokeWidth={2} />
      <Circle cx={15} cy={17} r={2.6} fill={C.paper} stroke={C.ink} strokeWidth={2} />
    </Svg>
  );
}

const dateOf = (ms: number, o: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleDateString(locale(), o);

function Stat({ n, label, color }: { n: string | number; label: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: F.display, fontSize: 34, color }}>{n}</Text>
      <Text style={[T.small, { fontSize: 12.5, marginTop: -2 }]}>{label}</Text>
    </View>
  );
}

function LastNight({ night, isPro }: { night: Night; isPro: boolean }) {
  const s = night.summary;
  const unlocked = unlockedIds(night, isPro);
  const locked = new Set(night.clips.filter((c) => !unlocked.has(c.id)).map((c) => c.id));
  const quote = night.clips.find((c) => c.kind === "talk" && c.text && unlocked.has(c.id));
  return (
    <Pressable onPress={() => (tap(), router.push({ pathname: "/report", params: { id: night.id } }))}>
      <Card style={{ marginTop: 14, padding: 0 }}>
        <View style={{ padding: 18, paddingBottom: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Label color={C.ink2}>{t("issue_no", { n: night.n })}</Label>
            <Label>
              {hhmm(night.startedAt)} → {hhmm(night.endedAt)}
            </Label>
          </View>
          {quote ? (
            <Text style={{ fontFamily: F.display, fontSize: 22, lineHeight: 29, marginTop: 12 }}>“{quote.text}”</Text>
          ) : null}
          <View style={{ flexDirection: "row", marginTop: 14 }}>
            <Stat n={s.talk} label={t("rp_talk")} color={C.pink} />
            <Stat n={s.snoreScore} label={t("rp_snore_score")} color={C.blue} />
            <Stat n={s.laugh} label={t("rp_laugh")} color={C.ink} />
          </View>
        </View>
        <View style={{ paddingHorizontal: 18 }}>
          <Timeline minutes={night.minutes} clips={night.clips} startedAt={night.startedAt} endedAt={night.endedAt} height={70} locked={locked} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18, paddingTop: 8 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: 14 }}>{night.clips.length ? t("clips_n", { n: night.clips.length }) : t("quiet_night")}</Text>
          <Text style={{ fontFamily: F.sansXBold, fontSize: 14, color: C.blue }}>{t("open_report")} →</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export default function Home() {
  const s = useSleep();
  if (!s.onboarded) return <Redirect href="/onboarding" />;
  const nights = [...s.nights].sort((a, b) => b.startedAt - a.startedAt);
  const last = nights[0];
  const older = nights.slice(1);

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
        <Logo />
        <Pressable hitSlop={12} onPress={() => (tap(), router.push("/settings"))} accessibilityLabel={t("st_title")}>
          <Gear />
        </Pressable>
      </View>

      {/* Tonight */}
      <View style={{ marginTop: 18, backgroundColor: C.night, borderRadius: 22, padding: 22, overflow: "hidden" }}>
        <Halftone color={C.nightInk} size={7} opacity={0.08} />
        <View style={{ position: "absolute", right: -30, top: -30 }}>
          <Svg width={150} height={150}>
            <Circle cx={75} cy={75} r={58} fill={C.yellow} />
            <Circle cx={100} cy={58} r={52} fill={C.night} />
          </Svg>
        </View>
        <Label color={C.nightMuted}>{t("tonight")}</Label>
        <Riso style={{ fontSize: 34, lineHeight: 40, marginTop: 10 }} color={C.nightInk}>
          {dateOf(Date.now(), { weekday: "long" })}
        </Riso>
        <Text style={{ fontFamily: F.sansMed, fontSize: 13.5, color: C.nightMuted, marginTop: 6, marginRight: 60 }}>{t("start_hint")}</Text>
        <Button
          variant="moon"
          title={t("start_night")}
          style={{ marginTop: 22 }}
          onPress={() => router.push("/night")}
          right={<Arrow color={C.night} />}
        />
      </View>

      {/* Last night */}
      <View style={{ marginTop: 28 }}>
        <Label>{t("last_night")}</Label>
        {last ? <LastNight night={last} isPro={s.isPro} /> : <Text style={[T.body, { marginTop: 10 }]}>{t("no_nights")}</Text>}
      </View>

      {older.length ? (
        <View style={{ marginTop: 28 }}>
          <Label>{t("nights")}</Label>
          {older.map((n, i) => {
            const lockedNight = !s.isPro && i + 1 >= FREE_NIGHTS;
            return (
              <Pressable
                key={n.id}
                onPress={() => (tap(), lockedNight ? router.push("/paywall") : router.push({ pathname: "/report", params: { id: n.id } }))}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderColor: C.rule, opacity: pressed ? 0.6 : 1 })}
              >
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.sheet, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 18 }}>{dateOf(n.startedAt, { day: "numeric" })}</Text>
                  <Text style={{ fontFamily: F.monoMed, fontSize: 8.5, color: C.muted, marginTop: -2 }}>{dateOf(n.startedAt, { month: "short" }).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 15 }}>{t("issue_no", { n: n.n })}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                    {n.summary.talk ? <KindTag kind="talk" small /> : null}
                    {n.summary.snore ? <KindTag kind="snore" small /> : null}
                    {n.summary.laugh ? <KindTag kind="laugh" small /> : null}
                    {!n.clips.length ? <Text style={[T.small, { fontSize: 12 }]}>{t("quiet_night")}</Text> : null}
                  </View>
                </View>
                {lockedNight ? <Lock /> : <Arrow color={C.muted} />}
              </Pressable>
            );
          })}
          {!s.isPro && older.length >= FREE_NIGHTS ? (
            <Button small variant="outline" title={t("history_locked")} style={{ marginTop: 14 }} onPress={() => router.push("/paywall")} />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
