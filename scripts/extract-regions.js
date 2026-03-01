const fs = require("fs");
const path = require("path");

const SVG_PATH = path.join(__dirname, "..", "public", "images", "map_base.svg");
const OUTPUT_PATH = path.join(__dirname, "..", "src", "data", "map-paths.ts");

console.log("Extracting paths from map_base.svg...");

const svg = fs.readFileSync(SVG_PATH, "utf-8");

// Extract viewBox
const vbMatch = svg.match(/viewBox="([^"]+)"/);
const viewBox = vbMatch ? vbMatch[1] : "0 0 2690 1123";
console.log(`  viewBox: ${viewBox}`);

// Extract ocean rect
const rectMatch = svg.match(/<rect[^>]*width="(\d+)"[^>]*height="(\d+)"[^>]*fill="([^"]+)"/);
const oceanColor = rectMatch ? rectMatch[3] : "#1E6EDC";
console.log(`  ocean: ${oceanColor}`);

// Extract region paths (inside <g id="regions">)
const regionsGroupMatch = svg.match(/<g id="regions">([\s\S]*?)<\/g>/);
if (!regionsGroupMatch) { console.error("Could not find regions group!"); process.exit(1); }

const regionPaths = [];
const pathRegex = /fill="([^"]+)"\s*data-region="(\d+)"[^>]*d="([^"]+)"/g;
// Also try alternate attribute order
const pathRegex2 = /d="([^"]+)"[^>]*fill="([^"]+)"\s*data-region="(\d+)"/g;

let match;
const regionsBlock = regionsGroupMatch[1];

// Try both orderings
const allPathMatches = [...regionsBlock.matchAll(/<path[^>]+>/g)];
for (const pm of allPathMatches) {
  const tag = pm[0];
  const dMatch = tag.match(/d="([^"]+)"/);
  const regionMatch = tag.match(/data-region="(\d+)"/);
  const fillMatch = tag.match(/fill="([^"]+)"/);
  if (dMatch && regionMatch) {
    regionPaths.push({
      id: regionMatch[1],
      d: dMatch[1],
    });
  }
}

console.log(`  regions: ${regionPaths.length}`);

// Extract water path (inside <g id="water">)
const waterGroupMatch = svg.match(/<g id="water">([\s\S]*?)<\/g>/);
let waterPathD = "";
if (waterGroupMatch) {
  const waterDMatch = waterGroupMatch[1].match(/d="([^"]+)"/);
  if (waterDMatch) waterPathD = waterDMatch[1];
}
console.log(`  water path: ${waterPathD.length > 0 ? waterPathD.length + " chars" : "none"}`);

// Extract border path (inside <g id="borders">)
const borderGroupMatch = svg.match(/<g id="borders">([\s\S]*?)<\/g>/);
let borderPathD = "";
if (borderGroupMatch) {
  const borderDMatch = borderGroupMatch[1].match(/d="([^"]+)"/);
  if (borderDMatch) borderPathD = borderDMatch[1];
}
console.log(`  border path: ${borderPathD.length > 0 ? borderPathD.length + " chars" : "none"}`);

// Generate TypeScript file
let ts = `// Auto-generated from map_base.svg — do not edit manually
// Run: node scripts/extract-regions.js

export const MAP_VIEWBOX = "${viewBox}";
export const MAP_WIDTH = ${viewBox.split(" ")[2]};
export const MAP_HEIGHT = ${viewBox.split(" ")[3]};
export const OCEAN_COLOR = "${oceanColor}";

export interface RegionPath {
  id: string;
  d: string;
}

export const REGION_PATHS: RegionPath[] = [\n`;

for (const rp of regionPaths) {
  ts += `  { id: "${rp.id}", d: "${rp.d}" },\n`;
}

ts += `];\n\n`;
ts += `export const WATER_PATH = "${waterPathD}";\n\n`;
ts += `export const BORDER_PATH = "${borderPathD}";\n`;

fs.writeFileSync(OUTPUT_PATH, ts);
const sizeKB = (Buffer.byteLength(ts) / 1024).toFixed(0);
console.log(`\nWrote ${OUTPUT_PATH} (${sizeKB} KB)`);
console.log("Done!");
