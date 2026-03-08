import { Redirect, type Href } from "expo-router";

export default function LegacyWatchlistRoute() {
  return <Redirect href={"/(tabs)/watchlists" as Href} />;
}
