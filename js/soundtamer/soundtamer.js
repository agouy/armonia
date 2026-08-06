
import { hslToHex, hueDiff } from '../common/color-utils.js';
import { computeHarmonyScore } from '../common/harmony.js';

let canvas, ctx;
let animationId;
let audioContext;
let isPlaying = false;

// Graph Data
let nodes = []; // { id, type, x, y, radius, ...props }
let edges = []; // { id, from: nodeId, to: nodeId, length, points: [] }
let particles = []; // { id, edgeId, t: 0..1, speed, color, hue }

// Interaction State
let currentTool = 'source';
let selectedNode = null;
let draggingNode = null;
let linkingNode = null;
let mousePos = { x: 0, y: 0 };
let dragOffset = { x: 0, y: 0 };

// Game State
let harmonyScore = 0;
let lastTime = 0;

export function startSoundTamer() {
  init();
}

function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Controls
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      currentTool = target.dataset.tool;
      updateToolDescription();
    });
  });
  
  document.getElementById('toggleSound').addEventListener('click', toggleAudio);
  document.getElementById('clearBtn').addEventListener('click', clearAll);
  
  // Canvas Interaction
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  
  // Start Loop
  lastTime = performance.now();
  animate(lastTime);
}

function updateToolDescription() {
  const desc = document.getElementById('toolDescription');
  switch(currentTool) {
    case 'source': desc.textContent = "Source: Generates particles. Drag to connect."; break;
    case 'resonator': desc.textContent = "Resonator: Plays sound when hit."; break;
    case 'filter': desc.textContent = "Filter: Harmonizes particle color."; break;
    case 'polariser': desc.textContent = "Polariser: Adds timbre/harmonics to particles."; break;
    case 'splitter': desc.textContent = "Splitter: Randomly routes particles."; break;
  }
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function toggleAudio() {
  const btn = document.getElementById('toggleSound');
  if (isPlaying) {
    isPlaying = false;
    if (audioContext) audioContext.suspend();
    btn.textContent = "🔊 Start Audio";
    btn.classList.remove('active');
  } else {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    isPlaying = true;
    btn.textContent = "⏸ Pause";
    btn.classList.add('active');
  }
}

function clearAll() {
  nodes = [];
  edges = [];
  particles = [];
  harmonyScore = 0;
  updateUI();
}

// --- Interaction ---

function getEventPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function handleMouseDown(e) {
  const pos = getEventPos(e);
  mousePos = pos;
  
  // Hit test nodes
  const hitNode = nodes.find(n => {
    const dx = pos.x - n.x;
    const dy = pos.y - n.y;
    return dx*dx + dy*dy < n.radius*n.radius;
  });
  
  if (hitNode) {
    if (e.shiftKey) {
       linkingNode = hitNode;
    } else {
       draggingNode = hitNode;
       dragOffset = { x: pos.x - hitNode.x, y: pos.y - hitNode.y };
       selectedNode = hitNode;
    }
  } else {
    // Create new node
    createNode(pos.x, pos.y, currentTool);
  }
}

function handleMouseMove(e) {
  const pos = getEventPos(e);
  mousePos = pos;
  
  if (draggingNode) {
    draggingNode.x = pos.x - dragOffset.x;
    draggingNode.y = pos.y - dragOffset.y;
  }
}

function handleMouseUp(e) {
  const pos = getEventPos(e);
  
  if (linkingNode) {
    // Check drop target
    const hitNode = nodes.find(n => {
      const dx = pos.x - n.x;
      const dy = pos.y - n.y;
      return dx*dx + dy*dy < n.radius*n.radius;
    });
    
    if (hitNode && hitNode !== linkingNode) {
      createEdge(linkingNode, hitNode);
    }
    linkingNode = null;
  }
  
  if (draggingNode) {
    // Check trash
    const trashBin = document.getElementById('trashBin');
    const rect = trashBin.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    if (clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom) {
      deleteNode(draggingNode);
    }
    draggingNode = null;
  }
}

// --- Graph Logic ---

function createNode(x, y, type) {
  const node = {
    id: Math.random().toString(36).substr(2, 9),
    type: type,
    x: x,
    y: y,
    radius: 25,
    cooldown: 0,
    interval: 2000, // for source
    flash: 0
  };
  nodes.push(node);
  playSound('click');
}

function deleteNode(node) {
  nodes = nodes.filter(n => n !== node);
  edges = edges.filter(e => e.from !== node.id && e.to !== node.id);
  particles = particles.filter(p => {
    // Keep particles on edges that still exist? 
    // Actually if edge is gone, particle should die.
    const edgeExists = edges.find(e => e.id === p.edgeId);
    return !!edgeExists;
  });
}

function createEdge(fromNode, toNode) {
  // Check if exists
  const exists = edges.find(e => e.from === fromNode.id && e.to === toNode.id);
  if (exists) return;
  
  const edge = {
    id: Math.random().toString(36).substr(2, 9),
    from: fromNode.id,
    to: toNode.id,
    length: 0 // Calculated in update/draw
  };
  edges.push(edge);
  playSound('connect');
}

function spawnParticle(node) {
  // Find outgoing edges
  const outgoing = edges.filter(e => e.from === node.id);
  if (outgoing.length === 0) return;
  
  // Pick one (or all? let's do all for Source to fill pipes)
  outgoing.forEach(edge => {
    particles.push({
      id: Math.random().toString(36).substr(2, 9),
      edgeId: edge.id,
      t: 0,
      speed: 0.5, // units per second (normalized t? no, t is 0..1)
      // We need speed to be relative to length. 
      // Let's say speed is pixels per second.
      pxSpeed: 150,
      hue: Math.random() * 360,
      color: '#fff',
      polarized: false
    });
  });
  
  node.flash = 1.0;
}

// --- Simulation ---

function update(dt) {
  // 1. Node Logic
  nodes.forEach(node => {
    if (node.type === 'source') {
      node.cooldown -= dt;
      if (node.cooldown <= 0) {
        spawnParticle(node);
        node.cooldown = node.interval;
      }
    }
    if (node.flash > 0) node.flash -= dt * 0.005; // Decay
  });
  
  // 2. Particle Logic
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const edge = edges.find(e => e.id === p.edgeId);
    
    if (!edge) {
      particles.splice(i, 1);
      continue;
    }
    
    // Calculate edge length for speed
    const n1 = nodes.find(n => n.id === edge.from);
    const n2 = nodes.find(n => n.id === edge.to);
    if (!n1 || !n2) {
      particles.splice(i, 1);
      continue;
    }
    
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Advance t
    // t += (pxSpeed * dt / 1000) / dist
    p.t += (p.pxSpeed * dt / 1000) / dist;
    
    if (!p.polarized) {
      p.color = hslToHex(p.hue, 70, 60);
    } else {
      // Polarized particles are brighter/whiter
      p.color = hslToHex(p.hue, 100, 80);
    }
    
    if (p.t >= 1.0) {
      // Reached target
      handleParticleArrival(p, n2);
      particles.splice(i, 1); // Remove from current edge
    }
  }
  
  // 3. Harmony
  const colors = particles.map(p => p.color);
  harmonyScore = computeHarmonyScore(colors);
  updateUI();
}

