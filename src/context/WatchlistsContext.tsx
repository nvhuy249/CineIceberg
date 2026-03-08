import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from "react";

import { initialWatchlists } from "@/src/data/mockData";
import type { Watchlist } from "@/src/types/watchlist";

type WatchlistsContextValue = {
  watchlists: Watchlist[];
  createWatchlist: (name: string, description?: string) => Watchlist | null;
  addFilmToWatchlist: (watchlistId: string, filmId: string) => boolean;
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

    const baseSlug = slugify(normalizedName) || "watchlist";
    const uniqueSuffix = Date.now().toString(36);
    const newWatchlist: Watchlist = {
      id: `${baseSlug}-${uniqueSuffix}`,
      name: normalizedName,
      description: description.trim(),
      filmIds: [],
      createdAt: new Date().toISOString(),
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
        return {
          ...watchlist,
          filmIds: [...watchlist.filmIds, filmId],
        };
      }),
    );

    return added;
  };

  const value = {
    watchlists,
    createWatchlist,
    addFilmToWatchlist,
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
