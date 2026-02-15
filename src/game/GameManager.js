import { Tunnel } from '../world/Tunnel.js';
import { Ship } from '../entities/Ship.js';
import { AudioManager } from '../audio/AudioManager.js';

export class Game {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.isRunning = false;

        this.tunnel = new Tunnel(scene);
        this.ship = new Ship(scene, camera);
        this.audio = new AudioManager();

        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('geometryTunnelHighScore')) || 0;

        this.level = 1;
        this.nextLevelScore = 5000; // Increased base requirement

        // UI Elements
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.levelElement = document.getElementById('level-value');
        this.levelPopup = document.getElementById('level-display');

        this.updateUI();
    }

    start() {
        this.isRunning = true;
        this.audio.start();
    }

    update(delta) {
        if (!this.isRunning) return;

        // Get Audio Level
        const audioLevel = this.audio.getAverageFrequency();

        // Update Entities
        this.tunnel.update(delta, audioLevel);
        this.ship.update(delta);

        // Update Score
        this.score += delta * 150;

        // Level Up Logic
        if (this.score > this.nextLevelScore) {
            this.levelUp();
        }

        this.updateUI();

        // Collision detection
        if (this.tunnel.checkCollision(this.ship.getCollisionPacket())) {
            this.gameOver();
        }
    }

    levelUp() {
        this.level++;
        this.nextLevelScore += 5000 * this.level; // Linear increase instead of exponential

        // Intensity Boost - Slower progression
        this.tunnel.speed += 2;
        this.tunnel.spawnInterval = Math.max(0.4, this.tunnel.spawnInterval * 0.9);

        // Audio Boost (Tempo)
        this.audio.tempo += 4; // Smaller tempo jump

        // UI Notification
        this.levelPopup.innerText = `LEVEL ${this.level}`;
        this.levelPopup.classList.remove('hidden');

        // Play sound (using score sound for simplicity)
        this.audio.playScore();

        // Hide popup after animation
        setTimeout(() => {
            this.levelPopup.classList.add('hidden');
        }, 2000);
    }

    updateUI() {
        this.scoreElement.innerText = `SCORE: ${Math.floor(this.score)}`;
        this.highScoreElement.innerText = `HIGH: ${Math.floor(Math.max(this.score, this.highScore))}`;
        this.levelElement.innerText = this.level;
    }

    gameOver() {
        this.isRunning = false;
        this.audio.playCrash();
        setTimeout(() => this.audio.stop(), 500);

        // Save High Score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('geometryTunnelHighScore', Math.floor(this.highScore));
        }

        const startScreen = document.getElementById('start-screen');
        startScreen.classList.remove('hidden');
        startScreen.innerHTML = `
            <h1>GAME OVER</h1>
            <p>LEVEL ${this.level}</p>
            <p>SCORE: ${Math.floor(this.score)}</p>
            <p>HIGH: ${Math.floor(this.highScore)}</p>
            <p class="blink">CLICK TO RESTART</p>
        `;

        const restartHandler = () => {
            startScreen.classList.add('hidden');
            startScreen.removeEventListener('click', restartHandler);
            window.location.reload();
        };

        startScreen.addEventListener('click', restartHandler);
    }
}
