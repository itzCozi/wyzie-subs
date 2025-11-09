/** @format */

import { subtle } from "crypto";
import { USER_AGENTS } from "~/utils/userAgents";

const getHeaders = (userAgent: string, extraHeaders: Record<string, string> = {}) => {
  const isMobile = userAgent.includes("Mobile") || userAgent.includes("Android");
  const isWindows = userAgent.includes("Windows");
  const isMac = userAgent.includes("Macintosh");
  const isLinux = userAgent.includes("Linux");

  let chromeVersion = "137";
  const chromeMatch = userAgent.match(/Chrome\/([0-9]+)/);
  if (chromeMatch && chromeMatch[1]) {
    chromeVersion = chromeMatch[1];
  }

  const defaultHeaders = {
    "User-Agent": userAgent,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Ch-Ua":
      userAgent.includes("Chrome") ?
        `"Chromium";v="${chromeVersion}", "Not(A:Brand";v="24", "Google Chrome";v="${chromeVersion}"`
      : null,
    "Sec-Ch-Ua-Mobile": isMobile ? "?1" : "?0",
    "Sec-Ch-Ua-Platform": `"${
      isMobile && !isWindows && !isMac ? "Android"
      : isWindows ? "Windows"
      : isMac ? "macOS"
      : isLinux ? "Linux"
      : "Unknown"
    }"`,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
  };

  return { ...defaultHeaders, ...extraHeaders };
};

async function deriveToken(sharedSecret: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await subtle.sign("HMAC", keyMaterial, encoder.encode(sharedSecret));

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxyFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const proxy =
      process.env.NODE_ENV === "production" ? "https://proxy.ar0.eu" : "http://83.229.17.104";
    const proxyUrl = new URL(proxy);
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const defaultHeaders = getHeaders(userAgent);
    const sharedSecret = process.env.PROXY_SECRET;
    if (!sharedSecret || sharedSecret.trim() === "") {
      throw new Error("PROXY_SECRET is not set");
    }
    const apiToken = await deriveToken(sharedSecret, userAgent);
    proxyUrl.searchParams.set("url", url);

    const proxyOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options?.headers,
        "API-Token": apiToken,
        Referer: options?.headers?.["Referer"] || "",
        Origin: options?.headers?.["Origin"] || null,
      },
    };

    return fetch(proxyUrl.toString(), proxyOptions);
  } catch (e) {
    console.error("Proxy fetch error:", e);
    throw new Error(`Proxy request failed: ${e.message}`);
  }
}
