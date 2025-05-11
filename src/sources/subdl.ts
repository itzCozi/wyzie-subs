/** @format */

import type { RequestType, ResponseType, SubdlPageProps } from "~/utils/types";
import { languageToCountryCode } from "~/utils/lookup";
import { numberToCardinal } from "~/utils/utils";
import { proxyFetch } from "~/utils/proxy";
import ISO6391 from "iso-639-1";

export async function searchSubdl(request: RequestType): Promise<ResponseType[]> {
  console.log(`[SubDL Source] Searching with parameters:`, {
    imdbId: request.imdbId,
    season: request.season,
    episode: request.episode,
    languages: request.languages,
    formats: request.formats,
    encodings: request.encodings,
    hearingImpaired: request.hearingImpaired,
  });

  try {
    // WARNING: This uses a hardcoded Next.js build ID. which
    // is specific to a particular deployment of subdl. This
    // CAN break when SubDL updates their website so yea if it
    // dies then its probably because subdl changed the build id

    const buildId = "but--nncc5Fg0uqE42LOb";
    const searchApiUrl = `https://subdl.com/_next/data/${buildId}/en/search/${request.imdbId}.json?slug=${request.imdbId}`;
    const headers = {
      referer: `https://subdl.com/search/${request.imdbId}`,
      "x-nextjs-data": "1",
    };
    const response = await (typeof proxyFetch === "function" ?
      proxyFetch(searchApiUrl, { headers })
    : fetch(searchApiUrl, { headers }));

    if (!response.ok) {
      throw new Error(
        `SubDL Next.js data API request failed with status ${response.status} for URL: ${searchApiUrl}`,
      );
    }

    const responseText = await response.text();

    interface SubdlNextSearchResponse {
      pageProps: {
        list: {
          type: "movie" | "tv";
          sd_id: string;
          name: string;
          original_name: string;
          poster_url: string;
          year: number;
          slug: string;
          subtitles_count: number;
        }[];
      };
      __N_SSP: boolean;
    }

    const searchData: SubdlNextSearchResponse = JSON.parse(responseText);

    if (
      !searchData.pageProps ||
      !searchData.pageProps.list ||
      searchData.pageProps.list.length === 0
    ) {
      console.log(
        `[SubDL Source] No results found via Next.js data API for IMDb ID: ${request.imdbId}`,
      );
      return [];
    }

    const searchResultItem = searchData.pageProps.list[0];
    let finalSubtitleApiUrl = "";
    let finalReferer = "";
    let seasonSlug: string | null = null;

    if (searchResultItem.type === "movie") {
      console.log(`[SubDL Source] Movie detected.`);
      finalSubtitleApiUrl = `https://subdl.com/_next/data/${buildId}/en/subtitle/${searchResultItem.sd_id}/${searchResultItem.slug}.json?slug=${searchResultItem.sd_id}&slug=${searchResultItem.slug}`;
      finalReferer = `https://subdl.com/movie/${searchResultItem.slug}`;
    } else if (searchResultItem.type === "tv") {
      // --- TV Show Path ---
      if (request.season === undefined) {
        console.error(
          `[SubDL Source] TV show detected, but no specific season requested. Cannot fetch subtitles without a season slug for this API.`,
        );
        return [];
      }

      console.log(
        `[SubDL Source] TV Show detected (Season ${request.season}), fetching metadata to find season slug...`,
      );

      const metadataApiUrl = `https://subdl.com/_next/data/${buildId}/en/subtitle/${searchResultItem.sd_id}/${searchResultItem.slug}.json?slug=${searchResultItem.sd_id}&slug=${searchResultItem.slug}`;
      const metadataReferer = `https://subdl.com/tv/${searchResultItem.slug}`;
      const metadataHeaders = { ...headers, referer: metadataReferer };

      console.log(`[SubDL Source] Calling internal Next.js metadata API: ${metadataApiUrl}`);
      const metadataResponse = await (typeof proxyFetch === "function" ?
        proxyFetch(metadataApiUrl, { headers: metadataHeaders })
      : fetch(metadataApiUrl, { headers: metadataHeaders }));

      if (!metadataResponse.ok) {
        throw new Error(
          `SubDL Next.js metadata API request failed with status ${metadataResponse.status}`,
        );
      }

      const metadataResponseText = await metadataResponse.text();
      console.log(`[SubDL Source] Metadata response: ${metadataResponseText}`);

      interface SubdlNextMetadataResponse {
        pageProps: {
          movieInfo: {
            seasons?: { number: string; name: string }[];
            // Include other movieInfo fields if needed, but seasons is critical
          };
          // Other pageProps fields might exist but are not needed here
        };
        __N_SSP: boolean;
      }
      const metadataData: SubdlNextMetadataResponse = JSON.parse(metadataResponseText);
      const seasons = metadataData.pageProps?.movieInfo?.seasons;
      if (!seasons) {
        throw new Error(
          `[SubDL Source] Metadata API response did not contain expected seasons data (pageProps.movieInfo.seasons). Cannot determine season slug.`,
        );
      }

      const seasonInfo = seasons.find((s) => {
        const seasonNumberFromName = s.name.match(/^Season\s*(\d+)/i);
        if (seasonNumberFromName && parseInt(seasonNumberFromName[1]) === request.season) {
          return true;
        }
        const seasonName = numberToCardinal(request.season!);
        return s.number.includes(seasonName) || s.number === `season-${request.season}`;
      });

      if (seasonInfo && seasonInfo.number) {
        seasonSlug = seasonInfo.number;
        console.log(`[SubDL Source] Found season slug: ${seasonSlug}`);
        finalSubtitleApiUrl = `https://subdl.com/_next/data/${buildId}/en/subtitle/${searchResultItem.sd_id}/${searchResultItem.slug}/${seasonSlug}.json?slug=${searchResultItem.sd_id}&slug=${searchResultItem.slug}&slug=${seasonSlug}`;
        finalReferer = `https://subdl.com/tv/${searchResultItem.slug}/${seasonSlug}`;
      } else {
        throw new Error(
          `[SubDL Source] Could not find matching season slug for season ${request.season} in metadata response.`, // Make this an error
        );
      }
    } else {
      throw new Error(`Unknown search result type: ${searchResultItem.type}`);
    }

    if (!finalSubtitleApiUrl) {
      throw new Error("Failed to determine final subtitle API URL.");
    }

    console.log(
      `[SubDL Source] Calling final internal Next.js subtitle API: ${finalSubtitleApiUrl}`,
    );
    const finalSubtitleHeaders = { ...headers, referer: finalReferer };

    const finalSubtitleResponse = await (typeof proxyFetch === "function" ?
      proxyFetch(finalSubtitleApiUrl, { headers: finalSubtitleHeaders })
    : fetch(finalSubtitleApiUrl, { headers: finalSubtitleHeaders }));

    if (!finalSubtitleResponse.ok) {
      throw new Error(
        `SubDL final Next.js subtitle API request failed with status ${finalSubtitleResponse.status}`,
      );
    }

    const finalSubtitleResponseText = await finalSubtitleResponse.text();

    interface SubdlNextSubtitleResponse {
      pageProps: SubdlPageProps;
      __N_SSP: boolean;
    }

    const finalSubtitleData: SubdlNextSubtitleResponse = JSON.parse(finalSubtitleResponseText);
    const pageProps = finalSubtitleData.pageProps;

    if (!pageProps || !pageProps.movieInfo) {
      throw new Error("Failed to get page properties (pageProps) from the subtitle API endpoint.");
    }

    console.log(
      `[SubDL Source] Movie/Show info from subtitle API: ${pageProps.movieInfo.name} (${pageProps.movieInfo.year})`,
    );

    if (!pageProps.groupedSubtitles) {
      console.log(`[SubDL Source] No subtitles found via subtitle API`);
      return [];
    }

    // Check if this is a TV show search (has both season and episode)
    // This check is now only used for filtering subtitles, not for fetching logic
    const isTvShow = request.season !== undefined && request.episode !== undefined;

    const results: ResponseType[] = [];

    for (const [language, subtitles] of Object.entries(pageProps.groupedSubtitles)) {
      let langCode = "en";
      const lowerLangName = language.toLowerCase().trim();

      // Custom mapping for non-standard language names
      const customLanguageMap: Record<string, string> = {
        "brazillian-portuguese": "pt",
        "brazilian-portuguese": "pt",
        "brazilian portuguese": "pt",
        portugese: "pt",
        "chinese-bg-code": "zh",
        "chinese simplified": "zh",
        "chinese traditional": "zh",
        farsi_persian: "fa",
        "farsi/persian": "fa",
        farsi: "fa",
        ukranian: "uk",
        português: "pt",
        "português-brasileiro": "pt",
        "português-brasil": "pt",
      };

      // Check custom map first, then try ISO6391
      if (lowerLangName in customLanguageMap) {
        langCode = customLanguageMap[lowerLangName];
      } else {
        const isoLangCode = ISO6391.getCode(lowerLangName);
        if (isoLangCode) {
          langCode = isoLangCode.toLowerCase();
        } else {
          console.warn(
            `[SubDL] Could not find code for language name: "${language}", defaulting to 'en'.`,
          );
        }
      }

      if (
        request.languages &&
        request.languages.length > 0 &&
        !request.languages.includes(langCode)
      ) {
        continue;
      }

      for (const subtitle of subtitles) {
        const format = subtitle.quality.toLowerCase();
        if (request.formats && request.formats.length > 0 && !request.formats.includes(format)) {
          continue;
        }

        if (request.hearingImpaired === true && subtitle.hi !== 1) {
          continue;
        }

        if (isTvShow) {
          // for season pages, we need to check if the subtitle matches the requested episode
          // some subtitles have season/episode info, others have it in the title or link

          const hasMatchingEpisode =
            (subtitle.season === request.season && subtitle.episode === request.episode) ||
            (subtitle.title &&
              subtitle.title.match(
                new RegExp(`S0?${request.season}E0?${request.episode}\\b`, "i"),
              )) ||
            (subtitle.link &&
              subtitle.link.match(
                new RegExp(`(^|[^a-z0-9])e0?${request.episode}([^a-z0-9]|$)`, "i"),
              )) ||
            (subtitle.extra &&
              subtitle.extra.match(
                new RegExp(`(^|[^a-z0-9])(ep|episode)\\s*0?${request.episode}([^a-z0-9]|$)`, "i"),
              ));

          if (!hasMatchingEpisode) {
            continue;
          }

          console.log(
            `[SubDL Source] Found matching subtitle for S${request.season}E${request.episode}: ${subtitle.title || subtitle.link}`,
          );
        }

        const downloadUrl = `https://subdl.com/download/${subtitle.bucketLink}`;
        const compatibleUrl = `subdl/${subtitle.n_id || subtitle.id}/${subtitle.link}`;

        const countryCode = languageToCountryCode[langCode] || langCode.toUpperCase();

        let mediaDisplay = pageProps.movieInfo.name;
        if (isTvShow) {
          mediaDisplay = `${pageProps.movieInfo.name} - S${request.season.toString().padStart(2, "0")}E${request.episode.toString().padStart(2, "0")}`;
        }

        results.push({
          id: subtitle.n_id || String(subtitle.id),
          url: compatibleUrl,
          flagUrl: `https://flagsapi.com/${countryCode}/flat/24.png`,
          format: subtitle.quality.toLowerCase(),
          encoding: "UTF-8",
          media: mediaDisplay,
          display: capitalizeFirstLetter(language),
          language: langCode,
          isHearingImpaired: subtitle.hi === 1,
          source: "subdl",
        });
      }
    }

    console.log(`[SubDL Source] Processed ${results.length} subtitle entries`);
    return results;
  } catch (error) {
    console.error(`[SubDL Source] Error searching for subtitles:`, error);
    return [];
  }
}

/**
 * Helper function to capitalize the first letter of a string
 */
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
