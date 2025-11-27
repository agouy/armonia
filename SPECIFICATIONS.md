# Armonia – Game Specifications  

## Game Modes

### Mode 1: Harmony (Implemented)
Classic color harmony puzzle game

### Mode 2: Coming Soon
Future game mode placeholder

## Mode 1: Harmony

### 1. Game Title  
**Armonia**

### 2. Genre & Platform  
- Casual puzzle / educational game  
- Single-player  
- Web browser (desktop + mobile) – pure HTML5 + JavaScript + CSS  
- Modular architecture with ES6 modules

### 3. Core Concept  

Teach real color theory by letting players discover harmonious palettes through trial and error. The game rewards combinations that follow classic color-harmony rules (complementary, triadic, analogous, split-complementary, etc.) using a perceptually uniform scoring algorithm.

### 4. Objective  
Assemble exactly 3 colors (later levels: 4) in the central drop-zone to reach or exceed the level’s target harmony score.  
Higher levels demand more sophisticated harmonies.

### 5. Game Flow

| Phase              | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| Start Screen       | Modal with title, short rules, “Start Game” button                          |
| Level Start        | 8–14 color swatches appear on the left palette (increases with level)      |
| Gameplay           | Drag any swatch into the 3 (or 4) central slots                             |
| Real-time Scoring  | Harmony score updates instantly after each drop                             |
| Success            | Score ≥ Target → “Next Level” button lights up + success sound              |
| Next Level         | Level counter +1, new palette, higher target score, slots cleared           |
| Endless            | No final level – difficulty scales forever                                  |

### 6. UI Layout (Responsive Flexbox)

```
+------------------------------------------------------------------+
|                         ARMONIA                                  |
+------------------------------------------------------------------+
|  Left      |    Color Space + Drop Zone    |   Right Panel     |
| Palette    |      (2D hue × lightness)     |                   |
| (4-5       |    [Slot] [Slot] [Slot]       | ┌───────────────┐ |
|  colors)   |                                | │ ⭐ ⭐ ⭐      │ |
|            |                                | │ Score: 72     │ |
| vertical   |                                | │ ──────────── │ |
|            |                                | │ Level: 4      │ |
|            |                                | │ Target: 63    │ |
|            |                                | │ [Show Hint]   │ |
|            |                                | │ [Next Level]  │ |
|            |                                | └───────────────┘ |
|            |                                | ┌───────────────┐ |
|            |                                | │  Right        │ |
|            |                                | │  Palette      │ |
|            |                                | │  (4 colors)   │ |
|            |                                | └───────────────┘ |
+------------------------------------------------------------------+
```

**Layout Changes:**
- Score panel and right palette integrated into single right column
- No overlapping elements
- Clean, minimalist dark theme (#0a0a0a background)
- Subtle borders and glass-morphism effects

### 7. Controls  
- Mouse/touch drag & drop (native HTML5 Drag and Drop API)  
- Buttons: Clear Slots, Next Level  
- All interactions work on mobile (touch-drag)

### 8. Scoring System (0–100)

Implemented in perceptually uniform OKLCH color space.

| Rule                        | Max Points | Trigger Condition (tolerance)              |
|--------------------------------|------------|--------------------------------------------|
| Complementary                  | 35         | Any two colors 180° ±20°                   |
| Triadic                        | 40         | Any pair 120° ±25° (3+ colors)             |
| Analogous                      | 28         | Any pair ≤35°                              |
| Split-Complementary            | 32         | One pair ~180°, the other two ~30° from complement |
| Tetradic / Square              | 38         | 90° and 180° pairs present (4 colors)      |
| Monochromatic                  | 25         | All hues within 25°                        |
| Good Lightness Contrast       | 18         | ΔLightness ≥ 0.45                          |
| Balanced Saturation/Chroma     | 15         | Average chroma 0.05–0.20 + variance        |
| Even hue spacing bonus         | 10         | 3-color near-equilateral triangle          |
| Random micro-variation         | ±5         | Keeps perfect 100 rare                     |

Maximum theoretical score ≈ 100. Slight randomness prevents memorization.

### 9. Level Progression

| Level Range | Slots | Swatches on side | Target Score | Added Difficulty |
|-------------|-------|------------------|--------------|------------------|
| 1–5         | 3     | 8–10             | 70–78        | Learn basics     |
| 6–12        | 3     | 10–12            | 80–90        | More distractors |
| 13–25       | 3→4   | 12–14            | 88–96        | Tetradic, split-comp |
| 26+         | 4     | 14–16            | 94+          | Expert territory |

### 10. Palette Generation Rules (per level)

- One hidden “perfect” combination is always present that exceeds the target.
- 30–40 % of swatches are deliberate near-misses or clashing colors.
- Remaining swatches are neutral grays, muted versions, or random colors.
- Colors are generated in HSL → converted to hex, but scored in OKLCH.

### 11. Audio & Feedback

| Event                     | Sound                                      |
|---------------------------|--------------------------------------------|
| Color dropped             | Short ascending beep (pitch ∝ score gain)  |
| Score improves            | Higher beep                                |
| Level complete           | Triumphant 3-note arpeggio                 |
| Level start               | Soft chime                                 |

All sounds generated via Web Audio API – no external files.

### 12. Visual Design

- Pure black background (#0a0a0a) for modern minimalist aesthetic
- Subtle glass-morphism with rgba(255,255,255,0.02) backgrounds
- Thin 1px borders with low opacity for refinement
- 2D color space showing hue (horizontal) × lightness (vertical)
- Small rounded corners (4-6px border-radius)
- Reduced font weights (300) with increased letter spacing
- Minimal, elegant animations with cubic-bezier easing
- Stars integrated into score panel
- No streak counter (removed for cleaner interface)

### 13. Technical Specs

| Item                  | Detail                                      |
|-----------------------|---------------------------------------------|
| Architecture          | Modular ES6 with 8 separate JS files       |
| File structure        | index.html, styles.css, js/ folder          |
| Compatibility         | Chrome 90+, Firefox 88+, Safari 15+, Edge   |
| Mobile                | Fully touch-compatible                      |
| Offline               | Works without internet                      |
| Dependencies          | None (vanilla JS + CSS)                     |
| Color space for scoring | OKLCH (perceptually uniform)                |
| Drag & Drop           | Native HTML5 DnD API                        |
| Modules               | audio, color-utils, harmony, harmony-detector, level-generator, particles, game, main |

### 14. Educational Value

Teaches real-world color theory used by designers:
- Complementary, analogous, triadic, split-complementary, tetradic
- Importance of lightness contrast
- Role of saturation balance
- Why HSL/HSV can be misleading → why OKLCH is superior

### 15. Future Extensions (optional)

- Daily Challenge mode
- Shareable palette URL
- 4-slot and 5-slot advanced modes
- Confetti explosion on level complete
- LocalStorage high-score & streak
- PWA install prompt
- Color-blindness accessibility mode

Ready to ship – one file, zero setup, pure fun + learning.