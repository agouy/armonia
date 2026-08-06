
import { hexToOklch, hslToHex, hueDiff } from '../common/color-utils.js';
import { computeHarmonyScore } from '../common/harmony.js';

let audioContext = null;
let isPlaying = false;
let animationId = null;
let canvas = null;
let ctx = null;
let shapes = [];
let fields = [];
let lastTime = 0;
const SCHEDULE_AHEAD_TIME = 0.1; // s
const LOOKAHEAD = 25.0; // ms

// Game state
let selectedShape = null;
let selectedField = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let factorySelectedShapeType = 'circle';
let factorySelectedFieldType = 'gravity';
let currentHarmonyScore = 0;
let bpm = 120;
let factoryMode = 'unit'; // 'unit' or 'field'

export function startStokastik() {
  const modal = document.getElementById('modal');
  const stokastikEl = document.getElementById('stokastik');
  const gameEl = document.getElementById('game');
  const soundscapeEl = document.getElementById('soundscape');
  const backBtn = document.getElementById('backToMenuBtn');
  const backBtnStokastik = document.getElementById('backToMenuBtnStokastik');
  const artModeContainer = document.getElementById('artModeContainer');
  const artCanvas = document.getElementById('generativeArt');
  
  if (modal) modal.style.display = 'none';
  if (gameEl) gameEl.style.display = 'none';
  if (soundscapeEl) soundscapeEl.style.display = 'none';
  if (stokastikEl) stokastikEl.style.display = 'flex';
  if (backBtn) backBtn.style.display = 'none';
  if (backBtnStokastik) backBtnStokastik.style.display = 'block';
  if (artModeContainer) artModeContainer.style.display = 'none';
  if (artCanvas) artCanvas.style.display = 'none';
  
  initStokastik();
}

export function backToMenu() {
  const modal = document.getElementById('modal');
  const stokastikEl = document.getElementById('stokastik');
  const gameEl = document.getElementById('game');
  const gameTitle = document.getElementById('game-title');
  const backBtn = document.getElementById('backToMenuBtn');
  const backBtnStokastik = document.getElementById('backToMenuBtnStokastik');
  const artModeContainer = document.getElementById('artModeContainer');
  const artCanvas = document.getElementById('generativeArt');
  
  stopAudio();
  if (animationId) cancelAnimationFrame(animationId);
  
  if (stokastikEl) stokastikEl.style.display = 'none';
  if (gameEl) gameEl.style.display = 'none';
  if (gameTitle) gameTitle.style.display = 'none';
  if (backBtn) backBtn.style.display = 'none';
  if (backBtnStokastik) backBtnStokastik.style.display = 'none';
  if (artModeContainer) artModeContainer.style.display = 'none';
  if (artCanvas) artCanvas.style.display = 'none';
  if (modal) modal.style.display = 'flex';
}

function initStokastik() {
  canvas = document.getElementById('stokastikCanvas');
  ctx = canvas.getContext('2d');
  
  // Resize canvas
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Initialize shapes if empty
  if (shapes.length === 0) {
    // Start empty or with one demo shape
    // createUnit(0, 5, 'circle'); 
  }
  
  // Event listeners
  canvas.addEventListener('mousedown', handleInputStart);
  canvas.addEventListener('mousemove', handleInputMove);
  canvas.addEventListener('mouseup', handleInputEnd);
  canvas.addEventListener('touchstart', handleInputStart, { passive: false });
  canvas.addEventListener('touchmove', handleInputMove, { passive: false });
  canvas.addEventListener('touchend', handleInputEnd);
  
  document.getElementById('toggleStokastikSound').addEventListener('click', toggleAudio);
  document.getElementById('createUnitBtn').addEventListener('click', createUnitFromFactory);
  document.getElementById('createFieldBtn').addEventListener('click', createFieldFromFactory);
  document.getElementById('clearShapesBtn').addEventListener('click', clearShapes);
  
  // Mode switching
  document.getElementById('modeUnitBtn').addEventListener('click', () => setFactoryMode('unit'));
  document.getElementById('modeFieldBtn').addEventListener('click', () => setFactoryMode('field'));
  
  // BPM Control
  const bpmSlider = document.getElementById('bpmSlider');
  const bpmDisplay = document.getElementById('bpmDisplay');
  bpmSlider.addEventListener('input', (e) => {
    bpm = parseInt(e.target.value);
    bpmDisplay.textContent = bpm;
  });

  // Factory listeners
  const shapeBtns = document.querySelectorAll('.shape-btn');
  shapeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      shapeBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      factorySelectedShapeType = e.target.dataset.shape;
    });
  });
  
  const fieldBtns = document.querySelectorAll('.field-btn');
  fieldBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      fieldBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      factorySelectedFieldType = e.target.dataset.field;
    });
  });
  
  // Rhythm label update
  const speedSlider = document.getElementById('factorySpeed');
  const rhythmLabel = document.getElementById('rhythmLabel');
  speedSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      const labels = ['1/1', '1/2', '1/4', '1/8', '1/16'];
      rhythmLabel.textContent = labels[val-1];
  });
  
  // Degree label update
  const degreeSlider = document.getElementById('factoryDegree');
  const degreeLabel = document.getElementById('degreeLabel');
  degreeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      degreeLabel.textContent = val + (val === 1 ? ' (Root)' : '');
  });

  // Start animation loop
  animate();
}

