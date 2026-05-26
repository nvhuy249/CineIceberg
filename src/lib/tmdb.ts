import {
  cacheFilms,
  featuredFilm,
  getFilmById,
  hiddenGems,
  searchFilms,
  trending,
} from "@/src/data/mockData";
import { supabase, SUPABASE_CONFIG_ERROR } from "@/src/lib/supabase";
import type { Film } from "@/src/types/film";

type MediaType = "movie" | "tv";

type TmdbVideoResult = {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
};

type TmdbVideoPayload = {
  results?: TmdbVideoResult[];
};

type TmdbCrewMember = {
  job?: string;
  name?: string;
};

type TmdbCreditsPayload = {
  crew?: TmdbCrewMember[];
};

type TmdbImageAsset = {
  file_path?: string;
  iso_639_1?: string | null;
  aspect_ratio?: number;
  width?: number;
  height?: number;
  vote_average?: number;
  vote_count?: number;
};

type TmdbImagesPayload = {
  backdrops?: TmdbImageAsset[];
  posters?: TmdbImageAsset[];
};

type TmdbGenre = {
  id: number;
  name: string;
};

type TmdbItem = {
  id: number;
  media_type?: string;
  poster_path?: string;
  backdrop_path?: string;
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  genre_ids?: number[];
  genres?: TmdbGenre[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  credits?: TmdbCreditsPayload;
  videos?: TmdbVideoPayload;
  images?: TmdbImagesPayload;
  created_by?: { name?: string }[];
};

type TmdbListResponse = {
  results?: TmdbItem[];
};

type HomeSections = {
  featuredFilm: Film;
  topRated: Film[];
  trending: Film[];
  discoverQueue: Film[];
};

type HomeSectionsOptions = {
  preferredGenres?: string[];
};

const FILM_ID_PATTERN = /^tmdb-(movie|tv)-(\d+)$/;
const CLIENT_TMDB_READ_TOKEN = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN;
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const POSTER_PALETTE = [
  "#2c4f7d",
  "#28594d",
  "#325e8a",
  "#613e4d",
  "#4e3f7d",
  "#7b5f3f",
  "#4a5f75",
  "#5a4837",
  "#3d5668",
  "#3f4b3a",
  "#6b4e3b",
];

const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const TV_GENRES: Record<number, string> = {
  10759: "Action",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi",
  10766: "Soap",
  10767: "Talk",
  10768: "War",
  37: "Western",
};

const toGenreIdLookup = (genreMap: Record<number, string>) => {
  const lookup = new Map<string, number[]>();
  Object.entries(genreMap).forEach(([id, name]) => {
    const key = name.toLowerCase();
    const current = lookup.get(key) ?? [];
    current.push(Number(id));
    lookup.set(key, current);
  });
  return lookup;
};

const MOVIE_GENRE_IDS_BY_NAME = toGenreIdLookup(MOVIE_GENRES);
const TV_GENRE_IDS_BY_NAME = toGenreIdLookup(TV_GENRES);

const withFallback = <T,>(value: T, fallback: T) => (value ? value : fallback);
const withListFallback = <T,>(value: T[], fallback: T[]) =>
  value.length > 0 ? value : fallback;

const pickPosterColor = (tmdbId: number) =>
  POSTER_PALETTE[Math.abs(tmdbId) % POSTER_PALETTE.length];

const getMediaType = (item: TmdbItem, fallbackType: MediaType): MediaType =>
  item.media_type === "tv" || item.media_type === "movie"
    ? item.media_type
    : fallbackType;

const getTitle = (item: TmdbItem) =>
  item.title?.trim() || item.name?.trim() || "Untitled";

const getYear = (item: TmdbItem) => {
  const date = item.release_date || item.first_air_date;
  const parsed = Number.parseInt((date ?? "").slice(0, 4), 10);
  return Number.isFinite(parsed) && parsed > 1900 ? parsed : 2020;
};

const getGenres = (item: TmdbItem, mediaType: MediaType) => {
  if (Array.isArray(item.genres) && item.genres.length > 0) {
    return item.genres.map((genre) => genre.name).slice(0, 4);
  }

  const source = mediaType === "tv" ? TV_GENRES : MOVIE_GENRES;
  const fromIds = (item.genre_ids ?? [])
    .map((genreId) => source[genreId])
    .filter((genre): genre is string => Boolean(genre))
    .slice(0, 4);

  if (mediaType === "tv") {
    return withFallback(fromIds, ["Series"]);
  }

  return withFallback(fromIds, ["Movie"]);
};

const getDirector = (item: TmdbItem) => {
  const crew = item.credits?.crew ?? [];
  const director = crew.find((member) => member.job === "Director")?.name;
  if (director) return director;

  const createdBy = item.created_by?.find((member) => member.name)?.name;
  if (createdBy) return createdBy;

  return "Unknown";
};

const getRuntimeMinutes = (item: TmdbItem, mediaType: MediaType) => {
  if (mediaType === "movie" && typeof item.runtime === "number" && item.runtime > 0) {
    return item.runtime;
  }

  if (
    mediaType === "tv" &&
    Array.isArray(item.episode_run_time) &&
    typeof item.episode_run_time[0] === "number" &&
    item.episode_run_time[0] > 0
  ) {
    return item.episode_run_time[0];
  }

  return mediaType === "tv" ? 50 : 110;
};

const getMatchScore = (item: TmdbItem) => {
  const score = Math.round((item.vote_average ?? 0) * 10);
  return Math.max(55, Math.min(score || 75, 99));
};

const toVideos = (item: TmdbItem) => {
  const videos = item.videos?.results ?? [];
  return videos
    .filter((video) => video.site === "YouTube")
    .slice(0, 2)
    .map((video) => ({
      id: video.key || video.id,
      title: video.name || video.type || "Video",
    }));
};

const toImageUrl = (path?: string, size: string = "w500") => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${normalizedPath}`;
};

const toPosterUrl = (item: TmdbItem) => {
  const path = item.poster_path || item.backdrop_path;
  return toImageUrl(path, "w500");
};

const toBackdropUrl = (item: TmdbItem) => {
  const path = item.backdrop_path || item.poster_path;
  return toImageUrl(path, "w1280");
};

const normalizeImagePath = (path?: string) => {
  if (!path) return null;
  return path.startsWith("/") ? path : `/${path}`;
};

const isPreferredImageLanguage = (asset: TmdbImageAsset) =>
  asset.iso_639_1 === "en" || asset.iso_639_1 === null || asset.iso_639_1 === undefined;

const getImageQualityScore = (asset: TmdbImageAsset) => {
  const resolutionScore = Math.min(((asset.width ?? 0) * (asset.height ?? 0)) / 300000, 8);
  const voteScore = (asset.vote_average ?? 0) * 2 + Math.min(asset.vote_count ?? 0, 20) * 0.25;
  return voteScore + resolutionScore;
};

const rankImageAssets = (assets: TmdbImageAsset[]) =>
  assets
    .filter((asset) => asset.file_path && isPreferredImageLanguage(asset))
    .sort((a, b) => getImageQualityScore(b) - getImageQualityScore(a));

const toGalleryUrls = (item: TmdbItem) => {
  const urls: string[] = [];
  const seenPaths = new Set<string>();
  const pushUnique = (path: string | undefined, size: string) => {
    const normalizedPath = normalizeImagePath(path);
    if (!normalizedPath || seenPaths.has(normalizedPath)) return;
    seenPaths.add(normalizedPath);
    const url = toImageUrl(normalizedPath, size);
    if (url) urls.push(url);
  };

  pushUnique(item.backdrop_path, "w1280");
  pushUnique(item.poster_path, "w780");

  rankImageAssets(item.images?.posters ?? [])
    .filter((asset) => normalizeImagePath(asset.file_path) !== normalizeImagePath(item.poster_path))
    .slice(0, 1)
    .forEach((asset) => pushUnique(asset.file_path, "w780"));
  rankImageAssets(item.images?.backdrops ?? [])
    .filter((asset) => normalizeImagePath(asset.file_path) !== normalizeImagePath(item.backdrop_path))
    .slice(0, 4)
    .forEach((asset) => pushUnique(asset.file_path, "w1280"));

  return urls.slice(0, 6);
};

const toFilm = (item: TmdbItem, fallbackType: MediaType): Film => {
  const mediaType = getMediaType(item, fallbackType);
  const title = getTitle(item);
  const matchScore = getMatchScore(item);

  return {
    id: `tmdb-${mediaType}-${item.id}`,
    tmdbId: item.id,
    mediaType,
    posterUrl: toPosterUrl(item),
    backdropUrl: toBackdropUrl(item),
    imageGalleryUrls: toGalleryUrls(item),
    title,
    year: getYear(item),
    runtimeMinutes: getRuntimeMinutes(item, mediaType),
    director: getDirector(item),
    genres: getGenres(item, mediaType),
    matchScore,
    posterColor: pickPosterColor(item.id),
    synopsis: (item.overview || "No summary available.").trim(),
    analysis: `Audience score ${matchScore}% based on TMDB votes and ranking signals.`,
    videos: toVideos(item),
  };
};

const dedupeByTmdb = (films: Film[]) => {
  const byKey = new Map<string, Film>();
  films.forEach((film) => {
    byKey.set(`${film.mediaType}:${film.tmdbId}`, film);
  });
  return [...byKey.values()];
};

const excludeTmdbMatches = (films: Film[], excludedFilms: Film[]) => {
  const excludedKeys = new Set(
    excludedFilms.map((film) => `${film.mediaType}:${film.tmdbId}`),
  );
  return films.filter((film) => !excludedKeys.has(`${film.mediaType}:${film.tmdbId}`));
};

const getFunctionErrorDetails = async (error: unknown) => {
  if (!error || typeof error !== "object") return null;

  const baseMessage =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "TMDB proxy request failed.";

  const context =
    "context" in error && error.context && typeof error.context === "object"
      ? (error.context as {
          status?: number;
          statusText?: string;
          json?: () => Promise<unknown>;
          text?: () => Promise<string>;
        })
      : null;

  if (!context) return baseMessage;

  let bodyMessage = "";
  try {
    if (typeof context.json === "function") {
      const json = await context.json();
      if (json && typeof json === "object") {
        if ("error" in json && typeof json.error === "string") {
          bodyMessage = json.error;
        } else if ("status_message" in json && typeof json.status_message === "string") {
          bodyMessage = json.status_message;
        }
      }
    } else if (typeof context.text === "function") {
      bodyMessage = await context.text();
    }
  } catch {
    // ignore parse failures and fall back to base message
  }

  const statusPrefix =
    typeof context.status === "number"
      ? `Edge Function ${context.status}${context.statusText ? ` ${context.statusText}` : ""}`
      : "Edge Function";

  if (bodyMessage) return `${statusPrefix}: ${bodyMessage}`;
  return `${statusPrefix}: ${baseMessage}`;
};

const rankByPreferredGenres = (films: Film[], preferredGenres: string[]) => {
  if (preferredGenres.length === 0) return films;

  const normalizedTags = preferredGenres
    .map((genre) => genre.trim().toLowerCase())
    .filter((genre) => genre.length > 0);
  if (normalizedTags.length === 0) return films;

  const tagSet = new Set(normalizedTags);

  return [...films].sort((a, b) => {
    const aOverlap = a.genres.reduce(
      (count, genre) => (tagSet.has(genre.toLowerCase()) ? count + 1 : count),
      0,
    );
    const bOverlap = b.genres.reduce(
      (count, genre) => (tagSet.has(genre.toLowerCase()) ? count + 1 : count),
      0,
    );

    if (aOverlap !== bOverlap) return bOverlap - aOverlap;
    if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
    return a.title.localeCompare(b.title);
  });
};

const invokeTmdb = async <T,>(
  endpoint: string,
  params: Record<string, string | number | boolean> = {},
): Promise<T> => {
  const invokeDirect = async () => {
    if (!CLIENT_TMDB_READ_TOKEN) {
      throw new Error(SUPABASE_CONFIG_ERROR);
    }

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      query.set(key, String(value));
    });
    if (!query.has("language")) query.set("language", "en-US");

    const response = await fetch(`https://api.themoviedb.org/3/${endpoint}?${query.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CLIENT_TMDB_READ_TOKEN}`,
        Accept: "application/json",
      },
    });
    const data = (await response.json()) as T;
    return data;
  };

  if (!supabase) return invokeDirect();

  let data: unknown = null;
  let errorMessage: string | null = null;
  try {
    const response = await supabase.functions.invoke("tmdb-proxy", {
      body: { endpoint, params },
    });
    data = response.data;
    if (response.error) {
      errorMessage =
        (await getFunctionErrorDetails(response.error)) ||
        "TMDB proxy request failed.";
    }
  } catch (error) {
    errorMessage =
      (await getFunctionErrorDetails(error)) ||
      (error instanceof Error ? error.message : "TMDB proxy request failed.");
  }

  if (errorMessage) {
    if (CLIENT_TMDB_READ_TOKEN) {
      return invokeDirect();
    }
    throw new Error(errorMessage);
  }

  if (
    data &&
    typeof data === "object" &&
    "status_code" in data &&
    "status_message" in data
  ) {
    const message =
      (data as { status_message?: string }).status_message ||
      "TMDB API returned an error.";
    if (CLIENT_TMDB_READ_TOKEN) {
      return invokeDirect();
    }
    throw new Error(message);
  }

  return data as T;
};

