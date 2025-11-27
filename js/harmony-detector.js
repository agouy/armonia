// Harmony Type Detection
import { hexToOklch, hueDiff } from './color-utils.js';

export function detectHarmonyType(colors) {
  if (colors.length < 2) return null;
  
  const oklch = colors.map(hexToOklch);
  const hues = oklch.map(c => c.h);
  const Ls = oklch.map(c => c.L);
  
  // Calculate hue differences
  const diffs = [];
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      diffs.push(hueDiff(hues[i], hues[j]));
    }
  }
  
  const hueSpan = Math.max(...hues) - Math.min(...hues);
  const Lspan = Math.max(...Ls) - Math.min(...Ls);
  
  // Detect harmony types (in priority order)
  const harmonies = [];
  
  // Complementary
  if (diffs.some(d => Math.abs(d - 180) <= 20)) {
    harmonies.push({ 
      type: 'complementary', 
      name: 'Complementary',
      emoji: '🎭',
      description: 'Opposite colors create vibrant contrast!',
      points: 35
    });
  }
  
  // Triadic
  if (colors.length >= 3 && diffs.some(d => Math.abs(d - 120) <= 25)) {
    harmonies.push({ 
      type: 'triadic', 
      name: 'Triadic',
      emoji: '🔺',
      description: 'Three colors equally spaced = perfect balance!',
      points: 40
    });
  }
  
  // Split-Complementary
  if (colors.length === 3) {
    const sortedDiffs = [...diffs].sort((a,b)=>a-b);
    if (sortedDiffs[0] <= 35 && Math.abs(sortedDiffs[2] - 165) <= 25) {
      harmonies.push({ 
        type: 'split-complementary', 
        name: 'Split-Complementary',
        emoji: '✨',
        description: 'Sophisticated variation of complementary!',
        points: 32
      });
    }
  }
  
  // Tetradic
  if (colors.length === 4 && diffs.some(d => Math.abs(d - 90) <= 25) && diffs.some(d => Math.abs(d - 180) <= 20)) {
    harmonies.push({ 
      type: 'tetradic', 
      name: 'Tetradic',
      emoji: '⬜',
      description: 'Four-color harmony for the masters!',
      points: 38
    });
  }
  
  // Analogous
  if (diffs.some(d => d <= 35)) {
    harmonies.push({ 
      type: 'analogous', 
      name: 'Analogous',
      emoji: '🌈',
      description: 'Neighbors on the wheel create harmony!',
      points: 28
    });
  }
  
  // Monochromatic
  if (hueSpan <= 25) {
    harmonies.push({ 
      type: 'monochromatic', 
      name: 'Monochromatic',
      emoji: '🎨',
      description: 'Single hue with varied tones!',
      points: 25
    });
  }
  
  // High Contrast
  if (Lspan >= 0.45) {
    harmonies.push({ 
      type: 'high-contrast', 
      name: 'High Contrast',
      emoji: '⚡',
      description: 'Bold lightness difference!',
      points: 18
    });
  }
  
  return harmonies.length > 0 ? harmonies : null;
}
