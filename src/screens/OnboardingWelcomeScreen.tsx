import { useRouter, type Href } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY, withOpacity } from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";

import { CTAButton, screenStyles } from "./shared";

export default function OnboardingWelcomeScreen() {
  const router = useRouter();

  return (
    <AppScreen
      title="CineIceberg"
      subtitle="A taste-first movie discovery experience."
      scroll={false}
    >
      <View style={styles.fill}>
        <View style={[screenStyles.card, styles.hero]}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.tagline}>
            Discover films that match your taste, not just what is trending.
          </Text>
          <Text style={screenStyles.mutedText}>
            Start by selecting at least 3 favorite films to shape your feed.
          </Text>
        </View>

        <CTAButton
          label="Begin Journey"
          onPress={() => router.push("/(onboarding)/films" as Href)}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: "space-between",
    gap: SPACING.lg,
    paddingBottom: SPACING["2xl"],
  },
  hero: {
    gap: SPACING.md,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: withOpacity(COLORS.accent.iceBlue, 0.16),
    borderWidth: 1,
    borderColor: COLORS.border.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.sm,
  },
  tagline: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
  },
});
