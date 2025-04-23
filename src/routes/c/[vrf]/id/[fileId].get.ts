/** @format */

import { proxyFetch } from "~/utils/proxy";
import { createErrorResponse } from "~/utils/utils";

const formatToMimeType: Record<string, string> = {
  srt: "text/plain",
  ass: "text/plain",
  ssa: "text/plain",
  vtt: "text/vtt",
  sub: "text/plain",
  txt: "text/plain",
};

export default defineEventHandler(async (event) => {
  console.log("typeof global caches:", typeof caches);
  console.log("event.context.cloudflare object:", event.context.cloudflare);
  let response: Response | undefined; // resp

  // glboal cache api https://developers.cloudflare.com/workers/runtime-apis/cache/
  // @ts-ignore - caches.default is available in CF Workers runtime
  const isCacheAvailable = typeof caches !== "undefined" && caches.default;
  // @ts-ignore - caches.default is available in CF Workers runtime
  const cache = isCacheAvailable ? caches.default : null;
  const cacheKey = getRequestURL(event).toString();

  if (isCacheAvailable && cache) {
    try {
      response = await cache.match(cacheKey);
      if (response) {
        console.log(`Cache HIT for: ${cacheKey}`);
        return response;
      }
      console.log(`Cache MISS for: ${cacheKey}`);
    } catch (cacheError) {
      console.error(`Cache match error: ${cacheError}`);
    }
  } else {
    console.log(
      "Cache API not available (via event.context.cloudflare.caches), skipping cache check.",
    );
  }

  // get params
  const vrf = event.context.params?.vrf;
  const fileId = event.context.params?.fileId;
  const query = getQuery(event);
  const format = query.format as string | undefined;
  const encoding = query.encoding as string | undefined;

  console.log(`Handling request for /c/${vrf}/id/${fileId}?format=${format}&encoding=${encoding}`);

  if (!vrf || !fileId) {
    return createErrorResponse(400, "Bad Request", "Missing vrf or fileId parameter.");
  }

  const targetUrl = `https://dl.opensubtitles.org/en/download/subencoding-utf8/src-api/vrf-${vrf}/file/${fileId}`;

  try {
    response = await proxyFetch(targetUrl, {
      headers: { "X-User-Agent": "VLSub 0.10.3" },
    });

    if (!response || !response.ok) {
      const status = response?.status || "unknown";
      const statusText = response?.statusText || "unknown";
      console.error(`Failed to fetch subtitle: ${status} ${statusText}`);
      return createErrorResponse(
        502,
        "Failed to fetch subtitle",
        `Upstream server responded with status: ${status}`,
      );
    }

    // raw data
    const subtitleContent = await response.arrayBuffer();

    const mimeType = format ? formatToMimeType[format.toLowerCase()] || "text/plain" : "text/plain";
    const charset = encoding ? encoding : "utf-8";
    const contentType = `${mimeType}; charset=${charset}`;

    const finalResponse = new Response(subtitleContent, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    // cache the final response if cache is ok and response is valid
    if (isCacheAvailable && cache && finalResponse && finalResponse.ok) {
      if (typeof event.waitUntil === "function") {
        event.waitUntil(cache.put(cacheKey, finalResponse.clone()));
      } else {
        console.warn(
          "event.waitUntil is not available globally. Caching might not be performed asynchronously.",
        );
        await cache.put(cacheKey, finalResponse.clone());
      }
    }

    return finalResponse;
  } catch (error) {
    console.error(`Error fetching subtitle: ${error}`);
    return createErrorResponse(
      500,
      "Internal Server Error",
      "An error occurred while fetching the subtitle.",
    );
  }
});
