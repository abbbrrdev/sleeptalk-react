import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { hhmm, KindTag, Timeline, Wave } from "@/components/Night";
import { Button, Card, Halftone, Label, Lock, ProTag, Riso, Screen, tap, Text, TopBar } from "@/components/ui";
import { getLang, locale, t } from "@/i18n";
import { track } from "@/lib/analytics";
import { deleteFile, transcribe } from "@/lib/engine";
import { noteWin } from "@/lib/review";
import { C, F, KIND_COLOR, T } from "@/lib/theme";
import { unlockedIds, useSleep, type Clip, type Night } from "@/store/useSleep";

const dur = (ms: number) => (ms >= 60_000 ? `${Math.floor(ms / 60_000)}:${String(Math.round((ms % 60_000) / 1000)).padStart(2, "0")}` : `${Math.round(ms / 1000)}s`);

function Big({ n, label, sub, color, bg }: { n: string | number; label: string; sub?: string; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 16, padding: 14, overflow: "hidden" }}>
      <Halftone color={color} size={6} opacity={0.22} />
      <Text style={{ fontFamily: F.display, fontSize: 38, lineHeight: 44, color }}>{n}</Text>
      <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.ink, marginTop: 2 }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: F.sansMed, fontSize: 11.5, color: C.ink2, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

function PlayIcon({ playing, color }: { playing: boolean; color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      {playing ? <Path d="M7 5 H10 V19 H7 Z M14 5 H17 V19 H14 Z" fill={color} /> : <Path d="M7 4 L20 12 L7 20 Z" fill={color} />}
    </Svg>
  );
}

