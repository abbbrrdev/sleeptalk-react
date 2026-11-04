import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lang } from "@/i18n";
import type { SoundKind } from "@/lib/detector";

export const FREE_CLIPS = 3;
export const FREE_NIGHTS = 3;
export const FREE_KEEP_DAYS = 7;

export type Clip = {
  id: string;
  /** ms from the start of the night */
  offset: number;
  /** epoch ms when it happened */
  at: number;
  durationMs: number;
  kind: SoundKind;
  confidence: number;
  /** dB above the room */
  over: number;
  wave: number[];
  /** file:// uri, null for demo clips or deleted audio */
  uri: string | null;
  text?: string | null;
  kept?: boolean;
};

export type Night = {
  id: string;
  n: number;
  startedAt: number;
  endedAt: number;
  /** loudest level per minute, 0..1 */
  minutes: number[];
  clips: Clip[];
  summary: { talk: number; snore: number; laugh: number; cough: number; other: number; snoreMin: number; snoreScore: number };
};

export type Sensitivity = "low" | "normal" | "high";

type State = {
  hydrated: boolean;
  onboarded: boolean;
  nights: Night[];
  counter: number;
  sensitivity: Sensitivity;
  speechLang: Lang | null;
  isPro: boolean;
  /** bedtime reminder */
  reminder: { on: boolean; h: number; m: number };
  /** come-back reminders after a few days away */
  nudges: boolean;
  askedNotif: boolean;
  lang: Lang | null;
};

type Actions = {
  set: (p: Partial<State>) => void;
  addNight: (n: Omit<Night, "n">) => Night;
  updateClip: (nightId: string, clipId: string, p: Partial<Clip>) => void;
  removeNight: (id: string) => void;
  resetAll: () => void;
};

const initial = (): State => ({
  hydrated: false,
  onboarded: false,
  nights: [],
  counter: 0,
  sensitivity: "normal",
  speechLang: null,
  isPro: false,
  reminder: { on: true, h: 22, m: 30 },
  nudges: true,
  askedNotif: false,
  lang: null,
});

export const useSleep = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),
      set: (p) => set(p),
      addNight: (n) => {
        const counter = get().counter + 1;
        const night: Night = { ...n, n: counter };
        set({ nights: [...get().nights, night], counter });
        return night;
      },
      updateClip: (nightId, clipId, p) =>
        set({
          nights: get().nights.map((n) => (n.id !== nightId ? n : { ...n, clips: n.clips.map((c) => (c.id === clipId ? { ...c, ...p } : c)) })),
        }),
      removeNight: (id) => set({ nights: get().nights.filter((n) => n.id !== id) }),
      resetAll: () => set({ ...initial(), hydrated: true }),
    }),
    {
      name: "sleeptalk-state-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, ...rest }) => rest as any,
      onRehydrateStorage: () => () => useSleep.setState({ hydrated: true }),
    },
  ),
);

/** Clips a free user can open: the 3 loudest of the night, plus anything kept. */
export function unlockedIds(night: Night, isPro: boolean): Set<string> {
  if (isPro) return new Set(night.clips.map((c) => c.id));
  const best = [...night.clips].sort((a, b) => b.over - a.over).slice(0, FREE_CLIPS);
  return new Set([...best.map((c) => c.id), ...night.clips.filter((c) => c.kept).map((c) => c.id)]);
}
