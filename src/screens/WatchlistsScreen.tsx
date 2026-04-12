import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import AppScreen from "@/src/components/AppScreen";
import EmptyState from "@/src/components/EmptyState";
import WatchlistNoteCard from "@/src/components/WatchlistNoteCard";
import { getFilmsByIds } from "@/src/data/mockData";
import { useWatchlists } from "@/src/context/WatchlistsContext";
import { trackEvent } from "@/src/lib/analytics";

import { CTAButton, SectionTitle, screenStyles } from "./shared";

export default function WatchlistsScreen() {
  const router = useRouter();
  const { watchlists, createWatchlist } = useWatchlists();
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    setShowCreateModal(false);
    trackEvent("watchlist_created", {
      source: "watchlists_modal",
      watchlist_id: created.id,
      has_description: Boolean(description.trim()),
    });
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

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setError("");
  };

  const sortedWatchlists = [...watchlists].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const boardColumns = sortedWatchlists.reduce<[typeof sortedWatchlists, typeof sortedWatchlists]>(
    (columns, watchlist, index) => {
      columns[index % 2].push(watchlist);
      return columns;
    },
    [[], []],
  );

  return (
    <AppScreen
      title="Watchlists"
      subtitle="Create multiple watchlists and manage recommendations by theme"
    >
      <View style={screenStyles.section}>
        <SectionTitle
          title="Create Watchlist"
          subtitle="Keep it simple: name it, describe it, and start adding titles"
        />
        <View style={styles.createTriggerWrap}>
          <CTAButton label="Create Watchlist" onPress={() => setShowCreateModal(true)} />
        </View>
      </View>

      <View style={screenStyles.section}>
        <SectionTitle
          title="Your Watchlists"
          subtitle={`${watchlists.length} total watchlists arranged as notes`}
        />
        {watchlists.length === 0 ? (
          <EmptyState
            title="No watchlists yet"
            message="Create your first watchlist to start collecting recommendations by mood."
          />
        ) : (
          <View style={styles.board}>
            {boardColumns.map((column, columnIndex) => (
              <View key={`column-${columnIndex}`} style={styles.column}>
                {column.map((watchlist) => {
                  const previewFilms = getFilmsByIds(watchlist.filmIds).slice(0, 4);
                  const aesthetics = Array.from(
                    new Set(
                      previewFilms.flatMap((film) => film.genres).filter((genre) => genre !== "Series"),
                    ),
                  ).slice(0, 3);

                  return (
                    <WatchlistNoteCard
                      key={watchlist.id}
                      watchlist={watchlist}
                      previewFilms={previewFilms}
                      aesthetics={aesthetics}
                      onOpen={() => openWatchlist(watchlist.id)}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressTarget} onPress={closeCreateModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Watchlist</Text>
              <Pressable onPress={closeCreateModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (error) setError("");
              }}
              placeholder="Watchlist name"
              placeholderTextColor={COLORS.foreground.tertiary}
              style={styles.input}
              autoFocus
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              placeholderTextColor={COLORS.foreground.tertiary}
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <CTAButton label="Create" onPress={handleCreateWatchlist} />
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  createTriggerWrap: {
    alignSelf: "flex-start",
  },
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
  board: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  column: {
    flex: 1,
    gap: SPACING.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: withOpacity(COLORS.background.primary, 0.72),
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  backdropPressTarget: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    backgroundColor: COLORS.background.elevated,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    color: COLORS.foreground.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  closeButton: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: SPACING.xs,
  },
  closeButtonText: {
    color: COLORS.foreground.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
