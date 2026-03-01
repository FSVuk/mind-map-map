const sharp = require("sharp");
const potrace = require("potrace");
const fs = require("fs");
const path = require("path");

const COLORED_PNG = path.join(__dirname, "..", "public", "images", "map_colored_dark.png");
const BORDERS_BW = path.join(__dirname, "..", "public", "images", "map_patched_bw.png");
const RIVERS_BW = path.join(__dirname, "..", "public", "images", "map_rivers_bw.png");
const OUTPUT_SVG = path.join(__dirname, "..", "public", "images", "map_colored.svg");

async function main() {
  console.log("Loading images...");
  const { width, height } = await sharp(COLORED_PNG).metadata();
  console.log(`Dimensions: ${width}x${height}`);

  const colorData = await sharp(COLORED_PNG).removeAlpha().raw().toBuffer();
  const bwData = await sharp(BORDERS_BW).greyscale().raw().toBuffer();

  const riversMeta = await sharp(RIVERS_BW).metadata();
  let riversData;
  if (riversMeta.width !== width || riversMeta.height !== height) {
    riversData = await sharp(RIVERS_BW).resize(width, height, { fit: "fill" }).greyscale().raw().toBuffer();
  } else {
    riversData = await sharp(RIVERS_BW).greyscale().raw().toBuffer();
  }

  // === Step 1: Identify all unique colors in the colored PNG ===
  console.log("Scanning for unique region colors...");
  const colorMap = new Map(); // "r,g,b" -> pixel count
  for (let i = 0; i < width * height; i++) {
    const r = colorData[i * 3];
    const g = colorData[i * 3 + 1];
    const b = colorData[i * 3 + 2];
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  // Sort by frequency, filter out tiny noise colors
  const colors = [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 100);

  console.log(`Found ${colors.length} significant colors`);

  // === Step 2: For each color, create a mask and trace it ===
  console.log("Tracing each color layer...");
  const svgPaths = [];
  const TOLERANCE = 8; // color matching tolerance for anti-aliased edges

  for (let ci = 0; ci < colors.length; ci++) {
    const [key, count] = colors[ci];
    const [tr, tg, tb] = key.split(",").map(Number);
    const hex = `#${[tr, tg, tb].map(c => c.toString(16).padStart(2, "0")).join("")}`;

    // Create a B&W mask for this color
    const mask = Buffer.alloc(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = colorData[i * 3];
      const g = colorData[i * 3 + 1];
      const b = colorData[i * 3 + 2];
      const dr = Math.abs(r - tr);
      const dg = Math.abs(g - tg);
      const db = Math.abs(b - tb);
      mask[i] = (dr <= TOLERANCE && dg <= TOLERANCE && db <= TOLERANCE) ? 0 : 255;
    }

    // Save temp mask
    const tmpMask = path.join(__dirname, "..", "public", "images", `_tmp_mask_${ci}.png`);
    await sharp(mask, { raw: { width, height, channels: 1 } }).png().toFile(tmpMask);

    // Trace
    const svg = await new Promise((resolve, reject) => {
      potrace.trace(tmpMask, {
        turdSize: 20,
        optTolerance: 0.6,
        threshold: 128,
        color: hex,
        background: "transparent",
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // Extract path data
    const pathMatch = svg.match(/<path\s+d="([^"]+)"/);
    if (pathMatch) {
      svgPaths.push({ hex, d: pathMatch[1], count, ci });
      process.stdout.write(`  [${ci + 1}/${colors.length}] ${hex} (${count}px)\r`);
    }

    // Clean up temp file
    fs.unlinkSync(tmpMask);
  }

  console.log(`\nTraced ${svgPaths.length} color layers`);

  // === Step 3: Trace borders separately for crisp black lines ===
  console.log("Tracing borders...");
  const borderSvg = await new Promise((resolve, reject) => {
    potrace.trace(BORDERS_BW, {
      turdSize: 15,
      optTolerance: 0.4,
      threshold: 128,
      color: "#000000",
      background: "transparent",
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
  const borderPathMatch = borderSvg.match(/<path\s+d="([^"]+)"/);

  // === Step 4: Trace rivers ===
  console.log("Tracing rivers...");
  const riverSvg = await new Promise((resolve, reject) => {
    potrace.trace(RIVERS_BW, {
      turdSize: 10,
      optTolerance: 0.3,
      threshold: 128,
      color: "#1E6EDC",
      background: "transparent",
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
  const riverPathMatch = riverSvg.match(/<path\s+d="([^"]+)"/);

  // === Step 5: Assemble final SVG ===
  console.log("Assembling SVG...");

  // Sort: background/ocean first, then land regions, then rivers, then borders on top
  const waterHex = "#1e6edc";
  const borderHex = "#000000";

  const waterLayers = svgPaths.filter(p => p.hex.toLowerCase() === waterHex || p.hex === "#1e6edc");
  const landLayers = svgPaths.filter(p => p.hex.toLowerCase() !== waterHex && p.hex !== "#1e6edc" && p.hex !== borderHex);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Ocean/water background -->
  <rect width="${width}" height="${height}" fill="#1E6EDC"/>

  <!-- Land regions -->
  <g id="regions">
`;

  for (const layer of landLayers) {
    svg += `    <path d="${layer.d}" fill="${layer.hex}" fill-rule="evenodd"/>\n`;
  }

  svg += `  </g>

  <!-- Rivers and lakes -->
  <g id="water">
`;
  if (riverPathMatch) {
    svg += `    <path d="${riverPathMatch[1]}" fill="#1E6EDC" fill-rule="evenodd"/>\n`;
  }
  svg += `  </g>

  <!-- Borders -->
  <g id="borders">
`;
  if (borderPathMatch) {
    svg += `    <path d="${borderPathMatch[1]}" fill="#000000" fill-rule="evenodd"/>\n`;
  }
  svg += `  </g>
</svg>`;

  fs.writeFileSync(OUTPUT_SVG, svg);

  const sizeMB = (Buffer.byteLength(svg) / 1024 / 1024).toFixed(1);
  console.log(`\nSaved ${OUTPUT_SVG} (${sizeMB} MB)`);
  console.log(`  ${landLayers.length} land layers + rivers + borders`);
  console.log("Done!");
}

main().catch(console.error);
