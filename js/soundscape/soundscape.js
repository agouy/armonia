// Soundscape Mode - Audio-Visual Harmony Explorer
import { hexToOklch } from '../common/color-utils.js';
import { computeHarmonyScore } from '../common/harmony.js';
import { detectHarmonyType } from '../common/harmony-detector.js';

let audioContext = null;
let oscillators = [];
let gainNodes = [];
let isPlaying = false;
let animationId = null;
let canvas = null;
let ctx = null;

const colors = ['#ff4444', '#44ff44', '#4444ff'];

export function startSoundscape() {
  const modal = document.getElementById('modal');
  const soundscapeEl = document.getElementById('soundscape');
  const gameEl = document.getElementById('game');
  const backBtn = document.getElementById('backToMenuBtn');
  const backBtnSoundscape = document.getElementById('backToMenuBtnSoundscape');
  const artModeContainer = document.getElementById('artModeContainer');
  const artCanvas = document.getElementById('generativeArt');
  
  if (modal) modal.style.display = 'none';
  if (gameEl) gameEl.style.display = 'none';
  if (soundscapeEl) soundscapeEl.style.display = 'flex';
  if (backBtn) backBtn.style.display = 'none';
  if (backBtnSoundscape) backBtnSoundscape.style.display = 'block';
  if (artModeContainer) artModeContainer.style.display = 'none';
  if (artCanvas) artCanvas.style.display = 'none';
  
  initSoundscape();
}

export function backToMenu() {
  const modal = document.getElementById('modal');
  const soundscapeEl = document.getElementById('soundscape');
  const gameEl = document.getElementById('game');
  const gameTitle = document.getElementById('game-title');
  const backBtn = document.getElementById('backToMenuBtn');
  const backBtnSoundscape = document.getElementById('backToMenuBtnSoundscape');
  const artModeContainer = document.getElementById('artModeContainer');
  const artCanvas = document.getElementById('generativeArt');
  
  stopAudio();
  if (animationId) cancelAnimationFrame(animationId);
  
  if (soundscapeEl) soundscapeEl.style.display = 'none';
  if (gameEl) gameEl.style.display = 'none';
  if (gameTitle) gameTitle.style.display = 'none';
  if (backBtn) backBtn.style.display = 'none';
  if (backBtnSoundscape) backBtnSoundscape.style.display = 'none';
  if (artModeContainer) artModeContainer.style.display = 'none';
  if (artCanvas) artCanvas.style.display = 'none';
  if (modal) modal.style.display = 'flex';
}

function initSoundscape() {
  canvas = document.getElementById('soundscapeCanvas');
  ctx = canvas.getContext('2d');
  
  // Setup hue sliders
  const hue1 = document.getElementById('hue1');
  const hue2 = document.getElementById('hue2');
  const hue3 = document.getElementById('hue3');
  
  hue1.addEventListener('input', () => updateFromSliders());
  hue2.addEventListener('input', () => updateFromSliders());
  hue3.addEventListener('input', () => updateFromSliders());
  
  // Setup sound toggle
  const toggleBtn = document.getElementById('toggleSound');
  toggleBtn.addEventListener('click', toggleAudio);
  
  // Initial update
  updateFromSliders();
  
  // Start animation loop
  animate();
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function updateFromSliders() {
  const hue1 = parseInt(document.getElementById('hue1').value);
  const hue2 = parseInt(document.getElementById('hue2').value);
  const hue3 = parseInt(document.getElementById('hue3').value);
  
  // Convert hues to hex colors
  colors[0] = hslToHex(hue1, 70, 55);
  colors[1] = hslToHex(hue2, 70, 55);
  colors[2] = hslToHex(hue3, 70, 55);
  
  // Update orb colors
  document.getElementById('orb1').style.background = colors[0];
  document.getElementById('orb2').style.background = colors[1];
  document.getElementById('orb3').style.background = colors[2];
  
  updateHarmonyDisplay();
}

function updateColors() {
  // Colors are already set by updateFromSliders
  updateHarmonyDisplay();
}

function updateHarmonyDisplay() {
  // Calculate harmony score
  const score = computeHarmonyScore(colors);
  const harmonies = detectHarmonyType(colors);
  
  // Update meter
  const meter = document.getElementById('harmonyMeter');
  if (meter) {
    meter.style.width = score + '%';
  }
  
  // Update harmony type display
  const typeEl = document.getElementById('harmonyType');
  if (typeEl) {
    if (harmonies && harmonies.length > 0) {
      typeEl.textContent = harmonies[0].name + ' ' + harmonies[0].emoji;
    } else if (score > 70) {
      typeEl.textContent = 'Approaching Harmony...';
    } else if (score > 40) {
      typeEl.textContent = 'Exploring...';
    } else {
      typeEl.textContent = 'Dissonance';
    }
  }
  
  // Update audio if playing
  if (isPlaying) {
    updateAudioFromColors();
  }
}

function toggleAudio() {
  const btn = document.getElementById('toggleSound');
  
  if (isPlaying) {
    stopAudio();
    btn.textContent = '🔊 Sound On';
    btn.classList.remove('active');
  } else {
    startAudio();
    btn.textContent = '🔇 Sound Off';
    btn.classList.add('active');
  }
}

function startAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  // Create 3 oscillators for 3 colors
  oscillators = [];
  gainNodes = [];
  
  for (let i = 0; i < 3; i++) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.value = 0.15;
    
    osc.start();
    oscillators.push(osc);
    gainNodes.push(gain);
  }
  
  isPlaying = true;
  updateAudioFromColors();
}

