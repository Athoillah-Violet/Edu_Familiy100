/**
 * Web Audio API synthesizer for Family 100 BK.
 * No external audio files needed; sounds are synthesized cleanly in real-time.
 * Volume and mute states are persisted in localStorage with try/catch.
 */

const STORAGE_KEY_MUTE = 'family100bk:audio:mute';
const STORAGE_KEY_VOL = 'family100bk:audio:volume';

let audioCtx = null;
let isMuted = false;
let volume = 0.8;

// Initialize preferences safely
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedMute = window.localStorage.getItem(STORAGE_KEY_MUTE);
    if (savedMute !== null) {
      isMuted = savedMute === 'true';
    }
    const savedVol = window.localStorage.getItem(STORAGE_KEY_VOL);
    if (savedVol !== null) {
      const parsed = parseFloat(savedVol);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        volume = parsed;
      }
    }
  }
} catch {
  // Ignore localStorage errors (private browsing / quota)
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const audio = {
  isMuted() {
    return isMuted;
  },

  getVolume() {
    return volume;
  },

  setMuted(muted) {
    isMuted = Boolean(muted);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_MUTE, String(isMuted));
      }
    } catch {}
    return isMuted;
  },

  toggleMute() {
    return this.setMuted(!isMuted);
  },

  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol) || 0));
    volume = clamped;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_VOL, String(volume));
      }
    } catch {}
  },

  play(soundType) {
    if (isMuted || volume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, now);
      masterGain.connect(ctx.destination);

      switch (soundType) {
        case 'correct': {
          // Cheerful two-tone chime (G5 -> C6)
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(783.99, now); // G5
          osc1.frequency.setValueAtTime(1046.5, now + 0.12); // C6

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(392.0, now); // G4
          osc2.frequency.setValueAtTime(523.25, now + 0.12); // C5

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.4, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(masterGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.56);
          osc2.stop(now + 0.56);
          break;
        }

        case 'wrong':
        case 'buzzer': {
          // Low resonant buzzer for strikes / wrong answers
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(130.81, now); // C3
          osc.frequency.setValueAtTime(123.47, now + 0.15); // B2

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
          gain.gain.setValueAtTime(0.5, now + 0.45);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.6);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.62);
          break;
        }

        case 'reveal': {
          // Card flip: swift airy chime
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.26);
          break;
        }

        case 'tick': {
          // Gentle wooden clock click
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        case 'finished': {
          // Gentle celebratory fanfare
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
          notes.forEach((freq, i) => {
            const start = now + i * 0.12;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + (i === 3 ? 0.8 : 0.35));

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(start);
            osc.stop(start + (i === 3 ? 0.85 : 0.4));
          });
          break;
        }

        case 'click': {
          // Subtle UI button feedback
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);

          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.035);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  },
};
