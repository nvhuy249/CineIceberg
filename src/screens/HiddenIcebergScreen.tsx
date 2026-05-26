import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import ConnectedFilmRowCard from "@/src/components/ConnectedFilmRowCard";
import EmptyState from "@/src/components/EmptyState";
import TasteTag from "@/src/components/TasteTag";
import { useAuth } from "@/src/context/AuthContext";
import { films, getFilmsByTmdbIds } from "@/src/data/mockData";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { trackEvent } from "@/src/lib/analytics";
import { logInteractionEvent } from "@/src/lib/interactionEvents";
import { safeBack } from "@/src/lib/navigation";
import { supabase } from "@/src/lib/supabase";
import { fetchHiddenIcebergCandidates } from "@/src/lib/tmdb";
import { blurActiveElementOnWeb } from "@/src/lib/webFocus";
import type { Database } from "@/src/types/db";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

type HiddenSuggestion = {
  film: Film;
  reason: string;
  depthScore: number;
  labels: string[];
};
type IcebergFeedback = "more" | "less";
type InteractionEventRow = Pick<
  Database["public"]["Tables"]["interaction_events"]["Row"],
  "action" | "tmdb_id" | "media_type" | "source" | "created_at"
>;
type RecommendationBatchInsert =
  Database["public"]["Tables"]["recommendation_batches"]["Insert"];
type RecommendationItemInsert =
  Database["public"]["Tables"]["recommendation_items"]["Insert"];
type RecommendationItemUpdate =
  Database["public"]["Tables"]["recommendation_items"]["Update"];

const MAX_SUGGESTIONS = 12;
const ICEBERG_ALGORITHM_VERSION = "hidden-iceberg-v2";

