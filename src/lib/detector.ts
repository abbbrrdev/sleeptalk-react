// Pure night-sound maths. No React / native imports — testable with plain node.
//
// Input: a metering stream (dBFS, roughly −160…0) sampled every ~250 ms.
// Output: "events" (stretches noticeably louder than the room) with a little
// pre-roll / post-roll, plus a per-minute loudness strip for the timeline.

export type SoundKind = "talk" | "snore" | "laugh" | "cough" | "other";

export type NightEvent = {
  /** ms from the start of the recording, already padded with pre/post roll */
  start: number;
  end: number;
  /** loudest dB in the event and how far above the room it was */
  peak: number;
  over: number;
  /** 48 bars, 0..1, for the little waveform */
  wave: number[];
};

const PRE_ROLL = 1500;
const POST_ROLL = 2000;
const CLOSE_AFTER = 2500; // quiet this long → event over
const MIN_EVENT = 450; // shorter than this = a click, ignore
const MERGE_GAP = 4000;
const MAX_EVENT = 60_000;
const WINDOW = 480; // samples for the noise floor (~2 min at 250 ms)

function percentile(xs: number[], p: number) {
  if (!xs.length) return -60;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

export function downsample(xs: number[], n: number): number[] {
  if (!xs.length) return Array(n).fill(0);
  return Array.from({ length: n }, (_, i) => {
    const a = Math.floor((i * xs.length) / n);
    const b = Math.max(a + 1, Math.floor(((i + 1) * xs.length) / n));
    return Math.max(...xs.slice(a, b));
  });
}

export class Detector {
  /** current estimate of the room's background level, dB */
  floor = -55;
  /** dB above the floor that counts as "something happened" */
  margin: number;
  events: NightEvent[] = [];
  /** loudest dB per minute of the night */
  minutes: number[] = [];
  private ring: number[] = [];
  private n = 0;
  private cur: { start: number; end: number; peak: number; levels: number[] } | null = null;

  constructor(sensitivity: "low" | "normal" | "high" = "normal") {
    this.margin = sensitivity === "high" ? 9 : sensitivity === "low" ? 18 : 13;
  }

  feed(t: number, db: number) {
    if (!Number.isFinite(db)) return;
    db = Math.max(-90, Math.min(0, db));
    // per-minute strip
    const m = Math.floor(t / 60_000);
    while (this.minutes.length <= m) this.minutes.push(-90);
    this.minutes[m] = Math.max(this.minutes[m], db);

    // noise floor: 20th percentile of the last ~2 minutes, updated every 5 s
    this.ring.push(db);
    if (this.ring.length > WINDOW) this.ring.shift();
    if (++this.n % 20 === 0 && this.ring.length >= 40) this.floor = percentile(this.ring, 0.2);

    const threshold = Math.max(this.floor + this.margin, -50);
    if (db >= threshold) {
      if (!this.cur) this.cur = { start: t, end: t, peak: db, levels: [] };
      this.cur.end = t;
      this.cur.peak = Math.max(this.cur.peak, db);
    } else if (this.cur && t - this.cur.end > CLOSE_AFTER) {
      this.close();
    }
    if (this.cur) {
      this.cur.levels.push(Math.max(0, db - this.floor));
      if (t - this.cur.start > MAX_EVENT) this.close();
    }
  }

  private close() {
    const c = this.cur;
    this.cur = null;
    if (!c || c.end - c.start < MIN_EVENT) return;
    const top = Math.max(...c.levels, 1);
    const ev: NightEvent = {
      start: Math.max(0, c.start - PRE_ROLL),
      end: c.end + POST_ROLL,
      peak: c.peak,
      over: Math.round(c.peak - this.floor),
      wave: downsample(c.levels, 48).map((v) => Math.round((v / top) * 100) / 100),
    };
    const prev = this.events[this.events.length - 1];
    if (prev && ev.start - prev.end < MERGE_GAP && ev.end - prev.start < MAX_EVENT) {
      prev.end = ev.end;
      prev.peak = Math.max(prev.peak, ev.peak);
      prev.over = Math.max(prev.over, ev.over);
      prev.wave = downsample([...prev.wave, ...ev.wave], 48);
    } else this.events.push(ev);
  }

  finish(): { events: NightEvent[]; minutes: number[]; floor: number } {
    this.close();
    return { events: this.events, minutes: this.minutes, floor: this.floor };
  }
}

/** Keep the most interesting events (loudest first), capped, returned in time order. */
export function pickEvents(events: NightEvent[], max = 40): NightEvent[] {
  return [...events]
    .sort((a, b) => b.over - a.over)
    .slice(0, max)
    .sort((a, b) => a.start - b.start);
}

// ── Classification (labels from Apple's SoundAnalysis classifier) ──
const KIND_OF: Record<string, SoundKind> = {
  speech: "talk",
  whispering: "talk",
  shout: "talk",
  yell: "talk",
  babble: "talk",
  singing: "talk",
  snoring: "snore",
  breathing: "snore",
  gasp: "snore",
  laughter: "laugh",
  giggling: "laugh",
  snicker: "laugh",
  belly_laugh: "laugh",
  chuckle_chortle: "laugh",
  baby_laughter: "laugh",
  cough: "cough",
  sneeze: "cough",
  throat_clearing: "cough",
  sniff: "cough",
  nose_blowing: "cough",
};

export function kindFrom(labels: { label: string; confidence: number }[]): { kind: SoundKind; confidence: number } {
  const score: Record<SoundKind, number> = { talk: 0, snore: 0, laugh: 0, cough: 0, other: 0 };
  for (const l of labels) {
    const k = KIND_OF[l.label];
    if (k) score[k] = Math.max(score[k], l.confidence);
  }
  // speech beats breathing; laughter beats speech when close
  const best = (Object.entries(score) as [SoundKind, number][]).sort((a, b) => b[1] - a[1])[0];
  if (best[1] < 0.3) return { kind: "other", confidence: best[1] };
  return { kind: best[0], confidence: best[1] };
}

// ── Night summary ───────────────────────────────────────────────────
export type ClipLite = { kind: SoundKind; durationMs: number; over: number };

export function snoreScore(clips: ClipLite[], nightMs: number, scale = 1): number {
  const snoreMs = clips.filter((c) => c.kind === "snore").reduce((a, c) => a + c.durationMs, 0) * scale;
  const share = nightMs > 0 ? snoreMs / nightMs : 0;
  const loud = clips.filter((c) => c.kind === "snore").reduce((a, c) => Math.max(a, c.over), 0);
  return Math.round(Math.min(100, share * 400 + Math.max(0, loud - 10) * 1.2));
}

/**
 * `scale` extrapolates snoring time when only the loudest events were kept as clips
 * (total event time / clipped event time).
 */
export function summarize(clips: ClipLite[], nightMs: number, scale = 1) {
  const count = (k: SoundKind) => clips.filter((c) => c.kind === k).length;
  const snoreMin = Math.round((clips.filter((c) => c.kind === "snore").reduce((a, c) => a + c.durationMs, 0) * scale) / 60_000);
  return {
    talk: count("talk"),
    snore: count("snore"),
    laugh: count("laugh"),
    cough: count("cough"),
    other: count("other"),
    snoreMin,
    snoreScore: snoreScore(clips, nightMs, scale),
  };
}
