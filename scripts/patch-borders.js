const sharp = require("sharp");
const potrace = require("potrace");
const fs = require("fs");
const path = require("path");

const INPUT_BW = path.join(__dirname, "..", "public", "images", "map_outline_bw.png");
const OUTPUT_PATCHED = path.join(__dirname, "..", "public", "images", "map_patched_bw.png");
const OUTPUT_NORMALIZED = path.join(__dirname, "..", "public", "images", "map_normalized_bw.png");
const OUTPUT_SVG = path.join(__dirname, "..", "public", "images", "map_patched.svg");

// Gap markers from the comparison tool
const markers = [
  { id: 1, x: 526, y: 326 }, { id: 2, x: 537, y: 327 }, { id: 3, x: 509, y: 302 },
  { id: 4, x: 514, y: 310 }, { id: 5, x: 546, y: 333 }, { id: 6, x: 551, y: 340 },
  { id: 7, x: 561, y: 346 }, { id: 8, x: 564, y: 353 }, { id: 9, x: 575, y: 367 },
  { id: 10, x: 566, y: 360 }, { id: 11, x: 576, y: 376 }, { id: 12, x: 584, y: 391 },
  { id: 13, x: 593, y: 400 }, { id: 15, x: 602, y: 411 },
  { id: 16, x: 507, y: 672 }, { id: 17, x: 515, y: 672 }, { id: 18, x: 527, y: 672 },
  { id: 19, x: 543, y: 671 }, { id: 20, x: 551, y: 668 }, { id: 21, x: 557, y: 667 },
  { id: 23, x: 579, y: 666 }, { id: 24, x: 566, y: 666 }, { id: 26, x: 615, y: 670 },
  { id: 28, x: 676, y: 743 }, { id: 29, x: 682, y: 736 }, { id: 30, x: 689, y: 734 },
  { id: 31, x: 696, y: 726 }, { id: 32, x: 700, y: 717 }, { id: 33, x: 705, y: 723 },
  { id: 35, x: 724, y: 729 }, { id: 36, x: 732, y: 729 }, { id: 38, x: 759, y: 743 },
  { id: 40, x: 773, y: 737 }, { id: 41, x: 782, y: 729 }, { id: 42, x: 788, y: 724 },
  { id: 43, x: 751, y: 741 }, { id: 46, x: 743, y: 737 }, { id: 47, x: 736, y: 734 },
  { id: 49, x: 715, y: 729 },
  { id: 50, x: 1127, y: 819 }, { id: 51, x: 1135, y: 819 }, { id: 52, x: 1152, y: 824 },
  { id: 53, x: 1163, y: 824 }, { id: 54, x: 1169, y: 824 }, { id: 55, x: 1180, y: 824 },
  { id: 57, x: 1204, y: 828 }, { id: 58, x: 1194, y: 828 }, { id: 59, x: 1187, y: 827 },
  { id: 60, x: 1215, y: 828 }, { id: 61, x: 1225, y: 831 }, { id: 62, x: 1232, y: 831 },
  { id: 64, x: 1248, y: 835 }, { id: 65, x: 1292, y: 847 },
  { id: 66, x: 1249, y: 823 }, { id: 67, x: 1258, y: 818 }, { id: 68, x: 1267, y: 818 },
  { id: 69, x: 1275, y: 818 }, { id: 70, x: 1285, y: 818 }, { id: 72, x: 1300, y: 819 },
  { id: 73, x: 1292, y: 819 },
  { id: 74, x: 952, y: 902 }, { id: 75, x: 977, y: 901 }, { id: 76, x: 997, y: 912 },
  { id: 77, x: 1004, y: 917 },
  { id: 78, x: 757, y: 866 }, { id: 79, x: 746, y: 864 }, { id: 80, x: 720, y: 856 },
  { id: 81, x: 690, y: 851 },
  { id: 82, x: 1391, y: 225 }, { id: 83, x: 1397, y: 233 }, { id: 84, x: 1402, y: 239 },
  { id: 85, x: 1405, y: 249 }, { id: 86, x: 1409, y: 256 }, { id: 87, x: 1412, y: 265 },
  { id: 88, x: 1415, y: 274 }, { id: 89, x: 1419, y: 280 }, { id: 90, x: 1421, y: 289 },
  { id: 92, x: 1427, y: 308 }, { id: 93, x: 1426, y: 295 }, { id: 94, x: 1429, y: 319 },
  { id: 98, x: 1677, y: 798 }, { id: 99, x: 1687, y: 792 }, { id: 100, x: 1692, y: 786 },
  { id: 101, x: 1699, y: 784 }, { id: 102, x: 1706, y: 775 }, { id: 104, x: 1724, y: 765 },
  { id: 105, x: 1715, y: 769 },
  { id: 106, x: 2079, y: 245 }, { id: 107, x: 2077, y: 254 },
  { id: 108, x: 2179, y: 383 }, { id: 109, x: 2177, y: 397 }, { id: 110, x: 2180, y: 407 },
  { id: 111, x: 2162, y: 423 }, { id: 112, x: 2145, y: 436 }, { id: 113, x: 2138, y: 438 },
  { id: 114, x: 2202, y: 401 }, { id: 115, x: 2219, y: 401 }, { id: 116, x: 2230, y: 401 },
  { id: 117, x: 2243, y: 401 }, { id: 118, x: 2250, y: 400 }, { id: 119, x: 2212, y: 408 },
  { id: 120, x: 2196, y: 356 }, { id: 121, x: 2208, y: 354 }, { id: 122, x: 2218, y: 353 },
  { id: 123, x: 2226, y: 349 },
  { id: 125, x: 2235, y: 255 }, { id: 127, x: 2230, y: 265 }, { id: 128, x: 2236, y: 257 },
  { id: 129, x: 2235, y: 250 }, { id: 130, x: 2236, y: 316 }, { id: 131, x: 2238, y: 327 },
  { id: 132, x: 2244, y: 333 },
  { id: 133, x: 2006, y: 793 }, { id: 134, x: 2014, y: 784 }, { id: 135, x: 2030, y: 773 },
  { id: 136, x: 2041, y: 770 }, { id: 137, x: 2055, y: 770 }, { id: 138, x: 2068, y: 772 },
  { id: 139, x: 2074, y: 775 }, { id: 140, x: 2091, y: 778 }, { id: 141, x: 2083, y: 778 },
  { id: 142, x: 2111, y: 784 }, { id: 144, x: 2117, y: 795 }, { id: 145, x: 2118, y: 801 },
  { id: 147, x: 2131, y: 820 }, { id: 148, x: 2129, y: 810 }, { id: 149, x: 2129, y: 829 },
  { id: 151, x: 2003, y: 834 }, { id: 152, x: 1992, y: 829 },
  { id: 153, x: 2119, y: 845 },
];

