import * as THREE from 'three';

export function createObjects(scene) {
    const objects = {};

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const materials = [];

    const registerMaterial = (mat, theme) => {
        if (!mat.userData) mat.userData = {};
        mat.userData.theme = theme;
        materials.push(mat);
        return mat;
    };

    const cloneThemedMaterial = (mat) => {
        const theme = mat.userData?.theme;
        if (!theme) return mat.clone();
        return registerMaterial(mat.clone(), theme);
    };

    const makeCanvasTexture = (width, height, drawFn) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, width, height);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        return tex;
    };

    const makeNoiseTexture = (w, h, intensity = 0.22) => {
        return makeCanvasTexture(w, h, (ctx, W, H) => {
            const img = ctx.createImageData(W, H);
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.floor((Math.random() * 255));
                img.data[i] = v;
                img.data[i + 1] = v;
                img.data[i + 2] = v;
                img.data[i + 3] = Math.floor(255 * intensity);
            }
            ctx.putImageData(img, 0, 0);
        });
    };

    const makeGridTexture = (w, h, fg = 'rgba(0,243,255,0.18)', bg = 'rgba(5,5,5,1)') => {
        return makeCanvasTexture(w, h, (ctx, W, H) => {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = fg;
            ctx.lineWidth = 2;
            const step = 64;
            for (let x = 0; x <= W; x += step) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, H);
                ctx.stroke();
            }
            for (let y = 0; y <= H; y += step) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            for (let i = 0; i < 180; i++) {
                const x = Math.random() * W;
                const y = Math.random() * H;
                const r = 1 + Math.random() * 3;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        });
    };

    const makePaperTexture = (w, h) => {
        return makeCanvasTexture(w, h, (ctx, W, H) => {
            ctx.fillStyle = 'rgba(13,16,22,1)';
            ctx.fillRect(0, 0, W, H);

            for (let i = 0; i < 900; i++) {
                const x = Math.random() * W;
                const y = Math.random() * H;
                const a = 0.02 + Math.random() * 0.05;
                ctx.fillStyle = `rgba(255,255,255,${a})`;
                ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
            }

            ctx.globalAlpha = 0.22;
            ctx.strokeStyle = 'rgba(88,166,255,0.35)';
            ctx.lineWidth = 2;
            for (let y = 120; y < H; y += 86) {
                ctx.beginPath();
                ctx.moveTo(70, y);
                ctx.lineTo(W - 70, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        });
    };

    const makePaperTextureLight = (w, h) => {
        return makeCanvasTexture(w, h, (ctx, W, H) => {
            const grad = ctx.createLinearGradient(0, 0, W, H);
            grad.addColorStop(0, 'rgba(250,251,255,1)');
            grad.addColorStop(1, 'rgba(232,237,255,1)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            ctx.globalAlpha = 0.12;
            ctx.strokeStyle = 'rgba(130,150,210,0.45)';
            ctx.lineWidth = 2;
            for (let y = 130; y < H; y += 92) {
                ctx.beginPath();
                ctx.moveTo(70, y);
                ctx.lineTo(W - 70, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        });
    };

    // 1. Particle Cloud (Neural Network representation)
    const particleGeometry = new THREE.BufferGeometry();
    const count = isMobile ? 1000 : 3500;
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

    const makeLabelSprite = (text, color = '#00f3ff') => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 4;
        const r = 38;
        const x = 24;
        const y = 24;
        const w = canvas.width - 48;
        const h = canvas.height - 48;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = '700 84px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 70, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2.6, 0.65, 1);
        return sprite;
    };

    const makeTagSprite = (text, color = '#58a6ff') => {
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 220;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(10,12,18,0.7)';
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 4;
        const r = 36;
        const x = 18;
        const y = 18;
        const w = canvas.width - 36;
        const h = canvas.height - 36;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = '700 72px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 58, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.6, 0.48, 1);
        return sprite;
    };

    objects.groups = {};

    const introGroup = new THREE.Group();
    introGroup.name = 'introGroup';
    objects.groups.intro = introGroup;
    introGroup.add(core);
    introGroup.add(particles);
    scene.add(introGroup);

    const docGroup = new THREE.Group();
    docGroup.name = 'docParseGroup';
    docGroup.visible = false;
    scene.add(docGroup);
    objects.groups['doc-parse'] = docGroup;

    const ragGroup = new THREE.Group();
    ragGroup.name = 'ragGroup';
    ragGroup.visible = false;
    scene.add(ragGroup);
    objects.groups.rag = ragGroup;

    const pipelineGroup = new THREE.Group();
    pipelineGroup.name = 'pipelineGroup';
    pipelineGroup.visible = false;
    scene.add(pipelineGroup);
    objects.groups.pipeline = pipelineGroup;

    const paperGeom = new THREE.BoxGeometry(2.6, 3.4, 0.03);
    const paperMap = makePaperTexture(1024, 1536);
    const paperMapLight = makePaperTextureLight(1024, 1536);
    paperMap.repeat.set(1, 1);
    paperMapLight.repeat.set(1, 1);
    const paperRough = makeNoiseTexture(512, 512, 0.18);
    paperRough.repeat.set(3, 3);
    const paperBump = makeNoiseTexture(512, 512, 0.12);
    paperBump.repeat.set(2, 2);
    const paperMat = registerMaterial(new THREE.MeshStandardMaterial({
        color: 0x0b0f14,
        map: paperMap,
        roughnessMap: paperRough,
        bumpMap: paperBump,
        bumpScale: 0.12,
        metalness: 0.15,
        roughness: 0.55,
        emissive: 0x05070a,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.98
    }), {
        dark: {
            color: new THREE.Color(0x0b0f14),
            emissive: new THREE.Color(0x05070a),
            emissiveIntensity: 0.35,
            roughness: 0.55,
            metalness: 0.15,
            bumpScale: 0.12,
            map: paperMap
        },
        light: {
            color: new THREE.Color(0xf6f7ff),
            emissive: new THREE.Color(0xc7ccff),
            emissiveIntensity: 0.45,
            roughness: 0.22,
            metalness: 0.06,
            bumpScale: 0.02,
            map: paperMapLight
        }
    });
    const paper = new THREE.Mesh(paperGeom, paperMat);
    paper.position.set(0, 0, 0);
    docGroup.add(paper);

    const borderGeom = new THREE.EdgesGeometry(paperGeom);
    const border = new THREE.LineSegments(
        borderGeom,
        new THREE.LineBasicMaterial({
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.15
        })
    );
    paper.add(border);

    const docDecor = new THREE.Group();
    docDecor.position.z = 0.03;
    docGroup.add(docDecor);

    const inkMat = registerMaterial(new THREE.MeshStandardMaterial({
        color: 0x2c3b8f,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x0c153a,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.65
    }), {
        dark: {
            color: new THREE.Color(0x2c3b8f),
            emissive: new THREE.Color(0x0c153a),
            emissiveIntensity: 0.35,
            roughness: 0.35,
            metalness: 0.1
        },
        light: {
            color: new THREE.Color(0x6b7bff),
            emissive: new THREE.Color(0xa2b0ff),
            emissiveIntensity: 0.45,
            roughness: 0.2,
            metalness: 0.05
        }
    });

    const figureMat = registerMaterial(new THREE.MeshStandardMaterial({
        color: 0x5a2cff,
        roughness: 0.28,
        metalness: 0.2,
        emissive: 0x2a125c,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.9
    }), {
        dark: {
            color: new THREE.Color(0x5a2cff),
            emissive: new THREE.Color(0x2a125c),
            emissiveIntensity: 0.45,
            roughness: 0.28,
            metalness: 0.2
        },
        light: {
            color: new THREE.Color(0xc1a5ff),
            emissive: new THREE.Color(0xe1d3ff),
            emissiveIntensity: 0.6,
            roughness: 0.18,
            metalness: 0.08
        }
    });

    const addInkLine = (x, y, w, h, rot = 0, opacity = 0.7) => {
        const geo = new THREE.BoxGeometry(w, h, 0.008);
        const line = new THREE.Mesh(geo, inkMat);
        line.position.set(x, y, 0);
        line.rotation.z = rot;
        line.material.opacity = opacity;
        docDecor.add(line);
        return line;
    };

    const lineRows = [
        { y: 1.38, w: 1.3 },
        { y: 1.22, w: 1.45 },
        { y: 1.06, w: 1.2 },
        { y: 0.82, w: 1.6 },
        { y: 0.66, w: 1.35 },
        { y: 0.5, w: 1.1 },
        { y: 0.02, w: 1.7 },
        { y: -0.14, w: 1.55 },
        { y: -0.3, w: 1.35 },
        { y: -0.46, w: 1.5 }
    ];
    for (const row of lineRows) {
        addInkLine(-0.35 + (Math.random() * 0.15), row.y, row.w, 0.05, 0, 0.55);
    }

    const headerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.02), figureMat);
    headerBlock.position.set(0.55, 1.55, 0);
    docDecor.add(headerBlock);

    const figureBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.03), figureMat);
    figureBlock.position.set(0.75, 0.2, 0);
    docDecor.add(figureBlock);

    const miniChart = new THREE.Group();
    miniChart.position.set(-0.85, -0.15, 0);
    const barHeights = [0.18, 0.28, 0.12, 0.35];
    for (let i = 0; i < barHeights.length; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, barHeights[i], 0.02), inkMat);
        bar.position.set(i * 0.12, barHeights[i] / 2, 0);
        miniChart.add(bar);
    }
    docDecor.add(miniChart);

    const regionGrid = makeGridTexture(1024, 1024, 'rgba(0,243,255,0.16)', 'rgba(10,15,20,1)');
    const regionGridLight = makeGridTexture(1024, 1024, 'rgba(120,160,255,0.3)', 'rgba(242,245,255,1)');
    regionGrid.repeat.set(1.2, 1.2);
    regionGridLight.repeat.set(1.2, 1.2);
    const regionRough = makeNoiseTexture(512, 512, 0.2);
    regionRough.repeat.set(2.5, 2.5);
    const regionSpecs = [
        {
            w: 2.2,
            h: 0.6,
            x: 0,
            y: 1.1,
            z: 0.2,
            label: 'Paragraphs',
            c: '#58a6ff',
            light: 0x6f86ff,
            emissive: 0x9fb0ff
        },
        {
            w: 2.2,
            h: 0.75,
            x: 0,
            y: 0.25,
            z: 0.2,
            label: 'Table',
            c: '#00f3ff',
            light: 0x45d4ff,
            emissive: 0x94e8ff
        },
        {
            w: 2.2,
            h: 0.95,
            x: 0,
            y: -0.85,
            z: 0.2,
            label: 'Figure',
            c: '#7000ff',
            light: 0xa45bff,
            emissive: 0xc9a1ff
        }
    ];

    const docSignals = new THREE.Group();
    docSignals.position.z = 0.25;
    docGroup.add(docSignals);

    const floatSpecs = [
        { x: -1.35, y: 1.05, z: 0.7, w: 0.34, h: 0.34, color: 0x6f86ff, light: 0xa7b6ff, emissive: 0x9fb0ff },
        { x: -1.15, y: 0.6, z: 0.9, w: 0.28, h: 0.28, color: 0x45d4ff, light: 0x90e4ff, emissive: 0xb6f1ff },
        { x: -1.55, y: 0.15, z: 0.8, w: 0.3, h: 0.3, color: 0xa45bff, light: 0xcaa2ff, emissive: 0xe1cfff },
        { x: -1.2, y: -0.25, z: 0.65, w: 0.26, h: 0.26, color: 0xff7a59, light: 0xffb08c, emissive: 0xffc6a8 }
    ];

    const stemMat = new THREE.LineBasicMaterial({
        color: 0x7fb6ff,
        transparent: true,
        opacity: 0.65
    });

    for (const spec of floatSpecs) {
        const mat = registerMaterial(new THREE.MeshStandardMaterial({
            color: spec.color,
            roughness: 0.22,
            metalness: 0.12,
            emissive: spec.emissive,
            emissiveIntensity: 0.6
        }), {
            dark: {
                color: new THREE.Color(spec.color),
                emissive: new THREE.Color(spec.emissive),
                emissiveIntensity: 0.6,
                roughness: 0.22,
                metalness: 0.12
            },
            light: {
                color: new THREE.Color(spec.light),
                emissive: new THREE.Color(spec.emissive),
                emissiveIntensity: 0.75,
                roughness: 0.18,
                metalness: 0.05
            }
        });
        const chip = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h, 0.12), mat);
        chip.position.set(spec.x, spec.y, spec.z);
        docSignals.add(chip);

        const anchor = new THREE.Vector3(spec.x + 0.15, spec.y - 0.6, 0.02);
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
            anchor,
            new THREE.Vector3(spec.x + 0.15, spec.y - 0.2, 0.3),
            chip.position.clone().add(new THREE.Vector3(0, 0, -0.1))
        ]);
        const stem = new THREE.Line(lineGeom, stemMat.clone());
        docSignals.add(stem);
    }

    const tagLineMat = new THREE.LineBasicMaterial({
        color: 0x9ad1ff,
        transparent: true,
        opacity: 0.7,
        depthTest: false
    });

    const regions = [];
    const nodes = [];
    const tags = [];
    for (const spec of regionSpecs) {
        const geom = new THREE.BoxGeometry(spec.w, spec.h, 0.14);
        const regionMat = registerMaterial(new THREE.MeshStandardMaterial({
            color: spec.c,
            map: regionGrid,
            roughnessMap: regionRough,
            bumpMap: regionRough,
            bumpScale: 0.08,
            metalness: 0.32,
            roughness: 0.35,
            emissive: 0x06101a,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.92
        }), {
            dark: {
                color: new THREE.Color(spec.c),
                emissive: new THREE.Color(0x06101a),
                emissiveIntensity: 0.4,
                roughness: 0.35,
                metalness: 0.32,
                bumpScale: 0.08,
                map: regionGrid
            },
            light: {
                color: new THREE.Color(spec.light),
                emissive: new THREE.Color(spec.emissive),
                emissiveIntensity: 0.55,
                roughness: 0.18,
                metalness: 0.08,
                bumpScale: 0.02,
                map: regionGridLight
            }
        });
        const mesh = new THREE.Mesh(geom, regionMat);
        mesh.position.set(spec.x, spec.y, spec.z);
        mesh.scale.set(0.98, 0.98, 1);
        mesh.userData.home = mesh.position.clone();
        mesh.userData.scatter = new THREE.Vector3(
            spec.x + (Math.random() - 0.5) * 2.2,
            spec.y + (Math.random() - 0.5) * 1.4,
            spec.z + 0.25 + Math.random() * 0.85
        );

        const e = new THREE.EdgesGeometry(geom);
        const l = new THREE.LineSegments(
            e,
            new THREE.LineBasicMaterial({
                color: 0x00f3ff,
                transparent: true,
                opacity: 0.18
            })
        );
        mesh.add(l);

        regions.push(mesh);
        docGroup.add(mesh);

        const node = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0x00f3ff,
                transparent: true,
                opacity: 0.9
            })
        );
        node.position.copy(mesh.position).add(new THREE.Vector3(0, 0, 0.38));
        nodes.push(node);
        docGroup.add(node);

        const tagGroup = new THREE.Group();
        tagGroup.position.copy(mesh.position);
        const anchorOffset = new THREE.Vector3(spec.w * 0.45, 0.0, 0.12);
        const labelOffset = new THREE.Vector3(spec.w * 0.45 + (spec.label === 'Table' ? -1.5 : 1.5), 0.55, 0.85);
        const midOffset = anchorOffset.clone().lerp(labelOffset, 0.5);
        midOffset.z += 0.2;

        const tagSprite = makeTagSprite(spec.label, spec.c);
        tagSprite.position.copy(labelOffset);
        tagGroup.add(tagSprite);

        const lineGeom = new THREE.BufferGeometry();
        lineGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
        const tagLine = new THREE.Line(lineGeom, tagLineMat.clone());
        tagGroup.add(tagLine);

        const anchorDot = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 12, 12),
            new THREE.MeshBasicMaterial({
                color: spec.c,
                transparent: true,
                opacity: 0.9
            })
        );
        anchorDot.position.copy(anchorOffset);
        tagGroup.add(anchorDot);

        tagGroup.userData = {
            anchorOffset,
            labelOffset,
            midOffset
        };
        tags.push({ group: tagGroup, line: tagLine, anchorIndex: regions.length - 1 });
        docGroup.add(tagGroup);
    }

    const linkMat = new THREE.LineBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
    });
    const linkGeom = new THREE.BufferGeometry();
    const linkPos = new Float32Array(18);
    linkGeom.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
    const links = new THREE.LineSegments(linkGeom, linkMat);
    docGroup.add(links);

    objects.doc = {
        group: docGroup,
        paper,
        regions,
        nodes,
        tags,
        links
    };

    const ragNodes = [];
    const ragEdges = [];
    const ragNodeMat = new THREE.MeshBasicMaterial({
        color: 0x58a6ff,
        transparent: true,
        opacity: 0.9
    });
    const ragHighlightMat = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 1
    });

    const ragCount = isMobile ? 18 : 34;
    for (let i = 0; i < ragCount; i++) {
        const n = new THREE.Mesh(
            new THREE.SphereGeometry(i % 5 === 0 ? 0.1 : 0.07, 20, 20),
            (i % 7 === 0 ? ragHighlightMat : ragNodeMat).clone()
        );
        const r = 1.7 + Math.random() * 1.2;
        const a = Math.random() * Math.PI * 2;
        const b = (Math.random() - 0.5) * 1.5;
        n.position.set(Math.cos(a) * r, b, Math.sin(a) * r);
        n.userData.seed = Math.random() * 10;
        n.userData.base = n.position.clone();
        ragNodes.push(n);
        ragGroup.add(n);
    }

    const ragEdgeMat = new THREE.LineBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending
    });
    for (let i = 0; i < ragNodes.length; i++) {
        const a = ragNodes[i];
        const b = ragNodes[(i * 7 + 3) % ragNodes.length];
        const g = new THREE.BufferGeometry().setFromPoints([a.position, b.position]);
        const l = new THREE.Line(g, ragEdgeMat.clone());
        ragEdges.push(l);
        ragGroup.add(l);
    }

    const ragTubes = [];
    const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        metalness: 0.85,
        roughness: 0.25,
        emissive: 0x00f3ff,
        emissiveIntensity: 0.9
    });
    for (let i = 0; i < Math.min(8, ragNodes.length); i++) {
        const a = ragNodes[i];
        const b = ragNodes[(i * 5 + 7) % ragNodes.length];
        const curve = new THREE.CatmullRomCurve3([
            a.position.clone(),
            a.position.clone().lerp(b.position, 0.5).add(new THREE.Vector3(0, 0.25, 0)),
            b.position.clone()
        ]);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.012, 8, false), tubeMat.clone());
        tube.material.transparent = true;
        tube.material.opacity = 0.55;
        ragTubes.push(tube);
        ragGroup.add(tube);
    }

    const query = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.25, 1),
        new THREE.MeshBasicMaterial({
            color: 0x7000ff,
            transparent: true,
            opacity: 0.9,
            wireframe: true
        })
    );
    query.position.set(-2.2, 0.6, 0);
    ragGroup.add(query);

    const ragLabel = makeLabelSprite('Retrieve + Ground', '#00f3ff');
    ragLabel.position.set(-2.0, 1.35, 0);
    ragGroup.add(ragLabel);

    objects.rag = {
        group: ragGroup,
        nodes: ragNodes,
        edges: ragEdges,
        query,
        tubes: ragTubes
    };

    const conveyor = new THREE.Group();
    pipelineGroup.add(conveyor);

    const metalRough = makeNoiseTexture(512, 512, 0.22);
    metalRough.repeat.set(3, 3);
    const metalGrid = makeGridTexture(1024, 1024, 'rgba(255,255,255,0.06)', 'rgba(10,12,16,1)');
    const metalGridLight = makeGridTexture(1024, 1024, 'rgba(120,150,210,0.2)', 'rgba(236,242,255,1)');
    metalGrid.repeat.set(2.0, 2.0);
    metalGridLight.repeat.set(2.0, 2.0);

    const machineMat = registerMaterial(new THREE.MeshStandardMaterial({
        color: 0x0a0e14,
        map: metalGrid,
        roughnessMap: metalRough,
        bumpMap: metalRough,
        bumpScale: 0.12,
        metalness: 0.85,
        roughness: 0.35,
        emissive: 0x05070a,
        emissiveIntensity: 0.25
    }), {
        dark: {
            color: new THREE.Color(0x0a0e14),
            emissive: new THREE.Color(0x05070a),
            emissiveIntensity: 0.25,
            roughness: 0.35,
            metalness: 0.85,
            bumpScale: 0.12,
            map: metalGrid
        },
        light: {
            color: new THREE.Color(0xd2d9e8),
            emissive: new THREE.Color(0x8096c8),
            emissiveIntensity: 0.28,
            roughness: 0.26,
            metalness: 0.18,
            bumpScale: 0.04,
            map: metalGridLight
        }
    });

    const glassMat = registerMaterial(new THREE.MeshPhysicalMaterial({
        color: 0x0b1b22,
        metalness: 0.0,
        roughness: 0.05,
        transmission: 0.85,
        thickness: 0.6,
        transparent: true,
        opacity: 0.9,
        emissive: 0x001a1e,
        emissiveIntensity: 0.45
    }), {
        dark: {
            color: new THREE.Color(0x0b1b22),
            emissive: new THREE.Color(0x001a1e),
            emissiveIntensity: 0.45,
            roughness: 0.05
        },
        light: {
            color: new THREE.Color(0xc9d8f2),
            emissive: new THREE.Color(0x7ea8e0),
            emissiveIntensity: 0.35,
            roughness: 0.08
        }
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.35, 2.1), cloneThemedMaterial(machineMat));
    base.position.set(0, -1.15, 0);
    conveyor.add(base);

    const railGeom = new THREE.BoxGeometry(7.0, 0.12, 0.24);
    const rail1 = new THREE.Mesh(railGeom, cloneThemedMaterial(machineMat));
    const rail2 = new THREE.Mesh(railGeom, cloneThemedMaterial(machineMat));
    rail1.position.set(0, -0.95, -0.75);
    rail2.position.set(0, -0.95, 0.75);
    conveyor.add(rail1);
    conveyor.add(rail2);

    const frameMat = cloneThemedMaterial(machineMat);
    const sideFrameL = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 0.12), frameMat);
    const sideFrameR = sideFrameL.clone();
    sideFrameL.position.set(0, -0.7, -1.05);
    sideFrameR.position.set(0, -0.7, 1.05);
    conveyor.add(sideFrameL);
    conveyor.add(sideFrameR);

    const pillarGeom = new THREE.BoxGeometry(0.18, 1.6, 0.18);
    const pillarPositions = [-3.4, -1.2, 1.2, 3.4];
    for (const x of pillarPositions) {
        const pL = new THREE.Mesh(pillarGeom, frameMat.clone());
        const pR = new THREE.Mesh(pillarGeom, frameMat.clone());
        pL.position.set(x, 0.1, -1.05);
        pR.position.set(x, 0.1, 1.05);
        conveyor.add(pL);
        conveyor.add(pR);
    }

    const overhead = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 0.25), cloneThemedMaterial(frameMat));
    overhead.position.set(0, 0.98, 0);
    conveyor.add(overhead);

    const conduitMat = registerMaterial(new THREE.MeshStandardMaterial({
        color: 0x0a0f18,
        metalness: 0.75,
        roughness: 0.25,
        emissive: 0x102036,
        emissiveIntensity: 0.25
    }), {
        dark: {
            color: new THREE.Color(0x0a0f18),
            emissive: new THREE.Color(0x102036),
            emissiveIntensity: 0.25,
            roughness: 0.25,
            metalness: 0.75
        },
        light: {
            color: new THREE.Color(0xcbd8ed),
            emissive: new THREE.Color(0x7e98c6),
            emissiveIntensity: 0.25,
            roughness: 0.24,
            metalness: 0.22
        }
    });
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 6.8, 20), conduitMat);
    conduit.rotation.z = Math.PI / 2;
    conduit.position.set(0, 0.65, -1.25);
    conveyor.add(conduit);

    const conduit2 = conduit.clone();
    conduit2.position.set(0, 0.35, 1.25);
    conveyor.add(conduit2);

    const beltTex = makeCanvasTexture(1024, 256, (ctx, W, H) => {
        ctx.fillStyle = 'rgba(6,7,10,1)';
        ctx.fillRect(0, 0, W, H);
        for (let x = 0; x < W; x += 44) {
            ctx.fillStyle = 'rgba(0,243,255,0.08)';
            ctx.fillRect(x, 0, 10, H);
        }
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        for (let y = 22; y < H; y += 22) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    });
    const beltTexLight = makeCanvasTexture(1024, 256, (ctx, W, H) => {
        ctx.fillStyle = 'rgba(236,242,255,1)';
        ctx.fillRect(0, 0, W, H);
        for (let x = 0; x < W; x += 44) {
            ctx.fillStyle = 'rgba(120,160,255,0.22)';
            ctx.fillRect(x, 0, 10, H);
        }
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = 'rgba(80,120,200,0.3)';
        ctx.lineWidth = 2;
        for (let y = 22; y < H; y += 22) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    });
    beltTex.repeat.set(1.8, 1);
    beltTexLight.repeat.set(1.8, 1);
    const beltMat = registerMaterial(new THREE.MeshStandardMaterial({
        color: 0x07090c,
        map: beltTex,
        roughness: 0.65,
        metalness: 0.2,
        emissive: 0x001116,
        emissiveIntensity: 0.55
    }), {
        dark: {
            color: new THREE.Color(0x07090c),
            emissive: new THREE.Color(0x001116),
            emissiveIntensity: 0.55,
            roughness: 0.65,
            metalness: 0.2,
            map: beltTex
        },
        light: {
            color: new THREE.Color(0xd2deef),
            emissive: new THREE.Color(0x7ea0d2),
            emissiveIntensity: 0.22,
            roughness: 0.36,
            metalness: 0.06,
            map: beltTexLight
        }
    });

    const belt = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.11, 1.25), beltMat);
    belt.position.set(0, -0.86, 0);
    conveyor.add(belt);

    const rollerMat = registerMaterial(new THREE.MeshStandardMaterial({
        color: 0x10151d,
        metalness: 0.9,
        roughness: 0.25,
        emissive: 0x020308,
        emissiveIntensity: 0.2
    }), {
        dark: {
            color: new THREE.Color(0x10151d),
            emissive: new THREE.Color(0x020308),
            emissiveIntensity: 0.2,
            roughness: 0.25,
            metalness: 0.9
        },
        light: {
            color: new THREE.Color(0xc4d3ea),
            emissive: new THREE.Color(0x6f8dc5),
            emissiveIntensity: 0.24,
            roughness: 0.26,
            metalness: 0.32
        }
    });
    const rollers = [];
    for (let i = 0; i < 10; i++) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.35, 24), rollerMat);
        r.rotation.z = Math.PI / 2;
        r.position.set(-3.2 + i * 0.72, -0.8, 0);
        rollers.push(r);
        conveyor.add(r);
    }

    const emissiveStripMat = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.35
    });
    const stripL = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.12), emissiveStripMat);
    stripL.rotation.x = -Math.PI / 2;
    stripL.position.set(0, -0.97, -0.95);
    conveyor.add(stripL);
    const stripR = stripL.clone();
    stripR.material = new THREE.MeshBasicMaterial({
        color: 0x7c5bff,
        transparent: true,
        opacity: 0.3
    });
    stripR.position.set(0, -0.97, 0.95);
    conveyor.add(stripR);

    const stationNames = ['Parse', 'Normalize', 'Handwriting', 'Enrich'];
    const stations = [];
    const stationHousings = [];
    const stationLights = [];
    const stationCores = [];
    const stationWindows = [];

    for (let i = 0; i < stationNames.length; i++) {
        const s = new THREE.Group();
        s.position.set(-2.7 + i * 1.8, -0.05, 0);

        const housing = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.05, 1.6), cloneThemedMaterial(machineMat));
        housing.position.set(0, 0.55, 0);
        s.add(housing);

        const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.25, 0.06), cloneThemedMaterial(glassMat));
        windowPane.position.set(0, 0.65, 0.83);
        s.add(windowPane);

        const innerCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({
            color: 0x0b1220,
            metalness: 0.8,
            roughness: 0.25,
            emissive: i === 2 ? 0x2a6fff : 0x00f3ff,
            emissiveIntensity: 0.9
        }));
        innerCore.position.set(0, 0.62, 0.32);
        s.add(innerCore);

        const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.08), new THREE.MeshBasicMaterial({
            color: i === 2 ? 0x58a6ff : 0x00f3ff,
            transparent: true,
            opacity: 0.5
        }));
        lightBar.position.set(0, 1.65, 0.82);
        s.add(lightBar);

        const panelMat = registerMaterial(new THREE.MeshStandardMaterial({
            color: 0x0b1624,
            metalness: 0.3,
            roughness: 0.35,
            emissive: i === 2 ? 0x2a6fff : 0x00f3ff,
            emissiveIntensity: 0.55
        }), {
            dark: {
                color: new THREE.Color(0x0b1624),
                emissive: new THREE.Color(i === 2 ? 0x2a6fff : 0x00f3ff),
                emissiveIntensity: 0.55,
                roughness: 0.35,
                metalness: 0.3
            },
            light: {
                color: new THREE.Color(0xd2def2),
                emissive: new THREE.Color(i === 2 ? 0x6f97e0 : 0x4bb6de),
                emissiveIntensity: 0.55,
                roughness: 0.25,
                metalness: 0.08
            }
        });
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.08), panelMat);
        panel.position.set(0.4, 0.15, 0.88);
        s.add(panel);

        const label = makeLabelSprite(stationNames[i], i === 2 ? '#58a6ff' : '#00f3ff');
        label.position.set(-0.35, 2.0, 0);
        s.add(label);

        stations.push(s);
        stationHousings.push(housing);
        stationLights.push(lightBar);
        stationCores.push(innerCore);
        stationWindows.push(windowPane);
        conveyor.add(s);
    }

    const gantry = new THREE.Group();
    conveyor.add(gantry);

    const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.2, 0.22), machineMat.clone());
    gantryBeam.position.set(0, 1.25, 0);
    gantry.add(gantryBeam);

    const gantryCoreMat = registerMaterial(new THREE.MeshStandardMaterial({
        color: 0x0e1420,
        metalness: 0.6,
        roughness: 0.25,
        emissive: 0x00f3ff,
        emissiveIntensity: 0.35
    }), {
        dark: {
            color: new THREE.Color(0x0e1420),
            emissive: new THREE.Color(0x00f3ff),
            emissiveIntensity: 0.35,
            roughness: 0.25,
            metalness: 0.6
        },
        light: {
            color: new THREE.Color(0xccdaef),
            emissive: new THREE.Color(0x7fb2da),
            emissiveIntensity: 0.38,
            roughness: 0.24,
            metalness: 0.16
        }
    });

    const gantryModules = [-2.2, -0.2, 1.8];
    for (const x of gantryModules) {
        const module = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.5), cloneThemedMaterial(machineMat));
        module.position.set(x, 1.05, 0.0);
        gantry.add(module);

        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 16), gantryCoreMat);
        core.rotation.x = Math.PI / 2;
        core.position.set(x, 1.05, 0.35);
        gantry.add(core);

        const cable = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, 0.9, 0.3),
                new THREE.Vector3(x, 0.35, 0.6),
                new THREE.Vector3(x, 0.05, 0.75)
            ]),
            new THREE.LineBasicMaterial({
                color: 0x7fb6ff,
                transparent: true,
                opacity: 0.6
            })
        );
        gantry.add(cable);
    }

    const sideTank = new THREE.Group();
    sideTank.position.set(3.6, -0.2, -1.35);
    conveyor.add(sideTank);
    const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 24), cloneThemedMaterial(machineMat));
    tankBody.position.set(0, 0.35, 0);
    sideTank.add(tankBody);
    const tankCap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 24), cloneThemedMaterial(machineMat));
    tankCap.position.set(0, 0.95, 0);
    sideTank.add(tankCap);

    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 12, 20), cloneThemedMaterial(machineMat));
    valve.rotation.x = Math.PI / 2;
    valve.position.set(0, 0.35, 0.35);
    sideTank.add(valve);

    const pipeDoc = new THREE.Mesh(paperGeom, cloneThemedMaterial(paperMat));
    pipeDoc.scale.set(0.72, 0.72, 0.72);
    pipeDoc.position.set(-3.55, -0.48, 0);
    pipeDoc.rotation.set(0.12, 0.35, 0);
    conveyor.add(pipeDoc);

    const scanBeam = new THREE.Mesh(
        new THREE.PlaneGeometry(1.35, 1.85),
        new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    scanBeam.position.set(-0.9, 0.65, 0.84);
    conveyor.add(scanBeam);

    const particleCount = isMobile ? 260 : 520;
    const sparkGeom = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(particleCount * 3);
    const sparkVel = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        sparkPos[ix] = (Math.random() - 0.5) * 1.8;
        sparkPos[ix + 1] = 0.15 + Math.random() * 1.6;
        sparkPos[ix + 2] = (Math.random() - 0.5) * 0.9;
        sparkVel[ix] = (Math.random() - 0.5) * 0.007;
        sparkVel[ix + 1] = 0.003 + Math.random() * 0.01;
        sparkVel[ix + 2] = (Math.random() - 0.5) * 0.007;
    }
    sparkGeom.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
        color: 0x00f3ff,
        size: isMobile ? 0.018 : 0.022,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const sparks = new THREE.Points(sparkGeom, sparkMat);
    sparks.position.set(0.95, -0.1, 0);
    conveyor.add(sparks);

    const strokes = new THREE.Group();
    strokes.position.set(1.0, 0.9, 0.95);
    pipelineGroup.add(strokes);

    const strokeMat = new THREE.LineBasicMaterial({
        color: 0x58a6ff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
    });

    const makeStroke = (points) => {
        const g = new THREE.BufferGeometry().setFromPoints(points);
        return new THREE.Line(g, strokeMat.clone());
    };

    const strokesSet = [
        makeStroke([
            new THREE.Vector3(-0.9, 0.0, 0.0),
            new THREE.Vector3(-0.5, 0.18, 0.0),
            new THREE.Vector3(-0.2, 0.05, 0.0),
            new THREE.Vector3(0.1, 0.22, 0.0),
            new THREE.Vector3(0.5, 0.12, 0.0)
        ]),
        makeStroke([
            new THREE.Vector3(-0.85, -0.25, 0.0),
            new THREE.Vector3(-0.55, -0.38, 0.0),
            new THREE.Vector3(-0.15, -0.3, 0.0),
            new THREE.Vector3(0.25, -0.46, 0.0),
            new THREE.Vector3(0.65, -0.3, 0.0)
        ]),
        makeStroke([
            new THREE.Vector3(-0.7, 0.42, 0.0),
            new THREE.Vector3(-0.3, 0.55, 0.0),
            new THREE.Vector3(0.05, 0.48, 0.0),
            new THREE.Vector3(0.45, 0.62, 0.0)
        ])
    ];
    for (const s of strokesSet) {
        s.scale.set(1.2, 1.2, 1.2);
        strokes.add(s);
    }

    objects.pipeline = {
        group: pipelineGroup,
        conveyor,
        stations,
        stationHousings,
        stationLights,
        stationCores,
        stationWindows,
        doc: pipeDoc,
        beltTex,
        beltTexLight,
        rollers,
        scanBeam,
        sparks,
        sparkVel,
        strokes,
        strokesSet
    };

    objects.materials = materials;

    return objects;
}
