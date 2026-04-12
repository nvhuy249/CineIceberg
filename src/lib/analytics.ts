export type AnalyticsEventName =
  | "home_hidden_triggered"
  | "hidden_opened"
  | "recommendation_added"
  | "watchlist_created";

export type AnalyticsPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

type AnalyticsEvent = {
  name: AnalyticsEventName;
  payload: AnalyticsPayload;
  at: string;
};

const MAX_EVENTS = 200;
const eventBuffer: AnalyticsEvent[] = [];

export const trackEvent = (
  name: AnalyticsEventName,
  payload: AnalyticsPayload = {},
) => {
  const event: AnalyticsEvent = {
    name,
    payload,
    at: new Date().toISOString(),
  };

  eventBuffer.push(event);
  if (eventBuffer.length > MAX_EVENTS) {
    eventBuffer.shift();
  }

  if (__DEV__) {
    // Lightweight local instrumentation until a backend sink is connected.
    console.log("[analytics]", name, payload);
  }
};

export const getTrackedEvents = () => [...eventBuffer];

export const clearTrackedEvents = () => {
  eventBuffer.length = 0;
};
