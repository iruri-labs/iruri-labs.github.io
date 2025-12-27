import * as THREE from 'three';

export function setupLights(scene) {
    // Ambient light - cool blue tone
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
    scene.add(ambientLight);

    // Directional light - Key light
    const dirLight = new THREE.DirectionalLight(0x00f3ff, 2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Point lights for accents
    const pointLight1 = new THREE.PointLight(0x7000ff, 5, 50);
    pointLight1.position.set(-5, 0, 2);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00f3ff, 5, 50);
    pointLight2.position.set(5, -2, 2);
    scene.add(pointLight2);
}
