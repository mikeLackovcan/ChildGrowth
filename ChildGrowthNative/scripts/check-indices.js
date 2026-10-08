const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'src', 'store', 'useAppStore.ts');
let content = fs.readFileSync(storePath, 'utf8');

const loginStart = content.indexOf('  loginWithEmail: async (email, password) => {');
const syncStart = content.indexOf('  syncToServer: async () => {');
const loadStart = content.indexOf('  loadMockState: async () => {');
const clearStart = content.indexOf('  clearAllData: async () => {');

console.log({ loginStart, syncStart, loadStart, clearStart });
