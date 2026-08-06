
import { hslToHex } from '../common/color-utils.js';
import { EXAMPLES } from '../examples.js';

// --- Global State ---
let canvas, ctx;
let audioCtx;
let masterGain;
let reverbNode;
let isRunning = false;
let isMuted = false;
let animationId;

// Graph
let nodes = [];
let edges = [];
let packets = [];

// Interaction
let currentTool = 'source';
let selectedNode = null;
let selectedNodes = []; // Multi-selection for grouping
let selectedEdge = null;
let draggingNode = null;
let linkingNode = null;
let hoveredNode = null;
let isHoveringHandle = false;
let mousePos = { x: 0, y: 0 };
let dragOffset = { x: 0, y: 0 };

// Box Selection
let isBoxSelecting = false;
let boxSelectStart = { x: 0, y: 0 };
let boxSelectEnd = { x: 0, y: 0 };

// Canvas Panning & Zoom
let isPanning = false;
let panOffset = { x: 0, y: 0 };
let panStart = { x: 0, y: 0 };
let contextMenuPos = { x: 0, y: 0 }; // For node creation
let zoomLevel = 1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

// Constants
const NODE_RADIUS = 25;
const HANDLE_OFFSET_X = 35;
const HANDLE_RADIUS = 8;
const PIXELS_PER_STEP = 60; // 1 Step = 1 Beat distance
const GRID_SIZE = 60;

// Attractor System
const SNAP_STEP = 20; // Step size for movement (was 60, now smoother)
const GRID_ATTRACT_STRENGTH = 0.2; // Soft grid attraction
const EDGE_ATTRACT_STRENGTH = 0.7; // Strong edge length attraction
const EDGE_SNAP_INTERVAL = 60; // Preferred edge lengths (multiples of this)
const ATTRACT_RADIUS = 30; // Distance within which attractors activate

// Tunnel Templates (preset sub-graphs)
const TUNNEL_TEMPLATES = {
  voice: {
    name: 'Voice',
    icon: '🎤',
    description: 'Pitch + Polariser (ready-to-play sound)',
    nodes: ['pitch', 'polariser']
  },
  thick: {
    name: 'Thick',
    icon: '🎸', 
    description: 'Octave doubler (+12 semitones)',
    nodes: ['pitch'],
    defaults: { pitch_shift: 12 }
  },
  dark: {
    name: 'Dark',
    icon: '🌑',
    description: 'Low pass filter + low pitch',
    nodes: ['filter', 'pitch'],
    defaults: { pitch_shift: -12 }
  }
};

// Speed
let masterSpeed = 120; // BPM
const MIN_SPEED = 20;
const MAX_SPEED = 300;

// Audio Constants
// Full Chromatic Scale (C3 to C6)
const SCALE_CHROMATIC = [];
const NOTE_NAMES = [];
const BASE_FREQ = 130.81; // C3

const NOTE_LABELS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

for (let i = 0; i < 37; i++) { // 3 Octaves
  const freq = BASE_FREQ * Math.pow(2, i / 12);
  SCALE_CHROMATIC.push(freq);
  
  const octave = Math.floor(i / 12) + 3;
  const noteName = NOTE_LABELS[i % 12] + octave;
  NOTE_NAMES.push(noteName);
}

export function initSynthGraph() {
  canvas = document.getElementById('synthCanvas');
  ctx = canvas.getContext('2d');
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  setupUI();
  setupInteraction();
  
  // Start loop
  loop();
}

function setupUI() {
  // Audio Toggle
  const playBtn = document.getElementById('playBtn');
  playBtn.addEventListener('click', () => {
    if (!audioCtx) {
      initAudio();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    isRunning = !isRunning;
    playBtn.textContent = isRunning ? "⏹ Stop" : "▶ Play";
    playBtn.classList.toggle('primary', !isRunning);
  });
  
  // Mute Toggle
  const muteBtn = document.getElementById('muteBtn');
  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? "🔇" : "🔊";
  });
  
  // Clear
  document.getElementById('clearBtn').addEventListener('click', () => {
    nodes = [];
    edges = [];
    packets = [];
    selectedNode = null;
    updatePropPanel(null);
  });

  // Save / Load
  document.getElementById('saveBtn').addEventListener('click', saveGraph);
  document.getElementById('loadBtn').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', loadGraph);
  
  // Speed Control
  const speedInput = document.getElementById('speedInput');
  speedInput.value = masterSpeed;
  speedInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      masterSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, val));
    }
  });
  speedInput.addEventListener('blur', (e) => {
    e.target.value = masterSpeed;
  });
  
  // Example Loader
  document.getElementById('exampleSelect').addEventListener('change', (e) => {
    const key = e.target.value;
    console.log('Loading example:', key, 'Available:', Object.keys(EXAMPLES));
    if (key && EXAMPLES[key]) {
      loadData(EXAMPLES[key]);
      e.target.value = ""; // Reset
    } else if (key) {
      console.error('Example not found:', key);
    }
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedNodes.length > 0) {
        selectedNodes.forEach(n => deleteNode(n));
        selectedNodes = [];
      } else if (selectedNode) {
        deleteNode(selectedNode);
      }
      if (selectedEdge) deleteEdge(selectedEdge);
    }
    
    // Ctrl+G to group selected nodes into a Tunnel
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      groupSelectedNodes();
    }
    
    // Escape to clear multi-selection
    if (e.key === 'Escape') {
      selectedNodes = [];
      selectedNode = null;
      updatePropPanel(null);
    }
  });
}

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;
  
  // Simple Reverb (Delay Network)
  reverbNode = audioCtx.createDelay();
  reverbNode.delayTime.value = 0.3; // 300ms
  
  const feedback = audioCtx.createGain();
  feedback.gain.value = 0.4;
  
  const delayFilter = audioCtx.createBiquadFilter();
  delayFilter.type = 'lowpass';
  delayFilter.frequency.value = 2000;
  
  // Routing: Master -> Destination
  //          ReverbNode -> Filter -> Feedback -> ReverbNode
  //          ReverbNode -> Destination
  
  masterGain.connect(audioCtx.destination);
  
  reverbNode.connect(delayFilter);
  delayFilter.connect(feedback);
  feedback.connect(reverbNode);
  reverbNode.connect(audioCtx.destination);
}

