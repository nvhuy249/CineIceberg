import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "@/src/context/AuthContext";
import { discoverQueue as fallbackDiscoverQueue, tasteTags } from "@/src/data/mockData";
import { logInteractionEvent } from "@/src/lib/interactionEvents";
import { USE_NATIVE_ANIMATED_DRIVER } from "@/src/lib/animation";
import { fetchDiscoverQueue } from "@/src/lib/tmdb";
import { blurActiveElementOnWeb } from "@/src/lib/webFocus";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

const SWIPE_TRIGGER = 92;
const SWIPE_OUT_DISTANCE = 420;

type DiscoverAction = "like" | "pass";

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addFilmToDiscoverWatchlist } = useWatchlists();
  const [queue, setQueue] = useState<Film[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(0);
  const [passed, setPassed] = useState(0);
  const [, setHistory] = useState<{ index: number; action: DiscoverAction }[]>([]);
  const swipe = useRef(new Animated.ValueXY()).current;
  const actionLockRef = useRef(false);

  const currentFilm = queue[index];
  const nextFilm = queue[index + 1];
  const remaining = Math.max(queue.length - index, 0);

  const loadQueue = useCallback(async () => {
    setIsQueueLoading(true);
    try {
      const remoteQueue = await fetchDiscoverQueue();
      setQueue(remoteQueue.length > 0 ? remoteQueue : fallbackDiscoverQueue);
    } catch {
      setQueue(fallbackDiscoverQueue);
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const nextCard = useCallback((action: DiscoverAction) => {
    setHistory((values) => [...values, { index, action }]);
    setIndex((value) => Math.min(value + 1, queue.length));
    if (action === "like") setLiked((value) => value + 1);
    if (action === "pass") setPassed((value) => value + 1);
  }, [index, queue.length]);

  const resetSwipePosition = useCallback(() => {
    Animated.spring(swipe, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: USE_NATIVE_ANIMATED_DRIVER,
      friction: 6,
      tension: 70,
    }).start();
  }, [swipe]);

  const commitAction = useCallback(
    (action: DiscoverAction) => {
      if (action === "like" && currentFilm) {
        void addFilmToDiscoverWatchlist(currentFilm.tmdbId);
      }
      if (currentFilm) {
        void logInteractionEvent({
          userId: user?.id,
          action,
          source: "discover",
          tmdbId: currentFilm.tmdbId,
          mediaType: currentFilm.mediaType,
        });
      }
      nextCard(action);
    },
    [addFilmToDiscoverWatchlist, currentFilm, nextCard, user?.id],
  );

  const animateOutAndCommit = useCallback(
    (action: DiscoverAction) => {
      if (!currentFilm || actionLockRef.current) return;
      actionLockRef.current = true;

      const toX = action === "like" ? SWIPE_OUT_DISTANCE : -SWIPE_OUT_DISTANCE;
      Animated.timing(swipe, {
        toValue: { x: toX, y: 18 },
        duration: 170,
        useNativeDriver: USE_NATIVE_ANIMATED_DRIVER,
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
        isQueueLoading ? (
          <View style={styles.stageShell}>
            <View style={styles.stageCurtainWrap}>
              <TheaterCurtain height={116} style={StyleSheet.absoluteFillObject} />
            </View>
            <View style={styles.stageDeck}>
              <View style={styles.stageGlow} />
              <View style={styles.blankSwipeCard}>
                <View style={styles.blankPoster} />
                <View style={styles.blankBody}>
                  <View style={styles.blankTitleLine} />
                  <View style={styles.blankMetaLine} />
                  <View style={styles.blankTagRow}>
                    <View style={styles.blankTag} />
                    <View style={styles.blankTag} />
                  </View>
                  <View style={styles.blankSynopsisLine} />
                  <View style={styles.blankSynopsisLineShort} />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <EmptyState
            title="No more cards"
            message="You've reached the end of the discover queue."
            action={
              <CTAButton
                label="Restart Deck"
                onPress={() => {
                  if (queue.length > 0) {
                    setIndex(0);
                    return;
                  }
                  void loadQueue();
                }}
              />
            }
          />
        )
      ) : (
        <>
          <View style={styles.stageShell}>
            <View style={styles.stageCurtainWrap}>
              <TheaterCurtain height={116} style={StyleSheet.absoluteFillObject} />
            </View>
            <View style={styles.stageDeck}>
              <View style={styles.stageGlow} />
              <View style={styles.cardStack}>
                {nextFilm ? (
                  <View style={[styles.nextCardLayer, styles.noPointerEvents]}>
                    <FilmCard film={nextFilm} variant="swipe" />
                  </View>
                ) : null}
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
              </View>
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
              onPress={() => {
                blurActiveElementOnWeb();
                void logInteractionEvent({
                  userId: user?.id,
                  action: "open",
                  source: "discover",
                  tmdbId: currentFilm.tmdbId,
                  mediaType: currentFilm.mediaType,
                });
                router.push(
                  (({
                    pathname: "/movie/[id]",
                    params: { id: currentFilm.id },
                  } as unknown) as Href),
                );
              }}
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
    position: "relative",
  },
  cardStack: {
    position: "relative",
  },
  swipeAnimatedCard: {
    zIndex: 2,
  },
  nextCardLayer: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  noPointerEvents: {
    pointerEvents: "none",
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
  blankSwipeCard: {
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.3),
    overflow: "hidden",
    backgroundColor: COLORS.background.elevated,
  },
  blankPoster: {
    height: 220,
    backgroundColor: withOpacity(COLORS.foreground.primary, 0.08),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  blankBody: {
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  blankTitleLine: {
    width: "72%",
    height: 20,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: withOpacity(COLORS.foreground.primary, 0.12),
  },
  blankMetaLine: {
    width: "52%",
    height: 14,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: withOpacity(COLORS.foreground.primary, 0.08),
  },
  blankTagRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  blankTag: {
    width: 72,
    height: 24,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: withOpacity(COLORS.foreground.primary, 0.08),
  },
  blankSynopsisLine: {
    width: "100%",
    height: 14,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: withOpacity(COLORS.foreground.primary, 0.08),
  },
  blankSynopsisLineShort: {
    width: "76%",
    height: 14,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: withOpacity(COLORS.foreground.primary, 0.08),
  },
});
