# Palette Pal

Palette Pal is a mobile-friendly outfit color matcher for people with color vision deficiency. The first version supports an outfit photo (including mobile camera capture) or a manually selected clothing color, with suggestions tailored to the selected color vision profile. It does not yet include a live camera color identifier.

## Run locally

Requirements: Node.js 20.6 or later and an Anthropic API key with access to Claude.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` to your key. If you already have a local `.env`, replace its old provider key name with `ANTHROPIC_API_KEY`; keep the key value private.
3. Start the app with `npm start`.
4. Open `http://localhost:3000`.

The API key is only read by the server; do not add it to browser code or commit `.env`. The default model is configured by `ANTHROPIC_MODEL` and can be changed to any Claude model enabled for your Anthropic account. For mobile camera capture, access the app over HTTPS when testing from a phone; browsers generally restrict camera/file capture features on insecure network origins.

## Photo privacy

Photos stay in the browser until the user submits the form and checks the consent box. Before sending, the browser resizes and converts the selected image to JPEG. The app sends it to the server in memory, and the server forwards it to the Anthropic Claude API for analysis without writing it to disk. Anthropic processes API data under its own policies; review those policies before sharing personal photos. The app does not save photos or retain generated suggestions.

## Test

Claude returns three color suggestions with names, approximate hex codes, and short pairing reasons using Anthropic's structured JSON output. Palette Pal displays them as color swatches alongside Markdown-formatted advice, rendered with locally served Markdown and HTML-sanitization libraries; no third-party CDN is used.

Run `npm test` to exercise the app route, input validation, photo consent requirement, Markdown/sanitizer asset serving, and missing-key behavior. Tests do not call the Anthropic API.