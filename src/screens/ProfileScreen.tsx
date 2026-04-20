import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import AppScreen from "@/src/components/AppScreen";
import TasteTag from "@/src/components/TasteTag";
import { useAuth } from "@/src/context/AuthContext";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { tasteTags } from "@/src/data/mockData";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { watchlists } = useWatchlists();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

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
          <Text style={screenStyles.bodyText}>
            Name: {user?.user_metadata?.display_name ?? "Cine Iceberg User"}
          </Text>
          <Text style={screenStyles.bodyText}>Email: {user?.email ?? "Not available"}</Text>
          <Text style={screenStyles.bodyText}>Plan: Free Preview</Text>
          <Text style={screenStyles.mutedText}>
            Recommendation tuning is based on your watchlists, likes, and skips.
          </Text>
          {signOutError ? <Text style={screenStyles.mutedText}>{signOutError}</Text> : null}
          <CTAButton
            label={signingOut ? "Signing Out..." : "Sign Out"}
            disabled={signingOut}
            variant="ghost"
            onPress={() => {
              void (async () => {
                setSigningOut(true);
                setSignOutError(null);
                const { error } = await signOut();
                if (error) setSignOutError(error);
                setSigningOut(false);
              })();
            }}
          />
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

      <View style={screenStyles.section}>
        <SectionTitle title="Hidden Iceberg" subtitle="Direct access to hidden recommendations" />
        <View style={screenStyles.card}>
          <Text style={screenStyles.mutedText}>
            If the scroll gesture is inconsistent on your device, open Hidden Iceberg directly.
          </Text>
          <CTAButton label="Open Hidden Iceberg" onPress={() => router.push("/iceberg" as Href)} />
        </View>
      </View>
    </AppScreen>
  );
}
