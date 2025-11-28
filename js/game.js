// Main Game Logic
import { playSound, resumeAudio } from './audio.js';
import { rgbToHex, hexToOklch } from './color-utils.js';
import { computeHarmonyScore } from './harmony.js';
import { generateLevel } from './level-generator.js';
import { detectHarmonyType } from './harmony-detector.js';
import { ParticleSystem } from './particles.js';

// Game State
let currentLevel = 1;
let levelData = null;
let prevScore = 0;

// DOM Elements
const gameEl = document.getElementById('game');
const gameTitleEl = document.getElementById('game-title');
const paletteLeftEl = document.getElementById('palette-left');
const paletteRightEl = document.getElementById('palette-right');
const dropzoneEl = document.getElementById('dropzone');
const colorVizEl = document.getElementById('colorViz');
const slots = dropzoneEl.querySelectorAll('.slot');
const scoreEl = document.getElementById('score');
const scorePanelEl = document.getElementById('score-panel');
const progressEl = document.getElementById('progress');
const levelEl = document.getElementById('level');
const targetEl = document.getElementById('target');
const nextBtn = document.getElementById('nextBtn');
const hintBtn = document.getElementById('hintBtn');
const modalEl = document.getElementById('modal');

// Track used colors and their original positions
let usedColors = new Set();
let colorPositions = new Map();

// Game progression tracking
let totalStars = 0;
let discoveredHarmonies = new Set();
let particleSystem;
let currentStars = 0;
let hintsUsed = 0;
let bestSolution = [];

export function startGame() {
  modalEl.style.display = 'none';
  gameEl.style.display = 'flex';
  gameTitleEl.style.display = 'block';
  scorePanelEl.style.display = 'flex';
  particleSystem = new ParticleSystem(document.body);
  createUIElements();
  nextLevel();
  resumeAudio();
}

function createUIElements() {
  if (!document.getElementById('comboNotif')) {
    const notif = document.createElement('div');
    notif.id = 'comboNotif';
    notif.className = 'combo-notification';
    document.body.appendChild(notif);
  }
  
  if (!document.getElementById('comboBackdrop')) {
    const backdrop = document.createElement('div');
    backdrop.id = 'comboBackdrop';
    backdrop.className = 'combo-backdrop';
    backdrop.onclick = dismissComboNotification;
    document.body.appendChild(backdrop);
  }
  
  if (!document.getElementById('stars')) {
    const stars = document.createElement('div');
    stars.id = 'stars';
    stars.className = 'stars';
    stars.innerHTML = '<span class="star">⭐</span><span class="star">⭐</span><span class="star">⭐</span>';
    scorePanelEl.insertBefore(stars, scorePanelEl.firstChild.nextSibling);
  }
}

function showComboNotification(harmony) {
  const notif = document.getElementById('comboNotif');
  const backdrop = document.getElementById('comboBackdrop');
  if (!notif || !harmony) return;
  
  notif.innerHTML = `
    <div class="emoji">${harmony.emoji}</div>
    <div class="name">${harmony.name}!</div>
    <div class="description">${harmony.description}</div>
  `;
  
  notif.classList.remove('show');
  backdrop.classList.remove('show');
  
  setTimeout(() => {
    notif.classList.add('show');
    backdrop.classList.add('show');
    discoveredHarmonies.add(harmony.type);
    
    // Generate art with current palette
    const colors = [];
    slots.forEach(slot => {
      const hex = rgbToHex(slot.style.backgroundColor);
      if (hex) colors.push(hex);
    });
    if (colors.length > 0) {
      generateArt(colors);
    }
  }, 50);
}

function generateArt(colors) {
  const canvas = document.getElementById('generativeArt');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Generate flowing organic shapes with more variety for larger canvas
  const numShapes = 35 + Math.floor(Math.random() * 25);
  
  for (let i = 0; i < numShapes; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const opacity = 0.3 + Math.random() * 0.4;
    
    ctx.fillStyle = color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
    ctx.beginPath();
    
    // Random organic blob
    const centerX = Math.random() * width;
    const centerY = Math.random() * height;
    const radius = 20 + Math.random() * 60;
    const points = 5 + Math.floor(Math.random() * 8);
    
    for (let j = 0; j <= points; j++) {
      const angle = (j / points) * Math.PI * 2;
      const variation = 0.5 + Math.random() * 0.5;
      const x = centerX + Math.cos(angle) * radius * variation;
      const y = centerY + Math.sin(angle) * radius * variation;
      
      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevAngle = ((j - 1) / points) * Math.PI * 2;
        const prevVariation = 0.5 + Math.random() * 0.5;
        const prevX = centerX + Math.cos(prevAngle) * radius * prevVariation;
        const prevY = centerY + Math.sin(prevAngle) * radius * prevVariation;
        
        const cpX = (prevX + x) / 2 + (Math.random() - 0.5) * 40;
        const cpY = (prevY + y) / 2 + (Math.random() - 0.5) * 40;
        
        ctx.quadraticCurveTo(cpX, cpY, x, y);
      }
    }
    
    ctx.closePath();
    ctx.fill();
  }
  
  // Show canvas with animation
  canvas.classList.add('show');
}

