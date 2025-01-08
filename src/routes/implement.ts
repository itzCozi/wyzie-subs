/** @format */

export default eventHandler(() => {
  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wyzie Subs - Implementations</title>
    <meta name="description" content="A powerful subtitle scraping API for anything. <3" />
    <meta name="keywords" content="subtitles, subtitle scraper, API, movie subtitles, Wyzie Subs" />
    <meta name="author" content="BadDeveloper" />
    <link rel="icon" href="https://i.postimg.cc/L5ppKYC5/cclogo.png" alt="Wyzie Subs Logo" />
    <meta property="og:title" content="Wyzie Subs - Implementations" />
    <meta property="og:description" content="A powerful subtitle scraping API for anything. <3" />
    <meta property="og:image" content="https://i.postimg.cc/L5ppKYC5/cclogo.png" alt="Wyzie Subs Logo" />
    <meta property="og:url" content="https://sub.wyzie.ru" />
    <meta property="og:type" content="website" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://sub.wyzie.ru" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Wyzie Subs - Implementations" />
    <meta name="twitter:description" content="A powerful subtitle scraping API for anything. <3" />
    <meta name="twitter:image" content="https://i.postimg.cc/L5ppKYC5/cclogo.png" alt="Wyzie Subs Logo" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="application/ld+json">
      {
        "@context": "http://schema.org",
        "@type": "WebSite",
        "name": "Wyzie Subs",
        "url": "https://sub.wyzie.ru",
        "logo": "https://i.postimg.cc/L5ppKYC5/cclogo.png",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://sub.wyzie.ru/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    </script>
    <script>
      function toggleDropdownPython() {
        document.getElementById("pythonDropdown").classList.toggle("hidden");
      }
      function toggleDropdownNode() {
        document.getElementById("nodeDropdown").classList.toggle("hidden");
      }
      function toggleDropdownTypescript() {
        document.getElementById("typescriptDropdown").classList.toggle("hidden");
      }
      function copyPython() {
        document.getElementById('pythonCopyButton')?.addEventListener('click', () => {
          const codeElement = document.getElementById('pythonCode');
          if (codeElement) {
            const codeText = codeElement.innerText;
            navigator.clipboard.writeText(codeText).catch((err) => {
              console.error('Could not copy text: ', err);
            });
          } else {
            console.error('Code element not found');
          }
        });
      }
      function copyTypescript() {
        document.getElementById('typescriptCopyButton')?.addEventListener('click', () => {
          const codeElement = document.getElementById('typescriptCode');
          if (codeElement) {
            const codeText = codeElement.innerText;
            navigator.clipboard.writeText(codeText).catch((err) => {
              console.error('Could not copy text: ', err);
            });
          } else {
            console.error('Code element not found');
          }
        });
      }
      function copyNode() {
        document.getElementById('nodeCopyButton')?.addEventListener('click', () => {
          const codeElement = document.getElementById('nodeCode');
          if (codeElement) {
            const codeText = codeElement.innerText;
            navigator.clipboard.writeText(codeText).catch((err) => {
              console.error('Could not copy text: ', err);
            });
          } else {
            console.error('Code element not found');
          }
        });
      }
    </script>
    <script>
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              primary: { "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd", "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8" },
              mono: { background: "#0b0b0b", card: "#111", accent: "#181818" },
              type: { emphasized: "#e0e0e0", subheader: "#d0d0d0", dimmed: "#c0c0c0", footer: "#6b7280" },
            },
          },
        },
      };
    </script>
  </head>

  <body class="bg-mono-background min-h-screen flex flex-col items-center justify-center p-4 cursor-default">
    <div class="bg-mono-card rounded-lg shadow-xl py-6 px-8 max-w-xl w-full">
      <header class="flex items-center justify-between mb-5">
        <h1 class="text-4xl font-bold text-primary-700"><a class="hover:underline" href="https://wyzie.ru" alt="Toolset homepage" title="Toolset Homepage">Wyzie</a> <span class="text-type-emphasized">Implement</span></h1>
        <div class="group w-10 h-auto shadow-md transition-shadow duration-500 hover:shadow-xl">
          <a href="/" title="Home" alt="Home">
            <img src="https://i.postimg.cc/L5ppKYC5/cclogo.png" class="w-full h-auto transition-transform duration-300 group-hover:scale-110" alt="Wyzie Subs logo" />
          </a>
        </div>
      </header>

      <div class="flex flex-col gap-3 mb-3">
        <div class="bg-mono-accent shadow-xl p-4 rounded-md flex flex-col gap-1 mb-2">
          <div class="flex justify-between">
            <a href="https://www.npmjs.com/package/wyzie-lib" class="text-primary-500 font-semibold hover:text-primary-600 transition duration-100 cursor-pointer">NPM Package</a>
            <p class="text-type-dimmed font-semibold">#1 Option</p>
          </div>
        </div>

        <div class="bg-mono-accent shadow-xl p-4 rounded-md flex flex-col gap-1">
          <div class="flex justify-between">
            <h3 onclick="toggleDropdownPython()" class="font-semibold text-type-subheader cursor-pointer">Python</h3>
            <button id="pythonCopyButton" onClick="copyPython()" class="transition-transform duration-200 hover:scale-110" alt="Copy" title="Copy">
              <img src="https://i.postimg.cc/ZYfSj49V/copy.png" class="w-6 h-auto">
            </button>
          </div>
          <div id="pythonDropdown" class="hidden mt-4 px-4 bg-mono-code text-type-dimmed rounded shadow-lg overflow-auto">
            <pre class="whitespace-pre-wrap"><code id="pythonCode">
