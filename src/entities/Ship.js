import * as THREE from 'three';

export class Ship {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.velocity = new THREE.Vector2();
        this.position = new THREE.Vector2();
        this.speed = 15;
        this.friction = 5.0;
        this.maxBounds = 3.5; // Tunnel radius constraint

        this.init();
    }

    init() {
        // Simple dart shape
        const geometry = new THREE.ConeGeometry(0.5, 1.5, 3); // 3 sides = pyramid
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x00ffff }); // Cyan ship
        this.mesh = new THREE.LineSegments(edges, material);

        this.mesh.rotation.x = -Math.PI / 2; // Point away from camera
        this.mesh.position.z = 2; // Slightly in front of camera

        this.scene.add(this.mesh);

        // Input handling
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            a: false,
            s: false,
            d: false
        };

        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
    }

    update(delta) {
        // Input Vector
        const input = new THREE.Vector2();
        if (this.keys.ArrowUp || this.keys.w) input.y += 1;
        if (this.keys.ArrowDown || this.keys.s) input.y -= 1;
        if (this.keys.ArrowLeft || this.keys.a) input.x -= 1;
        if (this.keys.ArrowRight || this.keys.d) input.x += 1;

        // Acceleration
        if (input.length() > 0) {
            input.normalize().multiplyScalar(this.speed * delta);
            this.velocity.add(input);
        }

        // Friction
        this.velocity.x -= this.velocity.x * this.friction * delta;
        this.velocity.y -= this.velocity.y * this.friction * delta;

        // Apply movement
        this.position.add(this.velocity.clone().multiplyScalar(delta));

        // Bounds clamping
        if (this.position.length() > this.maxBounds) {
            this.position.normalize().multiplyScalar(this.maxBounds);
            // Bounce effect? Nah, just slide.
            // Reset velocity on collision axis could be better but this is simple.
        }

        // Update Mesh Position
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y;

        // Banking effect (rotation)
        this.mesh.rotation.z = -this.velocity.x * 0.5;

        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.position.x * 0.5, delta * 2);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.position.y * 0.5, delta * 2);
    }

    getCollisionPacket() {
        return {
            x: this.position.x,
            y: this.position.y,
            radius: 0.3 // Approximate radius of the ship
        };
    }
}