function handleParticleArrival(p, node) {
  node.flash = 1.0;
  
  // Node Effects
  if (node.type === 'resonator') {
    playSound(p.polarized ? 'note-polarized' : 'note', p.hue);
  } else if (node.type === 'filter') {
    // Snap hue
    p.hue = Math.round(p.hue / 30) * 30;
    playSound('chime', p.hue);
  } else if (node.type === 'polariser') {
    p.polarized = true;
    playSound('zap', p.hue);
  } else if (node.type === 'splitter') {
    // Just pass through
  }
  
  // Route to next edges
  const outgoing = edges.filter(e => e.from === node.id);
  if (outgoing.length > 0) {
    if (node.type === 'splitter') {
      // Send to ALL outputs? or Random?
      // Let's do Random for "Splitter" name implies splitting flow, 
      // but usually in particles it means dividing count.
      // Since we have 1 particle, let's pick RANDOM output.
      const edge = outgoing[Math.floor(Math.random() * outgoing.length)];
      particles.push({
        ...p,
        id: Math.random().toString(36),
        edgeId: edge.id,
        t: 0
      });
    } else {
      // Standard: Send to all (Duplicate) or Round Robin?
      // Let's do Round Robin to prevent explosion?
      // Or just Send to All (Duplication).
      // Duplication is fun but dangerous.
      // Let's do Random for now for all nodes unless specified.
      const edge = outgoing[Math.floor(Math.random() * outgoing.length)];
      particles.push({
        ...p,
        id: Math.random().toString(36),
        edgeId: edge.id,
        t: 0
      });
    }
  }
}

