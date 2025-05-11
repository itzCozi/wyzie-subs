/** @format */

import { createErrorResponse, convertTmdbToImdb } from "~/utils/utils";
import type { RequestType, ResponseType } from "~/utils/types";
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

  const cacheKey = getRequestURL(event).toString();
  // @ts-ignore - caches.default is available in CF Workers runtime
  const isCacheAvailable = typeof caches !== "undefined" && caches.default;
  // @ts-ignore - caches.default is available in CF Workers runtime
  const cache = isCacheAvailable ? caches.default : null;

  if (isCacheAvailable && cache) {
    try {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        console.log(`Cache HIT for: ${cacheKey}`);
        return cachedResponse;
      }
      console.log(`Cache MISS for: ${cacheKey}`);
    } catch (cacheError) {
      console.error(`Cache match error: ${cacheError}`);
    }
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
  const source = query.source ? (query.source as string).toLowerCase() : undefined;
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
      "If episode or season is present the other must also be present. Or else... (shit jus acts up)",
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
      "Format must be one or more of the following: srt, txt, sub, ssa, ass.",
      "/search?id=tt0111161&format=srt",
    );
  }

  if (source) {
    const validSources = ["subdl", "opensubtitles"];
    const sourceList = source.split(",").map((s) => s.trim().toLowerCase());

    if (!sourceList.every((s) => validSources.includes(s))) {
      return createErrorResponse(
        400,
        "Invalid source",
        `Source must be one or more of the following: ${validSources.join(", ")}.`,
        "/search?id=tt0111161&source=subdl,opensubtitles",
      );
    }
  }

  const request: RequestType = {
    languages,
    formats,
    encodings,
    imdbId,
    season,
    episode,
    hearingImpaired,
    source,
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

    const transformedData = data.map((item: ResponseType) => {
      const originalUrl = item.url;
      let newUrl = originalUrl;

      if (item.source === "subdl") {
        const [source, id, filename] = originalUrl.split("/");
        if (source === "subdl" && id && filename) {
          const host =
            process.env.NODE_ENV === "production" ?
              "https://sub.wyzie.ru"
            : "http://localhost:3000";
          const pseudoVrf = id;
          const cleanFilename = filename.endsWith(".zip") ? filename.slice(0, -4) : filename;
          let downloadId = cleanFilename.includes("-") ? cleanFilename : `${id}-${cleanFilename}`;
          newUrl = `${host}/c/${pseudoVrf}/id/${downloadId}.subdl`;
        }
      } else {
        const vrfMatch = originalUrl.match(/vrf-([a-z0-9]+)/);
        const fileIdMatch = originalUrl.match(/file\/(\d+)/);
        if (vrfMatch && vrfMatch[1] && fileIdMatch && fileIdMatch[1]) {
          const vrf = vrfMatch[1];
          const fileId = fileIdMatch[1];
          const host =
            process.env.NODE_ENV === "production" ?
              "https://sub.wyzie.ru"
            : "http://localhost:3000";
          const formatParam = item.format ? `format=${encodeURIComponent(item.format)}` : "";
          const encodingParam =
            item.encoding ? `encoding=${encodeURIComponent(item.encoding)}` : "";
          const queryParams = [formatParam, encodingParam].filter(Boolean).join("&");
          newUrl = `${host}/c/${vrf}/id/${fileId}${queryParams ? "?" + queryParams : ""}`;
        }
      }

      return {
        ...item,
        url: newUrl,
      };
    });

    const finalResponse = new Response(JSON.stringify(transformedData), {
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });

    if (isCacheAvailable && cache && finalResponse.ok) {
      console.log(`Caching successful response with status: ${finalResponse.status}`);
      if (typeof event.waitUntil === "function") {
        event.waitUntil(cache.put(cacheKey, finalResponse.clone()));
      } else {
        await cache.put(cacheKey, finalResponse.clone());
      }
    } else if (isCacheAvailable && cache) {
      console.log(`Not caching response with status: ${finalResponse.status}`);
    }

    return finalResponse;
  } catch (e) {
    return createErrorResponse(
      500,
      "Internal server error",
      `An unexpected error occurred while processing your request. Reach out in the Discord for help. ${e}`,
    );
  }
});
