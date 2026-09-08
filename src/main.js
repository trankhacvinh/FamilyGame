import './styles.css';
import { GameApp } from './core/GameApp.js';

const canvas = document.querySelector('#game-canvas');
const uiRoot = document.querySelector('#ui-layer');

const app = new GameApp({ canvas, uiRoot });
app.start();

window.addEventListener('beforeunload', () => app.dispose(), { once: true });
