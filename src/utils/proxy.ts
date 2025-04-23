/** @format */

const USER_AGENTS = [
  // Windows browsers
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36",

  // MacOS browsers
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0",

  // Linux browsers
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",

  // mobile Browsers
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
];

const getHeaders = (userAgent: string) => {
  const isWindows = userAgent.includes("Windows");
  const isMac = userAgent.includes("Macintosh");
  const isMobile = userAgent.includes("Mobile");

  return {
    "User-Agent": userAgent,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Ch-Ua":
      userAgent.includes("Chrome") ?
        '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"'
      : null,
    "Sec-Ch-Ua-Mobile": isMobile ? "?1" : "?0",
    "Sec-Ch-Ua-Platform": `"${
      isWindows ? "Windows"
      : isMac ? "macOS"
      : isMobile ? "Android"
      : "Linux"
    }"`,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
  };
};

export const getValidProxy = async () => {
  try {
    const data = await useStorage("assets:server").getItem("proxies.json");
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;

    for (let i = 0; i < parsedData.proxies.length; i++) {
      const randomIndex = Math.floor(Math.random() * parsedData.proxies.length);
      const proxy = parsedData.proxies[randomIndex];
      return proxy;
    }
  } catch (e) {
    console.error(`Error getting valid proxy: ${e}`);
    throw new Error(e);
  }
};

export async function proxyFetch(
  url: string,
  options?: RequestInit,
  retryCount: number = 3,
): Promise<Response> {
  try {
    const proxy = await getValidProxy();
    const proxyUrl = new URL(proxy);
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const defaultHeaders = getHeaders(userAgent);
    proxyUrl.searchParams.set("destination", url);
    const proxyOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options?.headers,
      },
    };

    return fetch(proxyUrl.toString(), proxyOptions);
  } catch (e) {
    if (retryCount > 0) {
      return proxyFetch(url, options, retryCount - 1);
    }
    throw new Error(e);
  }
}
