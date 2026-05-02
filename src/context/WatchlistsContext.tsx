import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PostgrestError } from "@supabase/supabase-js";

import { useAuth } from "@/src/context/AuthContext";
import { getFilmById, getFilmByTmdbId } from "@/src/data/mockData";
import { supabase, SUPABASE_CONFIG_ERROR } from "@/src/lib/supabase";
import type { Database } from "@/src/types/db";
import type { Watchlist, WatchlistLayoutSize } from "@/src/types/watchlist";

export const DISCOVER_DEFAULT_TYPE = "discover";

type WatchlistsContextValue = {
  watchlists: Watchlist[];
  isLoading: boolean;
  loadError: string | null;
  refreshWatchlists: () => Promise<void>;
  createWatchlist: (name: string, description?: string) => Promise<Watchlist | null>;
  addFilmToWatchlist: (
    watchlistId: string,
    tmdbId: number,
    source?: WatchlistItemSource,
    mediaTypeOverride?: "movie" | "tv",
  ) => Promise<boolean>;
  removeFilmFromWatchlist: (
    watchlistId: string,
    tmdbId: number,
    mediaType?: "movie" | "tv",
  ) => Promise<boolean>;
  deleteWatchlist: (watchlistId: string) => Promise<boolean>;
  addFilmToDiscoverWatchlist: (tmdbId: number) => Promise<boolean>;
};

type WatchlistRow = Database["public"]["Tables"]["watchlists"]["Row"];
type WatchlistItemRow = Pick<
  Database["public"]["Tables"]["watchlist_items"]["Row"],
  "watchlist_id" | "tmdb_id" | "media_type" | "metadata"
>;
type WatchlistItemLookupRow = Pick<
  Database["public"]["Tables"]["watchlist_items"]["Row"],
  "id" | "tmdb_id" | "media_type" | "metadata"
>;

type WatchlistItemSource =
  | "discover"
  | "search"
  | "hidden_iceberg"
  | "recommendation"
  | "manual";

const WatchlistsContext = createContext<WatchlistsContextValue | undefined>(
  undefined,
);

const NOTE_ACCENTS = ["#6f8ead", "#9f6d72", "#8e7b62", "#6f9a87", "#8873a8"];
const NOTE_LABELS = ["ICE", "NOIR", "SOFT", "DEEP", "ALT"];
const NOTE_LAYOUTS: WatchlistLayoutSize[] = ["standard", "tall", "compact"];
const FALLBACK_ACCENT = "#5f748d";
const FALLBACK_EMOJI = "DISC";
const FALLBACK_LAYOUT: WatchlistLayoutSize = "standard";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const pickFromList = <T,>(values: T[], seed: number) => {
  const index = Math.abs(seed) % values.length;
  return values[index];
};

const resolveLayout = (value: string): WatchlistLayoutSize =>
  value === "compact" || value === "tall" || value === "standard"
    ? value
    : FALLBACK_LAYOUT;

const toWatchlistModel = (row: WatchlistRow, filmIds: number[]): Watchlist => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  filmIds,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  accent: row.accent || FALLBACK_ACCENT,
  emoji: row.emoji || FALLBACK_EMOJI,
  layoutSize: resolveLayout(row.layout_size),
  isDefault: row.is_default,
  defaultType: row.default_type,
});

const parseTmdbIdFromItem = (item: WatchlistItemRow): number | null => {
  if (item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)) {
    const metadata = item.metadata as { film_id?: unknown };
    if (typeof metadata.film_id === "string" && metadata.film_id.length > 0) {
      const mappedTmdbId = getFilmById(metadata.film_id)?.tmdbId;
      if (mappedTmdbId) return mappedTmdbId;
    }
  }

  if (Number.isInteger(item.tmdb_id) && item.tmdb_id > 0) {
    return item.tmdb_id;
  }

  return null;
};

const toUserMessage = (error: PostgrestError | null, fallback: string) =>
  error?.message ?? fallback;

const parseLegacyFilmId = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as { film_id?: unknown }).film_id;
  return typeof value === "string" && value.length > 0 ? value : null;
};

