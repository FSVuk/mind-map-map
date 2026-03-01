const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const OUTLINE_PNG = path.join(__dirname, "..", "public", "images", "map_regions_outline.png");
const INPUT_SVG = path.join(__dirname, "..", "public", "images", "map_colored.svg");
const OUTPUT_SVG = path.join(__dirname, "..", "public", "images", "map_colored.svg");

// SVG dimensions (from the generated SVG viewBox)
const SVG_W = 2690;
const SVG_H = 1123;

// Mountain style — filled illustrative silhouettes matching the ui_mockup.jpg
const PEAK_BASE_HEIGHT = 32;       // base height of front peaks in SVG units
const PEAK_HEIGHT_VARIANCE = 0.3;  // +/- 30%
const PEAK_SPACING = 22;           // SVG units between peaks along ridgeline
const PEAK_ASYMMETRY = 0.15;       // how lopsided peaks can be (0 = symmetric)
const MIN_CLUSTER_PIXELS = 40;
const SMOOTH_WINDOW = 5;
const RIDGELINE_SAMPLE_STEP = 4;

// Colors — transparent line art mountains
const LINE_COLOR = "#4A3F35";           // warm dark brown line art
const LIGHT_LINE = "#6B5D50";           // lighter brown for back rows
const WASH_FILL = "#5A4F42";            // very subtle interior wash

// ============================
// Seeded PRNG
// ============================
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ============================
// Mountain pixel detection
// ============================
function isMountainPixel(r, g, b) {
  if (r < 100) return false;
  if (r > 230 && g > 230) return false;
  if (b > r) return false;
  if (r - b < 25) return false;
  if (g > r + 10) return false;
  const isBrown = r > 120 && r < 225 && g > 60 && g < 180 && b > 30 && b < 150;
  const warmHue = (r - b) > 35 && r > g;
  return isBrown && warmHue;
}

// ============================
// 8-connected flood fill
// ============================
function floodFill8(mask, width, height, startX, startY, id, regionMap) {
  const stack = [[startX, startY]];
  const pixels = [];
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const idx = y * width + x;
    if (regionMap[idx] !== 0) continue;
    if (!mask[idx]) continue;
    regionMap[idx] = id;
    pixels.push({ x, y });
    stack.push([x-1,y-1],[x,y-1],[x+1,y-1]);
    stack.push([x-1,y],[x+1,y]);
    stack.push([x-1,y+1],[x,y+1],[x+1,y+1]);
  }
  return pixels;
}

// ============================
// Find clusters
// ============================
function findClusters(mask, width, height) {
  const regionMap = new Int32Array(width * height);
  const clusters = [];
  let nextId = 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!mask[idx] || regionMap[idx] !== 0) continue;
      const id = nextId++;
      const pixels = floodFill8(mask, width, height, x, y, id, regionMap);
      if (pixels.length >= MIN_CLUSTER_PIXELS) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of pixels) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        clusters.push({ id, pixels, bounds: { minX, maxX, minY, maxY }, size: pixels.length });
      }
    }
  }
  return clusters;
}

