import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import ConnectedFilmRowCard from "@/src/components/ConnectedFilmRowCard";
import EmptyState from "@/src/components/EmptyState";
import { SearchSkeleton } from "@/src/components/LoadingSkeletons";
import { searchFilms } from "@/src/data/mockData";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle } from "./shared";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => searchFilms(query), [query]);

  const openFilm = (film: Film) =>
    router.push(
      ({ pathname: "/movie/[id]", params: { id: film.id } } as unknown) as Href,
    );

  return (
    <AppScreen title="Search" subtitle="Find films by title, director, genre, or year">
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search movies..."
          placeholderTextColor={COLORS.foreground.tertiary}
          style={styles.searchInput}
        />
      </View>

      <SectionTitle
        title={query.trim() ? `${results.length} results` : "Browse all films"}
        subtitle={query.trim() ? `Query: "${query}"` : "Start typing to narrow the list"}
      />

      {loading ? <SearchSkeleton /> : null}

      {!loading && results.length === 0 ? (
        <EmptyState
          title="No results"
          message="Try a different title, director, or genre."
          action={
            <CTAButton
              label="Clear Search"
              variant="secondary"
              onPress={() => setQuery("")}
            />
          }
        />
      ) : null}

      {!loading &&
        results.map((film) => (
          <ConnectedFilmRowCard
            key={film.id}
            film={film}
            onOpenFilm={() => openFilm(film)}
            rightContent={
              <>
                <Text style={styles.description} numberOfLines={4}>
                  {film.synopsis}
                </Text>
                <Text style={styles.metaDetails} numberOfLines={2}>
                  {film.director} | {film.runtimeMinutes} min | {film.genres.slice(0, 3).join(" · ")}
                </Text>
              </>
            }
          />
        ))}
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
  description: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  metaDetails: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
});
