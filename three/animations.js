import * as THREE from 'three';
import { setupLights } from './lights.js';
import { createObjects } from './objects.js';

let objects = {};
let container;

// Scroll state
let scrollPercent = 0;

export function animate(scene, camera, renderer) {
    // Initial Setup inside animation module to ensure order
    setupLights(scene);
    objects = createObjects(scene);

    const clock = new THREE.Clock();

    // Scroll Listener
    document.addEventListener('scroll', () => {
        const h = document.documentElement, 
              b = document.body,
              st = 'scrollTop',
              sh = 'scrollHeight';
        
        scrollPercent = (h[st]||b[st]) / ((h[sh]||b[sh]) - h.clientHeight);
    });

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) - 0.5;
        mouseY = (event.clientY / window.innerHeight) - 0.5;
    });

    function tick() {
        const elapsedTime = clock.getElapsedTime();

        // 1. Core Animation (Idle)
        if (objects.core) {
            objects.core.rotation.y = elapsedTime * 0.1;
            objects.core.rotation.x = Math.sin(elapsedTime * 0.5) * 0.1;
            
            // Mouse parallax
            objects.core.rotation.y += mouseX * 0.5;
            objects.core.rotation.x += mouseY * 0.5;
        }

        // 2. Particle Animation
        if (objects.particles) {
            objects.particles.rotation.y = -elapsedTime * 0.05;
            objects.particles.rotation.z = mouseX * 0.1;
        }

        // 3. Scroll Interactions
        // Move camera deeper based on scroll
        camera.position.z = 5 - (scrollPercent * 3); 
        
        // Rotate core based on scroll
        if (objects.core) {
            objects.core.scale.setScalar(1 + scrollPercent * 0.5);
            objects.core.position.y = scrollPercent * 1; 
        }

        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }

    tick();
}
