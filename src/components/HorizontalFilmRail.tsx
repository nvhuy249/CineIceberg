import { ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS, SPACING, TYPOGRAPHY } from "@/src/constants/designTokens";
import type { Film } from "@/src/types/film";

import HomeRailCard, { type HomeRailCardVariant } from "./HomeRailCard";

type HorizontalFilmRailProps = {
  title: string;
  subtitle?: string;
  films: Film[];
  onFilmPress?: (film: Film) => void;
  cardVariant?: HomeRailCardVariant;
};

export default function HorizontalFilmRail({
  title,
  subtitle,
  films,
  onFilmPress,
  cardVariant = "portrait",
}: HorizontalFilmRailProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {films.map((film, index) => (
          <HomeRailCard
            key={film.id}
            film={film}
            variant={cardVariant}
            rank={index + 1}
            onPress={() => onFilmPress?.(film)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  header: {
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  subtitle: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  railContent: {
    gap: SPACING.sm,
    paddingRight: SPACING.padding.page,
  },
});
