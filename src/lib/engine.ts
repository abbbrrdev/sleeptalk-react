/**
 * Night pipeline:
 *  record (expo-audio, metering on) → Detector finds loud stretches →
 *  NightLab.trim cuts each into a clip → NightLab.classify labels it with
 *  Apple's on-device sound classifier → the full recording is deleted.
 * Optional (Pro): transcribe a talk clip with on-device speech recognition.
 */
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { NightLab } from "@modules/night-lab";
import { type Clip, type Night, type Sensitivity } from "@/store/useSleep";
import { Detector, kindFrom, pickEvents, summarize, type NightEvent, type SoundKind } from "./detector";
import { getLang } from "@/i18n";

export const MIN_NIGHT_MS = 5 * 60_000;

export function clipsDir(): Directory | null {
  if (Platform.OS === "web") return null;
  try {
    const d = new Directory(Paths.document, "clips");
    if (!d.exists) d.create({ intermediates: true, idempotent: true });
    return d;
  } catch {
    return null;
  }
}

export function deleteFile(uri: string | null | undefined) {
  if (!uri || Platform.OS === "web") return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}

export function fileSize(uri: string | null | undefined): number {
  if (!uri || Platform.OS === "web") return 0;
  try {
    return new File(uri).size ?? 0;
  } catch {
    return 0;
  }
}

const normMinutes = (mins: number[], floor: number) => mins.map((db) => Math.round(Math.max(0, Math.min(1, (db - floor) / 30)) * 100) / 100);

/** Turns a finished recording + detector output into a Night (with clip files). */
export async function processNight(opts: {
  id: string;
  uri: string | null;
  startedAt: number;
  endedAt: number;
  detector: Detector;
  onProgress?: (i: number, n: number) => void;
}): Promise<Omit<Night, "n">> {
  const { events, minutes, floor } = opts.detector.finish();
  const picked = pickEvents(events, 40);
  const dir = clipsDir();
  const clips: Clip[] = [];
  for (let i = 0; i < picked.length; i++) {
    opts.onProgress?.(i + 1, picked.length);
    const ev = picked[i];
    let uri: string | null = null;
    let labels: { label: string; confidence: number }[] = [];
    if (NightLab && dir && opts.uri) {
      const dest = new File(dir, `${opts.id}-${i}.m4a`).uri;
      const ok = await NightLab.trim(opts.uri, ev.start / 1000, ev.end / 1000, dest).catch(() => false);
      if (ok) {
        uri = dest;
        labels = await NightLab.classify(dest).catch(() => []);
      }
    }
    const k = kindFrom(labels);
    clips.push(clipFrom(opts.id, i, ev, opts.startedAt, k.kind, k.confidence, uri));
  }
  deleteFile(opts.uri);
  const nightMs = opts.endedAt - opts.startedAt;
  const evMs = (xs: NightEvent[]) => xs.reduce((a, e) => a + (e.end - e.start), 0);
  const scale = picked.length ? Math.max(1, evMs(events) / Math.max(1, evMs(picked))) : 1;
  return {
    id: opts.id,
    startedAt: opts.startedAt,
    endedAt: opts.endedAt,
    minutes: normMinutes(minutes, floor),
    clips,
    summary: summarize(clips.map((c) => ({ kind: c.kind, durationMs: c.durationMs, over: c.over })), nightMs, scale),
  };
}

function clipFrom(nightId: string, i: number, ev: NightEvent, startedAt: number, kind: SoundKind, confidence: number, uri: string | null): Clip {
  return {
    id: `${nightId}-${i}`,
    offset: ev.start,
    at: startedAt + ev.start,
    durationMs: ev.end - ev.start,
    kind,
    confidence,
    over: ev.over,
    wave: ev.wave,
    uri,
    text: null,
  };
}

// ── Transcription (Pro) ─────────────────────────────────────────────
const SR_LOCALE: Record<string, string> = {
  en: "en-US",
  ru: "ru-RU",
  es: "es-ES",
  pt: "pt-BR",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  ja: "ja-JP",
  ko: "ko-KR",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
};

export async function transcribe(uri: string, lang: string): Promise<string> {
  if (Platform.OS === "web") return "";
  const { ExpoSpeechRecognitionModule: SR } = require("expo-speech-recognition") as typeof import("expo-speech-recognition");
  const perm = await SR.requestPermissionsAsync().catch(() => null);
  if (!perm?.granted) return "";
  return new Promise((resolve) => {
    let text = "";
    const subs = [
      SR.addListener("result", (ev) => {
        const r = ev.results[0];
        if (r?.transcript) text = r.transcript;
      }),
      SR.addListener("end", () => {
        subs.forEach((s) => s.remove());
        resolve(text.trim());
      }),
      SR.addListener("error", () => {}),
    ];
    SR.start({
      lang: SR_LOCALE[lang] ?? "en-US",
      interimResults: false,
      requiresOnDeviceRecognition: SR.supportsOnDeviceRecognition(),
      addsPunctuation: true,
      audioSource: { uri },
    });
    setTimeout(() => {
      try {
        SR.stop();
      } catch {}
    }, 90_000);
  });
}

