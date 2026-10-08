const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;
const apkPath = path.join(__dirname, '..', 'dist', 'QuestBlox.apk');
const localIP = '192.168.1.215';

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/QuestBlox.apk' || url === '/download') {
    if (!fs.existsSync(apkPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('APK is still building or not found. Please check back in a moment.');
      return;
    }

    const stat = fs.statSync(apkPath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="QuestBlox.apk"'
    });

    const readStream = fs.createReadStream(apkPath);
    readStream.pipe(res);
    return;
  }

  if (url === '/' || url === '/index.html') {
    const exists = fs.existsSync(apkPath);
    let sizeMb = '0 MB';
    if (exists) {
      sizeMb = (fs.statSync(apkPath).size / (1024 * 1024)).toFixed(1) + ' MB';
    }

    const downloadUrl = `http://${localIP}:${PORT}/QuestBlox.apk`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(downloadUrl)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuestBlox - Android APK Download</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      margin-top: 20px;
    }
    .logo {
      font-size: 56px;
      margin-bottom: 8px;
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 26px;
      font-weight: 800;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      color: #94a3b8;
      font-size: 14px;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 18px;
      padding: 16px 28px;
      border-radius: 16px;
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      width: 80%;
      box-sizing: border-box;
      margin-bottom: 16px;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(99, 102, 241, 0.5);
    }
    .meta {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .qr-box {
      background: #ffffff;
      padding: 12px;
      border-radius: 16px;
      display: inline-block;
      margin: 16px 0;
    }
    .qr-box img {
      display: block;
      width: 200px;
      height: 200px;
    }
    .instructions {
      text-align: left;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 16px;
      padding: 16px 20px;
      margin-top: 20px;
      font-size: 14px;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .instructions ol {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 6px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      background: ${exists ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)'};
      color: ${exists ? '#4ade80' : '#facc15'};
      font-weight: 600;
      font-size: 12px;
      margin-bottom: 16px;
      border: 1px solid ${exists ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'};
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🚀</div>
    <h1>QuestBlox Mobile</h1>
    <p class="subtitle">ChildGrowth Gamified Chore & Habit App</p>

    <div class="badge">${exists ? 'Ready for Download (' + sizeMb + ')' : 'Building in progress...'}</div>

    <div>
      <a href="/QuestBlox.apk" class="btn">⬇️ Download APK</a>
    </div>
    <div class="meta">Version: Release APK &bull; Size: ${sizeMb}</div>

    <div style="font-size: 13px; color: #94a3b8;">Or scan QR code with phone camera:</div>
    <div class="qr-box">
      <img src="${qrUrl}" alt="Download QR Code" />
    </div>

    <div class="instructions">
      <strong>📱 Installation on Android:</strong>
      <ol>
        <li>Download <strong>QuestBlox.apk</strong>.</li>
        <li>Open the downloaded file from notifications or Files app.</li>
        <li>If prompted with <em>"Install unknown apps"</em>, tap <strong>Settings</strong> and enable <strong>Allow from this source</strong>.</li>
        <li>Tap <strong>Install</strong>, then launch QuestBlox!</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 APK Download Server active at:`);
  console.log(`   Local PC:      http://localhost:${PORT}/QuestBlox.apk`);
  console.log(`   Phone (Wi-Fi): http://${localIP}:${PORT}`);
});
