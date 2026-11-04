import { getLocales } from "expo-localization";
import en, { type Dict } from "./en";
import ru from "./ru";
import es from "./es";
import pt from "./pt";
import de from "./de";
import fr from "./fr";
import it from "./it";
import ja from "./ja";
import ko from "./ko";
import zhHans from "./zh-Hans";
import zhHant from "./zh-Hant";

export type Lang = "en" | "ru" | "es" | "pt" | "de" | "fr" | "it" | "ja" | "ko" | "zh-Hans" | "zh-Hant";
export type Script = "latin" | "cyrillic" | "cjk";

export const LANGS: { code: Lang; name: string; locale: string; script: Script }[] = [
  { code: "en", name: "English", locale: "en-US", script: "latin" },
  { code: "ru", name: "Русский", locale: "ru-RU", script: "cyrillic" },
  { code: "es", name: "Español", locale: "es-ES", script: "latin" },
  { code: "pt", name: "Português", locale: "pt-BR", script: "latin" },
  { code: "de", name: "Deutsch", locale: "de-DE", script: "latin" },
  { code: "fr", name: "Français", locale: "fr-FR", script: "latin" },
  { code: "it", name: "Italiano", locale: "it-IT", script: "latin" },
  { code: "ja", name: "日本語", locale: "ja-JP", script: "cjk" },
  { code: "ko", name: "한국어", locale: "ko-KR", script: "cjk" },
  { code: "zh-Hans", name: "简体中文", locale: "zh-CN", script: "cjk" },
  { code: "zh-Hant", name: "繁體中文", locale: "zh-TW", script: "cjk" },
];

const DICTS: Record<Lang, Dict> = { en, ru, es, pt, de, fr, it, ja, ko, "zh-Hans": zhHans, "zh-Hant": zhHant };

/** Maps the device locale list to the first language we support. */
export function detectLang(): Lang {
  try {
    for (const l of getLocales()) {
      const code = (l.languageCode ?? "").toLowerCase();
      if (code === "zh") {
        const script = l.languageScriptCode ?? "";
        const region = l.regionCode ?? "";
        return script === "Hant" || ["TW", "HK", "MO"].includes(region) ? "zh-Hant" : "zh-Hans";
      }
      // Kazakh/Ukrainian/Belarusian/Kyrgyz speakers mostly read Russian
      if (["ru", "kk", "uk", "be", "ky", "uz"].includes(code)) return "ru";
      const hit = LANGS.find((x) => x.code === code);
      if (hit) return hit.code;
    }
  } catch {}
  return "en";
}

let current: Lang = detectLang();

export function setLang(lang: Lang | null) {
  current = lang ?? detectLang();
}
export const getLang = () => current;
export const langInfo = (l: Lang = current) => LANGS.find((x) => x.code === l)!;
export const script = (): Script => langInfo().script;
export const locale = () => langInfo().locale;

export type TKey = keyof Dict;

export function t(key: TKey, vars?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
