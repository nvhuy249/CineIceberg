import { StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  SPACING,
  TASTE_TAG_VARIANTS,
  TYPOGRAPHY,
} from "@/app/constants/designTokens";

type TasteTagProps = {
  label: string;
  variant?: "default" | "accent";
};

export default function TasteTag({
  label,
  variant = "default",
}: TasteTagProps) {
  const colors = TASTE_TAG_VARIANTS[variant];

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
