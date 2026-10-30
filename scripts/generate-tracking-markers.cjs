// Rasterize original Gasway vector artwork for native map providers. No app dependency.
// Set GASWAY_SHARP_MODULE to an installed sharp module when it is not on Node's path.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.GASWAY_SHARP_MODULE || 'sharp');
const geometry = require('../artifacts/gasway-brand-v1/masters/geometry.json');
const { green, olive, lime, cream, white } = geometry.palette;
const directory = path.resolve(__dirname, '../apps/mobile/assets/maps');
const canvas = (content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="64" viewBox="0 0 56 64">${content}</svg>`;
const artwork = {
  'delivery-home': canvas(`
    <ellipse cx="28" cy="57" rx="9" ry="3" fill="${green}" opacity=".12"/>
    <path d="M22 44h12l-6 12Z" fill="${olive}"/>
    <circle cx="28" cy="27" r="24" fill="${green}" opacity=".12"/>
    <circle cx="28" cy="25" r="23" fill="${white}"/>
    <circle cx="28" cy="25" r="20" fill="${cream}" stroke="${olive}" stroke-width="1.5"/>
    <path d="M15 25 28 14l13 11" fill="none" stroke="${green}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 24v14h20V24L28 16Z" fill="${olive}"/>
    <path d="M25 38V28h7v10" fill="${lime}"/>
    <rect x="20" y="26" width="3" height="4" rx=".8" fill="${cream}"/>
    <path d="M35 17v-5h4v9" fill="${green}"/>
    <circle cx="28" cy="56" r="3" fill="${green}" stroke="${white}" stroke-width="1.5"/>
  `),
};

async function main() {
  await fs.mkdir(directory, { recursive: true });
  for (const [name, svg] of Object.entries(artwork)) {
    await fs.writeFile(path.join(directory, `${name}.svg`), `${svg}\n`);
    for (const scale of [1, 2, 3]) {
      const suffix = scale === 1 ? '' : `@${scale}x`;
      await sharp(Buffer.from(svg))
        .resize(56 * scale, 64 * scale)
        .png()
        .toFile(path.join(directory, `${name}${suffix}.png`));
    }
  }
  const truck = path.resolve(
    __dirname,
    '../artifacts/gasway-map-markers/delivery-truck-master.png',
  );
  for (const scale of [1, 2, 3]) {
    const suffix = scale === 1 ? '' : `@${scale}x`;
    await sharp(truck)
      .resize(56 * scale, 64 * scale, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(directory, `delivery-truck${suffix}.png`));
  }
  console.log('Generated Gasway house and overhead gas truck PNG markers at 1x/2x/3x.');
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
