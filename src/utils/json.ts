import { Subtitle, SubtitleInput } from "~/utils/types";

export function parseSubtitles(jsonString: string): Subtitle[] {
  const fragments = jsonString.split('{"MatchedBy":"imdbid"');
  const results: Subtitle[] = [];

  for (let i = 1; i < fragments.length; i++) {
    const fragment = '{"MatchedBy":"imdbid"' + fragments[i];
    const regex = /,"Score":[^}]+}/;
    const match = fragment.match(regex);

    if (match) {
      const completeFragment = fragment.substring(0, match.index + match[0].length);

      try {
        const jsonObject = JSON.parse(completeFragment);

        if (isValidSubtitle(jsonObject)) {
          results.push(jsonObject);
        }
      } catch (error) {
        console.error("Invalid JSON fragment:", completeFragment, error);
      }
    }
  }

  return results;
}

function isValidSubtitle(obj: SubtitleInput): obj is Subtitle {
  return (
    typeof obj.ISO639 === "string" &&
    typeof obj.LanguageName === "string" &&
    typeof obj.SubHearingImpaired === "string" &&
    typeof obj.IDSubtitleFile === "string" &&
    typeof obj.SubFormat === "string" &&
    typeof obj.MovieName === "string" &&
    typeof obj.SubEncoding === "string" &&
    typeof obj.SubDownloadLink === "string"
  );
}