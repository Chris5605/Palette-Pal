# Palette Pal

Palette Pal is a mobile-friendly outfit color matcher for people with color vision deficiency. The first version supports an outfit photo (including mobile camera capture) or a manually selected clothing color, with suggestions tailored to the selected color vision profile. It does not yet include a live camera color identifier.

The local-first closet is managed on its own **My Closet** page and lets users save item names, categories, approximate colors, and notes in the current browser. The matcher has three modes: use an outfit photo, pick a color, or choose up to eight closet pieces. Closet-only matching does not require a separate base color. Selected item details are sent to Anthropic only with the match request; closet entries are not uploaded or synced. Optional photo color sampling estimates the color at the center of an image in the browser, then discards the source photo without saving or uploading it. Clearing this origin's browser site data removes the closet; accounts and data export are not included yet.

## Run locally

Requirements: Node.js 20.6 or later and an Anthropic API key with access to Claude.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` to your key. If you already have a local `.env`, replace its old provider key name with `ANTHROPIC_API_KEY`; keep the key value private.
3. Start the app with `npm start`.
4. Open `http://localhost:3000`.

The API key is only read by the server; do not add it to browser code or commit `.env`. The default model is configured by `ANTHROPIC_MODEL` and can be changed to any Claude model enabled for your Anthropic account. For mobile camera capture, access the app over HTTPS when testing from a phone; browsers generally restrict camera/file capture features on insecure network origins.

## Deploy to Vercel

Connect this repository to a Vercel project and deploy it as a Node.js app. Vercel detects the Express app in `server.js`; static pages and browser assets are in `public/`. The `postinstall` script copies the locally installed Markdown and sanitization browser bundles into `public/vendor/`, which is generated during deployment and is not committed. Configure `ANTHROPIC_API_KEY` as a server-side Vercel environment variable for the deployment environments where matching should be available. Do not prefix it with `VITE_`, `NEXT_PUBLIC_`, or another browser-exposed variable prefix.

The closet continues to use browser `localStorage` on Vercel; no database or account is needed for that. It is stored separately for each site origin and browser profile, so a closet saved on `localhost` will not automatically appear on the Vercel domain. Use the same deployed origin and browser to retain that deployment's closet. Closet export/import between origins is not currently implemented.

## Photo privacy

Photos stay in the browser until the user submits the form and checks the consent box. Before sending, the browser resizes and converts the selected image to JPEG. The app sends it to the server in memory, and the server forwards it to the Anthropic Claude API for analysis without writing it to disk. Anthropic processes API data under its own policies; review those policies before sharing personal photos. The app does not save photos or retain generated suggestions.

## Test

Claude returns three color suggestions with names, approximate hex codes, and short pairing reasons using Anthropic's structured JSON output. Palette Pal displays them as color swatches alongside Markdown-formatted advice, rendered with locally served Markdown and HTML-sanitization libraries; no third-party CDN is used.

Run `npm test` to exercise the app route, input validation, photo consent requirement, Markdown/sanitizer asset serving, and missing-key behavior. Tests do not call the Anthropic API.