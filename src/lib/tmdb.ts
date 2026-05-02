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
  created_by?: { name?: string }[];
};

type TmdbListResponse = {
  results?: TmdbItem[];
};

type HomeSections = {
  featuredFilm: Film;
  hiddenGems: Film[];
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

const withFallback = <T,>(value: T, fallback: T) => (value ? value : fallback);

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

const toPosterUrl = (item: TmdbItem) => {
  const path = item.poster_path || item.backdrop_path;
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/w500${normalizedPath}`;
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
    const [trendingAllRaw, trendingMovieRaw, trendingTvRaw, hiddenRaw] =
      await Promise.all([
        invokeTmdb<TmdbListResponse>("trending/all/week", { page: 1 }),
        invokeTmdb<TmdbListResponse>("trending/movie/week", { page: 1 }),
        invokeTmdb<TmdbListResponse>("trending/tv/week", { page: 1 }),
        invokeTmdb<TmdbListResponse>("discover/movie", {
          page: 1,
          sort_by: "vote_average.desc",
          "vote_count.gte": 200,
          "vote_count.lte": 8000,
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
    const hiddenFilms = mapListToFilms(hiddenRaw.results ?? [], "movie");

    const rankedHidden = rankByPreferredGenres(hiddenFilms, preferredGenres);
    const rankedTrendingMovies = rankByPreferredGenres(trendingMovieFilms, preferredGenres);
    const rankedRails = rankByPreferredGenres(
      dedupeByTmdb([...trendingAllFilms, ...trendingTvFilms]),
      preferredGenres,
    );
    const featured =
      rankedRails[0] ??
      rankedTrendingMovies[0] ??
      trendingAllFilms[0] ??
      trendingMovieFilms[0] ??
      featuredFilm;

    return {
      featuredFilm: featured,
      hiddenGems: withFallback(rankedHidden.slice(0, 6), hiddenGems),
      trending: withFallback(rankedTrendingMovies.slice(0, 8), trending),
      discoverQueue: withFallback(rankedRails.slice(0, 12), rankedRails.slice(0, 6)),
    };
  } catch {
    return {
      featuredFilm: rankByPreferredGenres([featuredFilm], preferredGenres)[0] ?? featuredFilm,
      hiddenGems: rankByPreferredGenres(hiddenGems, preferredGenres),
      trending: rankByPreferredGenres(trending, preferredGenres),
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
    const [movieRaw, tvRaw] = await Promise.all([
      invokeTmdb<TmdbListResponse>("discover/movie", {
        page: 2,
        sort_by: "vote_average.desc",
        "vote_count.gte": 300,
        with_original_language: "en",
      }),
      invokeTmdb<TmdbListResponse>("discover/tv", {
        page: 2,
        sort_by: "vote_average.desc",
        "vote_count.gte": 200,
      }),
    ]);

    const movieCandidates = mapListToFilms(movieRaw.results ?? [], "movie");
    const tvCandidates = mapListToFilms(tvRaw.results ?? [], "tv");
    return dedupeByTmdb([...movieCandidates, ...tvCandidates]).slice(0, 24);
  } catch {
    return [];
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
      append_to_response: "videos,credits",
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
