import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.ANTHROPIC_API_KEY = "";
const { app, default: vercelApp } = await import("./server.js");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("serves the responsive app", async () => {
  assert.equal(vercelApp, app);
  const response = await fetch(baseUrl);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Getting dressed/);
  assert.match(html, /<title>Palette Pal/);
  assert.match(html, /From my closet/);
});

test("serves the separate closet page and shared closet scripts", async () => {
  const [pageResponse, storeResponse, colorResponse] = await Promise.all([
    fetch(`${baseUrl}/closet.html`),
    fetch(`${baseUrl}/closet-store.js`),
    fetch(`${baseUrl}/color-utils.js`),
  ]);
  const html = await pageResponse.text();

  assert.equal(pageResponse.status, 200);
  assert.match(html, /My Closet/);
  assert.equal(storeResponse.status, 200);
  assert.equal(colorResponse.status, 200);
});

test("serves local Markdown and sanitization libraries", async () => {
  const markdownResponse = await fetch(`${baseUrl}/vendor/markdown-it/markdown-it.umd.min.js`);
  const sanitizerResponse = await fetch(`${baseUrl}/vendor/dompurify/purify.min.js`);

  assert.equal(markdownResponse.status, 200);
  assert.match(markdownResponse.headers.get("content-type"), /javascript/);
  assert.equal(sanitizerResponse.status, 200);
  assert.match(sanitizerResponse.headers.get("content-type"), /javascript/);
});

test("rejects unknown color vision profiles", async () => {
  const response = await fetch(`${baseUrl}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visionType: "unknown-value",
      garment: "top",
      occasion: "",
      notes: "",
      color: "#607b70",
    }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /color vision profile/i);
});

test("requires a description when matching another garment type", async () => {
  const response = await fetch(`${baseUrl}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visionType: "protanopia",
      garment: "other",
      occasion: "",
      notes: "",
      color: "#607b70",
    }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /describe the item/i);
});

test("rejects invalid selected closet items", async () => {
  const response = await fetch(`${baseUrl}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visionType: "protanopia",
      garment: "top",
      occasion: "",
      notes: "",
      color: "#607b70",
      closetItems: [{ name: "Scarf", category: "accessories", color: "green", notes: "" }],
    }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /selected closet items/i);
});

test("requires a color when no photo or closet items are selected", async () => {
  const response = await fetch(`${baseUrl}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visionType: "protanopia",
      garment: "top",
      occasion: "",
      notes: "",
    }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid outfit color/i);
});

test("requires consent before accepting a photo for analysis", async () => {
  const response = await fetch(`${baseUrl}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visionType: "protanopia",
      garment: "top",
      occasion: "",
      notes: "",
      image: "data:image/jpeg;base64,/9j/2Q==",
      photoConsent: false,
    }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /consent/i);
});

test("returns an actionable error when the Claude service is not configured", async () => {
  const response = await fetch(`${baseUrl}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visionType: "protanopia",
      garment: "top",
      occasion: "",
      notes: "",
      color: "#607b70",
    }),
  });

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Anthropic API key/i);
});

test("returns a suggestion from the configured Claude service", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const originalModel = process.env.ANTHROPIC_MODEL;
  let forwardedRequest;
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_MODEL = "test-claude-model";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(options.headers["x-api-key"], "test-key");
    assert.equal(options.headers["anthropic-version"], "2023-06-01");
    forwardedRequest = JSON.parse(options.body);
    return new Response(JSON.stringify({
      content: [{
        type: "text",
        text: JSON.stringify({
          colors: [
            { name: "Sage", hex: "#9CAF88", reason: "A soft, earthy contrast." },
            { name: "Navy", hex: "#303D63", reason: "Adds depth and clear contrast." },
            { name: "Cream", hex: "#F2E6C9", reason: "A warm, lighter neutral." },
          ],
          advice: "## Why these may work\nThey balance softness and contrast.",
        }),
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const response = await originalFetch(`${baseUrl}/api/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visionType: "protanopia",
        garment: "other",
        garmentDetails: "A scarf",
        occasion: "",
        notes: "",
        closetItems: [{
          name: "Olive rain jacket",
          category: "outerwear",
          color: "#667744",
          notes: "Lightweight",
        }],
      }),
    });

    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.colors.length, 3);
    assert.equal(result.colors[0].hex, "#9CAF88");
    assert.match(result.advice, /Why these may work/);
    assert.equal(forwardedRequest.model, "test-claude-model");
    assert.equal(forwardedRequest.max_tokens, 600);
    assert.equal(forwardedRequest.output_config.format.type, "json_schema");
    assert.deepEqual(forwardedRequest.output_config.format.schema.required, ["colors", "advice"]);
    assert.match(forwardedRequest.messages[0].content[0].text, /Garment: A scarf\./);
    assert.match(
      forwardedRequest.messages[0].content[0].text,
      /Olive rain jacket \(outerwear\), approximate color #667744; notes: Lightweight/,
    );
    assert.match(forwardedRequest.messages[0].content[0].text, /using only the selected pieces from their saved closet/i);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
    if (originalModel === undefined) {
      delete process.env.ANTHROPIC_MODEL;
    } else {
      process.env.ANTHROPIC_MODEL = originalModel;
    }
  }
});
