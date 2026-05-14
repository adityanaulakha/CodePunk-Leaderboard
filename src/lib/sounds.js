// src/lib/sounds.js
// High-performance procedural 8-bit sound synthesizer utilizing HTML5 Web Audio API.
// 0 bytes of external asset downloads, fully dynamic!

let audioCtx = null;
let isMuted = localStorage.getItem('leadx_sfx_muted') === 'true';

export const toggleMute = () => {
  isMuted = !isMuted;
  localStorage.setItem('leadx_sfx_muted', String(isMuted));
  return isMuted;
};

export const getMuteState = () => isMuted;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playClickSound = () => {
  if (isMuted) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
};

export const playSaveSound = () => {
  if (isMuted) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
};

export const playSuccessChime = () => {
  if (isMuted) return;
  try {
    const ctx = getContext();
    const time = ctx.currentTime;
    
    const playToneAt = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    playToneAt(523.25, time, 0.12);       // C5
    playToneAt(659.25, time + 0.08, 0.2);  // E5
    playToneAt(783.99, time + 0.16, 0.3);  // G5
  } catch (e) {}
};

export const playFanfare = () => {
  if (isMuted) return;
  try {
    const ctx = getContext();
    const time = ctx.currentTime;
    
    const playToneAt = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.05, startTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    playToneAt(523.25, time, 0.08);        // C5
    playToneAt(587.33, time + 0.06, 0.08); // D5
    playToneAt(659.25, time + 0.12, 0.08); // E5
    playToneAt(698.46, time + 0.18, 0.08); // F5
    playToneAt(783.99, time + 0.24, 0.4);  // G5
  } catch (e) {}
};

export const playErrorSound = () => {
  if (isMuted) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
};
