import type { Film } from "@/src/types/film";
import type { Watchlist } from "@/src/types/watchlist";

export const films: Film[] = [
  {
    id: "blade-runner-2049",
    title: "Blade Runner 2049",
    year: 2017,
    runtimeMinutes: 164,
    director: "Denis Villeneuve",
    genres: ["Sci-Fi", "Neo-Noir", "Slow Burn"],
    matchScore: 94,
    posterColor: "#2c4f7d",
    synopsis:
      "A blade runner uncovers a secret that sends him toward a missing officer and a buried truth.",
    analysis:
      "Atmospheric production design and contemplative pacing reward viewers who like existential sci-fi and visual worldbuilding.",
    videos: [
      { id: "trailer", title: "Official Trailer" },
      { id: "breakdown", title: "Ending Breakdown" },
    ],
  },
  {
    id: "parasite",
    title: "Parasite",
    year: 2019,
    runtimeMinutes: 132,
    director: "Bong Joon-ho",
    genres: ["Thriller", "Satire", "Drama"],
    matchScore: 96,
    posterColor: "#28594d",
    synopsis:
      "A poor family infiltrates a wealthy household and triggers a chain of escalating consequences.",
    analysis:
      "Genre shifts, class commentary, and tightly controlled suspense make this a high-confidence recommendation.",
    videos: [
      { id: "trailer", title: "Official Trailer" },
      { id: "essay", title: "Themes & Symbolism" },
    ],
  },
  {
    id: "moonlight",
    title: "Moonlight",
    year: 2016,
    runtimeMinutes: 111,
    director: "Barry Jenkins",
    genres: ["Drama", "Coming-of-Age", "Character Study"],
    matchScore: 91,
    posterColor: "#325e8a",
    synopsis:
      "A young man grows through three defining periods of his life while searching for identity and connection.",
    analysis:
      "Intimate performances and lyrical storytelling align with emotionally driven viewing preferences.",
    videos: [
      { id: "trailer", title: "Official Trailer" },
      { id: "craft", title: "Cinematography Featurette" },
    ],
  },
  {
    id: "the-handmaiden",
    title: "The Handmaiden",
    year: 2016,
    runtimeMinutes: 145,
    director: "Park Chan-wook",
    genres: ["Thriller", "Period", "Twist-heavy"],
    matchScore: 89,
    posterColor: "#613e4d",
    synopsis:
      "A con artist's plot to defraud a wealthy woman grows unstable as loyalties and desire shift.",
    analysis:
      "Precision direction, layered reveals, and rich aesthetics deliver strong appeal for twist-driven prestige cinema.",
    videos: [
      { id: "trailer", title: "Official Trailer" },
      { id: "review", title: "Critic Review" },
    ],
  },
  {
    id: "drive",
    title: "Drive",
    year: 2011,
    runtimeMinutes: 100,
    director: "Nicolas Winding Refn",
    genres: ["Crime", "Neo-Noir", "Stylized"],
    matchScore: 86,
    posterColor: "#4e3f7d",
    synopsis:
      "A stunt driver and getaway specialist is pulled into a violent criminal spiral.",
    analysis:
      "Minimal dialogue and synth-heavy mood create a strong match for style-first viewers.",
    videos: [
      { id: "trailer", title: "Official Trailer" },
      { id: "soundtrack", title: "Soundtrack Spotlight" },
    ],
  },
  {
    id: "aftersun",
    title: "Aftersun",
    year: 2022,
    runtimeMinutes: 101,
    director: "Charlotte Wells",
    genres: ["Drama", "Memory", "Indie"],
    matchScore: 90,
    posterColor: "#7b5f3f",
    synopsis:
      "A daughter revisits memories of a holiday with her father and the meaning hidden in small moments.",
    analysis:
      "Subtle emotional layering and reflective structure resonate with viewers drawn to quiet, affecting films.",
    videos: [
      { id: "trailer", title: "Official Trailer" },
      { id: "interview", title: "Director Interview" },
    ],
  },
  {
    id: "arrival",
    title: "Arrival",
    year: 2016,
    runtimeMinutes: 116,
    director: "Denis Villeneuve",
    genres: ["Sci-Fi", "Drama", "First Contact"],
    matchScore: 93,
    posterColor: "#4a5f75",
    synopsis:
      "A linguist is recruited to communicate with extraterrestrials as geopolitical tensions rise.",
    analysis:
      "Language-driven sci-fi and emotional payoff make this a strong bridge between cerebral and accessible recommendations.",
    videos: [
      { id: "trailer", title: "Official Trailer" },
      { id: "explainer", title: "Timeline Explainer" },
    ],
  },
  {
    id: "burning",
    title: "Burning",
    year: 2018,
    runtimeMinutes: 148,
    director: "Lee Chang-dong",
    genres: ["Mystery", "Slow Burn", "Psychological"],
    matchScore: 87,
    posterColor: "#5a4837",
    synopsis:
      "A young man becomes obsessed with a wealthy stranger and a disappearance that may never be solved.",
    analysis:
      "Ambiguity and slow-building tension make this ideal for viewers who enjoy interpretive storytelling.",
    videos: [
      { id: "trailer", title: "Official Trailer" },
      { id: "essay", title: "Ambiguity Explained" },
    ],
  },
  {
    id: "severance",
    title: "Severance",
    year: 2022,
    runtimeMinutes: 510,
    director: "Dan Erickson",
    genres: ["Series", "Sci-Fi", "Psychological"],
    matchScore: 92,
    posterColor: "#3d5668",
    synopsis:
      "Office employees undergo a procedure that splits work memories from personal life, revealing a disturbing system.",
    analysis:
      "Controlled tension, existential themes, and cold visual design align with viewers who enjoy cerebral mystery.",
    videos: [
      { id: "trailer", title: "Season Trailer" },
      { id: "analysis", title: "Lore Breakdown" },
    ],
  },
  {
    id: "dark",
    title: "Dark",
    year: 2017,
    runtimeMinutes: 1560,
    director: "Baran bo Odar",
    genres: ["Series", "Mystery", "Slow Burn"],
    matchScore: 90,
    posterColor: "#3f4b3a",
    synopsis:
      "A small town's missing-child case exposes a knot of timelines and family secrets across generations.",
    analysis:
      "Dense plotting and atmospheric dread make this a strong fit for puzzle-box viewers.",
    videos: [
      { id: "trailer", title: "Official Trailer" },
      { id: "guide", title: "Character Guide" },
    ],
  },
  {
    id: "the-bear",
    title: "The Bear",
    year: 2022,
    runtimeMinutes: 540,
    director: "Christopher Storer",
    genres: ["Series", "Drama", "Character Study"],
    matchScore: 88,
    posterColor: "#6b4e3b",
    synopsis:
      "A young chef returns home to run his family's restaurant while balancing grief, chaos, and ambition.",
    analysis:
      "High-intensity direction and emotional realism appeal to viewers who value character-driven storytelling.",
    videos: [
      { id: "trailer", title: "Season Trailer" },
      { id: "featurette", title: "Cast Featurette" },
    ],
  },
];

