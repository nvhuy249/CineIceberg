import { useEffect, useRef } from "react";
import {
  Animated,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  THEATER_THEME,
  withOpacity,
} from "@/src/constants/designTokens";

type TheaterCurtainProps = {
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export default function TheaterCurtain({ height = 200, style }: TheaterCurtainProps) {
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [sway]);

  const leftShift = sway.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 6],
  });
  const rightShift = sway.interpolate({
    inputRange: [0, 1],
    outputRange: [3, -6],
  });
  const spotlightOpacity = sway.interpolate({
    inputRange: [0, 1],
    outputRange: [0.09, THEATER_THEME.stageLightOpacity],
  });

  return (
    <View style={[styles.frame, { height }, style]}>
      <Animated.View style={[styles.curtainHalf, styles.curtainLeft, { transform: [{ translateX: leftShift }] }]} />
      <Animated.View
        style={[styles.curtainHalf, styles.curtainRight, { transform: [{ translateX: rightShift }] }]}
      />
      <View style={styles.stripeLeft} />
      <View style={styles.stripeRight} />
      <Animated.View style={[styles.spotlight, { opacity: spotlightOpacity }]} />
      <View style={styles.stageLip} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
    backgroundColor: COLORS.theater.curtainDeep,
  },
  curtainHalf: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "56%",
    backgroundColor: COLORS.theater.curtain,
  },
  curtainLeft: {
    left: -8,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
  },
  curtainRight: {
    right: -8,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.theater.curtainHighlight,
  },
  stripeLeft: {
    position: "absolute",
    left: "18%",
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: withOpacity(
      COLORS.theater.curtainHighlight,
      THEATER_THEME.curtainStripeOpacity,
    ),
  },
  stripeRight: {
    position: "absolute",
    right: "18%",
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: withOpacity(
      COLORS.theater.curtainDeep,
      THEATER_THEME.curtainStripeOpacity,
    ),
  },
  spotlight: {
    position: "absolute",
    left: "23%",
    right: "23%",
    top: 18,
    bottom: 34,
    borderRadius: 200,
    backgroundColor: withOpacity(COLORS.theater.spotlight, 0.24),
  },
  stageLip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
    backgroundColor: withOpacity(COLORS.theater.stage, 0.86),
    borderTopWidth: 1,
    borderTopColor: withOpacity(COLORS.theater.stageEdge, 0.95),
  },
});