// ============================
// Compute ridgeline (bottom edge — the base of the mountains)
// ============================
function computeRidgeline(cluster) {
  const { pixels, bounds } = cluster;
  const { minX, maxX, minY, maxY } = bounds;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const horizontal = w >= h;
  const ridgePoints = [];

  if (horizontal) {
    const byCol = new Map();
    for (const p of pixels) {
      if (!byCol.has(p.x)) byCol.set(p.x, []);
      byCol.get(p.x).push(p.y);
    }
    for (let x = minX; x <= maxX; x += RIDGELINE_SAMPLE_STEP) {
      const ys = [];
      for (let dx = 0; dx < RIDGELINE_SAMPLE_STEP; dx++) {
        const col = byCol.get(x + dx);
        if (col) ys.push(...col);
      }
      if (ys.length === 0) continue;
      ys.sort((a, b) => a - b);
      // Use the bottom (max Y) as the base, and median as the "center"
      const baseY = ys[ys.length - 1];
      const medY = ys[Math.floor(ys.length / 2)];
      const topY = ys[0];
      ridgePoints.push({
        x: x + RIDGELINE_SAMPLE_STEP / 2,
        baseY,
        medY,
        topY,
        spread: baseY - topY,
      });
    }
  } else {
    const byRow = new Map();
    for (const p of pixels) {
      if (!byRow.has(p.y)) byRow.set(p.y, []);
      byRow.get(p.y).push(p.x);
    }
    for (let y = minY; y <= maxY; y += RIDGELINE_SAMPLE_STEP) {
      const xs = [];
      for (let dy = 0; dy < RIDGELINE_SAMPLE_STEP; dy++) {
        const row = byRow.get(y + dy);
        if (row) xs.push(...row);
      }
      if (xs.length === 0) continue;
      xs.sort((a, b) => a - b);
      const medX = xs[Math.floor(xs.length / 2)];
      ridgePoints.push({
        x: medX,
        baseY: y + RIDGELINE_SAMPLE_STEP / 2,
        medY: y + RIDGELINE_SAMPLE_STEP / 2,
        topY: y + RIDGELINE_SAMPLE_STEP / 2,
        spread: xs[xs.length - 1] - xs[0],
      });
    }
  }
  return ridgePoints;
}

// ============================
// Smooth ridgeline
// ============================
function smoothRidgeline(points, windowSize) {
  if (points.length < windowSize) return points;
  const half = Math.floor(windowSize / 2);
  const smoothed = [];
  for (let i = 0; i < points.length; i++) {
    let sx = 0, sby = 0, smy = 0, sty = 0, ssp = 0, count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
      sx += points[j].x;
      sby += points[j].baseY;
      smy += points[j].medY;
      sty += points[j].topY;
      ssp += points[j].spread;
      count++;
    }
    smoothed.push({
      x: sx / count,
      baseY: sby / count,
      medY: smy / count,
      topY: sty / count,
      spread: ssp / count,
    });
  }
  return smoothed;
}

// ============================
// Scale to SVG coordinates
// ============================
function scaleToSvg(points, srcWidth, srcHeight) {
  const sx = SVG_W / srcWidth;
  const sy = SVG_H / srcHeight;
  return points.map(p => ({
    x: R(p.x * sx),
    baseY: R(p.baseY * sy),
    medY: R(p.medY * sy),
    topY: R(p.topY * sy),
    spread: R(p.spread * sy),
  }));
}

function R(n) { return Math.round(n * 10) / 10; }

// ============================
// Generate a single mountain peak silhouette (filled triangle)
// Returns { body, shadow, ridgeLines, outline }
// ============================
function generatePeakShape(cx, baseY, height, halfWidth, rng) {
  // Asymmetric peak — tip offset slightly left or right
  const asymmetry = (rng() - 0.5) * 2 * PEAK_ASYMMETRY * halfWidth;
  const tipX = cx + asymmetry;
  const tipY = baseY - height;

  // Slight irregularity on the slopes
  const leftBaseX = cx - halfWidth;
  const rightBaseX = cx + halfWidth;

  // Optional mid-slope bumps for organic feel
  const leftMidX = leftBaseX + halfWidth * 0.3 + (rng() - 0.5) * 3;
  const leftMidY = baseY - height * (0.4 + rng() * 0.15);
  const rightMidX = rightBaseX - halfWidth * 0.3 + (rng() - 0.5) * 3;
  const rightMidY = baseY - height * (0.35 + rng() * 0.15);

  // Full mountain body path (filled)
  const body = `M${R(leftBaseX)} ${R(baseY)}`
    + `L${R(leftMidX)} ${R(leftMidY)}`
    + `L${R(tipX)} ${R(tipY)}`
    + `L${R(rightMidX)} ${R(rightMidY)}`
    + `L${R(rightBaseX)} ${R(baseY)}Z`;

  // Shadow: right half of the mountain (from tip down the right slope)
  const shadowMidX = tipX + (rightBaseX - tipX) * 0.15;
  const shadowMidY = tipY + (baseY - tipY) * 0.15;
  const shadow = `M${R(tipX)} ${R(tipY)}`
    + `L${R(rightMidX)} ${R(rightMidY)}`
    + `L${R(rightBaseX)} ${R(baseY)}`
    + `L${R(shadowMidX)} ${R(shadowMidY)}Z`;

  // Ridge detail lines (1-2 lines from near tip down the left slope)
  let ridgeLines = "";
  const numRidges = 1 + Math.floor(rng() * 2);
  for (let r = 0; r < numRidges; r++) {
    const t1 = 0.15 + r * 0.2 + rng() * 0.1;
    const t2 = t1 + 0.2 + rng() * 0.15;
    const rx1 = tipX + (leftMidX - tipX) * t1;
    const ry1 = tipY + (leftMidY - tipY) * t1;
    const rx2 = tipX + (leftBaseX - tipX) * t2;
    const ry2 = tipY + (baseY - tipY) * t2;
    ridgeLines += `M${R(rx1)} ${R(ry1)}L${R(rx2)} ${R(ry2)}`;
  }

  // Outline path (same as body but for thin stroke)
  const outline = `M${R(leftBaseX)} ${R(baseY)}`
    + `L${R(leftMidX)} ${R(leftMidY)}`
    + `L${R(tipX)} ${R(tipY)}`
    + `L${R(rightMidX)} ${R(rightMidY)}`
    + `L${R(rightBaseX)} ${R(baseY)}`;

  return { body, shadow, ridgeLines, outline, tipX, tipY, leftBaseX, rightBaseX, baseY: baseY };
}

