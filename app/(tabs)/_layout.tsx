import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs, type Href } from "expo-router";
import { useEffect, useState } from "react";

import { COLORS } from "@/src/constants/designTokens";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";

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
