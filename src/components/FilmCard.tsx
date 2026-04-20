import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import type { Film } from "@/src/types/film";

import MatchScore from "./MatchScore";
import TasteTag from "./TasteTag";

type FilmCardVariant = "grid" | "portrait" | "landscape" | "swipe";

type FilmCardProps = {
  film: Film;
  variant?: FilmCardVariant;
  onPress?: () => void;
  selected?: boolean;
  compact?: boolean;
};

export default function FilmCard({
  film,
  variant = "portrait",
  onPress,
  selected = false,
  compact = false,
}: FilmCardProps) {
  const swipeVariant = variant === "swipe";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        variantStyles[variant],
        swipeVariant && styles.cardSwipe,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View
        style={[
          styles.poster,
          swipeVariant && styles.posterSwipe,
          { backgroundColor: film.posterColor },
        ]}
      />
      <View style={[styles.body, swipeVariant && styles.bodySwipe]}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, swipeVariant && styles.titleSwipe]} numberOfLines={compact ? 1 : 2}>
              {film.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {film.year} | {film.director}
            </Text>
          </View>
          <MatchScore score={film.matchScore} />
        </View>

        {!compact ? (
          <>
            <View style={styles.tagsRow}>
              {film.genres.slice(0, 2).map((genre) => (
                <TasteTag key={genre} label={genre} />
              ))}
            </View>
            <Text
              style={styles.synopsis}
              numberOfLines={variant === "landscape" ? 2 : 3}
            >
              {film.synopsis}
            </Text>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const variantStyles = StyleSheet.create({
  grid: {
    width: "100%",
  },
  portrait: {
    width: "100%",
  },
  landscape: {
    width: "100%",
    flexDirection: "row",
  },
  swipe: {
    width: "100%",
  },
});

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
  },
  cardSelected: {
    borderColor: COLORS.border.accent,
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.08),
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardSwipe: {
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.3),
    backgroundColor: withOpacity(COLORS.theater.stage, 0.5),
  },
  poster: {
    width: "100%",
    height: 160,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  posterSwipe: {
    height: 220,
  },
  body: {
    padding: SPACING.padding.card,
    gap: SPACING.sm,
    flex: 1,
  },
  bodySwipe: {
    gap: SPACING.md,
  },
  header: {
    gap: SPACING.sm,
  },
  titleWrap: {
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.foreground.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  titleSwipe: {
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  meta: {
    color: COLORS.foreground.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  synopsis: {
    color: COLORS.foreground.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
});
