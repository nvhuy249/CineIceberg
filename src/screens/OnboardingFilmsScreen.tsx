import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import FilmCard from "@/src/components/FilmCard";
import { onboardingPicks } from "@/src/data/mockData";
import { useAuth } from "@/src/context/AuthContext";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { supabase } from "@/src/lib/supabase";
import { fetchSearchResultsStrict } from "@/src/lib/tmdb";
import { blurActiveElementOnWeb } from "@/src/lib/webFocus";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle } from "./shared";

const MIN_SELECTION = 3;

export default function OnboardingFilmsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addFilmToDiscoverWatchlist } = useWatchlists();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Film[]>(onboardingPicks);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedByTmdbId, setSelectedByTmdbId] = useState<Record<number, Film>>({});

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const nextResults = await fetchSearchResultsStrict(query);
        if (!active) return;
        setResults(nextResults);
      } catch (error) {
        if (!active) return;
        console.warn("[Onboarding TMDB Search] request failed", { query, error });
        setResults(query.trim() ? [] : onboardingPicks);
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return results;

    return results.filter((film) =>
      `${film.title} ${film.director} ${film.genres.join(" ")}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, results]);

  const selectedFilms = useMemo(
    () => Object.values(selectedByTmdbId),
    [selectedByTmdbId],
  );

  const toggleSelection = (film: Film) => {
    setSelectedByTmdbId((current) => {
      const next = { ...current };
      if (next[film.tmdbId]) {
        delete next[film.tmdbId];
        return next;
      }
      next[film.tmdbId] = film;
      return next;
    });
  };

  const handleContinue = async () => {
    if (selectedFilms.length < MIN_SELECTION || isSaving) return;

    setIsSaving(true);
    setSubmitError(null);

    const genreFrequency = new Map<string, number>();
    selectedFilms.forEach((film) => {
      film.genres.forEach((genre) => {
        const normalized = genre.trim();
        if (!normalized) return;
        genreFrequency.set(normalized, (genreFrequency.get(normalized) ?? 0) + 1);
      });
    });

    const tasteTags = [...genreFrequency.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([genre]) => genre)
      .slice(0, 6);

    try {
      if (supabase && user) {
        const { error } = await supabase.from("profiles").upsert(
          {
            user_id: user.id,
            onboarding_completed: true,
            taste_tags: tasteTags,
          },
          { onConflict: "user_id" },
        );
        if (error) throw error;
      }

      await Promise.all(
        selectedFilms.map((film) => addFilmToDiscoverWatchlist(film.tmdbId)),
      );

      blurActiveElementOnWeb();
      router.replace("/(tabs)" as Href);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not save onboarding picks. Please retry.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppScreen
      title="Select Favorites"
      subtitle="Pick at least 3 films to personalize your recommendations."
    >
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search films, directors, genres..."
          placeholderTextColor={COLORS.foreground.tertiary}
          style={styles.searchInput}
        />
      </View>
      {isLoading ? <Text style={styles.loadingText}>Searching TMDB...</Text> : null}
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <View style={styles.counterRow}>
        <SectionTitle
          title={`${selectedFilms.length} selected`}
          subtitle="Need 3+ to continue"
        />
        <CTAButton
          label={
            isSaving
              ? "Saving..."
              : selectedFilms.length >= MIN_SELECTION
                ? "Continue"
                : "Select 3+"
          }
          disabled={selectedFilms.length < MIN_SELECTION || isSaving}
          onPress={() => {
            void handleContinue();
          }}
        />
      </View>

      <View style={styles.grid}>
        {filtered.map((film) => (
          <View key={film.id} style={styles.gridItem}>
            <FilmCard
              film={film}
              variant="grid"
              compact
              selected={Boolean(selectedByTmdbId[film.tmdbId])}
              onPress={() => toggleSelection(film)}
            />
          </View>
        ))}
      </View>

      {filtered.length === 0 ? (
        <Pressable style={styles.emptyHint} onPress={() => setQuery("")}>
          <Text style={styles.emptyHintText}>No matches. Clear search.</Text>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchInput: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    minHeight: 22,
  },
  counterRow: {
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  errorText: {
    color: COLORS.status.danger,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  gridItem: {
    width: "48%",
  },
  emptyHint: {
    alignSelf: "flex-start",
    paddingVertical: SPACING.sm,
  },
  emptyHintText: {
    color: COLORS.accent.iceBlue,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
