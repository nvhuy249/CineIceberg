import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import ConnectedFilmRowCard from "@/src/components/ConnectedFilmRowCard";
import EmptyState from "@/src/components/EmptyState";
import HomeRailCard from "@/src/components/HomeRailCard";
import TasteTag from "@/src/components/TasteTag";
import { films, getFilmsByIds } from "@/src/data/mockData";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { trackEvent } from "@/src/lib/analytics";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

type Recommendation = {
  film: Film;
  reason: string;
  score: number;
};

const MAX_RECOMMENDATIONS = 4;

type RecommendationFeedback = "more" | "less";

export default function WatchlistDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { watchlists, addFilmToWatchlist } = useWatchlists();
  const [refreshCount, setRefreshCount] = useState(0);
  const [boostedGenre, setBoostedGenre] = useState<string | null>(null);
  const [avoidedGenre, setAvoidedGenre] = useState<string | null>(null);
  const [focusFilmId, setFocusFilmId] = useState<string | null>(null);
  const [feedbackByFilmId, setFeedbackByFilmId] = useState<
    Record<string, RecommendationFeedback>
  >({});

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
        boostedGenre,
        avoidedGenre,
        focusFilmId,
      }),
    [
      avoidedGenre,
      boostedGenre,
      focusFilmId,
      refreshCount,
      savedFilms,
      watchlist?.filmIds,
    ],
  );

  const openFilm = (filmId: string) =>
    router.push(
      ({ pathname: "/movie/[id]", params: { id: filmId } } as unknown) as Href,
    );

  const addRecommendationToWatchlist = (filmId: string) => {
    if (!watchlist) return;
    const added = addFilmToWatchlist(watchlist.id, filmId);
    if (added) {
      trackEvent("recommendation_added", {
        source: "watchlist_recommendation",
        watchlist_id: watchlist.id,
        film_id: filmId,
      });
    }
  };

  const applyFeedback = (film: Film, feedback: RecommendationFeedback) => {
    setFeedbackByFilmId((prev) => ({ ...prev, [film.id]: feedback }));
    setFocusFilmId(film.id);
    setRefreshCount(0);

    if (feedback === "more") {
      setBoostedGenre(film.genres[0] ?? null);
      setAvoidedGenre(null);
      return;
    }

    setAvoidedGenre(film.genres[0] ?? null);
    if (boostedGenre === film.genres[0]) {
      setBoostedGenre(null);
    }
  };

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
          <View style={styles.savedGrid}>
            {savedFilms.map((film) => (
              <View key={film.id} style={styles.savedGridItem}>
                <HomeRailCard film={film} onPress={() => openFilm(film.id)} />
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={screenStyles.section}>
        <View style={styles.recommendationsHeader}>
          <View style={styles.recommendationsHeaderText}>
            <SectionTitle
              title="Recommended For This Watchlist"
              subtitle="Similar movies and series with live tuning"
            />
          </View>
          <View style={styles.refreshButtonWrap}>
            <CTAButton
              label="Refresh"
              variant="secondary"
              onPress={() => {
                setRefreshCount((value) => value + 1);
              }}
            />
          </View>
        </View>

        {(boostedGenre || avoidedGenre || focusFilmId) && (
          <View style={styles.tuningCard}>
            <Text style={styles.tuningTitle}>Recommendation tuning</Text>
            <View style={screenStyles.wrapRow}>
              {boostedGenre ? <TasteTag label={`Boost ${boostedGenre}`} variant="accent" /> : null}
              {avoidedGenre ? <TasteTag label={`Avoid ${avoidedGenre}`} /> : null}
              {focusFilmId ? <TasteTag label="Focused by feedback" /> : null}
            </View>
            <View style={styles.tuningActionWrap}>
              <CTAButton
                label="Reset Tuning"
                variant="secondary"
                onPress={() => {
                  setBoostedGenre(null);
                  setAvoidedGenre(null);
                  setFocusFilmId(null);
                  setFeedbackByFilmId({});
                  setRefreshCount(0);
                }}
              />
            </View>
          </View>
        )}

        {recommendations.length === 0 ? (
          <EmptyState
            title="No suggestions left"
            message="Everything from the current catalog is already in this watchlist."
          />
        ) : (
          recommendations.map((recommendation) => {
            const alreadySaved = watchlist.filmIds.includes(recommendation.film.id);
            return (
              <ConnectedFilmRowCard
                key={recommendation.film.id}
                film={recommendation.film}
                onOpenFilm={() => openFilm(recommendation.film.id)}
                rightContent={
                  <>
                    <Text style={screenStyles.bodyText}>{recommendation.reason}</Text>
                    <CTAButton
                      label={alreadySaved ? "Already in Watchlist" : "Add to Watchlist"}
                      variant={alreadySaved ? "secondary" : "primary"}
                      disabled={alreadySaved}
                      onPress={() => addRecommendationToWatchlist(recommendation.film.id)}
                    />
                    <View style={styles.feedbackRow}>
                      <PreferenceButton
                        label="More Like This"
                        selected={feedbackByFilmId[recommendation.film.id] === "more"}
                        onPress={() => applyFeedback(recommendation.film, "more")}
                      />
                      <PreferenceButton
                        label="Less Like This"
                        selected={feedbackByFilmId[recommendation.film.id] === "less"}
                        onPress={() => applyFeedback(recommendation.film, "less")}
                      />
                    </View>
                  </>
                }
              />
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
  boostedGenre,
  avoidedGenre,
  focusFilmId,
}: {
  watchlistFilms: Film[];
  excludedFilmIds: string[];
  refreshCount: number;
  boostedGenre: string | null;
  avoidedGenre: string | null;
  focusFilmId: string | null;
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
      const focusedFilm = focusFilmId
        ? watchlistFilms.find((savedFilm) => savedFilm.id === focusFilmId) ??
          films.find((candidate) => candidate.id === focusFilmId)
        : undefined;
      const focusOverlap =
        focusedFilm &&
        film.genres.some((genre) => focusedFilm.genres.includes(genre));
      const matchesBoost = boostedGenre ? film.genres.includes(boostedGenre) : false;
      const hitsAvoidedGenre = avoidedGenre ? film.genres.includes(avoidedGenre) : false;
      const score =
        film.matchScore +
        overlapGenres.length * 7 +
        (matchingDirectorFilm ? 10 : 0) +
        (focusOverlap ? 8 : 0) +
        (matchesBoost ? 14 : 0) -
        (hitsAvoidedGenre ? 20 : 0);

      return {
        film,
        score,
        reason: buildReason({
          film,
          overlapGenres,
          matchingDirectorFilm,
          focusedFilm,
          boostedGenre,
          avoidedGenre,
        }),
      };
    })
    .sort((a, b) => b.score - a.score || a.film.title.localeCompare(b.film.title));

  if (ranked.length === 0) return [];

  const stride = (refreshCount % 3) + 1;
  const offset = (refreshCount * stride) % ranked.length;
  const rotated = [...ranked.slice(offset), ...ranked.slice(0, offset)];
  return rotated.filter((item) => item.score > 50).slice(0, MAX_RECOMMENDATIONS);
}

function buildReason({
  film,
  overlapGenres,
  matchingDirectorFilm,
  focusedFilm,
  boostedGenre,
  avoidedGenre,
}: {
  film: Film;
  overlapGenres: string[];
  matchingDirectorFilm?: Film;
  focusedFilm?: Film;
  boostedGenre: string | null;
  avoidedGenre: string | null;
}) {
  const reasons: string[] = [];
  const format = film.genres.includes("Series") ? "Series" : "Movie";

  if (matchingDirectorFilm) {
    reasons.push(`same director as "${matchingDirectorFilm.title}"`);
  }

  if (overlapGenres.length >= 2) {
    reasons.push(`shares ${overlapGenres[0]} + ${overlapGenres[1]} with your list`);
  } else if (overlapGenres.length === 1) {
    reasons.push(`reinforces your ${overlapGenres[0]} preference`);
  }

  if (focusedFilm && film.genres.some((genre) => focusedFilm.genres.includes(genre))) {
    reasons.push(`close in tone to "${focusedFilm.title}"`);
  }

  if (boostedGenre && film.genres.includes(boostedGenre)) {
    reasons.push(`matches your "more like this" signal (${boostedGenre})`);
  }

  if (avoidedGenre && !film.genres.includes(avoidedGenre)) {
    reasons.push(`leans away from ${avoidedGenre} as requested`);
  }

  if (reasons.length === 0) {
    return `${format} pick: high fit score and adjacent tone to this watchlist.`;
  }

  return `${format} pick: ${reasons.slice(0, 2).join("; ")}.`;
}

function PreferenceButton({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.preferenceButton,
        selected && styles.preferenceButtonSelected,
        pressed && styles.preferenceButtonPressed,
      ]}
    >
      <Text style={[styles.preferenceText, selected && styles.preferenceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
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
  savedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  savedGridItem: {
    width: 138,
  },
  tuningCard: {
    backgroundColor: withOpacity(COLORS.theater.stage, 0.38),
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.35),
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  tuningTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  tuningActionWrap: {
    width: 150,
  },
  feedbackRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  preferenceButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    backgroundColor: COLORS.background.subtle,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
  },
  preferenceButtonSelected: {
    borderColor: COLORS.border.accent,
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.18),
  },
  preferenceButtonPressed: {
    opacity: 0.9,
  },
  preferenceText: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  preferenceTextSelected: {
    color: COLORS.accent.crystal,
  },
});
