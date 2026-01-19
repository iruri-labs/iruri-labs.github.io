import * as THREE from 'three';

export function setupLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const hemi = new THREE.HemisphereLight(0x58a6ff, 0x050505, 0.9);
    hemi.position.set(0, 8, 0);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 4.0);
    dirLight.position.set(6, 7, 6);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x7000ff, 1.6);
    fillLight.position.set(-6, 3, -4);
    scene.add(fillLight);

    const pointLight1 = new THREE.PointLight(0x7000ff, 22, 60);
    pointLight1.position.set(-4.5, 0.8, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00f3ff, 20, 60);
    pointLight2.position.set(4.5, -0.8, 3);
    scene.add(pointLight2);

    return {
        ambientLight,
        hemi,
        dirLight,
        fillLight,
        pointLight1,
        pointLight2
    };
}
