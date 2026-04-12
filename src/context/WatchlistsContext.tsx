import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from "react";

import { initialWatchlists } from "@/src/data/mockData";
import type { Watchlist } from "@/src/types/watchlist";

export const DISCOVER_WATCHLIST_ID = "discover-watchlist";

type WatchlistsContextValue = {
  watchlists: Watchlist[];
  createWatchlist: (name: string, description?: string) => Watchlist | null;
  addFilmToWatchlist: (watchlistId: string, filmId: string) => boolean;
  addFilmToDiscoverWatchlist: (filmId: string) => boolean;
};

const WatchlistsContext = createContext<WatchlistsContextValue | undefined>(
  undefined,
);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const NOTE_ACCENTS = ["#6f8ead", "#9f6d72", "#8e7b62", "#6f9a87", "#8873a8"];
const NOTE_LABELS = ["ICE", "NOIR", "SOFT", "DEEP", "ALT"];
const NOTE_LAYOUTS: Watchlist["layoutSize"][] = ["standard", "tall", "compact"];

const pickFromList = <T,>(values: T[], seed: number) => {
  const index = Math.abs(seed) % values.length;
  return values[index];
};

const createDiscoverWatchlist = (isoDate: string): Watchlist => ({
  id: DISCOVER_WATCHLIST_ID,
  name: "Discover",
  description: "Liked from swipe mode.",
  filmIds: [],
  createdAt: isoDate,
  updatedAt: isoDate,
  accent: "#5f748d",
  emoji: "DISC",
  layoutSize: "standard",
});

export function WatchlistsProvider({ children }: PropsWithChildren) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>(() =>
    initialWatchlists.map((watchlist) => ({
      ...watchlist,
      filmIds: [...watchlist.filmIds],
    })),
  );

  const createWatchlist = (name: string, description = "") => {
    const normalizedName = name.trim();
    if (!normalizedName) return null;

    const now = new Date();
    const seed = now.getMilliseconds() + normalizedName.length * 31;
    const baseSlug = slugify(normalizedName) || "watchlist";
    const uniqueSuffix = now.getTime().toString(36);
    const newWatchlist: Watchlist = {
      id: `${baseSlug}-${uniqueSuffix}`,
      name: normalizedName,
      description: description.trim(),
      filmIds: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      accent: pickFromList(NOTE_ACCENTS, seed),
      emoji: pickFromList(NOTE_LABELS, seed + 5),
      layoutSize: pickFromList(NOTE_LAYOUTS, seed + 9),
    };

    setWatchlists((prev) => [newWatchlist, ...prev]);
    return newWatchlist;
  };

  const addFilmToWatchlist = (watchlistId: string, filmId: string) => {
    let added = false;

    setWatchlists((prev) =>
      prev.map((watchlist) => {
        if (watchlist.id !== watchlistId) return watchlist;
        if (watchlist.filmIds.includes(filmId)) return watchlist;

        added = true;
        const now = new Date().toISOString();
        return {
          ...watchlist,
          filmIds: [...watchlist.filmIds, filmId],
          updatedAt: now,
        };
      }),
    );

    return added;
  };

  const addFilmToDiscoverWatchlist = (filmId: string) => {
    let added = false;

    setWatchlists((prev) => {
      const now = new Date().toISOString();
      const discoverWatchlist = prev.find(
        (watchlist) => watchlist.id === DISCOVER_WATCHLIST_ID,
      );

      if (!discoverWatchlist) {
        added = true;
        const created = createDiscoverWatchlist(now);
        created.filmIds = [filmId];
        return [created, ...prev];
      }

      return prev.map((watchlist) => {
        if (watchlist.id !== DISCOVER_WATCHLIST_ID) return watchlist;
        if (watchlist.filmIds.includes(filmId)) return watchlist;

        added = true;
        return {
          ...watchlist,
          filmIds: [...watchlist.filmIds, filmId],
          updatedAt: now,
        };
      });
    });

    return added;
  };

  const value = {
    watchlists,
    createWatchlist,
    addFilmToWatchlist,
    addFilmToDiscoverWatchlist,
  };

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
