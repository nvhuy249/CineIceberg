import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import EmptyState from "@/src/components/EmptyState";
import { MovieDetailSkeleton } from "@/src/components/LoadingSkeletons";
import MatchScore from "@/src/components/MatchScore";
import TasteTag from "@/src/components/TasteTag";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { getFilmById } from "@/src/data/mockData";
import { safeBack } from "@/src/lib/navigation";
import { fetchFilmDetailByRouteId } from "@/src/lib/tmdb";
import type { Film } from "@/src/types/film";

import { CTAButton, screenStyles } from "./shared";

type DetailTab = "overview" | "analysis" | "videos";

const tabs: DetailTab[] = ["overview", "analysis", "videos"];

const buildQuickFacts = (film: Film) => {
  const facts = [
    { label: "Format", value: film.mediaType === "tv" ? "Series" : "Movie" },
    { label: "Released", value: String(film.year) },
    {
      label: "Time",
      value:
        film.mediaType === "tv"
          ? "Series runtime varies"
          : film.runtimeMinutes
            ? `${film.runtimeMinutes} min`
            : "Runtime unavailable",
    },
  ];

  if (hasKnownDirector(film)) {
    facts.push({
      label: film.mediaType === "tv" ? "Creator" : "Director",
      value: film.director,
    });
  }

  return facts;
};

const buildOverviewInfo = buildQuickFacts;

