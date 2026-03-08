import { useRouter, type Href } from "expo-router";
import { Text, View } from "react-native";

import AppScreen from "@/src/components/AppScreen";
import TasteTag from "@/src/components/TasteTag";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { tasteTags } from "@/src/data/mockData";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

export default function ProfileScreen() {
  const router = useRouter();
  const { watchlists } = useWatchlists();

  const totalSavedTitles = watchlists.reduce(
    (total, watchlist) => total + watchlist.filmIds.length,
    0,
  );
  const largestWatchlist =
    watchlists.reduce(
      (largest, watchlist) =>
        watchlist.filmIds.length > largest.filmIds.length ? watchlist : largest,
      watchlists[0],
    ) ?? null;

  return (
    <AppScreen title="Profile" subtitle="Account and recommendation preferences">
      <View style={screenStyles.section}>
        <SectionTitle title="Account" subtitle="Personal profile" />
        <View style={screenStyles.card}>
          <Text style={screenStyles.bodyText}>Name: Cine Iceberg User</Text>
          <Text style={screenStyles.bodyText}>Plan: Free Preview</Text>
          <Text style={screenStyles.mutedText}>
            Recommendation tuning is based on your watchlists, likes, and skips.
          </Text>
        </View>
      </View>

      <View style={screenStyles.section}>
        <SectionTitle title="Watchlist Activity" subtitle="Cross-watchlist progress" />
        <View style={screenStyles.card}>
          <Text style={screenStyles.bodyText}>{watchlists.length} watchlists</Text>
          <Text style={screenStyles.bodyText}>{totalSavedTitles} total saved titles</Text>
          {largestWatchlist ? (
            <Text style={screenStyles.mutedText}>
              Largest list: {largestWatchlist.name} ({largestWatchlist.filmIds.length})
            </Text>
          ) : null}
          <CTAButton
            label="Open Watchlists"
            onPress={() => router.push("/(tabs)/watchlists" as Href)}
          />
        </View>
      </View>

      <View style={screenStyles.section}>
        <SectionTitle title="Taste Tags" subtitle="Used for ranking and discovery" />
        <View style={screenStyles.card}>
          <View style={screenStyles.wrapRow}>
            {tasteTags.slice(0, 3).map((tag, index) => (
              <TasteTag key={tag} label={tag} variant={index === 0 ? "accent" : "default"} />
            ))}
          </View>
          <Text style={screenStyles.mutedText}>
            Adjusted automatically as you create and curate watchlists.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
