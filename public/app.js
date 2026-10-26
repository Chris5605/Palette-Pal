const form = document.querySelector("#match-form");
const photoModeButton = document.querySelector("#photo-mode-button");
const manualModeButton = document.querySelector("#manual-mode-button");
const photoPanel = document.querySelector("#photo-panel");
const manualPanel = document.querySelector("#manual-panel");
const photoInput = document.querySelector("#outfit-photo");
const photoPreview = document.querySelector("#photo-preview");
const previewWrap = document.querySelector("#preview-wrap");
const uploadArea = document.querySelector("#upload-area");
const removePhotoButton = document.querySelector("#remove-photo");
const consentRow = document.querySelector("#consent-row");
const photoConsent = document.querySelector("#photo-consent");
const baseColor = document.querySelector("#base-color");
const colorValue = document.querySelector("#color-value");
const garmentSelect = document.querySelector("#garment");
const otherGarmentField = document.querySelector("#other-garment-field");
const garmentDetails = document.querySelector("#garment-details");
const submitButton = document.querySelector("#submit-button");
const emptyState = document.querySelector("#empty-state");
const resultLoading = document.querySelector("#result-loading");
const resultError = document.querySelector("#result-error");
const resultBody = document.querySelector("#result-body");
const markdown = window.markdownit({
  html: false,
  linkify: false,
  breaks: true,
});

let selectedPhoto;
let currentMode = "photo";

const namedColors = [
  ["Black", "#202020"],
  ["Charcoal", "#4a4a4a"],
  ["Gray", "#888888"],
  ["Silver", "#c0c0c0"],
  ["White", "#f5f5f5"],
  ["Cream", "#f2e6c9"],
  ["Taupe", "#9b8877"],
  ["Brown", "#805333"],
  ["Rust", "#ad4f32"],
  ["Red", "#c63d3d"],
  ["Coral", "#e88070"],
  ["Orange", "#df7628"],
  ["Mustard yellow", "#c4a02d"],
  ["Yellow", "#e5d34f"],
  ["Olive", "#77783c"],
  ["Muted green", "#6e806a"],
  ["Sage green", "#9caf88"],
  ["Forest green", "#315b43"],
  ["Teal", "#398c88"],
  ["Mint", "#9ed5bd"],
  ["Sky blue", "#79b5d1"],
  ["Blue", "#4169a1"],
  ["Navy", "#303d63"],
  ["Lavender", "#aa98ca"],
  ["Purple", "#79539b"],
  ["Plum", "#74435f"],
  ["Pink", "#d887a1"],
];

function getApproximateColorName(hex) {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  let nearestName = "color";
  let minimumDistance = Number.POSITIVE_INFINITY;

  for (const [name, sampleHex] of namedColors) {
    const sampleRed = Number.parseInt(sampleHex.slice(1, 3), 16);
    const sampleGreen = Number.parseInt(sampleHex.slice(3, 5), 16);
    const sampleBlue = Number.parseInt(sampleHex.slice(5, 7), 16);
    const redMean = (red + sampleRed) / 2;
    const redDifference = red - sampleRed;
    const greenDifference = green - sampleGreen;
    const blueDifference = blue - sampleBlue;
    const distance =
      (2 + redMean / 256) * redDifference ** 2 +
      4 * greenDifference ** 2 +
      (2 + (255 - redMean) / 256) * blueDifference ** 2;

    if (distance < minimumDistance) {
      minimumDistance = distance;
      nearestName = name;
    }
  }

  return nearestName;
}

function setMode(mode) {
  currentMode = mode;
  const photoSelected = mode === "photo";
  photoPanel.hidden = !photoSelected;
  manualPanel.hidden = photoSelected;
  photoModeButton.classList.toggle("is-active", photoSelected);
  manualModeButton.classList.toggle("is-active", !photoSelected);
  photoModeButton.setAttribute("aria-pressed", String(photoSelected));
  manualModeButton.setAttribute("aria-pressed", String(!photoSelected));
  clearError();
}

function clearError() {
  resultError.hidden = true;
  resultError.textContent = "";
}

function setPhoto(file) {
  if (photoPreview.src.startsWith("blob:")) {
    URL.revokeObjectURL(photoPreview.src);
  }
  selectedPhoto = file ?? undefined;
  photoConsent.checked = false;
  consentRow.hidden = !selectedPhoto;
  previewWrap.hidden = !selectedPhoto;
  uploadArea.hidden = Boolean(selectedPhoto);
  if (selectedPhoto) {
    photoPreview.src = URL.createObjectURL(selectedPhoto);
  } else {
    photoPreview.removeAttribute("src");
    photoInput.value = "";
  }
  clearError();
}

