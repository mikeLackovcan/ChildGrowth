// Deterministic size exports only; the source illustration is generated separately.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.QUEST_SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'assets/branding');
const source = path.join(root, 'assets/images/quest-hero-v2.png');
const mark = '<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108"><circle cx="51" cy="49" r="23" fill="none" stroke="white" stroke-width="12"/><path d="M62 62 L79 79" stroke="white" stroke-width="12" stroke-linecap="round"/></svg>';
async function main() {
  await sharp(source).resize(1024,1024).flatten({background:'#081A4B'}).png().toFile(path.join(out,'quest-hero-icon-1024.png'));
  await sharp(source).resize(512,512).flatten({background:'#081A4B'}).png().toFile(path.join(out,'quest-hero-play-512.png'));
  await sharp(source).resize(64,64).png().toFile(path.join(out,'quest-hero-favicon.png'));
  // Padded full-square foreground protects the face in adaptive circular masks.
  await sharp(source).resize(660,660).extend({top:182,bottom:182,left:182,right:182,background:'#081A4B'}).png().toFile(path.join(out,'quest-hero-adaptive.png'));
  await sharp(Buffer.from(mark)).resize(432,432).png().toFile(path.join(out,'quest-q-monochrome.png'));
  await fs.copyFile(source,path.join(out,'quest-hero-source.png'));
}
main().catch(e=>{console.error(e);process.exit(1)});
