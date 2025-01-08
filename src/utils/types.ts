/** @format */

export type RequestType = (
  | { tmdbId: number; imdbId?: never }
  | { imdbId: string; tmdbId?: never }
) & {
  language?: string; // ISO639 locale
  format?: string; // subtitle format (srt, ass, vtt)
} & ({ season: number; episode: number } | { season?: never; episode?: never });

export type ResponseType = {
  id: string;
  url: string;
  flagUrl: string;
  format: string; // subtitle format (srt, ass, vtt)
  media: string; // The name / title of the media
  display: string; // Full lang (ex: English)
  language: string; // ISO639 locale
  isHearingImpaired: boolean;
};

// JSON parsing types
export type Subtitle = {
  ISO639: string;
  LanguageName: string;
  SubHearingImpaired: string;
  IDSubtitleFile: string;
  SubFormat: string;
  MovieName: string;
  SubDownloadLink: string;
};

export type SubtitleInput = {
  ISO639?: unknown;
  LanguageName?: unknown;
  SubHearingImpaired?: unknown;
  IDSubtitleFile?: unknown;
  SubFormat?: unknown;
  MovieName?: unknown;
  SubDownloadLink?: unknown;
};
