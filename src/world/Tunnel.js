import * as THREE from 'three';
import { Obstacle } from '../entities/Obstacle.js';

export class Tunnel {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];
        this.obstacles = [];
        this.segmentLength = 5;
        this.numSegments = 20;
        this.speed = 10;
        this.radius = 4;
        this.color = 0xffffff;

        // Difficulty scaling
        this.spawnTimer = 0;
        this.spawnInterval = 1.0; // Seconds between obstacles

        this.init();
    }

    init() {
        // Create initial segments
        for (let i = 0; i < this.numSegments; i++) {
            this.createSegment(i * this.segmentLength);
        }
    }

    createSegment(zPos) {
        // Create a Dodecahedron wireframe
        // Using a cylinder with 5 or 6 radial segments is often better for a "tunnel" feel than a dodecahedron which is round.
        // Let's stick to the "Dodecahedron" request but maybe a "tube" of connected shapes.
        // Actually, a wireframe cylinder with low radial segments (5 for pentagon, 6 for hexagon) works best for a "tunnel".
        // The user asked for a "dodecahedron" tunnel. A dodecahedron is a single solid.
        // Interpretation: A tunnel SHAPED like a dodecahedron (pentagonal cross section?).
        // Let's use a cylinder with 5 radial segments (Pentagonal prism) as it connects better. 6 is Hexagonal.
        // Dodecahedron has 12 faces. It's not a tunnel shape.
        // I will trust 'Dodecahedron' as a stylistic descriptor for "geometric/platonic".
        // I'll make a series of wireframe rings that *look* cool.

        const geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.segmentLength, 5, 1, true); // 5 sides = Pentagonal
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: this.color });
        const segment = new THREE.LineSegments(edges, material);

        segment.position.z = -zPos;
        segment.rotation.x = Math.PI / 2; // Rotate to face camera

        this.scene.add(segment);
        this.segments.push(segment);
    }

    update(delta, audioLevel = 0) {
        // Move segments towards camera
        const moveDist = this.speed * delta;
        this.speed += delta * 0.1; // Slowly increase speed

        // Tunnel Segments Logic
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            segment.position.z += moveDist;

            // React to audio
            const scale = 1 + audioLevel * 0.5;
            segment.scale.set(scale, scale, 1);

            // Pulse color (simple brightness mod)
            if (audioLevel > 0.1) {
                segment.material.color.setHSL(0, 0, 0.5 + audioLevel * 0.5);
            } else {
                segment.material.color.setHex(this.color);
            }

            // Recycle segment if it passes the camera
            if (segment.position.z > this.segmentLength) {
                // Find the furthest segment
                const furthestZ = Math.min(...this.segments.map(s => s.position.z));
                segment.position.z = furthestZ - this.segmentLength;
            }
        }

        // Obstacles Logic
        this.spawnTimer += delta;

        // Adjust spawn rate based on speed
        const currentInterval = Math.max(0.3, this.spawnInterval - (this.speed - 10) * 0.02);

        if (this.spawnTimer > currentInterval) {
            this.spawnTimer = 0;
            // Spawn ahead of the player at z = -100
            // We let Obstacle class decide type based on random for now, 
            // or we can pass a difficulty modifier later.
            this.obstacles.push(new Obstacle(this.scene, 100));
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const ob = this.obstacles[i];
            ob.update(delta, this.speed);

            if (ob.mesh.position.z > 10) { // Passed camera
                ob.remove();
                this.obstacles.splice(i, 1);
            }
        }
    }

    // Check collision with a specific entity packet {x, y, radius}
    checkCollision(entity) {
        for (const ob of this.obstacles) {
            if (ob.checkCollision(entity)) {
                return true;
            }
        }
        return false;
    }
}
