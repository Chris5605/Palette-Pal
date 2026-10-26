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
  colorValue.textContent = baseColor.value.toUpperCase();
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
        garment: document.querySelector("#garment").value,
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

    const suggestionElement = document.createElement("div");
    suggestionElement.className = "suggestion";
    suggestionElement.innerHTML = window.DOMPurify.sanitize(
      markdown.render(result.suggestion),
    );
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
