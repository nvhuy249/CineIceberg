import { StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";

type CompactMatchBadgeProps = {
  score: number;
  compactLabel?: boolean;
  variant?: "default" | "recommended";
};

export default function CompactMatchBadge({
  score,
  compactLabel = false,
  variant = "default",
}: CompactMatchBadgeProps) {
  const recommended = variant === "recommended";

  return (
    <View style={[styles.badge, recommended && styles.badgeRecommended]}>
      <Text style={[styles.text, recommended && styles.textRecommended]}>
        {compactLabel ? `${score}%` : `${score}% match`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.accent.crystal, 0.24),
    backgroundColor: withOpacity(COLORS.background.primary, 0.7),
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  badgeRecommended: {
    borderColor: withOpacity(COLORS.accent.iceBlue, 0.42),
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.16),
  },
  text: {
    color: COLORS.foreground.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  textRecommended: {
    color: COLORS.accent.crystal,
  },
});