const mapListToFilms = (items: TmdbItem[], fallbackType: MediaType) => {
  const mapped = items
    .filter((item) => Number.isInteger(item.id))
    .map((item) => toFilm(item, fallbackType));
  cacheFilms(mapped);
  return mapped;
};

export const fetchHomeSections = async (
  options: HomeSectionsOptions = {},
): Promise<HomeSections> => {
  const preferredGenres = options.preferredGenres ?? [];

  try {
    const [trendingAllRaw, trendingMovieRaw, trendingTvRaw, topMovieRaw, topTvRaw] =
      await Promise.all([
        invokeTmdb<TmdbListResponse>("trending/all/day", { page: 1 }),
        invokeTmdb<TmdbListResponse>("trending/movie/week", { page: 1 }),
        invokeTmdb<TmdbListResponse>("trending/tv/week", { page: 1 }),
        invokeTmdb<TmdbListResponse>("discover/movie", {
          page: 1,
          sort_by: "vote_average.desc",
          "vote_count.gte": 500,
        }),
        invokeTmdb<TmdbListResponse>("discover/tv", {
          page: 1,
          sort_by: "vote_average.desc",
          "vote_count.gte": 250,
        }),
      ]);

    const trendingAllFilms = mapListToFilms(
      (trendingAllRaw.results ?? []).filter(
        (item) => item.media_type === "movie" || item.media_type === "tv",
      ),
      "movie",
    );
    const trendingMovieFilms = mapListToFilms(
      trendingMovieRaw.results ?? [],
      "movie",
    );
    const trendingTvFilms = mapListToFilms(trendingTvRaw.results ?? [], "tv");
    const topRatedFilms = dedupeByTmdb([
      ...mapListToFilms(topMovieRaw.results ?? [], "movie"),
      ...mapListToFilms(topTvRaw.results ?? [], "tv"),
    ]);

    const rankedTopRated = rankByPreferredGenres(topRatedFilms, preferredGenres);
    const trendingPool = dedupeByTmdb([
      ...trendingAllFilms,
      ...trendingMovieFilms,
      ...trendingTvFilms,
    ]);
    const rankedTrending = rankByPreferredGenres(trendingPool, preferredGenres);
    const featured =
      trendingAllFilms.find((film) => film.backdropUrl || film.posterUrl) ??
      trendingPool.find((film) => film.backdropUrl || film.posterUrl) ??
      trendingAllFilms[0] ??
      trendingPool[0] ??
      featuredFilm;
    const trendingRail = excludeTmdbMatches(trendingPool, [featured]).slice(0, 8);
    const topRatedRail = excludeTmdbMatches(rankedTopRated, [
      featured,
      ...trendingRail,
    ]).slice(0, 8);

    return {
      featuredFilm: featured,
      topRated: withListFallback(topRatedRail, hiddenGems),
      trending: withListFallback(trendingRail, trending),
      discoverQueue: withListFallback(
        excludeTmdbMatches(rankedTrending, [featured]).slice(0, 12),
        rankedTrending.slice(0, 6),
      ),
    };
  } catch {
    const fallbackFeatured =
      trending.find((film) => film.backdropUrl || film.posterUrl) ?? trending[0] ?? featuredFilm;
    const fallbackTrending = excludeTmdbMatches(trending, [fallbackFeatured]);
    const fallbackTopRated = excludeTmdbMatches(
      rankByPreferredGenres(hiddenGems, preferredGenres),
      [fallbackFeatured, ...fallbackTrending],
    );
    return {
      featuredFilm: fallbackFeatured,
      topRated: withListFallback(fallbackTopRated, hiddenGems),
      trending: fallbackTrending,
      discoverQueue: rankByPreferredGenres(
        [...trending, ...hiddenGems].slice(0, 8),
        preferredGenres,
      ),
    };
  }
};