function setupInteraction() {
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('contextmenu', handleContextMenu);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  
  // Hide context menu on click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
      hideContextMenu();
    }
  });

  // Context Menu Actions
  document.getElementById('ctx-link').addEventListener('click', () => {
    if (selectedNode) {
      linkingNode = selectedNode;
      hideContextMenu();
    }
  });
  
  document.getElementById('ctx-delete').addEventListener('click', () => {
    if (selectedNode) deleteNode(selectedNode);
    if (selectedEdge) deleteEdge(selectedEdge);
    hideContextMenu();
  });
  
  // Group button in context menu
  document.getElementById('ctx-group').addEventListener('click', () => {
    groupSelectedNodes();
    hideContextMenu();
  });
  
  // Add Node Context Menu Items
  document.querySelectorAll('.ctx-add-node').forEach(item => {
    item.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.type;
      const newNode = createNode(type, contextMenuPos.x, contextMenuPos.y);
      selectedNode = newNode;
      updatePropPanel(newNode);
      hideContextMenu();
    });
  });
  
  // Add Tunnel Template Context Menu Items
  document.querySelectorAll('.ctx-add-tunnel').forEach(item => {
    item.addEventListener('click', (e) => {
      const template = e.currentTarget.dataset.template;
      const newNode = createTunnelFromTemplate(template, contextMenuPos.x, contextMenuPos.y);
      if (newNode) {
        selectedNode = newNode;
        updatePropPanel(newNode);
      }
      hideContextMenu();
    });
  });
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

// --- Input Handling ---

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - panOffset.x) / zoomLevel;
  const y = (e.clientY - rect.top - panOffset.y) / zoomLevel;
  return { x, y };
}

function getScreenPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function snapToGrid(val) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

// Attractor-based positioning for smooth movement with soft snapping
function applyAttractors(node, rawX, rawY) {
  // Start with raw position, quantized to small steps
  let x = Math.round(rawX / SNAP_STEP) * SNAP_STEP;
  let y = Math.round(rawY / SNAP_STEP) * SNAP_STEP;
  
  // 1. Grid Attractor (soft snap to grid intersections)
  const nearestGridX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
  const nearestGridY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
  const gridDistX = Math.abs(rawX - nearestGridX);
  const gridDistY = Math.abs(rawY - nearestGridY);
  
  if (gridDistX < ATTRACT_RADIUS) {
    const strength = GRID_ATTRACT_STRENGTH * (1 - gridDistX / ATTRACT_RADIUS);
    x += (nearestGridX - x) * strength;
  }
  if (gridDistY < ATTRACT_RADIUS) {
    const strength = GRID_ATTRACT_STRENGTH * (1 - gridDistY / ATTRACT_RADIUS);
    y += (nearestGridY - y) * strength;
  }
  
  // 2. Edge Length Attractors (stronger - snap to nice edge lengths)
  const connectedEdges = edges.filter(e => e.from === node.id || e.to === node.id);
  
  connectedEdges.forEach(edge => {
    const otherNodeId = edge.from === node.id ? edge.to : edge.from;
    const otherNode = nodes.find(n => n.id === otherNodeId);
    if (!otherNode) return;
    
    // Calculate current edge length with proposed position
    const dx = x - otherNode.x;
    const dy = y - otherNode.y;
    const currentLen = Math.sqrt(dx * dx + dy * dy);
    
    if (currentLen < 1) return; // Avoid division by zero
    
    // Find nearest preferred length (multiples of EDGE_SNAP_INTERVAL)
    const nearestLen = Math.round(currentLen / EDGE_SNAP_INTERVAL) * EDGE_SNAP_INTERVAL;
    const minLen = EDGE_SNAP_INTERVAL; // Minimum edge length
    const targetLen = Math.max(minLen, nearestLen);
    
    // Calculate distance to nearest "snap" length (0 to EDGE_SNAP_INTERVAL/2)
    const halfInterval = EDGE_SNAP_INTERVAL / 2;
    const lenDiff = Math.abs(currentLen - targetLen);
    
    // Always apply some attraction, stronger when closer to target
    // Strength goes from EDGE_ATTRACT_STRENGTH (at target) to ~0.1 (at midpoint)
    const normalizedDiff = lenDiff / halfInterval; // 0 at target, 1 at midpoint
    const strength = EDGE_ATTRACT_STRENGTH * Math.pow(1 - normalizedDiff, 2);
    
    const scale = targetLen / currentLen;
    const targetX = otherNode.x + dx * scale;
    const targetY = otherNode.y + dy * scale;
    
    x += (targetX - x) * strength;
    y += (targetY - y) * strength;
  });
  
  // Final quantization to snap step
  return {
    x: Math.round(x / SNAP_STEP) * SNAP_STEP,
    y: Math.round(y / SNAP_STEP) * SNAP_STEP
  };
}

function handleMouseDown(e) {
  // Hide context menu if visible
  hideContextMenu();

  const pos = getPos(e);
  const screenPos = getScreenPos(e);
  mousePos = pos;
  
  // Handle Link Handle Click
  if (isHoveringHandle && hoveredNode) {
    linkingNode = hoveredNode;
    return;
  }

  const hitNode = nodes.find(n => dist(n, pos) < NODE_RADIUS);
  let hitEdge = null;
  
  if (!hitNode) {
    hitEdge = edges.find(edge => {
      const n1 = nodes.find(n => n.id === edge.from);
      const n2 = nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) return false;
      return distToSegment(pos, n1, n2) < 10; // 10px tolerance
    });
  }

  if (e.button === 2) { // Right click handled by contextmenu event
    return;
  }
  
  if (hitNode) {
    // Click on source node with manual trigger -> fire packet
    if (hitNode.type === 'source' && hitNode.props.autoTrigger === false) {
      spawnPacket(hitNode);
      hitNode.flash = 1.0;
    }
    
    // Shift+Click for multi-selection
    if (e.shiftKey) {
      if (selectedNodes.includes(hitNode)) {
        selectedNodes = selectedNodes.filter(n => n !== hitNode);
      } else {
        selectedNodes.push(hitNode);
      }
      // Keep selectedNode as last clicked for property panel
      selectedNode = hitNode;
    } else {
      // Regular click - clear multi-selection
      selectedNodes = [];
      selectedNode = hitNode;
    }
    
    draggingNode = hitNode;
    selectedEdge = null;
    dragOffset = { x: pos.x - hitNode.x, y: pos.y - hitNode.y };
    updatePropPanel(hitNode);
  } else if (hitEdge) {
    selectedEdge = hitEdge;
    selectedNode = null;
    selectedNodes = [];
    updatePropPanel(null);
  } else {
    // Empty space clicked
    if (e.shiftKey) {
      // Shift+drag on empty space = box selection
      isBoxSelecting = true;
      boxSelectStart = { x: pos.x, y: pos.y };
      boxSelectEnd = { x: pos.x, y: pos.y };
      canvas.style.cursor = 'crosshair';
    } else {
      // Regular click on empty = deselect and start panning
      selectedNode = null;
      selectedNodes = [];
      selectedEdge = null;
      updatePropPanel(null);
      
      // Start canvas panning
      isPanning = true;
      panStart = { x: screenPos.x - panOffset.x, y: screenPos.y - panOffset.y };
      canvas.style.cursor = 'grabbing';
    }
  }
}

