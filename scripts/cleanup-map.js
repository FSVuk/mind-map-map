const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "..", "public", "images", "map_colored_dark.png");
const OUTPUT = path.join(__dirname, "..", "public", "images", "map_colored_dark_clean.png");

async function main() {
  console.log("Loading colored map...");
  const { width, height } = await sharp(INPUT).metadata();
  const data = await sharp(INPUT).removeAlpha().raw().toBuffer();
  console.log(`Dimensions: ${width}x${height}`);

  const output = Buffer.from(data);

  // === Pass 1: Build a set of "valid" region colors ===
  // Count all colors, keep only ones with significant pixel count
  console.log("Identifying valid region colors...");
  const colorCounts = new Map();
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const key = (r << 16) | (g << 8) | b;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }

  // Valid colors: those with at least 500 pixels (real regions, not noise)
  const validColors = new Set();
  for (const [key, count] of colorCounts) {
    if (count >= 500) {
      validColors.add(key);
    }
  }
  console.log(`  ${validColors.size} valid region colors, ${colorCounts.size - validColors.size} noise colors`);

  // === Pass 2: Replace any pixel with an invalid color with its nearest valid neighbor ===
  console.log("Cleaning stray pixels (pass 1: invalid colors)...");
  let fixed = 0;
  const RADIUS = 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const r = data[idx * 3];
      const g = data[idx * 3 + 1];
      const b = data[idx * 3 + 2];
      const key = (r << 16) | (g << 8) | b;

      if (validColors.has(key)) continue; // already a valid color

      // Find the most common valid color in neighborhood
      const neighborCounts = new Map();
      for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        for (let dx = -RADIUS; dx <= RADIUS; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          const nr = data[ni * 3];
          const ng = data[ni * 3 + 1];
          const nb = data[ni * 3 + 2];
          const nkey = (nr << 16) | (ng << 8) | nb;
          if (validColors.has(nkey)) {
            neighborCounts.set(nkey, (neighborCounts.get(nkey) || 0) + 1);
          }
        }
      }

      if (neighborCounts.size > 0) {
        // Pick the most common valid neighbor
        let bestKey = 0, bestCount = 0;
        for (const [nkey, count] of neighborCounts) {
          if (count > bestCount) { bestCount = count; bestKey = nkey; }
        }
        output[idx * 3] = (bestKey >> 16) & 0xFF;
        output[idx * 3 + 1] = (bestKey >> 8) & 0xFF;
        output[idx * 3 + 2] = bestKey & 0xFF;
        fixed++;
      }
    }
  }
  console.log(`  Fixed ${fixed} stray pixels`);

  // === Pass 3: Fix isolated pixels that differ from their neighborhood majority ===
  // Even valid colors can be wrong if they're a lone pixel surrounded by a different color
  console.log("Cleaning isolated pixels (pass 2: minority colors)...");
  const pass2Input = Buffer.from(output);
  let fixed2 = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const r = pass2Input[idx * 3];
      const g = pass2Input[idx * 3 + 1];
      const b = pass2Input[idx * 3 + 2];
      const myKey = (r << 16) | (g << 8) | b;

      // Count colors in 5x5 neighborhood
      const neighborCounts = new Map();
      let total = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          const nkey = (pass2Input[ni * 3] << 16) | (pass2Input[ni * 3 + 1] << 8) | pass2Input[ni * 3 + 2];
          neighborCounts.set(nkey, (neighborCounts.get(nkey) || 0) + 1);
          total++;
        }
      }

      // If this pixel's color is < 15% of neighborhood, replace with majority
      const myCount = neighborCounts.get(myKey) || 0;
      if (myCount < total * 0.15) {
        let bestKey = 0, bestCount = 0;
        for (const [nkey, count] of neighborCounts) {
          if (count > bestCount) { bestCount = count; bestKey = nkey; }
        }
        output[idx * 3] = (bestKey >> 16) & 0xFF;
        output[idx * 3 + 1] = (bestKey >> 8) & 0xFF;
        output[idx * 3 + 2] = bestKey & 0xFF;
        fixed2++;
      }
    }
  }
  console.log(`  Fixed ${fixed2} isolated pixels`);

  // === Pass 4: Run pass 3 again for stubborn clusters ===
  console.log("Cleaning remaining artifacts (pass 3)...");
  const pass3Input = Buffer.from(output);
  let fixed3 = 0;

  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = y * width + x;
      const r = pass3Input[idx * 3];
      const g = pass3Input[idx * 3 + 1];
      const b = pass3Input[idx * 3 + 2];
      const myKey = (r << 16) | (g << 8) | b;

      const neighborCounts = new Map();
      let total = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          const nkey = (pass3Input[ni * 3] << 16) | (pass3Input[ni * 3 + 1] << 8) | pass3Input[ni * 3 + 2];
          neighborCounts.set(nkey, (neighborCounts.get(nkey) || 0) + 1);
          total++;
        }
      }

      const myCount = neighborCounts.get(myKey) || 0;
      if (myCount < total * 0.2) {
        let bestKey = 0, bestCount = 0;
        for (const [nkey, count] of neighborCounts) {
          if (count > bestCount) { bestCount = count; bestKey = nkey; }
        }
        output[idx * 3] = (bestKey >> 16) & 0xFF;
        output[idx * 3 + 1] = (bestKey >> 8) & 0xFF;
        output[idx * 3 + 2] = bestKey & 0xFF;
        fixed3++;
      }
    }
  }
  console.log(`  Fixed ${fixed3} remaining artifacts`);

  // Save
  await sharp(output, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(OUTPUT);

  console.log(`\nSaved cleaned map to ${OUTPUT}`);
  console.log(`Total fixes: ${fixed + fixed2 + fixed3} pixels`);
}

main().catch(console.error);
