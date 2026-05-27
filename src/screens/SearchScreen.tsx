import { useRouter, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import CompactMatchBadge from "@/src/components/CompactMatchBadge";
import ConnectedFilmRowCard from "@/src/components/ConnectedFilmRowCard";
import EmptyState from "@/src/components/EmptyState";
import { SearchSkeleton } from "@/src/components/LoadingSkeletons";
import { useAuth } from "@/src/context/AuthContext";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { searchFilms } from "@/src/data/mockData";
import { logInteractionEvent } from "@/src/lib/interactionEvents";
import { fetchSearchResults } from "@/src/lib/tmdb";
import { blurActiveElementOnWeb } from "@/src/lib/webFocus";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle } from "./shared";

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { watchlists, addFilmToWatchlist } = useWatchlists();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Film[]>([]);
  const [pickerFilm, setPickerFilm] = useState<Film | null>(null);
  const [isAddingWatchlistId, setIsAddingWatchlistId] = useState<string | null>(null);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const nextResults = await fetchSearchResults(query);
        if (!active) return;
        setResults(nextResults);
      } catch {
        if (!active) return;
        setResults(searchFilms(query));
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const openFilm = (film: Film) => {
    blurActiveElementOnWeb();
    void logInteractionEvent({
      userId: user?.id,
      action: "open",
      source: "search",
      tmdbId: film.tmdbId,
      mediaType: film.mediaType,
    });
    router.push(
      ({ pathname: "/movie/[id]", params: { id: film.id } } as unknown) as Href,
    );
  };

  const openAddPicker = (film: Film) => {
    setPickerFilm(film);
    setAddFeedback(null);
  };

  const closeAddPicker = () => {
    if (isAddingWatchlistId) return;
    setPickerFilm(null);
  };

  const handleAddToWatchlist = async (watchlistId: string) => {
    if (!pickerFilm || isAddingWatchlistId) return;

    setIsAddingWatchlistId(watchlistId);
    const added = await addFilmToWatchlist(
      watchlistId,
      pickerFilm.tmdbId,
      "search",
      pickerFilm.mediaType,
    );
    setIsAddingWatchlistId(null);

    if (added) {
      setAddFeedback(`Added "${pickerFilm.title}".`);
      setPickerFilm(null);
      return;
    }

    setAddFeedback(`"${pickerFilm.title}" is already in that watchlist or could not be added.`);
  };

  return (
    <AppScreen title="Search" subtitle="Find films by title, director, genre, or year">
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search movies..."
          placeholderTextColor={COLORS.foreground.tertiary}
          style={styles.searchInput}
        />
      </View>

      <SectionTitle
        title={query.trim() ? `${results.length} results` : "Browse all films"}
        subtitle={query.trim() ? `Query: "${query}"` : "Start typing to narrow the list"}
      />
      {addFeedback ? <Text style={styles.addFeedback}>{addFeedback}</Text> : null}

      {loading ? <SearchSkeleton /> : null}

      {!loading && results.length === 0 ? (
        <EmptyState
          title="No results"
          message="Try a different title, director, or genre."
          action={
            <CTAButton
              label="Clear Search"
              variant="secondary"
              onPress={() => setQuery("")}
            />
          }
        />
      ) : null}

      {!loading &&
        results.map((film) => (
          <ConnectedFilmRowCard
            key={film.id}
            film={film}
            posterOnly
            compactPosterRow
            onOpenFilm={() => openFilm(film)}
            rightContent={
              <View style={styles.resultContent}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultTitleWrap}>
                    <Text style={styles.resultTitle} numberOfLines={2}>
                      {film.title}
                    </Text>
                    <Text style={styles.resultYearGenre} numberOfLines={1}>
                      {film.year} | {film.genres[0]}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => openAddPicker(film)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${film.title} to watchlist`}
                    style={({ pressed }) => [
                      styles.bookmarkButton,
                      pressed && styles.bookmarkButtonPressed,
                    ]}
                  >
                    <Ionicons
                      name="bookmark-outline"
                      size={18}
                      color={COLORS.accent.crystal}
                    />
                  </Pressable>
                </View>
                <View style={styles.scoreRow}>
                  <CompactMatchBadge score={film.matchScore} />
                </View>
                <Text style={styles.description} numberOfLines={2}>
                  {film.synopsis}
                </Text>
                <View style={styles.metaActionRow}>
                  <Text style={styles.metaDetails} numberOfLines={1}>
                    {buildSearchMeta(film)}
                  </Text>
                </View>
              </View>
            }
          />
        ))}

      <Modal
        visible={Boolean(pickerFilm)}
        transparent
        animationType="fade"
        onRequestClose={closeAddPicker}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressTarget} onPress={closeAddPicker} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Watchlist</Text>
              <Pressable onPress={closeAddPicker} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>{pickerFilm?.title}</Text>

            {watchlists.length === 0 ? (
              <EmptyState
                title="No watchlists available"
                message="Create a watchlist first, then add titles from Search."
                action={
                  <CTAButton
                    label="Open Watchlists"
                    onPress={() => {
                      closeAddPicker();
                      router.push("/(tabs)/watchlists" as Href);
                    }}
                  />
                }
              />
            ) : (
              <View style={styles.modalList}>
                {watchlists.map((watchlist) => {
                  const alreadySaved = pickerFilm
                    ? watchlist.filmIds.includes(pickerFilm.tmdbId)
                    : false;
                  return (
                    <CTAButton
                      key={watchlist.id}
                      label={
                        isAddingWatchlistId === watchlist.id
                          ? `Adding to ${watchlist.name}...`
                          : alreadySaved
                            ? `Already in ${watchlist.name}`
                            : `${watchlist.name} (${watchlist.filmIds.length})`
                      }
                      variant="secondary"
                      disabled={Boolean(isAddingWatchlistId) || alreadySaved}
                      onPress={() => {
                        void handleAddToWatchlist(watchlist.id);
                      }}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

function hasKnownDirector(film: Film) {
  return film.director.trim().length > 0 && film.director.trim().toLowerCase() !== "unknown";
}

function buildSearchMeta(film: Film) {
  const parts = [
    hasKnownDirector(film) ? film.director : null,
    film.runtimeMinutes ? `${film.runtimeMinutes} min` : null,
    film.genres.slice(0, 3).join(" | "),
  ].filter(Boolean);

  return parts.join(" | ");
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
  description: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 19,
  },
  resultContent: {
    flex: 1,
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  resultTitleWrap: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: 20,
  },
  resultYearGenre: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  scoreRow: {
    minHeight: 24,
  },
  metaDetails: {
    flex: 1,
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: 16,
  },
  metaActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  bookmarkButton: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.accent.iceBlue, 0.35),
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.1),
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkButtonPressed: {
    opacity: 0.85,
  },
  addFeedback: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: withOpacity(COLORS.background.primary, 0.72),
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  backdropPressTarget: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    backgroundColor: COLORS.background.elevated,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  modalSubtitle: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  closeButton: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: SPACING.xs,
  },
  closeButtonText: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  modalList: {
    gap: SPACING.xs,
  },
});