function handleMouseMove(e) {
  const pos = getPos(e);
  const screenPos = getScreenPos(e);
  mousePos = pos;
  
  if (isPanning) {
    panOffset.x = screenPos.x - panStart.x;
    panOffset.y = screenPos.y - panStart.y;
    return;
  }
  
  if (isBoxSelecting) {
    boxSelectEnd = { x: pos.x, y: pos.y };
    // Update selected nodes based on box
    const minX = Math.min(boxSelectStart.x, boxSelectEnd.x);
    const maxX = Math.max(boxSelectStart.x, boxSelectEnd.x);
    const minY = Math.min(boxSelectStart.y, boxSelectEnd.y);
    const maxY = Math.max(boxSelectStart.y, boxSelectEnd.y);
    
    selectedNodes = nodes.filter(n => 
      n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY
    );
    return;
  }
  
  if (draggingNode) {
    // Apply attractor-based positioning
    const rawX = pos.x - dragOffset.x;
    const rawY = pos.y - dragOffset.y;
    const snapped = applyAttractors(draggingNode, rawX, rawY);
    draggingNode.x = snapped.x;
    draggingNode.y = snapped.y;
    return;
  }

  if (linkingNode) return;

  // Hover Logic
  const hitNode = nodes.find(n => dist(n, pos) < NODE_RADIUS);
  const nearNode = nodes.find(n => dist(n, pos) < NODE_RADIUS + 30);
  
  let newHoveredNode = null;
  let newIsHoveringHandle = false;

  if (nearNode) {
    newHoveredNode = nearNode;
    // Compute handle position dynamically based on mouse angle from node center
    const dx = pos.x - nearNode.x;
    const dy = pos.y - nearNode.y;
    const handleAngle = Math.atan2(dy, dx);
    const handleDist = HANDLE_OFFSET_X;
    const handlePos = { 
      x: nearNode.x + Math.cos(handleAngle) * handleDist, 
      y: nearNode.y + Math.sin(handleAngle) * handleDist 
    };
    if (dist(pos, handlePos) < HANDLE_RADIUS + 6) {
      newIsHoveringHandle = true;
    }
  }

  hoveredNode = newHoveredNode;
  isHoveringHandle = newIsHoveringHandle;

  // Cursor
  if (isHoveringHandle) {
    canvas.style.cursor = 'crosshair';
  } else if (hitNode) {
    canvas.style.cursor = 'move';
  } else {
    canvas.style.cursor = 'grab';
  }
}

function handleMouseUp(e) {
  const pos = getPos(e);
  
  if (linkingNode) {
    const hitNode = nodes.find(n => dist(n, pos) < NODE_RADIUS);
    if (hitNode && hitNode !== linkingNode) {
      createEdge(linkingNode, hitNode);
    }
    linkingNode = null;
  }
  
  if (isBoxSelecting) {
    isBoxSelecting = false;
    // If nodes were selected, update the property panel
    if (selectedNodes.length > 0) {
      selectedNode = selectedNodes[selectedNodes.length - 1];
      updatePropPanel(selectedNode);
    }
  }
  
  draggingNode = null;
  isPanning = false;
  canvas.style.cursor = 'grab';
}

function handleWheel(e) {
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Calculate zoom
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel * zoomFactor));
  
  if (newZoom !== zoomLevel) {
    // Zoom towards mouse position
    const zoomChange = newZoom / zoomLevel;
    panOffset.x = mouseX - (mouseX - panOffset.x) * zoomChange;
    panOffset.y = mouseY - (mouseY - panOffset.y) * zoomChange;
    zoomLevel = newZoom;
  }
}

function handleContextMenu(e) {
  e.preventDefault();
  const pos = getPos(e);
  contextMenuPos = { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };
  
  const hitNode = nodes.find(n => dist(n, pos) < NODE_RADIUS);
  let hitEdge = null;
  if (!hitNode) {
    hitEdge = edges.find(edge => {
      const n1 = nodes.find(n => n.id === edge.from);
      const n2 = nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) return false;
      return distToSegment(pos, n1, n2) < 10;
    });
  }

  if (hitNode) {
    selectedNode = hitNode;
    selectedEdge = null;
    showContextMenu(e.clientX, e.clientY, 'node');
  } else if (hitEdge) {
    selectedEdge = hitEdge;
    selectedNode = null;
    showContextMenu(e.clientX, e.clientY, 'edge');
  } else {
    // Empty canvas -> show Add menu
    showContextMenu(e.clientX, e.clientY, 'canvas');
  }
}

function showContextMenu(x, y, type) {
  const menu = document.getElementById('context-menu');
  const linkBtn = document.getElementById('ctx-link');
  const groupBtn = document.getElementById('ctx-group');
  const deleteBtn = document.getElementById('ctx-delete');
  const addSubmenu = document.getElementById('ctx-add-submenu');
  
  menu.style.display = 'block';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  
  // Check if there are groupable nodes selected
  const hasGroupableSelection = selectedNodes.length > 0 || 
    (selectedNode && selectedNode.type !== 'source' && selectedNode.type !== 'emitter' && selectedNode.type !== 'tunnel');
  
  if (type === 'canvas') {
    linkBtn.style.display = 'none';
    groupBtn.style.display = hasGroupableSelection ? 'block' : 'none';
    deleteBtn.style.display = 'none';
    addSubmenu.style.display = 'block';
  } else if (type === 'edge') {
    linkBtn.style.display = 'none';
    groupBtn.style.display = 'none';
    deleteBtn.style.display = 'block';
    addSubmenu.style.display = 'none';
  } else {
    linkBtn.style.display = 'block';
    groupBtn.style.display = hasGroupableSelection ? 'block' : 'none';
    deleteBtn.style.display = 'block';
    addSubmenu.style.display = 'none';
  }
}

function hideContextMenu() {
  document.getElementById('context-menu').style.display = 'none';
}

// --- Graph Logic ---

function createNode(type, x, y) {
  const node = {
    id: uid(),
    type,
    x,
    y,
    timer: 0,
    lastTrigger: 0,
    flash: 0,
    heldPackets: [], // For Delay node
    // Default Properties
    props: {
      interval: 2, // beats (Source)
      noteIndex: -1, // -1 = Random, 0-36 = Specific Note (Source)
      prob: 0.5, // 0-1 (Gate, Splitter)
      timbre: 0, // 0-1 (Polariser - legacy, mapped to Q)
      cutoff: 20000, // Hz (Filter)
      shift: 2, // Semitones (Pitch)
      delayTime: 1, // Beats (Delay)
      reverb: 0.3, // 0-1 (Emitter)
      pan: 0, // -1 to 1 (Emitter stereo)
      autoTrigger: true, // Source: auto or manual
      // Polariser / Synth Props
      wave: 'sine', 
      attack: 0.01,
      decay: 0.4
    }
  };
  
  // Initialize specific defaults
  if (type === 'source') {
    node.props.noteIndex = -1; // Random by default
  } else if (type === 'polariser') {
    node.props.wave = 'sawtooth'; // Default to saw for visibility
  } else if (type === 'delay') {
    node.props.delayTime = 1.0;
  } else if (type === 'emitter') {
    node.props.reverb = 0.3;
  } else if (type === 'tunnel') {
    node.props.subNodes = []; // Array of {type, props} for internal nodes
    node.props.tunnelName = 'Custom';
  }
  
  nodes.push(node);
  return node;
}

