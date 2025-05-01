/** @format */

import { parseSubtitles } from "~/utils/json";
import type { RequestType } from "~/utils/types";
import { proxyFetch } from "~/utils/proxy";
import numberToWords from "number-to-words";

const { toWords } = numberToWords;

export const fetchSubtitles = async (request: RequestType) => {
  const { imdbId, season, episode } = request;
  const url = `https://rest.opensubtitles.org/search/${
    season && episode ? `episode-${episode}/` : ""
  }imdbid-${imdbId.slice(2)}${season && episode ? `/season-${season}` : ""}`;
  const headers = {
    "Content-Type": "application/json",
    "X-User-Agent": "VLSub 0.10.3",
  };
  const res = await proxyFetch(url, { headers });
  const text = await res.text();

  return parseSubtitles(text);
};

export const convertTmdbToImdb = async (tmdbId: string, mediaType: "movie" | "tv" = "movie") => {
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=9867f3f6a5e78a2639afb0e2ffc0a311`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (!data.imdb_id) {
      console.warn(`No IMDB ID found for TMDB ID: ${tmdbId}`);
    }

    return data.imdb_id || null;
  } catch (e) {
    console.error(`Error converting TMDB to IMDB: ${e}`);

    return createErrorResponse(
      500,
      "TMDB to IMDB Conversion Error",
      "Failed to convert TMDB ID to IMDB ID. Please check your TMDB API key and the provided TMDB ID.",
    );
  }
};

export const createErrorResponse = (
  code: number,
  message: string,
  details: string,
  example?: string,
) => {
  const errorResponse = {
    code,
    message,
    details,
    example,
  };

  return new Response(JSON.stringify(errorResponse), {
    status: code,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
};

export function numberToCardinal(n: number): string {
  const suffixes: { [key: number]: string } = {
    1: "first",
    2: "second",
    3: "third",
  };

  const exceptions = [11, 12, 13]; // Special cases for 11th, 12th, 13th
  const remainder = n % 10;
  const suffix = exceptions.includes(n % 100) ? "th" : suffixes[remainder] || "th";

  const words = toWords(n);
  const ordinal =
    exceptions.includes(n % 100) ?
      `${words}th`
    : words.replace(/\b(one|two|three)\b/, (match) => suffixes[remainder] || match);

  return ordinal;
}