function setFactoryMode(mode) {
  factoryMode = mode;
  document.getElementById('modeUnitBtn').classList.toggle('active', mode === 'unit');
  document.getElementById('modeFieldBtn').classList.toggle('active', mode === 'field');
  document.getElementById('unitControls').style.display = mode === 'unit' ? 'flex' : 'none';
  document.getElementById('fieldControls').style.display = mode === 'field' ? 'flex' : 'none';
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function createUnitFromFactory() {
  const scaleType = document.getElementById('factoryScale').value;
  const degree = parseInt(document.getElementById('factoryDegree').value);
  const speed = parseInt(document.getElementById('factorySpeed').value);
  const type = factorySelectedShapeType;
  
  // Calculate Pitch and Color
  const baseNote = 60; // Middle C
  let intervals = [];
  
  switch(scaleType) {
    case 'major': intervals = [0, 2, 4, 5, 7, 9, 11, 12]; break;
    case 'minor': intervals = [0, 2, 3, 5, 7, 8, 10, 12]; break;
    case 'pentaMaj': intervals = [0, 2, 4, 7, 9, 12, 14, 16]; break;
    case 'pentaMin': intervals = [0, 3, 5, 7, 10, 12, 15, 17]; break;
    case 'chromatic': intervals = [0, 1, 2, 3, 4, 5, 6, 7]; break;
    default: intervals = [0, 2, 4, 5, 7, 9, 11, 12];
  }
  
  // Handle degrees > 8 by wrapping or extending? 
  // For now, map 1-8 to the first 8 notes of the scale definition
  const noteIndex = (degree - 1) % intervals.length;
  const octaveOffset = Math.floor((degree - 1) / intervals.length) * 12;
  
  const midiNote = baseNote + intervals[noteIndex] + octaveOffset;
  
  // Map Pitch to Color (Hue)
  // C (0) -> 0 (Red)
  // C# (1) -> 30 (Orange)
  // ...
  // B (11) -> 330 (Pink)
  const semitone = midiNote % 12;
  const hue = semitone * 30;
  
  createUnit(hue, speed, type, midiNote);
}

function createFieldFromFactory() {
  const type = factorySelectedFieldType;
  createField(type);
}

function createField(type) {
  const x = canvas.width / 2 + (Math.random() - 0.5) * 100;
  const y = canvas.height / 2 + (Math.random() - 0.5) * 100;
  
  fields.push({
    x: x,
    y: y,
    radius: 80,
    type: type,
    color: type === 'gravity' ? '#9b59b6' : (type === 'silence' ? '#95a5a6' : '#f1c40f')
  });
}

function createUnit(hue, speedVal, type, midiNote = null) {
  const color = hslToHex(hue, 75, 60);
  
  // Map speed (1-5) to musical rhythm subdivision
  // 1=1/1, 2=1/2, 3=1/4, 4=1/8, 5=1/16
  const subdivisions = [1, 0.5, 0.25, 0.125, 0.0625];
  const rhythmMultiplier = subdivisions[speedVal - 1];
  
  // Physical velocity is somewhat decoupled now, just visual speed
  const velocityMag = 1.0 + (speedVal / 5) * 2; 
  
  // Random position near center
  const x = canvas.width / 2 + (Math.random() - 0.5) * 100;
  const y = canvas.height / 2 + (Math.random() - 0.5) * 100;
  
  // Random direction
  const angle = Math.random() * Math.PI * 2;
  
  shapes.push({
    x: x,
    y: y,
    vx: Math.cos(angle) * velocityMag,
    vy: Math.sin(angle) * velocityMag,
    radius: 25,
    color: color,
    type: type,
    hue: hue,
    speedVal: speedVal,
    midiNote: midiNote,
    nextNoteTime: 0, 
    rhythmMultiplier: rhythmMultiplier,
    flash: 0
  });
  
  updateHarmonyDisplay();
  
  // If audio is running, initialize nextNoteTime quantized
  if (isPlaying && audioContext) {
    const secondsPerBeat = 60.0 / bpm;
    const noteDuration = secondsPerBeat * 4 * rhythmMultiplier; // 4 beats = 1 measure (assuming 4/4)
    // Actually let's treat rhythmMultiplier as fraction of a beat? 
    // No, UI says 1/4, 1/8. So 1/4 is 1 beat.
    // Let's standardize: 1/4 note = 1 beat.
    // 1/1 = 4 beats. 1/2 = 2 beats. 1/4 = 1 beat. 1/8 = 0.5 beats.
    
    const beats = rhythmMultiplier * 4; // 1/4 -> 0.25 * 4 = 1 beat.
    const duration = beats * secondsPerBeat;
    
    // Quantize start time
    const now = audioContext.currentTime;
    const timeToNext = duration - (now % duration);
    shapes[shapes.length-1].nextNoteTime = now + timeToNext;
  }
}

function clearShapes() {
  shapes = [];
  fields = [];
  updateHarmonyDisplay();
}

function handleInputStart(e) {
  e.preventDefault();
  const pos = getEventPos(e);
  
  // Check if clicked on a shape
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    const dx = pos.x - s.x;
    const dy = pos.y - s.y;
    if (dx * dx + dy * dy < s.radius * s.radius) {
      selectedShape = s;
      dragOffsetX = dx;
      dragOffsetY = dy;
      s.vx = 0;
      s.vy = 0;
      return;
    }
  }
  
  // Check if clicked on a field
  for (let i = fields.length - 1; i >= 0; i--) {
    const f = fields[i];
    const dx = pos.x - f.x;
    const dy = pos.y - f.y;
    if (dx * dx + dy * dy < f.radius * f.radius) {
      selectedField = f;
      dragOffsetX = dx;
      dragOffsetY = dy;
      return;
    }
  }
}