export default function HiddenIcebergScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { watchlists, addFilmToWatchlist } = useWatchlists();
  const [candidateFilms, setCandidateFilms] = useState<Film[]>(films);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [interactionEvents, setInteractionEvents] = useState<InteractionEventRow[]>([]);
  const [feedbackByFilmId, setFeedbackByFilmId] = useState<Record<string, IcebergFeedback>>({});
  const [savingTmdbIds, setSavingTmdbIds] = useState<number[]>([]);
  const [recommendationItemIdsByKey, setRecommendationItemIdsByKey] = useState<
    Record<string, string>
  >({});
  const persistedRecommendationKeyRef = useRef<string | null>(null);
  const persistingRecommendationKeyRef = useRef<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const depthScroll = useSharedValue(0);
  const ambientMotion = useSharedValue(0);

  useEffect(() => {
    trackEvent("hidden_opened", { source: "iceberg_route" });
  }, []);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    cancelAnimation(ambientMotion);
    if (reduceMotion) {
      ambientMotion.value = 0;
      return;
    }

    ambientMotion.value = withRepeat(
      withTiming(1, {
        duration: 7200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(ambientMotion);
    };
  }, [ambientMotion, reduceMotion]);

  useEffect(() => {
    let active = true;

    const loadInteractionEvents = async () => {
      if (!supabase || !user?.id) {
        if (!active) return;
        setInteractionEvents([]);
        return;
      }

      const { data, error } = await supabase
        .from("interaction_events")
        .select("action,tmdb_id,media_type,source,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!active) return;
      setInteractionEvents(error || !data ? [] : (data as InteractionEventRow[]));
    };

    void loadInteractionEvents();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    const loadCandidates = async () => {
      setIsLoadingCandidates(true);
      try {
        const remoteCandidates = await fetchHiddenIcebergCandidates();
        if (!active) return;
        setCandidateFilms(remoteCandidates.length > 0 ? remoteCandidates : films);
      } catch {
        if (!active) return;
        setCandidateFilms(films);
      } finally {
        if (!active) return;
        setIsLoadingCandidates(false);
      }
    };

    void loadCandidates();
    return () => {
      active = false;
    };
  }, []);

  const savedIds = useMemo(
    () => watchlists.flatMap((watchlist) => watchlist.filmIds),
    [watchlists],
  );
  const savedFilms = useMemo(() => getFilmsByTmdbIds(savedIds), [savedIds]);
  const saveTargetWatchlist = useMemo(
    () => watchlists.find((watchlist) => !watchlist.isDefault) ?? watchlists[0] ?? null,
    [watchlists],
  );

  const suggestions = useMemo(() => {
    const dismissedIds = new Set(
      Object.entries(feedbackByFilmId)
        .filter(([, feedback]) => feedback === "less")
        .map(([filmId]) => filmId),
    );
    const learnedSignals = deriveHiddenSignals(interactionEvents, candidateFilms);
    const genreFrequency = buildGenreFrequency(savedFilms);
    const candidateByTmdb = new Map(candidateFilms.map((film) => [film.tmdbId, film]));

    const ranked = candidateFilms
      .filter((film) => !savedIds.includes(film.tmdbId))
      .filter((film) => !dismissedIds.has(film.id))
      .filter((film) => !learnedSignals.passedTmdbIds.has(film.tmdbId))
      .map((film) =>
        scoreHiddenFilm({
          film,
          genreFrequency,
          savedFilms,
          learnedSignals,
          candidateByTmdb,
          feedbackByFilmId,
        }),
      )
      .sort((a, b) => b.depthScore - a.depthScore || a.film.title.localeCompare(b.film.title));

    return diversifyHiddenSuggestions(ranked).slice(0, MAX_SUGGESTIONS);
  }, [candidateFilms, feedbackByFilmId, interactionEvents, savedFilms, savedIds]);

  useEffect(() => {
    let active = true;

    const persistSuggestions = async () => {
      if (!supabase || !user?.id || isLoadingCandidates || suggestions.length === 0) return;

      const recommendationKey = [
        user.id,
        suggestions.map((suggestion) => `${suggestion.film.mediaType}:${suggestion.film.tmdbId}`).join(","),
      ].join("|");

      if (
        persistedRecommendationKeyRef.current === recommendationKey ||
        persistingRecommendationKeyRef.current === recommendationKey
      ) {
        return;
      }
      persistingRecommendationKeyRef.current = recommendationKey;

      const batchPayload: RecommendationBatchInsert = {
        user_id: user.id,
        source: "hidden_iceberg",
        algorithm_version: ICEBERG_ALGORITHM_VERSION,
      };

      const { data: batch, error: batchError } = await supabase
        .from("recommendation_batches")
        .insert(batchPayload)
        .select("id")
        .single();

      if (!active || batchError || !batch) {
        persistingRecommendationKeyRef.current = null;
        return;
      }

      const itemPayloads: RecommendationItemInsert[] = suggestions.map((suggestion, index) => ({
        batch_id: batch.id,
        user_id: user.id,
        tmdb_id: suggestion.film.tmdbId,
        media_type: suggestion.film.mediaType,
        score: Number(suggestion.depthScore.toFixed(2)),
        reason: suggestion.reason,
        position: index,
        status: "pending",
        metadata: {
          film_id: suggestion.film.id,
          title: suggestion.film.title,
          year: suggestion.film.year,
          director: suggestion.film.director,
          genres: suggestion.film.genres,
          labels: suggestion.labels,
          poster_url: suggestion.film.posterUrl ?? null,
        },
      }));

      const { data: items, error: itemsError } = await supabase
        .from("recommendation_items")
        .insert(itemPayloads)
        .select("id,tmdb_id,media_type");

      if (!active || itemsError || !items) {
        persistingRecommendationKeyRef.current = null;
        return;
      }

      persistedRecommendationKeyRef.current = recommendationKey;
      persistingRecommendationKeyRef.current = null;
      setRecommendationItemIdsByKey(
        Object.fromEntries(
          items.map((item) => [getRecommendationKey(item.media_type, item.tmdb_id), item.id]),
        ),
      );
    };

    void persistSuggestions();
    return () => {
      active = false;
    };
  }, [isLoadingCandidates, suggestions, user?.id]);

  const updatePersistedRecommendationItem = async (
    film: Film,
    values: RecommendationItemUpdate,
  ) => {
    const itemId = recommendationItemIdsByKey[getRecommendationKey(film.mediaType, film.tmdbId)];
    if (!supabase || !user?.id || !itemId) return;

    await supabase
      .from("recommendation_items")
      .update(values)
      .eq("id", itemId)
      .eq("user_id", user.id);
  };

  const openFilm = (film: Film) => {
    blurActiveElementOnWeb();
    void logInteractionEvent({
      userId: user?.id,
      action: "open",
      source: "hidden_iceberg",
      tmdbId: film.tmdbId,
      mediaType: film.mediaType,
    });
    router.push(
      ({ pathname: "/movie/[id]", params: { id: film.id } } as unknown) as Href,
    );
  };

  const saveFilm = async (film: Film) => {
    if (!saveTargetWatchlist || savingTmdbIds.includes(film.tmdbId)) return;

    setSavingTmdbIds((values) => [...values, film.tmdbId]);
    const added = await addFilmToWatchlist(
      saveTargetWatchlist.id,
      film.tmdbId,
      "hidden_iceberg",
      film.mediaType,
    );
    setSavingTmdbIds((values) => values.filter((tmdbId) => tmdbId !== film.tmdbId));

    if (added) {
      void updatePersistedRecommendationItem(film, {
        status: "added",
        added_to_watchlist_id: saveTargetWatchlist.id,
      });
    }
  };

  const applyFeedback = (film: Film, feedback: IcebergFeedback) => {
    setFeedbackByFilmId((current) => ({ ...current, [film.id]: feedback }));
    void updatePersistedRecommendationItem(film, {
      feedback,
      status: feedback === "less" ? "dismissed" : "pending",
    });
    void logInteractionEvent({
      userId: user?.id,
      action: feedback === "more" ? "like" : "pass",
      source: "hidden_iceberg",
      tmdbId: film.tmdbId,
      mediaType: film.mediaType,
    });
  };

  const depthOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      depthScroll.value,
      [0, 320, 900],
      [0.08, 0.42, 0.78],
      Extrapolation.CLAMP,
    ),
  }));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      depthScroll.value = event.contentOffset.y;
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <IcebergDepthBackground
        depthScroll={depthScroll}
        ambientMotion={ambientMotion}
        reduceMotion={reduceMotion}
      />
      <Animated.View style={[styles.depthOverlay, depthOverlayStyle]} />
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Hidden Iceberg</Text>
            <Text style={styles.subtitle}>Deeper discoveries from your taste profile</Text>
          </View>
          <CTAButton
            label="Back"
            variant="secondary"
            onPress={() => safeBack(router, "/(tabs)" as Href)}
          />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>Below Sea Level</Text>
          <Text style={styles.heroTitle}>Scroll down to descend into darker hidden layers.</Text>
        </View>

        <View style={styles.depthSection}>
        <SectionTitle
          title="Below The Surface"
          subtitle={
            isLoadingCandidates
              ? "Refreshing hidden picks from TMDB..."
              : `${suggestions.length} ranked deep cuts`
          }
        />

        {!isLoadingCandidates && suggestions.length === 0 ? (
          <EmptyState
            title="No hidden picks left"
            message="You have already seen the current deep-cut pool. Update your watchlists or come back after a refresh."
          />
        ) : null}

        {suggestions.map((item, index) => {
          const alreadySaved = savedIds.includes(item.film.tmdbId);
          const isSaving = savingTmdbIds.includes(item.film.tmdbId);
          return (
            <View key={item.film.id} style={styles.depthItem}>
              <View style={styles.depthMarker}>
                <Text style={styles.depthMarkerText}>{index + 1}</Text>
              </View>
              <ConnectedFilmRowCard
                film={item.film}
                onOpenFilm={() => openFilm(item.film)}
                rightContent={
                  <>
                    <View style={screenStyles.wrapRow}>
                      {item.labels.slice(0, 3).map((label) => (
                        <TasteTag key={label} label={label} variant="accent" />
                      ))}
                    </View>
                    <Text style={screenStyles.bodyText}>{item.reason}</Text>
                    <View style={styles.actionRow}>
                      <CTAButton
                        label={
                          alreadySaved
                            ? "Saved"
                            : isSaving
                              ? "Saving..."
                              : saveTargetWatchlist
                                ? `Save to ${saveTargetWatchlist.name}`
                                : "No Watchlist"
                        }
                        disabled={alreadySaved || isSaving || !saveTargetWatchlist}
                        onPress={() => {
                          void saveFilm(item.film);
                        }}
                      />
                    </View>
                    <View style={styles.feedbackRow}>
                      <PreferenceButton
                        label="More Like This"
                        selected={feedbackByFilmId[item.film.id] === "more"}
                        onPress={() => applyFeedback(item.film, "more")}
                      />
                      <PreferenceButton
                        label="Less Like This"
                        selected={feedbackByFilmId[item.film.id] === "less"}
                        onPress={() => applyFeedback(item.film, "less")}
                      />
                    </View>
                  </>
                }
              />
            </View>
          );
        })}
        </View>

        <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Want a different layer?</Text>
        <Text style={styles.footerText}>
          Add or remove titles from watchlists. Hidden Iceberg will bias toward the signals that survive.
        </Text>
        <CTAButton
          label="Open Watchlists"
          onPress={() => router.push("/(tabs)/watchlists" as Href)}
        />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function buildGenreFrequency(films: Film[]) {
  const genreFrequency = new Map<string, number>();
  films.forEach((film) => {
    film.genres.forEach((genre) => {
      genreFrequency.set(genre.toLowerCase(), (genreFrequency.get(genre.toLowerCase()) ?? 0) + 1);
    });
  });
  return genreFrequency;
}

