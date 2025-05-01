/** @format */

import { proxyFetch } from "~/utils/proxy";
import { createErrorResponse } from "~/utils/utils";
import { unzipAndExtractSubtitle } from "~/utils/unzip";

const formatToMimeType: Record<string, string> = {
  srt: "text/plain",
  ass: "text/plain",
  ssa: "text/plain",
  vtt: "text/vtt",
  sub: "text/plain",
  txt: "text/plain",
  zip: "application/zip", // Add support for ZIP files from SubDL
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
  const autoUnzip = query.autoUnzip !== "false"; // Default to true

  console.log(`Handling request for /c/${vrf}/id/${fileId}?format=${format}&encoding=${encoding}`);

  if (!vrf || !fileId) {
    return createErrorResponse(400, "Bad Request", "Missing vrf or fileId parameter.");
  }

  // subdl url check (fileId ends with .subdl)
  const isSubDL = fileId.toLowerCase().endsWith(".subdl");
  let targetUrl: string;

  if (isSubDL) {
    // handle subdl url
    // Extract the real filename by removing the .subdl extension
    const realFileId = fileId.slice(0, -6); // remove ".subdl"

    // for subdl, we need to add back .zip extension if not present
    const subdlFilename = realFileId.endsWith(".zip") ? realFileId : `${realFileId}.zip`;

    // the correct subdl url format is dl.subdl.com/subtitle/{ID-FILEID}.zip
    targetUrl = `https://dl.subdl.com/subtitle/${subdlFilename}`;
    console.log(`SubDL download URL: ${targetUrl}`);

    // for subdl zip, we can auto-extract srt file if requested
    if (isSubDL && autoUnzip) {
      try {
        console.log(`[SubDL] Auto-extracting subtitle from ZIP file: ${targetUrl}`);
        const extractResult = await unzipAndExtractSubtitle(targetUrl);

        // add detailed log of the extract result
        console.log(
          `[SubDL] Extract result:`,
          JSON.stringify({
            success: extractResult.success,
            hasContent: !!extractResult.content,
            filename: extractResult.filename,
            contentLength: extractResult.content?.length,
            binary: extractResult.binary,
            error: extractResult.error,
          }),
        );

        if (!extractResult.success) {
          console.error(
            `[SubDL] Failed to extract subtitle: ${extractResult.error || "Unknown error"}`,
          );

          // return error instead of falling back to direct download
          return createErrorResponse(
            500,
            "Subtitle Extraction Failed",
            `Could not extract subtitle from ZIP: ${extractResult.error || "Unknown error"}`,
          );
        } else {
          // process based on whether it's binary or text content
          if (extractResult.binary && extractResult.buffer) {
            // for binary subtitles, return the buffer with appropriate content type
            const fileExt = extractResult.filename?.split(".").pop()?.toLowerCase() || "sub";
            const mimeType =
              fileExt === "idx" ? "application/x-mplayer2" : "application/octet-stream";

            // create response with binary data
            const finalResponse = new Response(extractResult.buffer, {
              headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=31536000, immutable",
                "Content-Disposition": `attachment; filename="${extractResult.filename}"`,
              },
            });

            // cache this response
            if (isCacheAvailable && cache && finalResponse && finalResponse.ok) {
              if (typeof event.waitUntil === "function") {
                event.waitUntil(cache.put(cacheKey, finalResponse.clone()));
              } else {
                await cache.put(cacheKey, finalResponse.clone());
              }
            }

            return finalResponse;
          } else if (extractResult.content) {
            // for text-based subtitles, proceed as before
            // get format from the extracted filename or fallback to default
            const extractedFormat =
              extractResult.filename?.split(".").pop()?.toLowerCase() || "srt";
            const mimeType = formatToMimeType[extractedFormat] || "text/plain";
            const charset = encoding ? encoding : "utf-8";
            const contentType = `${mimeType}; charset=${charset}`;

            // create the response with the extracted text content
            const finalResponse = new Response(extractResult.content, {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
                "Content-Disposition": `inline; filename="${extractResult.filename}"`,
              },
            });

            // cache this response
            if (isCacheAvailable && cache && finalResponse && finalResponse.ok) {
              if (typeof event.waitUntil === "function") {
                event.waitUntil(cache.put(cacheKey, finalResponse.clone()));
              } else {
                await cache.put(cacheKey, finalResponse.clone());
              }
            }

            return finalResponse;
          } else {
            // this shouldn't happen if success=true, but handle it just in case
            return createErrorResponse(
              500,
              "Subtitle Processing Error",
              "Subtitle was successfully extracted but no content was found",
            );
          }
        }
      } catch (extractError) {
        console.error(`[SubDL] Error during subtitle extraction: ${extractError}`);
        // if extraction fails, then  say fail, we will not  give download to zip
      }
    }
  } else {
    // handle regular opensub url
    targetUrl = `https://dl.opensubtitles.org/en/download/subencoding-utf8/src-api/vrf-${vrf}/file/${fileId}`;
  }

  try {
    // use different headers depending on the source
    const headers =
      isSubDL ?
        {} // subdl doesn't need special headers
      : { "X-User-Agent": "VLSub 0.10.3" }; // opensub needs this header

    // always use proxyFetch to avoid ratelimit (subdl has ratelimit)
    response = await proxyFetch(targetUrl, { headers });

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

    // check content type based on actual file format
    let actualFormat = format;
    if (!actualFormat && fileId) {
      // extract format from filename if not specified in query
      const filenameParts =
        isSubDL ?
          fileId.slice(0, -6).split(".") // remove .subdl and get extension
        : fileId.split(".");

      if (filenameParts.length > 1) {
        actualFormat = filenameParts.pop()?.toLowerCase();
      }
    }

    // for subdl, always use zip as the format
    if (isSubDL) {
      actualFormat = "zip";
    }

    const mimeType = actualFormat ? formatToMimeType[actualFormat] || "text/plain" : "text/plain";
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