const fetchSearchResultsInternal = async (query: string): Promise<Film[]> => {
  if (!query.trim()) {
    const trendingAllRaw = await invokeTmdb<TmdbListResponse>("trending/all/day", {
      page: 1,
    });
    const results = mapListToFilms(
      (trendingAllRaw.results ?? []).filter(
        (item) => item.media_type === "movie" || item.media_type === "tv",
      ),
      "movie",
    );
    return results.slice(0, 20);
  }

  const searchRaw = await invokeTmdb<TmdbListResponse>("search/multi", {
    query: query.trim(),
    include_adult: false,
    page: 1,
  });

  const results = mapListToFilms(
    (searchRaw.results ?? []).filter(
      (item) => item.media_type === "movie" || item.media_type === "tv",
    ),
    "movie",
  );
  return results.slice(0, 30);
};

export const fetchSearchResultsStrict = (query: string) =>
  fetchSearchResultsInternal(query);

export const fetchSearchResults = async (query: string): Promise<Film[]> => {
  try {
    return await fetchSearchResultsInternal(query);
  } catch {
    return searchFilms(query);
  }
};

export const fetchDiscoverQueue = async (): Promise<Film[]> => {
  try {
    const trendingRaw = await invokeTmdb<TmdbListResponse>("trending/all/day", {
      page: 2,
    });
    const queue = mapListToFilms(
      (trendingRaw.results ?? []).filter(
        (item) => item.media_type === "movie" || item.media_type === "tv",
      ),
      "movie",
    );
    return withFallback(queue.slice(0, 12), []);
  } catch {
    return [];
  }
};

