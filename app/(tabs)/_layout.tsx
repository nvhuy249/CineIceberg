import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs, type Href } from "expo-router";

import { COLORS } from "@/src/constants/designTokens";
import { useAuth } from "@/src/context/AuthContext";

export default function TabsLayout() {
  const { session, isInitializing } = useAuth();

  if (isInitializing) return null;
  if (!session) return <Redirect href={"/auth" as Href} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background.elevated,
          borderTopColor: COLORS.border.default,
        },
        tabBarActiveTintColor: COLORS.accent.iceBlue,
        tabBarInactiveTintColor: COLORS.foreground.secondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlists"
        options={{
          title: "Watchlists",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
