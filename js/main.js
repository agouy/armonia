// Main Entry Point
import { startGame, advanceToNextLevel, showHint, updateArtMode } from './game.js';
import { startSoundscape, backToMenu } from './soundscape.js';

// Expose global functions for onclick handlers
window.startGame = startGame;
window.nextLevel = advanceToNextLevel;
window.advanceToNextLevel = advanceToNextLevel;
window.showHint = showHint;
window.updateArtMode = updateArtMode;
window.startSoundscape = startSoundscape;
window.backToMenu = backToMenu;
