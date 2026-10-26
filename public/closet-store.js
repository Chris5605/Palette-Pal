(() => {
  const key = "palette-pal-closet-v1";
  const maximumItems = 50;
  const categories = new Map([
    ["tops", "Tops"],
    ["bottoms", "Bottoms"],
    ["one-piece", "Dresses & one-pieces"],
    ["outerwear", "Outerwear"],
    ["shoes", "Shoes"],
    ["accessories", "Accessories"],
    ["other", "Other"],
  ]);

  function isItem(item) {
    return item &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      item.name.trim().length > 0 &&
      item.name.length <= 80 &&
      categories.has(item.category) &&
      typeof item.color === "string" &&
      /^#[0-9a-f]{6}$/i.test(item.color) &&
      typeof item.notes === "string" &&
      item.notes.length <= 160;
  }

  function load() {
    const storedItems = localStorage.getItem(key);
    if (storedItems === null) return [];
    const items = JSON.parse(storedItems);
    if (!Array.isArray(items) || items.length > maximumItems || !items.every(isItem)) {
      throw new TypeError("Saved closet data has an invalid format.");
    }
    return items;
  }

  function save(items) {
    if (!Array.isArray(items) || items.length > maximumItems || !items.every(isItem)) {
      throw new TypeError("Closet items have an invalid format.");
    }
    localStorage.setItem(key, JSON.stringify(items));
  }

  window.PalettePalCloset = { categories, isItem, load, maximumItems, save };
})();
