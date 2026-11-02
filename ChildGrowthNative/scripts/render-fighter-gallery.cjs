// Offline visual QA of the actual FighterRig component. The small SVG adapter
// emits standard SVG tags; this does NOT replace native/web runtime testing.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const output = process.argv[2];
if (!output || !path.isAbsolute(output)) throw new Error('Pass an absolute, dedicated QA output directory.');
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
const tags = { default: 'svg', Svg: 'svg', G: 'g', Path: 'path', Rect: 'rect', Circle: 'circle', Ellipse: 'ellipse', Line: 'line', Polygon: 'polygon', Defs: 'defs', LinearGradient: 'linearGradient', RadialGradient: 'radialGradient', Stop: 'stop', ClipPath: 'clipPath', Image: 'image' };
const svg = { __esModule: true };
for (const [name, tag] of Object.entries(tags)) svg[name] = ({ children, accessible, ...props }) => React.createElement(tag, props, children);
const cache = new Map();
function load(file) {
  file = path.resolve(__dirname, '../src', file);
  if (file.endsWith('.png')) {
    // Copy, do not transform, project assets into the isolated gallery.
    const name = path.basename(file);
    fs.copyFileSync(file, path.join(output, 'assets', name));
    return `assets/${name}`;
  }
  if (!/\.tsx?$/.test(file)) file += fs.existsSync(`${file}.tsx`) ? '.tsx' : '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => name === 'react-native-svg' ? svg : name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : require(name), module, module.exports);
  return module.exports;
}
const { FighterRig } = load('components/questblox/FighterRig');
const { FIGHTER_ATLASES } = load('constants/fighterAtlases');
const { sampleFighterPose, attackSpec, RIG_SCALE } = load('utils/fighterRigging');
const actions = ['idle', 'block', 'jab', 'kick', 'special', 'jump', 'walk', 'hit', 'takeoff', 'land', 'ko', 'victory'];
const cards = [];
const facingCards = Object.keys(FIGHTER_ATLASES).map(id => {
  const pair = [1, -1].map(facing => renderToStaticMarkup(React.createElement(FighterRig, {
    fighter: { id, action: 'idle', actionElapsed: 0.2, facing, x: 50, y: 0, velocityY: 0 },
    reduceMotion: true, pixelsPerWorldUnit: 1 / RIG_SCALE,
  }), { identifierPrefix: `${id}-facing-${facing}` })).join('');
  return `<article><h2>${id.replace('roblox_', '')}</h2><div class="pair">${pair}</div></article>`;
});
fs.writeFileSync(path.join(output, 'facing.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Opponent-facing rig QA</title><style>body{background:#111827;color:#eee;font:14px system-ui;margin:20px}.grid{display:grid;grid-template-columns:repeat(3,280px);gap:12px}article{background:#233146;border-radius:12px}h2{margin:12px;font-size:14px}.pair{display:flex}.pair>svg{width:140px;height:190px}</style><h1>Opponent-facing heads</h1><p>Diagnostic render of the actual rig, not a live match.</p><section class="grid">${facingCards.join('')}</section></html>`);
for (const id of Object.keys(FIGHTER_ATLASES)) for (const action of actions) {
  const elapsed = ['jab', 'kick', 'special'].includes(action) ? (attackSpec(id, action).startup + 2) / 60 : action === 'jump' ? 0.4 : action === 'ko' || action === 'victory' ? 0.8 : action === 'takeoff' || action === 'land' ? 0.06 : 0.2;
  const fighter = { id, action, actionElapsed: elapsed, facing: 1, x: 50, y: action === 'jump' ? 7 : 0, velocityY: action === 'jump' ? 6 : 0 };
  const p = sampleFighterPose(id, action, elapsed);
  const source = renderToStaticMarkup(React.createElement(FighterRig, { fighter, reduceMotion: false, pixelsPerWorldUnit: 1 / RIG_SCALE }), { identifierPrefix: `${id}-${action}` });
  if (!Number.isFinite(p.head.x)) throw new Error('Invalid pose');
  cards.push(`<article><h2>${id.replace('roblox_', '')} · ${action}</h2>${source}</article>`);
}
fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Fighter skin QA</title><style>body{margin:24px;background:#111827;color:#e5e7eb;font:14px system-ui}h1{font-size:22px}p{color:#aab4c6}.grid{display:grid;grid-template-columns:repeat(6,280px);gap:12px}article{background:radial-gradient(ellipse at 50% 80%,#32445c,#172132 70%);border:1px solid #43516b;border-radius:12px;overflow:hidden}h2{margin:10px;font-size:13px}svg{display:block}</style><h1>Articulated texture QA — source-component poses</h1><p>Diagnostic SVG renderer, not a game screenshot. Native clipping and frame rate require separate checks.</p><section class="grid">${cards.join('')}</section></html>`);
console.log(`Rendered ${cards.length} source-component poses in ${output}`);
