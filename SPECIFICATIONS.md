# Armonia – Game Specifications  

## Game Modes

### Mode 1: Harmony (Implemented)
Classic color harmony puzzle game with generative art background

### Mode 2: Soundscape (Implemented)
Audio-visual harmony explorer with color-to-sound mapping

---

## Mode 1: Harmony

### 1. Game Title  
**Armonia**

### 2. Genre & Platform  
- Casual puzzle / educational game  
- Single-player  
- Web browser (desktop + mobile) – pure HTML5 + JavaScript + CSS  
- Modular architecture with ES6 modules
- Full touch support for mobile devices

### 3. Core Concept  

Teach real color theory by letting players discover harmonious palettes through trial and error. The game rewards combinations that follow classic color-harmony rules (complementary, triadic, analogous, split-complementary, etc.) using a perceptually uniform scoring algorithm.

### 4. Objective  
Assemble exactly 3 colors (later levels: 4) in the central drop-zone to reach or exceed the level's target harmony score.  
Higher levels demand more sophisticated harmonies.

### 5. Game Flow

| Phase              | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| Start Screen       | Modal with title, short rules, mode selection buttons                       |
| Level Start        | 8–14 color swatches appear in the palette (increases with level)           |
| Gameplay           | Drag any swatch into the 3 (or 4) central slots                             |
| Real-time Scoring  | Harmony score updates instantly after each drop                             |
| Art Generation     | Generative art background updates with placed colors                        |
| Success            | Score ≥ Target → "Next Level" button lights up + success sound              |
| Next Level         | Level counter +1, new palette, higher target score, slots cleared           |
| Endless            | No final level – difficulty scales forever                                  |

### 6. UI Layout

#### Desktop Layout
```
+------------------------------------------------------------------+
| [← Menu] [Art Mode ▼]           ARMONIA                          |
+------------------------------------------------------------------+
|                    (Generative Art Background)                   |
|  Left      |    Drop Zone (3 slots)        |   Right Panel     |
| Palette    |    [Slot] [Slot] [Slot]       | ┌───────────────┐ |
| (4-5       |                                | │ ⭐ ⭐ ⭐      │ |
|  colors)   |                                | │ Score: 72     │ |
|            |                                | │ Level: 4      │ |
| vertical   |                                | │ Target: 63    │ |
|            |                                | │ [Show Hint]   │ |
|            |                                | │ [Next Level]  │ |
|            |                                | └───────────────┘ |
|            |                                | ┌───────────────┐ |
|            |                                | │  Color Wheel  │ |
|            |                                | └───────────────┘ |
+------------------------------------------------------------------+
```

#### Mobile Layout (< 768px)
```
+--------------------------------+
| [←] ARMONIA        [Art Mode ▼]|
+--------------------------------+
|   (Generative Art Background)  |
|   [Slot] [Slot] [Slot]         |
+--------------------------------+
| ⭐⭐⭐  Score: 72  Lvl: 4      |
| [Hint] [Next]         [Wheel]  |
+--------------------------------+
| [Color] [Color] [Color] [...]  |
|    (Horizontal scroll)         |
+--------------------------------+
```

