import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  COMPONENT_SIZES,
  SPACING,
  TYPOGRAPHY,
} from "@/src/constants/designTokens";
import type { Film } from "@/src/types/film";

import MatchScore from "./MatchScore";

type HomeRailCardProps = {
  film: Film;
  onPress?: () => void;
};

export default function HomeRailCard({ film, onPress }: HomeRailCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.poster, { backgroundColor: film.posterColor }]}>
        <View style={styles.matchWrap}>
          <MatchScore score={film.matchScore} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {film.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {film.year} | {film.genres[0]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: COMPONENT_SIZES.card.compact + 18,
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.92,
  },
  poster: {
    height: 188,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: SPACING.sm,
  },
  matchWrap: {
    alignSelf: "flex-end",
  },
  body: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    minHeight: 72,
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
});
