import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  BUTTON_VARIANTS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "@/src/constants/designTokens";

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function CTAButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: keyof typeof BUTTON_VARIANTS;
}) {
  const theme = BUTTON_VARIANTS[variant];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export const screenStyles = StyleSheet.create({
  section: {
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
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  mutedText: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  bodyText: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
});

const styles = StyleSheet.create({
  sectionHeader: {
    gap: SPACING.xs,
  },
  sectionTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  sectionSubtitle: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  button: {
    minHeight: 42,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