function dismissComboNotification() {
  const notif = document.getElementById('comboNotif');
  const backdrop = document.getElementById('comboBackdrop');
  if (notif) notif.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
}

function updateStars(score, target) {
  const stars = document.querySelectorAll('#stars .star');
  let earnedStars = 0;
  
  const maxPossible = levelData.maxPossible || 100;
  const range = maxPossible - target;
  
  if (score >= target) earnedStars = 1;
  if (score >= target + (range * 0.4)) earnedStars = 2;
  if (score >= target + (range * 0.7)) earnedStars = 3;
  
  currentStars = earnedStars;
  
  stars.forEach((star, i) => {
    if (i < earnedStars) {
      if (!star.classList.contains('filled')) {
        setTimeout(() => {
          star.classList.add('filled');
          playSound(800 + i * 200, 0.2, 'sine');
        }, i * 150);
      }
    } else {
      star.classList.remove('filled');
    }
  });
  
  return earnedStars;
}

export function showHint() {
  if (!levelData || !bestSolution || bestSolution.length === 0) return;
  
  clearSlots();
  
  bestSolution.forEach((color, index) => {
    if (index < slots.length) {
      const slot = slots[index];
      slot.style.backgroundColor = color;
      slot.classList.add('filled');
      slot.draggable = true;
      slot.dataset.color = color;
      slot.dataset.slotIndex = slot.dataset.slot;
      slot.dataset.colorId = color;
      
      usedColors.add(color);
      
      const swatches = document.querySelectorAll('.swatch');
      swatches.forEach(swatch => {
        if (swatch.dataset.color === color) {
          swatch.classList.add('used');
        }
      });
      
      const overlay = document.createElement('div');
      overlay.className = 'hint-overlay';
      slot.appendChild(overlay);
      setTimeout(() => overlay.remove(), 4500);
    }
  });
  
  updateHarmony();
  hintsUsed++;
  
  hintBtn.disabled = true;
  hintBtn.textContent = '💡 Hint Used';
  
  playSound(600, 0.3, 'square');
}

function renderPalette(colors) {
  paletteLeftEl.innerHTML = '';
  paletteRightEl.innerHTML = '';
  colorPositions.clear();
  
  const mid = Math.ceil(colors.length / 2);
  const leftColors = colors.slice(0, mid);
  const rightColors = colors.slice(mid);
  
  leftColors.forEach((color, index) => {
    const swatch = createSwatch(color, 'left', index);
    paletteLeftEl.appendChild(swatch);
    colorPositions.set(color, { palette: 'left', index });
  });
  
  rightColors.forEach((color, index) => {
    const swatch = createSwatch(color, 'right', index);
    paletteRightEl.appendChild(swatch);
    colorPositions.set(color, { palette: 'right', index });
  });
}

function createSwatch(color, palette, index) {
  const swatch = document.createElement('div');
  swatch.className = 'swatch';
  swatch.draggable = true;
  swatch.style.backgroundColor = color;
  swatch.dataset.color = color;
  swatch.dataset.palette = palette;
  swatch.dataset.paletteIndex = index;
  swatch.addEventListener('dragstart', handleDragStart);
  return swatch;
}

function nextLevel() {
  levelData = generateLevel(currentLevel);
  usedColors.clear();
  renderPalette(levelData.sideColors);
  clearSlots();
  levelEl.textContent = levelData.level;
  targetEl.textContent = levelData.targetScore;
  nextBtn.disabled = true;
  prevScore = 0;
  
  bestSolution = findBestSolution(levelData.sideColors);
  
  hintBtn.disabled = false;
  hintBtn.textContent = 'Show Solution';
  
  // Hide generative art when starting new level
  const canvas = document.getElementById('generativeArt');
  if (canvas) {
    canvas.classList.remove('show');
  }
  
  playSound(600, 0.3, 'triangle');
}

