import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "@/app/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import EmptyState from "@/src/components/EmptyState";
import FilmCard from "@/src/components/FilmCard";
import MatchScore from "@/src/components/MatchScore";
import TasteTag from "@/src/components/TasteTag";
import { discoverQueue, tasteTags } from "@/src/data/mockData";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

export default function DiscoverScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(0);
  const [passed, setPassed] = useState(0);
  const [, setHistory] = useState<number[]>([]);

  const currentFilm = discoverQueue[index];
  const remaining = Math.max(discoverQueue.length - index, 0);

  const nextCard = (action: "like" | "pass") => {
    setHistory((values) => [...values, index]);
    setIndex((value) => Math.min(value + 1, discoverQueue.length));
    if (action === "like") setLiked((value) => value + 1);
    if (action === "pass") setPassed((value) => value + 1);
  };

  const undo = () => {
    setHistory((values) => {
      if (values.length === 0) return values;
      const copy = [...values];
      const previousIndex = copy.pop();
      if (previousIndex !== undefined) {
        setIndex(previousIndex);
      }
      return copy;
    });
  };

  const discoverSignals = useMemo(() => tasteTags.slice(0, 3), []);

  return (
    <AppScreen title="Discover" subtitle="Swipe-style card deck for quick taste feedback">
      <View style={screenStyles.card}>
        <SectionTitle
          title={`${remaining} cards remaining`}
          subtitle={`${liked} liked | ${passed} passed`}
        />
        <View style={screenStyles.wrapRow}>
          {discoverSignals.map((tag) => (
            <TasteTag key={tag} label={tag} />
          ))}
        </View>
      </View>

      {!currentFilm ? (
        <EmptyState
          title="No more cards"
          message="You've reached the end of the discover queue."
          action={<CTAButton label="Restart Deck" onPress={() => setIndex(0)} />}
        />
      ) : (
        <>
          <View style={styles.swipeCard}>
            <FilmCard film={currentFilm} variant="swipe" />
            <View style={styles.overlayRow}>
              <MatchScore score={currentFilm.matchScore} />
              {currentFilm.genres.slice(0, 2).map((genre) => (
                <TasteTag key={genre} label={genre} />
              ))}
            </View>
          </View>

          <View style={styles.actionsRow}>
            <ActionButton label="Undo" onPress={undo} />
            <ActionButton label="Pass" onPress={() => nextCard("pass")} />
            <ActionButton
              label="Info"
              onPress={() =>
                router.push(
                  (({
                    pathname: "/movie/[id]",
                    params: { id: currentFilm.id },
                  } as unknown) as Href),
                )
              }
            />
            <ActionButton label="Like" onPress={() => nextCard("like")} />
          </View>
        </>
      )}
    </AppScreen>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swipeCard: {
    gap: SPACING.sm,
  },
  overlayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  actionButton: {
    flexGrow: 1,
    minWidth: "22%",
    minHeight: 42,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    backgroundColor: COLORS.background.elevated,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  actionButtonText: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  pressed: {
    opacity: 0.9,
  },
});
