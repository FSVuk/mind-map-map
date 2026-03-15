const sharp = require("sharp");
const potrace = require("potrace");
const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "..", "public", "images", "map_regions_outline.png");
const OUTPUT_SVG = path.join(__dirname, "..", "public", "images", "map_traced.svg");
const OUTPUT_BW = path.join(__dirname, "..", "public", "images", "map_outline_bw.png");

async function main() {
  console.log("Loading image...");
  const img = sharp(INPUT);
  const { width, height } = await img.metadata();
  console.log(`Image dimensions: ${width}x${height}`);

  // Extract raw pixel data
  const { data, info } = await img
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  console.log(`Processing ${info.width}x${info.height} pixels...`);

  // Create a new buffer: keep only near-black pixels (outlines)
  // Filter out: blue ocean, brown mountains, blue rivers, white land
  const bwData = Buffer.alloc(info.width * info.height);

  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // Detect near-black pixels (the outlines)
    // Black outlines: low R, low G, low B
    const isBlack = r < 60 && g < 60 && b < 60;

    // Also detect dark brown (mountain outlines are darker brown)
    // But skip lighter brown mountain fills
    const isDarkOutline = r < 80 && g < 60 && b < 50;

    bwData[i] = (isBlack || isDarkOutline) ? 0 : 255;
  }

  // Save the processed B&W image for inspection
  await sharp(bwData, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .png()
    .toFile(OUTPUT_BW);

  console.log(`Saved B&W image to ${OUTPUT_BW}`);

  // Trace to SVG using potrace
  console.log("Tracing to SVG...");
  potrace.trace(OUTPUT_BW, {
    turdSize: 15,       // suppress speckles of this size
    optTolerance: 0.4,  // curve optimization tolerance
    threshold: 128,     // B&W threshold
    color: "#000000",
    background: "transparent",
  }, (err, svg) => {
    if (err) {
      console.error("Potrace error:", err);
      process.exit(1);
    }

    fs.writeFileSync(OUTPUT_SVG, svg);
    console.log(`Saved traced SVG to ${OUTPUT_SVG}`);
    console.log("Done! Open map_traced.svg to inspect the result.");
    console.log("Open map_outline_bw.png to see what was fed to the tracer.");
  });
}

main().catch(console.error);
