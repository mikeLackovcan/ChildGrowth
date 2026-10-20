const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const output = path.resolve(__dirname, '../assets/branding');
const palette = { blue: [50,112,235,255], lime: [203,242,80,255], navy: [8,26,75,255], white: [255,255,255,255], clear: [0,0,0,0] };

function roundedRect(x,y,w,h,r,px,py) {
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  return (px-cx) ** 2 + (py-cy) ** 2 <= r ** 2;
}
function diamond(cx,cy,r,px,py) { return Math.abs(px-cx) + Math.abs(py-cy) <= r; }
function circle(cx,cy,r,px,py) { return (px-cx) ** 2 + (py-cy) ** 2 <= r ** 2; }
function smile(cx,cy,r,thick,px,py) {
  const d = Math.hypot(px-cx, py-cy);
  return py >= cy && Math.abs(d-r) <= thick;
}
function render(name, size, options={}) {
  const png = new PNG({ width:size, height:size });
  const samples = 3;
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const tally = [0,0,0,0];
    for (let sy=0;sy<samples;sy++) for (let sx=0;sx<samples;sx++) {
      const px=(x+(sx+.5)/samples)/size, py=(y+(sy+.5)/samples)/size;
      let color = options.transparent ? palette.clear : palette.blue;
      const insideBackground = options.adaptive || roundedRect(.02,.02,.96,.96,.24,px,py);
      if (!options.transparent && !insideBackground) color = palette.clear;
      const markScale = options.adaptive ? .31 : .37;
      const outer = diamond(.5,.52,markScale+.025,px,py);
      const inner = diamond(.5,.52,markScale,px,py);
      if (outer) color = options.monochrome ? palette.white : palette.navy;
      if (inner) color = options.monochrome ? palette.white : palette.lime;
      if (!options.monochrome && circle(.40,.49,.041,px,py)) color=palette.navy;
      if (!options.monochrome && circle(.60,.49,.041,px,py)) color=palette.navy;
      if (!options.monochrome && smile(.5,.53,.13,.018,px,py) && py<.69) color=palette.navy;
      if (!options.monochrome) {
        const sparkle = diamond(.75,.22,.055,px,py) || (Math.abs(px-.75)<.018 && Math.abs(py-.22)<.10) || (Math.abs(py-.22)<.018 && Math.abs(px-.75)<.10);
        if (sparkle) color=palette.white;
      }
      for(let i=0;i<4;i++) tally[i]+=color[i];
    }
    const offset=(y*size+x)*4;
    for(let i=0;i<4;i++) png.data[offset+i]=Math.round(tally[i]/(samples*samples));
  }
  fs.writeFileSync(path.join(output,name), PNG.sync.write(png));
}

render('questpip-icon-1024.png',1024);
render('questpip-play-512.png',512);
render('questpip-favicon.png',64);
render('questpip-adaptive.png',1024,{transparent:true,adaptive:true});
render('questpip-monochrome.png',432,{transparent:true,monochrome:true,adaptive:true});
console.log('Generated archived experimental icon assets.');
