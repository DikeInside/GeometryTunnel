# Geometry Tunnel

A web-based 3D infinite runner game built with **Three.js** and **Vite**. Navigate a spaceship through a pulsating wireframe tunnel, avoid obstacles, and survive as the speed increases!

## Features

*   **Infinite Wireframe Tunnel**: Procedurally generated environment that pulses to the beat.
*   **Dynamic Audio**: Custom audio engine with real-time synthesized drums, bass, and drone. Music tempo increases with game levels.
*   **Progressive Difficulty**:
    *   **Obstacles**: Avoid complex shapes, rotating fans, and walls with gaps.
    *   **Levels**: Gain score to level up. Each level increases speed and intensity.
*   **High Score**: Local storage saves your best runs.
*   **Retro Aesthetic**: High-contrast black and white neon style with post-processing ready.

## Controls

*   **Arrow Keys** or **WASD**: Move Ship (Up, Down, Left, Right)
*   **Click**: Start Game / Restart

## Installation & Development

1.  Clone the repository:
    ```bash
    git clone https://github.com/DikeInside/GeometryTunnel.git
    cd GeometryTunnel
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:5173` in your browser.

## Technologies

*   [Three.js](https://threejs.org/) - 3D Engine
*   [Vite](https://vitejs.dev/) - Build Tool
*   Web Audio API - Sound Synthesis

## License

MIT