function handleInputMove(e) {
  e.preventDefault();
  const pos = getEventPos(e);
  
  if (selectedShape) {
    selectedShape.x = pos.x - dragOffsetX;
    selectedShape.y = pos.y - dragOffsetY;
    
    // Keep in bounds
    if (selectedShape.x < selectedShape.radius) selectedShape.x = selectedShape.radius;
    if (selectedShape.x > canvas.width - selectedShape.radius) selectedShape.x = canvas.width - selectedShape.radius;
    if (selectedShape.y < selectedShape.radius) selectedShape.y = selectedShape.radius;
    if (selectedShape.y > canvas.height - selectedShape.radius) selectedShape.y = canvas.height - selectedShape.radius;
  } else if (selectedField) {
    selectedField.x = pos.x - dragOffsetX;
    selectedField.y = pos.y - dragOffsetY;
  }
}

function handleInputEnd(e) {
  if (selectedShape) {
    // Check for trash bin drop
    const trashBin = document.getElementById('trashBin');
    if (trashBin) {
      const rect = trashBin.getBoundingClientRect();
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      
      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
        
        // Remove shape
        const index = shapes.indexOf(selectedShape);
        if (index > -1) {
          shapes.splice(index, 1);
          updateHarmonyDisplay();
          
          // Play trash sound
          if (audioContext && isPlaying) {
             const osc = audioContext.createOscillator();
             const g = audioContext.createGain();
             osc.frequency.setValueAtTime(150, audioContext.currentTime);
             osc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
             g.gain.setValueAtTime(0.2, audioContext.currentTime);
             g.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
             osc.connect(g);
             g.connect(audioContext.destination);
             osc.start();
             osc.stop(audioContext.currentTime + 0.2);
          }
        }
        selectedShape = null;
        return;
      }
    }

    // Restore velocity based on its speed parameter
    const velocityMag = 1.0 + (selectedShape.speedVal / 5) * 2;
    const angle = Math.random() * Math.PI * 2;
    selectedShape.vx = Math.cos(angle) * velocityMag;
    selectedShape.vy = Math.sin(angle) * velocityMag;
    selectedShape = null;
  }
  
  if (selectedField) {
    // Check for trash bin drop for fields too
    const trashBin = document.getElementById('trashBin');
    if (trashBin) {
      const rect = trashBin.getBoundingClientRect();
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      
      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
             const index = fields.indexOf(selectedField);
             if (index > -1) fields.splice(index, 1);
          }
    }
    selectedField = null;
  }
}

function getEventPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function toggleAudio() {
  const btn = document.getElementById('toggleStokastikSound');
  
  if (isPlaying) {
    stopAudio();
    btn.textContent = '🔊 Start';
    btn.classList.remove('active');
  } else {
    startAudio();
    btn.textContent = '⏸ Pause';
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
  isPlaying = true;
  
  // Reset next note times
  const now = audioContext.currentTime;
  shapes.forEach(s => {
    s.nextNoteTime = now + Math.random() * s.rhythm;
  });
  
  scheduler();
}

function stopAudio() {
  isPlaying = false;
  if (audioContext) {
    audioContext.suspend();
  }
}

function scheduler() {
  if (!isPlaying) return;
  
  const currentTime = audioContext.currentTime;
  const secondsPerBeat = 60.0 / bpm;
  
  shapes.forEach(shape => {
    // Check if shape is in a Silence Zone
    let isMuted = false;
    for (let f of fields) {
      if (f.type === 'silence') {
        const dx = shape.x - f.x;
        const dy = shape.y - f.y;
        if (dx*dx + dy*dy < f.radius*f.radius) {
          isMuted = true;
          break;
        }
      }
    }

    if (shape.nextNoteTime < currentTime + SCHEDULE_AHEAD_TIME) {
      if (!isMuted) {
        scheduleNote(shape, shape.nextNoteTime);
      }
      
      // Calculate next note time based on quantized grid
      // 1/4 note = 1 beat
      const beats = shape.rhythmMultiplier * 4; 
      const duration = beats * secondsPerBeat;
      
      shape.nextNoteTime += duration;
    }
    // Catch up if too far behind
    if (shape.nextNoteTime < currentTime) {
        // Re-align to grid
        const beats = shape.rhythmMultiplier * 4; 
        const duration = beats * secondsPerBeat;
        const nextGrid = Math.ceil(currentTime / duration) * duration;
        shape.nextNoteTime = nextGrid;
    }
  });
  
  setTimeout(scheduler, LOOKAHEAD);
}

function scheduleNote(shape, time) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const panner = audioContext.createStereoPanner();
  
  // Timbre based on shape
  if (shape.type === 'circle') osc.type = 'sine';
  else if (shape.type === 'square') osc.type = 'square';
  else if (shape.type === 'triangle') osc.type = 'triangle';
  
  // Pitch based on Harmony Rules
  let midiNote;

  if (shape.midiNote) {
    midiNote = shape.midiNote;
  } else {
    // 1. Determine Scale based on Harmony Score
    let scale;
    if (currentHarmonyScore >= 80) {
        // Major Pentatonic (Consonant, Happy)
        scale = [0, 2, 4, 7, 9]; 
    } else if (currentHarmonyScore >= 50) {
        // Minor Pentatonic (Melancholic, Cool)
        scale = [0, 3, 5, 7, 10];
    } else {
        // Whole Tone (Dreamy, Unsettled)
        scale = [0, 2, 4, 6, 8, 10];
    }
    
    // 2. Determine Root Note based on Average Hue of all shapes
    let avgHue = 0;
    if (shapes.length > 0) {
        avgHue = shapes.reduce((sum, s) => sum + s.hue, 0) / shapes.length;
    }
    
    // 3. Determine Interval relative to Root
    let hueDist = shape.hue - avgHue;
    // Normalize to -180 to 180
    while (hueDist > 180) hueDist -= 360;
    while (hueDist < -180) hueDist += 360;
    
    // Map hue distance (-180 to 180) to semitones (+/- 12)
    const semitonesFromRoot = Math.round((hueDist / 180) * 12); 
    
    // Snap to scale
    let closestNote = 0;
    let minDiff = 100;
    
    // Check nearby octaves
    for (let oct = -2; oct <= 2; oct++) {
        for (let note of scale) {
            const val = note + (oct * 12);
            const diff = Math.abs(val - semitonesFromRoot);
            if (diff < minDiff) {
                minDiff = diff;
                closestNote = val;
            }
        }
    }
    
    const baseNote = 60; // Middle C
    // Root pitch varies by avgHue (0-360 -> 0-12 semitones)
    const rootOffset = Math.floor(avgHue / 30); 
    
    midiNote = baseNote + rootOffset + closestNote;
  }
  // Clamp to hearing range
  const clampedMidi = Math.max(36, Math.min(96, midiNote));
  
  const freq = 440 * Math.pow(2, (clampedMidi - 69) / 12);
  
  osc.frequency.value = freq;
  
  // Panning based on X position
  panner.pan.value = (shape.x / canvas.width) * 2 - 1;
  
  // Envelope
  // Shorter notes for faster shapes
  const duration = Math.min(0.5, shape.rhythm * 0.8);
  
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  
  osc.connect(panner);
  panner.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.start(time);
  osc.stop(time + duration + 0.1);
  
  // Visual trigger
  setTimeout(() => {
    shape.flash = 1.0;
  }, (time - audioContext.currentTime) * 1000);
}

