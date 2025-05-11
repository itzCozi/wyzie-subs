/**
 * format direct
 * @format
 */

import unzipjs from "~/lib/unzipjs.min.js";
import { proxyFetch } from "~/utils/proxy";
import type { UnzipItem, SubtitleExtractResult } from "~/utils/types";

/**
 * Sherlock holme the sub files
 */
function isBinarySubtitleFormat(filename: string, buffer: ArrayBuffer): boolean {
  const lowerName = filename.toLowerCase();

  // The usual suspects 🕵️‍♂️
  if (lowerName.endsWith(".sub") || lowerName.endsWith(".idx")) {
    //  "Is it MicroDVD or VobSub?"
    // MicroDVD be like: {x}{y}Text

    // check first few bytes
    try {
      const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 100)));
      const sample = String.fromCharCode.apply(null, Array.from(bytes));

      // looking for those curly bracket  {x}{y}
      if (sample.match(/^\{[0-9]+\}\{[0-9]+\}/)) {
        console.log("[SubDL Unzip] microdvd found");
        return false;
      }

      // binary soup? bad luck for wyzie
      console.log("[SubDL Unzip] def vobsub?");
      return true;
    } catch (e) {
      console.warn(`[SubDL Unzip] Error checking.sub format: ${e} `);
      // when not sure, assume it's binary (better safe than sorry 🤷‍♂️)
      return true;
    }
  }

  return false;
}

/**
 * Converts MicroDVD to SRT
 */
function convertMicroDVDToSRT(content: string, fps: number = 25): string {
  try {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    let srtContent = "";
    let counter = 1;

    for (const line of lines) {
      // play pattern matching
      const match = line.match(/^\{(\d+)\}\{(\d+)\}(.*)/);
      if (!match) continue;

      const startFrame = parseInt(match[1]);
      const endFrame = parseInt(match[2]);
      const text = match[3];

      // converting frames to time like a wyzie wizard
      const startTime = frameToSRTTime(startFrame, fps);
      const endTime = frameToSRTTime(endFrame, fps);

      srtContent += `${counter}\n${startTime} --> ${endTime}\n${text}\n\n`;
      counter++;
    }

    return srtContent;
  } catch (e) {
    console.error(`[SubDL Unzip] conversion failed: ${e} `);
    return content; // return original
  }
}

/**
 * Turns frames into timestamps
 * Warning: May cause temporal displacement. jk
 */
function frameToSRTTime(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")},${milliseconds.toString().padStart(3, "0")}`;
}

/**
 * checks  if text is having an identity crisis
 * (AKA: is this text actually readable or just baddev's weed talk?)
 */
function hasGarbledText(text: string): boolean {
  if (!text || text.length === 0) return true;

  // looking for the dreaded replacement character
  const replacementChar = "\uFFFD";
  const replacementCount = (text.match(new RegExp(replacementChar, "g")) || []).length;

  // these patterns are like the sad face of text encoding
  const garbledPatterns = [
    "\uFFFD\uFFFD", // double trouble
    "\uFFFD[A-Za-z]", // when characters play dress-up with me
    "[A-Za-z]\uFFFD", // identity crisis mid-word
    "\uFFFD\uFFFD\uFFFD", // the three stooges of encoding
    "\uFFFE", // The character that should not be named
    "\uFFFF", // its evil twin, quite literally
  ];

  let totalGarbledCount = replacementCount;

  // count  the mess
  for (const pattern of garbledPatterns) {
    try {
      const matches = text.match(new RegExp(pattern, "g")) || [];
      totalGarbledCount += matches.length;
    } catch (e) {
      console.warn(`[SubDL Unzip] this pattern is not good: ${pattern} `);
    }
  }

  const ratio = totalGarbledCount / text.length;

  // if more than 5% is garbled, we've got a problem
  return ratio > 0.05;
}

/**
 * BOM removal service
 * byte order marker
 */
