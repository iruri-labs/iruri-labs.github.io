import * as THREE from 'three';
import { setupLights } from './lights.js';
import { createObjects } from './objects.js';

let objects = {};

// Scroll state
let scrollPercent = 0;

let sections = [];
let sectionRanges = [];
let activeScene = 'intro';
let activeProgress = 0;

const lockableScenes = new Set(['doc-parse', 'rag', 'pipeline']);
const progressMax = 2.6;
const revealAt = 0.5;
const releaseAt = 2.2;
const sceneProgress = {
    'doc-parse': 0,
    rag: 0,
    pipeline: 0
};

let scrollLock = {
    active: false,
    scene: null,
    pinY: 0
};

export function animate(scene, camera, renderer) {
    // Initial Setup inside animation module to ensure order
    const lights = setupLights(scene);
    objects = createObjects(scene);

    const clock = new THREE.Clock();

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp01 = (v) => Math.min(1, Math.max(0, v));

    const desiredCameraPos = new THREE.Vector3();
    const desiredLookAt = new THREE.Vector3(0, 0, 0);
    const smoothLookAt = new THREE.Vector3(0, 0, 0);
    const darkFog = new THREE.Color(0x050505);
    const lightFog = new THREE.Color(0xe9eef2);
    const darkClear = new THREE.Color(0x050505);
    const lightClear = new THREE.Color(0xf2f4f7);
    const tmpColor = new THREE.Color();
    const env = { mix: 0 };
    const lightScenes = new Set(['about', 'doc-parse', 'rag', 'services']);
    const lightRig = {
        ambient: { dark: 1.1, light: 2.1 },
        hemi: { dark: 0.75, light: 1.35 },
        dir: { dark: 3.2, light: 5.4 },
        fill: { dark: 1.3, light: 2.4 },
        point1: { dark: 14, light: 26 },
        point2: { dark: 12, light: 24 }
    };
    const lightRigPos = {
        dir: {
            dark: new THREE.Vector3(6, 7, 6),
            light: new THREE.Vector3(0.2, 9.2, 3.6)
        },
        fill: {
            dark: new THREE.Vector3(-6, 3, -4),
            light: new THREE.Vector3(-2.6, 7.4, -2.2)
        },
        point1: {
            dark: new THREE.Vector3(-4.5, 0.8, 3),
            light: new THREE.Vector3(-2.4, 6.6, 1.8)
        },
        point2: {
            dark: new THREE.Vector3(4.5, -0.8, 3),
            light: new THREE.Vector3(2.4, 6.8, 1.8)
        }
    };

    const buildSectionRanges = () => {
        sections = Array.from(document.querySelectorAll('section[data-scene]'));
        const scrollMax = Math.max(1, document.documentElement.scrollHeight - document.documentElement.clientHeight);
        sectionRanges = sections.map((el) => {
            const rect = el.getBoundingClientRect();
            const top = rect.top + window.scrollY;
            const h = Math.max(1, rect.height);
            const start = clamp01(top / scrollMax);
            const end = clamp01((top + h) / scrollMax);
            return {
                el,
                scene: el.dataset.scene,
                start,
                end,
                topY: top,
                bottomY: top + h
            };
        });
    };

    const computeScrollPercent = () => {
        const h = document.documentElement,
              b = document.body,
              st = 'scrollTop',
              sh = 'scrollHeight';
        return (h[st] || b[st]) / Math.max(1, ((h[sh] || b[sh]) - h.clientHeight));
    };

    const updateActiveScene = () => {
        if (!sectionRanges.length) return;
        let best = sectionRanges[0];
        let bestDist = Infinity;
        for (const r of sectionRanges) {
            const mid = (r.start + r.end) * 0.5;
            const dist = Math.abs(scrollPercent - mid);
            if (dist < bestDist) {
                bestDist = dist;
                best = r;
            }
        }
        activeScene = best.scene || 'intro';
        const denom = Math.max(1e-6, best.end - best.start);
        activeProgress = clamp01((scrollPercent - best.start) / denom);
    };

    const getRangeForScene = (sceneName) => sectionRanges.find((r) => r.scene === sceneName) || null;

    const setSectionClasses = (sceneName) => {
        const r = getRangeForScene(sceneName);
        if (!r || !r.el) return;
        const pinned = scrollLock.active && scrollLock.scene === sceneName;
        const revealed = (sceneProgress[sceneName] ?? 0) >= revealAt;
        r.el.classList.toggle('scene-lockable', lockableScenes.has(sceneName));
        r.el.classList.toggle('scene-pinned', pinned);
        r.el.classList.toggle('scene-revealed', revealed);
        r.el.classList.toggle('scene-unrevealed', lockableScenes.has(sceneName) && !revealed);
    };

    const setAllSectionClasses = () => {
        for (const s of lockableScenes) setSectionClasses(s);
    };

    const shouldCaptureScrollForScene = (sceneName, deltaY) => {
        if (!lockableScenes.has(sceneName)) return false;
        const r = getRangeForScene(sceneName);
        if (!r) return false;

        const y = window.scrollY;
        const within = y >= (r.topY - 2) && y <= (r.bottomY - 2);
        if (!within) return false;

        const p = sceneProgress[sceneName] ?? 0;
        const wantsDown = deltaY > 0;
        const wantsUp = deltaY < 0;
        if (scrollLock.active && scrollLock.scene === sceneName) return true;
        return (wantsDown && p < releaseAt) || (wantsUp && p > 0.001);
    };

    const engageScrollLock = (sceneName) => {
        if (scrollLock.active && scrollLock.scene === sceneName) return;
        const r = getRangeForScene(sceneName);
        scrollLock.active = true;
        scrollLock.scene = sceneName;
        scrollLock.pinY = r ? r.topY : window.scrollY;
        setAllSectionClasses();
        window.scrollTo(0, scrollLock.pinY);
    };

    const releaseScrollLock = () => {
        scrollLock.active = false;
        scrollLock.scene = null;
        setAllSectionClasses();
    };

    // Scroll Listener
    document.addEventListener('scroll', () => {
        if (scrollLock.active) {
            if (Math.abs(window.scrollY - scrollLock.pinY) > 1) {
                window.scrollTo(0, scrollLock.pinY);
            }
            return;
        }
        scrollPercent = computeScrollPercent();
        updateActiveScene();
    });

    window.addEventListener('resize', () => {
        buildSectionRanges();
        updateActiveScene();
        setAllSectionClasses();
    });

    window.addEventListener('load', () => {
        buildSectionRanges();
        scrollPercent = computeScrollPercent();
        updateActiveScene();
        setAllSectionClasses();
    });

    document.addEventListener('wheel', (e) => {
        const sceneName = activeScene;
        if (!shouldCaptureScrollForScene(sceneName, e.deltaY)) return;
        e.preventDefault();

        engageScrollLock(sceneName);
        const speed = isMobile ? 0.0012 : 0.00085;
        sceneProgress[sceneName] = Math.min(progressMax, Math.max(0, (sceneProgress[sceneName] ?? 0) + e.deltaY * speed));
        setSectionClasses(sceneName);

        if (scrollLock.active) window.scrollTo(0, scrollLock.pinY);

        if (sceneProgress[sceneName] >= releaseAt && e.deltaY > 0) {
            releaseScrollLock();
        }
        if (sceneProgress[sceneName] <= 0.001 && e.deltaY < 0) {
            releaseScrollLock();
        }
    }, { passive: false });

    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
        if (!e.touches || !e.touches.length) return;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!e.touches || !e.touches.length) return;
        const dy = touchStartY - e.touches[0].clientY;
        const sceneName = activeScene;
        if (!shouldCaptureScrollForScene(sceneName, dy)) return;
        e.preventDefault();

        engageScrollLock(sceneName);
        const speed = 0.0021;
        sceneProgress[sceneName] = Math.min(progressMax, Math.max(0, (sceneProgress[sceneName] ?? 0) + dy * speed));
        setSectionClasses(sceneName);

        touchStartY = e.touches[0].clientY;
        if (scrollLock.active) window.scrollTo(0, scrollLock.pinY);

        if (sceneProgress[sceneName] >= releaseAt && dy > 0) {
            releaseScrollLock();
        }
        if (sceneProgress[sceneName] <= 0.001 && dy < 0) {
            releaseScrollLock();
        }
    }, { passive: false });

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) - 0.5;
        mouseY = (event.clientY / window.innerHeight) - 0.5;
    });

    buildSectionRanges();
    scrollPercent = computeScrollPercent();
    updateActiveScene();
    setAllSectionClasses();

    const groupAlpha = {
        intro: 1,
        'doc-parse': 0,
        rag: 0,
        pipeline: 0
    };

    const getGroupMaterialRecords = (group) => {
        if (!group) return [];
        if (group.userData.__materialRecords) return group.userData.__materialRecords;

        const set = new Set();
        const records = [];
        group.traverse((obj) => {
            if (!obj.material) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) {
                if (!m || set.has(m)) continue;
                set.add(m);
                records.push({
                    m,
                    baseOpacity: (m.opacity !== undefined ? m.opacity : 1),
                    baseTransparent: !!m.transparent,
                    baseDepthWrite: (m.depthWrite !== undefined ? m.depthWrite : true)
                });
            }
        });

        group.userData.__materialRecords = records;
        return records;
    };

    const applyGroupOpacity = (group, alpha) => {
        if (!group) return;
        const records = getGroupMaterialRecords(group);
        for (const r of records) {
            const m = r.m;
            const prevTransparent = !!m.transparent;
            const prevDepthWrite = (m.depthWrite !== undefined ? m.depthWrite : true);

            m.transparent = r.baseTransparent || alpha < 0.999;
            if (m.depthWrite !== undefined) {
                m.depthWrite = r.baseDepthWrite && alpha > 0.18;
            }
            if (m.opacity !== undefined) {
                m.opacity = r.baseOpacity * alpha;
            }

            const nextTransparent = !!m.transparent;
            const nextDepthWrite = (m.depthWrite !== undefined ? m.depthWrite : true);
            if (prevTransparent !== nextTransparent || prevDepthWrite !== nextDepthWrite) {
                m.needsUpdate = true;
            }
        }
        group.visible = alpha > 0.02;
    };

    const updateGroupFades = () => {
        if (!objects.groups) return;
        let targetScene = activeScene;
        if (activeScene === 'about') targetScene = 'intro';
        if (activeScene === 'services') targetScene = 'pipeline';
        if (activeScene === 'team' || activeScene === 'contact') targetScene = 'intro';

        const targets = {
            intro: 0,
            'doc-parse': 0,
            rag: 0,
            pipeline: 0
        };
        if (targets[targetScene] !== undefined) targets[targetScene] = 1;

        const fadeSpeed = 0.06;
        for (const k of Object.keys(groupAlpha)) {
            groupAlpha[k] = lerp(groupAlpha[k], targets[k], fadeSpeed);
        }

        applyGroupOpacity(objects.groups.intro, groupAlpha.intro);
        applyGroupOpacity(objects.groups['doc-parse'], groupAlpha['doc-parse']);
        applyGroupOpacity(objects.groups.rag, groupAlpha.rag);
        applyGroupOpacity(objects.groups.pipeline, groupAlpha.pipeline);
    };

    const updateEnvironment = () => {
        const wantsLight = lightScenes.has(activeScene);
        env.mix = lerp(env.mix, wantsLight ? 1 : 0, 0.06);

        tmpColor.copy(darkFog).lerp(lightFog, env.mix);
        if (scene.fog) {
            scene.fog.color.copy(tmpColor);
            scene.fog.density = lerp(0.0012, 0.00085, env.mix);
        }

        tmpColor.copy(darkClear).lerp(lightClear, env.mix);
        renderer.setClearColor(tmpColor, 1);
        const lightExposure = (activeScene === 'pipeline') ? 1.0 : 1.15;
        renderer.toneMappingExposure = lerp(1.55, lightExposure, env.mix);

        if (lights) {
            const pipelineDim = (activeScene === 'pipeline') ? 0.5 : 1;
            lights.ambientLight.intensity = lerp(lightRig.ambient.dark, lightRig.ambient.light, env.mix) * pipelineDim;
            lights.hemi.intensity = lerp(lightRig.hemi.dark, lightRig.hemi.light, env.mix) * pipelineDim;
            lights.dirLight.intensity = lerp(lightRig.dir.dark, lightRig.dir.light, env.mix) * pipelineDim;
            lights.fillLight.intensity = lerp(lightRig.fill.dark, lightRig.fill.light, env.mix) * pipelineDim;
            const pointDim = 0.7;
            lights.pointLight1.intensity = lerp(lightRig.point1.dark, lightRig.point1.light, env.mix) * pipelineDim * pointDim;
            lights.pointLight2.intensity = lerp(lightRig.point2.dark, lightRig.point2.light, env.mix) * pipelineDim * pointDim;

            lights.dirLight.position.lerpVectors(lightRigPos.dir.dark, lightRigPos.dir.light, env.mix);
            lights.fillLight.position.lerpVectors(lightRigPos.fill.dark, lightRigPos.fill.light, env.mix);
            lights.pointLight1.position.lerpVectors(lightRigPos.point1.dark, lightRigPos.point1.light, env.mix);
            lights.pointLight2.position.lerpVectors(lightRigPos.point2.dark, lightRigPos.point2.light, env.mix);
        }

        document.body.classList.toggle('light-mode', wantsLight);

        if (objects.materials) {
            const lerpColor = (a, b, t, out) => {
                out.copy(a).lerp(b, t);
                return out;
            };
            for (const m of objects.materials) {
                const theme = m.userData?.theme;
                if (!theme) continue;
                const dark = theme.dark || {};
                const light = theme.light || {};
                if (m.color && dark.color && light.color) {
                    m.color.copy(dark.color).lerp(light.color, env.mix);
                }
                if (m.emissive && dark.emissive && light.emissive) {
                    lerpColor(dark.emissive, light.emissive, env.mix, m.emissive);
                }
                if (m.emissiveIntensity !== undefined) {
                    const d = dark.emissiveIntensity ?? m.emissiveIntensity;
                    const l = light.emissiveIntensity ?? m.emissiveIntensity;
                    m.emissiveIntensity = lerp(d, l, env.mix);
                }
                if (m.roughness !== undefined) {
                    const d = dark.roughness ?? m.roughness;
                    const l = light.roughness ?? m.roughness;
                    m.roughness = lerp(d, l, env.mix);
                }
                if (m.metalness !== undefined) {
                    const d = dark.metalness ?? m.metalness;
                    const l = light.metalness ?? m.metalness;
                    m.metalness = lerp(d, l, env.mix);
                }
                if (m.bumpScale !== undefined) {
                    const d = dark.bumpScale ?? m.bumpScale;
                    const l = light.bumpScale ?? m.bumpScale;
                    m.bumpScale = lerp(d, l, env.mix);
                }
                const mapDark = dark.map ?? m.map;
                const mapLight = light.map ?? m.map;
                if (mapDark !== mapLight && (dark.map || light.map)) {
                    const nextMap = env.mix > 0.6 ? mapLight : mapDark;
                    if (m.map !== nextMap) {
                        m.map = nextMap;
                        m.needsUpdate = true;
                    }
                }
            }
        }
    };

    const introCamera = (t) => {
        desiredCameraPos.set(
            lerp(0, 0.2, t),
            lerp(0, 0.25, t),
            lerp(5.4, 4.7, t)
        );
        desiredLookAt.set(0, 0, 0);
    };

    const docParseCamera = (t) => {
        desiredCameraPos.set(
            lerp(0.1, 0.25, t),
            lerp(0.2, 0.15, t),
            lerp(5.6, 4.2, t)
        );
        desiredLookAt.set(0, 0, 0);
    };

    const ragCamera = (t) => {
        desiredCameraPos.set(
            lerp(0.2, 0.6, t),
            lerp(0.35, 0.65, t),
            lerp(6.2, 5.3, t)
        );
        desiredLookAt.set(0, 0.2, 0);
    };

    const pipelineCamera = (t) => {
        desiredCameraPos.set(
            lerp(0.2, 0.3, t),
            lerp(0.55, 0.8, t),
            lerp(7.2, 6.0, t)
        );
        desiredLookAt.set(0, -0.2, 0);
    };

    const updateDocParse = (elapsedTime, t) => {
        if (!objects.doc) return;
        const g = objects.doc.group;
        g.position.set(0, 0, 0);
        g.rotation.y = elapsedTime * 0.08 + mouseX * 0.25;
        g.rotation.x = 0.12 + mouseY * 0.15;
        g.scale.setScalar(isMobile ? 0.9 : 1);

        const split = clamp01((t - 0.15) / 0.7);
        const pulse = 0.65 + Math.sin(elapsedTime * 2.2) * 0.12;

        for (let i = 0; i < objects.doc.regions.length; i++) {
            const r = objects.doc.regions[i];
            const home = r.userData.home;
            const scatter = r.userData.scatter;
            r.position.set(
                lerp(home.x, scatter.x, split),
                lerp(home.y, scatter.y, split),
                lerp(home.z, scatter.z, split)
            );

            const s = 0.98 + split * 0.06;
            r.scale.set(s, s, 1);

            const node = objects.doc.nodes[i];
            node.position.copy(r.position).add(new THREE.Vector3(0, 0, 0.25));
            node.material.opacity = 0.25 + split * 0.75;
        }

        if (objects.doc.tags) {
            for (const tag of objects.doc.tags) {
                const region = objects.doc.regions[tag.anchorIndex];
                if (!region) continue;
                const group = tag.group;
                group.position.copy(region.position);
                const anchor = group.userData.anchorOffset;
                const label = group.userData.labelOffset;
                const mid = group.userData.midOffset;
                const attr = tag.line.geometry.getAttribute('position');
                const p = attr.array;
                p[0] = anchor.x; p[1] = anchor.y; p[2] = anchor.z;
                p[3] = mid.x; p[4] = mid.y; p[5] = mid.z;
                p[6] = label.x; p[7] = label.y; p[8] = label.z;
                attr.needsUpdate = true;
            }
        }

        const linkOpacity = clamp01((t - 0.35) / 0.55) * 0.65 * pulse;
        objects.doc.links.material.opacity = linkOpacity;
        const posAttr = objects.doc.links.geometry.getAttribute('position');
        const p = posAttr.array;

        const n0 = objects.doc.nodes[0]?.position;
        const n1 = objects.doc.nodes[1]?.position;
        const n2 = objects.doc.nodes[2]?.position;
        if (n0 && n1 && n2) {
            p[0] = n0.x; p[1] = n0.y; p[2] = n0.z;
            p[3] = n1.x; p[4] = n1.y; p[5] = n1.z;

            p[6] = n1.x; p[7] = n1.y; p[8] = n1.z;
            p[9] = n2.x; p[10] = n2.y; p[11] = n2.z;

            p[12] = n0.x; p[13] = n0.y; p[14] = n0.z;
            p[15] = n2.x; p[16] = n2.y; p[17] = n2.z;
            posAttr.needsUpdate = true;
        }

        objects.doc.paper.material.opacity = 0.75 + (1 - split) * 0.2;
    };

    const updateRag = (elapsedTime, t) => {
        if (!objects.rag) return;
        const g = objects.rag.group;
        g.position.set(0, 0, 0);
        g.rotation.y = elapsedTime * 0.12 + mouseX * 0.2;
        g.rotation.x = 0.1 + mouseY * 0.08;
        g.scale.setScalar(isMobile ? 0.95 : 1);

        const emphasis = clamp01((t - 0.1) / 0.8);
        for (const n of objects.rag.nodes) {
            const s = n.userData.seed || 0;
            const base = n.userData.base || n.position;
            const wobble = (Math.sin(elapsedTime * 0.7 + s) * 0.04) + (Math.cos(elapsedTime * 0.9 + s) * 0.03);
            n.position.set(
                base.x * (1 + wobble),
                base.y + Math.sin(elapsedTime * 0.8 + s) * 0.03,
                base.z * (1 + wobble)
            );
            n.material.opacity = 0.45 + emphasis * 0.55;
        }

        for (let i = 0; i < objects.rag.edges.length; i++) {
            const e = objects.rag.edges[i];
            const boost = (i % 7 === 0 ? 0.22 : 0);
            e.material.opacity = (0.08 + emphasis * 0.22 + boost) * (0.8 + Math.sin(elapsedTime * 1.8) * 0.1);
        }

        if (objects.rag.tubes) {
            const tubeAlpha = (0.18 + emphasis * 0.55) * (0.75 + Math.sin(elapsedTime * 2.1) * 0.08);
            for (const tube of objects.rag.tubes) {
                if (tube.material) tube.material.opacity = tubeAlpha;
            }
        }

        objects.rag.query.rotation.x = elapsedTime * 0.4;
        objects.rag.query.rotation.y = elapsedTime * 0.6;
        objects.rag.query.position.x = lerp(-2.6, -1.6, t);
        objects.rag.query.position.y = lerp(0.2, 0.9, t);
    };

    const updatePipeline = (elapsedTime, t) => {
        if (!objects.pipeline) return;
        const g = objects.pipeline.group;
        g.position.set(0, 0, 0);
        g.rotation.y = mouseX * 0.15;
        g.rotation.x = 0.05 + mouseY * 0.1;
        g.scale.setScalar(isMobile ? 0.9 : 1);

        if (lights) {
            const yLift = lerp(0.4, 1.1, t);
            lights.dirLight.position.y += yLift;
            lights.fillLight.position.y += yLift * 0.8;
            lights.pointLight1.position.y += yLift * 0.75;
            lights.pointLight2.position.y += yLift * 0.75;
        }

        const docT = clamp01((t - 0.05) / 0.9);
        objects.pipeline.doc.position.x = lerp(-3.55, 3.55, docT);
        objects.pipeline.doc.position.y = -0.48 + Math.sin((elapsedTime * 2.2) + docT * 8) * 0.03;
        objects.pipeline.doc.rotation.z = Math.sin(elapsedTime * 1.2) * 0.03;

        if (objects.pipeline.doc.material && objects.pipeline.doc.material.emissiveIntensity !== undefined) {
            const gain = clamp01((t - 0.15) / 0.7);
            objects.pipeline.doc.material.emissiveIntensity = 0.25 + gain * 0.55;
        }

        if (objects.pipeline.beltTex) {
            objects.pipeline.beltTex.offset.x = (elapsedTime * 0.25) % 1;
        }
        if (objects.pipeline.beltTexLight) {
            objects.pipeline.beltTexLight.offset.x = (elapsedTime * 0.25) % 1;
        }

        if (objects.pipeline.rollers) {
            for (const r of objects.pipeline.rollers) {
                r.rotation.x = elapsedTime * 3.2;
            }
        }

        const docX = objects.pipeline.doc.position.x;
        let stage = 0;
        let best = Infinity;
        for (let i = 0; i < objects.pipeline.stations.length; i++) {
            const sx = objects.pipeline.stations[i].position.x;
            const d = Math.abs(docX - sx);
            if (d < best) {
                best = d;
                stage = i;
            }
        }

        for (let i = 0; i < objects.pipeline.stations.length; i++) {
            const st = objects.pipeline.stations[i];
            const d = Math.abs(i - stage);
            st.scale.setScalar(1 + Math.max(0, 0.06 - d * 0.02));

            const light = objects.pipeline.stationLights?.[i];
            if (light && light.material) {
                const target = i === stage ? 0.85 : 0.25;
                light.material.opacity = lerp(light.material.opacity || 0, target, 0.08);
            }

            const housing = objects.pipeline.stationHousings?.[i];
            if (housing && housing.material && housing.material.emissiveIntensity !== undefined) {
                const target = i === stage ? 0.55 : 0.2;
                housing.material.emissiveIntensity = lerp(housing.material.emissiveIntensity, target, 0.08);
            }

            const core = objects.pipeline.stationCores?.[i];
            if (core) {
                core.rotation.x = elapsedTime * 0.8 + i * 0.6;
                core.rotation.y = elapsedTime * 1.1 + i * 0.4;
                if (core.material && core.material.emissiveIntensity !== undefined) {
                    const pulse = 0.75 + Math.sin(elapsedTime * 3.0 + i) * 0.25;
                    const focus = i === stage ? 1.0 : 0.55;
                    core.material.emissiveIntensity = 0.55 + pulse * 0.75 * focus;
                }
            }

            const win = objects.pipeline.stationWindows?.[i];
            if (win && win.material && win.material.emissiveIntensity !== undefined) {
                const pulse = 0.75 + Math.sin(elapsedTime * 2.4 + i * 0.9) * 0.25;
                const focus = i === stage ? 1.0 : 0.45;
                win.material.emissiveIntensity = 0.25 + pulse * 0.55 * focus;
            }
        }

        const stageCount = Math.max(1, objects.pipeline.stations.length);
        const stageNorm = stage / (stageCount - 1);

        const scanActive = stage <= 1 ? clamp01(1 - best / 0.55) : 0;
        if (objects.pipeline.scanBeam) {
            objects.pipeline.scanBeam.material.opacity = scanActive * (0.15 + Math.sin(elapsedTime * 9) * 0.05);
            const sweep = (Math.sin(elapsedTime * 6.5) * 0.5 + 0.5);
            objects.pipeline.scanBeam.position.x = lerp(-2.7, -0.9, clamp01((docT - 0.12) / 0.22)) + (sweep - 0.5) * 0.12;
        }

        const handwritingWindow = clamp01(1 - Math.abs(stageNorm - 0.66) / 0.18) * clamp01(1 - best / 0.9);
        const handwriting = clamp01(handwritingWindow);
        for (const s of objects.pipeline.strokesSet) {
            s.material.opacity = handwriting * (0.55 + Math.sin(elapsedTime * 2.6) * 0.12);
        }

        if (objects.pipeline.sparks && objects.pipeline.sparkVel) {
            const sparkStrength = clamp01((t - 0.18) / 0.25) * (0.35 + scanActive * 0.65);
            objects.pipeline.sparks.material.opacity = sparkStrength * (0.55 + Math.sin(elapsedTime * 3.0) * 0.1);

            const attr = objects.pipeline.sparks.geometry.getAttribute('position');
            const p = attr.array;
            const v = objects.pipeline.sparkVel;
            for (let i = 0; i < p.length; i += 3) {
                p[i] += v[i];
                p[i + 1] += v[i + 1];
                p[i + 2] += v[i + 2];
                if (p[i + 1] > 2.3 || Math.abs(p[i]) > 2.2 || Math.abs(p[i + 2]) > 1.2) {
                    p[i] = (Math.random() - 0.5) * 1.8;
                    p[i + 1] = 0.15;
                    p[i + 2] = (Math.random() - 0.5) * 0.9;
                }
            }
            attr.needsUpdate = true;
        }
    };

    function tick() {
        const elapsedTime = clock.getElapsedTime();
        updateEnvironment();

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
        updateGroupFades();

        let targetScene = activeScene;
        if (activeScene === 'about') targetScene = 'intro';
        if (activeScene === 'services') targetScene = 'pipeline';
        if (activeScene === 'team' || activeScene === 'contact') targetScene = 'intro';

        if (targetScene === 'intro') {
            introCamera(activeProgress);
            if (objects.core) {
                objects.core.scale.setScalar(1 + scrollPercent * 0.4);
                objects.core.position.y = scrollPercent * 0.8;
            }
        }

        if (targetScene === 'doc-parse') {
            const t = clamp01(sceneProgress['doc-parse']);
            docParseCamera(t);
            updateDocParse(elapsedTime, t);
        }

        if (targetScene === 'rag') {
            const t = clamp01(sceneProgress.rag);
            ragCamera(t);
            updateRag(elapsedTime, t);
        }

        if (targetScene === 'pipeline') {
            const isOverlay = (activeScene === 'services');
            const t = isOverlay ? 0.55 : clamp01(sceneProgress.pipeline);
            pipelineCamera(isOverlay ? 0.35 : t);
            updatePipeline(elapsedTime, t);
        }

        const camLerp = 0.08;
        camera.position.lerp(desiredCameraPos, camLerp);
        smoothLookAt.lerp(desiredLookAt, camLerp);
        camera.lookAt(smoothLookAt);

        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }

    tick();
}
