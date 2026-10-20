const fs = require('node:fs');
const path = require('node:path');

const rate = 22050;
const output = path.resolve(__dirname, '../assets/audio');

function wav(name, notes) {
  const duration = notes.reduce((sum, note) => sum + note.duration, 0);
  const samples = Math.ceil(duration * rate);
  const data = Buffer.alloc(samples * 2);
  let cursor = 0;
  for (const note of notes) {
    const count = Math.floor(note.duration * rate);
    for (let i = 0; i < count && cursor < samples; i++, cursor++) {
      const t = i / rate;
      const envelope = Math.min(1, i / (rate * .015)) * Math.max(0, 1 - i / count);
      const fundamental = Math.sin(2 * Math.PI * note.frequency * t);
      const overtone = .18 * Math.sin(2 * Math.PI * note.frequency * 2 * t);
      data.writeInt16LE(Math.round((fundamental + overtone) * envelope * 9000), cursor * 2);
    }
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(output, name), Buffer.concat([header, data]));
}

wav('habi-reminder.wav', [
  { frequency: 659.25, duration: .16 },
  { frequency: 783.99, duration: .18 },
]);
wav('habi-alarm.wav', [
  { frequency: 523.25, duration: .20 },
  { frequency: 783.99, duration: .20 },
  { frequency: 1046.50, duration: .30 },
]);
wav('habi-complete.wav', [
  { frequency: 523.25, duration: .12 },
  { frequency: 659.25, duration: .12 },
  { frequency: 783.99, duration: .12 },
  { frequency: 1046.50, duration: .26 },
]);
console.log('Generated original Quest Habi sounds.');
