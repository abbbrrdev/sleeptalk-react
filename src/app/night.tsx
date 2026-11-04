import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "@/components/SafeArea";
import Svg, { Circle, Polyline } from "react-native-svg";
import { hhmm, Logo } from "@/components/Night";
import { Label, Text } from "@/components/ui";
import { t } from "@/i18n";
import { Detector } from "@/lib/detector";
import { demoNight, deleteFile, MIN_NIGHT_MS, processNight } from "@/lib/engine";
import { C, F } from "@/lib/theme";
import { useSleep, type Night } from "@/store/useSleep";
import { askOnce, setRecording } from "@/lib/nudges";
import { track } from "@/lib/analytics";

/** Numbers only — never clip text. */
function trackEnd(n: Night, demo: boolean) {
  track("night_end", {
    minutes: Math.round((n.endedAt - n.startedAt) / 60_000),
    clips: n.clips.length,
    talk: n.summary.talk,
    snore: n.summary.snore,
    laugh: n.summary.laugh,
    n: n.n,
    ...(demo ? { demo: true } : {}),
  });
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const OPTIONS = {
  ...RecordingPresets.LOW_QUALITY,
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  directory: "document" as const,
  android: { extension: ".m4a", outputFormat: "mpeg4" as const, audioEncoder: "aac" as const },
};

type Phase = "starting" | "live" | "processing" | "error";

export default function NightScreen() {
  useKeepAwake();
  useEffect(() => {
    setRecording(true);
    return () => setRecording(false);
  }, []);
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(OPTIONS);
  const sensitivity = useSleep((s) => s.sensitivity);
  const detector = useRef(new Detector(sensitivity));
  const startedAt = useRef(Date.now());
  const [phase, setPhase] = useState<Phase>("starting");
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [levels, setLevels] = useState<number[]>([]);
  const [caught, setCaught] = useState(0);
  const [prog, setProg] = useState<[number, number]>([0, 0]);
  const web = Platform.OS === "web";

  // start
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | null = null;
    (async () => {
      if (web) {
        setPhase("live");
        track("night_start", { sensitivity, demo: true });
        let tt = 0;
        poll = setInterval(() => {
          tt += 250;
          const db = -52 + Math.random() * 5 + (Math.random() > 0.97 ? 20 : 0);
          detector.current.feed(tt, db);
          setLevels((l) => [...l.slice(-119), Math.max(0, (db + 60) / 50)]);
          setCaught(detector.current.events.length);
        }, 250);
        return;
      }
      const perm = await requestRecordingPermissionsAsync().catch(() => null);
      if (!perm?.granted) {
        track("mic_denied", { where: "night" });
        setErr(t("rec_denied"));
        setPhase("error");
        return;
      }
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          allowsBackgroundRecording: true,
          interruptionMode: "mixWithOthers",
        });
        await recorder.prepareToRecordAsync();
        recorder.record();
        startedAt.current = Date.now();
        setPhase("live");
        track("night_start", { sensitivity });
        poll = setInterval(() => {
          const st = recorder.getStatus();
          if (!st.isRecording) return;
          const db = st.metering ?? -160;
          detector.current.feed(st.durationMillis, db);
          setLevels((l) => [...l.slice(-119), Math.max(0, Math.min(1, (db + 60) / 50))]);
          setCaught(detector.current.events.length);
        }, 250);
      } catch {
        setErr(t("rec_error"));
        setPhase("error");
      }
    })();
    const clock = setInterval(() => setNow(new Date()), 15_000);
    return () => {
      if (poll) clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  const finish = async () => {
    setPhase("processing");
    const endedAt = Date.now();
    const id = String(endedAt);
    if (web) {
      const n = useSleep.getState().addNight(demoNight(id, 0, Math.floor(Math.random() * 9) + 1));
      trackEnd(n, true);
      router.replace({ pathname: "/report", params: { id: n.id } });
      return;
    }
    await recorder.stop().catch(() => {});
    const uri = recorder.uri;
    await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => {});
    if (endedAt - startedAt.current < MIN_NIGHT_MS && !__DEV__) {
      track("night_too_short", { minutes: Math.round((endedAt - startedAt.current) / 60_000) });
      deleteFile(uri);
      setErr(t("rec_too_short"));
      setPhase("error");
      return;
    }
    const night = await processNight({
      id,
      uri,
      startedAt: startedAt.current,
      endedAt,
      detector: detector.current,
      onProgress: (i, n) => setProg([i, n]),
    });
    const saved = useSleep.getState().addNight(night);
    trackEnd(saved, false);
    router.replace({ pathname: "/report", params: { id: saved.id } });
    askOnce();
  };

  // hold-to-stop ring
  const hold = useSharedValue(0);
  const R = 44;
  const CIRC = 2 * Math.PI * R;
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - hold.value) }));
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIn = () => {
    hold.value = withTiming(1, { duration: 1100, easing: Easing.linear });
    holdTimer.current = setTimeout(finish, 1100);
  };
  const onOut = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    cancelAnimation(hold);
    hold.value = withTiming(0, { duration: 200 });
  };

  const pts = levels.map((v, i) => `${(i / 119) * 300},${50 - v * 44}`).join(" ");

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.night }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Logo size={22} dark />
          {phase !== "processing" ? (
            <Pressable hitSlop={12} onPress={() => (phase === "error" ? router.back() : null)}>
              <Label color={C.nightMuted}>{phase === "error" ? "✕" : t("rec_title")}</Label>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flex: 1, justifyContent: "center" }}>
          {phase === "processing" ? (
            <View>
              <Text style={{ fontFamily: F.display, fontSize: 30, lineHeight: 38, color: C.nightInk }}>{t("processing")}</Text>
              {prog[1] ? <Text style={{ fontFamily: F.monoMed, fontSize: 13, color: C.nightMuted, marginTop: 10 }}>{t("processing_n", { i: prog[0], n: prog[1] })}</Text> : null}
            </View>
          ) : phase === "error" ? (
            <Text style={{ fontFamily: F.sansBold, fontSize: 18, lineHeight: 26, color: C.pink }}>{err}</Text>
          ) : (
            <>
              <Text style={{ fontFamily: F.display, fontSize: 86, lineHeight: 96, color: C.nightInk, letterSpacing: -2 }}>{hhmm(now.getTime())}</Text>
              <Label color={C.nightMuted} style={{ marginTop: 6 }}>
                {t("rec_since", { time: hhmm(startedAt.current) })}
              </Label>
              <View style={{ marginTop: 40, flexDirection: "row", alignItems: "flex-end", gap: 14 }}>
                <Text style={{ fontFamily: F.display, fontSize: 54, color: C.pink }}>{caught}</Text>
                <Text style={{ fontFamily: F.sansBold, fontSize: 15, color: C.nightMuted, marginBottom: 12 }}>{t("rec_caught")}</Text>
              </View>
              <Svg width="100%" height={56} viewBox="0 0 300 56" preserveAspectRatio="none" style={{ marginTop: 18 }}>
                <Polyline points={pts} fill="none" stroke={C.nightMuted} strokeWidth={1.6} />
              </Svg>
              <Text style={{ fontFamily: F.sansMed, fontSize: 13.5, color: C.nightMuted, marginTop: 18 }}>{web ? t("rec_demo") : t("rec_tip")}</Text>
            </>
          )}
        </View>

        {phase === "live" ? (
          <View style={{ alignItems: "center", paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
            <Pressable onPressIn={onIn} onPressOut={onOut} accessibilityLabel={t("rec_hold")} style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
              <Svg width={100} height={100} style={{ position: "absolute" }}>
                <Circle cx={50} cy={50} r={R} stroke={C.night3} strokeWidth={4} fill="none" />
                <AnimatedCircle cx={50} cy={50} r={R} stroke={C.pink} strokeWidth={4} fill="none" strokeDasharray={`${CIRC} ${CIRC}`} animatedProps={ringProps} rotation={-90} origin="50, 50" strokeLinecap="round" />
              </Svg>
              <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: C.night2, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: C.nightInk }} />
              </View>
            </Pressable>
            <Label color={C.nightMuted} style={{ marginTop: 8 }}>
              {t("rec_hold")}
            </Label>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
