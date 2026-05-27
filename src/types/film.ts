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
  runtimeMinutes?: number | null;
  director: string;
  cast?: string[];
  genres: string[];
  matchScore: number;
  tmdbRating?: number;
  tmdbVoteCount?: number;
  imdbId?: string | null;
  posterColor: string;
  synopsis: string;
  analysis: string;
  videos: FilmVideo[];
};
