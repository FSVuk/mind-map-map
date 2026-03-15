const sharp = require("sharp");
const potrace = require("potrace");
const fs = require("fs");
const path = require("path");

const INPUT_BW = path.join(__dirname, "..", "public", "images", "map_outline_bw.png");
const OUTPUT_PATCHED = path.join(__dirname, "..", "public", "images", "map_patched_bw.png");
const OUTPUT_SVG = path.join(__dirname, "..", "public", "images", "map_patched.svg");

// Drawn border segments from the comparison tool
const segments = [
  [{x:513,y:289},{x:517,y:316},{x:534,y:320},{x:549,y:338},{x:564,y:356},{x:573,y:373},{x:601,y:408}],
  [{x:502,y:676},{x:522,y:672},{x:549,y:668},{x:574,y:665},{x:593,y:667}],
  [{x:677,y:747},{x:706,y:714},{x:710,y:726},{x:719,y:729},{x:736,y:728},{x:759,y:735},{x:770,y:737},{x:785,y:737},{x:800,y:735}],
  [{x:1123,y:820},{x:1134,y:820},{x:1151,y:824},{x:1174,y:825},{x:1188,y:827},{x:1208,y:828},{x:1218,y:829},{x:1233,y:832},{x:1240,y:832},{x:1257,y:841},{x:1273,y:841},{x:1281,y:845},{x:1292,y:845},{x:1302,y:845}],
  [{x:1245,y:818},{x:1254,y:818},{x:1265,y:818},{x:1279,y:818},{x:1295,y:819},{x:1303,y:818}],
  [{x:904,y:905},{x:978,y:905},{x:986,y:907},{x:999,y:913},{x:1008,y:916}],
  [{x:688,y:851},{x:712,y:856},{x:725,y:856},{x:737,y:864},{x:757,y:866},{x:764,y:873}],
  [{x:1679,y:803},{x:1676,y:781},{x:1683,y:774},{x:1694,y:763},{x:1704,y:760}],
  [{x:2007,y:791},{x:2017,y:784},{x:2024,y:771},{x:2032,y:773},{x:2047,y:773},{x:2076,y:778},{x:2095,y:781},{x:2104,y:786},{x:2116,y:794},{x:2129,y:808},{x:2132,y:817},{x:2130,y:832},{x:2119,y:846},{x:2109,y:849},{x:2053,y:853},{x:2041,y:847},{x:2030,y:840},{x:2015,y:840},{x:2007,y:833},{x:1994,y:826},{x:1984,y:824},{x:2000,y:792}],
  [{x:2126,y:543},{x:2138,y:545},{x:2148,y:545},{x:2152,y:554},{x:2160,y:554},{x:2168,y:554},{x:2177,y:554}],
  [{x:2073,y:256},{x:2082,y:234}],
  [{x:2238,y:235},{x:2234,y:249},{x:2232,y:260},{x:2233,y:271}],
  [{x:2238,y:323},{x:2243,y:337}],
  [{x:2224,y:342},{x:2196,y:354},{x:2185,y:363},{x:2178,y:374},{x:2178,y:380},{x:2178,y:399},{x:2172,y:406},{x:2164,y:421},{x:2159,y:427},{x:2151,y:432},{x:2140,y:438},{x:2129,y:439}],
  [{x:2185,y:402},{x:2205,y:402},{x:2217,y:402},{x:2233,y:396},{x:2242,y:394},{x:2252,y:394}],
  [{x:2211,y:424},{x:2210,y:403}],
  [{x:1380,y:199},{x:1387,y:213},{x:1394,y:219},{x:1398,y:227},{x:1403,y:234},{x:1410,y:245},{x:1413,y:257},{x:1417,y:265},{x:1420,y:270},{x:1424,y:279},{x:1427,y:285},{x:1429,y:295},{x:1429,y:303},{x:1429,y:307},{x:1430,y:312},{x:1430,y:316},{x:1429,y:321}],
];

// Draw a line between two points on raw pixel buffer
function drawLine(data, width, height, x0, y0, x1, y1, thickness) {
  const half = Math.ceil(thickness / 2);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(x0 + dx * t);
    const cy = Math.round(y0 + dy * t);

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

  const pixels = Buffer.from(data);

  const BORDER_WIDTH = 3;

  console.log(`\nDrawing ${segments.length} border segments...`);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    console.log(`  Segment ${i + 1}: ${seg.length} points`);
    for (let j = 0; j < seg.length - 1; j++) {
      drawLine(pixels, width, height, seg[j].x, seg[j].y, seg[j + 1].x, seg[j + 1].y, BORDER_WIDTH);
    }
  }

  // Save patched image
  await sharp(pixels, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(OUTPUT_PATCHED);
  console.log(`\nSaved patched B&W to ${OUTPUT_PATCHED}`);

  // Trace to SVG
  console.log("Tracing to SVG...");
  return new Promise((resolve, reject) => {
    potrace.trace(OUTPUT_PATCHED, {
      turdSize: 15,
      optTolerance: 0.4,
      threshold: 128,
      color: "#000000",
      background: "transparent",
    }, (err, svg) => {
      if (err) { reject(err); return; }
      fs.writeFileSync(OUTPUT_SVG, svg);
      console.log(`Saved SVG to ${OUTPUT_SVG}`);
      console.log("\nDone!");
      resolve();
    });
  });
}

main().catch(console.error);