function updateHarmonyDisplay() {
  const colors = shapes.map(s => s.color);
  const score = computeHarmonyScore(colors);
  currentHarmonyScore = score;
  
  const scoreEl = document.getElementById('stokastikScore');
  if (scoreEl) scoreEl.textContent = score;
  
  const meter = document.getElementById('stokastikMeter');
  if (meter) meter.style.width = score + '%';
}

function applyHarmonyForces() {
  // Apply forces between shapes based on harmony
  const forceStrength = 0.05;
  
  // 1. Shape-to-Shape Forces
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const s1 = shapes[i];
      const s2 = shapes[j];
      
      if (s1 === selectedShape || s2 === selectedShape) continue;
      
      const dx = s2.x - s1.x;
      const dy = s2.y - s1.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 1) continue;
      
      // Calculate harmony between these two colors
      const diff = hueDiff(s1.hue, s2.hue);
      let attraction = 0;
      
      // Complementary (180) -> Strong Attraction
      if (Math.abs(diff - 180) < 30) attraction = 1.0;
      // Triadic (120) -> Medium Attraction
      else if (Math.abs(diff - 120) < 30) attraction = 0.5;
      // Analogous (<30) -> Repulsion (spread out)
      else if (diff < 30) attraction = -0.8;
      // Clashing -> Repulsion
      else attraction = -0.2;
      
      // Apply force
      // F = k * attraction / dist
      const f = (forceStrength * attraction * 1000) / (dist * dist + 100);
      
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;
      
      s1.vx += fx;
      s1.vy += fy;
      s2.vx -= fx;
      s2.vy -= fy;
    }
  }
  
  // 2. Field Forces
  fields.forEach(field => {
    if (field.type === 'gravity') {
      shapes.forEach(shape => {
        if (shape === selectedShape) return;
        const dx = field.x - shape.x;
        const dy = field.y - shape.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Pull towards center
        if (dist > 10) {
          const force = 0.2; // Strong pull
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          shape.vx += fx;
          shape.vy += fy;
        }
      });
    } else if (field.type === 'speed') {
       shapes.forEach(shape => {
        const dx = field.x - shape.x;
        const dy = field.y - shape.y;
        if (dx*dx + dy*dy < field.radius*field.radius) {
           // Boost velocity
           shape.vx *= 1.05;
           shape.vy *= 1.05;
        }
      });
    }
  });
}

function checkCollisions() {
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const s1 = shapes[i];
      const s2 = shapes[j];
      
      const dx = s2.x - s1.x;
      const dy = s2.y - s1.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = s1.radius + s2.radius;
      
      if (dist < minDist) {
        // Collision detected
        
        // 1. Resolve overlap
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        
        if (s1 !== selectedShape) {
          s1.x -= nx * overlap * 0.5;
          s1.y -= ny * overlap * 0.5;
        }
        if (s2 !== selectedShape) {
          s2.x += nx * overlap * 0.5;
          s2.y += ny * overlap * 0.5;
        }
        
        // 2. Bounce (Elastic collision approximation)
        if (s1 !== selectedShape && s2 !== selectedShape) {
          const dvx = s2.vx - s1.vx;
          const dvy = s2.vy - s1.vy;
          const velAlongNormal = dvx * nx + dvy * ny;
          
          if (velAlongNormal < 0) {
            const restitution = 0.9;
            const j = -(1 + restitution) * velAlongNormal;
            // Assuming equal mass
            const impulse = j / 2;
            
            s1.vx -= impulse * nx;
            s1.vy -= impulse * ny;
            s2.vx += impulse * nx;
            s2.vy += impulse * ny;
          }
        }
        
        // 3. Trigger Sound Interaction
        if (isPlaying && audioContext) {
          // Play a short "ping" for collision
          // Pitch is average of both
          const avgHue = (s1.hue + s2.hue) / 2;
          playCollisionSound(avgHue);
          
          // Visual flash
          s1.flash = 1.0;
          s2.flash = 1.0;
        }
      }
    }
  }
}

