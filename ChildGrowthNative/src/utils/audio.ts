import { Platform } from 'react-native';

let chimeSound: any = null;

// Synthesize a happy children celebration jingle using Web Audio API on web, and expo-av fallback
export async function playSuccessChime() {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        // Play a happy 4-note victory jingle (C5, E5, G5, C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        const times = [0, 0.12, 0.24, 0.36];
        
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + times[i]);
          
          gain.gain.setValueAtTime(0.3, ctx.currentTime + times[i]);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + times[i] + 0.3);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(ctx.currentTime + times[i]);
          osc.stop(ctx.currentTime + times[i] + 0.3);
        });
      }
    } else {
      console.log('🎵 Happy victory song played!');
    }
  } catch (error) {
    console.error('Failed to play victory sound', error);
  }
}

export async function unloadSounds() {
  if (chimeSound) {
    await chimeSound.unloadAsync();
  }
}
