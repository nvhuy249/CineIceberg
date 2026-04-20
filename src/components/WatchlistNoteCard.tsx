import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import type { Film } from "@/src/types/film";
import type { Watchlist } from "@/src/types/watchlist";

type WatchlistNoteCardProps = {
  watchlist: Watchlist;
  previewFilms: Film[];
  aesthetics: string[];
  onOpen?: () => void;
};

export default function WatchlistNoteCard({
  watchlist,
  previewFilms,
  aesthetics,
  onOpen,
}: WatchlistNoteCardProps) {
  const posterSlots = [0, 1, 2, 3].map((index) => previewFilms[index]);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: withOpacity(watchlist.accent, 0.55),
          backgroundColor: withOpacity(watchlist.accent, 0.1),
        },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.posterGrid}>
        {posterSlots.map((film, index) => (
          <View
            key={film?.id ?? `slot-${index}`}
            style={[
              styles.posterCell,
              index % 2 === 0 ? styles.posterCellRightBorder : undefined,
              index < 2 ? styles.posterCellBottomBorder : undefined,
              {
                backgroundColor: film
                  ? film.posterColor
                  : withOpacity(COLORS.background.subtle, 0.92),
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.body}>
        <Text style={styles.count}>{watchlist.filmIds.length} movies/series</Text>

        <Text style={styles.title} numberOfLines={1}>
          {watchlist.name}
        </Text>

        <View style={styles.tagsRow}>
          {(aesthetics.length > 0 ? aesthetics : ["Curated"]).slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.9,
  },
  posterGrid: {
    height: 104,
    flexDirection: "row",
    flexWrap: "wrap",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  posterCell: {
    width: "50%",
    height: "50%",
  },
  posterCellRightBorder: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border.default,
  },
  posterCellBottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  body: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  count: {
    color: COLORS.foreground.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  title: {
    color: COLORS.foreground.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: TYPOGRAPHY.lineHeight.tight,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    minHeight: 24,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    backgroundColor: withOpacity(COLORS.background.primary, 0.45),
    justifyContent: "center",
  },
  tagText: {
    color: COLORS.foreground.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