function readAsJpeg(file) {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Your browser could not prepare this photo."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("This image could not be opened. Try a JPEG or PNG photo."));
    };
    image.src = sourceUrl;
  });
}

photoModeButton.addEventListener("click", () => setMode("photo"));
manualModeButton.addEventListener("click", () => setMode("manual"));

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setPhoto(undefined);
    resultError.textContent = "Choose an image file to continue.";
    resultError.hidden = false;
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    setPhoto(undefined);
    resultError.textContent = "That photo is larger than 15 MB. Choose a smaller image.";
    resultError.hidden = false;
    return;
  }
  setPhoto(file);
});

removePhotoButton.addEventListener("click", () => setPhoto(undefined));

baseColor.addEventListener("input", () => {
  colorValue.textContent =
    `Approx. ${getApproximateColorName(baseColor.value).toLowerCase()} · ${baseColor.value.toUpperCase()}`;
});

garmentSelect.addEventListener("change", () => {
  const isOther = garmentSelect.value === "other";
  otherGarmentField.hidden = !isOther;
  garmentDetails.disabled = !isOther;
  garmentDetails.required = isOther;
  if (!isOther) garmentDetails.value = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  if (currentMode === "photo" && !selectedPhoto) {
    resultError.textContent = "Add or take a photo first, or switch to picking a color.";
    resultError.hidden = false;
    return;
  }
  if (currentMode === "photo" && !photoConsent.checked) {
    resultError.textContent = "Please agree to send the photo to Anthropic's Claude API before requesting a match.";
    resultError.hidden = false;
    photoConsent.focus();
    return;
  }

  submitButton.disabled = true;
  emptyState.hidden = true;
  resultLoading.hidden = false;
  const suggestion = resultBody.querySelector(".suggestion");
  suggestion?.remove();

  try {
    const image = currentMode === "photo" ? await readAsJpeg(selectedPhoto) : undefined;
    const response = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visionType: document.querySelector("#vision-type").value,
        garment: garmentSelect.value,
        garmentDetails: garmentSelect.value === "other" ? garmentDetails.value : undefined,
        occasion: document.querySelector("#occasion").value,
        notes: document.querySelector("#notes").value,
        color: currentMode === "manual" ? baseColor.value : undefined,
        image,
        photoConsent: currentMode === "photo" && photoConsent.checked,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "The suggestion could not be generated. Please try again.");
    }

    if (
      !Array.isArray(result.colors) ||
      result.colors.length !== 3 ||
      !result.colors.every((color) =>
        color &&
        typeof color.name === "string" &&
        typeof color.hex === "string" &&
        /^#[0-9a-f]{6}$/i.test(color.hex) &&
        typeof color.reason === "string"
      ) ||
      typeof result.advice !== "string"
    ) {
      throw new Error("The outfit suggestion service returned incomplete color suggestions. Please try again.");
    }

    const suggestionElement = document.createElement("div");
    suggestionElement.className = "suggestion";
    const swatchesHeading = document.createElement("h3");
    swatchesHeading.className = "palette-heading";
    swatchesHeading.textContent = "Try these colors";
    suggestionElement.append(swatchesHeading);

    const swatches = document.createElement("ul");
    swatches.className = "palette-swatches";
    swatches.setAttribute("aria-label", "Suggested color examples");
    for (const color of result.colors) {
      const item = document.createElement("li");
      item.className = "palette-swatch";
      const sample = document.createElement("span");
      sample.className = "palette-swatch-sample";
      sample.style.backgroundColor = color.hex;
      sample.setAttribute("role", "img");
      sample.setAttribute("aria-label", `${color.name} color sample`);

      const detail = document.createElement("span");
      detail.className = "palette-swatch-detail";
      const name = document.createElement("strong");
      name.textContent = color.name;
      const hex = document.createElement("span");
      hex.className = "palette-swatch-hex";
      hex.textContent = color.hex.toUpperCase();
      const reason = document.createElement("span");
      reason.className = "palette-swatch-reason";
      reason.textContent = color.reason;

      detail.append(name, hex, reason);
      item.append(sample, detail);
      swatches.append(item);
    }
    suggestionElement.append(swatches);

    const advice = document.createElement("div");
    advice.className = "palette-advice";
    advice.innerHTML = window.DOMPurify.sanitize(markdown.render(result.advice));
    suggestionElement.append(advice);
    resultBody.append(suggestionElement);
  } catch (error) {
    resultError.textContent = error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
    resultError.hidden = false;
  } finally {
    resultLoading.hidden = true;
    submitButton.disabled = false;
  }
});
