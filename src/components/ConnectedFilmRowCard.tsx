import type { ReactNode } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import type { Film } from "@/src/types/film";

import CompactMatchBadge from "./CompactMatchBadge";

type ConnectedFilmRowCardProps = {
  film: Film;
  onOpenFilm?: () => void;
  rightContent: ReactNode;
  posterOnly?: boolean;
  compactPosterRow?: boolean;
};

export default function ConnectedFilmRowCard({
  film,
  onOpenFilm,
  rightContent,
  posterOnly = false,
  compactPosterRow = false,
}: ConnectedFilmRowCardProps) {
  return (
    <View style={[styles.card, compactPosterRow && styles.cardCompactPoster]}>
      <Pressable
        onPress={onOpenFilm}
        style={({ pressed }) => [
          styles.leftPane,
          posterOnly && styles.leftPanePosterOnly,
          pressed && styles.leftPanePressed,
        ]}
      >
        <View
          style={[
            styles.poster,
            posterOnly && styles.posterOnly,
            { backgroundColor: film.posterColor },
          ]}
        >
          {film.posterUrl ? (
            <Image
              source={{ uri: film.posterUrl }}
              style={styles.posterImage}
              contentFit={posterOnly ? "contain" : "cover"}
              transition={120}
            />
          ) : null}
        </View>
        {!posterOnly ? (
          <View style={styles.leftMeta}>
            <Text style={styles.title} numberOfLines={2}>
              {film.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {film.year} | {film.genres[0]}
            </Text>
            <CompactMatchBadge score={film.matchScore} />
          </View>
        ) : null}
      </Pressable>
      <View style={[styles.rightPane, compactPosterRow && styles.rightPaneCompactPoster]}>
        {rightContent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
    backgroundColor: COLORS.background.elevated,
  },
  cardCompactPoster: {
    height: 178,
  },
  leftPane: {
    width: 136,
    borderRightWidth: 1,
    borderRightColor: COLORS.border.default,
    backgroundColor: withOpacity(COLORS.background.primary, 0.42),
  },
  leftPanePressed: {
    opacity: 0.9,
  },
  leftPanePosterOnly: {
    width: 118,
    justifyContent: "center",
  },
  poster: {
    height: 140,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
    overflow: "hidden",
  },
  posterOnly: {
    height: 178,
    borderBottomWidth: 0,
  },
  posterImage: {
    ...StyleSheet.absoluteFillObject,
  },
  leftMeta: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
    minHeight: 94,
  },
  title: {
    color: COLORS.foreground.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  meta: {
    color: COLORS.foreground.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  rightPane: {
    flex: 1,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  rightPaneCompactPoster: {
    padding: SPACING.sm,
    gap: SPACING.xs,
    overflow: "hidden",
  },
});
