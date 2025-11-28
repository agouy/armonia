// Main Entry Point
import { startGame, advanceToNextLevel, showHint, updateArtMode } from './game.js';

// Expose global functions for onclick handlers
window.startGame = startGame;
window.nextLevel = advanceToNextLevel;
window.showHint = showHint;
window.updateArtMode = updateArtMode;
