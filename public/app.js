const form = document.querySelector("#match-form");
const photoModeButton = document.querySelector("#photo-mode-button");
const manualModeButton = document.querySelector("#manual-mode-button");
const closetModeButton = document.querySelector("#closet-mode-button");
const photoPanel = document.querySelector("#photo-panel");
const manualPanel = document.querySelector("#manual-panel");
const closetMatchPanel = document.querySelector("#closet-match-panel");
const closetMatchList = document.querySelector("#closet-match-list");
const closetMatchEmpty = document.querySelector("#closet-match-empty");
const closetMatchError = document.querySelector("#closet-match-error");
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
const closetStore = window.PalettePalCloset;
const { getApproximateColorName } = window.PalettePalColors;
const maximumSelectedClosetItems = 8;

let selectedPhoto;
let currentMode = "photo";
let closetItems = [];
let selectedClosetIds = new Set();
let closetStorageAvailable = true;

function clearError() {
  resultError.hidden = true;
  resultError.textContent = "";
  closetMatchError.hidden = true;
  closetMatchError.textContent = "";
}

function setMode(mode) {
  currentMode = mode;
  const buttons = [
    [photoModeButton, "photo"],
    [manualModeButton, "manual"],
    [closetModeButton, "closet"],
  ];
  for (const [button, buttonMode] of buttons) {
    const selected = mode === buttonMode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  photoPanel.hidden = mode !== "photo";
  manualPanel.hidden = mode !== "manual";
  closetMatchPanel.hidden = mode !== "closet";
  clearError();
}

function showClosetError(message) {
  closetMatchError.textContent = message;
  closetMatchError.hidden = false;
}

function renderClosetChoices() {
  closetMatchList.replaceChildren();
  closetMatchEmpty.hidden = closetItems.length > 0 || !closetStorageAvailable;

  for (const closetItem of closetItems) {
    const item = document.createElement("li");
    item.className = "closet-item";
    const label = document.createElement("label");
    label.className = "closet-item-select";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "closet-item-checkbox";
    checkbox.value = closetItem.id;
    checkbox.checked = selectedClosetIds.has(closetItem.id);
    checkbox.setAttribute("aria-label", `Include ${closetItem.name} in outfit suggestions`);

    const swatch = document.createElement("span");
    swatch.className = "closet-item-swatch";
    swatch.style.backgroundColor = closetItem.color;
    swatch.setAttribute("aria-hidden", "true");

    const details = document.createElement("span");
    details.className = "closet-item-details";
    const name = document.createElement("strong");
    name.textContent = closetItem.name;
    const category = document.createElement("span");
    category.textContent =
      `${closetStore.categories.get(closetItem.category)} · Approx. ${getApproximateColorName(closetItem.color).toLowerCase()} · ${closetItem.color.toUpperCase()}`;
    details.append(name, category);
    if (closetItem.notes) {
      const notes = document.createElement("span");
      notes.textContent = closetItem.notes;
      details.append(notes);
    }
    label.append(checkbox, swatch, details);
    item.append(label);
    closetMatchList.append(item);
  }
}

function loadCloset() {
  try {
    closetItems = closetStore.load();
    const availableIds = new Set(closetItems.map(({ id }) => id));
    selectedClosetIds = new Set([...selectedClosetIds].filter((id) => availableIds.has(id)));
    closetStorageAvailable = true;
    closetMatchEmpty.hidden = closetItems.length > 0;
  } catch (error) {
    console.error("Could not load the local closet:", error);
    closetItems = [];
    selectedClosetIds.clear();
    closetStorageAvailable = false;
    showClosetError("Saved closet data could not be read. Changes are disabled to protect your closet.");
  }
  renderClosetChoices();
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

async function requestMatch(event) {
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
  if (currentMode === "closet") {
    if (!closetStorageAvailable) {
      showClosetError("Your saved closet could not be read, so it cannot be used for matching.");
      return;
    }
    if (selectedClosetIds.size === 0) {
      showClosetError("Choose at least one closet piece, or add pieces on the My Closet page.");
      return;
    }
  }

  submitButton.disabled = true;
  emptyState.hidden = true;
  resultLoading.hidden = false;
  resultError.hidden = true;
  resultBody.querySelector(".suggestion")?.remove();

  try {
    const image = currentMode === "photo" ? await readAsJpeg(selectedPhoto) : undefined;
    const selectedItems = currentMode === "closet"
      ? [...selectedClosetIds]
        .map((id) => closetItems.find((item) => item.id === id))
        .filter(Boolean)
        .map(({ name, category, color, notes }) => ({ name, category, color, notes }))
      : [];
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
        closetItems: selectedItems,
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
}

photoModeButton.addEventListener("click", () => setMode("photo"));
manualModeButton.addEventListener("click", () => setMode("manual"));
closetModeButton.addEventListener("click", () => setMode("closet"));
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
closetMatchList.addEventListener("change", (event) => {
  const checkbox = event.target.closest(".closet-item-checkbox");
  if (!checkbox) return;
  if (checkbox.checked && selectedClosetIds.size >= maximumSelectedClosetItems) {
    checkbox.checked = false;
    showClosetError(`Select up to ${maximumSelectedClosetItems} closet items for one suggestion.`);
    return;
  }
  if (checkbox.checked) selectedClosetIds.add(checkbox.value);
  else selectedClosetIds.delete(checkbox.value);
  closetMatchError.hidden = true;
});
window.addEventListener("storage", (event) => {
  if (event.key !== "palette-pal-closet-v1") return;
  loadCloset();
});
garmentSelect.addEventListener("change", () => {
  const isOther = garmentSelect.value === "other";
  otherGarmentField.hidden = !isOther;
  garmentDetails.disabled = !isOther;
  garmentDetails.required = isOther;
  if (!isOther) garmentDetails.value = "";
});
form.addEventListener("submit", requestMatch);

loadCloset();
