const sharp = require('sharp');
const fs = require('fs');

const SVG_PATH = 'app/icon.svg';

async function run() {
  const svg = fs.readFileSync(SVG_PATH);

  // Files Next.js auto-detects in app/ (icon convention)
  const appFiles = [{ name: 'apple-icon.png', size: 180 }];

  // Files served as static assets from public/ (referenced by manifest)
  const publicFiles = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
  ];

  for (const { name, size } of appFiles) {
    await sharp(svg, { density: 600 }).resize(size, size).png().toFile(`app/${name}`);
    console.log('wrote app/' + name, `(${size}x${size})`);
  }

  for (const { name, size } of publicFiles) {
    await sharp(svg, { density: 600 }).resize(size, size).png().toFile(`public/${name}`);
    console.log('wrote public/' + name, `(${size}x${size})`);
  }

  console.log('OK — favicon.ico must be regenerated separately via generate-favicon.js');
}

run().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
