import { StyleSheet, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  withOpacity,
} from "@/src/constants/designTokens";

function SkeletonBlock({
  height,
  width = "100%",
}: {
  height: number;
  width?: number | `${number}%`;
}) {
  return <View style={[styles.block, { height, width }]} />;
}

export function HeroSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock height={180} />
      <SkeletonBlock height={16} width="70%" />
      <SkeletonBlock height={12} width="90%" />
      <SkeletonBlock height={12} width="65%" />
    </View>
  );
}

export function SearchSkeleton() {
  return (
    <View style={styles.stack}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.card}>
          <SkeletonBlock height={90} />
          <SkeletonBlock height={14} width="60%" />
          <SkeletonBlock height={12} width="40%" />
        </View>
      ))}
    </View>
  );
}

export function MovieDetailSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <SkeletonBlock height={220} />
        <SkeletonBlock height={18} width="70%" />
        <SkeletonBlock height={14} width="50%" />
      </View>
      <View style={styles.card}>
        <SkeletonBlock height={12} width="100%" />
        <SkeletonBlock height={12} width="95%" />
        <SkeletonBlock height={12} width="80%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.background.elevated,
    borderColor: COLORS.border.default,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  block: {
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: withOpacity(COLORS.foreground.primary, 0.08),
  },
});
