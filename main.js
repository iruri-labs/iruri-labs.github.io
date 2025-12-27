import { initScene, onWindowResize } from './three/scene.js';
import { animate } from './three/animations.js';

// Initialize the Three.js scene
const { scene, camera, renderer } = initScene();

// Start the animation loop
animate(scene, camera, renderer);

// Handle window resize
window.addEventListener('resize', () => {
    onWindowResize(camera, renderer);
});
