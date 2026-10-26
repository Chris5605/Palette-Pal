const closetForm = document.querySelector("#closet-form");
const closetName = document.querySelector("#closet-name");
const closetCategory = document.querySelector("#closet-category");
const closetColor = document.querySelector("#closet-color");
const closetColorValue = document.querySelector("#closet-color-value");
const closetColorPhoto = document.querySelector("#closet-color-photo");
const closetNotes = document.querySelector("#closet-notes");
const closetList = document.querySelector("#closet-list");
const closetCount = document.querySelector("#closet-count");
const closetEmpty = document.querySelector("#closet-empty");
const closetMessage = document.querySelector("#closet-message");
const closetError = document.querySelector("#closet-error");
const closetStore = window.PalettePalCloset;
const { getApproximateColorName } = window.PalettePalColors;
let closetItems = [];
let closetStorageAvailable = true;

function updateColorLabel() {
  closetColorValue.textContent =
    `Approx. ${getApproximateColorName(closetColor.value).toLowerCase()} · ${closetColor.value.toUpperCase()}`;
}

function clearMessages() {
  closetMessage.textContent = "";
  closetError.textContent = "";
  closetError.hidden = true;
}

function showError(message) {
  closetMessage.textContent = "";
  closetError.textContent = message;
  closetError.hidden = false;
}

function disableForm() {
  closetStorageAvailable = false;
  for (const control of closetForm.elements) control.disabled = true;
}

function saveItems(items) {
  try {
    closetStore.save(items);
    return true;
  } catch (error) {
    console.error("Could not save the local closet:", error);
    showError("Your closet could not be saved in this browser. Check available storage and try again.");
    return false;
  }
}

function renderCloset() {
  closetList.replaceChildren();
  closetCount.textContent = `${closetItems.length} ${closetItems.length === 1 ? "item" : "items"}`;
  closetEmpty.hidden = closetItems.length > 0 || !closetStorageAvailable;

  for (const closetItem of closetItems) {
    const item = document.createElement("li");
    item.className = "closet-item";
    const details = document.createElement("div");
    details.className = "closet-item-details";
    const swatch = document.createElement("span");
    swatch.className = "closet-item-swatch";
    swatch.style.backgroundColor = closetItem.color;
    swatch.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "closet-item-text";
    const name = document.createElement("strong");
    name.textContent = closetItem.name;
    const category = document.createElement("span");
    category.textContent =
      `${closetStore.categories.get(closetItem.category)} · Approx. ${getApproximateColorName(closetItem.color).toLowerCase()} · ${closetItem.color.toUpperCase()}`;
    text.append(name, category);
    if (closetItem.notes) {
      const notes = document.createElement("span");
      notes.textContent = closetItem.notes;
      text.append(notes);
    }
    details.append(swatch, text);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "closet-remove-button";
    removeButton.dataset.deleteId = closetItem.id;
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${closetItem.name} from closet`);
    item.append(details, removeButton);
    closetList.append(item);
  }
}

async function sampleColorFromPhoto(file) {
  if (!file.type.startsWith("image/")) {
    showError("Choose an image file to sample a color.");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    showError("That image is larger than 15 MB. Choose a smaller image.");
    return;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let sampledColor;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 9;
      canvas.height = 9;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Your browser could not sample this image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(2, 2, 5, 5).data;
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] === 0) continue;
        red += pixels[index];
        green += pixels[index + 1];
        blue += pixels[index + 2];
        count += 1;
      }
      if (count === 0) throw new Error("No visible color could be sampled from this image.");
      const toHex = (channel) => Math.round(channel / count).toString(16).padStart(2, "0");
      sampledColor = `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
    } finally {
      bitmap.close();
    }
    closetColor.value = sampledColor;
    updateColorLabel();
    clearMessages();
    closetMessage.textContent =
      `Sampled approx. ${getApproximateColorName(sampledColor).toLowerCase()} · ${sampledColor.toUpperCase()}. The photo was discarded.`;
  } catch (error) {
    console.error("Could not sample a color from the selected image:", error);
    showError(error instanceof Error ? error.message : "The image color could not be sampled.");
  } finally {
    closetColorPhoto.value = "";
  }
}

closetColor.addEventListener("input", updateColorLabel);
closetColorPhoto.addEventListener("change", () => {
  const file = closetColorPhoto.files?.[0];
  if (file) void sampleColorFromPhoto(file);
});

closetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessages();
  if (!closetStorageAvailable) {
    showError("The closet is unavailable because this browser could not safely read its saved data.");
    return;
  }
  if (closetItems.length >= closetStore.maximumItems) {
    showError(`Your closet can hold up to ${closetStore.maximumItems} items for now.`);
    return;
  }

  const newItem = {
    id: crypto.randomUUID(),
    name: closetName.value.trim(),
    category: closetCategory.value,
    color: closetColor.value.toUpperCase(),
    notes: closetNotes.value.trim(),
  };
  if (!closetStore.isItem(newItem)) {
    showError("Check the item name, category, and color, then try again.");
    return;
  }

  const updatedItems = [...closetItems, newItem];
  if (!saveItems(updatedItems)) return;
  closetItems = updatedItems;
  closetForm.reset();
  closetColor.value = "#607b70";
  updateColorLabel();
  renderCloset();
  closetMessage.textContent = `${newItem.name} was added to your closet on this device.`;
});

closetList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-delete-id]");
  if (!removeButton) return;
  const updatedItems = closetItems.filter((item) => item.id !== removeButton.dataset.deleteId);
  if (updatedItems.length === closetItems.length || !saveItems(updatedItems)) return;
  closetItems = updatedItems;
  clearMessages();
  renderCloset();
  closetMessage.textContent = "Item removed from your closet.";
});

window.addEventListener("storage", (event) => {
  if (event.key !== "palette-pal-closet-v1") return;
  try {
    closetItems = closetStore.load();
    clearMessages();
    renderCloset();
  } catch (error) {
    console.error("Could not refresh the local closet:", error);
    disableForm();
    showError("Saved closet data could not be read, so changes are disabled to protect it.");
    renderCloset();
  }
});

try {
  closetItems = closetStore.load();
} catch (error) {
  console.error("Could not load the local closet:", error);
  disableForm();
  showError("This browser could not read the saved closet, so changes are disabled to protect your data.");
}
renderCloset();
