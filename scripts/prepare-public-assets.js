import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicVendorDirectory = path.join(rootDirectory, "public", "vendor");
const assets = [
  {
    source: path.join(rootDirectory, "node_modules", "markdown-it", "dist", "browser", "markdown-it.umd.min.js"),
    destination: path.join(publicVendorDirectory, "markdown-it", "markdown-it.umd.min.js"),
  },
  {
    source: path.join(rootDirectory, "node_modules", "dompurify", "dist", "purify.min.js"),
    destination: path.join(publicVendorDirectory, "dompurify", "purify.min.js"),
  },
];

for (const asset of assets) {
  await mkdir(path.dirname(asset.destination), { recursive: true });
  await copyFile(asset.source, asset.destination);
}
