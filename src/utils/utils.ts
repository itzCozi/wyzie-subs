/** @format */

import { parseSubtitles } from "~/utils/json";
import type { RequestType } from "~/utils/types";
import { proxyFetch } from "~/utils/proxy";
import numberToWords from "number-to-words";

const { toWords } = numberToWords;

// Fetches using proxy from opensubs
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
  if (n <= 0) {
    throw new Error("numberToCardinal only works with positive numbers");
  }

  // Special case for single-digit numbers for simplicity
  if (n < 10) {
    switch (n) {
      case 1:
        return "first";
      case 2:
        return "second";
      case 3:
        return "third";
      case 4:
        return "fourth";
      case 5:
        return "fifth";
      case 6:
        return "sixth";
      case 7:
        return "seventh";
      case 8:
        return "eighth";
      case 9:
        return "ninth";
    }
  }

  // Get the word representation of the number
  const words = toWords(n);

  // Handle exceptions for 11, 12, 13
  const lastTwoDigits = n % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${words}th`;
  }

  const lastDigit = n % 10;
  switch (lastDigit) {
    case 1:
      return words.replace(/(\W|^)(one)$/, "$1first");
    case 2:
      return words.replace(/(\W|^)(two)$/, "$1second");
    case 3:
      return words.replace(/(\W|^)(three)$/, "$1third");
    case 4:
      return words.replace(/(\W|^)(four)$/, "$1fourth");
    case 5:
      return words.replace(/(\W|^)(five)$/, "$1fifth");
    case 6:
      return words.replace(/(\W|^)(six)$/, "$1sixth");
    case 7:
      return words.replace(/(\W|^)(seven)$/, "$1seventh");
    case 8:
      return words.replace(/(\W|^)(eight)$/, "$1eighth");
    case 9:
      return words.replace(/(\W|^)(nine)$/, "$1ninth");
    case 0:
      return `${words}th`;
    default:
      return `${words}th`;
  }
}
