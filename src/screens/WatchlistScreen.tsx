import { useRouter, type Href } from "expo-router";
import { View } from "react-native";

import AppScreen from "@/src/components/AppScreen";
import EmptyState from "@/src/components/EmptyState";
import FilmCard from "@/src/components/FilmCard";
import { hiddenGems, watchlistFilms } from "@/src/data/mockData";
import type { Film } from "@/src/types/film";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

export default function WatchlistScreen() {
  const router = useRouter();

  const openFilm = (film: Film) =>
    router.push(
      ({ pathname: "/movie/[id]", params: { id: film.id } } as unknown) as Href,
    );

  return (
    <AppScreen
      title="Watchlist"
      subtitle="Saved films and more like this"
      headerRight={<CTAButton label="Back" variant="secondary" onPress={() => router.back()} />}
    >
      <View style={screenStyles.section}>
        <SectionTitle title="Saved Films" subtitle={`${watchlistFilms.length} in your list`} />
        {watchlistFilms.length === 0 ? (
          <EmptyState
            title="Your watchlist is empty"
            message="Save films from discovery, search, or detail."
            action={
              <CTAButton
                label="Go to Discover"
                onPress={() => router.push("/(tabs)/discover" as Href)}
              />
            }
          />
        ) : (
          watchlistFilms.map((film) => (
            <FilmCard key={film.id} film={film} onPress={() => openFilm(film)} />
          ))
        )}
      </View>

      <View style={screenStyles.section}>
        <SectionTitle title="Add More Like This" subtitle="Taste-adjacent recommendations" />
        {hiddenGems.map((film) => (
          <FilmCard key={film.id} film={film} compact onPress={() => openFilm(film)} />
        ))}
      </View>
    </AppScreen>
  );
}
