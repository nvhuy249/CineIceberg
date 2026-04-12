export type WatchlistLayoutSize = "compact" | "standard" | "tall";

export type Watchlist = {
  id: string;
  name: string;
  description: string;
  filmIds: string[];
  createdAt: string;
  updatedAt: string;
  accent: string;
  emoji: string;
  layoutSize: WatchlistLayoutSize;
};