// ============================
// Generate mountain range along a ridgeline
// ============================
function generateMountainRange(ridge, rng) {
  if (ridge.length < 2) return { backBodies: "", midBodies: "", frontBodies: "", shadows: "", ridgeDetails: "", outlines: "" };

  // Compute arc lengths along the ridgeline
  const arcLengths = [0];
  for (let i = 1; i < ridge.length; i++) {
    const dx = ridge[i].x - ridge[i - 1].x;
    const dy = ridge[i].baseY - ridge[i - 1].baseY;
    arcLengths.push(arcLengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLength = arcLengths[arcLengths.length - 1];
  if (totalLength < 10) return { backBodies: "", midBodies: "", frontBodies: "", shadows: "", ridgeDetails: "", outlines: "" };

  // Interpolate a point along the ridgeline at a given arc distance
  function interpAt(dist) {
    let segIdx = 0;
    for (let i = 1; i < arcLengths.length; i++) {
      if (arcLengths[i] >= dist) { segIdx = i - 1; break; }
      if (i === arcLengths.length - 1) segIdx = i - 1;
    }
    const segStart = arcLengths[segIdx];
    const segEnd = arcLengths[segIdx + 1] || arcLengths[segIdx];
    const t = (segEnd > segStart) ? Math.min(1, (dist - segStart) / (segEnd - segStart)) : 0;
    const a = ridge[segIdx];
    const b = ridge[Math.min(segIdx + 1, ridge.length - 1)];
    return {
      x: a.x + (b.x - a.x) * t,
      baseY: a.baseY + (b.baseY - a.baseY) * t,
      spread: a.spread + (b.spread - a.spread) * t,
    };
  }

  // Determine average spread (height of mountain marking in source)
  let avgSpread = 0;
  for (const p of ridge) avgSpread += p.spread;
  avgSpread /= ridge.length;
  // Scale peak height relative to the original mountain marking size
  const heightScale = Math.max(0.7, Math.min(1.5, avgSpread / 25));

  let backBodies = "";
  let midBodies = "";
  let frontBodies = "";
  let shadows = "";
  let ridgeDetails = "";
  let outlines = "";

  // Place peaks along the ridgeline
  let dist = PEAK_SPACING * 0.3;
  while (dist < totalLength - PEAK_SPACING * 0.2) {
    const pt = interpAt(dist);
    const heightMul = (0.7 + rng() * 0.6) * heightScale;

    // === Back row peaks (2 smaller peaks behind) ===
    for (let b = 0; b < 2; b++) {
      const bkH = PEAK_BASE_HEIGHT * heightMul * (0.5 + rng() * 0.3);
      const bkW = bkH * (0.6 + rng() * 0.2);
      const bkOffX = (rng() - 0.5) * PEAK_SPACING * 0.6;
      const bkOffY = -(3 + rng() * 5); // slightly above base
      const peak = generatePeakShape(
        pt.x + bkOffX, pt.baseY + bkOffY, bkH, bkW, rng
      );
      backBodies += peak.body;
    }

    // === Mid row peak ===
    {
      const midH = PEAK_BASE_HEIGHT * heightMul * (0.7 + rng() * 0.3);
      const midW = midH * (0.55 + rng() * 0.2);
      const midOffX = (rng() - 0.5) * 6;
      const peak = generatePeakShape(
        pt.x + midOffX, pt.baseY, midH, midW, rng
      );
      midBodies += peak.body;
      shadows += peak.shadow;
      ridgeDetails += peak.ridgeLines;
    }

    // === Front row peak (tallest) ===
    {
      const fgH = PEAK_BASE_HEIGHT * heightMul * (0.9 + rng() * 0.3);
      const fgW = fgH * (0.5 + rng() * 0.2);
      const fgOffX = (rng() - 0.5) * 4;
      const peak = generatePeakShape(
        pt.x + fgOffX, pt.baseY + 2, fgH, fgW, rng
      );
      frontBodies += peak.body;
      shadows += peak.shadow;
      ridgeDetails += peak.ridgeLines;
      outlines += peak.outline;
    }

    dist += PEAK_SPACING * (0.7 + rng() * 0.5);
  }

  return { backBodies, midBodies, frontBodies, shadows, ridgeDetails, outlines };
}

// ============================
// Generate full mountain SVG group
// ============================
function generateMountainSvg(ridgelines) {
  const rng = seededRandom(42);

  let allBackBodies = "";
  let allMidBodies = "";
  let allFrontBodies = "";
  let allShadows = "";
  let allRidgeDetails = "";
  let allOutlines = "";

  for (const ridge of ridgelines) {
    const result = generateMountainRange(ridge, rng);
    allBackBodies += result.backBodies;
    allMidBodies += result.midBodies;
    allFrontBodies += result.frontBodies;
    allShadows += result.shadows;
    allRidgeDetails += result.ridgeDetails;
    allOutlines += result.outlines;
  }

  return `  <!-- Mountains (transparent line art style) -->
  <g id="mountains">
    <!-- Subtle interior wash for depth (very transparent) -->
    <g fill="${WASH_FILL}" opacity="0.08">
      <path d="${allMidBodies}"/>
      <path d="${allFrontBodies}"/>
    </g>
    <!-- Back row - faint distant peaks -->
    <g fill="none" stroke="${LIGHT_LINE}" stroke-width="0.8" opacity="0.25" stroke-linecap="round" stroke-linejoin="round">
      <path d="${allBackBodies}"/>
    </g>
    <!-- Mid row outlines -->
    <g fill="none" stroke="${LINE_COLOR}" stroke-width="1.0" opacity="0.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="${allMidBodies}"/>
    </g>
    <!-- Front row outlines - most prominent -->
    <g fill="none" stroke="${LINE_COLOR}" stroke-width="1.3" opacity="0.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="${allFrontBodies}"/>
    </g>
    <!-- Shadow hatching on right slopes -->
    <g fill="none" stroke="${LINE_COLOR}" stroke-width="0.6" opacity="0.3" stroke-linecap="round">
      <path d="${allShadows}"/>
    </g>
    <!-- Ridge detail lines -->
    <g fill="none" stroke="${LIGHT_LINE}" stroke-width="0.5" opacity="0.3" stroke-linecap="round">
      <path d="${allRidgeDetails}"/>
    </g>
  </g>`;
}

// ============================
// Inject mountain group into SVG
// ============================
function injectIntoSvg(svgContent, mountainSvg) {
  const marker = "  <!-- Borders -->";
  const idx = svgContent.indexOf(marker);
  if (idx === -1) {
    const svgClose = svgContent.lastIndexOf("</svg>");
    return svgContent.slice(0, svgClose) + "\n" + mountainSvg + "\n\n" + svgContent.slice(svgClose);
  }
  return svgContent.slice(0, idx) + mountainSvg + "\n\n" + svgContent.slice(idx);
}

// ============================
// Main
// ============================
async function main() {
  console.log("=== Add Mountains to SVG (Illustrated Style) ===\n");

  // Step 1: Load outline image
  console.log("Loading outline image...");
  const meta = await sharp(OUTLINE_PNG).metadata();
  const { width, height } = meta;
  console.log(`  Source: ${width}x${height}`);
  const rawData = await sharp(OUTLINE_PNG).removeAlpha().raw().toBuffer();

  // Step 2: Build mountain mask
  console.log("Building mountain pixel mask...");
  const mask = new Uint8Array(width * height);
  let mountainPixels = 0;
  for (let i = 0; i < width * height; i++) {
    const r = rawData[i * 3];
    const g = rawData[i * 3 + 1];
    const b = rawData[i * 3 + 2];
    if (isMountainPixel(r, g, b)) {
      mask[i] = 1;
      mountainPixels++;
    }
  }
  console.log(`  Found ${mountainPixels} mountain pixels (${(mountainPixels / (width * height) * 100).toFixed(1)}%)`);

  // Save debug mask
  const debugMask = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) debugMask[i] = mask[i] ? 0 : 255;
  const debugPath = path.join(__dirname, "..", "public", "images", "_debug_mountain_mask.png");
  await sharp(debugMask, { raw: { width, height, channels: 1 } }).png().toFile(debugPath);
  console.log(`  Debug mask saved to ${debugPath}`);

  // Step 3: Cluster mountain pixels
  console.log("Clustering mountain ranges...");
  const clusters = findClusters(mask, width, height);
  clusters.sort((a, b) => b.size - a.size);
  console.log(`  Found ${clusters.length} mountain ranges`);
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const bw = c.bounds.maxX - c.bounds.minX;
    const bh = c.bounds.maxY - c.bounds.minY;
    console.log(`    Range ${i + 1}: ${c.size}px, ${bw}x${bh} at (${c.bounds.minX},${c.bounds.minY})`);
  }

  // Step 4: Compute and smooth ridgelines
  console.log("Computing ridgelines...");
  const ridgelines = [];
  for (const cluster of clusters) {
    let ridge = computeRidgeline(cluster);
    ridge = smoothRidgeline(ridge, SMOOTH_WINDOW);
    if (ridge.length >= 2) {
      ridge = scaleToSvg(ridge, width, height);
      ridgelines.push(ridge);
    }
  }
  console.log(`  Generated ${ridgelines.length} ridgelines`);

  // Step 5: Generate mountain SVG
  console.log("Generating illustrated mountain peaks...");
  const mountainSvg = generateMountainSvg(ridgelines);
  const peakCount = (mountainSvg.match(/Z/g) || []).length;
  console.log(`  Generated ~${peakCount} filled mountain shapes`);

  // Step 6: Inject into SVG
  console.log("Injecting into SVG...");
  let svgContent = fs.readFileSync(INPUT_SVG, "utf-8");

  // Remove any existing mountain group first (for re-runs)
  svgContent = svgContent.replace(/\s*<!-- Mountains[\s\S]*?<\/g>\n\s*<\/g>/g, "");
  // More aggressive cleanup in case the above didn't catch it
  svgContent = svgContent.replace(/\s*<g id="mountains">[\s\S]*?<\/g>\s*<\/g>\s*<\/g>\s*<\/g>\s*<\/g>\s*<\/g>\s*<\/g>/g, "");

  const outputSvg = injectIntoSvg(svgContent, mountainSvg);

  fs.writeFileSync(OUTPUT_SVG, outputSvg);
  const sizeKB = (Buffer.byteLength(outputSvg) / 1024).toFixed(0);
  console.log(`\nSaved ${OUTPUT_SVG} (${sizeKB} KB)`);
  console.log("Done! Open the SVG in a browser to check the result.");
}

main().catch(console.error);
