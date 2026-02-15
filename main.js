import * as THREE from 'three';
import { Tunnel } from './src/world/Tunnel.js';
import { Ship } from './src/entities/Ship.js';
import { Game } from './src/game/GameManager.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02); // Distance fog for the "endless" look

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('canvas-container').appendChild(renderer.domElement);

// --- Game Logic ---
const game = new Game(scene, camera);

// --- Resize Handler ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    
    if (game.isRunning) {
        game.update(delta);
    }

    renderer.render(scene, camera);
}

// --- Start Interaction ---
const startScreen = document.getElementById('start-screen');
startScreen.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    game.start();
});

animate();
