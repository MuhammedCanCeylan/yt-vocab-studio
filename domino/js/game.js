// game.js - Array Material Çözümlü, Kusursuz Hayalet Döngüsü ve Sis Motoru
const Game = {
    scene: null, camera: null, renderer: null, clock: null,
    sparks: null, redLight: null, dirLight: null, 
    isPlaying: false, isPaused: false, score: 0,
    
    infiniteProps: [], 

    init() {
        this.scene = new THREE.Scene();
        
        this.scene.background = new THREE.Color(0x050302);
        this.scene.fog = new THREE.Fog(0x050302, 10, 30); 

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(-6, 4.5, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.scene.add(new THREE.AmbientLight(0xffa500, 0.6)); 

        this.dirLight = new THREE.DirectionalLight(0xff5500, 2.0);
        this.dirLight.position.set(20, 30, -10);
        this.dirLight.castShadow = true;
        this.scene.add(this.dirLight);

        this.redLight = new THREE.PointLight(0xff0000, 2.5, 30);
        this.redLight.position.set(0, 4, 3);
        this.scene.add(this.redLight);

        const floorCanvas = document.createElement('canvas');
        floorCanvas.width = 512; floorCanvas.height = 512;
        const ctx = floorCanvas.getContext('2d');
        ctx.fillStyle = '#080503'; ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#662200'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, 512, 512);
        const floorTex = new THREE.CanvasTexture(floorCanvas);
        floorTex.wrapS = THREE.RepeatWrapping; floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(100, 100); 

        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        const groundMat = new THREE.MeshStandardMaterial({ 
            map: floorTex, color: 0xcccccc, roughness: 0.15, metalness: 0.6
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.createParticles();
        this.loadLevel();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        requestAnimationFrame(() => this.animate());
    },

    loadLevel() {
        const activeLevelName = localStorage.getItem('domino_active_level');
        if (!activeLevelName) return;

        const allLevels = JSON.parse(localStorage.getItem('domino_custom_levels') || '{}');
        const levelData = allLevels[activeLevelName];
        if (!levelData) return;

        console.log(`🚀 [Oyun Motoru] Harita Yüklendi: ${activeLevelName}`);

        const state = levelData.engineState;
        if (state) {
            if (typeof DominoManager !== 'undefined') {
                DominoManager.devSettings.camY = state.cameraPosY;
                DominoManager.devSettings.camZ = state.cameraPosZ;
                DominoManager.devSettings.camOffsetX = state.cameraPosX;
                DominoManager.devSettings.camLookY = state.cameraTargetY;
                DominoManager.devSettings.camLookZ = state.cameraTargetZ;
                DominoManager.devSettings.spacing = state.spacing || 0.9;
            }

            this.dirLight.position.set(state.lightX || 20, state.lightY || 30, state.lightZ || -10);
            if (state.lightColor) this.dirLight.color.set(state.lightColor);
            if (state.lightIntensity) this.dirLight.intensity = state.lightIntensity;
            
            if (state.bgColor) {
                this.scene.background.set(state.bgColor);
                this.scene.fog = new THREE.Fog(state.bgColor, 10, 30);
            }
        }

        if (levelData.objects) {
            levelData.objects.forEach(objData => {
                if (objData.type === 'pointlight') {
                    const l = new THREE.PointLight(0xffffff, 2, 50);
                    l.position.fromArray(objData.position);
                    this.scene.add(l);
                    return;
                }
                if (objData.type === 'spotlight') {
                    const l = new THREE.SpotLight(0xffffff, 2);
                    l.position.fromArray(objData.position);
                    l.angle = Math.PI / 6;
                    l.castShadow = true;
                    this.scene.add(l);
                    return;
                }

                let geo;
                if (objData.type === 'BoxGeometry') geo = new THREE.BoxGeometry(2, 2, 2);
                else if (objData.type === 'PlaneGeometry') { geo = new THREE.PlaneGeometry(10, 10); geo.rotateX(-Math.PI / 2); }
                else if (objData.type === 'SphereGeometry') geo = new THREE.SphereGeometry(1.5, 32, 32);
                else if (objData.type === 'CylinderGeometry') geo = new THREE.CylinderGeometry(1, 1, 3, 32);
                else if (objData.type === 'ConeGeometry') geo = new THREE.ConeGeometry(1.5, 3, 32);
                else if (objData.type === 'TorusGeometry') geo = new THREE.TorusGeometry(1.5, 0.4, 16, 100);
                else geo = new THREE.BoxGeometry(2, 2, 2); 

                const materials = objData.materials.map(m => new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.5, metalness: 0.3 }));
                const mesh = new THREE.Mesh(geo, materials.length === 1 ? materials[0] : materials);
                
                mesh.position.fromArray(objData.position);
                mesh.rotation.fromArray(objData.rotation);
                mesh.scale.fromArray(objData.scale);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                mesh.userData = {
                    hasPhysics: objData.hasPhysics,
                    isInfinite: objData.isInfinite
                };

                if (objData.isInfinite) {
                    const count = objData.infCount || 10;
                    const spacing = objData.infSpacing || 5;
                    const groupName = objData.name; 

                    mesh.userData.treadmillGroup = groupName;
                    mesh.userData.infSpacing = spacing;
                    
                    this.infiniteProps.push(mesh);
                    this.scene.add(mesh);

                    for (let i = 1; i <= count; i++) {
                        const ghost = mesh.clone();
                        ghost.position.x += (i * spacing);
                        
                        const opacity = 1 - (i / (count + 1));
                        
                        // 🔥 ÇÖZÜM: MATERIAL DİZİSİ KONTROLÜ 🔥
                        ghost.traverse(child => {
                            if (child.isMesh && child.material) {
                                // Eğer material bir diziyse (Array) her birini ayrı ayrı kopyala
                                if (Array.isArray(child.material)) {
                                    child.material = child.material.map(m => {
                                        const clonedMat = m.clone();
                                        clonedMat.transparent = true;
                                        clonedMat.opacity = opacity;
                                        return clonedMat;
                                    });
                                } else {
                                    // Eğer tek bir objeyse direkt kopyala
                                    child.material = child.material.clone();
                                    child.material.transparent = true;
                                    child.material.opacity = opacity;
                                }
                                child.castShadow = false; 
                            }
                        });
                        
                        ghost.userData = { 
                            isInfinite: true, 
                            infSpacing: spacing, 
                            treadmillGroup: groupName,
                            isGhost: true 
                        };
                        
                        this.scene.add(ghost);
                        this.infiniteProps.push(ghost);
                    }
                } else {
                    this.scene.add(mesh);
                }
            });
        }
    },

    createParticles() {
        const geom = new THREE.BufferGeometry();
        const pos = [];
        for(let i = 0; i < 400; i++) {
            pos.push((Math.random() - 0.5) * 150, Math.random() * 20, (Math.random() - 0.5) * 30);
        }
        geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        this.sparks = new THREE.Points(geom, mat);
        this.scene.add(this.sparks);
    },

    start() {
        this.isPlaying = true;
        this.score = 0;
        
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.style.display = 'flex';
        
        const hudScore = document.getElementById('hud-score');
        if (hudScore) hudScore.innerText = "0";
        
        const editorBtn = document.getElementById('btn-open-editor');
        if (editorBtn) editorBtn.style.display = 'none';

        if (typeof DominoManager !== 'undefined') DominoManager.resetChain();
        if (typeof UI !== 'undefined' && UI.startNewTurn) UI.startNewTurn();
        if (typeof AudioEngine !== 'undefined' && AudioEngine.playBGM) AudioEngine.playBGM();
    },

    resetToMenu() {
        this.isPlaying = false;
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'flex';
        
        const editorBtn = document.getElementById('btn-open-editor');
        if (editorBtn) editorBtn.style.display = 'flex';

        if (typeof DominoManager !== 'undefined' && DominoManager.resetChain) DominoManager.resetChain();
    },

    gameOver() {
        this.isPlaying = false;
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.style.display = 'none';
        
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.style.display = 'flex';
        
        const finalScore = document.getElementById('final-score');
        if (finalScore) finalScore.innerText = this.score;
        
        const editorBtn = document.getElementById('btn-open-editor');
        if (editorBtn) editorBtn.style.display = 'flex';

        if (typeof AudioEngine !== 'undefined' && AudioEngine.playBreak) AudioEngine.playBreak();
    },

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (!this.isPaused && this.sparks) {
            const pos = this.sparks.geometry.attributes.position.array;
            for(let i = 1; i < pos.length; i += 3) {
                pos[i] += dt * 1.5;
                if (pos[i] > 20) pos[i] = 0;
            }
            this.sparks.geometry.attributes.position.needsUpdate = true;
        }

        if (this.infiniteProps && this.infiniteProps.length > 0) {
            this.infiniteProps.forEach(prop => {
                if (prop.position.x < this.camera.position.x - 20) {
                    let maxX = prop.position.x;
                    this.infiniteProps.forEach(p => {
                        if (p.userData.treadmillGroup === prop.userData.treadmillGroup) {
                            if (p.position.x > maxX) maxX = p.position.x;
                        }
                    });
                    
                    prop.position.x = maxX + (prop.userData.infSpacing || 5); 
                    
                    if (prop.userData.body) {
                        prop.userData.body.setTranslation({x: prop.position.x, y: prop.position.y, z: prop.position.z}, false);
                    }
                }
            });
        }

        if (typeof DominoManager !== 'undefined' && DominoManager.update) DominoManager.update(dt);
        if (typeof UI !== 'undefined' && UI.updateTimer && this.isPlaying && !this.isPaused) UI.updateTimer(dt);

        this.renderer.render(this.scene, this.camera);
    }
};