import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "@/app/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import EmptyState from "@/src/components/EmptyState";
import FilmCard from "@/src/components/FilmCard";
import { films, getFilmsByIds } from "@/src/data/mockData";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

type Recommendation = {
  film: Film;
  reason: string;
  score: number;
};

const MAX_RECOMMENDATIONS = 4;

export default function WatchlistDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { watchlists, addFilmToWatchlist } = useWatchlists();
  const [refreshCount, setRefreshCount] = useState(0);

  const watchlist = useMemo(
    () => watchlists.find((item) => item.id === id),
    [id, watchlists],
  );

  const savedFilms = useMemo(
    () => (watchlist ? getFilmsByIds(watchlist.filmIds) : []),
    [watchlist],
  );

  const recommendations = useMemo(
    () =>
      buildRecommendations({
        watchlistFilms: savedFilms,
        excludedFilmIds: watchlist?.filmIds ?? [],
        refreshCount,
      }),
    [refreshCount, savedFilms, watchlist?.filmIds],
  );

  const openFilm = (filmId: string) =>
    router.push(
      ({ pathname: "/movie/[id]", params: { id: filmId } } as unknown) as Href,
    );

  if (!watchlist) {
    return (
      <AppScreen
        title="Watchlist"
        subtitle="Could not find this watchlist"
        headerRight={
          <CTAButton
            label="Back"
            variant="secondary"
            onPress={() => router.replace("/(tabs)/watchlists" as Href)}
          />
        }
      >
        <EmptyState
          title="Watchlist not found"
          message="This watchlist may have been removed. Open Watchlists to pick another one."
          action={
            <CTAButton
              label="Open Watchlists"
              onPress={() => router.replace("/(tabs)/watchlists" as Href)}
            />
          }
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title={watchlist.name}
      subtitle={watchlist.description || `${watchlist.filmIds.length} saved titles`}
      headerRight={<CTAButton label="Back" variant="secondary" onPress={() => router.back()} />}
    >
      <View style={screenStyles.section}>
        <SectionTitle
          title="In This Watchlist"
          subtitle={`${savedFilms.length} titles currently saved`}
        />
        {savedFilms.length === 0 ? (
          <EmptyState
            title="No titles yet"
            message="Add from Search, Discover, or the recommendations below."
            action={
              <CTAButton
                label="Go to Discover"
                onPress={() => router.push("/(tabs)/discover" as Href)}
              />
            }
          />
        ) : (
          savedFilms.map((film) => (
            <FilmCard key={film.id} film={film} onPress={() => openFilm(film.id)} />
          ))
        )}
      </View>

      <View style={screenStyles.section}>
        <View style={styles.recommendationsHeader}>
          <View style={styles.recommendationsHeaderText}>
            <SectionTitle
              title="Recommended For This Watchlist"
              subtitle="Similar movies and series, generated from this list"
            />
          </View>
          <View style={styles.refreshButtonWrap}>
            <CTAButton
              label="Refresh"
              variant="secondary"
              onPress={() => setRefreshCount((value) => value + 1)}
            />
          </View>
        </View>

        {recommendations.length === 0 ? (
          <EmptyState
            title="No suggestions left"
            message="Everything from the current catalog is already in this watchlist."
          />
        ) : (
          recommendations.map((recommendation) => {
            const alreadySaved = watchlist.filmIds.includes(recommendation.film.id);
            return (
              <View key={recommendation.film.id} style={styles.recommendationCard}>
                <FilmCard
                  film={recommendation.film}
                  compact
                  onPress={() => openFilm(recommendation.film.id)}
                />
                <View style={styles.reasonCard}>
                  <Text style={screenStyles.bodyText}>{recommendation.reason}</Text>
                  <CTAButton
                    label={alreadySaved ? "Already in Watchlist" : "Add to Watchlist"}
                    variant={alreadySaved ? "secondary" : "primary"}
                    disabled={alreadySaved}
                    onPress={() =>
                      addFilmToWatchlist(watchlist.id, recommendation.film.id)
                    }
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

function buildRecommendations({
  watchlistFilms,
  excludedFilmIds,
  refreshCount,
}: {
  watchlistFilms: Film[];
  excludedFilmIds: string[];
  refreshCount: number;
}): Recommendation[] {
  const genreFrequency = new Map<string, number>();
  watchlistFilms.forEach((film) => {
    film.genres.forEach((genre) => {
      genreFrequency.set(genre, (genreFrequency.get(genre) ?? 0) + 1);
    });
  });

  const ranked: Recommendation[] = films
    .filter((film) => !excludedFilmIds.includes(film.id))
    .map((film) => {
      const overlapGenres = film.genres.filter((genre) => genreFrequency.has(genre));
      const matchingDirectorFilm = watchlistFilms.find(
        (savedFilm) => savedFilm.director === film.director,
      );
      const score =
        film.matchScore +
        overlapGenres.length * 6 +
        (matchingDirectorFilm ? 10 : 0);

      return {
        film,
        score,
        reason: buildReason({
          film,
          overlapGenres,
          matchingDirectorFilm,
        }),
      };
    })
    .sort((a, b) => b.score - a.score || a.film.title.localeCompare(b.film.title));

  if (ranked.length === 0) return [];

  const offset = refreshCount % ranked.length;
  const rotated = [...ranked.slice(offset), ...ranked.slice(0, offset)];
  return rotated.slice(0, MAX_RECOMMENDATIONS);
}

function buildReason({
  film,
  overlapGenres,
  matchingDirectorFilm,
}: {
  film: Film;
  overlapGenres: string[];
  matchingDirectorFilm?: Film;
}) {
  const format = film.genres.includes("Series") ? "Series" : "Movie";

  if (matchingDirectorFilm) {
    return `${format} pick: shares director (${film.director}) with "${matchingDirectorFilm.title}".`;
  }

  if (overlapGenres.length >= 2) {
    return `${format} pick: aligns with this list's ${overlapGenres[0]} + ${overlapGenres[1]} pattern.`;
  }

  if (overlapGenres.length === 1) {
    return `${format} pick: reinforces your ${overlapGenres[0]} preference in this watchlist.`;
  }

  return `${format} pick: high fit score and adjacent tone to your saved titles.`;
}

const styles = StyleSheet.create({
  recommendationsHeader: {
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "flex-start",
  },
  recommendationsHeaderText: {
    flex: 1,
  },
  refreshButtonWrap: {
    width: 110,
  },
  recommendationCard: {
    gap: SPACING.sm,
  },
  reasonCard: {
    backgroundColor: COLORS.background.elevated,
    borderColor: COLORS.border.default,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
});
