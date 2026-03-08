import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "@/app/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import EmptyState from "@/src/components/EmptyState";
import { getFilmsByIds } from "@/src/data/mockData";
import { useWatchlists } from "@/src/context/WatchlistsContext";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

export default function WatchlistsScreen() {
  const router = useRouter();
  const { watchlists, createWatchlist } = useWatchlists();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleCreateWatchlist = () => {
    const created = createWatchlist(name, description);
    if (!created) {
      setError("Name is required.");
      return;
    }

    setError("");
    setName("");
    setDescription("");
    router.push(
      ({
        pathname: "/watchlists/[id]",
        params: { id: created.id },
      } as unknown) as Href,
    );
  };

  const openWatchlist = (id: string) =>
    router.push(
      ({
        pathname: "/watchlists/[id]",
        params: { id },
      } as unknown) as Href,
    );

  return (
    <AppScreen
      title="Watchlists"
      subtitle="Create multiple watchlists and manage recommendations by theme"
    >
      <View style={screenStyles.section}>
        <SectionTitle
          title="Create Watchlist"
          subtitle="Build focused lists like 'Rainy Day Series' or 'Twisty Thrillers'"
        />
        <View style={screenStyles.card}>
          <TextInput
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (error) setError("");
            }}
            placeholder="Watchlist name"
            placeholderTextColor={COLORS.foreground.tertiary}
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={COLORS.foreground.tertiary}
            style={styles.input}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <CTAButton label="Create Watchlist" onPress={handleCreateWatchlist} />
        </View>
      </View>

      <View style={screenStyles.section}>
        <SectionTitle
          title="Your Watchlists"
          subtitle={`${watchlists.length} total watchlists`}
        />
        {watchlists.length === 0 ? (
          <EmptyState
            title="No watchlists yet"
            message="Create your first watchlist to start collecting recommendations by mood."
          />
        ) : (
          watchlists.map((watchlist) => {
            const previewTitles = getFilmsByIds(watchlist.filmIds)
              .slice(0, 3)
              .map((film) => film.title);

            return (
              <Pressable
                key={watchlist.id}
                onPress={() => openWatchlist(watchlist.id)}
                style={({ pressed }) => [
                  styles.watchlistCard,
                  pressed && styles.watchlistCardPressed,
                ]}
              >
                <View style={styles.watchlistHeader}>
                  <Text style={styles.watchlistName}>{watchlist.name}</Text>
                  <Text style={styles.watchlistCount}>{watchlist.filmIds.length} saved</Text>
                </View>
                {watchlist.description ? (
                  <Text style={screenStyles.mutedText}>{watchlist.description}</Text>
                ) : null}
                <Text style={styles.previewText} numberOfLines={1}>
                  {previewTitles.length > 0
                    ? `Includes: ${previewTitles.join(" | ")}`
                    : "No titles yet. Open this watchlist to start adding."}
                </Text>
                <Text style={styles.openText}>Open watchlist</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: COLORS.background.subtle,
    paddingHorizontal: SPACING.md,
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  errorText: {
    color: COLORS.status.danger,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  watchlistCard: {
    backgroundColor: COLORS.background.elevated,
    borderColor: COLORS.border.default,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  watchlistCardPressed: {
    opacity: 0.92,
  },
  watchlistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  watchlistName: {
    flex: 1,
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  watchlistCount: {
    color: COLORS.accent.iceBlue,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  previewText: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  openText: {
    color: COLORS.accent.iceBlue,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
