// Main Entry Point
import { startGame, advanceToNextLevel, showHint, updateArtMode } from './palet/game.js';
import { startSoundscape, backToMenu } from './soundscape/soundscape.js';
import { startStokastik } from './stokastik/stokastik.js';

// Expose global functions for onclick handlers
window.startGame = startGame;
window.nextLevel = advanceToNextLevel;
window.advanceToNextLevel = advanceToNextLevel;
window.showHint = showHint;
window.updateArtMode = updateArtMode;
window.startSoundscape = startSoundscape;
window.startStokastik = startStokastik;
window.backToMenu = backToMenu;