function updateUI() {
  document.getElementById('harmonyScore').textContent = harmonyScore;
  document.getElementById('harmonyMeter').style.width = harmonyScore + '%';
}

function animate(time) {
  const dt = time - lastTime;
  lastTime = time;
  
  update(dt);
  draw();
  
  animationId = requestAnimationFrame(animate);
}

function draw() {
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw Edges
  ctx.lineWidth = 3;
  edges.forEach(edge => {
    const n1 = nodes.find(n => n.id === edge.from);
    const n2 = nodes.find(n => n.id === edge.to);
    if (!n1 || !n2) return;
    
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    
    // Bezier curve?
    // Control points?
    // Simple straight line for now, maybe slight curve
    // ctx.lineTo(n2.x, n2.y);
    
    // Let's do a quadratic curve for style
    // const cx = (n1.x + n2.x) / 2;
    // const cy = (n1.y + n2.y) / 2 - 50; // Curve up?
    // ctx.quadraticCurveTo(cx, cy, n2.x, n2.y);
    
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
  });
  
  // Draw Linking Line
  if (linkingNode) {
    ctx.strokeStyle = '#4ecdc4';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(linkingNode.x, linkingNode.y);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // Draw Particles
  particles.forEach(p => {
    const edge = edges.find(e => e.id === p.edgeId);
    if (!edge) return;
    const n1 = nodes.find(n => n.id === edge.from);
    const n2 = nodes.find(n => n.id === edge.to);
    if (!n1 || !n2) return;
    
    // Lerp
    const x = n1.x + (n2.x - n1.x) * p.t;
    const y = n1.y + (n2.y - n1.y) * p.t;
    
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.polarized ? 20 : 10; // More glow if polarized
    ctx.beginPath();
    ctx.arc(x, y, p.polarized ? 8 : 6, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  
  // Draw Nodes
  nodes.forEach(node => {
    ctx.save();
    ctx.translate(node.x, node.y);
    
    // Base
    ctx.fillStyle = '#2c3e50';
    if (node === selectedNode) ctx.fillStyle = '#34495e';
    ctx.beginPath();
    ctx.arc(0, 0, node.radius, 0, Math.PI*2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = getNodeColor(node.type);
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Icon
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getNodeIcon(node.type), 0, 0);
    
    // Flash
    if (node.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${node.flash * 0.5})`;
      ctx.beginPath();
      ctx.arc(0, 0, node.radius, 0, Math.PI*2);
      ctx.fill();
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${node.flash})`;
      ctx.beginPath();
      ctx.arc(0, 0, node.radius + 5 + node.flash * 10, 0, Math.PI*2);
      ctx.stroke();
    }
    
    ctx.restore();
  });
}

function getNodeColor(type) {
  switch(type) {
    case 'source': return '#4ecdc4';
    case 'resonator': return '#f1c40f';
    case 'filter': return '#9b59b6';
    case 'polariser': return '#e056fd';
    case 'splitter': return '#e74c3c';
    default: return '#95a5a6';
  }
}

function getNodeIcon(type) {
  switch(type) {
    case 'source': return '🌱';
    case 'resonator': return '🔔';
    case 'filter': return '🌈';
    case 'polariser': return '🔮';
    case 'splitter': return '🔀';
    default: return '?';
  }
}

function playSound(type, val) {
  if (!isPlaying || !audioContext) return;
  
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  if (type === 'click') {
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'connect') {
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'note' || type === 'note-polarized') {
    // Hue to pitch
    const scale = [0, 2, 4, 5, 7, 9, 11];
    const hueVal = Math.round(val / 30); 
    const noteIndex = Math.abs(hueVal) % 7;
    const octave = 4 + Math.floor(hueVal / 12);
    const midi = octave * 12 + scale[noteIndex];
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    
    if (type === 'note-polarized') {
      osc.type = 'sawtooth'; // Richer sound
      // Maybe add a lowpass filter for "acid" sound?
      // For now just sawtooth is distinct enough
    } else {
      osc.type = 'sine';
    }
    
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === 'chime') {
    osc.type = 'triangle';
    osc.frequency.value = 880; // High chime
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'zap') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}
