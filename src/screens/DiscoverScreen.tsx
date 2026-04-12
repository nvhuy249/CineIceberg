import { useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import EmptyState from "@/src/components/EmptyState";
import FilmCard from "@/src/components/FilmCard";
import MatchScore from "@/src/components/MatchScore";
import TasteTag from "@/src/components/TasteTag";
import TheaterCurtain from "@/src/components/TheaterCurtain";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { discoverQueue, tasteTags } from "@/src/data/mockData";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

const SWIPE_TRIGGER = 92;
const SWIPE_OUT_DISTANCE = 420;

type DiscoverAction = "like" | "pass";

export default function DiscoverScreen() {
  const router = useRouter();
  const { addFilmToDiscoverWatchlist } = useWatchlists();
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(0);
  const [passed, setPassed] = useState(0);
  const [, setHistory] = useState<{ index: number; action: DiscoverAction }[]>([]);
  const swipe = useRef(new Animated.ValueXY()).current;
  const actionLockRef = useRef(false);

  const currentFilm = discoverQueue[index];
  const remaining = Math.max(discoverQueue.length - index, 0);

  const nextCard = useCallback((action: DiscoverAction) => {
    setHistory((values) => [...values, { index, action }]);
    setIndex((value) => Math.min(value + 1, discoverQueue.length));
    if (action === "like") setLiked((value) => value + 1);
    if (action === "pass") setPassed((value) => value + 1);
  }, [index]);

  const resetSwipePosition = useCallback(() => {
    Animated.spring(swipe, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 6,
      tension: 70,
    }).start();
  }, [swipe]);

  const commitAction = useCallback(
    (action: DiscoverAction) => {
      if (action === "like" && currentFilm) {
        addFilmToDiscoverWatchlist(currentFilm.id);
      }
      nextCard(action);
    },
    [addFilmToDiscoverWatchlist, currentFilm, nextCard],
  );

  const animateOutAndCommit = useCallback(
    (action: DiscoverAction) => {
      if (!currentFilm || actionLockRef.current) return;
      actionLockRef.current = true;

      const toX = action === "like" ? SWIPE_OUT_DISTANCE : -SWIPE_OUT_DISTANCE;
      Animated.timing(swipe, {
        toValue: { x: toX, y: 18 },
        duration: 170,
        useNativeDriver: true,
      }).start(() => {
        swipe.setValue({ x: 0, y: 0 });
        commitAction(action);
        actionLockRef.current = false;
      });
    },
    [commitAction, currentFilm, swipe],
  );

  const undo = () => {
    setHistory((values) => {
      if (values.length === 0) return values;
      const copy = [...values];
      const previous = copy.pop();
      if (previous) {
        setIndex(previous.index);
        if (previous.action === "like") {
          setLiked((value) => Math.max(value - 1, 0));
        } else {
          setPassed((value) => Math.max(value - 1, 0));
        }
      }
      swipe.setValue({ x: 0, y: 0 });
      return copy;
    });
  };

  const discoverSignals = useMemo(() => tasteTags.slice(0, 3), []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Boolean(currentFilm) &&
          Math.abs(gestureState.dx) > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          if (!currentFilm || actionLockRef.current) return;
          swipe.setValue({ x: gestureState.dx, y: gestureState.dy * 0.25 });
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!currentFilm || actionLockRef.current) return;
          if (gestureState.dx > SWIPE_TRIGGER) {
            animateOutAndCommit("like");
            return;
          }
          if (gestureState.dx < -SWIPE_TRIGGER) {
            animateOutAndCommit("pass");
            return;
          }
          resetSwipePosition();
        },
        onPanResponderTerminate: resetSwipePosition,
      }),
    [animateOutAndCommit, currentFilm, resetSwipePosition, swipe],
  );

  const cardRotation = swipe.x.interpolate({
    inputRange: [-SWIPE_OUT_DISTANCE, 0, SWIPE_OUT_DISTANCE],
    outputRange: ["-10deg", "0deg", "10deg"],
  });
  const likeOpacity = swipe.x.interpolate({
    inputRange: [0, SWIPE_TRIGGER, SWIPE_OUT_DISTANCE],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  });
  const passOpacity = swipe.x.interpolate({
    inputRange: [-SWIPE_OUT_DISTANCE, -SWIPE_TRIGGER, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  return (
    <AppScreen title="Discover" subtitle="Stage mode: quick cinematic taste picks">
      <View style={styles.statsCard}>
        <SectionTitle
          title={`${remaining} scenes remaining`}
          subtitle={`${liked} liked | ${passed} passed`}
        />
        <View style={screenStyles.wrapRow}>
          {discoverSignals.map((tag) => (
            <TasteTag key={tag} label={tag} />
          ))}
        </View>
      </View>

      {!currentFilm ? (
        <EmptyState
          title="No more cards"
          message="You've reached the end of the discover queue."
          action={<CTAButton label="Restart Deck" onPress={() => setIndex(0)} />}
        />
      ) : (
        <>
          <View style={styles.stageShell}>
            <View style={styles.stageCurtainWrap}>
              <TheaterCurtain height={116} style={StyleSheet.absoluteFillObject} />
            </View>
            <View style={styles.stageDeck}>
              <View style={styles.stageGlow} />
              <Animated.View
                style={[
                  styles.swipeAnimatedCard,
                  {
                    transform: [
                      { translateX: swipe.x },
                      { translateY: swipe.y },
                      { rotate: cardRotation },
                    ],
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <FilmCard film={currentFilm} variant="swipe" />
                <View style={styles.overlayRow}>
                  <MatchScore score={currentFilm.matchScore} />
                  {currentFilm.genres.slice(0, 2).map((genre) => (
                    <TasteTag key={genre} label={genre} />
                  ))}
                </View>
              </Animated.View>
              <Animated.View style={[styles.swipeHint, styles.likeHint, { opacity: likeOpacity }]}>
                <Text style={styles.swipeHintText}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.swipeHint, styles.passHint, { opacity: passOpacity }]}>
                <Text style={styles.swipeHintText}>PASS</Text>
              </Animated.View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <ActionButton label="Undo" onPress={undo} />
            <ActionButton label="Pass" onPress={() => animateOutAndCommit("pass")} />
            <ActionButton
              label="Info"
              onPress={() =>
                router.push(
                  (({
                    pathname: "/movie/[id]",
                    params: { id: currentFilm.id },
                  } as unknown) as Href),
                )
              }
            />
            <ActionButton label="Like" onPress={() => animateOutAndCommit("like")} />
          </View>
        </>
      )}
    </AppScreen>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: withOpacity(COLORS.theater.stage, 0.54),
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.28),
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  stageShell: {
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.curtainHighlight, 0.44),
    backgroundColor: COLORS.background.elevated,
    ...SHADOWS.theaterSpotlight,
  },
  stageCurtainWrap: {
    height: 116,
  },
  stageDeck: {
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: withOpacity(COLORS.theater.stage, 0.5),
  },
  swipeAnimatedCard: {
    zIndex: 2,
  },
  stageGlow: {
    position: "absolute",
    left: 26,
    right: 26,
    top: 12,
    height: 110,
    borderRadius: 140,
    backgroundColor: withOpacity(COLORS.theater.spotlight, 0.18),
  },
  swipeHint: {
    position: "absolute",
    top: 16,
    minHeight: 34,
    minWidth: 76,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  likeHint: {
    right: 16,
    borderColor: withOpacity(COLORS.status.success, 0.55),
    backgroundColor: withOpacity(COLORS.status.success, 0.2),
  },
  passHint: {
    left: 16,
    borderColor: withOpacity(COLORS.status.danger, 0.55),
    backgroundColor: withOpacity(COLORS.status.danger, 0.2),
  },
  swipeHintText: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  overlayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  actionButton: {
    flexGrow: 1,
    minWidth: "22%",
    minHeight: 42,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.24),
    backgroundColor: withOpacity(COLORS.theater.stage, 0.64),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  actionButtonText: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  pressed: {
    opacity: 0.9,
  },
});
