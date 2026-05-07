const sharp = require('sharp');
const fs = require('fs');

const SVG_PATH = 'app/icon.svg';
const OUT_DIR = 'app';

async function run() {
  const svg = fs.readFileSync(SVG_PATH);

  const sizes = [
    { name: 'apple-icon.png', size: 180 },
    { name: 'icon-192.png',   size: 192 },
    { name: 'icon-512.png',   size: 512 },
  ];

  for (const { name, size } of sizes) {
    await sharp(svg, { density: 600 })
      .resize(size, size)
      .png()
      .toFile(`${OUT_DIR}/${name}`);
    console.log('wrote', name, `(${size}x${size})`);
  }

  const buf48 = await sharp(svg, { density: 600 })
    .resize(48, 48)
    .png()
    .toBuffer();
  fs.writeFileSync(`${OUT_DIR}/favicon.ico`, buf48);
  console.log('wrote favicon.ico (48x48 png-as-ico)');
  console.log('OK');
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
