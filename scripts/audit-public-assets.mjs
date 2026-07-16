import fs from "node:fs/promises";
import path from "node:path";

const publicRoot = path.resolve("public");
const sourceRoot = path.resolve("src");
const outputPath = path.resolve("supabase/reports/public-unused-assets.txt");
const assetPattern = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const sourceFiles = (await walk(sourceRoot)).filter((file) => /\.(?:css|ts|tsx)$/.test(file));
const source = (await Promise.all(sourceFiles.map((file) => fs.readFile(file, "utf8")))).join("\n");
const publicAssets = (await walk(publicRoot)).filter((file) => assetPattern.test(file));
const unused = publicAssets
  .map((file) => `/${path.relative(publicRoot, file).split(path.sep).join("/")}`)
  .filter((publicPath) => !source.includes(publicPath))
  .sort();

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, [
  "# Generated list only. Review before deleting.",
  `# ${unused.length} public image assets have no literal reference in src/.`,
  ...unused,
  "",
].join("\n"));

console.log(`Wrote ${unused.length} candidates to ${outputPath}`);