function stopAudio() {
  oscillators.forEach(osc => {
    try { osc.stop(); } catch(e) {}
  });
  oscillators = [];
  gainNodes = [];
  isPlaying = false;
}

function updateAudioFromColors() {
  if (!isPlaying || oscillators.length === 0) return;
  
  const score = computeHarmonyScore(colors);
  
  // Map colors to frequencies based on hue
  // Harmonious colors = harmonious frequency ratios
  colors.forEach((hex, i) => {
    const oklch = hexToOklch(hex);
    const hue = oklch.h || 0;
    
    // Base frequency from hue (220-880 Hz range)
    const baseFreq = 220 + (hue / 360) * 440;
    
    // Add dissonance based on score (lower score = more detuning)
    const dissonance = (100 - score) / 100;
    const detune = (Math.random() - 0.5) * 50 * dissonance;
    
    // Quantize to harmonic intervals when score is high
    let freq = baseFreq + detune;
    if (score > 70) {
      // Snap to harmonic ratios
      const harmonicRatios = [1, 1.25, 1.333, 1.5, 1.667, 2];
      const baseNote = 220;
      const ratio = freq / baseNote;
      const closestRatio = harmonicRatios.reduce((a, b) => 
        Math.abs(b - ratio) < Math.abs(a - ratio) ? b : a
      );
      freq = baseNote * closestRatio * (1 + i * 0.5);
    }
    
    oscillators[i].frequency.setTargetAtTime(freq, audioContext.currentTime, 0.1);
    
    // Adjust gain based on lightness
    const lightness = oklch.l || 0.5;
    gainNodes[i].gain.setTargetAtTime(0.1 + lightness * 0.1, audioContext.currentTime, 0.1);
  });
}

function animate() {
  if (!canvas || !ctx) {
    animationId = requestAnimationFrame(animate);
    return;
  }
  
  // Resize canvas
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width || canvas.height !== rect.height) {
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear with fade effect
  ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
  ctx.fillRect(0, 0, width, height);
  
  const score = computeHarmonyScore(colors);
  const time = Date.now() / 1000;
  
  // Draw flowing waves for each color
  colors.forEach((color, i) => {
    const oklch = hexToOklch(color);
    const hue = oklch.h || 0;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + score / 30;
    ctx.globalAlpha = 0.5 + (score / 200);
    
    ctx.beginPath();
    
    const yBase = height * (0.25 + i * 0.25);
    const amplitude = 30 + (100 - score) * 0.5; // More chaotic when dissonant
    const frequency = 0.01 + (score / 5000); // Smoother when harmonious
    const phase = time * (1 + i * 0.3) + (hue / 60);
    
    for (let x = 0; x < width; x += 3) {
      const noise = (100 - score) / 100 * (Math.random() - 0.5) * 20;
      const y = yBase + Math.sin(x * frequency + phase) * amplitude + noise;
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  });
  
  // Draw center harmony indicator
  ctx.globalAlpha = 1;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 50 + score * 0.5;
  
  // Blend colors in center
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, colors[0] + '80');
  gradient.addColorStop(0.5, colors[1] + '60');
  gradient.addColorStop(1, colors[2] + '40');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Pulsing ring when harmonious
  if (score > 60) {
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * (score / 100) * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10 + Math.sin(time * 2) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  animationId = requestAnimationFrame(animate);
}
