/** @format */

import { createErrorResponse, convertTmdbToImdb } from "~/utils/utils";
import { RequestType } from "~/utils/types";
import { search } from "~/utils/function";

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

  const id = query.id as string;
  const season = query.season ? parseInt(query.season as string) : undefined;
  const episode = query.episode ? parseInt(query.episode as string) : undefined;
  const language = query.language as string | undefined;
  const format = query.format as string | undefined;
  const hearingImpaired = query.hi as boolean | undefined;
  let imdbId: string | undefined;
  let tmdbId: string | undefined;

  if (id.includes("tt")) {
    imdbId = id;
  } else {
    tmdbId = id;
  }

  if (tmdbId) {
    const mediaType = season !== undefined ? "tv" : "movie";
    imdbId = await convertTmdbToImdb(tmdbId, mediaType);
  }

  if (!imdbId) {
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

  if (language && !/^[a-z]{2,3}(-[A-Z]{2})?(,[a-z]{2,3}(-[A-Z]{2})?)*$/.test(language)) {
    return createErrorResponse(
      400,
      "Invalid language format",
      "Languages must be in ISO 639-1 or ISO 639-2 format, optionally followed by a region code, separated by commas.",
      "/search?id=tt0111161&language=en,es,fr-FR",
    );
  }

  if (format && !/^(srt|ass|vtt|txt|sub|mpl|webvtt|dfxp|ssa)$/.test(format)) {
    return createErrorResponse(
      400,
      "Invalid format",
      "Format must be one of the following: srt, ass, ssa, vtt, txt, sub, mpl, webvtt, dfxp.",
      "/search?id=tt0111161&format=srt",
    );
  }

  const request: RequestType = { imdbId, season, episode, format };

  try {
    const languages = language ? language.split(",") : undefined;
    const startTime = Date.now();
    const data = await search(request, languages, hearingImpaired);
    const endTime = Date.now();
    const execTime = endTime - startTime;
    console.log(`Execution time: ${execTime}ms`);

    if (data.length === 0) {
      return createErrorResponse(
        400,
        "No subtitles found",
        "No subtitles found for your desired parameters, sorry :(",
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.log(error);
    return createErrorResponse(
      500,
      "Internal server error",
      "An unexpected error occurred while processing your request. Our team has been notified.",
    );
  }
});