function deriveHiddenSignals(events: InteractionEventRow[], candidates: Film[]) {
  const candidateByTmdb = new Map(candidates.map((film) => [film.tmdbId, film]));
  const genreAffinity = new Map<string, number>();
  const passedTmdbIds = new Set<number>();

  events.slice(0, 260).forEach((event) => {
    const film = candidateByTmdb.get(event.tmdb_id);
    if (event.action === "pass" && (event.source === "discover" || event.source === "hidden_iceberg")) {
      passedTmdbIds.add(event.tmdb_id);
    }
    if (!film) return;

    const delta =
      event.action === "like" || event.action === "add"
        ? 1.1
        : event.action === "open"
          ? 0.25
          : event.action === "pass" || event.action === "remove"
            ? -1
            : 0;

    film.genres.forEach((genre) => {
      const key = genre.toLowerCase();
      genreAffinity.set(key, Math.max(-6, Math.min(8, (genreAffinity.get(key) ?? 0) + delta)));
    });
  });

  return { genreAffinity, passedTmdbIds };
}

function scoreHiddenFilm({
  film,
  genreFrequency,
  savedFilms,
  learnedSignals,
  feedbackByFilmId,
}: {
  film: Film;
  genreFrequency: Map<string, number>;
  savedFilms: Film[];
  learnedSignals: ReturnType<typeof deriveHiddenSignals>;
  candidateByTmdb: Map<number, Film>;
  feedbackByFilmId: Record<string, IcebergFeedback>;
}): HiddenSuggestion {
  const overlappingGenres = film.genres.filter((genre) => genreFrequency.has(genre.toLowerCase()));
  const yearDepth = film.year <= 2015 ? 8 : film.year <= 2020 ? 4 : 0;
  const obscurityBalance = film.matchScore >= 88 ? -5 : film.matchScore >= 82 ? 5 : 1;
  const formatDepth = film.mediaType === "tv" ? 3 : 0;
  const moodDepth =
    film.genres.some((genre) => ["Mystery", "Documentary", "Sci-Fi", "Drama"].includes(genre))
      ? 6
      : 0;
  const learnedGenreBoost = film.genres.reduce(
    (sum, genre) => sum + (learnedSignals.genreAffinity.get(genre.toLowerCase()) ?? 0),
    0,
  );
  const feedbackBoost = feedbackByFilmId[film.id] === "more" ? 10 : 0;
  const directorMatch = savedFilms.some((savedFilm) => savedFilm.director === film.director) ? 5 : 0;

  const depthScore =
    film.matchScore +
    overlappingGenres.length * 7 +
    yearDepth +
    obscurityBalance +
    formatDepth +
    moodDepth +
    learnedGenreBoost +
    feedbackBoost +
    directorMatch;

  return {
    film,
    depthScore,
    labels: buildHiddenLabels(film, overlappingGenres, yearDepth, moodDepth),
    reason: buildDepthReason(film, overlappingGenres, {
      yearDepth,
      moodDepth,
      directorMatch,
      learnedGenreBoost,
    }),
  };
}