function findBestSolution(colors) {
  let bestCombo = [];
  let bestScore = 0;
  
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      for (let k = j + 1; k < colors.length; k++) {
        const combo = [colors[i], colors[j], colors[k]];
        const score = computeHarmonyScore(combo);
        if (score > bestScore) {
          bestScore = score;
          bestCombo = combo;
        }
      }
    }
  }
  
  return bestCombo;
}

function clearSlots() {
  slots.forEach(slot => {
    const color = rgbToHex(slot.style.backgroundColor);
    if (color) {
      returnColorToPalette(color);
      usedColors.delete(color);
    }
    slot.style.backgroundColor = '';
    slot.classList.remove('filled');
    slot.dataset.colorId = '';
  });
  updateHarmony();
  nextBtn.disabled = true;
}

function handleDragStart(e) {
  const color = e.target.dataset.color;
  const slotIndex = e.target.dataset.slotIndex;
  e.dataTransfer.setData('text/plain', color);
  e.dataTransfer.setData('slotIndex', slotIndex || '');
  e.dataTransfer.effectAllowed = 'copy';
}

function handleDragEnd(e) {
  const slotIndex = e.dataTransfer.getData('slotIndex');
  if (slotIndex && !e.dataTransfer.dropEffect) {
    const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
    if (slot) {
      const color = rgbToHex(slot.style.backgroundColor);
      if (color) {
        returnColorToPalette(color);
        usedColors.delete(color);
      }
      slot.style.backgroundColor = '';
      slot.classList.remove('filled');
      slot.removeAttribute('draggable');
      slot.dataset.colorId = '';
      delete slot.dataset.color;
      delete slot.dataset.slotIndex;
      
      playSound(300, 0.2);
      updateHarmony();
    }
  }
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  const color = e.dataTransfer.getData('text/plain');
  const fromSlotIndex = e.dataTransfer.getData('slotIndex');
  const targetSlot = e.currentTarget;
  
  if (fromSlotIndex && fromSlotIndex === targetSlot.dataset.slot) {
    targetSlot.classList.remove('dragover');
    return;
  }
  
  if (!fromSlotIndex && usedColors.has(color)) {
    targetSlot.classList.remove('dragover');
    return;
  }
  
  const replacedColor = rgbToHex(targetSlot.style.backgroundColor);
  if (replacedColor) {
    returnColorToPalette(replacedColor);
    usedColors.delete(replacedColor);
  }
  
  if (fromSlotIndex) {
    const oldSlot = document.querySelector(`[data-slot="${fromSlotIndex}"]`);
    if (oldSlot) {
      oldSlot.style.backgroundColor = '';
      oldSlot.classList.remove('filled');
      oldSlot.removeAttribute('draggable');
      oldSlot.dataset.colorId = '';
    }
  }
  
  targetSlot.style.backgroundColor = color;
  targetSlot.classList.remove('dragover');
  targetSlot.classList.add('filled');
  targetSlot.draggable = true;
  targetSlot.dataset.color = color;
  targetSlot.dataset.slotIndex = targetSlot.dataset.slot;
  targetSlot.dataset.colorId = color;
  
  usedColors.add(color);
  
  const swatches = document.querySelectorAll('.swatch');
  swatches.forEach(swatch => {
    if (swatch.dataset.color === color) {
      swatch.classList.add('used');
    }
  });
  
  updateHarmony();
}

function returnColorToPalette(color) {
  const position = colorPositions.get(color);
  if (!position) return;
  
  const paletteEl = position.palette === 'left' ? paletteLeftEl : paletteRightEl;
  const swatches = paletteEl.querySelectorAll('.swatch');
  
  swatches.forEach(swatch => {
    if (swatch.dataset.color === color) {
      swatch.classList.remove('used');
    }
  });
}

