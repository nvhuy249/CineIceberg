import { useRouter, type Href } from "expo-router";
import { Text, View } from "react-native";

import AppScreen from "@/src/components/AppScreen";
import FilmCard from "@/src/components/FilmCard";
import TasteTag from "@/src/components/TasteTag";
import { tasteTags, watchlistFilms } from "@/src/data/mockData";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <AppScreen title="Profile" subtitle="Taste profile and watchlist preview">
      <View style={screenStyles.section}>
        <SectionTitle title="Taste Tags" subtitle="Inferred from your favorites and likes" />
        <View style={screenStyles.card}>
          <View style={screenStyles.wrapRow}>
            {tasteTags.map((tag, index) => (
              <TasteTag
                key={tag}
                label={tag}
                variant={index === 0 ? "accent" : "default"}
              />
            ))}
          </View>
          <Text style={screenStyles.mutedText}>
            These tags drive home ranking, search boosts, and discover ordering.
          </Text>
        </View>
      </View>

      <View style={screenStyles.section}>
        <SectionTitle title="Watchlist Preview" subtitle="Saved from search, detail, and discover" />
        {watchlistFilms.slice(0, 2).map((film) => (
          <FilmCard key={film.id} film={film} compact />
        ))}
        <CTAButton label="Open Watchlist" onPress={() => router.push("/watchlist" as Href)} />
      </View>
    </AppScreen>
  );
}
