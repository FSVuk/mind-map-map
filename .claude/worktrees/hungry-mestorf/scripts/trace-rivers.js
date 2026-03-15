const sharp = require("sharp");
const potrace = require("potrace");
const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "..", "public", "images", "map_regions_outline.png");
const OUTPUT_BLUE = path.join(__dirname, "..", "public", "images", "map_rivers_bw.png");
const OUTPUT_RIVERS_SVG = path.join(__dirname, "..", "public", "images", "map_rivers.svg");
const OUTPUT_COMBINED_SVG = path.join(__dirname, "..", "public", "images", "map_combined.svg");
const BORDERS_SVG = path.join(__dirname, "..", "public", "images", "map_traced.svg");

async function main() {
  console.log("Loading image...");
  const img = sharp(INPUT);
  const { width, height } = await img.metadata();
  console.log(`Image dimensions: ${width}x${height}`);

  const { data, info } = await img
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  console.log(`Processing ${info.width}x${info.height} pixels for blue features...`);

  // Extract blue pixels (rivers and lakes)
  // Rivers/lakes are blue: high B, lower R and G
  // Ocean is also blue but a different shade — we need to distinguish
  // Ocean blue in the image appears to be a brighter/lighter blue (~#0099FF range)
  // Rivers/lakes appear to be a similar blue but they're ON the white land
  // Strategy: find blue pixels that are NOT the ocean background
  const blueData = Buffer.alloc(info.width * info.height);

  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // Detect blue water features (rivers, lakes)
    // Blue pixels: B is significantly higher than R and G
    // But we want to include the lighter blue too (lakes)
    const isBlue = b > 150 && b > r + 50 && b > g * 0.8;

    // Exclude the ocean background (very uniform bright blue)
    // Ocean tends to be around r:0-50, g:140-180, b:240-255
    // But rivers/lakes on land will have similar colors
    // We'll keep all blue and rely on the fact that when combined
    // with borders, the ocean area won't matter (borders define land edges)

    // Detect distinct blue (not the exact ocean color)
    // Ocean in this image looks like a cyan-blue: roughly #1E90FF or similar
    // Rivers appear as a brighter/darker blue
    // Let's capture a range of blues
    const isWaterFeature = (
      (b > 180 && r < 100 && g < 180) ||  // strong blue
      (b > 150 && r < 80 && g > 100 && g < 200)  // cyan-ish blue (lakes)
    );

    blueData[i] = isWaterFeature ? 0 : 255;
  }

  // Save the blue extraction for inspection
  await sharp(blueData, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .png()
    .toFile(OUTPUT_BLUE);

  console.log(`Saved blue extraction to ${OUTPUT_BLUE}`);

  // Trace rivers to SVG
  console.log("Tracing rivers/lakes to SVG...");

  return new Promise((resolve, reject) => {
    potrace.trace(OUTPUT_BLUE, {
      turdSize: 10,
      optTolerance: 0.3,
      threshold: 128,
      color: "#4A90D9",
      background: "transparent",
    }, (err, riversSvg) => {
      if (err) {
        console.error("Potrace error:", err);
        reject(err);
        return;
      }

      fs.writeFileSync(OUTPUT_RIVERS_SVG, riversSvg);
      console.log(`Saved rivers SVG to ${OUTPUT_RIVERS_SVG}`);

      // Now combine borders + rivers into one SVG
      if (fs.existsSync(BORDERS_SVG)) {
        console.log("Combining borders + rivers...");

        const bordersContent = fs.readFileSync(BORDERS_SVG, "utf-8");
        const riversContent = riversSvg;

        // Extract the path data from each SVG
        const borderPaths = extractPaths(bordersContent);
        const riverPaths = extractPaths(riversContent);

        // Extract viewBox from borders SVG
        const viewBoxMatch = bordersContent.match(/viewBox="([^"]+)"/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : `0 0 ${info.width} ${info.height}`;

        const combined = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${info.width}" height="${info.height}">
  <!-- Region borders -->
  <g id="borders" fill="#000000" fill-rule="evenodd" stroke="none">
    ${borderPaths.join("\n    ")}
  </g>
  <!-- Rivers and lakes -->
  <g id="water" fill="#4A90D9" fill-rule="evenodd" stroke="none" opacity="0.8">
    ${riverPaths.join("\n    ")}
  </g>
</svg>`;

        fs.writeFileSync(OUTPUT_COMBINED_SVG, combined);
        console.log(`Saved combined SVG to ${OUTPUT_COMBINED_SVG}`);
      } else {
        console.log("No borders SVG found at", BORDERS_SVG, "- skipping combination.");
        console.log("Run trace-map.js first to generate borders.");
      }

      console.log("\nDone! Files generated:");
      console.log("  map_rivers_bw.png  - B&W extraction of blue features (for inspection)");
      console.log("  map_rivers.svg     - Traced rivers/lakes");
      console.log("  map_combined.svg   - Borders + rivers combined");
      resolve();
    });
  });
}

function extractPaths(svgString) {
  const paths = [];
  const pathRegex = /<path\s+d="([^"]+)"/g;
  let match;
  while ((match = pathRegex.exec(svgString)) !== null) {
    paths.push(`<path d="${match[1]}"/>`);
  }
  return paths;
}

main().catch(console.error);
