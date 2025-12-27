import * as THREE from 'three';

export function createObjects(scene) {
    const objects = {};

    // 1. Particle Cloud (Neural Network representation)
    const particleGeometry = new THREE.BufferGeometry();
    const count = 2000;
    const posArray = new Float32Array(count * 3);

    for(let i = 0; i < count * 3; i++) {
        // Spread particles in a large volume
        posArray[i] = (Math.random() - 0.5) * 20; 
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.02,
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    objects.particles = particles;

    // 2. Central Core (Abstract Shape)
    const coreGeometry = new THREE.IcosahedronGeometry(1, 1); // Low poly look
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0x111111,
        emissive: 0x000000,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true,
        wireframe: true
    });
    
    // Wireframe overlay for "Tech" feel
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        wireframe: true,
        transparent: true,
        opacity: 0.1
    });

    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    const coreWireframe = new THREE.Mesh(coreGeometry, wireframeMaterial);
    core.add(coreWireframe);
    
    scene.add(core);
    objects.core = core;

    return objects;
}
