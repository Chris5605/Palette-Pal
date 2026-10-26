(() => {
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

  window.PalettePalColors = { getApproximateColorName };
})();
