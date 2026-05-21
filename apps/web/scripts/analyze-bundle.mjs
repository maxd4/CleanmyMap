import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const chunksDir = path.join(root, ".next", "static", "chunks");

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

if (!fs.existsSync(chunksDir)) {
  console.error(
    "Bundle analysis needs a completed Next build first. Run `npm run build` in apps/web, then retry `npm run analyze:bundle`.",
  );
  process.exit(1);
}

const files = walk(chunksDir)
  .map((file) => {
    const raw = fs.readFileSync(file);
    return {
      file: path.relative(root, file).replaceAll(path.sep, "/"),
      rawBytes: raw.length,
      gzipBytes: zlib.gzipSync(raw).length,
    };
  })
  .sort((a, b) => b.gzipBytes - a.gzipBytes);

const totalRaw = files.reduce((sum, file) => sum + file.rawBytes, 0);
const totalGzip = files.reduce((sum, file) => sum + file.gzipBytes, 0);
const formatBytes = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);

console.log(`Client chunk count: ${files.length}`);
console.log(`Total raw size: ${formatBytes(totalRaw)} bytes`);
console.log(`Total gzip size: ${formatBytes(totalGzip)} bytes`);
console.log("");
console.log("Largest client chunks by gzip:");

for (const file of files.slice(0, 15)) {
  console.log(
    `${formatBytes(file.gzipBytes)} gzip | ${formatBytes(file.rawBytes)} raw | ${file.file}`,
  );
}
