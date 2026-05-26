import {
  forwardRef,
  type PropsWithChildren,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  Z_INDEX,
  withOpacity,
} from "@/src/constants/designTokens";

export type CurtainTransitionRef = {
  open: () => void;
  close: (onDone?: () => void) => void;
  closeAndNavigate: (navigate: () => void) => void;
};

type CurtainTransitionProps = PropsWithChildren<{
  openDelay?: number;
  autoOpen?: boolean;
  onOpened?: () => void;
  onClosed?: () => void;
}>;

type PanelSide = "left" | "right";

const FOLD_COUNT = 9;
const DUST_COUNT = 16;

function getDuration(duration: number, reduceMotion: boolean) {
  return reduceMotion ? Math.min(duration, 90) : duration;
}

function getOpenDistance(width: number) {
  return width * 0.58 + 42;
}

function CurtainTransition(
  {
    children,
    openDelay = 180,
    autoOpen = true,
    onOpened,
    onClosed,
  }: CurtainTransitionProps,
  ref: Ref<CurtainTransitionRef>,
) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [isOverlayMounted, setIsOverlayMounted] = useState(true);
  const openProgress = useSharedValue(0);

  const completeOpen = useCallback(() => {
    setIsOverlayMounted(false);
    onOpened?.();
  }, [onOpened]);

  const completeClose = useCallback(() => {
    onClosed?.();
  }, [onClosed]);

  const open = useCallback(() => {
    setIsOverlayMounted(true);
    cancelAnimation(openProgress);

    if (reduceMotion) {
      openProgress.value = 1;
      completeOpen();
      return;
    }

    openProgress.value = 0;

    openProgress.value = withDelay(
      openDelay,
      withTiming(
        1,
        {
          duration: 1160,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        },
        (finished) => {
          if (finished) runOnJS(completeOpen)();
        },
      ),
    );
  }, [completeOpen, openDelay, openProgress, reduceMotion]);

  const close = useCallback(
    (onDone?: () => void) => {
      setIsOverlayMounted(true);
      cancelAnimation(openProgress);

      const finishClose = () => {
        completeClose();
        onDone?.();
      };

      if (reduceMotion) {
        openProgress.value = 0;
        finishClose();
        return;
      }

      openProgress.value = withTiming(
        0,
        {
          duration: getDuration(760, reduceMotion),
          easing: Easing.bezier(0.7, 0, 0.84, 0),
        },
        (finished) => {
          if (finished) runOnJS(finishClose)();
        },
      );
    },
    [completeClose, openProgress, reduceMotion],
  );

  useImperativeHandle(
    ref,
    () => ({
      open,
      close,
      closeAndNavigate: (navigate: () => void) => close(navigate),
    }),
    [close, open],
  );

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!mounted) return;
        setReduceMotion(enabled);
        setMotionReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setMotionReady(true);
      });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (autoOpen && motionReady) open();
  }, [autoOpen, motionReady, open]);

  useEffect(
    () => () => {
      cancelAnimation(openProgress);
    },
    [openProgress],
  );

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - openProgress.value * 0.08,
  }));

  return (
    <View style={styles.container}>
      {children}
      {isOverlayMounted ? (
        <Animated.View
          style={[styles.overlay, overlayStyle]}
        >
          <CurtainPanel
            side="left"
            width={width}
            height={height}
            openProgress={openProgress}
          />
          <CurtainPanel
            side="right"
            width={width}
            height={height}
            openProgress={openProgress}
          />
          <View style={styles.valance}>
            <View style={styles.valanceRail} />
            <View style={styles.valanceLip} />
            {Array.from({ length: 11 }).map((_, index) => (
              <View key={index} style={[styles.ring, { left: `${index * 10}%` }]} />
            ))}
          </View>
          <Dust width={width} height={height} openProgress={openProgress} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function CurtainPanel({
  side,
  width,
  height,
  openProgress,
}: {
  side: PanelSide;
  width: number;
  height: number;
  openProgress: SharedValue<number>;
}) {
  const panelWidth = width / 2 + 38;
  const distance = getOpenDistance(width);
  const folds = useMemo(
    () =>
      Array.from({ length: FOLD_COUNT }).map((_, index) => ({
        left: ((index + 0.6) / FOLD_COUNT) * panelWidth,
        width: index % 2 === 0 ? 20 : 34,
        opacity: index % 2 === 0 ? 0.26 : 0.16,
      })),
    [panelWidth],
  );

  const panelStyle = useAnimatedStyle(() => {
    const direction = side === "left" ? -1 : 1;
    const progress = openProgress.value;
    return {
      transform: [
        { translateX: direction * distance * progress },
        { skewX: `${direction * progress * -4}deg` },
        { scaleX: 1 - progress * 0.04 },
      ],
    };
  });

  const edgeStyle = side === "left" ? styles.innerEdgeLeft : styles.innerEdgeRight;
  const hemStyle = side === "left" ? styles.panelHemLeft : styles.panelHemRight;

  return (
    <Animated.View
      style={[
        styles.panel,
        side === "left" ? styles.panelLeft : styles.panelRight,
        { width: panelWidth, height },
        panelStyle,
      ]}
    >
      <View style={styles.velvetBase} />
      <View style={styles.velvetShadeTop} />
      <View style={styles.velvetShadeBottom} />
      {folds.map((fold, index) => (
        <View
          key={index}
          style={[
            styles.fold,
            {
              left: fold.left,
              width: fold.width,
              opacity: fold.opacity,
              height,
            },
          ]}
        />
      ))}
      <View style={[styles.innerEdge, edgeStyle]} />
      <View style={[styles.panelHem, hemStyle]} />
      <View style={styles.fringe}>
        {Array.from({ length: 13 }).map((_, index) => (
          <View key={index} style={styles.tassel}>
            <View style={styles.tasselHead} />
            <View style={styles.tasselCord} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function Dust({
  width,
  height,
  openProgress,
}: {
  width: number;
  height: number;
  openProgress: SharedValue<number>;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: DUST_COUNT }).map((_, index) => ({
        left: ((index * 37) % 100) / 100,
        top: 0.16 + (((index * 19) % 58) / 100),
        size: 2 + (index % 3),
        delay: index * 0.018,
      })),
    [],
  );

  return (
    <View style={styles.dustLayer}>
      {particles.map((particle, index) => (
        <DustParticle
          key={index}
          particle={particle}
          width={width}
          height={height}
          openProgress={openProgress}
        />
      ))}
    </View>
  );
}

function DustParticle({
  particle,
  width,
  height,
  openProgress,
}: {
  particle: { left: number; top: number; size: number; delay: number };
  width: number;
  height: number;
  openProgress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const progress = Math.max(0, openProgress.value - particle.delay);
    return {
      opacity: Math.max(0, Math.min(progress * 2.2, 0.48) - openProgress.value * 0.2),
      transform: [
        { translateY: progress * -28 },
        { translateX: (progress - 0.4) * 18 },
        { scale: 0.7 + progress * 0.8 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.dust,
        {
          left: particle.left * width,
          top: particle.top * height,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size,
        },
        style,
      ]}
    />
  );
}

export default forwardRef(CurtainTransition);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: Z_INDEX.modal,
    overflow: "hidden",
    pointerEvents: "auto",
  },
  panel: {
    position: "absolute",
    top: 0,
    overflow: "hidden",
    backgroundColor: COLORS.theater.curtain,
  },
  panelLeft: {
    left: -38,
  },
  panelRight: {
    right: -38,
  },
  velvetBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.theater.curtain,
  },
  velvetShadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "42%",
    backgroundColor: withOpacity(COLORS.theater.curtainHighlight, 0.24),
  },
  velvetShadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "46%",
    backgroundColor: withOpacity(COLORS.theater.curtainDeep, 0.42),
  },
  fold: {
    position: "absolute",
    top: 0,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.theater.curtainShadow,
  },
  innerEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 34,
    backgroundColor: withOpacity(COLORS.theater.curtainShadow, 0.88),
  },
  innerEdgeLeft: {
    right: 0,
  },
  innerEdgeRight: {
    left: 0,
  },
  panelHem: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: withOpacity(COLORS.theater.marqueeGold, 0.32),
  },
  panelHemLeft: {
    right: 20,
  },
  panelHemRight: {
    left: 20,
  },
  fringe: {
    position: "absolute",
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: Platform.select({ ios: 96, android: 82, default: 82 }),
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tassel: {
    alignItems: "center",
  },
  tasselHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.theater.marqueeGold,
  },
  tasselCord: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: withOpacity(COLORS.theater.marqueeGold, 0.72),
  },
  valance: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 58,
    backgroundColor: withOpacity(COLORS.theater.curtainDeep, 0.98),
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(COLORS.theater.marqueeGold, 0.34),
    pointerEvents: "none",
  },
  valanceRail: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 12,
    height: 12,
    backgroundColor: withOpacity(COLORS.theater.marqueeGold, 0.58),
  },
  valanceLip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
    backgroundColor: withOpacity(COLORS.theater.curtainShadow, 0.48),
  },
  ring: {
    position: "absolute",
    top: 7,
    width: 14,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.theater.marqueeGold,
    backgroundColor: "transparent",
  },
  dust: {
    position: "absolute",
    backgroundColor: withOpacity(COLORS.theater.spotlight, 0.74),
  },
  dustLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
  },
});
