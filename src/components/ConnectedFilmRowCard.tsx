import type { ReactNode } from "react";
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

type ConnectedFilmRowCardProps = {
  film: Film;
  onOpenFilm?: () => void;
  rightContent: ReactNode;
};

export default function ConnectedFilmRowCard({
  film,
  onOpenFilm,
  rightContent,
}: ConnectedFilmRowCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpenFilm}
        style={({ pressed }) => [styles.leftPane, pressed && styles.leftPanePressed]}
      >
        <View style={[styles.poster, { backgroundColor: film.posterColor }]}>
          <View style={styles.matchWrap}>
            <MatchScore score={film.matchScore} />
          </View>
        </View>
        <View style={styles.leftMeta}>
          <Text style={styles.title} numberOfLines={2}>
            {film.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {film.year} | {film.genres[0]}
          </Text>
        </View>
      </Pressable>
      <View style={styles.rightPane}>{rightContent}</View>
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
  leftPane: {
    width: 136,
    borderRightWidth: 1,
    borderRightColor: COLORS.border.default,
    backgroundColor: withOpacity(COLORS.background.primary, 0.42),
  },
  leftPanePressed: {
    opacity: 0.9,
  },
  poster: {
    height: 140,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
    padding: SPACING.sm,
    alignItems: "flex-end",
  },
  matchWrap: {
    alignSelf: "flex-end",
  },
  leftMeta: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
    minHeight: 70,
  },
  title: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  meta: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  rightPane: {
    flex: 1,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
});