function buildHiddenLabels(
  film: Film,
  overlappingGenres: string[],
  yearDepth: number,
  moodDepth: number,
) {
  const labels = ["Deep Cut"];
  if (overlappingGenres.length > 0) labels.push("Taste Match");
  if (yearDepth >= 8) labels.push("Older Discovery");
  if (moodDepth > 0) labels.push("Below Surface");
  if (film.mediaType === "tv") labels.push("Series Layer");
  return labels.slice(0, 4);
}

function buildDepthReason(
  film: Film,
  overlappingGenres: string[],
  signals: {
    yearDepth: number;
    moodDepth: number;
    directorMatch: number;
    learnedGenreBoost: number;
  },
) {
  const reasons: string[] = [];

  if (overlappingGenres.length >= 2) {
    reasons.push(`matches your ${overlappingGenres[0]} and ${overlappingGenres[1]} watchlist pattern`);
  } else if (overlappingGenres.length === 1) {
    reasons.push(`keeps a ${overlappingGenres[0]} thread from saved titles`);
  }
  if (signals.yearDepth >= 8) reasons.push("pulls from an older layer of the catalog");
  if (signals.moodDepth > 0) reasons.push("leans into slower, stranger, or more specific moods");
  if (signals.directorMatch > 0) reasons.push(`shares a creator signal through ${film.director}`);
  if (signals.learnedGenreBoost > 0) reasons.push("matches recent like/add behavior");

  if (reasons.length === 0) {
    return "A less obvious pick with enough quality signal to be worth surfacing below the main rails.";
  }

  return `${reasons.slice(0, 3).join("; ")}.`;
}

