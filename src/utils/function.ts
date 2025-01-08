/** @format */

import { convertTmdbToImdb, fetchSubtitles } from "~/utils/utils";
import { RequestType, ResponseType } from "~/utils/types";
import { languageToCountryCode } from "~/utils/lookup";

export async function search(
  request: RequestType,
  languages?: string[],
  hearingImpaired?: boolean,
): Promise<ResponseType[]> {
  try {
    if (!request.imdbId) {
      if (request.tmdbId) {
        const mediaType = request.season !== undefined ? "tv" : "movie";
        request.imdbId = await convertTmdbToImdb(request.tmdbId, mediaType);
      } else {
        throw new Error("imdbId is required");
      }
    }

    const safeRequest: RequestType = {
      ...request,
      imdbId: request.imdbId as string,
    };

    const data = await fetchSubtitles(safeRequest);

    const subtitles: ResponseType[] = await Promise.all(
      data.map(async (sub) => {
        const hearingImpairedMatch = !hearingImpaired || sub.SubHearingImpaired === "1";
        const languageMatch =
          !languages || languages.length === 0 || languages.includes(sub.ISO639);
        const formatMatch =
          !request.format || sub.SubFormat.toLowerCase() === request.format.toLowerCase();
        if (languageMatch && formatMatch && hearingImpairedMatch) {
          const countryCode = languageToCountryCode[sub.ISO639] || sub.ISO639.toUpperCase();
          return {
            id: sub.IDSubtitleFile,
            url: sub.SubDownloadLink.replace(".gz", "").replace(
              "download/",
              "download/subencoding-utf8/",
            ),
            // There is no PB flag, so we use BR instead
            flagUrl: `https://flagsapi.com/${countryCode === "PB" ? "BR" : countryCode}/flat/24.png`,
            format: sub.SubFormat,
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
  } catch (error) {
    throw new Error("Error in search function:", error);
  }
}