export const fetchHiddenIcebergCandidates = async (): Promise<Film[]> => {
  try {
    const [
      hiddenMovieRaw,
      olderMovieRaw,
      nonEnglishMovieRaw,
      tvRaw,
      documentaryRaw,
      trendingRaw,
    ] = await Promise.all([
      invokeTmdb<TmdbListResponse>("discover/movie", {
        page: 1,
        sort_by: "vote_average.desc",
        "vote_count.gte": 80,
        "vote_count.lte": 3500,
        with_original_language: "en",
      }),
      invokeTmdb<TmdbListResponse>("discover/movie", {
        page: 1,
        sort_by: "vote_average.desc",
        "vote_count.gte": 80,
        "vote_count.lte": 2500,
        "primary_release_date.lte": "2015-12-31",
      }),
      invokeTmdb<TmdbListResponse>("discover/movie", {
        page: 1,
        sort_by: "vote_average.desc",
        "vote_count.gte": 60,
        "vote_count.lte": 2200,
        with_original_language: "ja",
      }),
      invokeTmdb<TmdbListResponse>("discover/tv", {
        page: 1,
        sort_by: "vote_average.desc",
        "vote_count.gte": 60,
        "vote_count.lte": 2500,
      }),
      invokeTmdb<TmdbListResponse>("discover/movie", {
        page: 1,
        sort_by: "vote_average.desc",
        "vote_count.gte": 40,
        "vote_count.lte": 1500,
        with_genres: "99",
      }),
      invokeTmdb<TmdbListResponse>("trending/all/week", {
        page: 3,
      }),
    ]);

    const movieCandidates = mapListToFilms(
      [
        ...(hiddenMovieRaw.results ?? []),
        ...(olderMovieRaw.results ?? []),
        ...(nonEnglishMovieRaw.results ?? []),
        ...(documentaryRaw.results ?? []),
      ],
      "movie",
    );
    const tvCandidates = mapListToFilms(tvRaw.results ?? [], "tv");
    const trendingCandidates = mapListToFilms(
      (trendingRaw.results ?? []).filter(
        (item) => item.media_type === "movie" || item.media_type === "tv",
      ),
      "movie",
    );
    return dedupeByTmdb([...movieCandidates, ...tvCandidates, ...trendingCandidates]).slice(0, 72);
  } catch {
    return [];
  }
};

