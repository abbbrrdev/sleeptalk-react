import { deleteFile } from "./engine";
import { FREE_KEEP_DAYS, useSleep } from "@/store/useSleep";

/** Free plan: audio of clips older than 7 days is deleted unless the clip was kept. */
export function cleanupOldClips() {
  const s = useSleep.getState();
  if (s.isPro) return;
  const cutoff = Date.now() - FREE_KEEP_DAYS * 86400_000;
  let changed = false;
  const nights = s.nights.map((n) => {
    if (n.endedAt > cutoff) return n;
    return {
      ...n,
      clips: n.clips.map((c) => {
        if (c.kept || !c.uri) return c;
        deleteFile(c.uri);
        changed = true;
        return { ...c, uri: null };
      }),
    };
  });
  if (changed) useSleep.getState().set({ nights });
}