function playCollisionSound(hue) {
  if (!audioContext) return;
  
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.type = 'sine';
  // High pitched ping
  const freq = 880 + (hue / 360) * 880;
  osc.frequency.value = freq;
  
  gain.gain.setValueAtTime(0.05, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.start();
  osc.stop(audioContext.currentTime + 0.1);
}

function animate() {
  if (!canvas || !ctx) return;
  
  ctx.fillStyle = 'rgba(10, 10, 10, 0.2)'; // Trails
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Physics updates
  applyHarmonyForces();
  checkCollisions();
  
  // Draw Fields
  fields.forEach(field => {
    ctx.beginPath();
    ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
    
    if (field.type === 'gravity') {
      ctx.strokeStyle = 'rgba(155, 89, 182, 0.5)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(155, 89, 182, 0.1)';
      ctx.fill();
      
      // Draw center point
      ctx.beginPath();
      ctx.arc(field.x, field.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(155, 89, 182, 0.8)';
      ctx.fill();
      
    } else if (field.type === 'silence') {
      ctx.fillStyle = 'rgba(149, 165, 166, 0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(149, 165, 166, 0.5)';
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw mute icon
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔇', field.x, field.y);
      
    } else if (field.type === 'speed') {
      ctx.fillStyle = 'rgba(241, 196, 15, 0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw bolt icon
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', field.x, field.y);
    }
    
    ctx.setLineDash([]);
    
    // Selection ring for fields
    if (field === selectedField) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  
  // Update and draw shapes
  shapes.forEach(shape => {
    // Move
    if (shape !== selectedShape) {
      shape.x += shape.vx;
      shape.y += shape.vy;
      
      // Wall Bounce
      if (shape.x < shape.radius) { shape.x = shape.radius; shape.vx *= -1; }
      if (shape.x > canvas.width - shape.radius) { shape.x = canvas.width - shape.radius; shape.vx *= -1; }
      if (shape.y < shape.radius) { shape.y = shape.radius; shape.vy *= -1; }
      if (shape.y > canvas.height - shape.radius) { shape.y = canvas.height - shape.radius; shape.vy *= -1; }
      
      // Damping (friction)
      shape.vx *= 0.99;
      shape.vy *= 0.99;
      
      // Minimum speed maintenance (so they don't stop completely)
      const speed = Math.sqrt(shape.vx*shape.vx + shape.vy*shape.vy);
      const targetSpeed = 0.5 + (shape.speedVal / 10) * 3;
      if (speed < targetSpeed * 0.5) {
        shape.vx *= 1.01;
        shape.vy *= 1.01;
      }
    }
    
    // Draw connections
    shapes.forEach(other => {
      if (shape === other) return;
      const dx = shape.x - other.x;
      const dy = shape.y - other.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 150) {
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(other.x, other.y);
        
        // Color based on harmony
        const diff = hueDiff(shape.hue, other.hue);
        let alpha = (1 - dist/150) * 0.5;
        let color = 'rgba(255,255,255,';
        
        if (Math.abs(diff - 180) < 20) { // Complementary
             color = 'rgba(78, 205, 196,'; // Teal
             alpha *= 2;
        } else if (diff < 20) { // Analogous
             color = 'rgba(255, 107, 107,'; // Red
        }
        
        ctx.strokeStyle = color + alpha + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    
    // Draw shape
    ctx.fillStyle = shape.color;
    ctx.beginPath();
    if (shape.type === 'circle') {
      ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
    } else if (shape.type === 'square') {
      ctx.rect(shape.x - shape.radius, shape.y - shape.radius, shape.radius * 2, shape.radius * 2);
    } else if (shape.type === 'triangle') {
      ctx.moveTo(shape.x, shape.y - shape.radius);
      ctx.lineTo(shape.x + shape.radius, shape.y + shape.radius);
      ctx.lineTo(shape.x - shape.radius, shape.y + shape.radius);
      ctx.closePath();
    }
    ctx.fill();
    
    // Flash effect
    if (shape.flash > 0) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${shape.flash})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      shape.flash -= 0.1;
    }
    
    // Selection ring
    if (shape === selectedShape) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  
  animationId = requestAnimationFrame(animate);
}
