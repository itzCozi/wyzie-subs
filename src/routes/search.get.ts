/** @format */

import { createErrorResponse, convertTmdbToImdb } from "~/utils/utils";
import { RequestType, ResponseType } from "~/utils/types";
import { search } from "~/utils/function";
import process from "nitropack/presets/_unenv/workerd/process";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  if (!query || !query.id) {
    return createErrorResponse(
      400,
      "Bad request",
      "No id parameter was provided. Please provide an id.",
      "/search?id=286217",
    );
  }

  // all parameters must be lowercase and without spaces
  const id = (query.id as string).toLowerCase();
  const season = query.season ? parseInt(query.season as string) : undefined;
  const episode = query.episode ? parseInt(query.episode as string) : undefined;
  const languages =
    query.language ? (query.language as string).toLowerCase().split(",") : undefined;
  const formats = query.format ? (query.format as string).toLowerCase().split(",") : undefined;
  const encodings =
    query.encoding ? (query.encoding as string).toLowerCase().split(",") : undefined;
  const hearingImpaired = query.hi as boolean | undefined;
  var imdbId: string | undefined;
  var tmdbId: string | undefined;

  if (id.includes("tt")) {
    imdbId = id;
  } else {
    tmdbId = id;
  }

  if (tmdbId) {
    const mediaType = season !== undefined ? "tv" : "movie";
    imdbId = await convertTmdbToImdb(tmdbId, mediaType);
  }

  if (!imdbId || imdbId === null) {
    return createErrorResponse(
      400,
      "Missing required parameter",
      "The provided ID is invalid. Please provide a valid IMDb or TMDb ID.",
    );
  }

  if ((season && !episode) || (!season && episode)) {
    return createErrorResponse(
      400,
      "Both season and episode are required",
      "If episode or season is present the other must also be present. Or else...",
      "/search?id=tt0111161&season=1&episode=1",
    );
  }

  if (languages && !languages.every((lang) => /^[a-z]{2}$/.test(lang))) {
    return createErrorResponse(
      400,
      "Invalid language format",
      "Languages must be in ISO 3166-2 code format, can be independent or in a list.",
      "/search?id=tt0111161&language=en,es,fr",
    );
  }

  if (formats && !formats.every((format) => /^(srt|txt|sub|ssa|ass)$/.test(format))) {
    return createErrorResponse(
      400,
      "Invalid format",
      "Format must be one of the following: srt, txt, sub, ssa, ass.",
      "/search?id=tt0111161&format=srt",
    );
  }

  const request: RequestType = {
    languages,
    formats,
    encodings,
    imdbId,
    season,
    episode,
    hearingImpaired,
  };

  try {
    const startTime = Date.now();
    const data = await search(request);
    const endTime = Date.now();
    const execTime = endTime - startTime;
    console.log(`Execution time: ${execTime}ms`);

    if (!data || data.length === 0) {
      return createErrorResponse(
        400,
        "No subtitles found",
        "No subtitles found for your desired parameters, sorry :(",
      );
    }

    // transformation
    const transformedData = data.map((item: ResponseType) => {
      const originalUrl = item.url;
      let newUrl = originalUrl; // this would never happen but just in case
      const vrfMatch = originalUrl.match(/vrf-([a-z0-9]+)/);
      const fileIdMatch = originalUrl.match(/file\/(\d+)/);

      if (vrfMatch && vrfMatch[1] && fileIdMatch && fileIdMatch[1]) {
        const vrf = vrfMatch[1];
        const fileId = fileIdMatch[1];
        const host =
          process.env.NODE_ENV === "production" ? "https://sub.wyzie.ru" : "http://localhost:3000";
        // add format and encoding as query parameters because you don't know what they are
        const formatParam = item.format ? `format=${encodeURIComponent(item.format)}` : "";
        const encodingParam = item.encoding ? `encoding=${encodeURIComponent(item.encoding)}` : "";
        const queryParams = [formatParam, encodingParam].filter(Boolean).join("&");
        newUrl = `${host}/c/${vrf}/id/${fileId}${queryParams ? "?" + queryParams : ""}`;
      } else {
        console.warn(`Could not parse URL format for: ${originalUrl}`);
      }

      return {
        ...item,
        url: newUrl,
      };
    });

    return new Response(JSON.stringify(transformedData), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return createErrorResponse(
      500,
      "Internal server error",
      `An unexpected error occurred while processing your request. Reach out in the Discord for help. ${e}`,
    );
  }
});
