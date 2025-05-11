/** @format */

import { convertTmdbToImdb, fetchSubtitles } from "~/utils/utils";
import type { RequestType, ResponseType } from "~/utils/types";
import { languageToCountryCode } from "~/utils/lookup";
import { searchSubdl } from "~/sources/subdl";

async function processOpenSubtitlesResults(
  data: any[],
  request: RequestType,
): Promise<ResponseType[]> {
  const subtitles: ResponseType[] = await Promise.all(
    data.map(async (sub) => {
      const hearingImpairedMatch = !request.hearingImpaired || sub.SubHearingImpaired === "1";
      const languageMatch =
        !request.languages ||
        request.languages.length === 0 ||
        request.languages.includes(sub.ISO639);
      const formatMatch =
        !request.formats ||
        request.formats.length === 0 ||
        request.formats.includes(sub.SubFormat.toLowerCase());
      const encodingMatch =
        !request.encodings ||
        request.encodings.length === 0 ||
        request.encodings.includes(sub.SubEncoding.toLowerCase());

      if (languageMatch && formatMatch && hearingImpairedMatch && encodingMatch) {
        const countryCode = languageToCountryCode[sub.ISO639] || sub.ISO639.toUpperCase();
        return {
          id: sub.IDSubtitleFile,
          url: sub.SubDownloadLink.replace(".gz", "").replace(
            "download/",
            "download/subencoding-utf8/",
          ),
          flagUrl: `https://flagsapi.com/${countryCode}/flat/24.png`,
          format: sub.SubFormat,
          encoding: sub.SubEncoding,
          display: sub.LanguageName,
          language: sub.ISO639,
          media: sub.MovieName,
          isHearingImpaired: sub.SubHearingImpaired === "1",
          source: "opensubtitles",
        };
      }
      return null;
    }),
  );
  return subtitles.filter((sub): sub is ResponseType => sub !== null);
}

export async function search(request: RequestType): Promise<ResponseType[]> {
  try {
    if (!request.imdbId) {
      if (request.tmdbId) {
        const mediaType = request.season !== undefined ? "tv" : "movie";
        request.imdbId = await convertTmdbToImdb(`${request.tmdbId}`, mediaType);
      } else {
        throw new Error("imdbId or tmdbId is required");
      }
    }

    const safeRequest: RequestType = {
      ...request,
      imdbId: request.imdbId as string,
      tmdbId: undefined, // Clear tmdbId after conversion
    };

    const sources =
      Array.isArray(safeRequest.source) ? safeRequest.source
      : typeof safeRequest.source === "string" ? safeRequest.source.split(",")
      : [];

    const results: ResponseType[] = [];

    for (const source of sources) {
      if (source === "subdl") {
        console.log("[Search] Using SubDL source.");
        results.push(...(await searchSubdl(safeRequest)));
      } else if (source === "opensubtitles") {
        console.log("[Search] Using OpenSubtitles source.");
        const data = await fetchSubtitles(safeRequest);
        results.push(...(await processOpenSubtitlesResults(data, safeRequest)));
      } else {
        console.warn(`[Search] Unknown source: ${source}`);
      }
    }

    if (results.length === 0 && sources.length === 0) {
      console.log("[Search] No specific source requested, defaulting to OpenSubtitles.");
      const data = await fetchSubtitles(safeRequest);
      results.push(...(await processOpenSubtitlesResults(data, safeRequest)));
    }

    return results;
  } catch (e) {
    console.error(`[Search] Unexpected error in search function:`, e);
    return [];
  }
}