function ClipCard({
  clip,
  night,
  locked,
  playing,
  progress,
  onPlay,
}: {
  clip: Clip;
  night: Night;
  locked: boolean;
  playing: boolean;
  progress: number;
  onPlay: () => void;
}) {
  const isPro = useSleep((s) => s.isPro);
  const speechLang = useSleep((s) => s.speechLang);
  const updateClip = useSleep((s) => s.updateClip);
  const [busy, setBusy] = useState(false);
  const [w, setW] = useState(220);
  const col = KIND_COLOR[clip.kind];

  const whatDidISay = async () => {
    if (!isPro) return router.push("/paywall");
    if (!clip.uri) return;
    setBusy(true);
    const text = await transcribe(clip.uri, speechLang ?? getLang());
    track("transcribe", { ok: !!text });
    updateClip(night.id, clip.id, { text: text || "" });
    setBusy(false);
  };

  if (locked)
    return (
      <Pressable onPress={() => router.push("/paywall")} style={{ marginTop: 10 }}>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, opacity: 0.75 }}>
          <Text style={{ fontFamily: F.display, fontSize: 22, color: C.muted }}>{hhmm(clip.at)}</Text>
          <View style={{ flex: 1, height: 20, borderRadius: 6, backgroundColor: C.rule }} />
          <Lock />
        </Card>
      </Pressable>
    );

  return (
    <Card style={{ marginTop: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 26 }}>{hhmm(clip.at)}</Text>
          <Text style={{ fontFamily: F.monoMed, fontSize: 11, color: C.muted }}>{dur(clip.durationMs)}</Text>
        </View>
        <KindTag kind={clip.kind} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
        <Pressable
          onPress={() => (tap(), onPlay())}
          disabled={!clip.uri && Platform.OS !== "web"}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: col === C.yellow ? C.ink : col, alignItems: "center", justifyContent: "center", opacity: clip.uri || Platform.OS === "web" ? 1 : 0.35 }}
        >
          <PlayIcon playing={playing} color={C.sheet} />
        </Pressable>
        <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          <Wave wave={clip.wave} color={col === C.yellow ? "#E0B400" : col} progress={playing ? Math.max(0.001, progress) : 0} width={w} height={38} />
        </View>
      </View>

      {clip.text ? (
        <Text style={{ fontFamily: F.display, fontSize: 19, lineHeight: 26, marginTop: 14 }}>“{clip.text}”</Text>
      ) : clip.text === "" ? (
        <Text style={[T.small, { marginTop: 12 }]}>{t("rp_no_words")}</Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {clip.kind === "talk" && clip.text == null ? (
          <Pressable onPress={whatDidISay} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 16, backgroundColor: C.pinkSoft, paddingHorizontal: 12, paddingVertical: 7 }}>
            {busy ? <ActivityIndicator size="small" color={C.ink} /> : null}
            <Text style={{ fontFamily: F.sansXBold, fontSize: 13 }}>{busy ? t("rp_transcribing") : t("rp_transcribe")}</Text>
            {!isPro ? <ProTag /> : null}
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            tap();
            if (!clip.kept) track("keep_clip", { kind: clip.kind });
            updateClip(night.id, clip.id, { kept: !clip.kept });
          }}
          style={{ borderRadius: 16, borderWidth: 1.5, borderColor: clip.kept ? C.ink : C.rule, backgroundColor: clip.kept ? C.ink : "transparent", paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ fontFamily: F.sansXBold, fontSize: 13, color: clip.kept ? C.sheet : C.ink }}>{clip.kept ? `★ ${t("rp_kept")}` : `☆ ${t("rp_fav")}`}</Text>
        </Pressable>
        <Pressable
          onPress={() => (tap(), router.push({ pathname: "/share", params: { night: night.id, clip: clip.id } }))}
          style={{ borderRadius: 16, borderWidth: 1.5, borderColor: C.rule, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ fontFamily: F.sansXBold, fontSize: 13 }}>↗ {t("share")}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function Report() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nights = useSleep((s) => s.nights);
  const isPro = useSleep((s) => s.isPro);
  const night = nights.find((n) => n.id === id) ?? nights[nights.length - 1];
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [fakeProg, setFakeProg] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web") setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }, []);
  // one report_view per opened night; a review ask after a fun night (never the very first report)
  const viewedId = night?.id;
  useEffect(() => {
    if (!night) return;
    track("report_view", { clips: night.clips.length, n: night.n });
    if (night.n > 1 && night.summary.talk + night.summary.laugh >= 1) noteWin({ chance: 0.5 });
  }, [viewedId]);
  useEffect(() => {
    if (status.didJustFinish) setPlayingId(null);
  }, [status.didJustFinish]);
  // web: animate a fake playhead so the UI can be reviewed
  useEffect(() => {
    if (Platform.OS !== "web" || !playingId) return;
    setFakeProg(0);
    const iv = setInterval(() => setFakeProg((p) => (p >= 1 ? (setPlayingId(null), 0) : p + 0.05)), 150);
    return () => clearInterval(iv);
  }, [playingId]);

  if (!night)
    return (
      <Screen>
        <TopBar />
      </Screen>
    );

  const unlocked = unlockedIds(night, isPro);
  const lockedSet = new Set(night.clips.filter((c) => !unlocked.has(c.id)).map((c) => c.id));
  const s = night.summary;
  const totalMin = Math.round((night.endedAt - night.startedAt) / 60_000);
  const quote = night.clips.find((c) => c.kind === "talk" && c.text && unlocked.has(c.id));
  const date = new Date(night.startedAt).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" });

  const play = (c: Clip) => {
    if (playingId === c.id) {
      player.pause();
      setPlayingId(null);
      return;
    }
    setPlayingId(c.id);
    track("clip_play", { kind: c.kind });
    if (Platform.OS === "web" || !c.uri) return;
    player.replace({ uri: c.uri });
    player.play();
  };

  const remove = () => {
    const go = () => {
      night.clips.forEach((c) => deleteFile(c.uri));
      useSleep.getState().removeNight(night.id);
      router.back();
    };
    if (Platform.OS === "web") return go();
    Alert.alert(t("rp_delete_q"), undefined, [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: go },
    ]);
  };

  const progress = Platform.OS === "web" ? fakeProg : status.duration ? status.currentTime / status.duration : 0;

  return (
    <Screen scroll>
      <TopBar
        title={t("issue_no", { n: night.n })}
        right={
          <Pressable hitSlop={10} onPress={remove}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M4 7 H20 M9 7 V4 H15 V7 M6 7 L7 20 H17 L18 7" stroke={C.ink2} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        }
      />
      <Label>{date}</Label>
      <Riso style={{ fontSize: 40, lineHeight: 46, marginTop: 8 }}>{t("rp_title")}</Riso>
      <Text style={[T.small, { marginTop: 6 }]}>
        {hhmm(night.startedAt)} → {hhmm(night.endedAt)} · {t("rp_hours", { h: Math.floor(totalMin / 60), m: totalMin % 60 })}
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
        <Big n={s.talk} label={t("rp_talk")} color={C.pink} bg={C.pinkSoft} />
        <Big n={s.snoreScore} label={t("rp_snore_score")} sub={t("rp_snore_min", { n: s.snoreMin })} color={C.blue} bg={C.blueSoft} />
        <Big n={s.laugh} label={t("rp_laugh")} color={C.ink} bg="#FFF0B8" />
      </View>

      {quote ? (
        <View style={{ marginTop: 14, backgroundColor: C.pink, borderRadius: 18, padding: 20, overflow: "hidden" }}>
          <Halftone color={C.ink} size={6} opacity={0.12} />
          <Text style={{ fontFamily: F.display, fontSize: 64, lineHeight: 56, color: C.ink, marginBottom: -6 }}>“</Text>
          <Text style={{ fontFamily: F.display, fontSize: 25, lineHeight: 33, color: C.ink }}>{quote.text}</Text>
          <Text style={{ fontFamily: F.monoBold, fontSize: 11, color: C.ink, marginTop: 12, letterSpacing: 1 }}>— {hhmm(quote.at)}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 26 }}>
        <Label>{t("rp_timeline")}</Label>
        <View style={{ marginTop: 10 }}>
          <Timeline minutes={night.minutes} clips={night.clips} startedAt={night.startedAt} endedAt={night.endedAt} locked={lockedSet} />
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {(["talk", "snore", "laugh", "cough"] as const).map((k) => (
            <KindTag key={k} kind={k} small />
          ))}
        </View>
      </View>

      <View style={{ marginTop: 26 }}>
        <Label>{t("rp_clips")}</Label>
        {!night.clips.length ? <Text style={[T.body, { marginTop: 10 }]}>{t("rp_empty")}</Text> : null}
        {night.clips.map((c) => (
          <ClipCard key={c.id} clip={c} night={night} locked={lockedSet.has(c.id)} playing={playingId === c.id} progress={playingId === c.id ? progress : 0} onPlay={() => play(c)} />
        ))}
        {lockedSet.size ? (
          <Button style={{ marginTop: 16 }} title={t("rp_more_pro", { n: lockedSet.size })} onPress={() => router.push("/paywall")} />
        ) : null}
        {Platform.OS === "web" ? <Text style={[T.small, { marginTop: 14, textAlign: "center" }]}>{t("rp_web")}</Text> : null}
      </View>
    </Screen>
  );
}
