const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const BORDERS_BW = path.join(__dirname, "..", "public", "images", "map_patched_bw.png");  // borders only, no rivers
const RIVERS_BW = path.join(__dirname, "..", "public", "images", "map_rivers_bw.png");   // rivers/lakes extraction
const ORIGINAL_COLOR = path.join(__dirname, "..", "public", "images", "map_regions.png");
const OUTPUT_COLOR = path.join(__dirname, "..", "public", "images", "map_colored.png");
const OUTPUT_DARK = path.join(__dirname, "..", "public", "images", "map_colored_dark.png");

// 1970s sci-fi washed-out political map palette
// Muted, desaturated, easy on the eyes
const PALETTE_70S = {
  ocean: [14, 22, 42],          // deep navy
  border: [8, 12, 28],          // near-black borders
  riverFill: [45, 75, 110],     // muted blue for lakes/rivers

  // Region fills — washed out, distinct, readable
  colors: [
    [142, 156, 130],  // sage green
    [168, 155, 134],  // warm taupe
    [130, 148, 155],  // steel blue
    [175, 160, 120],  // dusty wheat
    [148, 130, 142],  // mauve gray
    [155, 142, 118],  // sandy brown
    [120, 140, 130],  // muted teal
    [165, 145, 140],  // dusty rose
    [140, 150, 115],  // olive
    [155, 148, 160],  // lavender gray
    [170, 150, 110],  // amber
    [128, 138, 148],  // slate
    [158, 140, 128],  // clay
    [135, 155, 140],  // seafoam
    [145, 135, 150],  // plum mist
    [160, 155, 130],  // khaki
    [138, 128, 140],  // dusty violet
    [150, 160, 135],  // pale moss
    [165, 148, 148],  // blush
    [130, 145, 155],  // powder blue
    [158, 155, 138],  // parchment
    [140, 130, 125],  // cocoa
    [148, 158, 150],  // mint gray
    [162, 138, 130],  // terra cotta
    [135, 148, 135],  // lichen
    [155, 142, 155],  // heather
    [145, 155, 128],  // spring olive
    [168, 158, 145],  // oatmeal
    [128, 140, 155],  // denim
    [150, 138, 135],  // mushroom
    [140, 155, 148],  // eucalyptus
    [160, 145, 138],  // sienna mist
    [132, 142, 132],  // sage dark
    [155, 150, 158],  // silver lilac
    [148, 140, 118],  // bronze
    [138, 150, 142],  // verdigris
  ],
};

// Flood fill to find connected regions
function floodFill(bwData, width, height, startX, startY, regionId, regionMap) {
  const stack = [[startX, startY]];
  const pixels = [];

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (regionMap[idx] !== 0) continue;       // already assigned
    if (bwData[idx] < 128) continue;          // black border pixel

    regionMap[idx] = regionId;
    pixels.push([x, y]);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return pixels;
}

// Sample the dominant color from original map for a set of pixels
function sampleOriginalColor(pixels, colorData, width) {
  if (pixels.length === 0) return null;

  // Sample a subset for performance
  const step = Math.max(1, Math.floor(pixels.length / 200));
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  for (let i = 0; i < pixels.length; i += step) {
    const [x, y] = pixels[i];
    const idx = (y * width + x) * 3;
    rSum += colorData[idx];
    gSum += colorData[idx + 1];
    bSum += colorData[idx + 2];
    count++;
  }

  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  };
}

// Check if a color is "ocean blue" from the original map
// Tightened: must be very clearly the bright cyan-blue ocean, not blue-tinted land
function isOceanColor(r, g, b) {
  // The original map ocean is a bright cyan-blue (~#1E90FF / r:30 g:144 b:255)
  // Must have very high blue, low red, and moderate green
  return b > 200 && r < 80 && g > 100 && g < 200 && (b - r) > 150;
}

// Apply 70s sci-fi wash to a color
function wash70s(r, g, b) {
  // Desaturate
  const gray = r * 0.3 + g * 0.59 + b * 0.11;
  const desat = 0.55; // how much to desaturate (0 = full gray, 1 = original)
  let nr = gray + (r - gray) * desat;
  let ng = gray + (g - gray) * desat;
  let nb = gray + (b - gray) * desat;

  // Warm shift (slight push toward amber)
  nr = nr * 1.02 + 5;
  ng = ng * 0.99 + 2;
  nb = nb * 0.95;

  // Reduce brightness slightly, increase floor (washed out = compressed range)
  nr = 50 + (nr - 50) * 0.75;
  ng = 50 + (ng - 50) * 0.75;
  nb = 50 + (nb - 50) * 0.75;

  return [
    Math.max(0, Math.min(255, Math.round(nr))),
    Math.max(0, Math.min(255, Math.round(ng))),
    Math.max(0, Math.min(255, Math.round(nb))),
  ];
}

