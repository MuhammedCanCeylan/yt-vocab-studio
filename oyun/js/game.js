// game.js – Çekirdek oyun motoru
const GameEngine = {
    scene: null, camera: null, renderer: null, clock: null, dirLight: null, ambientLight: null, stars: null, rain: null,
    groundMesh: null,
    FIXED_DT: 1 / 60, accumulator: 0, LANE_POS: 3.5, baseSpeed: 0.25, gameSpeed: 0.25, targetGameSpeed: 0.25,
    isPlaying: false, isLevelComplete: false, isTestMode: false, gameMode: 'level', currentScore: 0, wordsAnswered: 0, collectedCoins: 0, wordsToWin: 10,
    combo: 0, maxCombo: 0, mistakes: 0, difficulty: 'easy', currentBiomeText: '', lastCoinValue: -1, isLoaded: false,
    currentFogColor: new THREE.Color(0xdeb887), targetFogColor: new THREE.Color(0xdeb887), targetLightIntensity: 0.8, targetAmbientIntensity: 0.6,
    wordPool: [], translationDict: {}, currentEnWord: "", currentCorrectTr: "", models: {}, monsters: [], particleMats: {},
    
    // TEST MODU, MODDER & WORLD BUILDER DEĞİŞKENLERİ
    testPivot: null, testItems: [], currentTestIndex: 0, testBiomeIndex: 1, testRefChar: null, testCameraTarget: null, testBaseDist: 10,
    snapEnabled: false, gridVisible: true, fogVisible: true, testHeightOffset: 0, gridHelper: null, orbitControls: null, currentTestItem: null,
    previewGroup: null, 
    worldIndexCounter: 3, customWorlds: {},

    init() {
        if(typeof MarketManager !== 'undefined') MarketManager.init();
        if(typeof safeSetText !== 'undefined') safeSetText('menu-total-coins', typeof MarketManager !== 'undefined' ? MarketManager.coins : 0);
        if(typeof StatsManager !== 'undefined') StatsManager.updateMenuStats();

        // LocalStorage'dan Model Ayarlarını Geri Yükle
        const savedModels = typeof safeParseJSON !== 'undefined' ? safeParseJSON('vocab_models', null) : null;
        if (savedModels) {
            for(let k in savedModels) {
                if(!ModelAyarlari[k]) ModelAyarlari[k] = savedModels[k];
                else Object.assign(ModelAyarlari[k], savedModels[k]);
            }
        }
        
        // LocalStorage'dan Dünyaları Geri Yükle
        const savedWorlds = typeof safeParseJSON !== 'undefined' ? safeParseJSON('vocab_worlds', null) : null;
        if (savedWorlds) {
            this.customWorlds = savedWorlds;
            let maxId = 3;
            for(let id in savedWorlds) {
                if(parseInt(id) > maxId) maxId = parseInt(id);
            }
            this.worldIndexCounter = maxId;
        } else {
            this.worldIndexCounter = 4;
            this.customWorlds["4"] = { name: "✨ Modlu Ortam 1", roadStyle: "asphalt", groundColor: "#2d5a27", fogColor: "#87CEEB", rules: [] };
        }

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(this.currentFogColor, 20, 100);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        this.camera.position.set(0, 5, 12);
        this.camera.lookAt(0, 2, -15);

        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        this.renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        this.clock = new THREE.Clock();

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);
        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(20, 50, 20);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = isMobile ? 512 : 1024;
        this.dirLight.shadow.mapSize.height = isMobile ? 512 : 1024;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 150;
        this.dirLight.shadow.camera.left = -40;
        this.dirLight.shadow.camera.right = 40;
        this.dirLight.shadow.camera.top = 40;
        this.dirLight.shadow.camera.bottom = -40;
        this.scene.add(this.dirLight);

        this.groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 1.0 }));
        this.groundMesh.rotation.x = -Math.PI/2;
        this.groundMesh.position.y = -0.05; 
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);

        const starGeo = new THREE.BufferGeometry();
        const starCount = 400;
        const positions = new Float32Array(starCount * 3);
        for(let i=0; i < starCount * 3; i+=3) {
            positions[i] = (Math.random() - 0.5) * 400;
            positions[i+1] = Math.random() * 100 + 20;
            positions[i+2] = (Math.random() - 0.5) * 400 - 50;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0 }));
        this.scene.add(this.stars);

        const rainGeo = new THREE.BufferGeometry();
        const rainCount = 500;
        const rainPos = new Float32Array(rainCount * 3);
        for(let i=0; i < rainCount * 3; i+=3) {
            rainPos[i] = (Math.random()-0.5)*200;
            rainPos[i+1] = Math.random()*50;
            rainPos[i+2] = (Math.random()-0.5)*200;
        }
        rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
        this.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.1, transparent: true, opacity: 0 }));
        this.scene.add(this.rain);

        if(typeof AudioManager !== 'undefined') AudioManager.init(this.camera);

        if(typeof AssetManager !== 'undefined') {
            AssetManager.loadAll((progress, currentFile) => {
                const bar = document.getElementById('loading-bar');
                if(bar) bar.style.width = progress + '%';
                if(typeof safeSetText !== 'undefined') safeSetText('current-asset', currentFile);
            }, () => {
                if(typeof safeSetDisplay !== 'undefined') {
                    safeSetDisplay('loading-overlay', 'none');
                    safeSetDisplay('start-screen', 'flex');
                }

                if(typeof PlayerController !== 'undefined') PlayerController.init();
                if(typeof TrackManager !== 'undefined') TrackManager.init();
                if(typeof GateManager !== 'undefined') GateManager.init();
                if(typeof TrafficManager !== 'undefined') {
                    TrafficManager.init();
                    for(let key in ModelAyarlari) {
                        if(ModelAyarlari[key].category === 'obstacle' && !TrafficManager.carTypes.includes(key)) {
                            TrafficManager.carTypes.push(key);
                            TrafficManager.carPool.set(key, []);
                        }
                    }
                }

                if(window.location.search.includes('test=1') && typeof enableMenuButtons === 'function') {
                    enableMenuButtons();
                }
                this.isLoaded = true;
            });
        }

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if (typeof SpeedLines !== 'undefined') SpeedLines.resize();
        });
        requestAnimationFrame(() => this.animate());
    },

    toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => { console.log(`Tam ekran hatası: ${err.message}`); });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    },

    setRoadStyle(style) {
        if(typeof TrackManager === 'undefined' || !TrackManager.roadMesh) return;
        const mat = TrackManager.roadMesh.material;
        mat.emissive.setHex(0x000000); 
        switch(style) {
            case 'dirt': mat.color.setHex(0x3b2814); mat.roughness = 1.0; break;
            case 'stone': mat.color.setHex(0x555555); mat.roughness = 0.8; break;
            case 'cracked': mat.color.setHex(0x2a2a2a); mat.roughness = 1.0; break;
            case 'lava': mat.color.setHex(0x111111); mat.emissive.setHex(0x551100); mat.roughness = 0.3; break;
            case 'snow': mat.color.setHex(0xdddddd); mat.roughness = 0.6; break;
            default: mat.color.setHex(0x1a1a1a); mat.roughness = 0.9; break; 
        }
    },

    updateBiome() {
        const t1 = 50; const t2 = 120;
        let newBiomeText = '';
        if (this.currentScore < t1) {
            this.targetFogColor.setHex(0x87CEEB); 
            this.groundMesh.material.color.setHex(0x2d5a27); 
            this.targetLightIntensity = 0.8; this.targetAmbientIntensity = 0.6; this.dirLight.color.setHex(0xffffff);
            if(this.stars) this.stars.material.opacity = 0; if(this.rain) this.rain.material.opacity = 0;
            this.setRoadStyle('asphalt');
            newBiomeText = 'ORMAN KÖYÜ';
        } else if (this.currentScore < t2) {
            this.targetFogColor.setHex(0xe67e22);
            this.groundMesh.material.color.setHex(0x8b4513); 
            this.targetLightIntensity = 0.5; this.targetAmbientIntensity = 0.4; this.dirLight.color.setHex(0xffdcb0);
            if(this.stars) this.stars.material.opacity = 0.3; if(this.rain) this.rain.material.opacity = 0;
            this.setRoadStyle('dirt');
            newBiomeText = 'YANARDAĞ GEÇİDİ';
        } else {
            this.targetFogColor.setHex(0x111116);
            this.groundMesh.material.color.setHex(0x1a0b2e); 
            this.targetLightIntensity = 0.1; this.targetAmbientIntensity = 0.2; this.dirLight.color.setHex(0x8a9cff);
            if(this.stars) this.stars.material.opacity = 0.8; if(this.rain) this.rain.material.opacity = 0.5;
            this.setRoadStyle('stone');
            newBiomeText = 'KRİSTAL MAĞARA';
        }

        if (this.currentBiomeText !== newBiomeText) {
            this.currentBiomeText = newBiomeText;
            if(typeof safeSetText !== 'undefined') safeSetText('biome-badge', this.currentBiomeText);
        }
    },

    updateDifficulty() {
        const scores = this.gameMode === 'level' ? [0, 3, 6] : [0, 50, 150];
        const colors = ['#4EBE59', '#F5B700', '#E74C3C'];
        let idx = 0;
        if (this.currentScore >= scores[2]) idx = 2;
        else if (this.currentScore >= scores[1]) idx = 1;
        const badge = document.getElementById('difficulty-badge');
        if (badge && this.difficulty !== ['easy', 'medium', 'hard'][idx]) {
            this.difficulty = ['easy', 'medium', 'hard'][idx];
            if(typeof safeSetText !== 'undefined') safeSetText('difficulty-badge', 'ZORLUK: ' + ['KOLAY', 'ORTA', 'ZOR'][idx]);
            badge.style.borderColor = colors[idx];
            badge.style.color = colors[idx];
            badge.classList.add('show');
            if(typeof AudioManager !== 'undefined') AudioManager.play('levelup');
            setTimeout(() => badge.classList.remove('show'), 3000);
        }
    },

    startGame(mode) {
        this.gameMode = mode; this.combo = 0; this.maxCombo = 0; this.mistakes = 0; this.difficulty = 'easy';
        if(typeof safeSetDisplay !== 'undefined') {
            safeSetDisplay('start-screen', 'none'); 
            safeSetDisplay('ui-layer', 'flex'); 
            safeSetDisplay('combo-hud', 'flex');
            safeSetDisplay('target-word-container', 'block');
        }
        
        if(typeof safeSetText !== 'undefined') {
            safeSetText('progress-text', this.gameMode === 'level' ? `HEDEF: 0/${this.wordsToWin}` : `SKOR: 0`);
            safeSetText('coin-text', "0"); 
            safeSetText('combo-text', "x1");
        }

        this.currentScore = 0; this.wordsAnswered = 0; this.collectedCoins = 0;
        this.gameSpeed = this.baseSpeed; this.targetGameSpeed = this.baseSpeed;
        this.isLevelComplete = false; this.lastCoinValue = -1;
        
        const ct = document.getElementById('combo-text');
        if(ct && ct.parentElement) ct.parentElement.classList.remove('active');

        if(typeof PlayerController !== 'undefined') PlayerController.reset(); 
        if(typeof TrackManager !== 'undefined') TrackManager.reset(); 
        if(typeof GateManager !== 'undefined') GateManager.reset(); 
        if(typeof TrafficManager !== 'undefined') TrafficManager.reset();
        
        this.updateBiome(); 
        this.isPlaying = true;
        
        if(typeof GateManager !== 'undefined') GateManager.spawnGatePair(); 
        if(typeof AudioManager !== 'undefined') AudioManager.startBGM();
    },

    saveSettingsToLocal() {
        if(typeof safeSetJSON !== 'undefined') {
            safeSetJSON('vocab_models', ModelAyarlari);
            safeSetJSON('vocab_worlds', this.customWorlds);
        }
        this.logToConsole('info', '> ✅ Ayarlar tarayıcıya KALICI olarak kaydedildi!');
        const btns = document.querySelectorAll('.unity-btn.success');
        btns.forEach(btn => {
            const oldText = btn.innerText;
            btn.innerText = "KAYDEDİLDİ!";
            setTimeout(() => btn.innerText = oldText, 2000);
        });
    },

    startTestMode() {
        if(typeof safeSetDisplay !== 'undefined') {
            safeSetDisplay('start-screen', 'none'); 
            safeSetDisplay('ui-layer', 'none'); 
            safeSetDisplay('test-ui', 'flex');
        }
        this.isPlaying = false; this.isTestMode = true; this.snapEnabled = false; this.gridVisible = true; this.fogVisible = true;

        const testUI = document.getElementById('test-ui');
        const testHeader = document.querySelector('.unity-panel-header');
        if (testUI && testHeader && typeof makeDraggable === 'function') {
            makeDraggable(testUI, testHeader);
        }

        if(typeof PlayerController !== 'undefined' && PlayerController.group) PlayerController.group.visible = false;
        this.testPivot = new THREE.Group(); this.scene.add(this.testPivot);
        this.testItems = []; this.currentTestIndex = 0;

        this.gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
        this.gridHelper.position.y = -0.01;
        this.scene.add(this.gridHelper);

        const refId = (typeof MarketManager !== 'undefined' ? MarketManager.selected : null) || 'Casual_Hoodie';
        if (this.models[refId]) {
            this.testRefChar = typeof THREE.SkeletonUtils !== 'undefined' ? THREE.SkeletonUtils.clone(this.models[refId].scene) : this.models[refId].scene.clone();
            if(typeof applyModelSettings !== 'undefined') applyModelSettings(this.testRefChar, refId);
            this.testRefChar.position.set(-2.5, ModelAyarlari[refId].yOffset || 0, -15);
            this.testRefChar.rotation.y = 0; 
            this.testPivot.add(this.testRefChar);
        }

        const keys = Object.keys(ModelAyarlari);
        keys.forEach(key => {
            if(this.models[key]) {
                let mesh;
                if (this.models[key].scene) {
                    mesh = typeof THREE.SkeletonUtils !== 'undefined' ? THREE.SkeletonUtils.clone(this.models[key].scene) : this.models[key].scene.clone();
                } else { mesh = this.models[key].clone(); }
                mesh.position.set(2.5, 0, -15); mesh.visible = false; 
                this.testPivot.add(mesh); this.testItems.push({key: key, mesh: mesh});
            }
        });

        this.populateWorldSelect();
        this.populateDropdowns();

        this.testCameraTarget = new THREE.Vector3(0, 1, -15);
        this.testBaseDist = 10;
        
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.orbitControls.target.copy(this.testCameraTarget);
            this.orbitControls.enableDamping = true;
            this.orbitControls.dampingFactor = 0.1;
            this.orbitControls.minDistance = 2;
            this.orbitControls.maxDistance = 60;
            this.orbitControls.update();
        }

        this.testBiomeIndex = 1; this.applyTestBiome(); this.showTestItem(0);
        this.logToConsole('info', '> Engine Initialized. Fixed Bugs Addressed.');
        this.switchTestTab('inspector');
    },

    populateWorldSelect() {
        const select = document.getElementById('wb-biome-select');
        if(!select) return;
        select.innerHTML = `
            <option value="1">Orman Köyü (Varsayılan)</option>
            <option value="2">Yanardağ Geçidi (Varsayılan)</option>
            <option value="3">Kristal Mağara (Varsayılan)</option>
        `;
        for(let id in this.customWorlds) {
            const opt = document.createElement('option');
            opt.value = id; opt.textContent = this.customWorlds[id].name;
            opt.style.color = "#F5B700"; opt.style.fontWeight = "bold";
            select.appendChild(opt);
        }
    },

    populateDropdowns() {
        const select = document.getElementById('test-model-select');
        const modSelect = document.getElementById('wb-rule-model');
        if (select && modSelect) {
            select.innerHTML = ''; modSelect.innerHTML = '';
            this.testItems.forEach(item => {
                const opt = document.createElement('option'); opt.value = item.key; opt.textContent = item.key;
                select.appendChild(opt);
                const opt2 = document.createElement('option'); opt2.value = item.key; opt2.textContent = item.key;
                modSelect.appendChild(opt2);
            });
        }
    },

    handleAssetUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.logToConsole('info', '> Dosya yükleniyor: ' + file.name);
        const url = URL.createObjectURL(file);
        const loader = new THREE.GLTFLoader();
        const modelName = file.name.replace(/\.[^/.]+$/, ""); 
        
        loader.load(url, (gltf) => {
            URL.revokeObjectURL(url); // FAZ 1 FIX: Memory Leak Çözümü
            this.models[modelName] = gltf;
            ModelAyarlari[modelName] = { scale: 1.0, rotY: 0, yOffset: 0.0, category: 'scenery' };
            
            let mesh = typeof THREE.SkeletonUtils !== 'undefined' && gltf.scene ? THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone();
            mesh.position.set(2.5, 0, -15);
            mesh.visible = false;
            mesh.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            
            this.testPivot.add(mesh);
            this.testItems.push({key: modelName, mesh: mesh});
            
            this.populateDropdowns();
            this.showTestItemByName(modelName);
            this.logToConsole('info', '> Model başarıyla eklendi: ' + modelName);
            this.saveSettingsToLocal();
        }, undefined, (error) => {
            URL.revokeObjectURL(url); // FAZ 1 FIX
            this.logToConsole('error', '> Model yükleme hatası: ' + error);
        });
    },

    changeAssetCategory(val) {
        if (!this.currentTestItem) return;
        const key = this.currentTestItem.key;
        if (!ModelAyarlari[key]) ModelAyarlari[key] = { scale: 1, rotY: 0, yOffset: 0 };
        ModelAyarlari[key].category = val;
        this.logToConsole('info', `> ${key} türü değiştirildi: ${val}`);
        
        // FAZ 1 FIX: Obstacle Bug Çözümü
        if (typeof TrafficManager !== 'undefined') {
            if (val === 'obstacle' && !TrafficManager.carTypes.includes(key)) {
                TrafficManager.carTypes.push(key);
                TrafficManager.carPool.set(key, []);
                this.logToConsole('info', `> ${key} TrafficManager'a eklendi.`);
            } else if (val !== 'obstacle' && TrafficManager.carTypes.includes(key)) {
                const idx = TrafficManager.carTypes.indexOf(key);
                TrafficManager.carTypes.splice(idx, 1);
                this.logToConsole('info', `> ${key} TrafficManager'dan çıkarıldı.`);
            }
        }
        this.saveSettingsToLocal();
    },

    switchTestTab(tabName) {
        document.querySelectorAll('.unity-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
        const tI = document.getElementById('tab-inspector'); if(tI) tI.style.display = tabName === 'inspector' ? 'block' : 'none';
        const tW = document.getElementById('tab-world'); if(tW) tW.style.display = tabName === 'world' ? 'block' : 'none';
        const tH = document.getElementById('tab-hierarchy'); if(tH) tH.style.display = tabName === 'hierarchy' ? 'block' : 'none';
        const tC = document.getElementById('tab-console'); if(tC) tC.style.display = tabName === 'console' ? 'block' : 'none';
        
        if (tabName === 'console') this.logToConsole('info', '> Console switched.');
        if (tabName !== 'world' && this.previewGroup) {
            this.scene.remove(this.previewGroup);
            this.previewGroup = null;
        }
    },

    randomizeWorld() {
        if(this.testBiomeIndex < 4) this.createNewBiome(); 
        const cw = this.customWorlds[this.testBiomeIndex];
        
        const styles = ['asphalt', 'dirt', 'stone', 'cracked', 'lava', 'snow'];
        cw.roadStyle = styles[Math.floor(Math.random() * styles.length)];
        cw.groundColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        cw.fogColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

        cw.rules = [];
        const availableModels = Object.keys(this.models);
        if (availableModels.length === 0) {
            this.logToConsole('warn', '> Modeller yüklenmediği için kurallar atanamadı.');
            return;
        }

        const numRules = Math.floor(Math.random() * 4) + 2; 
        for(let i=0; i<numRules; i++) {
            const rModel = availableModels[Math.floor(Math.random() * availableModels.length)];
            const rChance = Math.floor(Math.random() * 40) + 10; 
            const rDist = Math.floor(Math.random() * 20) + 5; 
            cw.rules.push({ model: rModel, chance: rChance, dist: rDist });
        }

        const gColor = document.getElementById('wb-ground-color'); if(gColor) gColor.value = cw.groundColor;
        const fColor = document.getElementById('wb-fog-color'); if(fColor) fColor.value = cw.fogColor;
        const rStyle = document.getElementById('wb-road-style'); if(rStyle) rStyle.value = cw.roadStyle;

        this.updateWorldRulesUI();
        this.applyTestBiome();
        this.saveSettingsToLocal();
        this.logToConsole('info', '> 🎲 Rastgele dünya oluşturuldu!');
    },

    previewWorldRule(source) {
        if(this.testBiomeIndex < 4) {
            if(this.previewGroup) { this.scene.remove(this.previewGroup); this.previewGroup = null; }
            return;
        }
        
        if (source) {
            const val = parseFloat(document.getElementById('wb-rule-x-' + source).value) || 12;
            const other = source === 'range' ? 'num' : 'range';
            const oEl = document.getElementById('wb-rule-x-' + other);
            if(oEl) oEl.value = val;
        }
        
        const modelEl = document.getElementById('wb-rule-model');
        if(!modelEl) return;
        const modelKey = modelEl.value;
        const dist = parseFloat(document.getElementById('wb-rule-x-num').value) || 12;
        
        if (!this.previewGroup || this.previewGroup.userData.key !== modelKey) {
            if (this.previewGroup) this.scene.remove(this.previewGroup);
            if (this.models[modelKey]) {
                this.previewGroup = new THREE.Group();
                let mesh = this.models[modelKey].scene ? (typeof THREE.SkeletonUtils !== 'undefined' ? THREE.SkeletonUtils.clone(this.models[modelKey].scene) : this.models[modelKey].scene.clone()) : this.models[modelKey].clone();
                if(typeof applyModelSettings !== 'undefined') applyModelSettings(mesh, modelKey);
                
                mesh.traverse(c => {
                    if (c.isMesh && c.material) {
                        c.material = c.material.clone();
                        c.material.transparent = true;
                        c.material.opacity = 0.6;
                        c.material.emissive = new THREE.Color(0x4EBE59);
                        c.material.emissiveIntensity = 0.5;
                    }
                });
                
                this.previewGroup.add(mesh);
                this.previewGroup.userData.key = modelKey;
                this.scene.add(this.previewGroup);
            }
        }
        
        if (this.previewGroup) {
            this.previewGroup.position.set(dist, ModelAyarlari[modelKey]?.yOffset || 0, -25);
        }
    },

    createNewBiome() {
        this.worldIndexCounter++;
        const newId = this.worldIndexCounter.toString();
        this.customWorlds[newId] = { 
            name: "✨ Modlu Ortam " + (this.worldIndexCounter - 3), 
            roadStyle: "asphalt", groundColor: "#2d5a27", fogColor: "#87CEEB", rules: [] 
        };
        
        this.populateWorldSelect();
        const select = document.getElementById('wb-biome-select');
        if(select) select.value = newId;
        
        this.onWorldBiomeSelect(newId);
        this.logToConsole('info', '> Yeni Dünya Yaratıldı: ' + this.customWorlds[newId].name);
        this.saveSettingsToLocal();
    },

    onWorldBiomeSelect(val) {
        this.testBiomeIndex = parseInt(val);
        if (this.testBiomeIndex >= 4 && this.customWorlds[this.testBiomeIndex]) {
            const cw = this.customWorlds[this.testBiomeIndex];
            const gColor = document.getElementById('wb-ground-color'); if(gColor) gColor.value = cw.groundColor;
            const fColor = document.getElementById('wb-fog-color'); if(fColor) fColor.value = cw.fogColor;
            const rStyle = document.getElementById('wb-road-style'); if(rStyle) rStyle.value = cw.roadStyle || 'asphalt';
        }
        this.applyTestBiome();
        this.updateWorldRulesUI();
        this.previewWorldRule();
    },

    updateWorldColors() {
        if (this.testBiomeIndex < 4) {
            this.logToConsole('warning', '> Varsayılan dünyaların rengi değiştirilemez. Yeni dünya yaratın.');
            return;
        }
        const ground = document.getElementById('wb-ground-color').value;
        const fog = document.getElementById('wb-fog-color').value;
        const road = document.getElementById('wb-road-style').value;

        this.customWorlds[this.testBiomeIndex].groundColor = ground;
        this.customWorlds[this.testBiomeIndex].fogColor = fog;
        this.customWorlds[this.testBiomeIndex].roadStyle = road;
        
        this.applyTestBiome();
        this.saveSettingsToLocal();
    },

    addWorldRule() {
        if (this.testBiomeIndex < 4) {
            this.logToConsole('warning', '> Varsayılan dünyalara obje eklenemez. Yeni dünya yaratın.');
            return;
        }
        const model = document.getElementById('wb-rule-model').value;
        const chance = parseFloat(document.getElementById('wb-rule-chance').value) || 30;
        const dist = parseFloat(document.getElementById('wb-rule-x-num').value) || 12;

        this.customWorlds[this.testBiomeIndex].rules.push({ model, chance, dist });
        this.updateWorldRulesUI();
        this.logToConsole('info', `> Kural eklendi: ${model} (%${chance}) X:${dist}`);
        
        this.saveSettingsToLocal();
        if (this.previewGroup) { this.scene.remove(this.previewGroup); this.previewGroup = null; }
        if(typeof TrackManager !== 'undefined') TrackManager.reset(); 
    },

    deleteWorldRule(index) {
        if (this.customWorlds[this.testBiomeIndex]) {
            this.customWorlds[this.testBiomeIndex].rules.splice(index, 1);
            this.updateWorldRulesUI();
            this.logToConsole('info', '> Kural silindi.');
            this.saveSettingsToLocal();
            if(typeof TrackManager !== 'undefined') TrackManager.reset();
        }
    },

    updateWorldRulesUI() {
        const list = document.getElementById('wb-rules-list');
        if (!list) return;
        list.innerHTML = '';
        
        if (this.testBiomeIndex < 4) {
            list.innerHTML = '<div style="font-size:10px; color:#555; text-align:center; padding:10px;">Varsayılan dünyalar düzenlenemez.<br>Yukarıdan YENİ DÜNYA YARAT butonunu kullanın.</div>';
            return;
        }

        const rules = this.customWorlds[this.testBiomeIndex].rules;
        if (rules.length === 0) {
            list.innerHTML = '<div style="font-size:10px; color:#555; text-align:center; padding:10px;">Bu dünyaya henüz kural eklenmedi.</div>';
            return;
        }

        rules.forEach((rule, i) => {
            const div = document.createElement('div');
            div.className = 'mod-rule-item';
            div.innerHTML = `
                <div class="mod-rule-title">${rule.model}</div>
                <div class="mod-rule-stats">Sıklık: <span>%${rule.chance}</span> Mesafe: <span>X: ${rule.dist}</span></div>
                <button class="mod-rule-delete" onclick="GameEngine.deleteWorldRule(${i})">✖</button>
            `;
            list.appendChild(div);
        });
    },

    exportGlobalModels() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ModelAyarlari, null, 4));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "vocab_runner_models.json");
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        document.body.removeChild(dlAnchorElem);
        this.logToConsole('info', '> Model ayarları JSON olarak indirildi!');
    },

    exportWorldData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.customWorlds, null, 4));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "vocab_runner_worlds.json");
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        document.body.removeChild(dlAnchorElem);
        this.logToConsole('info', '> Dünya tasarımları JSON olarak indirildi!');
    },

    toggleSection(headerEl) {
        const section = headerEl.parentElement;
        section.classList.toggle('collapsed');
    },

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        const el = document.getElementById('t-snap-toggle');
        if(el) el.classList.toggle('active', this.snapEnabled);
        if(this.snapEnabled) this.applySnapToCurrent();
    },

    applySnapToCurrent() {
        if (!this.snapEnabled || !this.currentTestItem) return;
        const snap = 0.5;
        const item = this.currentTestItem;
        item.mesh.position.x = Math.round(item.mesh.position.x / snap) * snap;
        item.mesh.position.y = Math.round(item.mesh.position.y / snap) * snap;
        item.mesh.position.z = Math.round(item.mesh.position.z / snap) * snap;
        this.updateTransformInputs();
    },

    resetTransform() {
        if (!this.currentTestItem) return;
        const ayar = ModelAyarlari[this.currentTestItem.key] || { scale: 1, rotY: 0, yOffset: 0 };
        this.currentTestItem.mesh.position.set(2.5, ayar.yOffset || 0, -15);
        this.currentTestItem.mesh.rotation.set(0, (ayar.rotY || 0) * Math.PI/180, 0);
        this.currentTestItem.mesh.scale.set(ayar.scale, ayar.scale, ayar.scale);
        this.updateTransformInputs();
    },

    onTransformInput(type, axis) {
        if (!this.currentTestItem) return;
        const inputEl = document.getElementById(`t-${type}-${axis}`);
        if(!inputEl) return;
        
        const val = parseFloat(inputEl.value) || 0;
        const item = this.currentTestItem;
        
        if (type === 'pos') { 
            item.mesh.position[axis] = val; 
        } 
        else if (type === 'rot') { 
            item.mesh.rotation[axis] = val * (Math.PI / 180); 
        } 
        else if (type === 'scl') { 
            const isLocked = document.getElementById('t-scl-lock')?.checked;
            if(isLocked) {
                item.mesh.scale.set(val, val, val); 
                const sx = document.getElementById('t-scl-x'); if(sx) sx.value = val;
                const sy = document.getElementById('t-scl-y'); if(sy) sy.value = val;
                const sz = document.getElementById('t-scl-z'); if(sz) sz.value = val;
            } else {
                item.mesh.scale[axis] = val;
            }
        }
        
        if(!ModelAyarlari[item.key]) ModelAyarlari[item.key] = { scale: 1, rotY: 0, yOffset: 0 };
        ModelAyarlari[item.key].scale = item.mesh.scale.x;
        ModelAyarlari[item.key].rotY = item.mesh.rotation.y * (180/Math.PI);
        ModelAyarlari[item.key].yOffset = item.mesh.position.y;
    },

    onCameraInput(prop, source) {
        const id = prop === 'fov' ? 'c-fov' : prop === 'dist' ? 'c-dist' : prop === 'angle' ? 'c-angle' : 'c-height';
        const el = document.getElementById(id + '-' + source);
        if(!el) return;
        
        const val = parseFloat(el.value) || 0;
        const other = source === 'range' ? 'num' : 'range';
        const otherEl = document.getElementById(id + '-' + other);
        if(otherEl) otherEl.value = val;
        
        if (prop === 'fov') {
            this.camera.fov = val;
            this.camera.updateProjectionMatrix();
        }
        
        if (this.orbitControls) {
            if (prop === 'angle') {
                this.orbitControls.minAzimuthAngle = val * (Math.PI/180);
                this.orbitControls.maxAzimuthAngle = val * (Math.PI/180);
            } else if (prop === 'dist') {
                this.orbitControls.minDistance = val;
                this.orbitControls.maxDistance = val;
            }
            this.orbitControls.update();
        }
        
        if (prop === 'height' && this.testCameraTarget) {
            this.testHeightOffset = val;
            const distanceToTarget = this.testBaseDist || 10; 
            this.camera.position.y = this.testCameraTarget.y + val + (distanceToTarget * 0.3);
            this.camera.lookAt(this.testCameraTarget);
        }
    },

    onSpeedInput(source) {
        const val = parseFloat(document.getElementById('t-speed-' + source).value) || 0;
        const other = source === 'range' ? 'num' : 'range';
        const otherEl = document.getElementById('t-speed-' + other);
        if(otherEl) otherEl.value = val;
        this.gameSpeed = val;
    },

    onLightInput(type, source) {
        const id = type === 'dir' ? 'l-dir' : 'l-amb';
        const el = document.getElementById(id + '-' + source);
        if(!el) return;
        const val = parseFloat(el.value) || 0;
        const other = source === 'range' ? 'num' : 'range';
        const otherEl = document.getElementById(id + '-' + other);
        if(otherEl) otherEl.value = val;
            
        if (type === 'dir') this.dirLight.intensity = val;
        else this.ambientLight.intensity = val;
    },

    onLightColorChange(hex) {
        this.dirLight.color.setHex(parseInt(hex.replace('#', ''), 16));
    },

    onBgColorChange(hex) {
        this.scene.background = new THREE.Color(hex);
    },

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        if (this.gridHelper) this.gridHelper.visible = this.gridVisible;
        const el = document.getElementById('t-grid-toggle');
        if(el) el.classList.toggle('active', this.gridVisible);
    },

    toggleFog() {
        this.fogVisible = !this.fogVisible;
        this.scene.fog = this.fogVisible ? new THREE.Fog(this.currentFogColor, 20, 100) : null;
        const el = document.getElementById('t-fog-toggle');
        if(el) el.classList.toggle('active', this.fogVisible);
    },

    onBiomeSelect(val) {
        this.testBiomeIndex = parseInt(val);
        this.applyTestBiome();
    },

    onModelSelect(modelKey) {
        this.showTestItemByName(modelKey);
    },

    updateHierarchy() {
        const list = document.getElementById('hierarchy-list');
        if (!list) return;
        list.innerHTML = '';
        
        if (this.testRefChar) {
            const div = document.createElement('div');
            div.className = 'unity-hierarchy-item';
            div.innerHTML = '<span class="unity-hierarchy-icon">🧍</span> Reference Character';
            list.appendChild(div);
        }
        
        this.testItems.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'unity-hierarchy-item' + (i === this.currentTestIndex ? ' selected' : '');
            div.innerHTML = `<span class="unity-hierarchy-icon">📦</span> ${item.key}`;
            div.onclick = () => this.showTestItem(i);
            list.appendChild(div);
        });
    },

    clearConsole() {
        const consoleEl = document.getElementById('console-output');
        if (consoleEl) consoleEl.innerHTML = '';
    },

    logToConsole(type, message) {
        const consoleEl = document.getElementById('console-output');
        if (!consoleEl) return;
        const entry = document.createElement('div');
        entry.className = `unity-console-entry ${type}`;
        entry.textContent = message;
        consoleEl.appendChild(entry);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    },

    updateTransformInputs() {
        if (!this.currentTestItem) return;
        const item = this.currentTestItem;
        
        const ids = ['t-pos-x', 't-pos-y', 't-pos-z', 't-rot-x', 't-rot-y', 't-rot-z', 't-scl-x', 't-scl-y', 't-scl-z'];
        const values = [
            item.mesh.position.x, item.mesh.position.y, item.mesh.position.z,
            item.mesh.rotation.x * 180/Math.PI, item.mesh.rotation.y * 180/Math.PI, item.mesh.rotation.z * 180/Math.PI,
            item.mesh.scale.x, item.mesh.scale.y, item.mesh.scale.z
        ];
        
        for(let i=0; i<ids.length; i++) {
            const el = document.getElementById(ids[i]);
            if(el) el.value = values[i].toFixed(2);
        }
    },

    showTestItem(index) {
        if(this.testItems.length === 0) return;
        this.testItems.forEach(item => item.mesh.visible = false);
        
        if(index < 0) index = this.testItems.length - 1;
        if(index >= this.testItems.length) index = 0;
        this.currentTestIndex = index;
        
        const item = this.testItems[index];
        item.mesh.visible = true;
        this.currentTestItem = item;
        
        let vertexCount = 0;
        item.mesh.traverse(child => {
            if (child.isMesh && child.geometry) {
                vertexCount += child.geometry.attributes.position.count;
            }
        });
        if(typeof safeSetText !== 'undefined') safeSetText('test-vertex-count', vertexCount.toLocaleString() + ' verts');
        
        const select = document.getElementById('test-model-select');
        if (select) select.value = item.key;
        
        const catSelect = document.getElementById('t-category');
        if(catSelect) catSelect.value = ModelAyarlari[item.key]?.category || 'scenery';

        const ayar = ModelAyarlari[item.key] || { scale: 1, rotY: 0, yOffset: 0 };
        item.mesh.scale.set(ayar.scale, ayar.scale, ayar.scale);
        item.mesh.rotation.set(0, (ayar.rotY || 0) * Math.PI/180, 0);
        item.mesh.position.set(2.5, ayar.yOffset || 0, -15);
        
        this.updateTransformInputs();

        const box = new THREE.Box3().setFromObject(item.mesh);
        if(this.testRefChar) {
            const charBox = new THREE.Box3().setFromObject(this.testRefChar);
            box.union(charBox);
        }
        
        if(!box.isEmpty()) {
            const size = new THREE.Vector3(); box.getSize(size);
            const center = new THREE.Vector3(); box.getCenter(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            this.testCameraTarget = center.clone();
            this.testBaseDist = maxDim * 1.2 + 3;
            
            if (this.orbitControls) {
                this.orbitControls.target.copy(center);
                this.camera.position.set(center.x, center.y + maxDim*0.5, center.z + this.testBaseDist);
                this.orbitControls.update();
            }
        }
        this.logToConsole('info', `> Selected: ${item.key}`);
    },

    showTestItemByName(modelKey) {
        const idx = this.testItems.findIndex(item => item.key === modelKey);
        if (idx >= 0) this.showTestItem(idx);
    },

    applyTestBiome() {
        if(this.testBiomeIndex === 0) {
            this.scene.fog = null;
            this.fogVisible = false;
            this.groundMesh.material.color.setHex(0x555555);
            this.scene.background = new THREE.Color(0x2d2d2d);
            if(typeof TrackManager !== 'undefined') {
                TrackManager.lines.forEach(l => l.visible = false);
                if (TrackManager.roadGroup) TrackManager.roadGroup.visible = false;
                TrackManager.activeScenery.forEach(s => s.visible = false);
            }
            if (this.gridHelper) this.gridHelper.visible = true;
        } else if (this.testBiomeIndex < 4) {
            if(typeof TrackManager !== 'undefined') {
                TrackManager.lines.forEach(l => l.visible = true);
                if (TrackManager.roadGroup) TrackManager.roadGroup.visible = true;
            }
            this.currentScore = this.testBiomeIndex === 1 ? 0 : (this.testBiomeIndex === 2 ? 60 : 130);
            this.fogVisible = true;
            this.scene.fog = new THREE.Fog(this.currentFogColor, 20, 100);
            this.updateBiome();
            if(typeof TrackManager !== 'undefined') {
                TrackManager.reset();
                TrackManager.activeScenery.forEach(s => s.visible = true);
            }
            if (this.gridHelper) this.gridHelper.visible = false;
        } else {
            const cw = this.customWorlds[this.testBiomeIndex];
            if(!cw) return;
            if(typeof TrackManager !== 'undefined') {
                TrackManager.lines.forEach(l => l.visible = true);
                if (TrackManager.roadGroup) TrackManager.roadGroup.visible = true;
            }
            
            this.groundMesh.material.color.setHex(parseInt(cw.groundColor.replace('#', ''), 16));
            this.scene.background = new THREE.Color(cw.fogColor);
            this.scene.fog = new THREE.Fog(new THREE.Color(cw.fogColor), 20, 100);
            this.setRoadStyle(cw.roadStyle || 'asphalt');
            
            if(typeof TrackManager !== 'undefined') {
                TrackManager.reset();
                TrackManager.activeScenery.forEach(s => s.visible = true);
            }
            if (this.gridHelper) this.gridHelper.visible = false;
        }
    },

    // FAZ 1 FIX: Çıkışta Kamera Sıfırlama ve Test Modunu Temizleme
    exitTestMode() {
        this.isTestMode = false;
        if (this.orbitControls) {
            this.orbitControls.dispose();
            this.orbitControls = null;
        }
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper = null;
        }
        if (this.testPivot) {
            this.scene.remove(this.testPivot);
            this.testPivot = null;
        }
        if (this.previewGroup) {
            this.scene.remove(this.previewGroup);
            this.previewGroup = null;
        }
        this.testRefChar = null;
        this.testItems = [];
        this.currentTestItem = null;
        
        if(typeof PlayerController !== 'undefined' && PlayerController.group) PlayerController.group.visible = true;
        if(typeof TrackManager !== 'undefined') {
            TrackManager.lines.forEach(l => l.visible = true);
            if (TrackManager.roadGroup) TrackManager.roadGroup.visible = true;
        }
        
        if(typeof safeSetDisplay !== 'undefined') {
            safeSetDisplay('test-ui', 'none');
            safeSetDisplay('start-screen', 'flex');
        }
        
        this.saveSettingsToLocal();
        
        // Kamera Çıkış Bug'ı Tamiri (Kamerayı ufka kilitler)
        this.camera.position.set(0, 5, 12);
        this.camera.rotation.set(0, 0, 0); 
        this.camera.lookAt(0, 2, -15);
        this.camera.updateProjectionMatrix();

        // Custom World sarkmasını engelle
        this.testBiomeIndex = 1;
        this.resetGame();
    },

    resetGame() {
        this.isPlaying = false;
        this.accumulator = 0; // FAZ 1 FIX: Clean reset

        if(typeof safeSetDisplay !== 'undefined') {
            safeSetDisplay('game-over-screen', 'none');
            safeSetDisplay('level-complete-screen', 'none');
            safeSetDisplay('start-screen', 'flex');
            safeSetDisplay('ui-layer', 'none');
        }
        
        const bdg = document.getElementById('difficulty-badge');
        if(bdg) bdg.classList.remove('show');
        const bdg2 = document.getElementById('biome-badge');
        if(bdg2) bdg2.classList.remove('show');
        
        if(typeof GateManager !== 'undefined') GateManager.reset();
        if(typeof TrackManager !== 'undefined') TrackManager.reset();
        if(typeof TrafficManager !== 'undefined') TrafficManager.reset();
        
        this.currentScore = 0;
        this.wordsAnswered = 0;
        this.combo = 0;
        this.updateBiome();
    },

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (!this.isLoaded) return;

        if (this.isTestMode && this.testPivot) {
            if (this.orbitControls) this.orbitControls.update(); 
            
            if (this.gameSpeed > 0 && typeof TrackManager !== 'undefined') {
                TrackManager.updateLines(dt);
                TrackManager.updateScenery(dt);
            }
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if(typeof MarketManager !== 'undefined') MarketManager.update(dt);

        if(this.lastCoinValue !== this.collectedCoins) {
            if(typeof safeSetText !== 'undefined') safeSetText('coin-text', this.collectedCoins);
            this.lastCoinValue = this.collectedCoins;
        }

        this.currentFogColor.lerp(this.targetFogColor, 0.01);
        if(this.scene.fog) this.scene.fog.color = this.currentFogColor;
        this.dirLight.intensity = THREE.MathUtils.lerp(this.dirLight.intensity, this.targetLightIntensity, 0.01);
        this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, this.targetAmbientIntensity, 0.01);
        if (this.stars) this.stars.rotation.y += 0.0002;

        if (this.rain && this.rain.material.opacity > 0 && this.isPlaying) {
            const positions = this.rain.geometry.attributes.position.array;
            for(let i=1; i < positions.length; i+=3) {
                positions[i] -= 20 * dt;
                if(positions[i] < 0) positions[i] = 50;
            }
            this.rain.geometry.attributes.position.needsUpdate = true;
        }

        // FAZ 1 FIX: Sonsuz Mod Adrenalini ve Lerp Mantığı
        if (this.isPlaying && this.gameMode === 'endless') {
            this.targetGameSpeed = Math.min(this.targetGameSpeed + (dt * 0.002), 1.2);
        }

        const speedRatio = (this.gameSpeed - this.baseSpeed) / 0.3;
        const clampedSpeedRatio = THREE.MathUtils.clamp(speedRatio, 0, 1.5);
        
        // FPS Independent Lerp
        const alpha = 1 - Math.exp(-5 * dt);
        this.gameSpeed = THREE.MathUtils.lerp(this.gameSpeed, this.targetGameSpeed, alpha);
        
        if(Math.abs(this.camera.fov - (60 + clampedSpeedRatio * 10)) > 0.01) {
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 60 + clampedSpeedRatio * 10, alpha);
            this.camera.updateProjectionMatrix();
        }

        if (typeof SpeedLines !== 'undefined') SpeedLines.update(clampedSpeedRatio);
        if (typeof ScreenShake !== 'undefined') ScreenShake.update(dt);
        if (typeof PlayerController !== 'undefined' && PlayerController.mixer) PlayerController.mixer.update(dt);

        if(typeof TrackManager !== 'undefined') TrackManager.updateParticles(dt);
        if(typeof TrafficManager !== 'undefined') TrafficManager.update(dt);

        if (this.isPlaying) {
            // FAZ 1 FIX: Prevent Death Spiral
            this.accumulator += Math.min(dt, 0.25);
            let steps = 0;
            while(this.accumulator >= this.FIXED_DT && steps < 5) {
                if(typeof PlayerController !== 'undefined') PlayerController.updatePhysics(this.FIXED_DT);
                if(typeof TrackManager !== 'undefined') {
                    TrackManager.updateLines(this.FIXED_DT);
                    TrackManager.updateScenery(this.FIXED_DT);
                }
                if(typeof GateManager !== 'undefined') GateManager.update(this.FIXED_DT);
                this.accumulator -= this.FIXED_DT;
                steps++;
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};