// Group markers into border segments by spatial proximity
function groupMarkers(markers, maxDist = 80) {
  const used = new Set();
  const groups = [];

  for (const m of markers) {
    if (used.has(m.id)) continue;
    const group = [m];
    used.add(m.id);

    let changed = true;
    while (changed) {
      changed = false;
      for (const other of markers) {
        if (used.has(other.id)) continue;
        // Check distance to any point in group
        for (const gp of group) {
          const dist = Math.sqrt((other.x - gp.x) ** 2 + (other.y - gp.y) ** 2);
          if (dist < maxDist) {
            group.push(other);
            used.add(other.id);
            changed = true;
            break;
          }
        }
      }
    }
    groups.push(group);
  }

  return groups;
}

// Sort points within a group to form a logical path
function sortSegment(points) {
  if (points.length <= 2) return points;

  // Find the point with the smallest x (or y as tiebreaker) as start
  const sorted = [...points].sort((a, b) => {
    const dx = a.x - b.x;
    return dx !== 0 ? dx : a.y - b.y;
  });

  // Greedy nearest-neighbor ordering
  const ordered = [sorted[0]];
  const remaining = new Set(sorted.slice(1).map((_, i) => i + 0));
  const pool = sorted.slice(1);

  while (remaining.size > 0) {
    const last = ordered[ordered.length - 1];
    let bestIdx = -1;
    let bestDist = Infinity;

    for (const idx of remaining) {
      const p = pool[idx];
      const dist = Math.sqrt((p.x - last.x) ** 2 + (p.y - last.y) ** 2);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    }

    ordered.push(pool[bestIdx]);
    remaining.delete(bestIdx);
  }

  return ordered;
}

// Draw a thick line between two points on raw pixel buffer
function drawLine(data, width, height, x0, y0, x1, y1, thickness) {
  const half = Math.ceil(thickness / 2);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(x0 + dx * t);
    const cy = Math.round(y0 + dy * t);

    // Draw a filled circle at each step
    for (let ox = -half; ox <= half; ox++) {
      for (let oy = -half; oy <= half; oy++) {
        if (ox * ox + oy * oy <= half * half) {
          const px = cx + ox;
          const py = cy + oy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            data[py * width + px] = 0; // black
          }
        }
      }
    }
  }
}

async function main() {
  console.log("Loading B&W outline image...");
  const img = sharp(INPUT_BW);
  const { width, height } = await img.metadata();
  console.log(`Image: ${width}x${height}`);

  const { data } = await img
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Copy to mutable buffer
  const pixels = Buffer.from(data);

  // Group and sort markers into border segments
  const groups = groupMarkers(markers);
  console.log(`\nFound ${groups.length} border segments from ${markers.length} markers:`);

  const BORDER_WIDTH = 3; // consistent border thickness

  for (let i = 0; i < groups.length; i++) {
    const segment = sortSegment(groups[i]);
    console.log(`  Segment ${i + 1}: ${segment.length} points, from (${segment[0].x},${segment[0].y}) to (${segment[segment.length - 1].x},${segment[segment.length - 1].y})`);

    // Draw lines connecting consecutive points
    for (let j = 0; j < segment.length - 1; j++) {
      drawLine(pixels, width, height, segment[j].x, segment[j].y, segment[j + 1].x, segment[j + 1].y, BORDER_WIDTH);
    }
  }

  // Save patched image
  await sharp(pixels, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(OUTPUT_PATCHED);
  console.log(`\nSaved patched B&W to ${OUTPUT_PATCHED}`);

  // === RE-TRACE TO SVG (skip normalization — just trace the patched image) ===
  console.log("\nTracing patched image to SVG...");

  return new Promise((resolve, reject) => {
    potrace.trace(OUTPUT_PATCHED, {
      turdSize: 15,
      optTolerance: 0.4,
      threshold: 128,
      color: "#000000",
      background: "transparent",
    }, (err, svg) => {
      if (err) {
        console.error("Potrace error:", err);
        reject(err);
        return;
      }

      fs.writeFileSync(OUTPUT_SVG, svg);
      console.log(`Saved final SVG to ${OUTPUT_SVG}`);
      console.log("\nDone! Check these files:");
      console.log("  map_patched_bw.png - Gaps filled");
      console.log("  map_patched.svg    - Final clean traced SVG");
      resolve();
    });
  });
}

main().catch(console.error);
