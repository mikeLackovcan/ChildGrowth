const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(full);
    } else if (entry.name.endsWith('.png')) {
      const buf = Buffer.alloc(4);
      const fd = fs.openSync(full, 'r');
      fs.readSync(fd, buf, 0, 4, 0);
      fs.closeSync(fd);
      // PNG header: 89 50 4E 47
      const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
      // JPEG header: FF D8 FF
      const isJpg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
      if (!isPng) {
        console.log(`MISMATCH: ${full} -> starts with ${buf.toString('hex')} (isJpg: ${isJpg})`);
      }
    }
  }
}

checkDir('assets');
checkDir('src/assets');