export function WatchlistsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hydrateWatchlists = useCallback(async (userId: string) => {
    if (!supabase) {
      throw new Error(SUPABASE_CONFIG_ERROR);
    }

    const { data: watchlistRows, error: watchlistsError } = await supabase
      .from("watchlists")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (watchlistsError) {
      throw new Error(toUserMessage(watchlistsError, "Failed to load watchlists."));
    }

    const rows = watchlistRows ?? [];
    if (rows.length === 0) return [];

    const watchlistIds = rows.map((row) => row.id);
    const { data: itemRows, error: itemsError } = await supabase
      .from("watchlist_items")
      .select("watchlist_id,tmdb_id,media_type,metadata")
      .eq("user_id", userId)
      .in("watchlist_id", watchlistIds)
      .order("added_at", { ascending: true });

    if (itemsError) {
      throw new Error(toUserMessage(itemsError, "Failed to load watchlist items."));
    }

    const filmIdsByWatchlist = new Map<string, number[]>();
    (itemRows ?? []).forEach((item) => {
      const tmdbId = parseTmdbIdFromItem(item);
      if (!tmdbId) return;

      const values = filmIdsByWatchlist.get(item.watchlist_id) ?? [];
      if (!values.includes(tmdbId)) values.push(tmdbId);
      filmIdsByWatchlist.set(item.watchlist_id, values);
    });

    return rows.map((row) =>
      toWatchlistModel(row, filmIdsByWatchlist.get(row.id) ?? []),
    );
  }, []);

  const refreshWatchlists = useCallback(async () => {
    if (!user) {
      setWatchlists([]);
      setLoadError(null);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);
      const nextWatchlists = await hydrateWatchlists(user.id);
      setWatchlists(nextWatchlists);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load watchlists.");
    } finally {
      setIsLoading(false);
    }
  }, [hydrateWatchlists, user]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user) {
        if (!active) return;
        setWatchlists([]);
        setLoadError(null);
        setIsLoading(false);
        return;
      }

      try {
        if (!active) return;
        setIsLoading(true);
        setLoadError(null);
        const nextWatchlists = await hydrateWatchlists(user.id);
        if (!active) return;
        setWatchlists(nextWatchlists);
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load watchlists.");
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [hydrateWatchlists, user]);

  const createWatchlist = useCallback(
    async (name: string, description = "") => {
      const userId = user?.id;
      if (!supabase || !userId) {
        setLoadError(SUPABASE_CONFIG_ERROR);
        return null;
      }

      const normalizedName = name.trim();
      if (!normalizedName) return null;

      const now = new Date();
      const seed = now.getMilliseconds() + normalizedName.length * 31;
      const baseSlug = slugify(normalizedName) || "watchlist";
      const uniqueSuffix = now.getTime().toString(36);

      const payload: Database["public"]["Tables"]["watchlists"]["Insert"] = {
        user_id: userId,
        slug: `${baseSlug}-${uniqueSuffix}`,
        name: normalizedName,
        description: description.trim(),
        accent: pickFromList(NOTE_ACCENTS, seed),
        emoji: pickFromList(NOTE_LABELS, seed + 5),
        layout_size: pickFromList(NOTE_LAYOUTS, seed + 9),
        is_default: false,
        default_type: null,
      };

      const { data, error } = await supabase
        .from("watchlists")
        .insert(payload)
        .select("*")
        .single();

      if (error || !data) {
        setLoadError(toUserMessage(error, "Failed to create watchlist."));
        return null;
      }

      const created = toWatchlistModel(data, []);
      setWatchlists((prev) => [created, ...prev]);
      return created;
    },
    [user],
  );

  const addFilmToWatchlist = useCallback(
    async (
      watchlistId: string,
      tmdbId: number,
      source: WatchlistItemSource = "manual",
      mediaTypeOverride?: "movie" | "tv",
    ) => {
      const userId = user?.id;
      if (!supabase || !userId) {
        setLoadError(SUPABASE_CONFIG_ERROR);
        return false;
      }

      const film = getFilmByTmdbId(tmdbId);
      const mediaType = mediaTypeOverride ?? film?.mediaType ?? "movie";
      const legacyFilmId = film?.id ?? null;

      const { data: existingRows, error: existingRowsError } = await supabase
        .from("watchlist_items")
        .select("id,tmdb_id,media_type,metadata")
        .eq("watchlist_id", watchlistId)
        .eq("user_id", userId);

      if (existingRowsError) {
        setLoadError(toUserMessage(existingRowsError, "Failed to validate watchlist item."));
        return false;
      }

      const existingItem = (existingRows ?? []).find((item: WatchlistItemLookupRow) => {
        if (item.tmdb_id === tmdbId && item.media_type === mediaType) return true;
        const metadataFilmId = parseLegacyFilmId(item.metadata);
        return Boolean(legacyFilmId && metadataFilmId === legacyFilmId);
      });
      if (existingItem) return false;

      const payload: Database["public"]["Tables"]["watchlist_items"]["Insert"] = {
        watchlist_id: watchlistId,
        user_id: userId,
        tmdb_id: tmdbId,
        media_type: mediaType,
        added_from: source,
        metadata: film ? { film_id: film.id } : {},
      };

      const { error } = await supabase.from("watchlist_items").insert(payload);
      if (error) {
        if (error.code === "23505") return false;
        setLoadError(toUserMessage(error, "Failed to add film to watchlist."));
        return false;
      }

      const now = new Date().toISOString();
      setWatchlists((prev) =>
        prev.map((watchlist) => {
          if (watchlist.id !== watchlistId) return watchlist;
          if (watchlist.filmIds.includes(tmdbId)) return watchlist;
          return {
            ...watchlist,
            filmIds: [...watchlist.filmIds, tmdbId],
            updatedAt: now,
          };
        }),
      );
      return true;
    },
    [user],
  );

  const removeFilmFromWatchlist = useCallback(
    async (watchlistId: string, tmdbId: number, mediaType?: "movie" | "tv") => {
      const userId = user?.id;
      if (!supabase || !userId) {
        setLoadError(SUPABASE_CONFIG_ERROR);
        return false;
      }

      const film = getFilmByTmdbId(tmdbId);
      const legacyFilmId = film?.id ?? null;

      const { data: existingRows, error: existingRowsError } = await supabase
        .from("watchlist_items")
        .select("id,tmdb_id,media_type,metadata")
        .eq("watchlist_id", watchlistId)
        .eq("user_id", userId);

      if (existingRowsError) {
        setLoadError(toUserMessage(existingRowsError, "Failed to load watchlist items."));
        return false;
      }

      const idsToDelete = (existingRows ?? [])
        .filter((item: WatchlistItemLookupRow) => {
          const tmdbMatch = item.tmdb_id === tmdbId && (!mediaType || item.media_type === mediaType);
          if (tmdbMatch) return true;

          const metadataFilmId = parseLegacyFilmId(item.metadata);
          return Boolean(legacyFilmId && metadataFilmId === legacyFilmId);
        })
        .map((item) => item.id);

      if (idsToDelete.length === 0) {
        return false;
      }

      const { error } = await supabase
        .from("watchlist_items")
        .delete()
        .in("id", idsToDelete)
        .eq("user_id", userId);
      if (error) {
        setLoadError(toUserMessage(error, "Failed to remove title from watchlist."));
        return false;
      }

      const now = new Date().toISOString();
      setWatchlists((prev) =>
        prev.map((watchlist) => {
          if (watchlist.id !== watchlistId) return watchlist;
          if (!watchlist.filmIds.includes(tmdbId)) return watchlist;
          return {
            ...watchlist,
            filmIds: watchlist.filmIds.filter((id) => id !== tmdbId),
            updatedAt: now,
          };
        }),
      );
      return true;
    },
    [user],
  );

  const deleteWatchlist = useCallback(
    async (watchlistId: string) => {
      const userId = user?.id;
      if (!supabase || !userId) {
        setLoadError(SUPABASE_CONFIG_ERROR);
        return false;
      }

      const target = watchlists.find((watchlist) => watchlist.id === watchlistId);
      if (target?.isDefault) {
        setLoadError("Default watchlists cannot be deleted.");
        return false;
      }

      const { error } = await supabase
        .from("watchlists")
        .delete()
        .eq("id", watchlistId)
        .eq("user_id", userId);

      if (error) {
        setLoadError(toUserMessage(error, "Failed to delete watchlist."));
        return false;
      }

      setWatchlists((prev) => prev.filter((watchlist) => watchlist.id !== watchlistId));
      return true;
    },
    [user, watchlists],
  );

  const ensureDiscoverWatchlist = useCallback(async () => {
    const userId = user?.id;
    if (!supabase || !userId) return null;

    const { data: existing, error: existingError } = await supabase
      .from("watchlists")
      .select("*")
      .eq("user_id", userId)
      .eq("default_type", DISCOVER_DEFAULT_TYPE)
      .maybeSingle();

    if (existingError) {
      setLoadError(toUserMessage(existingError, "Failed to load Discover watchlist."));
      return null;
    }
    if (existing) return existing;

    const { data: created, error: createError } = await supabase
      .from("watchlists")
      .insert({
        user_id: userId,
        slug: DISCOVER_DEFAULT_TYPE,
        name: "Discover",
        description: "Movies you liked.",
        accent: FALLBACK_ACCENT,
        emoji: FALLBACK_EMOJI,
        layout_size: FALLBACK_LAYOUT,
        is_default: true,
        default_type: DISCOVER_DEFAULT_TYPE,
      })
      .select("*")
      .single();

    if (createError || !created) {
      setLoadError(toUserMessage(createError, "Failed to create Discover watchlist."));
      return null;
    }

    const discoverWatchlist = toWatchlistModel(created, []);
    setWatchlists((prev) => {
      if (prev.some((watchlist) => watchlist.id === discoverWatchlist.id)) return prev;
      return [discoverWatchlist, ...prev];
    });

    return created;
  }, [user]);

  const addFilmToDiscoverWatchlist = useCallback(
    async (tmdbId: number) => {
      const discover = await ensureDiscoverWatchlist();
      if (!discover) return false;
      return addFilmToWatchlist(discover.id, tmdbId, "discover");
    },
    [addFilmToWatchlist, ensureDiscoverWatchlist],
  );

  const value = useMemo<WatchlistsContextValue>(
    () => ({
      watchlists,
      isLoading,
      loadError,
      refreshWatchlists,
      createWatchlist,
      addFilmToWatchlist,
      removeFilmFromWatchlist,
      deleteWatchlist,
      addFilmToDiscoverWatchlist,
    }),
    [
      addFilmToDiscoverWatchlist,
      addFilmToWatchlist,
      createWatchlist,
      deleteWatchlist,
      isLoading,
      loadError,
      removeFilmFromWatchlist,
      refreshWatchlists,
      watchlists,
    ],
  );

  return (
    <WatchlistsContext.Provider value={value}>
      {children}
    </WatchlistsContext.Provider>
  );
}

export function useWatchlists() {
  const context = useContext(WatchlistsContext);
  if (!context) {
    throw new Error("useWatchlists must be used inside WatchlistsProvider");
  }
  return context;
}
