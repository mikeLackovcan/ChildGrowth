const fs = require('fs');
const html = fs.readFileSync('android/build/reports/problems/problems-report.html', 'utf8');
const idx = html.indexOf('"summaries"');
if (idx !== -1) {
  console.log(html.substring(idx - 100, idx + 1000));
} else {
  console.log('summaries not found');
}
