import type { Href } from "expo-router";

type BackRouter = {
  back: () => void;
  canGoBack: () => boolean;
  replace: (href: Href) => void;
};

export function safeBack(router: BackRouter, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
