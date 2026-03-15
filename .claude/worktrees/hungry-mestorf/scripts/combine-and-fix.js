const sharp = require("sharp");
const potrace = require("potrace");
const fs = require("fs");
const path = require("path");

const BORDERS_BW = path.join(__dirname, "..", "public", "images", "map_patched_bw.png");
const RIVERS_BW = path.join(__dirname, "..", "public", "images", "map_rivers_bw.png");
const OUTPUT_COMBINED_PNG = path.join(__dirname, "..", "public", "images", "map_combined_bw.png");
const OUTPUT_FIXED_PNG = path.join(__dirname, "..", "public", "images", "map_final_bw.png");
const OUTPUT_PREVIEW_PNG = path.join(__dirname, "..", "public", "images", "map_preview.png");
const OUTPUT_SVG = path.join(__dirname, "..", "public", "images", "map_final.svg");

async function main() {
  // === Step 1: Load both images ===
  console.log("Loading border and river images...");

  const bordersImg = sharp(BORDERS_BW);
  const { width, height } = await bordersImg.metadata();
  console.log(`Image: ${width}x${height}`);

  const bordersData = await sharp(BORDERS_BW).greyscale().raw().toBuffer();
  const riversData = await sharp(RIVERS_BW).greyscale().raw().toBuffer();

  // === Step 2: Combine borders + rivers ===
  console.log("Combining borders + rivers/lakes...");
  const combined = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    // Black in either image = black in result
    combined[i] = (bordersData[i] < 128 || riversData[i] < 128) ? 0 : 255;
  }

  await sharp(combined, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(OUTPUT_COMBINED_PNG);
  console.log(`Saved combined B&W to ${OUTPUT_COMBINED_PNG}`);

  // === Step 3: Fix small gaps in borders ===
  // Strategy: find white pixels that have black neighbors close by on opposite sides
  // This fills 1-3 pixel gaps in border lines without affecting large white areas
  console.log("Scanning for small border gaps...");

  const fixed = Buffer.from(combined);
  let gapsFilled = 0;

  const GAP_REACH = 3; // look up to 3 pixels away for black on each side

  for (let y = GAP_REACH; y < height - GAP_REACH; y++) {
    for (let x = GAP_REACH; x < width - GAP_REACH; x++) {
      if (fixed[y * width + x] !== 255) continue; // already black, skip

      // Check horizontal gap: black within reach on both left AND right
      let blackLeft = false, blackRight = false;
      for (let d = 1; d <= GAP_REACH; d++) {
        if (fixed[y * width + (x - d)] === 0) blackLeft = true;
        if (fixed[y * width + (x + d)] === 0) blackRight = true;
      }
      const hGap = blackLeft && blackRight;

      // Check vertical gap: black within reach on both top AND bottom
      let blackUp = false, blackDown = false;
      for (let d = 1; d <= GAP_REACH; d++) {
        if (fixed[(y - d) * width + x] === 0) blackUp = true;
        if (fixed[(y + d) * width + x] === 0) blackDown = true;
      }
      const vGap = blackUp && blackDown;

      // Check diagonal gaps too
      let blackNW = false, blackSE = false, blackNE = false, blackSW = false;
      for (let d = 1; d <= GAP_REACH; d++) {
        if (fixed[(y - d) * width + (x - d)] === 0) blackNW = true;
        if (fixed[(y + d) * width + (x + d)] === 0) blackSE = true;
        if (fixed[(y - d) * width + (x + d)] === 0) blackNE = true;
        if (fixed[(y + d) * width + (x - d)] === 0) blackSW = true;
      }
      const d1Gap = blackNW && blackSE;
      const d2Gap = blackNE && blackSW;

      // Only fill if it's clearly a gap (black on opposite sides)
      // AND the pixel is in a narrow white area (not a large open region)
      if (hGap || vGap || d1Gap || d2Gap) {
        // Extra check: count black neighbors in 5x5 area
        // Only fill if there's enough black nearby (it's a gap, not open space)
        let blackCount = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              if (combined[ny * width + nx] === 0) blackCount++;
            }
          }
        }
        // Need at least 6 black pixels in 5x5 neighborhood (out of 25)
        if (blackCount >= 6) {
          fixed[y * width + x] = 0;
          gapsFilled++;
        }
      }
    }
  }

  console.log(`Filled ${gapsFilled} gap pixels`);

  await sharp(fixed, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(OUTPUT_FIXED_PNG);
  console.log(`Saved gap-fixed B&W to ${OUTPUT_FIXED_PNG}`);

  // === Step 4: Create a preview image (borders + rivers on ocean blue bg) ===
  console.log("Creating preview image...");
  const preview = Buffer.alloc(width * height * 3);
  const OCEAN = [30, 144, 255];    // blue ocean
  const BORDER = [20, 20, 20];     // dark borders
  const LAKE = [70, 144, 220];     // slightly different blue for lakes/rivers
  const LAND = [245, 240, 230];    // off-white land

  for (let i = 0; i < width * height; i++) {
    const isBorder = bordersData[i] < 128;
    const isRiver = riversData[i] < 128;
    const isCombinedBlack = fixed[i] === 0;

    let r, g, b;
    if (isBorder || (isCombinedBlack && !isRiver)) {
      [r, g, b] = BORDER;
    } else if (isRiver) {
      [r, g, b] = LAKE;
    } else {
      // Determine if this white pixel is land or ocean
      // Simple flood-fill heuristic: pixels near the image edge are likely ocean
      // For now, just use white for all non-border non-river areas
      [r, g, b] = LAND;
    }

    preview[i * 3] = r;
    preview[i * 3 + 1] = g;
    preview[i * 3 + 2] = b;
  }

  await sharp(preview, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(OUTPUT_PREVIEW_PNG);
  console.log(`Saved preview to ${OUTPUT_PREVIEW_PNG}`);

  // === Step 5: Trace to final SVG ===
  console.log("Tracing final image to SVG...");
  return new Promise((resolve, reject) => {
    potrace.trace(OUTPUT_FIXED_PNG, {
      turdSize: 15,
      optTolerance: 0.4,
      threshold: 128,
      color: "#000000",
      background: "transparent",
    }, (err, svg) => {
      if (err) { reject(err); return; }
      fs.writeFileSync(OUTPUT_SVG, svg);
      console.log(`Saved final SVG to ${OUTPUT_SVG}`);
      console.log("\nDone! Files:");
      console.log("  map_combined_bw.png  - Borders + rivers merged");
      console.log("  map_final_bw.png     - After gap fixing");
      console.log("  map_preview.png      - Color preview (borders + lakes on white)");
      console.log("  map_final.svg        - Final vector SVG");
      resolve();
    });
  });
}

main().catch(console.error);
