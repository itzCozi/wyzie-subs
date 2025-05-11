<p align="center">
  <a href="https://sub.wyzie.ru/">
    <img src="https://i.postimg.cc/L5ppKYC5/cclogo.png" height="120">
    <h1 align="center">Wyzie Subs</h1>
  </a>
</p>

## A simple easy to use Subtitle Scraper API

### Features
- **Simple**: Just send a request to the API with the TMDB or IMDB ID of the movie or TV show and get the subtitles for.
- **Fast**: The API is hosted on a edge cloud provider with multiple proxies for spoofing requests (response time varies).
- **Free**: The API is completely free to use and has no rate limits (don't abuse this please 🙏).
- **Open-Source**: The API is open-source and you can host it yourself if you want to.

### Request Flow Chart
![request flow chart](.github/flowchart.png)

### Usage Example

Please note: the `id` url parameter can be used interchangable with either a TMDB ID or an IMDB ID. It checks for "tt" to determine if it's an IMDB ID or not. Using a TMDB ID is slower as we have to request the IMDB ID from TMDB first.
<sup>
  All parameters work with both TMDB and IMDB IDs, aswell as shows and movies.
</sup>

### Search by IMDB / TMDB ID
```http
GET https://sub.wyzie.ru/search?id=872585  // Fetching subtitles for the movie "Oppenheimer" with the TMDB ID
GET https://sub.wyzie.ru/search?id=tt1877830  // Fetching subtitles for the movie "The Batman" with the IMDB ID
GET https://sub.wyzie.ru/search?id=126506&season=1&episode=1  // Fetching subtitles for the show "Smiling Friends" S1E1 with the TMDB ID
GET https://sub.wyzie.ru/search?id=tt2861424&season=1&episode=1  // Fetching subtitles for the show "Rick and Morty" S1E1 with the IMDB ID
```

### Search by language
```http
GET https://sub.wyzie.ru/search?id=872585&&language=en  // Fetching English subtitles for the movie "Oppenheimer" with the TMDB ID
GET https://sub.wyzie.ru/search?id=tt1877830&&language=ru  // Fetching Russian subtitles for the movie "The Batman" with the IMDB ID
```

### Search by format
<sup>
  Available formats are: srt, ass, vtt, txt, sub, mpl, webvtt, dfxp
</sup>

```http
GET https://sub.wyzie.ru/search?id=872585&format=srt  // Fetching subtitles in SRT format for the movie "Oppenheimer" with the TMDB ID
GET https://sub.wyzie.ru/search?id=tt1877830&format=srt  // Fetching subtitles in SRT format for the movie "The Batman" with the TMDB ID
```
