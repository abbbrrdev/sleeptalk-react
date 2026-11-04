import { requireOptionalNativeModule } from "expo-modules-core";

type Native = {
  trim(src: string, start: number, end: number, dest: string): Promise<boolean>;
  classify(file: string): Promise<{ label: string; confidence: number }[]>;
};

/** null on web / Android / Expo Go. */
export const NightLab = requireOptionalNativeModule<Native>("NightLab");