export const featuredFilmId = "parasite";
export const hiddenGemIds = ["burning", "aftersun", "moonlight"];
export const trendingIds = ["arrival", "blade-runner-2049", "drive"];
export const onboardingPickIds = [
  "parasite",
  "blade-runner-2049",
  "arrival",
  "moonlight",
  "the-handmaiden",
  "drive",
  "aftersun",
  "burning",
  "severance",
  "dark",
];
export const discoverQueueIds = [
  "drive",
  "burning",
  "moonlight",
  "parasite",
  "blade-runner-2049",
  "severance",
];

export const tasteTags = [
  "Atmospheric",
  "Slow Burn",
  "Psychological",
  "Auteur-Driven",
];

export const getFilmById = (id: string) => films.find((film) => film.id === id);

export const getFilmsByIds = (ids: string[]) =>
  ids.map((id) => getFilmById(id)).filter((film): film is Film => Boolean(film));

export const featuredFilm = getFilmById(featuredFilmId) ?? films[0];
export const hiddenGems = getFilmsByIds(hiddenGemIds);
export const trending = getFilmsByIds(trendingIds);
export const onboardingPicks = getFilmsByIds(onboardingPickIds);
export const discoverQueue = getFilmsByIds(discoverQueueIds);

export const initialWatchlists: Watchlist[] = [
  {
    id: "discover-watchlist",
    name: "Discover",
    description: "Liked from swipe mode.",
    filmIds: [],
    createdAt: "2026-02-08T08:00:00.000Z",
    updatedAt: "2026-02-08T08:00:00.000Z",
    accent: "#5f748d",
    emoji: "DISC",
    layoutSize: "standard",
  },
  {
    id: "mind-bending-sci-fi",
    name: "Mind-Bending Sci-Fi",
    description: "Big concepts, existential tension, and polished visuals.",
    filmIds: ["arrival", "blade-runner-2049", "severance"],
    createdAt: "2026-02-10T08:00:00.000Z",
    updatedAt: "2026-02-18T08:00:00.000Z",
    accent: "#6f8ead",
    emoji: "ICE",
    layoutSize: "tall",
  },
  {
    id: "twists-and-tension",
    name: "Twists & Tension",
    description: "Layered thrillers with sharp turns and moral pressure.",
    filmIds: ["parasite", "the-handmaiden", "burning"],
    createdAt: "2026-02-12T08:00:00.000Z",
    updatedAt: "2026-02-19T08:00:00.000Z",
    accent: "#9f6d72",
    emoji: "NOIR",
    layoutSize: "standard",
  },
  {
    id: "quiet-character-stories",
    name: "Quiet Character Stories",
    description: "Emotion-first films and series with intimate arcs.",
    filmIds: ["moonlight", "aftersun", "the-bear"],
    createdAt: "2026-02-14T08:00:00.000Z",
    updatedAt: "2026-02-20T08:00:00.000Z",
    accent: "#8e7b62",
    emoji: "SOFT",
    layoutSize: "compact",
  },
];

export const searchFilms = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return films;

  return films.filter((film) => {
    const haystack = [film.title, film.director, ...film.genres, film.year.toString()]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
};
