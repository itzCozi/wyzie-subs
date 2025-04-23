/** @format */

import { convertTmdbToImdb, fetchSubtitles } from "~/utils/utils";
import { RequestType, ResponseType } from "~/utils/types";
import { languageToCountryCode } from "~/utils/lookup";

export async function search(request: RequestType): Promise<ResponseType[]> {
  try {
    if (!request.imdbId) {
      if (request.tmdbId) {
        const mediaType = request.season !== undefined ? "tv" : "movie";
        request.imdbId = await convertTmdbToImdb(`${request.tmdbId}`, mediaType);
      } else {
        throw new Error("imdbId is required");
      }
    }

    const safeRequest: RequestType = {
      ...request,
      imdbId: request.imdbId as string,
      tmdbId: undefined,
    };
    const data = await fetchSubtitles(safeRequest);

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
          };
        }
        return null;
      }),
    );

    return subtitles.filter((sub) => sub !== null);
  } catch (e) {
    throw new Error(`Error in search function: ${e}`);
  }
}
