// Level and Palette Generation
import { hslToHex, hexToOklch } from '../common/color-utils.js';
import { computeHarmonyScore } from '../common/harmony.js';

function randomHSL() {
  const h = Math.random() * 360;
  const s = 0.6 + Math.random() * 0.3;
  const l = 0.4 + Math.random() * 0.4;
  return hslToHex(h, s*100, l*100);
}

function generateClash(baseHue) {
  let h = (baseHue + 45 + Math.random()*90) % 360;
  return hslToHex(h, 80, 30 + Math.random()*40);
}

function desaturate(hex) {
  const ok = hexToOklch(hex);
  return hslToHex(ok.h, 30, ok.L * 100); // approx
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function generateLevel(levelNum) {
  const numSwatches = 8 + Math.floor(levelNum / 3);
  const baseHue = Math.random() * 360;
  const schemes = [
    () => [0, 180], // comp
    () => [0, 120, 240], // tri
    () => [-30, 0, 30] // ana
  ];
  const scheme = schemes[Math.floor(Math.random() * schemes.length)];
  const offsets = scheme();
  let target = offsets.map(offset => {
    const h = (baseHue + offset + 360) % 360;
    const s = 65 + Math.random()*25;
    const l = 45 + Math.random()*35;
    return hslToHex(h, s, l);
  });

  let allColors = [...target];
  while (allColors.length < numSwatches) {
    if (Math.random() < 0.4) {
      allColors.push(generateClash(baseHue));
    } else if (Math.random() < 0.5) {
      allColors.push(desaturate(target[Math.floor(Math.random()*target.length)]));
    } else {
      allColors.push(randomHSL());
    }
  }
  
  // Calculate the best possible score by testing combinations
  let maxScore = computeHarmonyScore(target);
  
  // Test a few random 3-color combinations to find the best
  for (let i = 0; i < Math.min(50, allColors.length * allColors.length); i++) {
    const combo = [];
    const indices = new Set();
    while (combo.length < 3) {
      const idx = Math.floor(Math.random() * allColors.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        combo.push(allColors[idx]);
      }
    }
    const score = computeHarmonyScore(combo);
    if (score > maxScore) {
      maxScore = score;
    }
  }
  
  // Set target to 85-90% of the best possible score
  const targetScore = Math.max(50, Math.floor(maxScore * (0.85 - levelNum * 0.002)));
  
  console.log(`Level ${levelNum} - Best possible: ${maxScore}, Target: ${targetScore}`);
  
  return {
    sideColors: shuffle(allColors),
    targetScore: targetScore,
    level: levelNum,
    maxPossible: maxScore
  };
}
