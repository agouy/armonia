// Harmony Score Calculation
import { hexToOklch, hueDiff } from './color-utils.js';

export function computeHarmonyScore(colors) {
  if (colors.length < 2) return 0;
  const oklch = colors.map(hexToOklch);
  const hues = oklch.map(c => c.h);
  const Ls = oklch.map(c => c.L);
  const Cs = oklch.map(c => c.C);
  let score = 0;
  let rulesMatched = 0;

  // Hue differences
  const diffs = [];
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      diffs.push(hueDiff(hues[i], hues[j]));
    }
  }

  // Rules - only award ONE primary harmony type
  let primaryHarmonyFound = false;
  
  // Complementary (highest priority for 2-3 colors)
  if (!primaryHarmonyFound && diffs.some(d => Math.abs(d - 180) <= 20)) {
    score += 35;
    primaryHarmonyFound = true;
    rulesMatched++;
  }
  
  // Triadic (for 3+ colors)
  if (!primaryHarmonyFound && colors.length >= 3 && diffs.some(d => Math.abs(d - 120) <= 25)) {
    score += 40;
    primaryHarmonyFound = true;
    rulesMatched++;
  }
  
  // Split-Complementary (for 3 colors)
  if (!primaryHarmonyFound && colors.length === 3) {
    const sortedDiffs = [...diffs].sort((a,b)=>a-b);
    if (sortedDiffs[0] <= 35 && Math.abs(sortedDiffs[2] - 165) <= 25) {
      score += 32;
      primaryHarmonyFound = true;
      rulesMatched++;
    }
  }
  
  // Tetradic (for 4 colors)
  if (!primaryHarmonyFound && colors.length === 4) {
    if (diffs.some(d => Math.abs(d - 90) <= 25) && diffs.some(d => Math.abs(d - 180) <= 20)) {
      score += 38;
      primaryHarmonyFound = true;
      rulesMatched++;
    }
  }
  
  // Analogous (lowest priority, only if no other harmony)
  if (!primaryHarmonyFound && diffs.some(d => d <= 35)) {
    score += 28;
    primaryHarmonyFound = true;
    rulesMatched++;
  }
  
  // Monochromatic (can combine with others as bonus)
  const hueSpan = Math.max(...hues) - Math.min(...hues);
  if (hueSpan <= 25) {
    score += 25;
    rulesMatched++;
  }
  
  // Lightness contrast bonus
  const Lspan = Math.max(...Ls) - Math.min(...Ls);
  if (Lspan >= 0.45) {
    score += 18;
    rulesMatched++;
  }
  
  // Chroma balance bonus
  const avgC = Cs.reduce((a,b)=>a+b,0) / Cs.length;
  const cVar = Cs.reduce((a,b)=>a + Math.pow(b - avgC,2),0) / Cs.length;
  if (avgC > 0.05 && avgC < 0.2 && cVar > 0.001) {
    score += 15;
    rulesMatched++;
  }
  
  // Even distribution bonus
  if (colors.length === 3) {
    const sortedDiffs = [...diffs].sort((a,b)=>a-b);
    if (Math.abs(sortedDiffs[0] - sortedDiffs[1]) <= 30 && Math.abs(sortedDiffs[1] - sortedDiffs[2]) <= 30) {
      score += 10;
      rulesMatched++;
    }
  }

  // Add small random variation (±5)
  score += (Math.random() * 10) - 5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}