async function main() {
  console.log("Loading images...");
  const bwMeta = await sharp(BORDERS_BW).metadata();
  const { width, height } = bwMeta;
  console.log(`Dimensions: ${width}x${height}`);

  const bwData = await sharp(BORDERS_BW).greyscale().raw().toBuffer();

  // Load rivers/lakes mask
  console.log("Loading rivers mask...");
  const riversMeta = await sharp(RIVERS_BW).metadata();
  let riversData;
  if (riversMeta.width !== width || riversMeta.height !== height) {
    riversData = await sharp(RIVERS_BW).resize(width, height, { fit: "fill" }).greyscale().raw().toBuffer();
  } else {
    riversData = await sharp(RIVERS_BW).greyscale().raw().toBuffer();
  }

  // Load original color map, resize to match if needed
  const origMeta = await sharp(ORIGINAL_COLOR).metadata();
  let colorData;
  if (origMeta.width !== width || origMeta.height !== height) {
    console.log(`Resizing original from ${origMeta.width}x${origMeta.height} to ${width}x${height}`);
    colorData = await sharp(ORIGINAL_COLOR)
      .resize(width, height, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer();
  } else {
    colorData = await sharp(ORIGINAL_COLOR).removeAlpha().raw().toBuffer();
  }

  // === Flood fill to identify regions ===
  console.log("Finding regions via flood fill...");
  const regionMap = new Int32Array(width * height); // 0 = unassigned
  const regions = new Map(); // regionId -> { pixels, origColor, isOcean }
  let nextId = 1;

  // Increase stack size for large flood fills
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (regionMap[idx] !== 0) continue;
      if (bwData[idx] < 128) {
        regionMap[idx] = -1; // border
        continue;
      }

      const regionId = nextId++;
      const pixels = floodFill(bwData, width, height, x, y, regionId, regionMap);

      if (pixels.length < 5) continue; // tiny noise

      const origColor = sampleOriginalColor(pixels, colorData, width);
      const isOcean = origColor ? isOceanColor(origColor.r, origColor.g, origColor.b) : false;

      regions.set(regionId, { pixels, origColor, isOcean, size: pixels.length });
    }
  }

  console.log(`Found ${regions.size} regions`);

  // Sort land regions by size (largest first) for consistent color assignment
  const landRegions = [...regions.entries()]
    .filter(([, r]) => !r.isOcean && r.size > 50)
    .sort((a, b) => b[1].size - a[1].size);

  const oceanRegions = [...regions.entries()].filter(([, r]) => r.isOcean);
  const tinyRegions = [...regions.entries()].filter(([, r]) => !r.isOcean && r.size <= 50);

  console.log(`  ${landRegions.length} land regions`);
  console.log(`  ${oceanRegions.length} ocean regions`);
  console.log(`  ${tinyRegions.length} tiny regions (noise)`);

  // === Assign colors ===
  // Use original map colors to derive washed-out 70s palette
  // But also ensure adjacent regions get distinct colors

  const regionColors = new Map();

  // Ocean
  for (const [id] of oceanRegions) {
    regionColors.set(id, PALETTE_70S.ocean);
  }

  // Tiny regions get ocean or border color
  for (const [id] of tinyRegions) {
    regionColors.set(id, PALETTE_70S.ocean);
  }

  // Land regions: derive color from original, apply 70s wash
  let paletteIdx = 0;
  for (const [id, region] of landRegions) {
    if (region.origColor) {
      const { r, g, b } = region.origColor;
      const washed = wash70s(r, g, b);
      regionColors.set(id, washed);
    } else {
      // Fallback: use palette
      regionColors.set(id, PALETTE_70S.colors[paletteIdx % PALETTE_70S.colors.length]);
      paletteIdx++;
    }
  }

  // === Render colored image ===
  console.log("Rendering colored map...");
  const output = Buffer.alloc(width * height * 3);

  for (let i = 0; i < width * height; i++) {
    const rId = regionMap[i];

    if (rId === -1) {
      // Border pixel
      output[i * 3] = PALETTE_70S.border[0];
      output[i * 3 + 1] = PALETTE_70S.border[1];
      output[i * 3 + 2] = PALETTE_70S.border[2];
    } else if (regionColors.has(rId)) {
      const [r, g, b] = regionColors.get(rId);
      output[i * 3] = r;
      output[i * 3 + 1] = g;
      output[i * 3 + 2] = b;
    } else {
      // Unassigned — default to ocean
      output[i * 3] = PALETTE_70S.ocean[0];
      output[i * 3 + 1] = PALETTE_70S.ocean[1];
      output[i * 3 + 2] = PALETTE_70S.ocean[2];
    }
  }

  // Light version (white-ish ocean for daylight mode)
  await sharp(output, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(OUTPUT_COLOR);
  console.log(`Saved colored map to ${OUTPUT_COLOR}`);

  // === Identify lakes (blue regions that are NOT the huge outer ocean) ===
  // The ocean is the largest blue region; everything else blue is a lake
  const blueRegionsBySize = [...regions.entries()]
    .filter(([, r]) => r.isOcean)
    .sort((a, b) => b[1].size - a[1].size);

  const oceanId = blueRegionsBySize.length > 0 ? blueRegionsBySize[0][0] : -999;
  const lakeIds = new Set(blueRegionsBySize.slice(1).map(([id]) => id));
  console.log(`  Ocean region: id=${oceanId} (${regions.get(oceanId)?.size || 0}px)`);
  console.log(`  ${lakeIds.size} lake regions detected`);

  // === Dark version (for the app's dark theme) ===
  console.log("Rendering dark theme version...");
  const BRIGHT_WATER = [30, 110, 220];     // bright blue for ocean, lakes, rivers
  const DARK_BORDER = [0, 0, 0];           // black borders

  const darkOutput = Buffer.alloc(width * height * 3);

  for (let i = 0; i < width * height; i++) {
    const rId = regionMap[i];
    const isRiverPixel = riversData[i] < 128;  // black in rivers mask = water

    if (rId === -1) {
      // Border pixel from the B&W borders image
      darkOutput[i * 3] = DARK_BORDER[0];
      darkOutput[i * 3 + 1] = DARK_BORDER[1];
      darkOutput[i * 3 + 2] = DARK_BORDER[2];
    } else if (isRiverPixel) {
      // River or lake pixel (from the rivers mask) — paint as bright blue water
      darkOutput[i * 3] = BRIGHT_WATER[0];
      darkOutput[i * 3 + 1] = BRIGHT_WATER[1];
      darkOutput[i * 3 + 2] = BRIGHT_WATER[2];
    } else if (regionColors.has(rId)) {
      const [r, g, b] = regionColors.get(rId);
      const region = regions.get(rId);

      if (lakeIds.has(rId) || (region && region.isOcean)) {
        // Ocean or lake region — bright blue
        darkOutput[i * 3] = BRIGHT_WATER[0];
        darkOutput[i * 3 + 1] = BRIGHT_WATER[1];
        darkOutput[i * 3 + 2] = BRIGHT_WATER[2];
      } else {
        // Land regions — 70s washed colors, slight darken
        darkOutput[i * 3] = Math.round(r * 0.75);
        darkOutput[i * 3 + 1] = Math.round(g * 0.75);
        darkOutput[i * 3 + 2] = Math.round(b * 0.75);
      }
    } else {
      // Unassigned — ocean
      darkOutput[i * 3] = BRIGHT_WATER[0];
      darkOutput[i * 3 + 1] = BRIGHT_WATER[1];
      darkOutput[i * 3 + 2] = BRIGHT_WATER[2];
    }
  }

  await sharp(darkOutput, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(OUTPUT_DARK);
  console.log(`Saved dark theme map to ${OUTPUT_DARK}`);

  // Log region info for reference
  console.log("\n=== Region Summary ===");
  for (const [id, region] of landRegions.slice(0, 20)) {
    const color = regionColors.get(id);
    const hex = `#${color.map(c => c.toString(16).padStart(2, '0')).join('')}`;
    const origHex = region.origColor
      ? `#${[region.origColor.r, region.origColor.g, region.origColor.b].map(c => c.toString(16).padStart(2, '0')).join('')}`
      : 'none';
    console.log(`  Region ${id}: ${region.size}px, orig=${origHex} -> ${hex}`);
  }

  console.log("\nDone!");
  console.log("  map_colored.png      - Light theme colored map");
  console.log("  map_colored_dark.png - Dark theme colored map");
}

main().catch(console.error);
