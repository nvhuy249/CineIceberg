import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/app/constants/designTokens";
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        variantStyles[variant],
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.poster, { backgroundColor: film.posterColor }]} />
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
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
  poster: {
    width: "100%",
    height: 160,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  body: {
    padding: SPACING.padding.card,
    gap: SPACING.sm,
    flex: 1,
  },
  header: {
    gap: SPACING.sm,
  },
  titleWrap: {
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  meta: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  synopsis: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
});
