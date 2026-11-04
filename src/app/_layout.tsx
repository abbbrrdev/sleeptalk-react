import { DelaGothicOne_400Regular } from "@expo-google-fonts/dela-gothic-one";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { MartianMono_400Regular, MartianMono_500Medium, MartianMono_700Bold } from "@expo-google-fonts/martian-mono";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { getLang, setLang } from "@/i18n";
import { distinctId, initAnalytics, setTraits, useScreenTracking } from "@/lib/analytics";
import { cleanupOldClips } from "@/lib/cleanup";
import { useComeback } from "@/lib/comeback";
import { sleepPlan } from "@/lib/nudges";
import { initPurchases, linkAnalytics } from "@/lib/purchases";
import { C } from "@/lib/theme";
import { useWidgetSync } from "@/lib/widgetSync";
import { useSleep } from "@/store/useSleep";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DelaGothicOne_400Regular,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    MartianMono_400Regular,
    MartianMono_500Medium,
    MartianMono_700Bold,
  });
  const hydrated = useSleep((s) => s.hydrated);
  const lang = useSleep((s) => s.lang);
  setLang(lang);
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  useEffect(() => {
    if (!hydrated) return;
    initPurchases((pro) => useSleep.getState().set({ isPro: pro }));
    cleanupOldClips();
    initAnalytics().then(() => linkAnalytics(distinctId()));
  }, [hydrated]);
  const isPro = useSleep((s) => s.isPro);
  useEffect(() => {
    if (hydrated) setTraits({ is_pro: isPro, app_lang: getLang(), nights: useSleep.getState().nights.length, sensitivity: useSleep.getState().sensitivity });
  }, [hydrated, isPro, lang]);
  useScreenTracking();
  useWidgetSync(lang);

  useComeback(sleepPlan, hydrated);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.paper }} />;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <Stack key={lang ?? "auto"} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper }, animation: "slide_from_right" }}>
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="night" options={{ presentation: "fullScreenModal", animation: "fade", gestureEnabled: false, contentStyle: { backgroundColor: C.night } }} />
        <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="share" options={{ presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