function updateColorWheel(colors) {
  const markersGroup = colorVizEl.querySelector('#wheelMarkers');
  if (!markersGroup) return;
  
  // Clear existing markers
  markersGroup.innerHTML = '';
  
  if (colors.length === 0) return;
  
  const centerX = 100;
  const centerY = 100;
  const radius = 70;
  
  colors.forEach((hex, index) => {
    const oklch = hexToOklch(hex);
    const hue = oklch.h || 0;
    const chroma = oklch.C || 0;
    const lightness = oklch.L || 0.5;
    
    // Position on wheel based on hue
    const angle = (hue - 90) * (Math.PI / 180);
    const distance = Math.min(chroma * radius * 2, radius);
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    
    // Create marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    marker.classList.add('wheel-marker');
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 6);
    circle.setAttribute('fill', hex);
    
    marker.appendChild(circle);
    
    // Draw line from center if there are multiple colors
    if (colors.length > 1) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.classList.add('wheel-line');
      line.setAttribute('x1', centerX);
      line.setAttribute('y1', centerY);
      line.setAttribute('x2', x);
      line.setAttribute('y2', y);
      markersGroup.appendChild(line);
    }
    
    markersGroup.appendChild(marker);
  });
  
  // Draw connecting lines between colors
  if (colors.length > 1) {
    for (let i = 0; i < colors.length; i++) {
      const hex1 = colors[i];
      const hex2 = colors[(i + 1) % colors.length];
      
      const oklch1 = hexToOklch(hex1);
      const oklch2 = hexToOklch(hex2);
      
      const angle1 = ((oklch1.h || 0) - 90) * (Math.PI / 180);
      const angle2 = ((oklch2.h || 0) - 90) * (Math.PI / 180);
      const distance1 = Math.min((oklch1.C || 0) * radius * 2, radius);
      const distance2 = Math.min((oklch2.C || 0) * radius * 2, radius);
      
      const x1 = centerX + Math.cos(angle1) * distance1;
      const y1 = centerY + Math.sin(angle1) * distance1;
      const x2 = centerX + Math.cos(angle2) * distance2;
      const y2 = centerY + Math.sin(angle2) * distance2;
      
      const connectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      connectionLine.classList.add('wheel-line');
      connectionLine.setAttribute('x1', x1);
      connectionLine.setAttribute('y1', y1);
      connectionLine.setAttribute('x2', x2);
      connectionLine.setAttribute('y2', y2);
      connectionLine.style.strokeWidth = '1.5';
      connectionLine.style.strokeDasharray = 'none';
      connectionLine.style.stroke = 'rgba(255,255,255,0.25)';
      
      markersGroup.insertBefore(connectionLine, markersGroup.firstChild);
    }
  }
}

function updateHarmony() {
  const colors = [];
  slots.forEach(slot => {
    const hex = rgbToHex(slot.style.backgroundColor);
    if (hex) colors.push(hex);
  });
  
  updateColorWheel(colors);
  
  // Generate art whenever we have colors
  if (colors.length > 0) {
    generateArt(colors);
  }
  
  const score = computeHarmonyScore(colors);
  scoreEl.textContent = score;
  const percent = Math.min((score / 100) * 100, 100);
  progressEl.style.width = percent + '%';
  
  if (score > prevScore) {
    playSound(700 + score * 2, 0.15);
  }
  prevScore = score;

  const wasSuccess = dropzoneEl.classList.contains('success');
  const isSuccess = colors.length === 3 && score >= levelData.targetScore;
  
  if (colors.length === 3) {
    updateStars(score, levelData.targetScore);
  }
  
  if (isSuccess) {
    if (!wasSuccess) {
      const harmonies = detectHarmonyType(colors);
      
      if (harmonies && harmonies.length > 0) {
        showComboNotification(harmonies[0]);
      }
      
      dropzoneEl.classList.add('success');
      slots.forEach((slot, i) => {
        if (slot.classList.contains('filled')) {
          const rect = slot.getBoundingClientRect();
          const color = rgbToHex(slot.style.backgroundColor);
          
          if (particleSystem) {
            particleSystem.burst(
              rect.left + rect.width / 2,
              rect.top + rect.height / 2,
              color,
              20
            );
            particleSystem.startAnimation();
          }
          
          setTimeout(() => {
            slot.classList.add('success');
            setTimeout(() => slot.classList.remove('success'), 800);
          }, i * 150);
        }
      });
      
      gameEl.classList.add('shake');
      setTimeout(() => gameEl.classList.remove('shake'), 500);
      
      playSound(880, 0.4, 'sine');
      playSound(660, 0.4, 'sine');
    }
    nextBtn.disabled = false;
    scoreEl.style.color = '#4ECDC4';
  } else {
    dropzoneEl.classList.remove('success');
    scoreEl.style.color = 'white';
  }
}

slots.forEach(slot => {
  slot.addEventListener('dragover', handleDragOver);
  slot.addEventListener('dragleave', handleDragLeave);
  slot.addEventListener('drop', handleDrop);
  slot.addEventListener('dragstart', handleDragStart);
  slot.addEventListener('dragend', handleDragEnd);
});

export function advanceToNextLevel() {
  dismissComboNotification();
  
  totalStars += currentStars;
  currentStars = 0;
  
  currentLevel++;
  nextLevel();
}
