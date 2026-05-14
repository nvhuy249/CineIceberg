export type FilmVideo = {
  id: string;
  title: string;
};

export type Film = {
  id: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  posterUrl?: string | null;
  backdropUrl?: string | null;
  imageGalleryUrls?: string[];
  title: string;
  year: number;
  runtimeMinutes: number;
  director: string;
  genres: string[];
  matchScore: number;
  posterColor: string;
  synopsis: string;
  analysis: string;
  videos: FilmVideo[];
};
