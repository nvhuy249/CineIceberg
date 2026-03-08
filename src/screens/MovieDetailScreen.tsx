import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "@/app/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import EmptyState from "@/src/components/EmptyState";
import { MovieDetailSkeleton } from "@/src/components/LoadingSkeletons";
import MatchScore from "@/src/components/MatchScore";
import TasteTag from "@/src/components/TasteTag";
import { getFilmById } from "@/src/data/mockData";

import { CTAButton, screenStyles } from "./shared";

type DetailTab = "overview" | "analysis" | "videos";

const tabs: DetailTab[] = ["overview", "analysis", "videos"];

export default function MovieDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, [id]);

  const film = useMemo(() => (id ? getFilmById(id) : undefined), [id]);

  return (
    <AppScreen
      title={film?.title ?? "Movie Detail"}
      subtitle={film ? `${film.year} | ${film.director}` : "Detail view"}
      headerRight={<CTAButton label="Back" variant="secondary" onPress={() => router.back()} />}
    >
      {loading ? <MovieDetailSkeleton /> : null}

      {!loading && !film ? (
        <EmptyState
          title="Film not found"
          message="This detail route is scaffolded and expects a valid mock film id."
          action={
            <CTAButton label="Go Home" onPress={() => router.replace("/(tabs)" as Href)} />
          }
        />
      ) : null}

      {!loading && film ? (
        <>
          <View style={styles.heroCard}>
            <View style={[styles.poster, { backgroundColor: film.posterColor }]} />
            <View style={styles.heroBody}>
              <View style={screenStyles.wrapRow}>
                <MatchScore score={film.matchScore} />
                {film.genres.slice(0, 3).map((genre) => (
                  <TasteTag key={genre} label={genre} />
                ))}
              </View>
              <Text style={screenStyles.mutedText}>
                {film.runtimeMinutes} min | {film.year}
              </Text>
              <CTAButton
                label="Add to Watchlists"
                onPress={() => router.push("/(tabs)/watchlists" as Href)}
              />
            </View>
          </View>

          <View style={styles.tabsRow}>
            {tabs.map((value) => {
              const active = tab === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setTab(value)}
                  style={[
                    styles.tab,
                    active && {
                      backgroundColor: COLORS.accent.iceBlue,
                      borderColor: COLORS.accent.iceBlue,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      active && { color: COLORS.foreground.inverse },
                    ]}
                  >
                    {value[0].toUpperCase()}
                    {value.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={screenStyles.card}>
            {tab === "overview" ? (
              <Text style={screenStyles.bodyText}>{film.synopsis}</Text>
            ) : null}
            {tab === "analysis" ? (
              <Text style={screenStyles.bodyText}>{film.analysis}</Text>
            ) : null}
            {tab === "videos" ? (
              <View style={styles.videoList}>
                {film.videos.map((video) => (
                  <View key={video.id} style={styles.videoRow}>
                    <Text style={styles.videoDot}>-</Text>
                    <Text style={screenStyles.bodyText}>{video.title}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: COLORS.background.elevated,
    borderColor: COLORS.border.default,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.card,
    overflow: "hidden",
  },
  poster: {
    height: 220,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  heroBody: {
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  tabsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    backgroundColor: COLORS.background.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  videoList: {
    gap: SPACING.xs,
  },
  videoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  videoDot: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
});
