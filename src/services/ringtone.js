/**
 * Simple ringtone generator using Web Audio API.
 * No external audio files required.
 */

let audioCtx = null;
let oscillator = null;
let gainNode = null;
let ringtoneInterval = null;

/**
 * Play a repeating ringtone pattern.
 * Uses two-tone pattern similar to a phone ring.
 */
export function startRingtone() {
  stopRingtone(); // Clean up any existing ringtone

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = 0;

    const playBurst = () => {
      if (!audioCtx) return;

      // First tone
      const osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 440;
      osc1.connect(gainNode);

      const now = audioCtx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gainNode.gain.setValueAtTime(0.3, now + 0.4);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.5);

      // Second tone (slightly higher)
      gainNode.gain.setValueAtTime(0, now + 0.6);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.65);
      osc1.frequency.setValueAtTime(480, now + 0.6);
      gainNode.gain.setValueAtTime(0.3, now + 1.0);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.1);

      osc1.start(now);
      osc1.stop(now + 1.2);
    };

    playBurst();
    ringtoneInterval = setInterval(playBurst, 2500);
  } catch (e) {
    console.warn('Ringtone unavailable:', e);
  }
}

/**
 * Stop the ringtone.
 */
export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  gainNode = null;
  oscillator = null;
}
