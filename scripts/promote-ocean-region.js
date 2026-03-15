const sharp = require("sharp");
const potrace = require("potrace");
const fs = require("fs");
const path = require("path");

const COLORED_PNG = path.join(__dirname, "..", "public", "images", "map_colored_dark_clean.png");
const BASE_SVG = path.join(__dirname, "..", "public", "images", "map_base.svg");
const PREVIEW_PNG = path.join(__dirname, "..", "public", "images", "_orphan_preview.png");

// ── Helpers ─────────────────────────────────────────────────────

function floodFill(data, width, height, startX, startY, visited, matchFn) {
  const stack = [[startX, startY]];
  const pixels = [];

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const idx = y * width + x;
    if (visited[idx]) continue;

    const r = data[idx * 3];
    const g = data[idx * 3 + 1];
    const b = data[idx * 3 + 2];
    if (!matchFn(r, g, b)) continue;

    visited[idx] = true;
    pixels.push({ x, y });

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return pixels;
}

function pixelBrightness(r, g, b) {
  return r * 0.3 + g * 0.59 + b * 0.11;
}

function bbox(pixels) {
  let minX = Infinity, maxX = 0, minY = Infinity, maxY = 0;
  for (const p of pixels) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0]; // "sample", "fill", "scan", or "promote"

  console.log("Loading colored map...");
  const { width, height } = await sharp(COLORED_PNG).metadata();
  const data = await sharp(COLORED_PNG).removeAlpha().raw().toBuffer();
  console.log(`  Dimensions: ${width}x${height}`);

  // ── Mode: sample — show pixel colors in a region ─────────────
  if (mode === "sample") {
    const cx = parseInt(args[1]);
    const cy = parseInt(args[2]);
    const radius = parseInt(args[3]) || 5;
    if (isNaN(cx) || isNaN(cy)) {
      console.log("Usage: node promote-ocean-region.js sample <x> <y> [radius]");
      return;
    }
    console.log(`\nSampling ${radius*2+1}x${radius*2+1} area around (${cx}, ${cy}):`);
    const colors = new Map();
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const idx = (y * width + x) * 3;
        const key = `${data[idx]},${data[idx+1]},${data[idx+2]}`;
        colors.set(key, (colors.get(key) || 0) + 1);
      }
    }
    const sorted = [...colors.entries()].sort((a, b) => b[1] - a[1]);
    console.log("  Most common colors:");
    for (const [key, count] of sorted.slice(0, 10)) {
      const [r,g,b] = key.split(",").map(Number);
      const hex = `#${[r,g,b].map(c => c.toString(16).padStart(2,"0")).join("")}`;
      console.log(`    rgb(${r}, ${g}, ${b}) = ${hex}  (${count}px)`);
    }
    return;
  }

  // ── Mode: fill — flood-fill from a point, bounded by dark borders ──
  if (mode === "fill") {
    const cx = parseInt(args[1]);
    const cy = parseInt(args[2]);
    if (isNaN(cx) || isNaN(cy)) {
      console.log("Usage: node promote-ocean-region.js fill <x> <y>");
      return;
    }

    // Find a non-border pixel near the target (search outward in a spiral)
    const BORDER_THRESHOLD = 40;
    let startX = cx, startY = cy;
    let foundStart = false;

    const startIdx = (cy * width + cx) * 3;
    if (pixelBrightness(data[startIdx], data[startIdx+1], data[startIdx+2]) < BORDER_THRESHOLD) {
      console.log(`\nPixel at (${cx}, ${cy}) is a border pixel, searching nearby...`);
      for (let r = 1; r <= 30 && !foundStart; r++) {
        for (let dy = -r; dy <= r && !foundStart; dy++) {
          for (let dx = -r; dx <= r && !foundStart; dx++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // only check perimeter
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const ni = (ny * width + nx) * 3;
            if (pixelBrightness(data[ni], data[ni+1], data[ni+2]) >= BORDER_THRESHOLD) {
              startX = nx; startY = ny; foundStart = true;
            }
          }
        }
      }
      if (!foundStart) {
        console.error("  Could not find a non-border pixel within 30px. Try different coordinates.");
        return;
      }
      const si = (startY * width + startX) * 3;
      console.log(`  Found interior pixel at (${startX}, ${startY}): rgb(${data[si]}, ${data[si+1]}, ${data[si+2]})`);
    } else {
      const si = (startY * width + startX) * 3;
      console.log(`\nTarget pixel at (${startX}, ${startY}): rgb(${data[si]}, ${data[si+1]}, ${data[si+2]})`);
    }

    // Flood-fill from the found point, stopping at dark border pixels
    const visited = new Uint8Array(width * height);
    const matchFn = (r, g, b) => pixelBrightness(r, g, b) >= BORDER_THRESHOLD;

    const pixels = floodFill(data, width, height, startX, startY, visited, matchFn);
    const bb = bbox(pixels);

    console.log(`  Flood-filled ${pixels.length} pixels`);
    console.log(`  Bounding box: (${bb.minX},${bb.minY})-(${bb.maxX},${bb.maxY})`);
    console.log(`  Center: (${Math.round((bb.minX+bb.maxX)/2)}, ${Math.round((bb.minY+bb.maxY)/2)})`);

    // Generate preview
    const preview = Buffer.from(data);
    for (const p of pixels) {
      const idx = (p.y * width + p.x) * 3;
      preview[idx] = 255;
      preview[idx + 1] = 0;
      preview[idx + 2] = 255;
    }
    await sharp(preview, { raw: { width, height, channels: 3 } }).png().toFile(PREVIEW_PNG);
    console.log(`  Preview saved to ${PREVIEW_PNG}`);
    console.log(`\nIf this looks correct, run:`);
    console.log(`  node scripts/promote-ocean-region.js promote ${cx} ${cy}`);
    return;
  }

  // ── Mode: scan — find all non-land areas (original behavior) ──
  if (mode === "scan" || !mode) {
    // Auto-detect ocean color from corners
    const corners = [
      [0, 0], [width-1, 0], [0, height-1], [width-1, height-1],
      [5, 5], [width-6, 5], [5, height-6], [width-6, height-6],
    ];
    let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
    for (const [sx, sy] of corners) {
      const idx = (sy * width + sx) * 3;
      rSum += data[idx]; gSum += data[idx+1]; bSum += data[idx+2]; cnt++;
    }
    const oR = Math.round(rSum/cnt), oG = Math.round(gSum/cnt), oB = Math.round(bSum/cnt);
    console.log(`  Ocean color: rgb(${oR}, ${oG}, ${oB})`);

    const TOL = 30;
    const isOcean = (r,g,b) =>
      Math.abs(r-oR) <= TOL && Math.abs(g-oG) <= TOL && Math.abs(b-oB) <= TOL;

    const visited = new Uint8Array(width * height);
    const components = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;
        const r = data[idx*3], g = data[idx*3+1], b = data[idx*3+2];
        if (!isOcean(r,g,b)) { visited[idx] = true; continue; }
        const pixels = floodFill(data, width, height, x, y, visited, isOcean);
        if (pixels.length > 50) {
          const bb = bbox(pixels);
          let edge = false;
          for (const p of pixels) {
            if (p.x === 0 || p.x === width-1 || p.y === 0 || p.y === height-1) { edge = true; break; }
          }
          components.push({ id: components.length, pixels, size: pixels.length, touchesEdge: edge, bbox: bb,
            centerX: Math.round((bb.minX+bb.maxX)/2), centerY: Math.round((bb.minY+bb.maxY)/2) });
        }
      }
    }

    components.sort((a,b) => b.size - a.size);
    if (components.length === 0) {
      console.log("No ocean components found."); return;
    }

    console.log(`\nFound ${components.length} ocean components:`);
    for (const c of components) {
      console.log(`  [${c.id}] ${c.size}px center=(${c.centerX},${c.centerY}) edge=${c.touchesEdge}`);
    }
    return;
  }

  // ── Mode: promote — flood-fill from point and add as region ───
  if (mode === "promote") {
    const cx = parseInt(args[1]);
    const cy = parseInt(args[2]);
    if (isNaN(cx) || isNaN(cy)) {
      console.log("Usage: node promote-ocean-region.js promote <x> <y>");
      return;
    }

    // Find a non-border pixel near the target
    const BORDER_THRESHOLD = 40;
    let startX = cx, startY = cy;
    let foundStart = false;

    const startIdx2 = (cy * width + cx) * 3;
    if (pixelBrightness(data[startIdx2], data[startIdx2+1], data[startIdx2+2]) < BORDER_THRESHOLD) {
      console.log(`\nPixel at (${cx}, ${cy}) is a border pixel, searching nearby...`);
      for (let r = 1; r <= 30 && !foundStart; r++) {
        for (let dy = -r; dy <= r && !foundStart; dy++) {
          for (let dx = -r; dx <= r && !foundStart; dx++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const ni = (ny * width + nx) * 3;
            if (pixelBrightness(data[ni], data[ni+1], data[ni+2]) >= BORDER_THRESHOLD) {
              startX = nx; startY = ny; foundStart = true;
            }
          }
        }
      }
      if (!foundStart) {
        console.error("  Could not find a non-border pixel within 30px.");
        return;
      }
      const si = (startY * width + startX) * 3;
      console.log(`  Found interior pixel at (${startX}, ${startY}): rgb(${data[si]}, ${data[si+1]}, ${data[si+2]})`);
    } else {
      console.log(`\nTarget pixel at (${cx}, ${cy}): rgb(${data[startIdx2]}, ${data[startIdx2+1]}, ${data[startIdx2+2]})`);
    }

    // Flood-fill bounded by dark border pixels
    const visited = new Uint8Array(width * height);
    const matchFn = (r, g, b) => pixelBrightness(r, g, b) >= BORDER_THRESHOLD;

    const pixels = floodFill(data, width, height, startX, startY, visited, matchFn);
    const bb = bbox(pixels);
    console.log(`  Flood-filled ${pixels.length} pixels`);
    console.log(`  Bbox: (${bb.minX},${bb.minY})-(${bb.maxX},${bb.maxY})`);

    if (pixels.length < 20) {
      console.error("Too few pixels — check coordinates or border threshold.");
      return;
    }

    // Create binary mask
    const mask = Buffer.alloc(width * height, 255);
    for (const p of pixels) {
      mask[p.y * width + p.x] = 0;
    }

    const tmpMask = path.join(__dirname, "_tmp_orphan_mask.png");
    await sharp(mask, { raw: { width, height, channels: 1 } }).png().toFile(tmpMask);

    // Trace with potrace
    console.log("  Tracing region outline...");
    const tracedSvg = await new Promise((resolve, reject) => {
      potrace.trace(tmpMask, {
        turdSize: 10,
        optTolerance: 0.5,
        threshold: 128,
        color: "#F0EDE8",
        background: "transparent",
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    fs.unlinkSync(tmpMask);

    const pathMatch = tracedSvg.match(/<path\s+d="([^"]+)"/);
    if (!pathMatch) {
      console.error("Error: potrace produced no path data!");
      return;
    }

    const newPathD = pathMatch[1];
    console.log(`  Path data: ${newPathD.length} chars`);

    // Find next region ID
    const svg = fs.readFileSync(BASE_SVG, "utf-8");
    const existingIds = [...svg.matchAll(/data-region="(\d+)"/g)].map(m => parseInt(m[1]));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    console.log(`  Existing regions: ${existingIds.length} (IDs: ${Math.min(...existingIds)}-${Math.max(...existingIds)})`);
    console.log(`  New region ID: ${nextId}`);

    // Inject new path into SVG
    const newPathTag = `    <path fill="#F0EDE8" data-region="${nextId}" d="${newPathD}" fill-rule="evenodd"/>`;

    // Try inserting before the closing </g> of the regions group
    let updatedSvg = svg.replace(
      /(<g id="regions">[\s\S]*?)(<\/g>\s*\n\s*<!--\s*Rivers)/,
      `$1\n${newPathTag}\n  $2`
    );

    if (updatedSvg === svg) {
      // Fallback: insert after last data-region path before </g>
      updatedSvg = svg.replace(
        /(data-region="\d+"[^>]*>)(\s*<\/g>)/,
        `$1\n${newPathTag}$2`
      );
    }

    if (updatedSvg === svg) {
      console.error("Could not inject path into SVG. Manual insertion required.");
      console.log(`\nPath tag:\n${newPathTag}`);
      return;
    }

    fs.writeFileSync(BASE_SVG, updatedSvg);
    console.log(`\n  Updated ${BASE_SVG}`);
    console.log(`  Region ${nextId} added!`);
    console.log(`\nNext: node scripts/extract-regions.js`);
  }
}

main().catch(console.error);
