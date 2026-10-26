import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.ANTHROPIC_API_KEY = "";
const { app } = await import("./server.js");

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
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Getting dressed/);
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
      content: [{ type: "text", text: "Outfit colors\nTry sage with navy." }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const response = await originalFetch(`${baseUrl}/api/match`, {
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

    assert.equal(response.status, 200);
    assert.equal((await response.json()).suggestion, "Outfit colors\nTry sage with navy.");
    assert.equal(forwardedRequest.model, "test-claude-model");
    assert.equal(forwardedRequest.max_tokens, 600);
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
