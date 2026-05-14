import { supabase } from "@/src/lib/supabase";
import type { Database } from "@/src/types/db";

export type InteractionAction = "like" | "pass" | "add" | "remove" | "open";

export type InteractionSource =
  | "discover"
  | "search"
  | "hidden_iceberg"
  | "watchlist_recommendation"
  | "movie_detail"
  | "home"
  | "watchlist_detail"
  | "manual";

type LogInteractionParams = {
  userId: string | null | undefined;
  tmdbId: number;
  mediaType: "movie" | "tv";
  action: InteractionAction;
  source: InteractionSource;
  sourceWatchlistId?: string | null;
  metadata?: Database["public"]["Tables"]["interaction_events"]["Insert"]["metadata"];
};

export const logInteractionEvent = async ({
  userId,
  tmdbId,
  mediaType,
  action,
  source,
  sourceWatchlistId = null,
  metadata = {},
}: LogInteractionParams) => {
  if (!supabase || !userId || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return false;
  }

  const payload: Database["public"]["Tables"]["interaction_events"]["Insert"] = {
    user_id: userId,
    tmdb_id: tmdbId,
    media_type: mediaType,
    action,
    source,
    source_watchlist_id: sourceWatchlistId,
    metadata,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("interaction_events").insert(payload);

  if (error) {
    if (__DEV__) {
      console.warn("[interaction_events] insert failed", {
        action,
        source,
        tmdbId,
        error: error.message,
      });
    }
    return false;
  }

  return true;
};
