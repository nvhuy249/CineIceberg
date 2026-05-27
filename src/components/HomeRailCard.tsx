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

export type HomeRailCardVariant = "portrait" | "rankedLandscape" | "recommended";

type HomeRailCardProps = {
  film: Film;
  onPress?: () => void;
  variant?: HomeRailCardVariant;
  rank?: number;
};

export default function HomeRailCard({
  film,
  onPress,
  variant = "portrait",
  rank,
}: HomeRailCardProps) {
  const isRanked = variant === "rankedLandscape";
  const isRecommended = variant === "recommended";
  const imageUrl = isRanked ? film.backdropUrl || film.posterUrl : film.posterUrl;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isRanked && styles.cardRanked,
        isRecommended && styles.cardRecommended,
        pressed && styles.pressed,
      ]}
    >
      {isRanked ? (
        <View style={styles.rankColumn}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      ) : null}

      <View style={[styles.poster, isRanked && styles.posterRanked, { backgroundColor: film.posterColor }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.posterImage}
            contentFit="cover"
            transition={120}
          />
        ) : null}
      </View>

      <View style={[styles.body, isRanked && styles.bodyRanked]}>
        <Text style={styles.title} numberOfLines={2}>
          {film.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {film.year} | {film.genres[0]}
        </Text>
        <View style={styles.footerRow}>
          <CompactMatchBadge
            score={film.matchScore}
            compactLabel={isRecommended}
            variant={isRecommended ? "recommended" : "default"}
          />
          {isRecommended ? (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedLabel}>For you</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 138,
    height: 312,
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.92,
  },
  cardRanked: {
    width: 254,
    height: 142,
    flexDirection: "row",
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.28),
  },
  cardRecommended: {
    borderColor: withOpacity(COLORS.accent.iceBlue, 0.34),
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.08),
  },
  rankColumn: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withOpacity(COLORS.theater.marqueeGold, 0.14),
    borderRightWidth: 1,
    borderRightColor: withOpacity(COLORS.theater.marqueeGold, 0.26),
  },
  rankText: {
    color: COLORS.theater.marqueeGold,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  recommendedLabel: {
    color: COLORS.theater.marqueeGold,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  recommendedBadge: {
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.42),
    backgroundColor: withOpacity(COLORS.theater.marqueeGold, 0.14),
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  poster: {
    height: 188,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
    overflow: "hidden",
  },
  posterRanked: {
    width: 88,
    height: "100%",
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border.default,
  },
  posterImage: {
    ...StyleSheet.absoluteFillObject,
  },
  body: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    height: 124,
  },
  bodyRanked: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
  },
  footerRow: {
    height: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.foreground.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
    height: 42,
  },
  meta: {
    color: COLORS.foreground.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
    height: 18,
  },
});