function stripBOM(content: string): string {
  // bye  uft-8 bom, never missed u
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * bad devs sub cleaner  treatment
 * he's good in  removing the gunk, smoothing  out the wrinkles, and make your subtitles beautiful again
 */
function cleanSubtitleText(text: string): string {
  if (!text) return "";
  text = stripBOM(text);
  text = text.replace(/^[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]+/, "");
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text;
}

/**
 * The United Nations of Text Encodings! (thats where bad dev loves to live)
 * we've got more encodings than you can fathom
 * (though why you're trying to fathom sub encodings  is beyond me)
 * yes i read all the purpose of these encodings
 */
const ENCODING_ATTEMPTS = [
  "utf-7", // legacy internet mail encoding
  "us-ascii", // plain 7-bit ASCII
  "utf-8", // the cool kid
  "windows-1256", // arabi sheikhs' BFF
  "iso-8859-6", // arabi sheikhs' other BFF
  "windows-1252", // west europe's party animal
  "iso-8859-1", // its latin; thought about latina? grow up
  "windows-1251", // in soviet russia, text encodes YOU, COMRADE
  "iso-8859-5", // cyrillic's cousin
  "iso-8859-2", // central europe's favorite
  "windows-1250", // the windows that central europe actually likes
  "iso-8859-7", // its all greek to me
  "windows-1253", // windows goes greek
  "iso-8859-9", // turkish kebab
  "windows-1254", // windows consumed turkish kebab
  "big5", // traditional chinese; size matters! (wink wink)
  "gbk", // simplified chinese
  "shift-jis", // japanese shifting into high gear for that epic drift
  "euc-jp", // another japanese contender
  "euc-kr", // korean encoding (no it is NOT kpop)
  "utf-16le", // unicode's "little" sibling
  "utf-16be", // unicode's "big" sibling
  "utf-32le", // unicode's "giant" little sibling
  "utf-32be", // unicode's "giant" big sibling
  "iso-8859-8", // jewish hangout
  "windows-1255", // windows speaks jewish; it's like american talking jewish to jews, funny
  "iso-8859-8-i", // logical Hebrew
  "iso-2022-jp", // japanese email encoding
  "iso-2022-cn", // chinese email encoding
  "iso-2022-kr", // korean email encoding
  "koi8-r", // russian cyrillic encoding
  "koi8-u", // ukrainian cyrillic encoding
  "macintosh", // mac roman encoding
  "macroman", // older mac encoding
  "ibm850", // DOS western europe
  "ibm437", // DOS US
  "gb18030", // modern chinese encoding
  "hz-gb-2312", // simplified chinese
  "tis-620", // thai encoding
  "windows-874", // windows thai encoding
  "x-mac-cyrillic", // mac cyrillic
  "x-mac-greek", // mac greek
  "x-mac-turkish", // mac turkish
  "x-mac-hebrew", // mac hebrew
  "x-mac-arabic", // mac arabic
  "iso-8859-3", // south european, esperanto, maltese
  "iso-8859-4", // baltic languages, greenlandic, sami
  "iso-8859-10", // nordic languages (sami, inuit)
  "iso-8859-13", // baltic languages redux
  "iso-8859-14", // celtic languages, because druids need subtitles too
  "iso-8859-15", // western european with euro sign, fancy!
  "iso-8859-16", // romanian and other southeast european
  "windows-1257", // windows baltic, for when windows goes sailing
  "windows-1258", // windows vietnamese, phở your viewing pleasure
  "x-mac-romanian", // mac's romanian vacation
  "x-mac-ukrainian", // mac goes to kyiv
  "cp437", // original IBM PC character set, retro cool
  "cp850", // DOS multilingual, for multinational DOS lovers
  "cp852", // DOS central european, communist DOS
  "cp866", // DOS cyrillic, for soviet DOS enthusiasts
  "viscii", // vietnamese, more than just good soup
  "x-mac-ce", // mac central european, apple's eastern expansion
];

/**
 * Our sheikh arabia  text detective
 */
function isLikelyArabic(text: string): boolean {
  // look at that hot regex
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  // arabia?
  return arabicRegex.test(text);
}

/**
 * the text readability judge
 * giving red buttons like simon cowell, but probably more merciful
 */
function isReadableText(text: string): number {
  if (!text || text.length < 10) return 0;

  const hasNumbers = /\d+/.test(text);
  const hasLetters = /[A-Za-z]/.test(text);
  const hasArabic = isLikelyArabic(text);
  const hasPunctuation = /[.,!?;:]/.test(text);
  const hasReasonableLineLength = text
    .split("\n")
    .some((line) => line.length > 5 && line.length < 100);

  const hasTimestamps = /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(text);
  const hasSequentialNumbering = /^\s*\d+\s*\n/.test(text);

  let score = 0;
  if (hasNumbers) score += 1; // num is  nice
  if (hasLetters || hasArabic) score += 3; // letters are nicer
  if (hasPunctuation) score += 1; // silly punc
  if (hasReasonableLineLength) score += 2; // reasonable?

  if (hasTimestamps) score += 3;
  if (hasSequentialNumbering) score += 2;

  if (hasGarbledText(text)) score -= 3;

  if (hasArabic && text.includes("-->")) score += 3;

  return score;
}

/**
 * main

 * (just learnt what dazecore is, i think thats my aesthetic)
 */
export async function unzipAndExtractSubtitle(url: string): Promise<SubtitleExtractResult> {
  try {
    console.log(`[SubDL Unzip] Time to go zip hunting! 🎯 Target: ${url}`);

    const response = await proxyFetch(url);

    if (!response || !response.ok) {
      const status = response?.status || "unknown";
      const statusText = response?.statusText || "unknown";
      console.error(`[SubDL Unzip] zip file played hard to get: ${status} ${statusText}`);

      return {
        success: false,
        error: `Failed to fetch subtitle: ${status} ${statusText}`,
      };
    }

    // Getting that sweet, sweet array buffer
    const arrayBuffer = await response.arrayBuffer();
    console.log(`[SubDL Unzip] got the zip! it's ${arrayBuffer.byteLength} bytes thick`);

    // Time to unzip! 🤐
    console.log("[SubDL Unzip] unzipping");
    const startTime = performance.now();

    const unzipped: UnzipItem[] = unzipjs.parse(arrayBuffer);

    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(
      `[SubDL Unzip] unzipped in ${duration.toFixed(2)}ms! found ${unzipped.length} weed bags inside`,
    );

    if (unzipped.length === 0) {
      return {
        success: false,
        error: "ZIP file is empty",
      };
    }

    const textSubtitleExtensions = [".srt", ".ssa", ".ass", ".vtt"];
    const allSubtitleExtensions = [...textSubtitleExtensions, ".sub", ".idx", ".txt"];

    // first, try to find the text-based ones
    let subtitleItem = unzipped.find((item) =>
      textSubtitleExtensions.some((ext) => item.name.toLowerCase().endsWith(ext)),
    );

    // if no text-based found, we'll take any subtitle we can get
    if (!subtitleItem) {
      subtitleItem = unzipped.find((item) =>
        allSubtitleExtensions.some((ext) => item.name.toLowerCase().endsWith(ext)),
      );
    }

    // last resort - just grab the first file and hope for the best
    if (!subtitleItem && unzipped.length > 0) {
      subtitleItem = unzipped[0];
      console.log(
        `[SubDL Unzip] no subtitle file found, but we'll try this one: ${subtitleItem.name}`,
      );
    }

    if (!subtitleItem) {
      return {
        success: false,
        error: "no subtitle file found",
      };
    }

    const isBinary = isBinarySubtitleFormat(subtitleItem.name, subtitleItem.buffer);

    if (isBinary) {
      console.log(`[SubDL Unzip] found a binary subtitle! fancy! ${subtitleItem.name}`);
      return {
        success: true,
        filename: subtitleItem.name,
        binary: true,
        buffer: subtitleItem.buffer,
        content: `Binary subtitle format: ${subtitleItem.name} (it's not text, but it's honest work 👨‍🌾)`,
      };
    }

    return extractTextContent(subtitleItem);
  } catch (error: any) {
    console.error("[SubDL Unzip] Everything went wrong! 😱", error);
    return {
      success: false,
      error: "Something broke! Time to blame it on the intern... 😅",
      details: error.message || String(error),
    };
  }
}

/**
 * extract text content
 * we extract text like a dentist extracts teeth, but silent like the lambs (WATCH THE  SILENCE OF THE LAMBS)
 */
function extractTextContent(subtitleItem: UnzipItem): SubtitleExtractResult {
  try {
    let textContent: string | undefined;
    let bestTextContent: string | undefined;
    let bestEncoding: string | undefined;

    console.log(`[SubDL Unzip] time to work our magic on: ${subtitleItem.name}`);

    try {
      const buffer = subtitleItem.buffer;
      const uint8Array = new Uint8Array(buffer);

      let highestQualityScore = -1;

      for (const encoding of ENCODING_ATTEMPTS) {
        try {
          const decoder = new TextDecoder(encoding, { fatal: false });
          const decoded = decoder.decode(uint8Array);

          console.log(`[SubDL Unzip] trying ${encoding}`);

          if (decoded && decoded.trim().length > 0) {
            const cleaned = cleanSubtitleText(decoded);

            const readabilityScore = isReadableText(cleaned);
            const isGarbled = hasGarbledText(cleaned);

            const qualityScore = readabilityScore + (isGarbled ? -5 : 5);

            console.log(
              `[SubDL Unzip] ${encoding} scored ${qualityScore}! ${isGarbled ? "🤢" : "🌟"}`,
            );

            if (
              isLikelyArabic(cleaned) &&
              (encoding === "windows-1256" || encoding === "iso-8859-6")
            ) {
              console.log(`[SubDL Unzip] found arabic text! habibi!`);
              const arabicBonus = 5;
              const adjustedScore = qualityScore + arabicBonus;
              console.log(`[SubDL Unzip] arabic bonus points,  +${arabicBonus}`);

              if (adjustedScore > highestQualityScore) {
                highestQualityScore = adjustedScore;
                bestTextContent = cleaned;
                bestEncoding = encoding;

                if (adjustedScore >= 10) {
                  console.log(`[SubDL Unzip] we found the one ${encoding}`);
                  break;
                }
              }
            } else if (qualityScore > highestQualityScore) {
              highestQualityScore = qualityScore;
              bestTextContent = cleaned;
              bestEncoding = encoding;

              if (qualityScore >= 10) {
                console.log(`[SubDL Unzip] perfect match ${encoding}`);
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`[SubDL Unzip] ${encoding},  Error: ${e}`);
        }
      }

      // use the best encoding we found
      if (bestTextContent && bestEncoding) {
        console.log(`[SubDL Unzip] and the winner is... ${bestEncoding}`);
        textContent = bestTextContent;

        const preview = textContent
          .substring(0, 200)
          .replace(/\n/g, "\\n")
          .replace(/[^\x20-\x7E]/g, ".");
        console.log(`[SubDL Unzip] sneak peek, ${preview}...`);

        if (
          subtitleItem.name.toLowerCase().endsWith(".sub") &&
          textContent.match(/^\{[0-9]+\}\{[0-9]+\}/)
        ) {
          console.log(`[SubDL Unzip] time for a microdvd makeover`);
          textContent = convertMicroDVDToSRT(textContent);

          const baseName = subtitleItem.name.slice(0, -4);
          subtitleItem.name = `${baseName}.srt`;
        }
      }
    } catch (decodingError) {
      console.error(`[SubDL Unzip] decoding went wrong!  ${decodingError}`);
    }

    if (!textContent || textContent.trim().length === 0 || hasGarbledText(textContent)) {
      try {
        console.log("[SubDL Unzip] time to get our hands dirty");
        const uint8Array = new Uint8Array(subtitleItem.buffer);
        const rawString = Array.from(uint8Array)
          .map((b) => String.fromCharCode(b))
          .join("");

        if (subtitleItem.name.toLowerCase().endsWith(".sub")) {
          const lines = [];
          const regex = /\{(\d+)\}\{(\d+)\}([^\n\r]*)/g;
          let match;

          while ((match = regex.exec(rawString)) !== null) {
            lines.push(`{${match[1]}}{${match[2]}}${match[3]}`);
          }

          if (lines.length > 0) {
            console.log(`[SubDL Unzip] Found ${lines.length} lines! We struck gold! 💰`);
            textContent = lines.join("\n");
            textContent = convertMicroDVDToSRT(textContent);

            const baseName = subtitleItem.name.slice(0, -4);
            subtitleItem.name = `${baseName}.srt`;
          }
        }
        // for srt files
        else if (subtitleItem.name.toLowerCase().endsWith(".srt")) {
          const regex =
            /(\d+)\s*\r?\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+\s*\r?\n|\s*$)/g;
          const entries = [];
          let match;

          while ((match = regex.exec(rawString)) !== null) {
            entries.push(`${match[1]}\n${match[2]} --> ${match[3]}\n${match[4]}`);
          }

          if (entries.length > 0) {
            console.log(`[SubDL Unzip] Found ${entries.length} SRT entries! Party time! 🎉`);
            textContent = entries.join("\n\n");
          }
        }

        if (!textContent || textContent.trim().length === 0 || hasGarbledText(textContent)) {
          console.log("[SubDL Unzip] time for plan z");
          // Make regex more efficient by avoiding unnecessary character classes
          const textRegex = /[\w\s.,!?;:'"()\[\]{}<>\/\\|@#$%^&*+=_-]{10,}/g;
          const textMatches = rawString.match(textRegex) || [];

          // Add additional filtering for quality
          const filteredMatches = textMatches.filter((match) => {
            // Filter out matches that don't have enough letter characters
            return /[a-zA-Z]{3,}/.test(match);
          });

          if (filteredMatches.length > 0) {
            console.log(
              `[SubDL Unzip] Found ${filteredMatches.length} text chunks! Better than nothing! 🤷‍♂️`,
            );
            textContent = filteredMatches.join("\n\n");
          }
        }

        if (textContent) {
          textContent = cleanSubtitleText(textContent);
        }
      } catch (regexError) {
        console.error(`[SubDL Unzip] Regex failed,  Error: ${regexError}`);
      }
    }

    if (!textContent || textContent.trim().length === 0 || hasGarbledText(textContent)) {
      try {
        console.log(`[SubDL Unzip] last chance`);
        const rawContent = subtitleItem.toString();

        if (rawContent && rawContent.length > 0) {
          console.log(`[SubDL Unzip] toString() actually worked, probably the rarest of all cases`);
          textContent = cleanSubtitleText(rawContent);
        }
      } catch (toStringError) {
        console.warn(`[SubDL Unzip] toString() abandoned us ${toStringError}`);
      }
    }

    if (!textContent || textContent.trim().length === 0) {
      console.error("[SubDL Unzip] we tried everything,  time to go home");

      try {
        const uint8Array = new Uint8Array(subtitleItem.buffer);
        let hexDump = "";
        const blockSize = 16;

        for (let i = 0; i < Math.min(uint8Array.length, 512); i += blockSize) {
          const block = uint8Array.slice(i, i + blockSize);
          const hex = Array.from(block)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ");
          const ascii = Array.from(block)
            .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
            .join("");
          hexDump += `${i.toString(16).padStart(8, "0")}: ${hex.padEnd(blockSize * 3, " ")} ${ascii}\n`;
        }

        return {
          success: false,
          error: "this subtitle file is empty",
          filename: subtitleItem.name,
          details: `File size: ${subtitleItem.buffer.byteLength} bytes. hexdump (for the nerds):\n${hexDump}`,
        };
      } catch (hexError) {
        console.error(`[SubDL Unzip] even hexdump failed: ${hexError}`);
      }

      return {
        success: false,
        error: "We couldn't process this subtitle file.",
        filename: subtitleItem.name,
      };
    }

    if (hasGarbledText(textContent)) {
      console.warn("[SubDL Unzip] text is bad");
    }

    const cleanPreview = textContent
      .substring(0, 200)
      .replace(/\n/g, "\\n")
      .replace(/[^\x20-\x7E]/g, ".");
    console.log(`[SubDL Unzip] epic success  ${subtitleItem.name}:\n---\n${cleanPreview}...\n---`);

    return {
      success: true,
      content: textContent,
      filename: subtitleItem.name,
    };
  } catch (extractError) {
    console.error(`[SubDL Unzip] Error extracting text: ${extractError}`);
    return {
      success: false,
      error: `Failed to extract text from ${subtitleItem.name}`,
      details: extractError instanceof Error ? extractError.message : String(extractError),
    };
  }
}
