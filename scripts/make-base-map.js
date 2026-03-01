const fs = require("fs");
const path = require("path");

const INPUT_SVG = path.join(__dirname, "..", "public", "images", "map_colored.svg");
const OUTPUT_SVG = path.join(__dirname, "..", "public", "images", "map_base.svg");

console.log("Creating base map (blue ocean/rivers, white land, black borders)...");

let svg = fs.readFileSync(INPUT_SVG, "utf-8");

// Remove mountains group entirely
svg = svg.replace(/\s*<!-- Mountains[\s\S]*?<\/g>\s*<\/g>/g, "");

// Inside the regions group, replace all fill colors with white
// Region paths look like: <path d="..." fill="#XXXXXX" fill-rule="evenodd"/>
svg = svg.replace(
  /(<g id="regions">)([\s\S]*?)(<\/g>\s*\n\s*<!-- Rivers)/,
  (match, open, paths, close) => {
    // Replace each fill="..." with fill="#FFFFFF" but add a data-region-id
    let regionIdx = 0;
    const newPaths = paths.replace(
      /fill="#[0-9a-fA-F]{6}"/g,
      () => {
        regionIdx++;
        return `fill="#F0EDE8" data-region="${regionIdx}"`;
      }
    );
    return open + newPaths + close;
  }
);

fs.writeFileSync(OUTPUT_SVG, svg);

const sizeKB = (Buffer.byteLength(svg) / 1024).toFixed(0);
console.log(`Saved ${OUTPUT_SVG} (${sizeKB} KB)`);
console.log(`  - Ocean: blue (#1E6EDC)`);
console.log(`  - Rivers: blue (#1E6EDC)`);
console.log(`  - Land regions: neutral (#F0EDE8) with data-region attributes`);
console.log(`  - Borders: black`);
console.log(`  - Mountains: removed`);
console.log(`\nEach region path has a data-region="N" attribute for targeting in the web app.`);
console.log("Done!");