export const fetchWatchlistRecommendationCandidates = async (
  seedFilms: Film[],
  options: { refreshSeed?: number } = {},
): Promise<Film[]> => {
  const refreshSeed = Math.max(0, options.refreshSeed ?? 0);
  const primaryPage = (refreshSeed % 3) + 1;
  const secondaryPage = ((refreshSeed + 1) % 4) + 1;

  const isAnimationCompatible = (film: Film) =>
    film.genres.some((genre) => {
      const normalized = genre.toLowerCase();
      return normalized === "animation" || normalized === "anime";
    });

  const filterForWatchlistNiche = (films: Film[], isAnimeLikeWatchlist: boolean) =>
    isAnimeLikeWatchlist ? films.filter(isAnimationCompatible) : films;

  const animationLikeSeedCount = seedFilms.filter((film) => isAnimationCompatible(film)).length;
  const tvLikeSeedCount = seedFilms.filter((film) => film.mediaType === "tv").length;
  const liveActionSeedCount = seedFilms.length - animationLikeSeedCount;
  const isAnimeLikeSeed =
    seedFilms.length > 0 &&
    animationLikeSeedCount / seedFilms.length >= 0.7 &&
    tvLikeSeedCount / seedFilms.length >= 0.65 &&
    liveActionSeedCount <= Math.max(1, Math.floor(seedFilms.length * 0.2));

  const safeInvoke = async (
    endpoint: string,
    params: Record<string, string | number | boolean> = {},
  ) => {
    try {
      return await invokeTmdb<TmdbListResponse>(endpoint, params);
    } catch (error) {
      if (__DEV__) {
        console.warn("[watchlist-reco] TMDB call failed", { endpoint, params, error });
      }
      return null;
    }
  };

  const logRecoDebug = (
    stage: string,
    values: Record<string, number | string | boolean | null | undefined>,
  ) => {
    if (!__DEV__) return;
    console.log("[watchlist-reco]", stage, values);
  };

  try {
    // If watchlist is empty, still provide a non-empty TMDB candidate pool.
    if (seedFilms.length === 0) {
      const trendingRaw = await safeInvoke("trending/all/week", { page: primaryPage });
      return dedupeByTmdb(
        mapListToFilms(
          (trendingRaw?.results ?? []).filter(
            (item) => item.media_type === "movie" || item.media_type === "tv",
          ),
          "movie",
        ),
      ).slice(0, 48);
    }

    const genreFrequency = new Map<string, number>();
    seedFilms.forEach((film) => {
      film.genres.forEach((genre) => {
        if (genre.toLowerCase() === "series") return;
        genreFrequency.set(genre, (genreFrequency.get(genre) ?? 0) + 1);
      });
    });

    const topGenres = [...genreFrequency.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([genre]) => genre)
      .slice(0, 3);

    const movieGenreIds = topGenres
      .flatMap((genre) => MOVIE_GENRE_IDS_BY_NAME.get(genre.toLowerCase()) ?? [])
      .slice(0, 4);
    const tvGenreIds = topGenres
      .flatMap((genre) => TV_GENRE_IDS_BY_NAME.get(genre.toLowerCase()) ?? [])
      .slice(0, 4);

    const isAnimeLikeWatchlist = isAnimeLikeSeed;

    const movieDiscoverParams: Record<string, string | number | boolean> = {
      page: primaryPage,
      sort_by: "vote_average.desc",
      "vote_count.gte": 40,
      "vote_count.lte": 12000,
    };
    if (movieGenreIds.length > 0) {
      movieDiscoverParams.with_genres = movieGenreIds.join(",");
    }

    const tvDiscoverParams: Record<string, string | number | boolean> = {
      page: primaryPage,
      sort_by: "vote_average.desc",
      "vote_count.gte": 30,
      "vote_count.lte": 9000,
    };
    if (tvGenreIds.length > 0) {
      tvDiscoverParams.with_genres = tvGenreIds.join(",");
    }
    if (isAnimeLikeWatchlist) {
      tvDiscoverParams.with_original_language = "ja";
      // Force animation into the genre filter for anime-heavy lists.
      const current = typeof tvDiscoverParams.with_genres === "string"
        ? tvDiscoverParams.with_genres.split(",").filter(Boolean)
        : [];
      if (!current.includes("16")) current.push("16");
      tvDiscoverParams.with_genres = current.join(",");
    }

    const discoverCalls = [
      safeInvoke("discover/movie", movieDiscoverParams),
      safeInvoke("discover/tv", tvDiscoverParams),
    ];

    const rotatedSeeds = [...seedFilms.slice(refreshSeed % seedFilms.length), ...seedFilms.slice(0, refreshSeed % seedFilms.length)];
    const similarSeeds = rotatedSeeds.slice(0, 5);
    const similarCalls = similarSeeds.map((film, index) =>
      safeInvoke(`${film.mediaType}/${film.tmdbId}/similar`, {
        page: ((refreshSeed + index) % 3) + 1,
      }),
    );

    const responses = await Promise.all([...discoverCalls, ...similarCalls]);
    const [discoverMovies, discoverTv, ...similarResponses] = responses;

    const movieCandidates = mapListToFilms(discoverMovies?.results ?? [], "movie");
    const tvCandidates = mapListToFilms(discoverTv?.results ?? [], "tv");
    const similarCandidates = similarResponses.flatMap((response, index) => {
      const seed = similarSeeds[index];
      if (!seed) return [];
      return mapListToFilms(response?.results ?? [], seed.mediaType);
    });

    let mergedPrimary = dedupeByTmdb([
      ...similarCandidates,
      ...movieCandidates,
      ...tvCandidates,
    ]);
    let nichePrimary = filterForWatchlistNiche(mergedPrimary, isAnimeLikeWatchlist);

    logRecoDebug("primary", {
      isAnimeLikeWatchlist,
      seedCount: seedFilms.length,
      similarCount: similarCandidates.length,
      movieDiscoverCount: movieCandidates.length,
      tvDiscoverCount: tvCandidates.length,
      mergedPrimaryCount: mergedPrimary.length,
      nichePrimaryCount: nichePrimary.length,
    });

    // Progressive relaxation before trending backfill:
    // if strict filters are too narrow, run looser discover queries.
    if (nichePrimary.length < 12) {
      const relaxedMovieParams: Record<string, string | number | boolean> = {
        page: secondaryPage,
        sort_by: "popularity.desc",
        "vote_count.gte": 10,
      };
      if (movieGenreIds.length > 0) {
        relaxedMovieParams.with_genres = movieGenreIds.join(",");
      }

      const relaxedTvParams: Record<string, string | number | boolean> = {
        page: secondaryPage,
        sort_by: "popularity.desc",
        "vote_count.gte": 10,
      };
      if (tvGenreIds.length > 0) {
        relaxedTvParams.with_genres = tvGenreIds.join(",");
      }
      if (isAnimeLikeWatchlist) {
        const current = typeof relaxedTvParams.with_genres === "string"
          ? relaxedTvParams.with_genres.split(",").filter(Boolean)
          : [];
        if (!current.includes("16")) current.push("16");
        relaxedTvParams.with_genres = current.join(",");
      }

      const [relaxedMovies, relaxedTv] = await Promise.all([
        safeInvoke("discover/movie", relaxedMovieParams),
        safeInvoke("discover/tv", relaxedTvParams),
      ]);

      const relaxedCandidates = dedupeByTmdb([
        ...mapListToFilms(relaxedMovies?.results ?? [], "movie"),
        ...mapListToFilms(relaxedTv?.results ?? [], "tv"),
      ]);

      mergedPrimary = dedupeByTmdb([...mergedPrimary, ...relaxedCandidates]);
      nichePrimary = filterForWatchlistNiche(mergedPrimary, isAnimeLikeWatchlist);
      logRecoDebug("relaxed", {
        relaxedCount: relaxedCandidates.length,
        nicheCountAfterRelaxed: nichePrimary.length,
      });
    }

    if (nichePrimary.length >= 12) {
      logRecoDebug("return-niche-primary", {
        nicheCount: nichePrimary.length,
      });
      return nichePrimary.slice(0, 48);
    }

    // Second relaxation: broaden with page-2 discover before touching trending.
    if (nichePrimary.length < 12) {
      const [moviePage2, tvPage2] = await Promise.all([
        safeInvoke("discover/movie", {
          ...movieDiscoverParams,
          page: secondaryPage,
        }),
        safeInvoke("discover/tv", {
          ...tvDiscoverParams,
          page: secondaryPage,
        }),
      ]);

      const page2Candidates = dedupeByTmdb([
        ...mapListToFilms(moviePage2?.results ?? [], "movie"),
        ...mapListToFilms(tvPage2?.results ?? [], "tv"),
      ]);

      const nichePage2 = filterForWatchlistNiche(page2Candidates, isAnimeLikeWatchlist);

      nichePrimary = dedupeByTmdb([...nichePrimary, ...nichePage2]);
      logRecoDebug("page2", {
        page2Count: page2Candidates.length,
        nicheCountAfterPage2: nichePrimary.length,
      });
      if (nichePrimary.length >= 12) {
        logRecoDebug("return-niche-page2", {
          nicheCount: nichePrimary.length,
        });
        return nichePrimary.slice(0, 48);
      }
    }

    // Backfill with trending only as last mile (small gap fill, not dominant source).
    if (nichePrimary.length < 8) {
      const trendingRaw = await safeInvoke("trending/all/day", { page: primaryPage });
      const trendingCandidates = mapListToFilms(
        (trendingRaw?.results ?? []).filter(
          (item) => item.media_type === "movie" || item.media_type === "tv",
        ),
        "movie",
      );
      const trendingBackfill = filterForWatchlistNiche(trendingCandidates, isAnimeLikeWatchlist);
      const gap = Math.max(0, 10 - nichePrimary.length);
      const cappedTrending = trendingBackfill.slice(0, gap);
      const merged = dedupeByTmdb([...nichePrimary, ...cappedTrending]);
      logRecoDebug("trending-backfill", {
        nicheCount: nichePrimary.length,
        trendingCount: trendingCandidates.length,
        trendingBackfillCount: cappedTrending.length,
        mergedCount: merged.length,
      });
      if (merged.length > 0) {
        return merged.slice(0, 48);
      }
    }

    // Last-resort fallback from live TMDB (still no mock data).
    const fallbackTrendingRaw = await safeInvoke("trending/all/week", { page: secondaryPage });
    logRecoDebug("fallback-last-resort", {
      fallbackCount: (fallbackTrendingRaw?.results ?? []).length,
    });
    return filterForWatchlistNiche(dedupeByTmdb(
      mapListToFilms(
        (fallbackTrendingRaw?.results ?? []).filter(
          (item) => item.media_type === "movie" || item.media_type === "tv",
        ),
        "movie",
      ),
    ), isAnimeLikeWatchlist).slice(0, 48);
  } catch {
    try {
      const fallbackTrendingRaw = await safeInvoke("trending/all/week", { page: 1 });
      logRecoDebug("fallback-catch", {
        fallbackCount: (fallbackTrendingRaw?.results ?? []).length,
      });
      return filterForWatchlistNiche(dedupeByTmdb(
        mapListToFilms(
          (fallbackTrendingRaw?.results ?? []).filter(
            (item) => item.media_type === "movie" || item.media_type === "tv",
          ),
          "movie",
        ),
      ), isAnimeLikeSeed).slice(0, 48);
    } catch {
      return [];
    }
  }
};

export const fetchFilmDetailByRouteId = async (routeId?: string) => {
  if (!routeId) return null;

  const match = routeId.match(FILM_ID_PATTERN);
  if (!match) {
    return getFilmById(routeId) ?? null;
  }

  const mediaType = match[1] as MediaType;
  const tmdbId = Number.parseInt(match[2], 10);
  if (!Number.isFinite(tmdbId)) return null;

  try {
    const detail = await invokeTmdb<TmdbItem>(`${mediaType}/${tmdbId}`, {
      append_to_response: "videos,credits,images",
      include_image_language: "en,null",
    });
    const mapped = toFilm(
      {
        ...detail,
        id: tmdbId,
        media_type: mediaType,
      },
      mediaType,
    );
    cacheFilms([mapped]);
    return mapped;
  } catch {
    return null;
  }
};