**Layout Features:**
- Generative art canvas as full-screen background (40% opacity)
- Art mode selector in top-left corner (next to back button)
- Score panel and color wheel in right column (desktop) or compact row (mobile)
- Horizontal scrollable palette on mobile
- Clean, minimalist dark theme (#0a0a0a background)
- Subtle borders and glass-morphism effects

### 7. Generative Art Modes

| Mode          | Description                                           |
|---------------|-------------------------------------------------------|
| Pixel Drift   | Scattered rectangular pixels with slight rotation     |
| Gradient Blend| Smooth vertical gradient using colors in sequence     |
| Strata        | Horizontal geological-like layers with organic edges  |
| Weave         | Interlocking curved horizontal and vertical bands     |
| Flow Field    | Curved lines following noise-based vector field       |
| Constellation | Connected dots forming networks                       |
| Ripples       | Concentric circles from random points                 |

### 8. Controls  

#### Desktop
- Mouse drag & drop (native HTML5 Drag and Drop API)  
- Drag colors from palette to slots
- Drag colors out of slots to remove them
- Click buttons for hints and navigation

#### Mobile
- Touch drag & drop with visual feedback
- Touch and hold to pick up a color
- Drag to slot and release to place
- Drag out of slot to remove
- Horizontal swipe to scroll palette

### 9. Scoring System (0–100)

Implemented in perceptually uniform OKLCH color space.

| Rule                        | Max Points | Trigger Condition (tolerance)              |
|--------------------------------|------------|--------------------------------------------|
| Complementary                  | 35         | Any two colors 180° ±20°                   |
| Triadic                        | 40         | Any pair 120° ±25° (3+ colors)             |
| Analogous                      | 28         | Any pair ≤35°                              |
| Split-Complementary            | 32         | One pair ~180°, the other two ~30° from complement |
| Tetradic / Square              | 38         | 90° and 180° pairs present (4 colors)      |
| Monochromatic                  | 50         | All hues within 25° (same color family)    |
| Good Lightness Contrast       | 18         | ΔLightness ≥ 0.45                          |
| Balanced Saturation/Chroma     | 15         | Average chroma 0.05–0.20 + variance        |
| Even hue spacing bonus         | 10         | 3-color near-equilateral triangle          |
| Random micro-variation         | ±5         | Keeps perfect 100 rare                     |

Maximum theoretical score ≈ 100. Slight randomness prevents memorization.

### 10. Level Progression

| Level Range | Slots | Swatches on side | Target Score | Added Difficulty |
|-------------|-------|------------------|--------------|------------------|
| 1–5         | 3     | 8–10             | 70–78        | Learn basics     |
| 6–12        | 3     | 10–12            | 80–90        | More distractors |
| 13–25       | 3→4   | 12–14            | 88–96        | Tetradic, split-comp |
| 26+         | 4     | 14–16            | 94+          | Expert territory |

### 11. Palette Generation Rules (per level)

- One hidden "perfect" combination is always present that exceeds the target.
- 30–40 % of swatches are deliberate near-misses or clashing colors.
- Remaining swatches are neutral grays, muted versions, or random colors.
- Colors are generated in HSL → converted to hex, but scored in OKLCH.

### 12. Audio & Feedback

| Event                     | Sound                                      |
|---------------------------|--------------------------------------------|
| Color dropped             | Short ascending beep (pitch ∝ score gain)  |
| Score improves            | Higher beep                                |
| Level complete           | Triumphant 3-note arpeggio                 |
| Level start               | Soft chime                                 |

All sounds generated via Web Audio API – no external files.

### 13. Visual Design

- Pure black background (#0a0a0a) for modern minimalist aesthetic
- Generative art as full-screen background with 40% opacity
- Subtle glass-morphism with rgba(255,255,255,0.02) backgrounds
- Thin 1px borders with low opacity for refinement
- Color wheel visualization showing placed colors
- Small rounded corners (4-6px border-radius)
- Reduced font weights (300) with increased letter spacing
- Minimal, elegant animations with cubic-bezier easing
- Stars integrated into score panel

---

## Mode 2: Soundscape

### 1. Concept
An audio-visual harmony explorer where colors map to sounds. Users manipulate three color voices and hear how their harmonic relationships translate to audio.

### 2. Features
- Three color orbs with hue sliders
- Real-time harmony detection and scoring
- Oscillator-based sound synthesis (one voice per color)
- Visual canvas showing color relationships
- Harmony meter showing dissonance to harmony spectrum

### 3. Color-to-Sound Mapping
- Hue → Frequency (mapped to musical scale)
- Saturation → Volume
- Lightness → Timbre/waveform

### 4. Mobile Layout
- Compact orbs and sliders
- Responsive canvas
- Touch-friendly controls

---

## Technical Specs

| Item                  | Detail                                      |
|-----------------------|---------------------------------------------|
| Architecture          | Modular ES6 with 9 separate JS files       |
| File structure        | index.html, styles.css, js/ folder          |
| Compatibility         | Chrome 90+, Firefox 88+, Safari 15+, Edge   |
| Mobile                | Fully touch-compatible with custom handlers |
| Offline               | Works without internet                      |
| Dependencies          | None (vanilla JS + CSS)                     |
| Color space for scoring | OKLCH (perceptually uniform)                |
| Drag & Drop           | Native HTML5 DnD API + Touch events         |
| Audio                 | Web Audio API                               |
| Modules               | audio, color-utils, harmony, harmony-detector, level-generator, particles, game, soundscape, main |

## Educational Value

Teaches real-world color theory used by designers:
- Complementary, analogous, triadic, split-complementary, tetradic, monochromatic
- Importance of lightness contrast
- Role of saturation balance
- Why HSL/HSV can be misleading → why OKLCH is superior
- Audio-visual synesthesia through Mode 2

## Future Extensions (optional)

- Daily Challenge mode
- Shareable palette URL
- 4-slot and 5-slot advanced modes
- Confetti explosion on level complete
- LocalStorage high-score & streak
- PWA install prompt
- Color-blindness accessibility mode

Ready to ship – zero dependencies, pure fun + learning.
