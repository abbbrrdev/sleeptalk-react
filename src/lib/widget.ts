/**
 * Pushes a small, flat snapshot to the home-screen / lock-screen widget through
 * the shared App Group (UserDefaults suite). The widget (targets/widget/*.swift)
 * reads the "widget" dictionary and re-renders. Labels are sent already
 * localized so the widget speaks the app's language.
 */
import { ExtensionStorage } from "@kingstinct/expo-apple-targets";
import { Platform } from "react-native";
import { APP_GROUP } from "./analyticsConfig";

const store = Platform.OS === "ios" ? new ExtensionStorage(APP_GROUP) : null;
let last = "";

export function pushWidget(data: Record<string, string | number>) {
  if (!store) return;
  // The native side JSON-encodes this (JSONSerialization) — NaN/Infinity would raise an
  // uncatchable Obj-C exception and crash the app. The widget reads whole numbers.
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (typeof v === "number") data[k] = Number.isFinite(v) ? Math.round(v) : 0;
  }
  const json = JSON.stringify(data);
  if (json === last) return;
  last = json;
  try {
    store.set("widget", { ...data, updated: Math.floor(Date.now() / 1000) });
    ExtensionStorage.reloadWidget();
  } catch {}
}
