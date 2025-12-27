import * as THREE from 'three';

let scene, camera, renderer;

export function initScene() {
    // Scene setup
    scene = new THREE.Scene();
    // Add fog for depth - dark background color
    scene.fog = new THREE.FogExp2(0x050505, 0.002);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer setup
    const canvas = document.querySelector('#webgl');
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance

    return { scene, camera, renderer };
}

export function onWindowResize(camera, renderer) {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
