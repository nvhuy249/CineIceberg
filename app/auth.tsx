import { Redirect, type Href } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import AuthScreen from "@/src/screens/AuthScreen";

export default function AuthRoute() {
  const { session, isInitializing } = useAuth();

  if (isInitializing) return null;
  if (session) return <Redirect href={"/(tabs)" as Href} />;

  return <AuthScreen />;
}
