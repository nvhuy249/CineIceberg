import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "@/app/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import FilmCard from "@/src/components/FilmCard";
import { onboardingPicks } from "@/src/data/mockData";

import { CTAButton, SectionTitle } from "./shared";

export default function OnboardingFilmsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return onboardingPicks;

    return onboardingPicks.filter((film) =>
      `${film.title} ${film.director} ${film.genres.join(" ")}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  return (
    <AppScreen
      title="Select Favorites"
      subtitle="Pick at least 3 films to personalize your recommendations."
    >
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search films, directors, genres..."
          placeholderTextColor={COLORS.foreground.tertiary}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.counterRow}>
        <SectionTitle
          title={`${selectedIds.length} selected`}
          subtitle="Need 3+ to continue"
        />
        <CTAButton
          label={selectedIds.length >= 3 ? "Continue" : "Select 3+"}
          disabled={selectedIds.length < 3}
          onPress={() => router.replace("/(tabs)" as Href)}
        />
      </View>

      <View style={styles.grid}>
        {filtered.map((film) => (
          <View key={film.id} style={styles.gridItem}>
            <FilmCard
              film={film}
              variant="grid"
              compact
              selected={selectedIds.includes(film.id)}
              onPress={() => toggleSelection(film.id)}
            />
          </View>
        ))}
      </View>

      {filtered.length === 0 ? (
        <Pressable style={styles.emptyHint} onPress={() => setQuery("")}>
          <Text style={styles.emptyHintText}>No matches. Clear search.</Text>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchInput: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    minHeight: 22,
  },
  counterRow: {
    gap: SPACING.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  gridItem: {
    width: "48%",
  },
  emptyHint: {
    alignSelf: "flex-start",
    paddingVertical: SPACING.sm,
  },
  emptyHintText: {
    color: COLORS.accent.iceBlue,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
