import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY, withOpacity } from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import FilmCard from "@/src/components/FilmCard";
import TheaterCurtain from "@/src/components/TheaterCurtain";
import { films, getFilmsByIds } from "@/src/data/mockData";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { trackEvent } from "@/src/lib/analytics";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

type HiddenSuggestion = {
  film: Film;
  reason: string;
  depthScore: number;
};

const MAX_SUGGESTIONS = 6;

export default function HiddenIcebergScreen() {
  const router = useRouter();
  const { watchlists } = useWatchlists();

  useEffect(() => {
    trackEvent("hidden_opened", { source: "iceberg_route" });
  }, []);

  const suggestions = useMemo(() => {
    const savedIds = watchlists.flatMap((watchlist) => watchlist.filmIds);
    const savedFilms = getFilmsByIds(savedIds);

    const genreFrequency = new Map<string, number>();
    savedFilms.forEach((film) => {
      film.genres.forEach((genre) => {
        genreFrequency.set(genre, (genreFrequency.get(genre) ?? 0) + 1);
      });
    });

    const ranked: HiddenSuggestion[] = films
      .filter((film) => !savedIds.includes(film.id))
      .map((film) => {
        const overlappingGenres = film.genres.filter((genre) => genreFrequency.has(genre));
        const depthBonus = film.genres.includes("Slow Burn") || film.genres.includes("Mystery") ? 8 : 0;
        const depthScore = film.matchScore + overlappingGenres.length * 6 + depthBonus;

        return {
          film,
          depthScore,
          reason: buildDepthReason(film, overlappingGenres),
        };
      })
      .sort((a, b) => b.depthScore - a.depthScore || a.film.title.localeCompare(b.film.title));

    return ranked.slice(0, MAX_SUGGESTIONS);
  }, [watchlists]);

  return (
    <AppScreen
      title="Hidden Iceberg"
      subtitle="You discovered the layer below the surface"
      headerRight={<CTAButton label="Back" variant="secondary" onPress={() => router.back()} />}
    >
      <View style={styles.heroCard}>
        <TheaterCurtain height={190} style={styles.heroCurtain} />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroKicker}>Underrated For You</Text>
          <Text style={styles.heroText}>
            These picks are tuned from your watchlists and lean toward deeper cuts.
          </Text>
        </View>
      </View>

      <View style={screenStyles.section}>
        <SectionTitle title="Below The Surface" subtitle={`${suggestions.length} hidden picks`} />
        {suggestions.map((item) => (
          <View key={item.film.id} style={styles.suggestionCard}>
            <FilmCard
              film={item.film}
              compact
              onPress={() =>
                router.push(
                  ({ pathname: "/movie/[id]", params: { id: item.film.id } } as unknown) as Href,
                )
              }
            />
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Want a different set?</Text>
        <Text style={styles.footerText}>Update your watchlists and revisit Hidden Iceberg.</Text>
        <CTAButton
          label="Open Watchlists"
          onPress={() => router.push("/(tabs)/watchlists" as Href)}
        />
      </View>
    </AppScreen>
  );
}

function buildDepthReason(film: Film, overlappingGenres: string[]) {
  if (overlappingGenres.length >= 2) {
    return `Matches your ${overlappingGenres[0]} and ${overlappingGenres[1]} watchlist pattern.`;
  }

  if (overlappingGenres.length === 1) {
    return `Aligned with your ${overlappingGenres[0]} preference from saved titles.`;
  }

  return `High fit score with a less obvious vibe from your current watchlists.`;
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.curtainHighlight, 0.42),
    backgroundColor: COLORS.background.elevated,
  },
  heroCurtain: {
    width: "100%",
  },
  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.padding.card,
    backgroundColor: COLORS.background.overlay,
    gap: SPACING.xs,
  },
  heroKicker: {
    color: COLORS.theater.marqueeGold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  heroText: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  suggestionCard: {
    gap: SPACING.xs,
  },
  reasonText: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
    paddingHorizontal: SPACING.xs,
  },
  footerCard: {
    backgroundColor: withOpacity(COLORS.theater.stage, 0.5),
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  footerTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  footerText: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
