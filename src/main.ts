import './style.css';
import { startGame } from './game';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Root element #app not found');
}

// Build game container with canvas and UI layer.
const gameContainer = document.createElement('div');
gameContainer.id = 'game-container';

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';

const uiRoot = document.createElement('div');
uiRoot.id = 'ui-root';

gameContainer.appendChild(canvas);
gameContainer.appendChild(uiRoot);
app.appendChild(gameContainer);

startGame(canvas, uiRoot);
