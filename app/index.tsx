import { StyleSheet, Text, View } from "react-native";
import {
  BORDER_RADIUS,
  BUTTON_VARIANTS,
  COLORS,
  SPACING,
  TASTE_TAG_VARIANTS,
  TYPOGRAPHY,
  getMatchScoreColors,
} from "./constants/designTokens";

export default function Index() {
  const scoreColors = getMatchScoreColors(92);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>CineIceberg</Text>
        <Text style={styles.subtitle}>Minimal dark token preview</Text>

        <View style={styles.tagRow}>
          <View style={styles.defaultTag}>
            <Text style={styles.defaultTagText}>Default Tag</Text>
          </View>
          <View style={styles.accentTag}>
            <Text style={styles.accentTagText}>Accent Tag</Text>
          </View>
        </View>

        <View
          style={[
            styles.scoreBadge,
            { backgroundColor: scoreColors.bg, borderColor: scoreColors.border },
          ]}
        >
          <Text style={[styles.scoreText, { color: scoreColors.text }]}>
            Match Score 92%
          </Text>
        </View>

        <View style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background.primary,
    padding: SPACING.padding.page,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.padding.card,
    gap: SPACING.md,
  },
  title: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  subtitle: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  tagRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  defaultTag: {
    backgroundColor: TASTE_TAG_VARIANTS.default.bg,
    borderColor: TASTE_TAG_VARIANTS.default.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.pill,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  defaultTagText: {
    color: TASTE_TAG_VARIANTS.default.text,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  accentTag: {
    backgroundColor: TASTE_TAG_VARIANTS.accent.bg,
    borderColor: TASTE_TAG_VARIANTS.accent.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.pill,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  accentTagText: {
    color: TASTE_TAG_VARIANTS.accent.text,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  scoreBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.pill,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  scoreText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  primaryButton: {
    marginTop: SPACING.sm,
    minHeight: 42,
    backgroundColor: BUTTON_VARIANTS.primary.bg,
    borderRadius: BORDER_RADIUS.button,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  primaryButtonText: {
    color: BUTTON_VARIANTS.primary.text,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
