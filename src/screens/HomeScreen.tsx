import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import HorizontalFilmRail from "@/src/components/HorizontalFilmRail";
import { HeroSkeleton } from "@/src/components/LoadingSkeletons";
import MatchScore from "@/src/components/MatchScore";
import TheaterCurtain from "@/src/components/TheaterCurtain";
import TasteTag from "@/src/components/TasteTag";
import {
  discoverQueue,
  featuredFilm,
  hiddenGems,
  trending,
} from "@/src/data/mockData";
import { trackEvent } from "@/src/lib/analytics";
import type { Film } from "@/src/types/film";

import { CTAButton } from "./shared";

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showReveal, setShowReveal] = useState(false);
  const revealLockedUntilRef = useRef(0);
  const revealInProgressRef = useRef(false);
  const revealAnimation = useRef(new Animated.Value(0)).current;
  const nearEndRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const openFilm = (film: Film) =>
    router.push(
      ({ pathname: "/movie/[id]", params: { id: film.id } } as unknown) as Href,
    );

  const triggerHiddenIceberg = () => {
    const now = Date.now();
    if (now < revealLockedUntilRef.current || revealInProgressRef.current) return;

    trackEvent("home_hidden_triggered", { source: "home_overscroll" });
    revealLockedUntilRef.current = now + 2600;
    revealInProgressRef.current = true;
    setShowReveal(true);
    revealAnimation.setValue(0);

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    Animated.timing(revealAnimation, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start(() => {
      router.push("/iceberg" as Href);
      setTimeout(() => {
        revealInProgressRef.current = false;
        setShowReveal(false);
        revealAnimation.setValue(0);
      }, 120);
    });
  };

  const handleHomeScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const viewportBottom = contentOffset.y + layoutMeasurement.height;
    const distanceToEnd = contentSize.height - viewportBottom;

    nearEndRef.current = distanceToEnd <= 24;

    // iOS bounce/overscroll path
    const overscroll = viewportBottom - contentSize.height;
    if (overscroll > 26) {
      triggerHiddenIceberg();
    }
  };

  const handleScrollEndDrag = () => {
    // Android-safe fallback: one pull while already at the end
    if (nearEndRef.current) {
      triggerHiddenIceberg();
    }
  };

  return (
    <AppScreen
      title="Home"
      subtitle="Quick picks now, deeper discovery below"
      scrollProps={{
        onScroll: handleHomeScroll,
        onScrollEndDrag: handleScrollEndDrag,
        scrollEventThrottle: 16,
        bounces: true,
        overScrollMode: "always",
      }}
    >
      {loading ? (
        <HeroSkeleton />
      ) : (
        <Pressable style={styles.featuredCard} onPress={() => openFilm(featuredFilm)}>
          <View style={styles.featuredPoster}>
            <TheaterCurtain style={StyleSheet.absoluteFillObject} />
            <View
              style={[
                styles.featuredTint,
                { backgroundColor: withOpacity(featuredFilm.posterColor, 0.24) },
              ]}
            />
            <View style={styles.featuredPill}>
              <Text style={styles.featuredPillText}>Now Showing</Text>
            </View>
          </View>
          <View style={styles.featuredBody}>
            <View style={styles.featuredMetaRow}>
              <MatchScore score={featuredFilm.matchScore} />
              <TasteTag label="Featured" variant="accent" />
            </View>
            <Text style={styles.featuredTitle}>{featuredFilm.title}</Text>
            <Text style={styles.featuredSynopsis} numberOfLines={2}>
              {featuredFilm.synopsis}
            </Text>
          </View>
        </Pressable>
      )}

      <HorizontalFilmRail
        title="Hidden Gems"
        subtitle="Low-noise picks matched to your taste"
        films={hiddenGems}
        onFilmPress={openFilm}
      />

      <HorizontalFilmRail
        title="Trending"
        subtitle="What your taste profile is leaning toward"
        films={trending}
        onFilmPress={openFilm}
      />

      <HorizontalFilmRail
        title="Recommended"
        subtitle="Fast lane suggestions for tonight"
        films={discoverQueue.slice(0, 6)}
        onFilmPress={openFilm}
      />

      <View style={styles.teaserCard}>
        <Text style={styles.teaserTitle}>Go Deeper</Text>
        <Text style={styles.teaserCopy}>
          Scroll to the end and pull up once more to reveal Hidden Iceberg.
        </Text>
        <View style={styles.teaserActions}>
          <CTAButton
            label="Swipe Movies"
            onPress={() => router.push("/(tabs)/discover" as Href)}
          />
          <CTAButton
            label="Open Hidden Iceberg"
            variant="secondary"
            onPress={() => router.push("/iceberg" as Href)}
          />
          <CTAButton
            label="Open Watchlists"
            variant="secondary"
            onPress={() => router.push("/(tabs)/watchlists" as Href)}
          />
        </View>
      </View>

      <Modal visible={showReveal} transparent animationType="none">
        <View style={styles.revealBackdrop}>
          <Animated.View
            style={[
              styles.revealCard,
              {
                opacity: revealAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                transform: [
                  {
                    translateY: revealAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                  {
                    scale: revealAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.97, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.revealCurtainWrap}>
              <TheaterCurtain style={StyleSheet.absoluteFillObject} />
            </View>
            <View style={styles.revealBody}>
              <Text style={styles.revealKicker}>Diving Below The Surface</Text>
              <Text style={styles.revealTitle}>Hidden Iceberg</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    backgroundColor: COLORS.background.elevated,
    borderColor: COLORS.border.default,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
  },
  featuredPoster: {
    height: 188,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
    justifyContent: "flex-start",
    padding: SPACING.md,
  },
  featuredTint: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredPill: {
    alignSelf: "flex-start",
    backgroundColor: withOpacity(COLORS.theater.marqueeGold, 0.26),
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.44),
    borderRadius: BORDER_RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  featuredPillText: {
    color: COLORS.theater.marqueeGold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  featuredBody: {
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  featuredMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  featuredTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  featuredSynopsis: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  teaserCard: {
    backgroundColor: withOpacity(COLORS.theater.curtain, 0.24),
    borderColor: withOpacity(COLORS.theater.curtainHighlight, 0.46),
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  teaserTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  teaserCopy: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  teaserActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  revealBackdrop: {
    flex: 1,
    backgroundColor: withOpacity(COLORS.background.primary, 0.8),
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  revealCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.5),
    backgroundColor: COLORS.background.elevated,
  },
  revealCurtainWrap: {
    height: 190,
  },
  revealBody: {
    padding: SPACING.padding.card,
    gap: SPACING.xs,
    alignItems: "center",
  },
  revealKicker: {
    color: COLORS.theater.marqueeGold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  revealTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
