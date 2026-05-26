import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Image } from "expo-image";
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
      subtitle={film ? `${film.year} | ${film.director}` : "Detail view"}
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
            </View>
            <View style={styles.heroBody}>
              <View style={styles.heroPrimaryRow}>
                <View style={[styles.posterPanel, { backgroundColor: film.posterColor }]}>
                  {film.posterUrl ? (
                    <Image
                      source={{ uri: film.posterUrl }}
                      style={styles.posterImage}
                      contentFit="contain"
                      transition={160}
                    />
                  ) : null}
                </View>
                <View style={styles.heroMeta}>
                  <View style={screenStyles.wrapRow}>
                    <MatchScore score={film.matchScore} />
                    {film.genres.slice(0, 3).map((genre) => (
                      <TasteTag key={genre} label={genre} />
                    ))}
                  </View>
                  <Text style={screenStyles.mutedText}>
                    {film.runtimeMinutes} min | {film.year}
                  </Text>
                  <Text style={styles.directorText}>By {film.director}</Text>
                  <CTAButton label="Add to Watchlists" onPress={openWatchlistPicker} />
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
              <Text style={screenStyles.bodyText}>{film.synopsis}</Text>
            ) : null}
            {tab === "analysis" ? (
              <Text style={screenStyles.bodyText}>{film.analysis}</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
    overflow: "hidden",
    backgroundColor: withOpacity(COLORS.background.primary, 0.6),
  },
  backdropImage: {
    width: "100%",
    height: "100%",
  },
  heroBody: {
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  heroPrimaryRow: {
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "flex-start",
  },
  posterPanel: {
    width: 110,
    aspectRatio: 2 / 3,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  posterImage: {
    width: "100%",
    height: "100%",
  },
  heroMeta: {
    flex: 1,
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
