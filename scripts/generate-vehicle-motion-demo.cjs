const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'artifacts/vehicle-motion-demo');
const modules = ['geometry', 'vehicle-animator']
  .map((name) => {
    const source = fs.readFileSync(
      path.join(root, `apps/mobile/src/shared/maps/vehicle-motion/${name}.ts`),
      'utf8',
    );
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return `${JSON.stringify('./' + name)}:(module,exports,require)=>{${code}\n}`;
  })
  .join(',');
const truck = fs
  .readFileSync(path.join(root, 'apps/mobile/assets/maps/delivery-truck@3x.png'))
  .toString('base64');
const html = `<!doctype html><html lang="es-CL"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gasway · Ensayo del movimiento</title><style>
*{box-sizing:border-box}body{margin:0;background:#f7f5ef;color:#263a25;font:16px system-ui,sans-serif}main{max-width:1060px;margin:auto;padding:28px}header{display:flex;justify-content:space-between;align-items:center;gap:16px}h1{font-size:28px;margin:4px 0 12px}p{line-height:1.6;max-width:760px;color:#52614e}.tag{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700}button{font:inherit;background:#405d32;color:white;border:0;border-radius:24px;padding:12px 20px;cursor:pointer}button.secondary{background:#e4e9dc;color:#263a25}.tools{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:20px 0}label{display:flex;gap:8px;align-items:center}input{accent-color:#405d32}.map{background:#e6ebdf;border-radius:28px;overflow:hidden;box-shadow:0 12px 40px #31452412;aspect-ratio:900/560}svg{width:100%;height:100%}#world{transform-origin:450px 280px;transition:transform .4s} .truck{will-change:transform}footer{font-size:14px;line-height:1.6;margin-top:18px;color:#52614e}output{font-variant-numeric:tabular-nums;margin-left:auto}#home{font-size:28px}
</style><main><header><div><div class="tag">Gasway / simulación local</div><h1>Un camión, una ruta, giros suaves.</h1></div><span aria-hidden="true">◉</span></header>
<p>El mismo motor de animación de la app recorre puntos ficticios: rectas, esquinas de 90° y una curva. Recibe un GPS cada 5 segundos. Esta vista no usa Google Maps ni envía ubicaciones al servidor.</p>
<div class="tools"><button id="play">Pausar</button><button class="secondary" id="reset">Reiniciar</button><button class="secondary" id="rotate">Rotar mapa 45°</button><label><input id="second" type="checkbox" checked>Segundo vehículo</label><output id="status" aria-live="off"></output></div>
<div class="map"><svg viewBox="0 0 900 560" role="img" aria-label="Circuito ficticio con rectas, esquinas y una curva"><defs><pattern id="blocks" width="100" height="100" patternUnits="userSpaceOnUse"><rect x="10" y="10" width="80" height="80" rx="12" fill="#dbe3d1"/></pattern></defs><rect width="900" height="560" fill="url(#blocks)"/><g id="world"><path id="road" fill="none" stroke="#fff" stroke-width="28" stroke-linejoin="round"/><path id="route" fill="none" stroke="#9dab7d" stroke-width="3" stroke-dasharray="5 7"/><text id="home" x="785" y="230">⌂</text><image id="a" class="truck" width="42" height="48" href="data:image/png;base64,${truck}"/><image id="b" class="truck" width="42" height="48" opacity=".65" href="data:image/png;base64,${truck}"/></g></svg></div>
<footer>Rotación del vehículo relativa al norte; el mapa aplica su giro al conjunto, como un marcador nativo <code>flat</code>. Cada camión tiene estado independiente. Al ocultar esta pestaña se pausa el RAF. La prueba nativa de Expo Go en iPhone/Android se registra por separado.</footer></main>
<script>const modules={${modules}},cache={};function require(name){if(!cache[name]){const module={exports:{}};cache[name]=module;modules[name](module,module.exports,require)}return cache[name].exports}
const g=require('./geometry'),{VehicleAnimator}=require('./vehicle-animator');
const xy=[[100,450],[100,320],[260,320],[260,150],[400,150]];for(let i=1;i<=18;i++){const angle=(-90+i*5)*Math.PI/180;xy.push([400+100*Math.cos(angle),250+100*Math.sin(angle)])}xy.push([500,400],[700,400],[700,250],[800,250]);
const toCoord=([x,y])=>({latitude:-33.45-y/111195,longitude:-70.66+x/(111195*Math.cos(-33.45*Math.PI/180))});
const toXY=(p)=>[(p.longitude+70.66)*111195*Math.cos(-33.45*Math.PI/180),(-33.45-p.latitude)*111195];
const route=g.buildRoute(xy.map(toCoord));const d=xy.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ');document.querySelector('#road').setAttribute('d',d);document.querySelector('#route').setAttribute('d',d);
let animators=[],timer=null,step=0,paused=false,heading=0,done=false;
function running(){return !paused&&!document.hidden}
function sync(){animators.forEach(a=>a.setActive(running()));clearTimeout(timer);if(running()&&!done)timer=setTimeout(sample,5000);document.querySelector('#play').textContent=paused?'Continuar':'Pausar'}
function sample(){step++;animators.forEach((a,i)=>a.update({coordinate:g.pointAtRouteDistance(route,Math.min(route.lengthMeters,step*70+i*60)),timestampMs:step*5000}));document.querySelector('#status').textContent='GPS '+step+' · cada 5 s';if(step*70<route.lengthMeters)timer=setTimeout(sample,5000);else{done=true;document.querySelector('#status').textContent='Último GPS · llegada'}}
function reset(){clearTimeout(timer);animators.forEach(a=>a.destroy());step=0;done=false;document.querySelector('#status').textContent='Inicio · rumbo norte';animators=['a','b'].map((id,i)=>{const el=document.getElementById(id);const a=new VehicleAnimator({now:()=>performance.now(),requestFrame:requestAnimationFrame,cancelFrame:cancelAnimationFrame,onFrame:pose=>{const [x,y]=toXY(pose.coordinate);el.setAttribute('x',x-21);el.setAttribute('y',y-24);el.setAttribute('transform','rotate('+pose.bearing+' '+x+' '+y+')')}});a.setRoute(route.points);a.update({coordinate:g.pointAtRouteDistance(route,i*60),timestampMs:0,heading:0,headingReliable:true});return a});sync()}
document.querySelector('#play').onclick=()=>{paused=!paused;sync()};document.querySelector('#reset').onclick=reset;document.querySelector('#rotate').onclick=()=>{heading=(heading+45)%360;document.querySelector('#world').style.transform='rotate('+(-heading)+'deg)'};document.querySelector('#second').onchange=e=>{document.querySelector('#b').style.display=e.target.checked?'':'none'};document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>{clearTimeout(timer);animators.forEach(a=>a.destroy())});reset();</script></html>`;
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(path.join(folder, 'index.html'), html);
console.log('Generated artifacts/vehicle-motion-demo/index.html from the app animation source.');
