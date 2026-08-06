export const EXAMPLES = {
  "sequential_melody": {
    "version": "1.0",
    "bpm": 120,
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 4, "noteIndex": 12, "prob": 1 } },
      
      // C -> D -> E -> F -> G (Scale Run)
      { "id": "e1", "type": "emitter", "x": 180, "y": 300, "props": { "reverb": 0.3, "pan": -0.5 } },
      { "id": "p1", "type": "pitch", "x": 300, "y": 300, "props": { "shift": 2 } },
      { "id": "e2", "type": "emitter", "x": 420, "y": 300, "props": { "reverb": 0.3, "pan": -0.25 } },
      { "id": "p2", "type": "pitch", "x": 540, "y": 300, "props": { "shift": 2 } },
      { "id": "e3", "type": "emitter", "x": 660, "y": 300, "props": { "reverb": 0.3, "pan": 0 } },
      { "id": "p3", "type": "pitch", "x": 780, "y": 300, "props": { "shift": 1 } },
      { "id": "e4", "type": "emitter", "x": 900, "y": 300, "props": { "reverb": 0.3, "pan": 0.25 } },
      { "id": "p4", "type": "pitch", "x": 1020, "y": 300, "props": { "shift": 2 } },
      { "id": "e5", "type": "emitter", "x": 1140, "y": 300, "props": { "reverb": 0.5, "pan": 0.5 } }
    ],
    "edges": [
      { "id": "e_1", "from": "src", "to": "e1" },
      { "id": "e_2", "from": "e1", "to": "p1" },
      { "id": "e_3", "from": "p1", "to": "e2" },
      { "id": "e_4", "from": "e2", "to": "p2" },
      { "id": "e_5", "from": "p2", "to": "e3" },
      { "id": "e_6", "from": "e3", "to": "p3" },
      { "id": "e_7", "from": "p3", "to": "e4" },
      { "id": "e_8", "from": "e4", "to": "p4" },
      { "id": "e_9", "from": "p4", "to": "e5" }
    ]
  },
  "manual_loop": {
    "version": "1.0",
    "bpm": 100,
    "nodes": [
      // Manual trigger source - click to fire
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 4, "noteIndex": 12, "prob": 1, "autoTrigger": false } },
      
      // First note
      { "id": "e1", "type": "emitter", "x": 180, "y": 300, "props": { "reverb": 0.4, "pan": 0 } },
      
      // Loop back with delay - creates echo/loop
      { "id": "d1", "type": "delay", "x": 300, "y": 200, "props": { "delayTime": 1 } },
      { "id": "gate1", "type": "gate", "x": 420, "y": 200, "props": { "prob": 0.7 } },
      { "id": "p1", "type": "pitch", "x": 540, "y": 200, "props": { "shift": 2 } },
      { "id": "e2", "type": "emitter", "x": 660, "y": 200, "props": { "reverb": 0.5, "pan": -0.3 } },
      
      // Second delay path
      { "id": "d2", "type": "delay", "x": 300, "y": 400, "props": { "delayTime": 2 } },
      { "id": "gate2", "type": "gate", "x": 420, "y": 400, "props": { "prob": 0.6 } },
      { "id": "p2", "type": "pitch", "x": 540, "y": 400, "props": { "shift": 4 } },
      { "id": "e3", "type": "emitter", "x": 660, "y": 400, "props": { "reverb": 0.6, "pan": 0.3 } }
    ],
    "edges": [
      { "id": "e_1", "from": "src", "to": "e1" },
      { "id": "e_2", "from": "e1", "to": "d1" },
      { "id": "e_3", "from": "d1", "to": "gate1" },
      { "id": "e_4", "from": "gate1", "to": "p1" },
      { "id": "e_5", "from": "p1", "to": "e2" },
      { "id": "e_6", "from": "e2", "to": "d1" },
      { "id": "e_7", "from": "e1", "to": "d2" },
      { "id": "e_8", "from": "d2", "to": "gate2" },
      { "id": "e_9", "from": "gate2", "to": "p2" },
      { "id": "e_10", "from": "p2", "to": "e3" },
      { "id": "e_11", "from": "e3", "to": "d2" }
    ]
  },
  "generative_ambient": {
    "version": "1.0",
    "bpm": 60,
    "nodes": [
      // Random note source
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 3, "noteIndex": -1, "prob": 1 } },
      { "id": "split", "type": "splitter", "x": 180, "y": 300, "props": { "prob": 1 } },
      
      // Pad layer (filtered, slow attack)
      { "id": "f1", "type": "filter", "x": 300, "y": 180, "props": { "cutoff": 600 } },
      { "id": "pol1", "type": "polariser", "x": 420, "y": 180, "props": { "wave": "sine", "attack": 1.5, "decay": 3.0 } },
      { "id": "e1", "type": "emitter", "x": 540, "y": 180, "props": { "reverb": 0.9, "pan": -0.6 } },
      
      // Sparkle layer (high octave, short)
      { "id": "g2", "type": "gate", "x": 300, "y": 300, "props": { "prob": 0.4 } },
      { "id": "p2", "type": "pitch", "x": 420, "y": 300, "props": { "shift": 24 } },
      { "id": "pol2", "type": "polariser", "x": 540, "y": 300, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.3 } },
      { "id": "e2", "type": "emitter", "x": 660, "y": 300, "props": { "reverb": 0.8, "pan": 0.6 } },
      
      // Bass layer (low octave, medium)
      { "id": "d3", "type": "delay", "x": 300, "y": 420, "props": { "delayTime": 1.5 } },
      { "id": "p3", "type": "pitch", "x": 420, "y": 420, "props": { "shift": -12 } },
      { "id": "pol3", "type": "polariser", "x": 540, "y": 420, "props": { "wave": "sine", "attack": 0.2, "decay": 1.5 } },
      { "id": "e3", "type": "emitter", "x": 660, "y": 420, "props": { "reverb": 0.3, "pan": 0 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e_1a", "from": "split", "to": "f1" }, { "id": "e_1b", "from": "f1", "to": "pol1" }, { "id": "e_1c", "from": "pol1", "to": "e1" },
      { "id": "e_2a", "from": "split", "to": "g2" }, { "id": "e_2b", "from": "g2", "to": "p2" }, { "id": "e_2c", "from": "p2", "to": "pol2" }, { "id": "e_2d", "from": "pol2", "to": "e2" },
      { "id": "e_3a", "from": "split", "to": "d3" }, { "id": "e_3b", "from": "d3", "to": "p3" }, { "id": "e_3c", "from": "p3", "to": "pol3" }, { "id": "e_3d", "from": "pol3", "to": "e3" }
    ]
  },
  "polyrhythm": {
    "version": "1.0",
    "bpm": 90,
    "nodes": [
      // 4-beat pattern
      { "id": "src4", "type": "source", "x": 60, "y": 180, "props": { "interval": 4, "noteIndex": 12, "prob": 1 } },
      { "id": "pol4", "type": "polariser", "x": 180, "y": 180, "props": { "wave": "sine", "attack": 0.01, "decay": 0.6 } },
      { "id": "e4", "type": "emitter", "x": 300, "y": 180, "props": { "reverb": 0.4, "pan": -0.5 } },
      
      // 3-beat pattern
      { "id": "src3", "type": "source", "x": 60, "y": 300, "props": { "interval": 3, "noteIndex": 19, "prob": 1 } },
      { "id": "pol3", "type": "polariser", "x": 180, "y": 300, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.4 } },
      { "id": "e3", "type": "emitter", "x": 300, "y": 300, "props": { "reverb": 0.4, "pan": 0 } },
      
      // 5-beat pattern
      { "id": "src5", "type": "source", "x": 60, "y": 420, "props": { "interval": 5, "noteIndex": 7, "prob": 1 } },
      { "id": "pol5", "type": "polariser", "x": 180, "y": 420, "props": { "wave": "square", "attack": 0.01, "decay": 0.3 } },
      { "id": "e5", "type": "emitter", "x": 300, "y": 420, "props": { "reverb": 0.4, "pan": 0.5 } }
    ],
    "edges": [
      { "id": "e_4a", "from": "src4", "to": "pol4" }, { "id": "e_4b", "from": "pol4", "to": "e4" },
      { "id": "e_3a", "from": "src3", "to": "pol3" }, { "id": "e_3b", "from": "pol3", "to": "e3" },
      { "id": "e_5a", "from": "src5", "to": "pol5" }, { "id": "e_5b", "from": "pol5", "to": "e5" }
    ]
  },
  "chord_progression": {
    "version": "1.0",
    "bpm": 80,
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 8, "noteIndex": 12, "prob": 1 } },
      { "id": "split", "type": "splitter", "x": 180, "y": 300, "props": { "prob": 1 } },
      
      // C Major (beat 0)
      { "id": "d1", "type": "delay", "x": 300, "y": 180, "props": { "delayTime": 0.1 } },
      { "id": "c1", "type": "chord", "x": 420, "y": 180, "props": { "wave": "sawtooth", "attack": 0.15, "decay": 1.8 } },
      { "id": "e1", "type": "emitter", "x": 540, "y": 180, "props": { "reverb": 0.5, "pan": -0.3 } },
      
      // F Major (beat 2)
      { "id": "d2", "type": "delay", "x": 300, "y": 300, "props": { "delayTime": 2 } },
      { "id": "p2", "type": "pitch", "x": 360, "y": 300, "props": { "shift": 5 } },
      { "id": "c2", "type": "chord", "x": 420, "y": 300, "props": { "wave": "sawtooth", "attack": 0.15, "decay": 1.8 } },
      { "id": "e2", "type": "emitter", "x": 540, "y": 300, "props": { "reverb": 0.5, "pan": 0 } },
      
      // G Major (beat 4)
      { "id": "d3", "type": "delay", "x": 300, "y": 420, "props": { "delayTime": 4 } },
      { "id": "p3", "type": "pitch", "x": 360, "y": 420, "props": { "shift": 7 } },
      { "id": "c3", "type": "chord", "x": 420, "y": 420, "props": { "wave": "sawtooth", "attack": 0.15, "decay": 1.8 } },
      { "id": "e3", "type": "emitter", "x": 540, "y": 420, "props": { "reverb": 0.5, "pan": 0.3 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e_1a", "from": "split", "to": "d1" }, { "id": "e_1b", "from": "d1", "to": "c1" }, { "id": "e_1c", "from": "c1", "to": "e1" },
      { "id": "e_2a", "from": "split", "to": "d2" }, { "id": "e_2b", "from": "d2", "to": "p2" }, { "id": "e_2c", "from": "p2", "to": "c2" }, { "id": "e_2d", "from": "c2", "to": "e2" },
      { "id": "e_3a", "from": "split", "to": "d3" }, { "id": "e_3b", "from": "d3", "to": "p3" }, { "id": "e_3c", "from": "p3", "to": "c3" }, { "id": "e_3d", "from": "c3", "to": "e3" }
    ]
  },
  "drum_pattern": {
    "version": "1.0",
    "bpm": 110,
    "nodes": [
      // Kick (every 2 beats)
      { "id": "kick_src", "type": "source", "x": 60, "y": 180, "props": { "interval": 2, "noteIndex": 0 } },
      { "id": "kick_pol", "type": "polariser", "x": 180, "y": 180, "props": { "wave": "sine", "attack": 0.01, "decay": 0.25 } },
      { "id": "kick_p", "type": "pitch", "x": 300, "y": 180, "props": { "shift": -12 } },
      { "id": "kick_out", "type": "emitter", "x": 420, "y": 180, "props": { "reverb": 0.1, "pan": 0 } },
      
      // Snare (offset by 1 beat)
      { "id": "snare_src", "type": "source", "x": 60, "y": 300, "props": { "interval": 2, "noteIndex": 0 } },
      { "id": "snare_del", "type": "delay", "x": 140, "y": 300, "props": { "delayTime": 1 } },
      { "id": "snare_pol", "type": "polariser", "x": 220, "y": 300, "props": { "wave": "sawtooth", "attack": 0.01, "decay": 0.12 } },
      { "id": "snare_p", "type": "pitch", "x": 300, "y": 300, "props": { "shift": 12 } },
      { "id": "snare_out", "type": "emitter", "x": 420, "y": 300, "props": { "reverb": 0.35, "pan": 0.1 } },
      
      // Hi-hats (every half beat with probability)
      { "id": "hh_src", "type": "source", "x": 60, "y": 420, "props": { "interval": 0.5, "noteIndex": 0 } },
      { "id": "hh_gate", "type": "gate", "x": 140, "y": 420, "props": { "prob": 0.75 } },
      { "id": "hh_pol", "type": "polariser", "x": 220, "y": 420, "props": { "wave": "square", "attack": 0.005, "decay": 0.04 } },
      { "id": "hh_p", "type": "pitch", "x": 300, "y": 420, "props": { "shift": 30 } },
      { "id": "hh_out", "type": "emitter", "x": 420, "y": 420, "props": { "reverb": 0.15, "pan": 0.4 } }
    ],
    "edges": [
      { "id": "e_k1", "from": "kick_src", "to": "kick_pol" }, { "id": "e_k2", "from": "kick_pol", "to": "kick_p" }, { "id": "e_k3", "from": "kick_p", "to": "kick_out" },
      { "id": "e_s1", "from": "snare_src", "to": "snare_del" }, { "id": "e_s2", "from": "snare_del", "to": "snare_pol" }, { "id": "e_s3", "from": "snare_pol", "to": "snare_p" }, { "id": "e_s4", "from": "snare_p", "to": "snare_out" },
      { "id": "e_h1", "from": "hh_src", "to": "hh_gate" }, { "id": "e_h2", "from": "hh_gate", "to": "hh_pol" }, { "id": "e_h3", "from": "hh_pol", "to": "hh_p" }, { "id": "e_h4", "from": "hh_p", "to": "hh_out" }
    ]
  },
  "arpeggio": {
    "version": "1.0",
    "bpm": 140,
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 2, "noteIndex": 12, "prob": 1 } },
      { "id": "split", "type": "splitter", "x": 180, "y": 300, "props": { "prob": 1 } },
      
      // Root (immediate)
      { "id": "d0", "type": "delay", "x": 300, "y": 120, "props": { "delayTime": 0.1 } },
      { "id": "e0", "type": "emitter", "x": 420, "y": 120, "props": { "reverb": 0.4, "pan": -0.6 } },
      
      // +3 (minor 3rd, 0.25 beat)
      { "id": "d1", "type": "delay", "x": 300, "y": 210, "props": { "delayTime": 0.25 } },
      { "id": "p1", "type": "pitch", "x": 360, "y": 210, "props": { "shift": 3 } },
      { "id": "e1", "type": "emitter", "x": 420, "y": 210, "props": { "reverb": 0.4, "pan": -0.3 } },
      
      // +7 (perfect 5th, 0.5 beat)
      { "id": "d2", "type": "delay", "x": 300, "y": 300, "props": { "delayTime": 0.5 } },
      { "id": "p2", "type": "pitch", "x": 360, "y": 300, "props": { "shift": 7 } },
      { "id": "e2", "type": "emitter", "x": 420, "y": 300, "props": { "reverb": 0.4, "pan": 0 } },
      
      // +10 (minor 7th, 0.75 beat)
      { "id": "d3", "type": "delay", "x": 300, "y": 390, "props": { "delayTime": 0.75 } },
      { "id": "p3", "type": "pitch", "x": 360, "y": 390, "props": { "shift": 10 } },
      { "id": "e3", "type": "emitter", "x": 420, "y": 390, "props": { "reverb": 0.4, "pan": 0.3 } },
      
      // +12 (octave, 1 beat)
      { "id": "d4", "type": "delay", "x": 300, "y": 480, "props": { "delayTime": 1.0 } },
      { "id": "p4", "type": "pitch", "x": 360, "y": 480, "props": { "shift": 12 } },
      { "id": "e4", "type": "emitter", "x": 420, "y": 480, "props": { "reverb": 0.5, "pan": 0.6 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e_0a", "from": "split", "to": "d0" }, { "id": "e_0b", "from": "d0", "to": "e0" },
      { "id": "e_1a", "from": "split", "to": "d1" }, { "id": "e_1b", "from": "d1", "to": "p1" }, { "id": "e_1c", "from": "p1", "to": "e1" },
      { "id": "e_2a", "from": "split", "to": "d2" }, { "id": "e_2b", "from": "d2", "to": "p2" }, { "id": "e_2c", "from": "p2", "to": "e2" },
      { "id": "e_3a", "from": "split", "to": "d3" }, { "id": "e_3b", "from": "d3", "to": "p3" }, { "id": "e_3c", "from": "p3", "to": "e3" },
      { "id": "e_4a", "from": "split", "to": "d4" }, { "id": "e_4b", "from": "d4", "to": "p4" }, { "id": "e_4c", "from": "p4", "to": "e4" }
    ]
  },
  "layered_pad": {
    "version": "1.0",
    "bpm": 60,
    "nodes": [
      // Slow source for pad
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 6, "noteIndex": 12 } },
      
      // Tunnel with stacked polarisers for rich pad sound
      { "id": "pad", "type": "tunnel", "x": 200, "y": 300, "props": { 
        "tunnelName": "Pad",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.8, "decay": 3.0 } },
          { "type": "polariser", "props": { "wave": "triangle", "attack": 1.2, "decay": 2.5 } },
          { "type": "polariser", "props": { "wave": "sawtooth", "attack": 0.5, "decay": 2.0 } }
        ]
      }},
      { "id": "out", "type": "emitter", "x": 340, "y": 300, "props": { "reverb": 0.8, "pan": 0 } },
      
      // High sparkle layer
      { "id": "split", "type": "splitter", "x": 200, "y": 180, "props": {} },
      { "id": "p_hi", "type": "pitch", "x": 280, "y": 180, "props": { "shift": 12 } },
      { "id": "sparkle", "type": "tunnel", "x": 380, "y": 180, "props": {
        "tunnelName": "Sparkle",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "triangle", "attack": 0.01, "decay": 0.4 } }
        ]
      }},
      { "id": "out_hi", "type": "emitter", "x": 500, "y": 180, "props": { "reverb": 0.9, "pan": 0.4 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "pad" },
      { "id": "e2", "from": "pad", "to": "out" },
      { "id": "e3", "from": "src", "to": "split" },
      { "id": "e4", "from": "split", "to": "p_hi" },
      { "id": "e5", "from": "p_hi", "to": "sparkle" },
      { "id": "e6", "from": "sparkle", "to": "out_hi" }
    ]
  },
  "synth_bass": {
    "version": "1.0",
    "bpm": 100,
    "nodes": [
      // Bass pattern
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 1, "noteIndex": 0 } },
      { "id": "gate", "type": "gate", "x": 160, "y": 300, "props": { "prob": 0.6 } },
      
      // Fat bass tunnel (stacked saws + sub sine)
      { "id": "bass", "type": "tunnel", "x": 280, "y": 300, "props": {
        "tunnelName": "FatBass",
        "subNodes": [
          { "type": "pitch", "props": { "shift": -12 } },
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.01, "decay": 0.3 } },
          { "type": "polariser", "props": { "wave": "sawtooth", "attack": 0.02, "decay": 0.25 } },
          { "type": "polariser", "props": { "wave": "square", "attack": 0.01, "decay": 0.2 } }
        ]
      }},
      { "id": "out", "type": "emitter", "x": 420, "y": 300, "props": { "reverb": 0.15, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "gate" },
      { "id": "e2", "from": "gate", "to": "bass" },
      { "id": "e3", "from": "bass", "to": "out" }
    ]
  },
  "organ": {
    "version": "1.0",
    "bpm": 80,
    "nodes": [
      // Organ chord
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 4, "noteIndex": 12 } },
      { "id": "chord", "type": "chord", "x": 180, "y": 300, "props": {} },
      
      // Organ sound (layered sines at different octaves simulated via attack/decay)
      { "id": "organ", "type": "tunnel", "x": 320, "y": 300, "props": {
        "tunnelName": "Organ",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.05, "decay": 1.5 } },
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.08, "decay": 1.2 } },
          { "type": "polariser", "props": { "wave": "triangle", "attack": 0.1, "decay": 1.0 } }
        ]
      }},
      { "id": "out", "type": "emitter", "x": 460, "y": 300, "props": { "reverb": 0.6, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "chord" },
      { "id": "e2", "from": "chord", "to": "organ" },
      { "id": "e3", "from": "organ", "to": "out" }
    ]
  },
  "pluck_strings": {
    "version": "1.0", 
    "bpm": 120,
    "nodes": [
      // Arpeggio source
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 0.5, "noteIndex": -1 } },
      
      // Pluck sound (sharp attack, multiple decaying waves)
      { "id": "pluck", "type": "tunnel", "x": 200, "y": 300, "props": {
        "tunnelName": "Pluck",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "triangle", "attack": 0.005, "decay": 0.8 } },
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.01, "decay": 1.2 } }
        ]
      }},
      { "id": "out", "type": "emitter", "x": 340, "y": 300, "props": { "reverb": 0.5, "pan": 0 } },
      
      // Delayed echo with pitch shift
      { "id": "delay", "type": "delay", "x": 200, "y": 180, "props": { "delayTime": 0.75 } },
      { "id": "pitch", "type": "pitch", "x": 280, "y": 180, "props": { "shift": 12 } },
      { "id": "pluck2", "type": "tunnel", "x": 380, "y": 180, "props": {
        "tunnelName": "Pluck",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "triangle", "attack": 0.005, "decay": 0.6 } }
        ]
      }},
      { "id": "out2", "type": "emitter", "x": 500, "y": 180, "props": { "reverb": 0.7, "pan": 0.5 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "pluck" },
      { "id": "e2", "from": "pluck", "to": "out" },
      { "id": "e3", "from": "src", "to": "delay" },
      { "id": "e4", "from": "delay", "to": "pitch" },
      { "id": "e5", "from": "pitch", "to": "pluck2" },
      { "id": "e6", "from": "pluck2", "to": "out2" }
    ]
  }
};