export default function MovieDetailScreen() {
  const router = useRouter();
  const { watchlists, addFilmToWatchlist } = useWatchlists();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(true);
  const [film, setFilm] = useState<Film | null>(null);
  const [showWatchlistPicker, setShowWatchlistPicker] = useState(false);
  const [isAddingWatchlistId, setIsAddingWatchlistId] = useState<string | null>(null);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setAddFeedback(null);

    const loadFilm = async () => {
      if (!id) {
        if (!active) return;
        setFilm(null);
        setLoading(false);
        return;
      }

      try {
        const remoteFilm = await fetchFilmDetailByRouteId(id);
        if (!active) return;
        setFilm(remoteFilm ?? getFilmById(id) ?? null);
      } catch {
        if (!active) return;
        setFilm(getFilmById(id) ?? null);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    void loadFilm();
    return () => {
      active = false;
    };
  }, [id]);

  const openWatchlistPicker = () => {
    if (!film) return;
    setAddFeedback(null);
    setShowWatchlistPicker(true);
  };

  const closeWatchlistPicker = () => {
    if (isAddingWatchlistId) return;
    setShowWatchlistPicker(false);
  };

  const handleAddToWatchlist = async (watchlistId: string) => {
    if (!film || isAddingWatchlistId) return;

    setIsAddingWatchlistId(watchlistId);
    const added = await addFilmToWatchlist(
      watchlistId,
      film.tmdbId,
      "movie_detail",
      film.mediaType,
    );
    setIsAddingWatchlistId(null);

    if (added) {
      setAddFeedback(`Added "${film.title}".`);
      setShowWatchlistPicker(false);
      return;
    }

    setAddFeedback(`"${film.title}" is already in that watchlist or could not be added.`);
  };

  return (
    <AppScreen
      title={film?.title ?? "Movie Detail"}
      subtitle={film ? getDetailSubtitle(film) : "Detail view"}
      headerRight={
        <CTAButton
          label="Back"
          variant="secondary"
          onPress={() => safeBack(router, "/(tabs)" as Href)}
        />
      }
    >
      {loading ? <MovieDetailSkeleton /> : null}

      {!loading && !film ? (
        <EmptyState
          title="Film not found"
          message="This detail route is scaffolded and expects a valid mock film id."
          action={
            <CTAButton label="Go Home" onPress={() => router.replace("/(tabs)" as Href)} />
          }
        />
      ) : null}

      {!loading && film ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.backdropFrame}>
              {film.backdropUrl || film.posterUrl ? (
                <Image
                  source={{ uri: film.backdropUrl || film.posterUrl || "" }}
                  style={styles.backdropImage}
                  contentFit="contain"
                  transition={160}
                />
              ) : null}
              <LinearGradient
                colors={[
                  "transparent",
                  withOpacity(COLORS.background.elevated, 0.42),
                  COLORS.background.elevated,
                ]}
                locations={[0, 0.58, 1]}
                style={styles.backdropGradient}
              />
            </View>
            <View style={styles.heroBody}>
              <View style={styles.heroPrimaryRow}>
                <View style={styles.heroMeta}>
                  <View style={screenStyles.wrapRow}>
                    <MatchScore score={film.matchScore} />
                    {film.genres.slice(0, 3).map((genre) => (
                      <TasteTag key={genre} label={genre} />
                    ))}
                  </View>
                  <Text style={screenStyles.mutedText}>{getMetaLine(film)}</Text>
                  {hasKnownDirector(film) ? (
                    <Text style={styles.directorText}>By {film.director}</Text>
                  ) : null}
                  <Pressable
                    onPress={openWatchlistPicker}
                    style={({ pressed }) => [
                      styles.addWatchlistButton,
                      pressed && styles.addWatchlistButtonPressed,
                    ]}
                  >
                    <Text style={styles.addWatchlistButtonText}>Add to Watchlists</Text>
                  </Pressable>
                  {addFeedback ? <Text style={styles.addFeedback}>{addFeedback}</Text> : null}
                </View>
              </View>

              {(film.imageGalleryUrls?.length ?? 0) > 0 ? (
                <View style={styles.galleryBlock}>
                  <Text style={styles.galleryTitle}>Gallery</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryRow}
                  >
                    {film.imageGalleryUrls?.map((url, index) => (
                      <View key={`${url}-${index}`} style={styles.galleryTile}>
                        <Image
                          source={{ uri: url }}
                          style={styles.galleryImage}
                          contentFit="contain"
                          transition={120}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.tabsRow}>
            {tabs.map((value) => {
              const active = tab === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setTab(value)}
                  style={[
                    styles.tab,
                    active && {
                      backgroundColor: COLORS.accent.iceBlue,
                      borderColor: COLORS.accent.iceBlue,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      active && { color: COLORS.foreground.inverse },
                    ]}
                  >
                    {value[0].toUpperCase()}
                    {value.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={screenStyles.card}>
            {tab === "overview" ? (
              <View style={styles.overviewStack}>
                <View style={styles.synopsisCard}>
                  <Text style={styles.overviewEyebrow}>Story</Text>
                  <Text style={screenStyles.bodyText}>{film.synopsis}</Text>
                </View>

                <View style={styles.quickFactsCard}>
                  <Text style={styles.overviewSectionTitle}>At a glance</Text>
                  <View style={styles.quickFactsGrid}>
                    {buildOverviewInfo(film).map((item) => (
                      <View key={item.label} style={styles.quickFact}>
                        <Text style={styles.infoLabel}>{item.label}</Text>
                        <Text style={styles.infoValue} numberOfLines={2}>
                          {item.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.ratingPanel}>
                  <View style={styles.ratingMain}>
                    <Text style={styles.overviewEyebrow}>Audience score</Text>
                    <Text style={styles.ratingValue}>{getTmdbRatingText(film)}</Text>
                    {getAudienceVoteText(film) ? (
                      <Text style={styles.ratingSource}>{getAudienceVoteText(film)}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.overviewSection}>
                  <Text style={styles.overviewSectionTitle}>Genres</Text>
                  <View style={styles.chipWrap}>
                    {film.genres.map((genre) => (
                      <View key={genre} style={styles.genreChip}>
                        <Text style={styles.genreChipText}>{genre}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.overviewSection}>
                  <Text style={styles.overviewSectionTitle}>Main cast</Text>
                  {film.cast && film.cast.length > 0 ? (
                    <View style={styles.castGrid}>
                      {film.cast.slice(0, 6).map((name, index) => (
                        <View key={`${name}-${index}`} style={styles.castChip}>
                          <Text style={styles.castInitial}>{name.charAt(0)}</Text>
                          <Text style={styles.castName} numberOfLines={2}>
                            {name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={screenStyles.mutedText}>
                      Cast details are not available for this title yet.
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
            {tab === "analysis" ? (
              <View style={styles.analysisGrid}>
                {buildAnalysisCards(film).map((item) => (
                  <View key={item.title} style={styles.analysisCard}>
                    <Text style={styles.analysisLabel}>{item.label}</Text>
                    <Text style={styles.analysisTitle}>{item.title}</Text>
                    <Text style={screenStyles.bodyText}>{item.body}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {tab === "videos" ? (
              <View style={styles.videoList}>
                {film.videos.map((video) => (
                  <View key={video.id} style={styles.videoRow}>
                    <Text style={styles.videoDot}>-</Text>
                    <Text style={screenStyles.bodyText}>{video.title}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <Modal
        visible={showWatchlistPicker}
        transparent
        animationType="fade"
        onRequestClose={closeWatchlistPicker}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressTarget} onPress={closeWatchlistPicker} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Watchlist</Text>
              <Pressable onPress={closeWatchlistPicker} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>{film?.title}</Text>

            {watchlists.length === 0 ? (
              <EmptyState
                title="No watchlists available"
                message="Create a watchlist first, then add this title."
                action={
                  <CTAButton
                    label="Open Watchlists"
                    onPress={() => {
                      closeWatchlistPicker();
                      router.push("/(tabs)/watchlists" as Href);
                    }}
                  />
                }
              />
            ) : (
              <View style={styles.modalList}>
                {watchlists.map((watchlist) => {
                  const alreadySaved = film ? watchlist.filmIds.includes(film.tmdbId) : false;
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

function getDetailSubtitle(film: Film) {
  const parts = [String(film.year), film.mediaType === "tv" ? "Series" : "Movie"];
  if (hasKnownDirector(film)) parts.push(film.director);
  return parts.join(" | ");
}

function getMetaLine(film: Film) {
  const format =
    film.mediaType === "tv"
      ? "Series"
      : film.runtimeMinutes
        ? `${film.runtimeMinutes} min`
        : "Movie";
  return `${format} | ${film.year}`;
}

function formatVoteCount(count?: number) {
  if (!count || count <= 0) return null;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k votes`;
  return `${count} votes`;
}

function getTmdbRatingText(film: Film) {
  return typeof film.tmdbRating === "number" && film.tmdbRating > 0
    ? `${film.tmdbRating.toFixed(1)}/10`
    : `${film.matchScore}%`;
}

function getAudienceVoteText(film: Film) {
  const voteCount = formatVoteCount(film.tmdbVoteCount);
  return voteCount ? `Based on ${voteCount}` : null;
}

function buildAnalysisCards(film: Film) {
  const primaryGenres = film.genres.slice(0, 2);
  const genreText =
    primaryGenres.length === 0
      ? "its core genre signals"
      : primaryGenres.length === 1
        ? primaryGenres[0]
        : `${primaryGenres[0]} and ${primaryGenres[1]}`;
  const ageSignal =
    film.year < 2010
      ? "older-catalog"
      : film.year < 2020
        ? "established"
        : "current-catalog";
  const creatorSignal = hasKnownDirector(film)
    ? `The creator signal comes through ${film.director}, which is useful when comparing against saved titles from the same filmmaker or showrunner.`
    : "Creator details are not available, so this recommendation focuses on audience, genre, and format signals.";

  return [
    {
      label: "Audience",
      title: `${film.matchScore}% quality signal`,
      body: `Audience and ranking signals put this in a strong range. Treat that as confidence, not a guarantee: it says enough viewers responded positively for the title to be worth checking.`,
    },
    {
      label: "Taste Fit",
      title: `Matches ${genreText}`,
      body: `The strongest match comes from ${genreText}. Use this when deciding whether the title belongs with your current watchlists or if it is only broadly popular.`,
    },
    {
      label: "Context",
      title: film.mediaType === "tv" ? "Series commitment" : "Movie-night fit",
      body:
        film.mediaType === "tv"
          ? `This is a ${ageSignal} series pick, so the value is more about world, characters, and continued tone than a single-session runtime. ${creatorSignal}`
          : film.runtimeMinutes
            ? `At ${film.runtimeMinutes} minutes, this is a ${ageSignal} movie pick with a clearer one-sitting commitment. ${creatorSignal}`
            : `This is a ${ageSignal} movie pick. Runtime details are not available, so the recommendation leans on audience, genre, and creator signals. ${creatorSignal}`,
    },
  ];
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: COLORS.background.elevated,
    borderColor: COLORS.border.default,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
  },
  backdropFrame: {
    minHeight: 160,
    maxHeight: 220,
    aspectRatio: 16 / 9,
    overflow: "visible",
    backgroundColor: withOpacity(COLORS.background.primary, 0.6),
  },
  backdropImage: {
    width: "100%",
    height: "100%",
  },
  backdropGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 118,
  },
  heroBody: {
    padding: SPACING.padding.card,
    paddingTop: 0,
    marginTop: -SPACING.sm,
    gap: SPACING.sm,
  },
  heroPrimaryRow: {
    gap: SPACING.md,
  },
  heroMeta: {
    gap: SPACING.sm,
  },
  directorText: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  addFeedback: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  addWatchlistButton: {
    minHeight: 44,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.accent.frost, 0.72),
    backgroundColor: COLORS.accent.iceBlue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  addWatchlistButtonPressed: {
    opacity: 0.9,
  },
  addWatchlistButtonText: {
    color: COLORS.foreground.inverse,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  galleryBlock: {
    gap: SPACING.xs,
  },
  galleryTitle: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  galleryRow: {
    gap: SPACING.xs,
    paddingRight: SPACING.xs,
  },
  galleryTile: {
    width: 132,
    height: 88,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    backgroundColor: withOpacity(COLORS.background.primary, 0.55),
    overflow: "hidden",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  tabsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    backgroundColor: COLORS.background.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  videoList: {
    gap: SPACING.xs,
  },
  overviewStack: {
    gap: SPACING.md,
  },
  synopsisCard: {
    borderWidth: 1,
    borderColor: withOpacity(COLORS.accent.iceBlue, 0.18),
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: withOpacity(COLORS.background.subtle, 0.52),
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  overviewEyebrow: {
    color: COLORS.accent.crystal,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: "uppercase",
  },
  quickFactsCard: {
    gap: SPACING.sm,
  },
  overviewSectionTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  quickFactsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  quickFact: {
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 66,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: withOpacity(COLORS.background.subtle, 0.62),
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  infoLabel: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: "uppercase",
  },
  infoValue: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  ratingPanel: {
    flexDirection: "row",
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.accent.iceBlue, 0.22),
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.08),
    padding: SPACING.md,
  },
  ratingMain: {
    gap: SPACING.xs,
  },
  ratingValue: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  ratingSource: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  overviewSection: {
    gap: SPACING.sm,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  genreChip: {
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: withOpacity(COLORS.background.subtle, 0.68),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  genreChipText: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  castGrid: {
    gap: SPACING.xs,
  },
  castChip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: withOpacity(COLORS.background.subtle, 0.62),
    padding: SPACING.sm,
  },
  castInitial: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: "hidden",
    color: COLORS.foreground.inverse,
    backgroundColor: COLORS.accent.iceBlue,
    textAlign: "center",
    lineHeight: 26,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  castName: {
    flex: 1,
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  analysisGrid: {
    gap: SPACING.sm,
  },
  analysisCard: {
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: withOpacity(COLORS.background.subtle, 0.62),
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  analysisLabel: {
    color: COLORS.accent.crystal,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: "uppercase",
  },
  analysisTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  videoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  videoDot: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.md,
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
