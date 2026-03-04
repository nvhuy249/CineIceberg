import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "@/app/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import FilmCard from "@/src/components/FilmCard";
import { HeroSkeleton } from "@/src/components/LoadingSkeletons";
import MatchScore from "@/src/components/MatchScore";
import TasteTag from "@/src/components/TasteTag";
import { featuredFilm, hiddenGems, tasteTags, trending } from "@/src/data/mockData";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const openFilm = (film: Film) =>
    router.push(
      ({ pathname: "/movie/[id]", params: { id: film.id } } as unknown) as Href,
    );

  return (
    <AppScreen title="Home" subtitle="Featured picks and taste-matched recommendations">
      {loading ? (
        <HeroSkeleton />
      ) : (
        <Pressable style={styles.featuredCard} onPress={() => openFilm(featuredFilm)}>
          <View style={[styles.featuredPoster, { backgroundColor: featuredFilm.posterColor }]} />
          <View style={styles.featuredBody}>
            <View style={screenStyles.wrapRow}>
              <TasteTag label="Featured" variant="accent" />
              <MatchScore score={featuredFilm.matchScore} />
            </View>
            <Text style={styles.featuredTitle}>{featuredFilm.title}</Text>
            <Text style={screenStyles.mutedText} numberOfLines={2}>
              {featuredFilm.synopsis}
            </Text>
          </View>
        </Pressable>
      )}

      <View style={screenStyles.section}>
        <SectionTitle title="Hidden Gems" subtitle="Curated deep cuts for your taste" />
        {hiddenGems.map((film) => (
          <FilmCard key={film.id} film={film} onPress={() => openFilm(film)} />
        ))}
      </View>

      <View style={screenStyles.section}>
        <SectionTitle title="Trending" subtitle="Popular right now, filtered to your profile" />
        {trending.map((film) => (
          <FilmCard key={film.id} film={film} onPress={() => openFilm(film)} />
        ))}
      </View>

      <View style={screenStyles.section}>
        <SectionTitle title="Taste Profile" subtitle="Signals driving your recommendations" />
        <View style={screenStyles.card}>
          <View style={screenStyles.wrapRow}>
            {tasteTags.map((tag) => (
              <TasteTag key={tag} label={tag} />
            ))}
          </View>
          <CTAButton
            label="Swipe to Discover"
            onPress={() => router.push("/(tabs)/discover" as Href)}
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    backgroundColor: COLORS.background.elevated,
    borderColor: COLORS.border.default,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
  },
  featuredPoster: {
    height: 180,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  featuredBody: {
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  featuredTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
