import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { WatchlistsProvider } from "@/src/context/WatchlistsContext";

export default function RootLayout() {
  return (
    <WatchlistsProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#080809" },
        }}
      />
    </WatchlistsProvider>
  );
}
