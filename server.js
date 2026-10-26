import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT) || 3000;
const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const allowedVisionTypes = new Set([
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "monochromacy",
  "unsure",
]);
const allowedGarments = new Set(["top", "bottom", "dress", "full outfit"]);
const imageDataUrlPattern = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const maximumImageSize = 4 * 1024 * 1024;

export const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(
  "/vendor/markdown-it",
  express.static(path.join(rootDirectory, "node_modules", "markdown-it", "dist", "browser")),
);
app.use(
  "/vendor/dompurify",
  express.static(path.join(rootDirectory, "node_modules", "dompurify", "dist")),
);
app.use(express.static(path.join(rootDirectory, "public")));

app.post("/api/match", async (request, response) => {
  const { visionType, garment, occasion, notes, color, image, photoConsent } =
    request.body ?? {};

  if (!allowedVisionTypes.has(visionType)) {
    return response.status(400).json({ error: "Choose a valid color vision profile." });
  }
  if (!allowedGarments.has(garment)) {
    return response.status(400).json({ error: "Choose a valid garment type." });
  }
  if (typeof occasion !== "string" || occasion.length > 80) {
    return response.status(400).json({ error: "Occasion must be 80 characters or fewer." });
  }
  if (typeof notes !== "string" || notes.length > 300) {
    return response.status(400).json({ error: "Notes must be 300 characters or fewer." });
  }
  if (image !== undefined && typeof image !== "string") {
    return response.status(400).json({ error: "The photo could not be read." });
  }
  if (image && photoConsent !== true) {
    return response.status(400).json({ error: "Consent is required before sending a photo for analysis." });
  }
  if (!image && (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color))) {
    return response.status(400).json({ error: "Choose a valid outfit color." });
  }

  let imageUrl;
  if (image) {
    const match = imageDataUrlPattern.exec(image);
    if (!match) {
      return response.status(400).json({ error: "Use a JPEG, PNG, or WebP photo." });
    }
    const imageBytes = Buffer.from(match[2], "base64");
    if (imageBytes.length > maximumImageSize) {
      return response.status(413).json({ error: "The photo is too large. Choose a smaller image." });
    }
    imageUrl = image;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return response.status(503).json({
      error: "Outfit matching is not configured yet. Add an Anthropic API key to the server environment.",
    });
  }

  const outfitDescription = imageUrl
    ? "Review the attached outfit photo and identify its main clothing colors."
    : `The main clothing color selected by the user is ${color}.`;
  const prompt = [
    "You are an outfit color styling assistant. Give practical, supportive color-pairing suggestions.",
    `The user says their color vision profile is ${visionType}.`,
    `Garment: ${garment}.`,
    occasion.trim() ? `Occasion: ${occasion.trim()}.` : "",
    notes.trim() ? `User's additional preferences: ${notes.trim()}.` : "",
    outfitDescription,
    "Suggest 2-3 named colors that could pair well and a brief reason. Use color names and describe contrast or texture as well as hue so the advice does not rely on color alone. Keep the advice non-medical and acknowledge that a photo's colors may be approximate. Do not infer or diagnose a condition.",
    "Format your response as Markdown with ## headings for Outfit colors, Why they may work, and Try this next, and use bullet lists where helpful.",
  ]
    .filter(Boolean)
    .join("\n");
  const content = [];
  if (imageUrl) {
    const [, mediaType, imageData] = imageDataUrlPattern.exec(imageUrl);
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: `image/${mediaType}`,
        data: imageData,
      },
    });
  }
  content.push({ type: "text", text: prompt });

  try {
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content }],
      }),
    });

    const result = await aiResponse.json();
    if (!aiResponse.ok) {
      console.error("Anthropic outfit matching request failed:", result.error?.message ?? aiResponse.status);
      return response.status(502).json({ error: "The outfit suggestion service could not complete the request. Please try again." });
    }

    const suggestion = result.content
      ?.filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
    if (typeof suggestion !== "string" || !suggestion.trim()) {
      console.error("Anthropic outfit matching returned no text output.");
      return response.status(502).json({ error: "The outfit suggestion service returned an empty response. Please try again." });
    }

    return response.json({ suggestion });
  } catch (error) {
    console.error("Anthropic outfit matching request failed:", error);
    return response.status(502).json({ error: "Could not reach the outfit suggestion service. Please try again." });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`CVD-Assist is running at http://localhost:${port}`);
  });
}
