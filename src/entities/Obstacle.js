import * as THREE from 'three';

export class Obstacle {
    constructor(scene, z, type = 'random') {
        this.scene = scene;
        this.active = true;
        this.type = type;

        if (this.type === 'random') {
            const rand = Math.random();
            if (rand < 0.6) this.type = 'simple';
            else if (rand < 0.8) this.type = 'fan';
            else this.type = 'wall';
        }

        this.mesh = new THREE.Group();
        this.collisionParts = []; // For complex collision

        this.initGeometry();

        this.mesh.position.z = -z;
        this.scene.add(this.mesh);
    }

    initGeometry() {
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });

        if (this.type === 'simple') {
            // Existing logic: Random Geometric Shape
            const shapeType = Math.floor(Math.random() * 3);
            let geometry;
            switch (shapeType) {
                case 0: geometry = new THREE.BoxGeometry(1, 1, 1); break;
                case 1: geometry = new THREE.TetrahedronGeometry(0.8); break;
                case 2: geometry = new THREE.OctahedronGeometry(0.7); break;
            }
            const edges = new THREE.EdgesGeometry(geometry);
            const mesh = new THREE.LineSegments(edges, material);

            // Random position and rotation
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 2.5;
            mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            this.mesh.add(mesh);
            this.collisionParts.push({ type: 'sphere', x: mesh.position.x, y: mesh.position.y, radius: 0.6 });
        }
        else if (this.type === 'wall') {
            // A ring of boxes with a gap
            const gapIndex = Math.floor(Math.random() * 8); // 8 segments
            const radius = 2.5;

            for (let i = 0; i < 8; i++) {
                if (i === gapIndex) continue; // The gap

                const angle = (i / 8) * Math.PI * 2;
                const geometry = new THREE.BoxGeometry(1.5, 0.5, 0.5);
                const edges = new THREE.EdgesGeometry(geometry);
                const part = new THREE.LineSegments(edges, material);

                part.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
                part.rotation.z = angle + Math.PI / 2;

                this.mesh.add(part);
                this.collisionParts.push({ type: 'sphere', x: part.position.x, y: part.position.y, radius: 0.8 });
            }

            // Inner decoration
            const innerGeo = new THREE.RingGeometry(3.5, 3.6, 32);
            const innerEdges = new THREE.EdgesGeometry(innerGeo);
            const innerRing = new THREE.LineSegments(innerEdges, new THREE.LineBasicMaterial({ color: 0x550000 }));
            this.mesh.add(innerRing);
        }
        else if (this.type === 'fan') {
            // Rotating blades
            const bladeGeo = new THREE.BoxGeometry(6, 0.2, 0.2);
            const edges = new THREE.EdgesGeometry(bladeGeo);

            const blade1 = new THREE.LineSegments(edges, material);
            const blade2 = new THREE.LineSegments(edges, material);
            blade2.rotation.z = Math.PI / 2;

            this.mesh.add(blade1);
            this.mesh.add(blade2);

            // Collision will be checked dynamically based on rotation
            this.collisionParts.push({ type: 'fan' });
        }
    }

    update(delta, speed) {
        this.mesh.position.z += speed * delta;

        if (this.type === 'simple') {
            this.mesh.children[0].rotation.x += delta;
            this.mesh.children[0].rotation.y += delta;
        } else if (this.type === 'fan') {
            this.mesh.rotation.z += delta * 2; // Spin the whole fan group
        } else if (this.type === 'wall') {
            this.mesh.rotation.z += delta * 0.2; // Slow rotation for walls
        }
    }

    checkCollision(shipPacket) {
        // Ship z is fixed at 2
        // Obstacle needs to be close in Z
        if (Math.abs(this.mesh.position.z - 2) > 0.5) return false;

        // Transform ship position into local space if needed, 
        // but since parts are children of this.mesh (which has position.z),
        // we need to translate world coordinates.
        // Actually simpler: Obstacle is moving in World Z.
        // Parts are static relative to Obstacle Center (except fan rotation).

        // Let's check based on obstacle type

        if (this.type === 'fan') {
            // Check distance from center first
            const dist = Math.sqrt(shipPacket.x * shipPacket.x + shipPacket.y * shipPacket.y);
            if (dist < 0.5) return false; // Safe in the very center hub

            // Simple approach: Rotate ship pos by negative fan rotation 
            // and check if it aligns with blades (approx 0 and 90 deg)
            const angle = Math.atan2(shipPacket.y, shipPacket.x);
            let localAngle = angle - this.mesh.rotation.z;
            localAngle = (localAngle % (Math.PI * 2));
            if (localAngle < 0) localAngle += Math.PI * 2;

            // 2 blades at 0 and PI/2 (since we added blade2 at 90 deg)
            // blade1 is horizontal at start (0 and 180 deg)
            // blade2 is vertical at start (90 and 270 deg)

            // Normalize angle to 0-PI/2 range for checking
            const reducedAngle = localAngle % (Math.PI / 2);

            // If angle is close to 0 or close to PI/2, hit.
            // Actually, checking if ship is "inside" the blade rectangle is better but harder.
            // Let's use simple angle checks. If angle is within +/- 10 degrees of 0, 90, 180, 270.

            // Let's normalize everything to 0-90 check
            // if reducedAngle is close to 0 or close to 90 (PI/2 = 1.57)

            // Blades have thickness. One blade is along X, one along Y.
            // In local space:
            // Hit if |y| < thickness/2  (Blade along X)
            // OR if |x| < thickness/2 (Blade along Y)

            // We need to rotate ship pos into local fan space
            const cos = Math.cos(-this.mesh.rotation.z);
            const sin = Math.sin(-this.mesh.rotation.z);
            const lx = shipPacket.x * cos - shipPacket.y * sin;
            const ly = shipPacket.x * sin + shipPacket.y * cos;

            if (Math.abs(ly) < 0.3 || Math.abs(lx) < 0.3) {
                return true;
            }

        } else {
            // Wall and Simple: Check vs spheres
            // Wall parts: Rotate with the wall
            // We need to calculate World Position of each part
            const cos = Math.cos(this.mesh.rotation.z);
            const sin = Math.sin(this.mesh.rotation.z);

            for (const part of this.collisionParts) {
                // Rotate part position if Obstacle rotates (Wall does)
                let wx = part.x;
                let wy = part.y;

                if (this.type === 'wall') {
                    wx = part.x * cos - part.y * sin;
                    wy = part.x * sin + part.y * cos;
                }

                // Add obstacle world position (X/Y usually 0, but logic supports offset)
                wx += this.mesh.position.x;
                wy += this.mesh.position.y;

                const dx = wx - shipPacket.x;
                const dy = wy - shipPacket.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < (part.radius + shipPacket.radius)) {
                    return true;
                }
            }
        }

        return false;
    }

    remove() {
        this.scene.remove(this.mesh);
        this.active = false;
        // Recursive dispose
        this.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
