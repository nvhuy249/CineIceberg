import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "@/src/context/AuthContext";
import { WatchlistsProvider } from "@/src/context/WatchlistsContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <WatchlistsProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#080809" },
          }}
        />
      </WatchlistsProvider>
    </AuthProvider>
  );
}
