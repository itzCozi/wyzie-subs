/** @format */

export type RequestType = (
  | { tmdbId: number; imdbId?: null }
  | { imdbId: string; tmdbId?: null }
) & {
  languages?: string | string[]; // ISO639 locale
  formats?: string | string[]; // subtitle format (srt, ass, vtt)
  encodings?: string | string[]; // subtitle file's encoding (UTF-8, ASCII)
  hearingImpaired?: boolean; // include hearing impaired subtitle
} & ({ season: number; episode: number } | { season?: null; episode?: null });

export type ResponseType = {
  id: string; // the ID of the subtitle according to open subs
  url: string; // URL to the subtitle download
  flagUrl: string; // URL to the flag of the language's locale
  format: string; //subtitle format (srt, ass, vtt)
  encoding: string; // subtitle file's encoding
  media: string; // the name / title of the media
  display: string; // full lang (ex: English)
  language: string; // ISO639 locale
  isHearingImpaired: boolean; // is the subtitle hearing impaired (true, false)
};

// JSON parsing types
export type Subtitle = {
  ISO639: string;
  LanguageName: string;
  SubHearingImpaired: string;
  IDSubtitleFile: string;
  SubFormat: string;
  MovieName: string;
  SubEncoding: string;
  SubDownloadLink: string;
};

export type SubtitleInput = {
  ISO639?: unknown;
  LanguageName?: unknown;
  SubHearingImpaired?: unknown;
  IDSubtitleFile?: unknown;
  SubFormat?: unknown;
  MovieName?: unknown;
  SubEncoding?: string;
  SubDownloadLink?: unknown;
};
