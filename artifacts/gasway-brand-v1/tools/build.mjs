// Export only from the vector master. No raster tracing or font dependency.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const sharpModule = process.env.GASWAY_SHARP_MODULE || 'sharp';
const sharp = (await import(sharpModule)).default;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const geometry = JSON.parse(await fs.readFile(path.join(root, 'masters/geometry.json'), 'utf8'));
const { palette: p, glyphs, placements } = geometry;
const variants = {
  'on-light': [p.green, p.olive], 'on-dark': [p.cream, p.lime],
  black: [p.black, p.black], white: [p.white, p.white],
  lime: [p.lime, p.lime], cream: [p.cream, p.cream],
};
const n = value => Number(value.toFixed(5));
const records = [];
async function write(name, value) {
  const target = path.join(root, name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, value);
}
function mark(kind, colors) {
  const letters = kind === 'wordmark' ? placements : [['g', 0, 0]];
  const cx = kind === 'wordmark' ? 570.5 : 116.5;
  return letters.map(([letter, x, y]) => `<path transform="translate(${x} ${y})" d="${glyphs[letter]}" fill="${colors[0]}" fill-rule="evenodd"/>`).join('') + `<circle cx="${cx}" cy="69" r="17.5" fill="${colors[1]}"/>`;
}
function svg(width, height, contents, label, viewBox = `0 0 ${width} ${height}`) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" role="img" aria-label="${label}"><title>${label}</title>${contents}</svg>\n`;
}
function centered(kind, colors, size, visibleWidth) {
  const box = geometry[kind];
  const scale = visibleWidth / box.width;
  return `<g transform="translate(${n((size-visibleWidth)/2)} ${n((size-box.height*scale)/2)}) scale(${n(scale)})">${mark(kind, colors)}</g>`;
}
async function asset(name, source, pngSizes = []) {
  await write(`masters/${name}.svg`, source);
  for (const size of pngSizes) {
    const buffer = await sharp(Buffer.from(source), { density: 300 }).resize({ width: size }).png().toBuffer();
    await write(`png/${name}-${size}.png`, buffer);
    const metadata = await sharp(buffer).metadata();
    records.push({ file: `png/${name}-${size}.png`, width: metadata.width, height: metadata.height });
  }
}
// The masters include a half-dot clear space. Ink dimensions are in geometry.json.
for (const kind of ['wordmark', 'monogram']) {
  const box = geometry[kind];
  for (const [name, colors] of Object.entries(variants)) {
    if (kind === 'wordmark' && ['lime', 'cream'].includes(name)) continue;
    const pad = 17.5;
    const source = svg(box.width+2*pad, box.height+2*pad, mark(kind, colors), `Gasway ${kind} ${name}`, `${-pad} ${-pad} ${box.width+2*pad} ${box.height+2*pad}`);
    await asset(`${kind}/gasway-${name}`, source, kind === 'wordmark' ? [320, 640, 1280, 2560] : [24, 48, 96, 256, 512, 1024]);
  }
}
const iconVariants = {
  'lime-on-dark': [p.green, variants.lime],
  'cream-on-dark': [p.green, variants['on-dark']],
  'green-on-lime': [p.lime, [p.green, p.green]],
  'green-on-cream': [p.cream, variants['on-light']],
};
for (const [name, [background, colors]] of Object.entries(iconVariants)) {
  // Full bleed square for OS masking; no pre-rounded app store icon.
  await asset(`icon/app-icon-${name}`, svg(1024, 1024, `<rect width="1024" height="1024" fill="${background}"/>${centered('monogram', colors, 1024, 584)}`, `Gasway app icon ${name}`), [192, 512, 1024]);
  for (const shape of ['circle', 'rounded-square']) {
    const container = shape === 'circle' ? `<circle cx="256" cy="256" r="256" fill="${background}"/>` : `<rect width="512" height="512" rx="100" fill="${background}"/>`;
    await asset(`icon/crop-${shape}-${name}`, svg(512, 512, container+centered('monogram', colors, 512, 292), `Gasway ${shape} ${name}`), [256, 512]);
  }
}
// Adaptive layers: a 48 x 44.06 dp box, diagonal 65.16 dp, inside the 66 dp safe circle.
for (const [name, colors] of [['lime', variants.lime], ['cream', variants['on-dark']], ['green', [p.green,p.green]], ['monochrome', variants.black]]) {
  await asset(`android/adaptive-foreground-${name}`, svg(108,108,centered('monogram', colors,108,48),`Gasway adaptive foreground ${name}`), [432,1024]);
}
for (const [name, color] of [['dark',p.green],['lime',p.lime],['cream',p.cream]]) {
  await asset(`android/adaptive-background-${name}`, svg(108,108,`<rect width="108" height="108" fill="${color}"/>`,`Gasway adaptive background ${name}`),[432,1024]);
}
for (const [name, colors] of [['light',variants['on-light']],['dark',variants['on-dark']]]) {
  await asset(`splash/splash-monogram-${name}`,svg(1024,1024,centered('monogram',colors,1024,448),`Gasway splash monogram ${name}`),[1024,2048]);
  await asset(`splash/splash-wordmark-${name}`,svg(1536,512,`<g transform="translate(180 133) scale(2)">${mark('wordmark',colors)}</g>`,`Gasway splash wordmark ${name}`),[768,1536,3072]);
}
// Favicons use a larger mark to retain legibility, with an opaque flat backing.
for (const [name,[background,colors]] of Object.entries(iconVariants)) {
  await asset(`favicon/favicon-${name}`,svg(512,512,`<rect width="512" height="512" rx="96" fill="${background}"/>${centered('monogram',colors,512,340)}`,`Gasway favicon ${name}`),[16,32,48,64,128,180,192,512]);
}
await write('favicon.svg', await fs.readFile(path.join(root,'masters/favicon/favicon-lime-on-dark.svg')));
const icoSizes = [16,32,48];
const icoBuffers = await Promise.all(icoSizes.map(size => fs.readFile(path.join(root,`png/favicon/favicon-lime-on-dark-${size}.png`))));
const header = Buffer.alloc(6+16*icoSizes.length);
header.writeUInt16LE(1,2); header.writeUInt16LE(icoSizes.length,4);
let offset = header.length;
icoBuffers.forEach((buffer,index) => { const pos = 6+16*index; header[pos]=icoSizes[index]; header[pos+1]=icoSizes[index]; header.writeUInt16LE(1,pos+4); header.writeUInt16LE(32,pos+6); header.writeUInt32LE(buffer.length,pos+8); header.writeUInt32LE(offset,pos+12); offset+=buffer.length; });
await write('favicon.ico',Buffer.concat([header,...icoBuffers]));
// Native Android resources. Identical outline and transform as the adaptive SVG.
const scale=48/134, tx=(108-48)/2, ty=(108-123*scale)/2;
const androidPaths = color => `<path android:fillColor="${color}" android:fillType="evenOdd" android:pathData="${glyphs.g}"/><path android:fillColor="${color}" android:pathData="M134,69A17.5,17.5 0,1 0,99,69A17.5,17.5 0,1 0,134,69Z"/>`;
for (const [name,color] of [['foreground',p.lime],['monochrome',p.black]]) {
  await write(`android/res/drawable/gasway_${name}.xml`,`<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><group android:translateX="${n(tx)}" android:translateY="${n(ty)}" android:scaleX="${n(scale)}" android:scaleY="${n(scale)}">${androidPaths(color)}</group></vector>\n`);
}
await write('android/res/values/gasway_colors.xml',`<resources><color name="gasway_icon_background">${p.green}</color></resources>\n`);
for (const api of [26,33]) {
  await write(`android/res/mipmap-anydpi-v${api}/gasway_launcher.xml`,`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/gasway_icon_background"/><foreground android:drawable="@drawable/gasway_foreground"/>${api===33?'<monochrome android:drawable="@drawable/gasway_monochrome"/>':''}</adaptive-icon>\n`);
}
for (const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]) {
  const input=await fs.readFile(path.join(root,'masters/icon/app-icon-lime-on-dark.svg'));
  await write(`android/res/mipmap-${density}/gasway_launcher.png`,await sharp(input).resize(size,size).png().toBuffer());
}
// A visual reference sheet, built from the actual export geometry, not embedded bitmaps.
const samples=[['wordmark','on-light',p.cream],['wordmark','on-dark',p.green],['wordmark','black',p.white],['wordmark','white',p.black]];
let board='';
samples.forEach(([kind,name,bg],i)=>{const x=(i%2)*800,y=Math.floor(i/2)*240;board+=`<rect x="${x}" y="${y}" width="800" height="240" fill="${bg}"/><g transform="translate(${x+106} ${y+58})">${mark(kind,variants[name])}</g>`;});
Object.entries(iconVariants).forEach(([name,[bg,colors]],i)=>{board+=`<rect x="${i*400}" y="480" width="400" height="400" fill="${p.cream}"/><g transform="translate(${i*400+72} 552)"><rect width="256" height="256" rx="48" fill="${bg}"/>${centered('monogram',colors,256,150)}</g>`;});
await asset('reference/vector-board',svg(1600,880,board,'Gasway vector identity reference'),[1600]);
const tile = (kind, name, background) => `<div class="tile" style="background:${background}">${svg(kind==='wordmark'?623:169,158,mark(kind,variants[name]),`Gasway ${name}`,'-17.5 -17.5 '+(kind==='wordmark'?'623':'169')+' 158')}</div>`;
await write('ficha.html', `<!doctype html><html lang="es-CL"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gasway — ficha de identidad v1</title><style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#dedfd5;color:${p.green};font:15px/1.45 system-ui,-apple-system,sans-serif}.sheet{max-width:1040px;margin:36px auto;padding:52px;background:${p.cream}}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #c6cbbd;padding-bottom:24px}h1{font-size:14px;font-weight:650;letter-spacing:.16em;text-transform:uppercase;margin:0}small{font-size:12px;color:#5e6751}.hero{padding:38px 5% 32px}.hero svg{display:block;width:100%;height:auto;max-height:155px}h2{font-size:12px;letter-spacing:.13em;text-transform:uppercase;margin:24px 0 12px}.variants{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tile{padding:18px 28px;min-height:100px;display:flex;align-items:center;justify-content:center}.tile svg{width:100%;height:auto;max-height:92px}.swatches{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.swatch b{display:block;height:46px;margin-bottom:6px}.swatch span{display:block;font-size:12px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:40px}p{margin:8px 0 12px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:7px 0;border-bottom:1px solid #d2d6c8}th{font-weight:650}footer{border-top:1px solid #c6cbbd;margin-top:22px;padding-top:16px;font-size:12px;color:#5e6751}a{color:inherit}code{font-size:12px}@media(max-width:650px){.sheet{margin:0;padding:24px}.columns{grid-template-columns:1fr;gap:0}.swatches{grid-template-columns:1fr 1fr}header{gap:12px;align-items:flex-start;flex-direction:column}}@media print{@page{size:A4;margin:12mm}body{background:white;font-size:10px}.sheet{margin:0;padding:0;max-width:none}.hero{padding:22px 10%}.hero svg{max-height:95px}h2{margin-top:16px}.tile{min-height:68px;padding:10px 30px}.tile svg{max-height:55px}.swatch b{height:28px}.columns{gap:24px}footer{font-size:9px}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style><main class="sheet"><header><h1>Gasway / Identidad visual</h1><small>Ficha breve · v1.0 · 23.10.2026</small></header><div class="hero">${svg(623,158,mark('wordmark',variants['on-light']),'Gasway','-17.5 -17.5 623 158')}</div><div class="variants">${tile('wordmark','on-light',p.cream)}${tile('wordmark','on-dark',p.green)}${tile('wordmark','black',p.white)}${tile('wordmark','white',p.black)}</div><h2>01 / Paleta</h2><div class="swatches">${[['Verde profundo',p.green],['Crema',p.cream],['Lima',p.lime],['Oliva',p.olive]].map(([label,color])=>`<div class="swatch"><b style="background:${color}"></b><span>${label}<br><strong>${color}</strong></span></div>`).join('')}</div><div class="columns"><section><h2>02 / Lettering</h2><p>Geometría personalizada reconstruida de la lámina IA. Fuente original no identificada. Letras convertidas en contornos; no requiere tipografía instalada.</p><p>Minúsculas de peso alto, «a» y «g» de un piso, espaciado compacto. Mismo trazado de «a» repetido; mismo «g» en logo y monograma.</p><h2>03 / Proporciones</h2><table><tr><td>Wordmark visible</td><td>588 × 123 u · 4,7805:1</td></tr><tr><td>Monograma visible</td><td>134 × 123 u · 1,0894:1</td></tr><tr><td>Punto / protección</td><td>Ø35 u / 17,5 u</td></tr></table><p>Escalar uniformemente. Preservar posición del punto, huecos y descendentes. Usar rellenos planos.</p></section><section><h2>04 / Mínimos recomendados</h2><table><tr><th>Recurso</th><th>Pantalla / impreso</th></tr><tr><td>Wordmark con protección</td><td>160 px / 28 mm</td></tr><tr><td>Monograma con protección</td><td>24 px / 6 mm</td></tr><tr><td>Favicon específico</td><td>16 × 16 px</td></tr></table><h2>05 / App y Android</h2><p>Icono cuadrado opaco de 1024 px, sin máscara previa. Android adaptable: capas de 108 dp con monograma de 48 × 44,06 dp dentro del círculo seguro Ø66 dp.</p><p>Splash nativo con monograma transparente sobre crema o verde profundo. Favicon con composición ampliada para 16–48 px.</p><p>Archivos y variantes: <a href="README.md">README.md</a>. Detalles: <a href="FICHA.md">FICHA.md</a>.</p></section></div><footer>Maestros SVG sin fuentes ni imágenes incrustadas. Reconstrucción manual, sin afirmar coincidencia geométrica exacta con una fuente original. Mínimos de diseño pendientes de prueba en el soporte final. Colores RGB/sRGB; convertir a impresión con el perfil del proveedor.</footer></main></html>\n`);
const assets=records.length;
const files=[];
async function walk(folder) { for(const ent of await fs.readdir(folder,{withFileTypes:true})) { const target=path.join(folder,ent.name); if(ent.isDirectory()){if(ent.name!=='node_modules')await walk(target);}else if(!['manifest.json','SHA256SUMS.txt'].includes(ent.name)){const content=await fs.readFile(target); files.push({file:path.relative(root,target).split(path.sep).join('/'),bytes:content.length,sha256:createHash('sha256').update(content).digest('hex')});} } }
await walk(root);
files.sort((a,b)=>a.file.localeCompare(b.file));
await write('manifest.json',JSON.stringify({version:'1.0.0',date:'2026-10-23',source:'reference/ai-clean-board.png',vectorization:'Manual geometric reconstruction; no identified font; no raster embedded in SVG',renderer:{sharp:sharp.versions.sharp,librsvg:sharp.versions.rsvg},palette:p,wordmark:geometry.wordmark,monogram:geometry.monogram,pngExports:assets,pngDimensions:records,files},null,2)+'\n');
await write('SHA256SUMS.txt',files.map(f=>`${f.sha256}  ${f.file}`).join('\n')+'\n');
console.log(JSON.stringify({pngExports:assets,files:files.length+2,root}));