// Create a tunnel from a template
function createTunnelFromTemplate(templateKey, x, y) {
  const template = TUNNEL_TEMPLATES[templateKey];
  if (!template) return null;
  
  const node = createNode('tunnel', x, y);
  node.props.tunnelName = template.name;
  
  // Create internal sub-nodes from template
  node.props.subNodes = template.nodes.map(type => {
    const subNode = {
      type: type,
      props: { ...getDefaultPropsForType(type) }
    };
    // Apply template defaults if any
    if (template.defaults) {
      if (type === 'pitch' && template.defaults.pitch_shift !== undefined) {
        subNode.props.shift = template.defaults.pitch_shift;
      }
    }
    return subNode;
  });
  
  return node;
}

function getDefaultPropsForType(type) {
  const defaults = {
    pitch: { shift: 0 },
    polariser: { wave: 'sawtooth', attack: 0.01, decay: 0.4 },
    filter: { cutoff: 20000 },
    gate: { prob: 0.5 },
    delay: { delayTime: 1 }
  };
  return defaults[type] || {};
}

// Group selected nodes into a Tunnel
function groupSelectedNodes() {
  if (selectedNodes.length < 1) {
    // If only one node selected via selectedNode
    if (selectedNode && selectedNode.type !== 'source' && selectedNode.type !== 'emitter' && selectedNode.type !== 'tunnel') {
      selectedNodes = [selectedNode];
    } else {
      return; // Nothing to group
    }
  }
  
  // Filter out source, emitter, and existing tunnels - they can't be inside tunnels
  const validNodes = selectedNodes.filter(n => 
    n.type !== 'source' && n.type !== 'emitter' && n.type !== 'tunnel'
  );
  
  if (validNodes.length === 0) return;
  
  // Calculate center position of selected nodes
  const centerX = validNodes.reduce((sum, n) => sum + n.x, 0) / validNodes.length;
  const centerY = validNodes.reduce((sum, n) => sum + n.y, 0) / validNodes.length;
  
  // Create the tunnel node
  const tunnel = createNode('tunnel', centerX, centerY);
  tunnel.props.tunnelName = 'Custom';
  tunnel.props.subNodes = validNodes.map(n => ({
    type: n.type,
    props: { ...n.props }
  }));
  
  // Rewire edges: edges TO selected nodes -> TO tunnel, edges FROM selected nodes -> FROM tunnel
  const validNodeIds = new Set(validNodes.map(n => n.id));
  
  edges.forEach(edge => {
    if (validNodeIds.has(edge.to) && !validNodeIds.has(edge.from)) {
      edge.to = tunnel.id;
    }
    if (validNodeIds.has(edge.from) && !validNodeIds.has(edge.to)) {
      edge.from = tunnel.id;
    }
  });
  
  // Remove internal edges (between selected nodes)
  edges = edges.filter(e => !(validNodeIds.has(e.from) && validNodeIds.has(e.to)));
  
  // Remove duplicate edges to/from tunnel
  const seenEdges = new Set();
  edges = edges.filter(e => {
    const key = `${e.from}-${e.to}`;
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);
    return true;
  });
  
  // Delete the original nodes
  validNodes.forEach(n => {
    nodes = nodes.filter(node => node !== n);
  });
  
  // Clear selection
  selectedNodes = [];
  selectedNode = tunnel;
  updatePropPanel(tunnel);
}

function deleteNode(node) {
  nodes = nodes.filter(n => n !== node);
  edges = edges.filter(e => e.from !== node.id && e.to !== node.id);
  packets = packets.filter(p => edges.find(e => e.id === p.edgeId));
  if (selectedNode === node) {
    selectedNode = null;
    updatePropPanel(null);
  }
  // Also remove from multi-selection
  selectedNodes = selectedNodes.filter(n => n !== node);
}

function deleteEdge(edge) {
  edges = edges.filter(e => e !== edge);
  packets = packets.filter(p => p.edgeId !== edge.id);
  if (selectedEdge === edge) selectedEdge = null;
}

function createEdge(from, to) {
  if (edges.find(e => e.from === from.id && e.to === to.id)) return;
  edges.push({ id: uid(), from: from.id, to: to.id });
}

function spawnPacket(sourceNode) {
  const outgoing = edges.filter(e => e.from === sourceNode.id);
  
  // Determine Note
  let scaleIndex;
  if (sourceNode.props.noteIndex === -1) {
    scaleIndex = Math.floor(Math.random() * SCALE_CHROMATIC.length);
  } else {
    scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, sourceNode.props.noteIndex));
  }
  
  const freq = SCALE_CHROMATIC[scaleIndex];

  outgoing.forEach(edge => {
    packets.push({
      id: uid(),
      edgeId: edge.id,
      t: 0,
      payload: {
        freq: freq,
        scaleIndex: scaleIndex,
        wave: 'sine',
        timbre: 0,
        cutoff: 20000,
        gain: 0.5
      }
    });
  });
}

// --- Simulation Loop ---

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  if (!isRunning) return;
  
  const now = performance.now();
  const dt = 16;
  const msPerBeat = (60 / masterSpeed) * 1000;
  
  // 1. Source Generation
  nodes.forEach(node => {
    if (node.type === 'source' && node.props.autoTrigger !== false) {
      const intervalMs = node.props.interval * msPerBeat;
      if (now - node.lastTrigger > intervalMs) {
        spawnPacket(node);
        node.lastTrigger = now;
        node.flash = 1.0;
      }
    }
    
    // Delay Node Logic
    if (node.type === 'delay' && node.heldPackets && node.heldPackets.length > 0) {
      for (let i = node.heldPackets.length - 1; i >= 0; i--) {
        const hp = node.heldPackets[i];
        if (now >= hp.releaseTime) {
          // Release packet
          const outgoing = edges.filter(e => e.from === node.id);
          outgoing.forEach(edge => {
            packets.push({ id: uid(), edgeId: edge.id, t: 0, payload: hp.payload });
          });
          node.heldPackets.splice(i, 1);
          node.flash = 1.0;
        }
      }
    }

    if (node.flash > 0) node.flash *= 0.9;
  });
  
  // 2. Packet Movement
  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    const edge = edges.find(e => e.id === p.edgeId);
    
    if (!edge) { packets.splice(i, 1); continue; }
    
    const n1 = nodes.find(n => n.id === edge.from);
    const n2 = nodes.find(n => n.id === edge.to);
    
    if (!n1 || !n2) { packets.splice(i, 1); continue; }
    
    const d = dist(n1, n2);
    const steps = Math.max(1, Math.round(d / PIXELS_PER_STEP));
    const totalDuration = steps * (msPerBeat / 1000);
    
    const step = (dt/1000) / totalDuration;
    p.t += step;
    
    if (p.t >= 1.0) {
      processArrival(p, n2);
      packets.splice(i, 1);
    }
  }
}

