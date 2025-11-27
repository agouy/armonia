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
const colorSpaceEl = document.getElementById('colorSpace');
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
  }, 50);
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
  hintBtn.textContent = '💡 Show Hint';
  
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

function updateColorSpace(colors) {
  const oldIndicators = colorSpaceEl.querySelectorAll('.harmony-indicator');
  oldIndicators.forEach(ind => ind.remove());
  
  if (colors.length === 0) return;
  
  const width = colorSpaceEl.offsetWidth;
  const height = colorSpaceEl.offsetHeight;
  
  colors.forEach((hex, index) => {
    const oklch = hexToOklch(hex);
    const hue = oklch.h;
    const lightness = oklch.L;
    
    const x = (hue / 360) * width;
    const y = (1 - lightness) * height;
    
    const indicator = document.createElement('div');
    indicator.className = 'harmony-indicator';
    indicator.style.left = x + 'px';
    indicator.style.top = y + 'px';
    indicator.style.backgroundColor = hex;
    indicator.style.borderColor = lightness > 0.5 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
    indicator.style.zIndex = 10 + index;
    
    colorSpaceEl.appendChild(indicator);
  });
}

function updateHarmony() {
  const colors = [];
  slots.forEach(slot => {
    const hex = rgbToHex(slot.style.backgroundColor);
    if (hex) colors.push(hex);
  });
  
  updateColorSpace(colors);
  
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
