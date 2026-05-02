import { Redirect, Stack, type Href } from "expo-router";
import { useEffect, useState } from "react";

import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";

export default function OnboardingLayout() {
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
  if (onboardingCompleted) return <Redirect href={"/(tabs)" as Href} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