function processArrival(packet, node) {
  node.flash = 1.0;
  const payload = { ...packet.payload };
  
  switch (node.type) {
    case 'emitter':
      // Pass reverb and pan props from node to playSound
      payload.reverb = node.props.reverb;
      payload.pan = node.props.pan !== undefined ? node.props.pan : 0;
      playSound(payload);
      break;
      
    case 'delay': {
      // Hold packet
      const msPerBeat = (60 / masterSpeed) * 1000;
      const delayMs = (node.props.delayTime || 1) * msPerBeat;
      if (!node.heldPackets) node.heldPackets = [];
      node.heldPackets.push({
        payload: payload,
        releaseTime: performance.now() + delayMs
      });
      return; // Stop propagation until released
    }

    case 'chord': {
      // Spawn 3 packets: Root, +4 (Major 3rd), +7 (Perfect 5th)
      // Or Minor: +3, +7
      // Let's do Major for now
      const offsets = [0, 4, 7];
      const outgoingChord = edges.filter(e => e.from === node.id);
      
      offsets.forEach(semitones => {
        const newIndex = Math.min(SCALE_CHROMATIC.length - 1, payload.scaleIndex + semitones);
        const newFreq = SCALE_CHROMATIC[newIndex];
        const chordPayload = { ...payload, freq: newFreq, scaleIndex: newIndex };
        
        outgoingChord.forEach(edge => {
          packets.push({ id: uid(), edgeId: edge.id, t: 0, payload: chordPayload });
        });
      });
      return; // Handled propagation manually
    }

    case 'filter':
      payload.cutoff = Math.max(100, payload.cutoff * 0.6);
      break;
      
    case 'polariser':
      // Add wave layer (stacks with existing layers)
      if (!payload.waves) {
        payload.waves = [];
      }
      payload.waves.push({
        wave: node.props.wave,
        attack: node.props.attack,
        decay: node.props.decay
      });
      payload.timbre = 0.8; 
      break;
      
    case 'pitch':
      // Shift up in scale (semitones now)
      payload.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, payload.scaleIndex + node.props.shift));
      payload.freq = SCALE_CHROMATIC[payload.scaleIndex];
      break;
      
    case 'gate':
      if (Math.random() > node.props.prob) return;
      break;
      
    case 'tunnel': {
      // Process packet through all internal sub-nodes in sequence
      let currentPayload = payload;
      for (const subNode of (node.props.subNodes || [])) {
        currentPayload = processTunnelSubNode(subNode, currentPayload);
        if (currentPayload === null) return; // Gate blocked
      }
      // Update payload with result
      Object.assign(payload, currentPayload);
      break;
    }
  }
  
  const outgoing = edges.filter(e => e.from === node.id);
  if (outgoing.length === 0) return;
  
  if (node.type === 'splitter') {
    // Splitter logic: Send to ALL outputs
    outgoing.forEach(edge => {
      packets.push({ id: uid(), edgeId: edge.id, t: 0, payload });
    });
  } else {
    outgoing.forEach(edge => {
      packets.push({ id: uid(), edgeId: edge.id, t: 0, payload });
    });
  }
}

// Process a single sub-node inside a tunnel (instant, no travel time)
function processTunnelSubNode(subNode, payload) {
  const result = { ...payload };
  
  switch (subNode.type) {
    case 'pitch':
      result.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, result.scaleIndex + (subNode.props.shift || 0)));
      result.freq = SCALE_CHROMATIC[result.scaleIndex];
      break;
      
    case 'polariser':
      // Stack waves - each polariser adds a layer
      if (!result.waves) {
        result.waves = [];
      }
      result.waves.push({
        wave: subNode.props.wave || 'sine',
        attack: subNode.props.attack || 0.01,
        decay: subNode.props.decay || 0.4
      });
      result.timbre = 0.8;
      break;
      
    case 'filter':
      result.cutoff = Math.max(100, (result.cutoff || 20000) * 0.6);
      break;
      
    case 'gate':
      if (Math.random() > (subNode.props.prob || 0.5)) return null; // Blocked
      break;
      
    case 'splitter':
      // In a tunnel, splitter just passes through (no branching)
      break;
  }
  
  return result;
}

// --- Audio Engine ---

function playSound(params) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  if (isMuted) return; // Skip sound when muted
  
  const t = audioCtx.currentTime;
  const cutoff = params.cutoff || 20000;
  const q = (params.timbre || 0) * 10;
  
  // Stereo Panner (shared)
  const panner = audioCtx.createStereoPanner();
  panner.pan.value = params.pan !== undefined ? params.pan : 0;
  
  // Reverb Send (shared)
  const reverbSend = audioCtx.createGain();
  reverbSend.gain.value = params.reverb !== undefined ? params.reverb : 0.3;
  
  panner.connect(masterGain); // Dry
  panner.connect(reverbSend);
  reverbSend.connect(reverbNode); // Wet
  
  // Determine wave layers
  let layers;
  if (params.waves && params.waves.length > 0) {
    layers = params.waves;
  } else {
    // Fallback to single wave
    layers = [{
      wave: params.wave || 'sine',
      attack: params.attack || 0.01,
      decay: params.decay || 0.4
    }];
  }
  
  // Create oscillator for each layer
  const gainPerLayer = params.gain / layers.length; // Divide gain among layers
  
  layers.forEach((layer, i) => {
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    
    const wave = layer.wave || 'sine';
    const attack = layer.attack || 0.01;
    const decay = layer.decay || 0.4;
    
    osc.type = wave;
    osc.frequency.setValueAtTime(params.freq, t);
    
    // Slight detune for layers (creates richness)
    if (layers.length > 1) {
      osc.detune.value = (i - (layers.length - 1) / 2) * 8; // Spread ±8 cents per layer
    }
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.Q.value = q;
    
    // Envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainPerLayer, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    
    osc.start(t);
    osc.stop(t + attack + decay + 0.1);
  });
}

// --- Rendering ---

