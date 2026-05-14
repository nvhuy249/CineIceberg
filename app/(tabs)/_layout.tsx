import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Redirect, Tabs, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, TYPOGRAPHY } from "@/src/constants/designTokens";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { blurActiveElementOnWeb } from "@/src/lib/webFocus";

const TAB_ICONS = {
  index: "home-outline",
  search: "search-outline",
  discover: "sparkles-outline",
  watchlists: "bookmark-outline",
  profile: "person-outline",
} as const;

const TAB_HREFS = {
  index: "/(tabs)",
  search: "/(tabs)/search",
  discover: "/(tabs)/discover",
  watchlists: "/(tabs)/watchlists",
  profile: "/(tabs)/profile",
} as const;

export default function TabsLayout() {
  const { session, isInitializing, user } = useAuth();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    let active = true;

    const loadOnboardingStatus = async () => {
      if (!session || !user || !supabase) {
        if (!active) return;
        setOnboardingCompleted(false);
        setIsCheckingProfile(false);
        return;
      }

      setIsCheckingProfile(true);
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      setOnboardingCompleted(Boolean(data?.onboarding_completed));
      setIsCheckingProfile(false);
    };

    void loadOnboardingStatus();
    return () => {
      active = false;
    };
  }, [session, user]);

  if (isInitializing || isCheckingProfile) return null;
  if (!session) return <Redirect href={"/auth" as Href} />;
  if (!onboardingCompleted) return <Redirect href={"/(onboarding)/welcome" as Href} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent.iceBlue,
        tabBarInactiveTintColor: COLORS.foreground.secondary,
      }}
      tabBar={(props) => <AppTabBar {...props} />}
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

function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, SPACING.xs) }]}>
      {state.routes.map((route, index) => {
        const options = descriptors[route.key].options;
        const focused = state.index === index;
        const title =
          typeof options.title === "string"
            ? options.title
            : typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : route.name;
        const iconName = TAB_ICONS[route.name as keyof typeof TAB_ICONS] ?? "ellipse-outline";
        const color = focused ? COLORS.accent.iceBlue : COLORS.foreground.secondary;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : undefined}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={() => {
              blurActiveElementOnWeb();
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                const href = (TAB_HREFS[route.name as keyof typeof TAB_HREFS] ?? "/(tabs)") as Href;
                router.push(
                  href,
                );
              }
            }}
            onLongPress={() => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            }}
            style={({ pressed }) => [
              styles.tabItem,
              focused && styles.tabItemFocused,
              pressed && styles.tabItemPressed,
            ]}
          >
            <Ionicons name={iconName} color={color} size={22} />
            <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.default,
    backgroundColor: COLORS.background.elevated,
    paddingTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  tabItem: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: SPACING.xs,
  },
  tabItemFocused: {
    backgroundColor: "transparent",
  },
  tabItemPressed: {
    opacity: 0.85,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
