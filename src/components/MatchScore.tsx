import { StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  SPACING,
  TYPOGRAPHY,
  getMatchScoreColors,
} from "@/src/constants/designTokens";

type MatchScoreProps = {
  score: number;
};

export default function MatchScore({ score }: MatchScoreProps) {
  const colors = getMatchScoreColors(score);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>{score}% match</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