function diversifyHiddenSuggestions(suggestions: HiddenSuggestion[]) {
  const selected: HiddenSuggestion[] = [];
  const remaining = [...suggestions];
  const genreCounts = new Map<string, number>();

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    remaining.forEach((suggestion, index) => {
      const repeatPenalty = suggestion.film.genres.reduce(
        (sum, genre) => sum + (genreCounts.get(genre) ?? 0) * 4,
        0,
      );
      const score = suggestion.depthScore - repeatPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    const [pick] = remaining.splice(bestIndex, 1);
    selected.push(pick);
    pick.film.genres.forEach((genre) => {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    });
  }

  return selected;
}

function getRecommendationKey(mediaType: string, tmdbId: number) {
  return `${mediaType}:${tmdbId}`;
}

function IcebergDepthBackground({
  depthScroll,
  ambientMotion,
  reduceMotion,
}: {
  depthScroll: SharedValue<number>;
  ambientMotion: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const skyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depthScroll.value, [0, 260], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(depthScroll.value, [0, 420], [0, -52], Extrapolation.CLAMP),
      },
    ],
  }));
  const surfaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depthScroll.value, [0, 160, 420], [1, 0.52, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateX: reduceMotion
          ? 0
          : interpolate(ambientMotion.value, [0, 1], [-16, 16], Extrapolation.CLAMP),
      },
      {
        translateY: interpolate(depthScroll.value, [0, 480], [0, -46], Extrapolation.CLAMP),
      },
    ],
  }));
  const icebergStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depthScroll.value, [0, 780], [1, 0.52], Extrapolation.CLAMP),
    transform: [
      {
        translateY:
          interpolate(depthScroll.value, [0, 620], [0, -160], Extrapolation.CLAMP) +
          (reduceMotion
            ? 0
            : interpolate(ambientMotion.value, [0, 1], [-4, 4], Extrapolation.CLAMP)),
      },
      {
        scale: interpolate(depthScroll.value, [0, 620], [1, 1.18], Extrapolation.CLAMP),
      },
    ],
  }));
  const icebergCoreStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depthScroll.value, [0, 760], [0.9, 0.38], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(depthScroll.value, [0, 620], [0, -148], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(depthScroll.value, [0, 620], [1, 1.16], Extrapolation.CLAMP),
      },
    ],
  }));
  const icebergFacetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depthScroll.value, [0, 760], [0.7, 0.28], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(depthScroll.value, [0, 620], [0, -138], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(depthScroll.value, [0, 620], [1, 1.1], Extrapolation.CLAMP),
      },
    ],
  }));
  const trenchStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depthScroll.value, [0, 320, 900], [0, 0.36, 0.82], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(depthScroll.value, [0, 900], [90, -80], Extrapolation.CLAMP),
      },
      {
        scaleX: reduceMotion
          ? 1
          : interpolate(ambientMotion.value, [0, 1], [0.98, 1.03], Extrapolation.CLAMP),
      },
    ],
  }));
  const causticStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depthScroll.value, [0, 260, 700], [0.34, 0.22, 0.06], Extrapolation.CLAMP),
    transform: [
      {
        translateX: reduceMotion
          ? 0
          : interpolate(ambientMotion.value, [0, 1], [-28, 28], Extrapolation.CLAMP),
      },
      {
        translateY: interpolate(depthScroll.value, [0, 560], [0, -72], Extrapolation.CLAMP),
      },
    ],
  }));
  const bubbleLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depthScroll.value, [0, 160, 760], [0.16, 0.42, 0.18], Extrapolation.CLAMP),
    transform: [
      {
        translateY:
          interpolate(depthScroll.value, [0, 900], [0, -180], Extrapolation.CLAMP) +
          (reduceMotion
            ? 0
            : interpolate(ambientMotion.value, [0, 1], [0, -34], Extrapolation.CLAMP)),
      },
    ],
  }));
  const lightRayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depthScroll.value, [0, 260, 720], [0.26, 0.18, 0.04], Extrapolation.CLAMP),
    transform: [
      {
        translateX: reduceMotion
          ? 0
          : interpolate(ambientMotion.value, [0, 1], [-10, 14], Extrapolation.CLAMP),
      },
      {
        translateY: interpolate(depthScroll.value, [0, 620], [0, -90], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View style={styles.backgroundLayer}>
      <View style={styles.oceanBase} />
      <Animated.View style={[styles.skyLayer, skyStyle]} />
      <Animated.View style={[styles.surfaceGlow, surfaceStyle]} />
      <Animated.View style={[styles.lightRayLayer, lightRayStyle]}>
        <View style={[styles.lightRay, styles.lightRayLeft]} />
        <View style={[styles.lightRay, styles.lightRayCenter]} />
        <View style={[styles.lightRay, styles.lightRayRight]} />
      </Animated.View>
      <Animated.View style={[styles.caustics, causticStyle]}>
        {Array.from({ length: 7 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.causticLine,
              {
                left: `${index * 16 - 8}%`,
                top: 26 + (index % 3) * 28,
                width: 90 + (index % 2) * 46,
              },
            ]}
          />
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.backgroundIceberg,
          icebergStyle,
        ]}
      >
        <View style={styles.icebergPeakTall} />
        <View style={styles.icebergPeakLeft} />
        <View style={styles.icebergPeakRight} />
        <View style={styles.icebergBase} />
      </Animated.View>
      <Animated.View
        style={[
          styles.backgroundIcebergCore,
          icebergCoreStyle,
        ]}
      >
        <View style={styles.submergedMain} />
        <View style={styles.submergedLeft} />
        <View style={styles.submergedRight} />
        <View style={styles.submergedTail} />
      </Animated.View>
      <Animated.View style={[styles.icebergFacetLayer, icebergFacetStyle]}>
        <View style={styles.icebergFacetShardA} />
        <View style={styles.icebergFacetShardB} />
        <View style={styles.icebergFacetShardC} />
      </Animated.View>
      <Animated.View
        style={[
          styles.trenchLayer,
          trenchStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleLayer,
          bubbleLayerStyle,
        ]}
      >
        {Array.from({ length: 18 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              {
                left: `${(index * 29) % 92}%`,
                top: 120 + ((index * 47) % 620),
                width: 3 + (index % 4),
                height: 3 + (index % 4),
                opacity: 0.16 + (index % 5) * 0.035,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

function PreferenceButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
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
  safeArea: {
    flex: 1,
    backgroundColor: "#020815",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
    overflow: "hidden",
  },
  oceanBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020815",
  },
  skyLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "31%",
    backgroundColor: "#172a3d",
  },
  surfaceGlow: {
    position: "absolute",
    top: "23%",
    left: "-10%",
    right: "-10%",
    height: 72,
    borderRadius: 100,
    backgroundColor: withOpacity(COLORS.accent.crystal, 0.18),
    borderTopWidth: 1,
    borderTopColor: withOpacity(COLORS.accent.crystal, 0.56),
  },
  lightRayLayer: {
    position: "absolute",
    top: "24%",
    left: 0,
    right: 0,
    height: "58%",
  },
  lightRay: {
    position: "absolute",
    top: 0,
    width: 86,
    height: "100%",
    backgroundColor: withOpacity(COLORS.accent.crystal, 0.09),
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
  },
  lightRayLeft: {
    left: "10%",
    transform: [{ skewX: "-18deg" }],
  },
  lightRayCenter: {
    left: "42%",
    width: 110,
    backgroundColor: withOpacity(COLORS.accent.crystal, 0.07),
    transform: [{ skewX: "8deg" }],
  },
  lightRayRight: {
    right: "4%",
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.06),
    transform: [{ skewX: "20deg" }],
  },
  caustics: {
    position: "absolute",
    top: "25%",
    left: "-20%",
    right: "-20%",
    height: 180,
    overflow: "hidden",
  },
  causticLine: {
    position: "absolute",
    height: 2,
    borderRadius: 4,
    backgroundColor: withOpacity(COLORS.accent.crystal, 0.24),
    transform: [{ rotate: "-12deg" }],
  },
  backgroundIceberg: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    height: 210,
  },
  backgroundIcebergCore: {
    position: "absolute",
    top: 190,
    left: 0,
    right: 0,
    height: 330,
  },
  icebergPeakTall: {
    position: "absolute",
    left: "44%",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 62,
    borderRightWidth: 40,
    borderBottomWidth: 138,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: withOpacity(COLORS.accent.crystal, 0.74),
    transform: [{ translateX: -44 }],
  },
  icebergPeakLeft: {
    position: "absolute",
    left: "17%",
    top: 82,
    width: 0,
    height: 0,
    borderLeftWidth: 78,
    borderRightWidth: 46,
    borderBottomWidth: 82,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: withOpacity(COLORS.accent.iceBlue, 0.52),
    transform: [{ rotate: "-5deg" }],
  },
  icebergPeakRight: {
    position: "absolute",
    right: "9%",
    top: 76,
    width: 0,
    height: 0,
    borderLeftWidth: 48,
    borderRightWidth: 90,
    borderBottomWidth: 96,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: withOpacity(COLORS.accent.frost, 0.45),
    transform: [{ rotate: "6deg" }],
  },
  icebergBase: {
    position: "absolute",
    left: "4%",
    right: "4%",
    top: 158,
    height: 64,
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.32),
    borderTopLeftRadius: 34,
    borderTopRightRadius: 58,
    transform: [{ skewX: "-12deg" }],
    borderTopWidth: 1,
    borderTopColor: withOpacity(COLORS.accent.crystal, 0.34),
  },
  submergedMain: {
    position: "absolute",
    left: "18%",
    top: 0,
    width: 230,
    height: 270,
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.19),
    transform: [{ skewX: "-18deg" }],
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 24,
  },
  submergedLeft: {
    position: "absolute",
    left: "0%",
    top: 42,
    width: 158,
    height: 178,
    backgroundColor: withOpacity(COLORS.accent.crystal, 0.11),
    transform: [{ skewX: "24deg" }],
    borderBottomLeftRadius: 88,
  },
  submergedRight: {
    position: "absolute",
    right: "-4%",
    top: 22,
    width: 168,
    height: 228,
    backgroundColor: withOpacity(COLORS.accent.frost, 0.12),
    transform: [{ skewX: "-24deg" }],
    borderBottomRightRadius: 92,
  },
  submergedTail: {
    position: "absolute",
    left: "37%",
    top: 196,
    width: 118,
    height: 150,
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.1),
    transform: [{ skewX: "18deg" }],
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 52,
  },
  icebergFacetLayer: {
    position: "absolute",
    top: 82,
    left: 0,
    right: 0,
    height: 360,
  },
  icebergFacetShardA: {
    position: "absolute",
    left: "43%",
    top: 26,
    width: 2,
    height: 158,
    backgroundColor: withOpacity(COLORS.accent.crystal, 0.2),
    transform: [{ rotate: "-29deg" }],
  },
  icebergFacetShardB: {
    position: "absolute",
    left: "31%",
    top: 170,
    width: 170,
    height: 2,
    backgroundColor: withOpacity(COLORS.accent.crystal, 0.16),
    transform: [{ rotate: "-10deg" }],
  },
  icebergFacetShardC: {
    position: "absolute",
    right: "20%",
    top: 116,
    width: 2,
    height: 188,
    backgroundColor: withOpacity(COLORS.accent.crystal, 0.13),
    transform: [{ rotate: "28deg" }],
  },
  trenchLayer: {
    position: "absolute",
    left: "-15%",
    right: "-15%",
    bottom: -80,
    height: "55%",
    borderTopLeftRadius: 240,
    borderTopRightRadius: 240,
    backgroundColor: "#00030b",
  },
  bubbleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    position: "absolute",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.accent.crystal, 0.36),
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.08),
  },
  scrollContent: {
    paddingHorizontal: SPACING.padding.page,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING["3xl"],
    gap: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.foreground.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  subtitle: {
    color: COLORS.foreground.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  heroCopy: {
    minHeight: 210,
    justifyContent: "flex-end",
    gap: SPACING.xs,
    paddingBottom: SPACING.md,
  },
  heroKicker: {
    color: COLORS.accent.crystal,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  depthOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    backgroundColor: "#010611",
    pointerEvents: "none",
  },
  depthSection: {
    gap: SPACING.md,
    paddingTop: SPACING.xs,
    backgroundColor: withOpacity("#010611", 0.34),
    borderWidth: 1,
    borderColor: withOpacity(COLORS.accent.iceBlue, 0.12),
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.sm,
  },
  depthItem: {
    gap: SPACING.xs,
  },
  depthMarker: {
    alignSelf: "flex-start",
    minWidth: 38,
    minHeight: 24,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.accent.iceBlue, 0.24),
    backgroundColor: withOpacity(COLORS.background.subtle, 0.9),
    alignItems: "center",
    justifyContent: "center",
  },
  depthMarkerText: {
    color: COLORS.accent.crystal,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  actionRow: {
    alignSelf: "stretch",
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
  footerCard: {
    backgroundColor: withOpacity("#010611", 0.72),
    borderWidth: 1,
    borderColor: withOpacity(COLORS.accent.iceBlue, 0.18),
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
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
});
