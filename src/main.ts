import './style.css';
import { startGame } from './game';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Root element #app not found');
}

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
app.appendChild(canvas);

startGame(canvas);