// ── Demo nights (web preview / developer seed) ─────────────────────
const DEMO_TEXTS: Record<string, string[]> = {
  en: ["No, the penguins are mine.", "Five more minutes, I'm the captain.", "Who moved the cheese?", "Put it on the invoice."],
  ru: ["Нет, пингвины мои.", "Ещё пять минут, я капитан.", "Кто передвинул сыр?", "Запиши это в счёт."],
  es: ["No, los pingüinos son míos.", "Cinco minutos más, soy el capitán.", "¿Quién ha movido el queso?", "Ponlo en la factura."],
  pt: ["Não, os pinguins são meus.", "Mais cinco minutos, eu sou o capitão.", "Quem mexeu no queijo?", "Coloca na nota fiscal."],
  de: ["Nein, die Pinguine gehören mir.", "Noch fünf Minuten, ich bin der Kapitän.", "Wer hat den Käse verschoben?", "Schreib's auf die Rechnung."],
  fr: ["Non, les pingouins sont à moi.", "Encore cinq minutes, je suis le capitaine.", "Qui a déplacé le fromage ?", "Mets-le sur la facture."],
  it: ["No, i pinguini sono miei.", "Altri cinque minuti, sono il capitano.", "Chi ha spostato il formaggio?", "Mettilo in fattura."],
  ja: ["だめ、ペンギンはぼくの。", "あと五分、船長はぼくだ。", "チーズ動かしたの誰？", "それ、請求書につけといて。"],
  ko: ["안 돼, 펭귄은 내 거야.", "5분만 더, 내가 선장이야.", "누가 치즈를 옮겼어?", "그거 청구서에 올려 둬."],
  "zh-Hans": ["不行，企鹅是我的。", "再睡五分钟，我是船长。", "谁动了我的奶酪？", "记在账单上。"],
  "zh-Hant": ["不行，企鵝是我的。", "再睡五分鐘，我是船長。", "誰動了我的乳酪？", "記在帳單上。"],
};


export function demoNight(id: string, daysAgo = 1, seed = 5): Omit<Night, "n"> {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(23, 12 + Math.floor(rnd() * 30), 0, 0);
  const startedAt = start.getTime();
  const nightMs = (7 + rnd()) * 3600_000;
  const minutes = Array.from({ length: Math.round(nightMs / 60_000) }, (_, m) => {
    const snoring = m > 150 && m < 210;
    return Math.round(Math.min(1, (snoring ? 0.45 : 0.08) + rnd() * 0.18 + (rnd() > 0.985 ? 0.5 : 0)) * 100) / 100;
  });
  const plan: [SoundKind, number, number][] = [
    ["talk", 62, 7],
    ["snore", 158, 60],
    ["snore", 176, 60],
    ["laugh", 204, 4],
    ["talk", 231, 11],
    ["cough", 290, 3],
    ["snore", 322, 40],
    ["talk", 371, 6],
    ["other", 401, 5],
  ];
  const clips: Clip[] = plan.map(([kind, min, sec], i) => {
    const offset = min * 60_000 + Math.floor(rnd() * 50_000);
    const wave = Array.from({ length: 48 }, (_, j) => {
      const base = kind === "snore" ? 0.35 + 0.5 * Math.abs(Math.sin(j / 3.2)) : kind === "talk" ? 0.2 + rnd() * 0.8 : 0.1 + rnd() * 0.6;
      return Math.round(Math.min(1, base) * 100) / 100;
    });
    return {
      id: `${id}-${i}`,
      offset,
      at: startedAt + offset,
      durationMs: sec * 1000,
      kind,
      confidence: 0.6 + rnd() * 0.35,
      over: kind === "talk" ? 22 + Math.round(rnd() * 8) : kind === "snore" ? 14 + Math.round(rnd() * 6) : 12 + Math.round(rnd() * 10),
      wave,
      uri: null,
      text: kind === "talk" && i === 0 ? (DEMO_TEXTS[getLang()] ?? DEMO_TEXTS.en)[seed % 4] : null,
    };
  });
  return {
    id,
    startedAt,
    endedAt: startedAt + nightMs,
    minutes,
    clips,
    // the demo pretends ~40 min of snoring happened around the kept clips
    summary: summarize(clips.map((c) => ({ kind: c.kind, durationMs: c.durationMs, over: c.over })), nightMs, 14),
  };
}
