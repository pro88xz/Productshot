const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');

(async () => {
  const svg = fs.readFileSync('app/icon.svg');

  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((s) => sharp(svg, { density: 600 }).resize(s, s).png().toBuffer()),
  );

  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync('app/favicon.ico', icoBuffer);
  console.log('wrote real multi-size favicon.ico (16, 32, 48)');
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
