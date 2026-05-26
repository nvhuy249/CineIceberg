import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

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
import { useAuth } from "@/src/context/AuthContext";
import { getFilmsByTmdbIds } from "@/src/data/mockData";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { trackEvent } from "@/src/lib/analytics";
import { logInteractionEvent } from "@/src/lib/interactionEvents";
import { safeBack } from "@/src/lib/navigation";
import { supabase } from "@/src/lib/supabase";
import { fetchWatchlistRecommendationCandidates } from "@/src/lib/tmdb";
import { blurActiveElementOnWeb } from "@/src/lib/webFocus";
import type { Database } from "@/src/types/db";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

type Recommendation = {
  film: Film;
  reason: string;
  score: number;
};

const MAX_RECOMMENDATIONS = 10;
const INITIAL_VISIBLE_RECOMMENDATIONS = 5;

type RecommendationFeedback = "more" | "less";
type DescriptorCategory = "mood" | "aesthetic" | "pacing" | "story" | "type";
type ContentDescriptor = {
  category: DescriptorCategory;
  label: string;
  keywords: string[];
};
type DescriptorMatch = {
  category: DescriptorCategory;
  label: string;
  strength: number;
};
type InteractionEventRow = Pick<
  Database["public"]["Tables"]["interaction_events"]["Row"],
  "action" | "tmdb_id" | "media_type" | "source" | "created_at" | "source_watchlist_id"
>;
type RecommendationBatchInsert =
  Database["public"]["Tables"]["recommendation_batches"]["Insert"];
type RecommendationItemInsert =
  Database["public"]["Tables"]["recommendation_items"]["Insert"];
type RecommendationItemUpdate =
  Database["public"]["Tables"]["recommendation_items"]["Update"];
type AdaptiveWeights = {
  genreOverlap: number;
  genreSimilarity: number;
  contentAffinity: number;
  directorMatch: number;
  focusOverlap: number;
  mediaTypeAffinity: number;
  qualityConfidence: number;
  popularityBalance: number;
  boostGenre: number;
  avoidPenalty: number;
  passPenalty: number;
  recencyBoost: number;
};
type LearnedSignals = {
  genreAffinity: Map<string, number>;
  directorAffinity: Map<string, number>;
  recentlyPassedTmdbIds: Set<number>;
  recentlyLikedTmdbIds: Set<number>;
};

const RECOMMENDATION_ALGORITHM_VERSION = "watchlist-detail-v1";
const CONTENT_DESCRIPTORS: ContentDescriptor[] = [
  {
    category: "mood",
    label: "tense",
    keywords: ["thriller", "suspense", "tense", "pressure", "violent", "crime", "dread"],
  },
  {
    category: "mood",
    label: "cerebral",
    keywords: ["sci-fi", "psychological", "mystery", "existential", "memory", "timeline", "puzzle"],
  },
  {
    category: "mood",
    label: "melancholic",
    keywords: ["memory", "grief", "quiet", "intimate", "reflective", "lonely"],
  },
  {
    category: "mood",
    label: "satirical",
    keywords: ["satire", "class", "wealthy", "social", "commentary", "absurd"],
  },
  {
    category: "mood",
    label: "warm but chaotic",
    keywords: ["family", "restaurant", "workplace", "chaos", "ambition", "grief"],
  },
  {
    category: "aesthetic",
    label: "neo-noir",
    keywords: ["neo-noir", "noir", "crime", "night", "driver", "detective"],
  },
  {
    category: "aesthetic",
    label: "polished sci-fi",
    keywords: ["sci-fi", "future", "extraterrestrial", "office", "procedure", "worldbuilding"],
  },
  {
    category: "aesthetic",
    label: "intimate naturalism",
    keywords: ["indie", "character study", "intimate", "quiet", "subtle", "emotional realism"],
  },
  {
    category: "aesthetic",
    label: "stylized auteur",
    keywords: ["stylized", "auteur", "precision", "rich aesthetics", "synth", "period"],
  },
  {
    category: "pacing",
    label: "slow-burn",
    keywords: ["slow burn", "slow-building", "atmospheric", "contemplative", "ambiguity"],
  },
  {
    category: "pacing",
    label: "high-pressure",
    keywords: ["escalating", "chaos", "spiral", "tension", "high-intensity", "pressure"],
  },
  {
    category: "story",
    label: "twist-driven",
    keywords: ["twist", "reveals", "secret", "con", "missing", "disappearance", "infiltrates"],
  },
  {
    category: "story",
    label: "character-study",
    keywords: ["character study", "identity", "connection", "grief", "personal life", "arc"],
  },
  {
    category: "story",
    label: "puzzle-box mystery",
    keywords: ["mystery", "timeline", "family secrets", "missing-child", "lore", "conspiracy"],
  },
  {
    category: "story",
    label: "class and power conflict",
    keywords: ["class", "wealthy", "poor", "power", "household", "defraud"],
  },
  {
    category: "type",
    label: "serialized mystery",
    keywords: ["series", "season", "office", "timeline", "small town", "procedure"],
  },
  {
    category: "type",
    label: "prestige character drama",
    keywords: ["drama", "character study", "coming-of-age", "indie", "emotional"],
  },
];

