const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'src', 'store', 'useAppStore.ts');
let content = fs.readFileSync(storePath, 'utf8');

const approveStart = content.indexOf('  approveChildByParent: (childId: string) => {');
const dailyMoodStart = content.indexOf('  setDailyMood: (mood) => {', approveStart);

console.log('approveStart:', approveStart, 'dailyMoodStart:', dailyMoodStart);