function draw() {
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(panOffset.x, panOffset.y);
  ctx.scale(zoomLevel, zoomLevel);
  
  drawGrid();
  
  // Edges
  ctx.lineWidth = 3;
  edges.forEach(e => {
    const n1 = nodes.find(n => n.id === e.from);
    const n2 = nodes.find(n => n.id === e.to);
    if (!n1 || !n2) return;
    
    const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
    grad.addColorStop(0, '#333');
    grad.addColorStop(1, '#555');
    
    if (e === selectedEdge) {
      ctx.strokeStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = grad;
      ctx.shadowBlur = 0;
    }
    
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Ticks
    const d = dist(n1, n2);
    const steps = Math.max(1, Math.round(d / PIXELS_PER_STEP));
    
    ctx.fillStyle = '#444';
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = n1.x + (n2.x - n1.x) * t;
      const ty = n1.y + (n2.y - n1.y) * t;
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI*2);
      ctx.fill();
    }
    
    // Draw subtle arrow chevron near end of edge
    const arrowT = 0.85; // Position along edge (85% = near end)
    const arrowX = n1.x + (n2.x - n1.x) * arrowT;
    const arrowY = n1.y + (n2.y - n1.y) * arrowT;
    const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
    const arrowLen = 6;
    const arrowAngle = 2.5; // ~143 degrees
    
    ctx.strokeStyle = e === selectedEdge ? '#999' : '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(arrowX + Math.cos(angle + arrowAngle) * arrowLen, arrowY + Math.sin(angle + arrowAngle) * arrowLen);
    ctx.lineTo(arrowX, arrowY);
    ctx.lineTo(arrowX + Math.cos(angle - arrowAngle) * arrowLen, arrowY + Math.sin(angle - arrowAngle) * arrowLen);
    ctx.stroke();
  });
  
  // Linking
  if (linkingNode) {
    ctx.strokeStyle = '#bb86fc';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(linkingNode.x, linkingNode.y);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // Packets (with trails)
  packets.forEach(p => {
    const edge = edges.find(e => e.id === p.edgeId);
    if (!edge) return;
    const n1 = nodes.find(n => n.id === edge.from);
    const n2 = nodes.find(n => n.id === edge.to);
    
    const x = n1.x + (n2.x - n1.x) * p.t;
    const y = n1.y + (n2.y - n1.y) * p.t;
    
    // Trail
    ctx.strokeStyle = p.payload.timbre > 0.5 ? 'rgba(224, 86, 253, 0.5)' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const trailX = n1.x + (n2.x - n1.x) * (p.t - 0.05);
    const trailY = n1.y + (n2.y - n1.y) * (p.t - 0.05);
    ctx.lineTo(trailX, trailY);
    ctx.stroke();
    
    // Head
    ctx.fillStyle = p.payload.timbre > 0.5 ? '#e056fd' : '#fff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  
  // Nodes
  nodes.forEach(n => drawNode(n));
  
  // Box selection rectangle
  if (isBoxSelecting) {
    const x = Math.min(boxSelectStart.x, boxSelectEnd.x);
    const y = Math.min(boxSelectStart.y, boxSelectEnd.y);
    const w = Math.abs(boxSelectEnd.x - boxSelectStart.x);
    const h = Math.abs(boxSelectEnd.y - boxSelectStart.y);
    
    ctx.fillStyle = 'rgba(0, 188, 212, 0.1)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#00bcd4';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }
  
  // Tunnel content labels (show sub-nodes when hovering or selected)
  nodes.forEach(n => {
    if (n.type === 'tunnel' && (n === hoveredNode || n === selectedNode)) {
      const subNodes = n.props.subNodes || [];
      if (subNodes.length > 0) {
        const label = subNodes.map(s => s.type.charAt(0).toUpperCase()).join('→');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(n.x - 30, n.y + 28, 60, 18);
        ctx.fillStyle = '#00bcd4';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, n.x, n.y + 37);
      }
    }
  });
  
  ctx.restore(); // End pan transform
}

function drawNode(node) {
  ctx.save();
  ctx.translate(node.x, node.y);
  
  if (node.flash > 0.01) {
    ctx.shadowColor = getNodeColor(node.type);
    ctx.shadowBlur = node.flash * 40;
  }
  
  if (node.type === 'emitter') {
    // Draw Trigger Line (Rectangle)
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(-10, -30, 20, 60);
    
    ctx.strokeStyle = getNodeColor(node.type);
    ctx.lineWidth = (node === selectedNode || selectedNodes.includes(node)) ? 4 : 2;
    ctx.strokeRect(-10, -30, 20, 60);
    
    // Multi-selection indicator
    if (selectedNodes.includes(node)) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(-12, -32, 24, 64);
      ctx.setLineDash([]);
    }
  } else if (node.type === 'tunnel') {
    // Draw Tunnel as rounded rectangle
    const w = 50, h = 40;
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.roundRect(-w/2, -h/2, w, h, 8);
    ctx.fill();
    
    ctx.strokeStyle = getNodeColor(node.type);
    ctx.lineWidth = (node === selectedNode || selectedNodes.includes(node)) ? 4 : 2;
    ctx.stroke();
    
    // Tunnel name label above
    const tunnelName = node.props.tunnelName || 'Tunnel';
    ctx.fillStyle = '#00bcd4';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(tunnelName, 0, -h/2 - 4);
    
    // Multi-selection indicator
    if (selectedNodes.includes(node)) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(-w/2 - 2, -h/2 - 2, w + 4, h + 4, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } else {
    // Draw Circle
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.arc(0, 0, NODE_RADIUS, 0, Math.PI*2);
    ctx.fill();
    
    ctx.strokeStyle = getNodeColor(node.type);
    ctx.lineWidth = (node === selectedNode || selectedNodes.includes(node)) ? 4 : 2;
    ctx.stroke();
    
    // Multi-selection indicator (dashed outer ring)
    if (selectedNodes.includes(node)) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, NODE_RADIUS + 4, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  
  ctx.fillStyle = '#fff';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getNodeIcon(node.type), 0, 0);
  
  // Draw Link Handle (only when hovering)
  if (node === hoveredNode) {
    // Determine handle position based on mouse angle relative to node
    const dx = mousePos.x - node.x;
    const dy = mousePos.y - node.y;
    const handleAngle = Math.atan2(dy, dx);
    const handleDist = HANDLE_OFFSET_X;
    const handleX = Math.cos(handleAngle) * handleDist;
    const handleY = Math.sin(handleAngle) * handleDist;
    
    ctx.beginPath();
    ctx.arc(handleX, handleY, HANDLE_RADIUS, 0, Math.PI*2);
    ctx.fillStyle = isHoveringHandle ? '#fff' : '#666';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.fillText('+', handleX, handleY + 1);
  }

  ctx.restore();
}

function drawGrid() {
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  
  // Calculate grid start positions accounting for pan offset and zoom
  const startX = -panOffset.x / zoomLevel % GRID_SIZE - GRID_SIZE;
  const startY = -panOffset.y / zoomLevel % GRID_SIZE - GRID_SIZE;
  const endX = (canvas.width - panOffset.x) / zoomLevel + GRID_SIZE;
  const endY = (canvas.height - panOffset.y) / zoomLevel + GRID_SIZE;
  
  for (let x = startX; x < endX; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}

// --- Helpers ---

function getNodeColor(type) {
  switch(type) {
    case 'source': return '#03dac6';
    case 'emitter': return '#cf6679';
    case 'filter': return '#3700b3';
    case 'polariser': return '#bb86fc';
    case 'pitch': return '#ffb74d';
    case 'splitter': return '#76ff03';
    case 'gate': return '#607d8b';
    case 'delay': return '#9e9e9e';
    case 'tunnel': return '#00bcd4';
    case 'chord': return '#e91e63';
    default: return '#fff';
  }
}

function getNodeIcon(type) {
  switch(type) {
    case 'source': return '⚡';
    case 'emitter': return '🔊';
    case 'filter': return '🌊';
    case 'polariser': return '🔮';
    case 'pitch': return '🎵';
    case 'splitter': return '🔀';
    case 'gate': return '🚪';
    case 'delay': return '🕒';
    case 'chord': return '🎹';
    case 'tunnel': return '🚇';
    default: return '?';
  }
}

function dist(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function distToSegment(p, v, w) {
  const l2 = dist2(v, w);
  if (l2 == 0) return dist2(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }));
}

function dist2(v, w) {
  return (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
}

function uid() {
  return Math.random().toString(36).substr(2, 9);
}

function updatePropPanel(node) {
  const panel = document.getElementById('prop-content');
  if (!node) {
    panel.innerHTML = 'Select a node...';
    return;
  }

  let html = `
    <div class="prop-row">
      <label>Type</label>
      <span>${node.type.toUpperCase()}</span>
    </div>
    <div class="prop-row">
      <label>ID</label>
      <span>${node.id.substr(0,4)}</span>
    </div>
  `;

  // Dynamic Properties based on Type
  if (node.type === 'source') {
    html += `
      <div class="prop-row">
        <label>Mode</label>
        <select id="prop-autotrigger">
          <option value="true" ${node.props.autoTrigger !== false ? 'selected' : ''}>Auto</option>
          <option value="false" ${node.props.autoTrigger === false ? 'selected' : ''}>Manual (Click)</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Interval (Beats)</label>
        <input type="number" id="prop-interval" value="${node.props.interval}" min="0.5" step="0.5">
      </div>
      <div class="prop-row">
        <label>Note</label>
        <select id="prop-note">
          <option value="-1" ${node.props.noteIndex === -1 ? 'selected' : ''}>Random</option>
          ${NOTE_NAMES.map((n, i) => `<option value="${i}" ${node.props.noteIndex === i ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
      </div>
    `;
  } else if (node.type === 'gate') {
    html += `
      <div class="prop-row">
        <label>Open Prob.</label>
        <input type="number" id="prop-prob" value="${node.props.prob}" min="0" max="1" step="0.1">
      </div>
    `;
  } else if (node.type === 'pitch') {
    html += `
      <div class="prop-row">
        <label>Shift (Semitones)</label>
        <input type="number" id="prop-shift" value="${node.props.shift}" min="-12" max="12" step="1">
      </div>
    `;
  } else if (node.type === 'delay') {
    html += `
      <div class="prop-row">
        <label>Delay (Beats)</label>
        <input type="number" id="prop-delay" value="${node.props.delayTime}" min="0.25" max="8" step="0.25">
      </div>
    `;
  } else if (node.type === 'emitter') {
    html += `
      <div class="prop-row">
        <label>Reverb Send</label>
        <input type="number" id="prop-reverb" value="${node.props.reverb}" min="0" max="1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Pan (L/R)</label>
        <input type="number" id="prop-pan" value="${node.props.pan !== undefined ? node.props.pan : 0}" min="-1" max="1" step="0.1">
      </div>
    `;
  } else if (node.type === 'polariser') {
    html += `
      <div class="prop-row">
        <label>Wave</label>
        <select id="prop-wave">
          <option value="sine" ${node.props.wave === 'sine' ? 'selected' : ''}>Sine</option>
          <option value="square" ${node.props.wave === 'square' ? 'selected' : ''}>Square</option>
          <option value="sawtooth" ${node.props.wave === 'sawtooth' ? 'selected' : ''}>Saw</option>
          <option value="triangle" ${node.props.wave === 'triangle' ? 'selected' : ''}>Tri</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Attack (s)</label>
        <input type="number" id="prop-attack" value="${node.props.attack}" min="0.01" max="2" step="0.01">
      </div>
      <div class="prop-row">
        <label>Decay (s)</label>
        <input type="number" id="prop-decay" value="${node.props.decay}" min="0.1" max="5" step="0.1">
      </div>
      <div class="waveform-preview">
        <canvas id="waveform-canvas" width="190" height="60"></canvas>
      </div>
    `;
  } else if (node.type === 'tunnel') {
    const subNodes = node.props.subNodes || [];
    html += `
      <div class="prop-row">
        <label>Name</label>
        <input type="text" id="prop-tunnel-name" value="${node.props.tunnelName || 'Custom'}" style="width: 100px;">
      </div>
      <div class="prop-row">
        <label>Contains</label>
        <span style="font-size: 11px;">${subNodes.map(s => s.type).join(' → ') || 'Empty'}</span>
      </div>
    `;
    
    // Show properties for each sub-node
    subNodes.forEach((subNode, idx) => {
      html += `<div class="prop-section"><div class="prop-label">${idx + 1}. ${subNode.type.toUpperCase()}</div>`;
      
      if (subNode.type === 'pitch') {
        html += `
          <div class="prop-row">
            <label>Shift</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="shift" value="${subNode.props.shift || 0}" min="-12" max="12" step="1">
          </div>
        `;
      } else if (subNode.type === 'polariser') {
        html += `
          <div class="prop-row">
            <label>Wave</label>
            <select class="tunnel-prop" data-idx="${idx}" data-prop="wave">
              <option value="sine" ${subNode.props.wave === 'sine' ? 'selected' : ''}>Sine</option>
              <option value="square" ${subNode.props.wave === 'square' ? 'selected' : ''}>Square</option>
              <option value="sawtooth" ${subNode.props.wave === 'sawtooth' ? 'selected' : ''}>Saw</option>
              <option value="triangle" ${subNode.props.wave === 'triangle' ? 'selected' : ''}>Tri</option>
            </select>
          </div>
          <div class="prop-row">
            <label>Attack</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="attack" value="${subNode.props.attack || 0.01}" min="0.01" max="2" step="0.01">
          </div>
          <div class="prop-row">
            <label>Decay</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="decay" value="${subNode.props.decay || 0.4}" min="0.1" max="5" step="0.1">
          </div>
        `;
      } else if (subNode.type === 'gate') {
        html += `
          <div class="prop-row">
            <label>Prob</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="prob" value="${subNode.props.prob || 0.5}" min="0" max="1" step="0.1">
          </div>
        `;
      } else if (subNode.type === 'filter') {
        html += `
          <div class="prop-row">
            <label>Cutoff</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="cutoff" value="${subNode.props.cutoff || 20000}" min="100" max="20000" step="100">
          </div>
        `;
      }
      
      html += `</div>`;
    });
  }

  panel.innerHTML = html;

  // Attach Listeners
  const autoTriggerInput = document.getElementById('prop-autotrigger');
  if (autoTriggerInput) autoTriggerInput.addEventListener('change', e => node.props.autoTrigger = e.target.value === 'true');

  const intervalInput = document.getElementById('prop-interval');
  if (intervalInput) intervalInput.addEventListener('change', e => node.props.interval = parseFloat(e.target.value));

  const noteInput = document.getElementById('prop-note');
  if (noteInput) noteInput.addEventListener('change', e => node.props.noteIndex = parseInt(e.target.value));

  const probInput = document.getElementById('prop-prob');
  if (probInput) probInput.addEventListener('change', e => node.props.prob = parseFloat(e.target.value));

  const shiftInput = document.getElementById('prop-shift');
  if (shiftInput) shiftInput.addEventListener('change', e => node.props.shift = parseInt(e.target.value));

  const delayInput = document.getElementById('prop-delay');
  if (delayInput) delayInput.addEventListener('change', e => node.props.delayTime = parseFloat(e.target.value));

  const reverbInput = document.getElementById('prop-reverb');
  if (reverbInput) reverbInput.addEventListener('change', e => node.props.reverb = parseFloat(e.target.value));

  const panInput = document.getElementById('prop-pan');
  if (panInput) panInput.addEventListener('change', e => node.props.pan = parseFloat(e.target.value));

  const waveInput = document.getElementById('prop-wave');
  if (waveInput) {
    waveInput.addEventListener('change', e => {
      node.props.wave = e.target.value;
      drawWaveformPreview(node);
    });
  }

  const attackInput = document.getElementById('prop-attack');
  if (attackInput) {
    attackInput.addEventListener('change', e => {
      node.props.attack = parseFloat(e.target.value);
      drawWaveformPreview(node);
    });
  }

  const decayInput = document.getElementById('prop-decay');
  if (decayInput) {
    decayInput.addEventListener('change', e => {
      node.props.decay = parseFloat(e.target.value);
      drawWaveformPreview(node);
    });
  }
  
  // Tunnel name
  const tunnelNameInput = document.getElementById('prop-tunnel-name');
  if (tunnelNameInput) {
    tunnelNameInput.addEventListener('change', e => {
      node.props.tunnelName = e.target.value;
    });
  }
  
  // Tunnel sub-node properties
  document.querySelectorAll('.tunnel-prop').forEach(input => {
    input.addEventListener('change', e => {
      const idx = parseInt(e.target.dataset.idx);
      const prop = e.target.dataset.prop;
      const subNode = node.props.subNodes[idx];
      if (subNode) {
        if (prop === 'wave') {
          subNode.props[prop] = e.target.value;
        } else {
          subNode.props[prop] = parseFloat(e.target.value);
        }
      }
    });
  });
  
  // Draw initial waveform preview for polariser
  if (node.type === 'polariser') {
    drawWaveformPreview(node);
  }
}

function drawWaveformPreview(node) {
  const canvas = document.getElementById('waveform-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const wave = node.props.wave || 'sine';
  const attack = node.props.attack || 0.01;
  const decay = node.props.decay || 0.4;
  const totalTime = attack + decay;
  
  // Clear
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, w, h);
  
  // Draw grid lines
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h/2);
  ctx.lineTo(w, h/2);
  ctx.stroke();
  
  // Attack/decay boundary
  const attackX = (attack / totalTime) * w;
  ctx.strokeStyle = '#444';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(attackX, 0);
  ctx.lineTo(attackX, h);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw waveform
  ctx.strokeStyle = '#bb86fc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  const cycles = 8; // Number of wave cycles to show
  
  for (let x = 0; x < w; x++) {
    const t = x / w; // 0 to 1
    const timePos = t * totalTime;
    
    // Calculate envelope
    let envelope;
    if (timePos < attack) {
      envelope = timePos / attack; // Attack ramp up
    } else {
      const decayT = (timePos - attack) / decay;
      envelope = Math.exp(-3 * decayT); // Exponential decay
    }
    
    // Calculate wave value
    const phase = (x / w) * cycles * Math.PI * 2;
    let waveVal;
    switch (wave) {
      case 'sine':
        waveVal = Math.sin(phase);
        break;
      case 'square':
        waveVal = Math.sin(phase) > 0 ? 1 : -1;
        break;
      case 'sawtooth':
        waveVal = ((phase % (Math.PI * 2)) / Math.PI) - 1;
        break;
      case 'triangle':
        const p = (phase % (Math.PI * 2)) / (Math.PI * 2);
        waveVal = 4 * Math.abs(p - 0.5) - 1;
        break;
      default:
        waveVal = Math.sin(phase);
    }
    
    // Apply envelope
    const y = h/2 - (waveVal * envelope * (h/2 - 4));
    
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  
  // Labels
  ctx.fillStyle = '#666';
  ctx.font = '9px Arial';
  ctx.fillText('A', 4, 12);
  ctx.fillText('D', attackX + 4, 12);
}

// --- Serialization ---

function saveGraph() {
  const fileName = prompt('Enter file name:', 'composition');
  if (!fileName) return; // User cancelled
  
  const data = {
    version: "1.0",
    bpm: masterSpeed,
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.type,
      x: n.x,
      y: n.y,
      props: n.props
    })),
    edges: edges
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.qbt') ? fileName : fileName + '.qbt';
  a.click();
  URL.revokeObjectURL(url);
}

function loadGraph(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      loadData(data);
    } catch (err) {
      console.error("Failed to load .qbt file", err);
      alert("Invalid file format");
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // Reset input
}

function loadData(data) {
  // Restore
  nodes = data.nodes.map(n => ({
    ...n,
    timer: 0,
    lastTrigger: 0,
    flash: 0,
    heldPackets: [], // Initialize for delay nodes
    // Ensure props exist if loading old version
    props: n.props || { interval: 2, noteIndex: -1, prob: 0.5, shift: 2 }
  }));
  
  edges = data.edges;
  packets = []; // Clear packets on load
  
  // Update speed from example
  if (data.bpm) {
    masterSpeed = data.bpm;
    const speedInput = document.getElementById('speedInput');
    if (speedInput) speedInput.value = masterSpeed;
  }
  
  // Reset UI
  selectedNode = null;
  selectedEdge = null;
  panOffset = { x: 0, y: 0 };
  zoomLevel = 1;
  updatePropPanel(null);
}