export default function WatchlistDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { watchlists, isLoading, addFilmToWatchlist, removeFilmFromWatchlist, deleteWatchlist } =
    useWatchlists();
  const [refreshCount, setRefreshCount] = useState(0);
  const [boostedGenre, setBoostedGenre] = useState<string | null>(null);
  const [avoidedGenre, setAvoidedGenre] = useState<string | null>(null);
  const [focusFilmId, setFocusFilmId] = useState<string | null>(null);
  const [isDeletingWatchlist, setIsDeletingWatchlist] = useState(false);
  const [removingTmdbIds, setRemovingTmdbIds] = useState<number[]>([]);
  const [feedbackByFilmId, setFeedbackByFilmId] = useState<
    Record<string, RecommendationFeedback>
  >({});
  const [interactionEvents, setInteractionEvents] = useState<InteractionEventRow[]>([]);
  const [recommendationCatalog, setRecommendationCatalog] = useState<Film[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [visibleRecommendationCount, setVisibleRecommendationCount] = useState(
    INITIAL_VISIBLE_RECOMMENDATIONS,
  );
  const [recommendationItemIdsByKey, setRecommendationItemIdsByKey] = useState<
    Record<string, string>
  >({});
  const recommendationSeedRef = useRef<Film[]>([]);
  const persistedRecommendationKeyRef = useRef<string | null>(null);
  const persistingRecommendationKeyRef = useRef<string | null>(null);

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
        .select("action,tmdb_id,media_type,source,created_at,source_watchlist_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(400);

      if (!active) return;
      if (error || !data) {
        setInteractionEvents([]);
        return;
      }
      setInteractionEvents(data as InteractionEventRow[]);
    };

    void loadInteractionEvents();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const watchlist = useMemo(
    () => watchlists.find((item) => item.id === id),
    [id, watchlists],
  );
  const watchlistId = watchlist?.id ?? null;

  const savedFilms = useMemo(
    () => (watchlist ? getFilmsByTmdbIds(watchlist.filmIds) : []),
    [watchlist],
  );

  useEffect(() => {
    recommendationSeedRef.current = savedFilms;
  }, [savedFilms]);

  useEffect(() => {
    let active = true;

    const loadRecommendationCatalog = async () => {
      if (!watchlistId) {
        if (!active) return;
        setRecommendationCatalog([]);
        setIsLoadingRecommendations(false);
        return;
      }

      setIsLoadingRecommendations(true);
      const remoteCandidates = await fetchWatchlistRecommendationCandidates(
        recommendationSeedRef.current,
        { refreshSeed: refreshCount },
      );
      if (!active) return;
      setRecommendationCatalog(remoteCandidates);
      setIsLoadingRecommendations(false);
    };

    void loadRecommendationCatalog();
    return () => {
      active = false;
    };
  }, [refreshCount, watchlistId]);

  const recommendations = useMemo(
    () =>
      buildRecommendations({
        catalogFilms: recommendationCatalog,
        watchlistFilms: savedFilms,
        excludedFilmIds: watchlist?.filmIds ?? [],
        interactionEvents,
        watchlistId: watchlist?.id ?? null,
        refreshCount,
        boostedGenre,
        avoidedGenre,
        focusFilmId,
      }),
    [
      avoidedGenre,
      boostedGenre,
      recommendationCatalog,
      focusFilmId,
      interactionEvents,
      refreshCount,
      savedFilms,
      watchlist?.id,
      watchlist?.filmIds,
    ],
  );

  useEffect(() => {
    setVisibleRecommendationCount(INITIAL_VISIBLE_RECOMMENDATIONS);
  }, [watchlist?.id, refreshCount]);

  useEffect(() => {
    let active = true;

    const persistRecommendations = async () => {
      if (!supabase || !user?.id || !watchlist?.id || isLoadingRecommendations) return;
      if (recommendations.length === 0) return;

      const recommendationKey = [
        user.id,
        watchlist.id,
        refreshCount,
        boostedGenre ?? "",
        avoidedGenre ?? "",
        focusFilmId ?? "",
        recommendations
          .map((recommendation) => `${recommendation.film.mediaType}:${recommendation.film.tmdbId}`)
          .join(","),
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
        watchlist_id: watchlist.id,
        source: "watchlist_detail",
        algorithm_version: RECOMMENDATION_ALGORITHM_VERSION,
        seed: refreshCount,
      };

      const { data: batch, error: batchError } = await supabase
        .from("recommendation_batches")
        .insert(batchPayload)
        .select("id")
        .single();

      if (!active || batchError || !batch) {
        if (persistingRecommendationKeyRef.current === recommendationKey) {
          persistingRecommendationKeyRef.current = null;
        }
        return;
      }

      const itemPayloads: RecommendationItemInsert[] = recommendations.map(
        (recommendation, index) => ({
          batch_id: batch.id,
          user_id: user.id,
          watchlist_id: watchlist.id,
          tmdb_id: recommendation.film.tmdbId,
          media_type: recommendation.film.mediaType,
          score: Number(recommendation.score.toFixed(2)),
          reason: recommendation.reason,
          position: index,
          status: "pending",
          metadata: toRecommendationMetadata(recommendation.film),
        }),
      );

      const { data: items, error: itemsError } = await supabase
        .from("recommendation_items")
        .insert(itemPayloads)
        .select("id,tmdb_id,media_type");

      if (!active || itemsError || !items) {
        if (persistingRecommendationKeyRef.current === recommendationKey) {
          persistingRecommendationKeyRef.current = null;
        }
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

    void persistRecommendations();
    return () => {
      active = false;
    };
  }, [
    avoidedGenre,
    boostedGenre,
    focusFilmId,
    isLoadingRecommendations,
    recommendations,
    refreshCount,
    user?.id,
    watchlist?.id,
  ]);

  const openFilm = (
    film: Film,
    source: "watchlist_detail" | "watchlist_recommendation" = "watchlist_detail",
  ) => {
    blurActiveElementOnWeb();
    void logInteractionEvent({
      userId: user?.id,
      action: "open",
      source,
      tmdbId: film.tmdbId,
      mediaType: film.mediaType,
      sourceWatchlistId: watchlist?.id ?? null,
    });
    router.push(
      ({ pathname: "/movie/[id]", params: { id: film.id } } as unknown) as Href,
    );
  };

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

  const addRecommendationToWatchlist = async (film: Film) => {
    if (!watchlist) return;

    const added = await addFilmToWatchlist(
      watchlist.id,
      film.tmdbId,
      "recommendation",
      film.mediaType,
    );
    if (added) {
      trackEvent("recommendation_added", {
        source: "watchlist_recommendation",
        watchlist_id: watchlist.id,
        tmdb_id: film.tmdbId,
      });
      void updatePersistedRecommendationItem(film, {
        status: "added",
        added_to_watchlist_id: watchlist.id,
      });
    }
  };

  const handleRemoveFilm = async (film: Film) => {
    if (!watchlist) return;
    if (removingTmdbIds.includes(film.tmdbId)) return;

    setRemovingTmdbIds((prev) => [...prev, film.tmdbId]);
    await removeFilmFromWatchlist(watchlist.id, film.tmdbId, film.mediaType);
    setRemovingTmdbIds((prev) => prev.filter((id) => id !== film.tmdbId));
  };

  const handleDeleteWatchlist = () => {
    if (!watchlist || watchlist.isDefault || isDeletingWatchlist) return;

    Alert.alert(
      "Delete watchlist?",
      `This will permanently remove "${watchlist.name}" and its saved titles.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setIsDeletingWatchlist(true);
              const deleted = await deleteWatchlist(watchlist.id);
              setIsDeletingWatchlist(false);
              if (deleted) {
                blurActiveElementOnWeb();
                router.replace("/(tabs)/watchlists" as Href);
              }
            })();
          },
        },
      ],
    );
  };

  const applyFeedback = (film: Film, feedback: RecommendationFeedback) => {
    setFeedbackByFilmId((prev) => ({ ...prev, [film.id]: feedback }));
    setFocusFilmId(film.id);
    setRefreshCount(0);
    void updatePersistedRecommendationItem(film, {
      feedback,
      status: feedback === "less" ? "dismissed" : "pending",
    });

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

  if (!watchlist && isLoading) {
    return (
      <AppScreen
        title="Watchlist"
        subtitle="Loading saved titles"
        headerRight={
          <CTAButton
            label="Back"
            variant="secondary"
            onPress={() => router.replace("/(tabs)/watchlists" as Href)}
          />
        }
      >
        <Text style={styles.loadingText}>Loading watchlist from your account...</Text>
      </AppScreen>
    );
  }

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
      headerRight={
        <CTAButton
          label="Back"
          variant="secondary"
          onPress={() => safeBack(router, "/(tabs)/watchlists" as Href)}
        />
      }
    >
      {!watchlist.isDefault ? (
        <View style={styles.deleteWatchlistWrap}>
          <CTAButton
            label={isDeletingWatchlist ? "Deleting..." : "Delete Watchlist"}
            variant="destructive"
            disabled={isDeletingWatchlist}
            onPress={handleDeleteWatchlist}
          />
        </View>
      ) : null}

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
                <HomeRailCard film={film} onPress={() => openFilm(film, "watchlist_detail")} />
                <View style={styles.savedItemAction}>
                  <CTAButton
                    label={removingTmdbIds.includes(film.tmdbId) ? "Removing..." : "Remove"}
                    variant="secondary"
                    disabled={removingTmdbIds.includes(film.tmdbId)}
                    onPress={() => {
                      void handleRemoveFilm(film);
                    }}
                  />
                </View>
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
                setIsLoadingRecommendations(true);
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
                  if (refreshCount !== 0) {
                    setIsLoadingRecommendations(true);
                  }
                  setRefreshCount(0);
                }}
              />
            </View>
          </View>
        )}

        {isLoadingRecommendations ? (
          <Text style={styles.loadingText}>Refreshing recommendation catalog from TMDB...</Text>
        ) : null}

        {isLoadingRecommendations ? null : recommendations.length === 0 ? (
          <EmptyState
            title="No suggestions available"
            message="No TMDB candidates found right now for this watchlist. Try refresh or update saved titles."
          />
        ) : (
          recommendations.slice(0, visibleRecommendationCount).map((recommendation) => {
            const alreadySaved = watchlist.filmIds.includes(recommendation.film.tmdbId);
            return (
              <ConnectedFilmRowCard
                key={recommendation.film.id}
                film={recommendation.film}
                onOpenFilm={() => openFilm(recommendation.film, "watchlist_recommendation")}
                rightContent={
                  <>
                    <Text style={screenStyles.bodyText}>{recommendation.reason}</Text>
                    <CTAButton
                      label={alreadySaved ? "Already in Watchlist" : "Add to Watchlist"}
                      variant={alreadySaved ? "secondary" : "primary"}
                      disabled={alreadySaved}
                      onPress={() => {
                        void addRecommendationToWatchlist(recommendation.film);
                      }}
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
        {!isLoadingRecommendations && recommendations.length > visibleRecommendationCount ? (
          <View style={styles.showMoreWrap}>
            <CTAButton
              label={`Show More (${recommendations.length - visibleRecommendationCount} left)`}
              variant="secondary"
              onPress={() => {
                setVisibleRecommendationCount((count) =>
                  Math.min(count + INITIAL_VISIBLE_RECOMMENDATIONS, recommendations.length),
                );
              }}
            />
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}

function buildRecommendations({
  catalogFilms,
  watchlistFilms,
  excludedFilmIds,
  interactionEvents,
  watchlistId,
  refreshCount,
  boostedGenre,
  avoidedGenre,
  focusFilmId,
}: {
  catalogFilms: Film[];
  watchlistFilms: Film[];
  excludedFilmIds: number[];
  interactionEvents: InteractionEventRow[];
  watchlistId: string | null;
  refreshCount: number;
  boostedGenre: string | null;
  avoidedGenre: string | null;
  focusFilmId: string | null;
}): Recommendation[] {
  // Merge fetched TMDB catalog + currently loaded watchlist films, then dedupe by tmdb id.
  // This keeps scoring on live candidate titles while preserving already-loaded film metadata.
  const candidatePool = dedupeFilmsByTmdb([...catalogFilms, ...watchlistFilms]);
  if (candidatePool.length === 0) return [];
  const filmByTmdbId = new Map<number, Film>(candidatePool.map((film) => [film.tmdbId, film]));

  // Build watchlist "taste fingerprint": genre frequency from saved films.
  const genreFrequency = new Map<string, number>();
  watchlistFilms.forEach((film) => {
    film.genres.forEach((genre) => {
      genreFrequency.set(genre, (genreFrequency.get(genre) ?? 0) + 1);
    });
  });

  // Adaptive knobs from behavior events and per-genre/director learned bias.
  // Tune defaults and caps in deriveAdaptiveWeights / deriveLearnedSignals.
  const weights = deriveAdaptiveWeights(interactionEvents);
  const learnedSignals = deriveLearnedSignals(interactionEvents, filmByTmdbId, watchlistId);
  const watchlistContentProfile = buildWatchlistContentProfile(watchlistFilms);

  const ranked: Recommendation[] = candidatePool
    .filter((film) => !excludedFilmIds.includes(film.tmdbId))
    .map((film) => {
      const overlapGenres = film.genres.filter((genre) => genreFrequency.has(genre));
      const matchingDirectorFilm = watchlistFilms.find(
        (savedFilm) => savedFilm.director === film.director,
      );
      const focusedFilm = focusFilmId
        ? watchlistFilms.find((savedFilm) => savedFilm.id === focusFilmId) ??
          candidatePool.find((candidate) => candidate.id === focusFilmId)
        : undefined;
      const contentMatches = getContentMatches(film, watchlistContentProfile);
      const focusedContentMatches = focusedFilm
        ? getContentMatches(film, buildWatchlistContentProfile([focusedFilm]))
        : [];
      const contentAffinity = contentMatches.reduce(
        (sum, match) => sum + match.strength * getDescriptorWeight(match.category),
        0,
      );
      const focusOverlap =
        focusedFilm &&
        (film.genres.some((genre) => focusedFilm.genres.includes(genre)) ||
          focusedContentMatches.length > 0);
      const matchesBoost = boostedGenre ? film.genres.includes(boostedGenre) : false;
      const hitsAvoidedGenre = avoidedGenre ? film.genres.includes(avoidedGenre) : false;
      const watchlistGenreSet = new Set(
        watchlistFilms.flatMap((savedFilm) => savedFilm.genres.map((genre) => genre.toLowerCase())),
      );
      const filmGenreSet = new Set(film.genres.map((genre) => genre.toLowerCase()));
      const sharedGenreCount = [...filmGenreSet].filter((genre) =>
        watchlistGenreSet.has(genre),
      ).length;
      const unionGenreCount = new Set([...filmGenreSet, ...watchlistGenreSet]).size || 1;
      const genreSimilarity = sharedGenreCount / unionGenreCount;
      const tvCount = watchlistFilms.filter((savedFilm) => savedFilm.mediaType === "tv").length;
      const movieCount = watchlistFilms.filter((savedFilm) => savedFilm.mediaType === "movie").length;
      const watchlistMajorType: "movie" | "tv" =
        tvCount >= movieCount ? "tv" : "movie";
      const mediaTypeAlignment = film.mediaType === watchlistMajorType ? 1 : -1;
      const learnedGenreBoost = film.genres.reduce((sum, genre) => {
        return sum + (learnedSignals.genreAffinity.get(genre.toLowerCase()) ?? 0);
      }, 0);
      const learnedDirectorBoost =
        learnedSignals.directorAffinity.get(film.director.toLowerCase()) ?? 0;
      // Penalize very recent pass/remove and boost very recent like/add.
      // This is intentionally simple recency memory (set membership) for MVP.
      const passPenalty = learnedSignals.recentlyPassedTmdbIds.has(film.tmdbId)
        ? weights.passPenalty
        : 0;
      const recencyBoost = learnedSignals.recentlyLikedTmdbIds.has(film.tmdbId)
        ? weights.recencyBoost
        : 0;

      // Final score = base quality + similarity + explicit user tuning +
      // learned affinity - explicit/implicit negatives.
      // Edit these terms first when you want to change recommendation behavior.
      const score =
        film.matchScore +
        overlapGenres.length * weights.genreOverlap +
        genreSimilarity * weights.genreSimilarity +
        contentAffinity * weights.contentAffinity +
        (matchingDirectorFilm ? weights.directorMatch : 0) +
        (focusOverlap ? weights.focusOverlap : 0) +
        mediaTypeAlignment * weights.mediaTypeAffinity +
        (film.matchScore >= 82 ? weights.qualityConfidence : 0) +
        (film.matchScore >= 96 ? -weights.popularityBalance : 0) +
        (matchesBoost ? weights.boostGenre : 0) -
        (hitsAvoidedGenre ? weights.avoidPenalty : 0) +
        learnedGenreBoost +
        learnedDirectorBoost -
        passPenalty +
        recencyBoost;

      return {
        film,
        score,
        reason: buildReason({
          film,
          overlapGenres,
          matchingDirectorFilm,
          focusedFilm,
          contentMatches,
          focusedContentMatches,
          boostedGenre,
          avoidedGenre,
        }),
      };
    })
    .sort((a, b) => b.score - a.score || a.film.title.localeCompare(b.film.title));

  if (ranked.length === 0) return [];

  const diversityRanked = applyDirectorDiversity(ranked);

  const offset = (refreshCount * MAX_RECOMMENDATIONS) % diversityRanked.length;
  const rotated = [...diversityRanked.slice(offset), ...diversityRanked.slice(0, offset)];
  // Dynamic floor prevents "no recommendations" when penalties are temporarily high.
  const maxScore = rotated[0]?.score ?? 0;
  const minAcceptableScore = Math.max(22, maxScore - 42);
  const accepted = rotated.filter((item) => item.score >= minAcceptableScore);
  if (accepted.length > 0) {
    return accepted.slice(0, MAX_RECOMMENDATIONS);
  }
  return rotated.slice(0, MAX_RECOMMENDATIONS);
}

function dedupeFilmsByTmdb(values: Film[]) {
  const byKey = new Map<string, Film>();
  values.forEach((film) => {
    byKey.set(`${film.mediaType}:${film.tmdbId}`, film);
  });
  return [...byKey.values()];
}

function getRecommendationKey(mediaType: string, tmdbId: number) {
  return `${mediaType}:${tmdbId}`;
}

function toRecommendationMetadata(film: Film): RecommendationItemInsert["metadata"] {
  return {
    film_id: film.id,
    title: film.title,
    year: film.year,
    director: film.director,
    genres: film.genres,
    poster_url: film.posterUrl ?? null,
    backdrop_url: film.backdropUrl ?? null,
    match_score: film.matchScore,
  };
}

function deriveAdaptiveWeights(events: InteractionEventRow[]): AdaptiveWeights {
  // Baseline heuristic weights. Treat these as your primary tuning constants.
  const DEFAULT: AdaptiveWeights = {
    genreOverlap: 7,
    genreSimilarity: 20,
    contentAffinity: 3.4,
    directorMatch: 5,
    focusOverlap: 10,
    mediaTypeAffinity: 2,
    qualityConfidence: 4,
    popularityBalance: 3,
    boostGenre: 14,
    avoidPenalty: 20,
    passPenalty: 9,
    recencyBoost: 5,
  };

  if (events.length === 0) return DEFAULT;

  let likes = 0;
  let passes = 0;
  let adds = 0;
  let removes = 0;
  let opens = 0;

  events.forEach((event) => {
    if (event.action === "like") likes += 1;
    if (event.action === "pass") passes += 1;
    if (event.action === "add") adds += 1;
    if (event.action === "remove") removes += 1;
    if (event.action === "open") opens += 1;
  });

  // Convert event mix into one scalar "sentiment", then cap adjustment
  // to avoid extreme weight jumps from sparse data.
  const positive = likes + adds + Math.round(opens * 0.35);
  const negative = passes + removes * 2;
  const sentiment = positive - negative;
  const adjustment = Math.max(-4, Math.min(4, Math.round(sentiment / 12)));

  // Weights move together with sentiment; penalties also react to pass/remove density.
  return {
    genreOverlap: DEFAULT.genreOverlap + adjustment,
    genreSimilarity: DEFAULT.genreSimilarity + adjustment,
    contentAffinity: DEFAULT.contentAffinity + adjustment * 0.2,
    directorMatch: DEFAULT.directorMatch + Math.round(adjustment / 3),
    focusOverlap: DEFAULT.focusOverlap + Math.round(adjustment / 2),
    mediaTypeAffinity: DEFAULT.mediaTypeAffinity + Math.round(adjustment / 2),
    qualityConfidence: DEFAULT.qualityConfidence + Math.max(0, Math.round((likes + opens) / 25)),
    popularityBalance: DEFAULT.popularityBalance + Math.max(0, Math.round(passes / 22)),
    boostGenre: DEFAULT.boostGenre + adjustment,
    avoidPenalty: DEFAULT.avoidPenalty + Math.max(0, Math.round((passes + removes) / 10)),
    passPenalty: DEFAULT.passPenalty + Math.max(0, Math.round((passes - likes) / 8)),
    recencyBoost: DEFAULT.recencyBoost + Math.max(0, Math.round((likes + adds) / 15)),
  };
}

function applyDirectorDiversity(ranked: Recommendation[]) {
  // Greedy re-rank: keep high score but softly penalize repeated directors.
  const source = [...ranked].sort((a, b) => b.score - a.score || a.film.title.localeCompare(b.film.title));
  const selected: Recommendation[] = [];
  const seenDirectorCount = new Map<string, number>();

  while (source.length > 0) {
    let bestIndex = 0;
    let bestValue = Number.NEGATIVE_INFINITY;

    source.forEach((item, index) => {
      const directorKey = item.film.director.toLowerCase();
      const repeatPenalty = (seenDirectorCount.get(directorKey) ?? 0) * 4;
      const value = item.score - repeatPenalty;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });

    const [pick] = source.splice(bestIndex, 1);
    selected.push(pick);
    const pickedDirector = pick.film.director.toLowerCase();
    seenDirectorCount.set(pickedDirector, (seenDirectorCount.get(pickedDirector) ?? 0) + 1);
  }

  return selected;
}

function deriveLearnedSignals(
  events: InteractionEventRow[],
  filmByTmdbId: Map<number, Film>,
  watchlistId: string | null,
): LearnedSignals {
  // Per-user memory maps used in scoring:
  // - genreAffinity: "you tend to like/dislike this genre recently"
  // - directorAffinity: same idea by director
  const genreAffinity = new Map<string, number>();
  const directorAffinity = new Map<string, number>();
  const recentlyPassedTmdbIds = new Set<number>();
  const recentlyLikedTmdbIds = new Set<number>();

  // Keep only recent interactions to avoid old taste dominating current mood.
  const recentWindow = events.slice(0, 220);
  recentWindow.forEach((event) => {
    const film = filmByTmdbId.get(event.tmdb_id);
    if (!film) return;

    const inWatchlistContext =
      !watchlistId ||
      !event.source_watchlist_id ||
      event.source_watchlist_id === watchlistId;
    if (!inWatchlistContext) return;

    // Signed feedback strength by action:
    // like/add positive, open slightly positive, pass/remove negative.
    const signedDelta =
      event.action === "like" || event.action === "add"
        ? 1.2
        : event.action === "open"
          ? 0.35
          : event.action === "pass" || event.action === "remove"
            ? -1
            : 0;

    if (signedDelta === 0) return;

    // Update genre scores with clamp to prevent runaway bias.
    film.genres.forEach((genre) => {
      const key = genre.toLowerCase();
      const current = genreAffinity.get(key) ?? 0;
      genreAffinity.set(key, clamp(current + signedDelta, -8, 8));
    });

    // Director gets lower weight than genre by design.
    const directorKey = film.director.toLowerCase();
    const currentDirectorScore = directorAffinity.get(directorKey) ?? 0;
    directorAffinity.set(directorKey, clamp(currentDirectorScore + signedDelta * 0.75, -6, 6));

    // Track immediate positives/negatives for short-term recency adjustments.
    if (event.action === "pass" || event.action === "remove") {
      recentlyPassedTmdbIds.add(film.tmdbId);
    }
    if (event.action === "like" || event.action === "add") {
      recentlyLikedTmdbIds.add(film.tmdbId);
    }
  });

  return {
    genreAffinity,
    directorAffinity,
    recentlyPassedTmdbIds,
    recentlyLikedTmdbIds,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildWatchlistContentProfile(films: Film[]) {
  const profile = new Map<string, DescriptorMatch>();

  films.forEach((film) => {
    getFilmContentDescriptors(film).forEach((descriptor) => {
      const key = `${descriptor.category}:${descriptor.label}`;
      const current = profile.get(key);
      profile.set(key, {
        category: descriptor.category,
        label: descriptor.label,
        strength: (current?.strength ?? 0) + 1,
      });
    });
  });

  return profile;
}

function getContentMatches(film: Film, profile: Map<string, DescriptorMatch>) {
  const filmDescriptors = getFilmContentDescriptors(film);
  return filmDescriptors
    .map((descriptor) => profile.get(`${descriptor.category}:${descriptor.label}`))
    .filter((match): match is DescriptorMatch => Boolean(match))
    .sort((a, b) => {
      const categoryDelta = getDescriptorWeight(b.category) - getDescriptorWeight(a.category);
      return categoryDelta || b.strength - a.strength || a.label.localeCompare(b.label);
    });
}

function getFilmContentDescriptors(film: Film) {
  const haystack = [
    film.title,
    film.director,
    film.synopsis,
    film.analysis,
    film.mediaType === "tv" ? "series season serialized" : "movie film",
    ...film.genres,
  ]
    .join(" ")
    .toLowerCase();

  return CONTENT_DESCRIPTORS.filter((descriptor) =>
    descriptor.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())),
  );
}

function getDescriptorWeight(category: DescriptorCategory) {
  if (category === "mood") return 4;
  if (category === "aesthetic") return 3.5;
  if (category === "story") return 3;
  if (category === "pacing") return 2.6;
  return 1.4;
}

function describeDescriptorMatches(matches: DescriptorMatch[]) {
  const byCategory = new Map<DescriptorCategory, DescriptorMatch[]>();
  matches.forEach((match) => {
    const values = byCategory.get(match.category) ?? [];
    if (!values.some((value) => value.label === match.label)) {
      values.push(match);
    }
    byCategory.set(match.category, values);
  });

  const phrases: string[] = [];
  const moodLabels = byCategory.get("mood")?.slice(0, 2).map((match) => match.label);
  const aestheticLabels = byCategory.get("aesthetic")?.slice(0, 2).map((match) => match.label);
  const pacingLabels = byCategory.get("pacing")?.slice(0, 1).map((match) => match.label);
  const storyLabels = byCategory.get("story")?.slice(0, 1).map((match) => match.label);
  const typeLabels = byCategory.get("type")?.slice(0, 1).map((match) => match.label);

  if (moodLabels?.length) phrases.push(`keeps the ${joinLabels(moodLabels)} mood`);
  if (aestheticLabels?.length) phrases.push(`fits the ${joinLabels(aestheticLabels)} aesthetic`);
  if (pacingLabels?.length) phrases.push(`shares the ${joinLabels(pacingLabels)} pacing`);
  if (storyLabels?.length) phrases.push(`uses a ${joinLabels(storyLabels)} story engine`);
  if (typeLabels?.length) phrases.push(`matches the ${joinLabels(typeLabels)} type`);

  return phrases;
}

function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function buildReason({
  film,
  overlapGenres,
  matchingDirectorFilm,
  focusedFilm,
  contentMatches,
  focusedContentMatches,
  boostedGenre,
  avoidedGenre,
}: {
  film: Film;
  overlapGenres: string[];
  matchingDirectorFilm?: Film;
  focusedFilm?: Film;
  contentMatches: DescriptorMatch[];
  focusedContentMatches: DescriptorMatch[];
  boostedGenre: string | null;
  avoidedGenre: string | null;
}) {
  const reasons: string[] = [];
  const format = film.mediaType === "tv" ? "Series" : "Movie";
  const contentReasons = describeDescriptorMatches(contentMatches);

  reasons.push(...contentReasons);

  if (focusedFilm && focusedContentMatches.length > 0) {
    const focusReason = describeDescriptorMatches(focusedContentMatches)[0];
    if (focusReason) {
      reasons.push(`close to "${focusedFilm.title}" in ${focusReason.replace(/^keeps the |^fits the |^shares the |^uses a |^matches the /, "")}`);
    }
  }

  if (reasons.length < 2 && overlapGenres.length >= 2) {
    reasons.push(`shares ${overlapGenres[0]} and ${overlapGenres[1]} as secondary genre signals`);
  } else if (reasons.length < 2 && overlapGenres.length === 1) {
    reasons.push(`keeps a light ${overlapGenres[0]} connection`);
  }

  if (boostedGenre && film.genres.includes(boostedGenre)) {
    reasons.push(`matches your "more like this" signal (${boostedGenre})`);
  }

  if (avoidedGenre && !film.genres.includes(avoidedGenre)) {
    reasons.push(`leans away from ${avoidedGenre} as requested`);
  }

  if (matchingDirectorFilm) {
    reasons.push(`same director as "${matchingDirectorFilm.title}"`);
  }

  if (reasons.length === 0) {
    return `${format} pick: similar audience fit, but its exact mood link is weaker than the top-ranked picks.`;
  }

  return `${format} pick: ${reasons.slice(0, 3).join("; ")}.`;
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
  deleteWatchlistWrap: {
    alignSelf: "flex-start",
  },
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
    gap: SPACING.xs,
  },
  savedItemAction: {
    width: "100%",
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
  loadingText: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  showMoreWrap: {
    width: 180,
  },
});
