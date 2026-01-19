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

// Header only shows at top
function updateHeader() {
    const nav = document.querySelector('nav');
    const scrollY = window.scrollY;
    
    // Only show header when at the very top
    if (scrollY > 50) {
        nav.classList.add('hidden');
    } else {
        nav.classList.remove('hidden');
    }
}

// Throttled scroll event listener
window.addEventListener('scroll', () => {
    requestAnimationFrame(updateHeader);
});

// Initial header state
updateHeader();
