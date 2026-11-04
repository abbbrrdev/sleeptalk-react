import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Edge = "top" | "right" | "bottom" | "left";

/**
 * Drop-in for react-native-safe-area-context's SafeAreaView.
 *
 * The native SafeAreaView measures where it sits on screen. In a modal that
 * slides up from the bottom it is measured while still off-screen, gets a top
 * inset of 0 and sometimes keeps it — then the close button ends up under the
 * status bar / Dynamic Island. This version pads by the window's insets
 * (from SafeAreaProvider), so it is right from the first frame.
 */
export function SafeAreaView({
  edges = ["top", "right", "bottom", "left"],
  style,
  ...rest
}: ViewProps & { edges?: readonly Edge[]; style?: StyleProp<ViewStyle> }) {
  const i = useSafeAreaInsets();
  const on = (e: Edge) => edges.includes(e);
  return (
    <View
      {...rest}
      style={[
        style,
        {
          paddingTop: on("top") ? i.top : 0,
          paddingBottom: on("bottom") ? i.bottom : 0,
          paddingLeft: on("left") ? i.left : 0,
          paddingRight: on("right") ? i.right : 0,
        },
      ]}
    />
  );
}