import requests

def search_subtitles(
  tmdb_id=None,
  imdb_id=None,
  season=None,
  episode=None,
  language=None,
  format=None
):
  params = {
    'id': tmdb_id or imdb_id,
    'season': season,
    'episode': episode,
    'language': language,
    'format': format
  }

  response = requests.get("https://sub.wyzie.ru/search", params=params)

  if response.status_code == 200:
    return response.json()
  else:
    return {
      'error': response.status_code,
      'message': response.text
    }

search_subtitles(61222, 1, 1)
            </code></pre>
          </div>
        </div>

        <div class="bg-mono-accent shadow-xl p-4 rounded-md flex flex-col gap-1">
          <div class="flex justify-between">
            <h3 onclick="toggleDropdownTypescript()" class="font-semibold text-type-subheader cursor-pointer">Typescript</h3>
            <button id="typescriptCopyButton" onClick="copyTypescript()" class="transition-transform duration-200 hover:scale-110" alt="Copy" title="Copy">
              <img src="https://i.postimg.cc/ZYfSj49V/copy.png" class="w-6 h-auto">
            </button>
          </div>
          <div id="typescriptDropdown" class="hidden mt-4 px-4 bg-mono-code text-type-dimmed rounded shadow-lg overflow-auto">
            <pre class="whitespace-pre-wrap"><code id="typescriptCode">
interface SearchSubtitlesParams {
	tmdb_id?: number;
	imdb_id?: number;
	season?: number;
	episode?: number;
	language?: string;
	format?: string;
}

interface ErrorResponse {
	error: number;
	message: string;
}

async function searchSubtitles({
	tmdb_id,
	imdb_id,
	season,
	episode,
	language,
	format
}: SearchSubtitlesParams): Promise<any | ErrorResponse> {
	const params: Record<string, any> = {
		id: tmdb_id || imdb_id,
		season,
		episode,
		language,
		format
	};

	const url = new URL('https://sub.wyzie.ru/search');
	Object.keys(params).forEach(key => {
		if (params[key] !== undefined) {
			url.searchParams.append(key, params[key]);
		}
	});

	const response = await fetch(url.toString());

	if (response.ok) {
		return response.json();
	} else {
		return {
			error: response.status,
			message: await response.text()
		};
	}
}

searchSubtitles({ tmdb_id: 61222, season: 1, episode: 1 })
	.then(data => console.log(data))
	.catch(error => console.error(error));
            </code></pre>
          </div>
        </div>

        <div class="bg-mono-accent shadow-xl p-4 rounded-md flex flex-col gap-1">
          <div class="flex justify-between">
            <h3 onclick="toggleDropdownNode()" class="font-semibold text-type-subheader cursor-pointer">NodeJS</h3>
            <button id="nodeCopyButton" onClick="copyNode()" class="transition-transform duration-200 hover:scale-110" alt="Copy" title="Copy">
              <img src="https://i.postimg.cc/ZYfSj49V/copy.png" class="w-6 h-auto">
            </button>
          </div>
          <div id="nodeDropdown" class="hidden mt-4 px-4 bg-mono-code text-type-dimmed rounded shadow-lg overflow-auto">
            <pre class="whitespace-pre-wrap"><code id="nodeCode">
async function searchSubtitles(tmdbId = null, imdbId = null, season = null, episode = null, language = null, format = null) {
	const params = {
		id: tmdbId || imdbId,
		season: season,
		episode: episode,
		language: language,
		format: format
	};

	const filteredParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null));
	const queryString = new URLSearchParams(filteredParams).toString();
	const url = 'https://sub.wyzie.ru/search?' + queryString;

	try {
		const response = await fetch(url);
		if (response.ok) {
			return await response.json();
		} else {
			return {
				error: response.status,
				message: await response.text()
			};
		}
	} catch (error) {
		return {
			error: 'Network Error',
			message: error.message
		};
	}
}

searchSubtitles(61222, 1, 1);
            </code></pre>
          </div>
        </div>
      </div>
      <section>
        <div class="flex justify-between text-s text-type-footer mt-6">
          <p class="text-left">
            <a href="/faq" class="text-primary-500 hover:text-primary-600 transition duration-100" alt="Back" title="Back">← Back</a>
          </p>
        </div>
      </section>
    </div>
  </body>
</html>
  `;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
});
