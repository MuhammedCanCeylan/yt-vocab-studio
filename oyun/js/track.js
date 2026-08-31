// track.js – Çevre, parçacık, havuz, hız çizgileri ve Çim Motoru
class ObjectPool {
    constructor(createFn, initialSize = 10) {
        this.createFn = createFn; this.active = []; this.inactive = [];
        for(let i=0; i<initialSize; i++) { const obj = this.createFn(); obj.visible = false; this.inactive.push(obj); }
    }
    get() { const obj = this.inactive.pop() || this.createFn(); obj.visible = true; this.active.push(obj); return obj; }
    release(obj) {
        obj.visible = false; const idx = this.active.indexOf(obj);
        if (idx > -1) { this.active.splice(idx, 1); this.inactive.push(obj); } else if (!this.inactive.includes(obj)) { this.inactive.push(obj); }
    }
    clearGroup(group) { while(group.children.length > 0) { group.remove(group.children[0]); } this.release(group); }
}

class ParticlePool {
    constructor(maxParticles = 80) { this.maxParticles = maxParticles; this.particles = []; this.free = []; for(let i=0; i<20; i++) this.free.push({ mesh: null, velocity: new THREE.Vector3(), life: 0 }); }
    spawn(position, type, scene) {
        let p = this.free.pop();
        if (!p) { if (this.particles.length >= this.maxParticles) return; p = { mesh: null, velocity: new THREE.Vector3(), life: 0 }; }
        const isStar = type === 'coin';
        if (!p.mesh) {
            const mat = isStar ? GameEngine.particleMats.star.clone() : GameEngine.particleMats.smoke.clone();
            p.mesh = new THREE.Sprite(mat); scene.add(p.mesh);
        } else {
            p.mesh.material.map = isStar ? GameEngine.particleMats.star.map : GameEngine.particleMats.smoke.map;
            p.mesh.material.color.setHex(isStar ? 0xF5B700 : 0xbdc3c7); p.mesh.material.blending = isStar ? THREE.AdditiveBlending : THREE.NormalBlending;
        }
        const size = (Math.random() * 0.4) + 0.3; p.mesh.scale.set(size, size, 1); p.mesh.position.copy(position); p.mesh.material.opacity = 1; p.velocity.set((Math.random()-0.5)*12, (Math.random()*8)+4, (Math.random()-0.5)*12); p.life = 1.0; p.active = true; this.particles.push(p);
    }
    update(dt) {
        for(let i=this.particles.length-1; i>=0; i--) {
            let p = this.particles[i]; if (!p.active) continue;
            p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.y -= 20 * dt; p.life -= dt * 1.5; p.mesh.material.opacity = Math.max(0, p.life); p.mesh.scale.multiplyScalar(0.97);
            if(p.life <= 0) { p.active = false; this.particles.splice(i, 1); this.free.push(p); }
        }
    }
    reset() { this.particles.forEach(p => { p.active = false; this.free.push(p); }); this.particles = []; }
}

const ScreenShake = {
    intensity: 0, duration: 0, originalPos: new THREE.Vector3(),
    shake(intensity = 0.5, duration = 0.3) { this.intensity = intensity; this.duration = duration; if (typeof GameEngine !== 'undefined' && GameEngine.camera) this.originalPos.copy(GameEngine.camera.position); },
    update(dt) {
        if (this.duration <= 0 || typeof GameEngine === 'undefined' || !GameEngine.camera) return;
        this.duration -= dt; const shakeAmount = this.intensity * (this.duration / 0.3);
        GameEngine.camera.position.x = this.originalPos.x + (Math.random()-0.5) * shakeAmount; GameEngine.camera.position.y = this.originalPos.y + (Math.random()-0.5) * shakeAmount;
        if (this.duration <= 0) GameEngine.camera.position.copy(this.originalPos);
    }
};

const SpeedLines = {
    canvas: null, ctx: null, lines: [],
    init() {
        this.canvas = document.getElementById('speed-lines'); if(!this.canvas) return;
        this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; this.ctx = this.canvas.getContext('2d');
        for(let i=0; i<30; i++) { this.lines.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, length: Math.random() * 100 + 50, speed: Math.random() * 20 + 10, width: Math.random() * 2 + 0.5 }); }
    },
    update(speedRatio) {
        if (!this.ctx) return;
        if (speedRatio <= 0.1) { this.canvas.style.opacity = 0; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); return; }
        this.canvas.style.opacity = Math.min(speedRatio * 0.5, 1); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
        this.lines.forEach(l => {
            l.y += l.speed * speedRatio; if (l.y > window.innerHeight) { l.y = -l.length; l.x = Math.random() * window.innerWidth; }
            this.ctx.lineWidth = l.width; this.ctx.beginPath(); this.ctx.moveTo(l.x, l.y); this.ctx.lineTo(l.x, l.y + l.length); this.ctx.stroke();
        });
    },
    resize() { if (this.canvas) { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; } }
};

const TrackManager = {
    lines: [], sceneryPool: null, activeScenery: [], particleSystem: null, poleCounter: 0, lastSpawned: [],
    roadGroup: null, roadMesh: null,
    
    // YENİ: Zeminle uyumlu Renk Değiştiren Çim/Taş Havuzu
    grassPool: null, activeGrass: [], 
    
    biomeDay: ['cactus_short', 'cactus_tall', 'rock_largeA', 'rock_largeB', 'tree_palmDetailedTall'],
    biomeSunset: ['tree01', 'tree02', 'tree04', 'tree07', 'log_stackLarge', 'tent_detailedClosed', 'campfire_logs'],
    biomeNight: ['tree_pineTallA_detailed', 'mushroom_redGroup', 'mushroom_redTall', 'statue_obelisk', 'statue_head', 'statue_ring', 'Skull'],

    init() {
        this.sceneryPool = new ObjectPool(() => { const group = new THREE.Group(); GameEngine.scene.add(group); return group; }, 60);
        
        // Dinamik Çim/Doku Havuzu (Çoklu kutucuklardan oluşur)
        this.grassPool = new ObjectPool(() => { 
            const group = new THREE.Group(); 
            group.userData.mat = new THREE.MeshStandardMaterial({ roughness: 1.0 });
            for(let i=0; i<3; i++) {
                const h = 0.2 + Math.random()*0.5;
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, 0.2), group.userData.mat);
                mesh.position.set((Math.random()-0.5)*1.2, h/2, (Math.random()-0.5)*1.2);
                mesh.rotation.y = Math.random() * Math.PI;
                mesh.castShadow = true; mesh.receiveShadow = true;
                group.add(mesh);
            }
            GameEngine.scene.add(group); 
            return group; 
        }, 150);

        this.particleSystem = new ParticlePool(150);
        this.lines = [];
        
        this.roadGroup = new THREE.Group();
        GameEngine.scene.add(this.roadGroup);

        this.roadMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(16, 800), 
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
        );
        this.roadMesh.rotation.x = -Math.PI / 2;
        this.roadMesh.position.y = -0.02;
        this.roadMesh.position.z = -200;
        this.roadMesh.receiveShadow = true;
        this.roadGroup.add(this.roadMesh);

        for(let i=0; i<30; i++) {
            let cLine = new THREE.Mesh(
                new THREE.PlaneGeometry(0.3, 4),
                new THREE.MeshBasicMaterial({color: 0xffffff})
            );
            cLine.rotation.x = -Math.PI / 2;
            cLine.position.set(0, 0.01, -i * 12);
            GameEngine.scene.add(cLine);
            this.lines.push(cLine);
        }
    },
    reset() {
        this.activeScenery.forEach(s => { this.sceneryPool.clearGroup(s); });
        this.activeGrass.forEach(g => { this.grassPool.release(g); });
        
        this.activeScenery = []; this.activeGrass = []; 
        this.poleCounter = 0; this.particleSystem.reset(); this.lastSpawned = [];
        let startZ = typeof GameEngine !== 'undefined' && GameEngine.isTestMode ? 20 : -150;
        
        for(let i=0; i<30; i++) this.spawnScenery(startZ - (i*10));
        
        // YENİ: Başlangıçta yola bolca dinamik çim/taş dokusu ekle
        for(let i=0; i<60; i++) this.spawnGrass(startZ - (i*5));
        
        this.lines.forEach((l, i) => l.position.set(0, 0.01, -i * 12));
        for(let i=0; i<5; i++) this.spawnBackgroundScenery(startZ - 50 - (i*60));
    },

    spawnGrass(zPos) {
        const group = this.grassPool.get();
        const isLeft = Math.random() > 0.5;
        // Çimleri yola yakın ve ufka kadar yay
        const xPos = isLeft ? (-6 - Math.random() * 40) : (6 + Math.random() * 40);
        
        let baseColor = new THREE.Color(0x2d5a27);
        if (typeof GameEngine !== 'undefined' && GameEngine.groundMesh) {
            baseColor.copy(GameEngine.groundMesh.material.color);
        }
        
        // Zemin renginin rengini çok hafif boz (daha doğal ve detaylı görünür)
        const hsl = {};
        baseColor.getHSL(hsl);
        baseColor.setHSL(hsl.h, Math.max(0, hsl.s - 0.1), Math.max(0, hsl.l - (Math.random() * 0.1 + 0.05)));
        
        group.userData.mat.color.copy(baseColor);
        group.position.set(xPos, -0.05, zPos);
        this.activeGrass.push(group);
    },

    spawnBackgroundScenery(zPos) {
        if (typeof GameEngine !== 'undefined' && GameEngine.testBiomeIndex >= 4) return;

        const group = this.sceneryPool.get();
        const isLeft = Math.random() > 0.5;
        const xPos = isLeft ? (-70 - Math.random() * 30) : (70 + Math.random() * 30);
        
        let itemRef = GameEngine.models['rock_largeA'] || GameEngine.models['tree01'];
        if(itemRef) {
            const mesh = itemRef.clone();
            const key = itemRef === GameEngine.models['rock_largeA'] ? 'rock_largeA' : 'tree01';
            if (typeof applyModelSettings === 'function') applyModelSettings(mesh, key);
            mesh.scale.multiplyScalar(2);
            mesh.rotation.y = Math.random() * Math.PI;
            group.add(mesh);
            group.position.set(xPos, -2, zPos);
            group.isBg = true;
            this.activeScenery.push(group);
        } else {
            this.sceneryPool.release(group);
        }
    },

    spawnScenery(zPos) {
        const group = this.sceneryPool.get();
        const isLeft = Math.random() > 0.5;
        this.poleCounter++;
        group.isBg = false;

        // ==========================================
        // KULLANICININ YARATTIĞI "CUSTOM" DÜNYALAR
        // ==========================================
        if (typeof GameEngine !== 'undefined' && GameEngine.testBiomeIndex >= 4) {
            const cw = GameEngine.customWorlds[GameEngine.testBiomeIndex];
            if (!cw || !cw.rules || cw.rules.length === 0) {
                this.sceneryPool.release(group);
                return;
            }
            
            let spawned = false;
            for (let i = 0; i < cw.rules.length; i++) {
                const rule = cw.rules[i];
                if (Math.random() * 100 <= rule.chance) {
                    const xPos = isLeft ? (-rule.dist - (Math.random() * 1.5)) : (rule.dist + (Math.random() * 1.5));
                    let itemRef = GameEngine.models[rule.model];
                    if(itemRef) {
                        const mesh = itemRef.scene ? (typeof THREE.SkeletonUtils !== 'undefined' ? THREE.SkeletonUtils.clone(itemRef.scene) : itemRef.scene.clone()) : itemRef.clone();
                        if(typeof applyModelSettings === 'function') applyModelSettings(mesh, rule.model);
                        group.add(mesh);
                        group.position.set(xPos, (typeof ModelAyarlari !== 'undefined' && ModelAyarlari[rule.model]) ? ModelAyarlari[rule.model].yOffset : 0, zPos);
                        this.activeScenery.push(group);
                        spawned = true;
                        break; 
                    }
                }
            }
            if(!spawned) this.sceneryPool.release(group);
            return;
        }

        // ==========================================
        // NORMAL DÜNYALAR (ORMAN, ÇÖL, MAĞARA)
        // ==========================================
        if (this.poleCounter % 3 === 0 && GameEngine.models['light-curved']) {
            const mesh = GameEngine.models['light-curved'].clone();
            if(typeof applyModelSettings === 'function') applyModelSettings(mesh, 'light-curved');
            if(!isLeft) mesh.rotation.y += Math.PI;
            group.add(mesh);
            group.position.set(isLeft ? -10 : 10, (typeof ModelAyarlari !== 'undefined' && ModelAyarlari['light-curved']) ? ModelAyarlari['light-curved'].yOffset : 0, zPos);
            this.activeScenery.push(group);
            return;
        }

        const xPos = isLeft ? (-12 - Math.random() * 12) : (12 + Math.random() * 12);

        let activePool = this.biomeDay;
        if (GameEngine.currentScore > 40 && GameEngine.currentScore < 60) activePool = this.biomeDay.concat(this.biomeSunset);
        else if (GameEngine.currentScore >= 60 && GameEngine.currentScore < 100) activePool = this.biomeSunset;
        else if (GameEngine.currentScore >= 100 && GameEngine.currentScore < 130) activePool = this.biomeSunset.concat(this.biomeNight);
        else if (GameEngine.currentScore >= 130) activePool = this.biomeNight;

        let rKey = activePool[Math.floor(Math.random() * activePool.length)];
        let attempts = 0;
        while (this.lastSpawned.includes(rKey) && attempts < 3) {
            rKey = activePool[Math.floor(Math.random() * activePool.length)];
            attempts++;
        }
        this.lastSpawned.push(rKey);
        if (this.lastSpawned.length > 2) this.lastSpawned.shift();

        let itemRef = GameEngine.models[rKey];
        if(itemRef) {
            const mesh = itemRef.clone();
            if(typeof applyModelSettings === 'function') applyModelSettings(mesh, rKey);
            group.add(mesh);
            group.position.set(xPos, (typeof ModelAyarlari !== 'undefined' && ModelAyarlari[rKey]) ? ModelAyarlari[rKey].yOffset : 0, zPos);
            this.activeScenery.push(group);
        } else {
            this.sceneryPool.release(group);
        }
    },
    spawnParticles(position, type) {
        if(this.particleSystem) {
            for(let i=0; i<15; i++) this.particleSystem.spawn(position, type, GameEngine.scene);
        }
    },
    updateParticles(dt) { if(this.particleSystem) this.particleSystem.update(dt); },
    updateLines(dt) {
        this.lines.forEach(l => {
            l.position.z += GameEngine.gameSpeed * (dt*60);
            if(l.position.z > 20) l.position.z -= 360; 
        });
    },
    updateScenery(dt) {
        // Çevre Modelleri Güncelleme
        for(let i=0; i<this.activeScenery.length; i++) {
            let s = this.activeScenery[i];
            s.position.z += (s.isBg ? GameEngine.gameSpeed * 0.5 : GameEngine.gameSpeed) * (dt*60);
            if(s.position.z > 20) {
                this.sceneryPool.clearGroup(s);
                this.activeScenery.splice(i, 1);
                i--;
                if (s.isBg) this.spawnBackgroundScenery(-200 - Math.random()*50);
                else this.spawnScenery(-200 - Math.random()*20);
            }
        }
        
        // YENİ: Çim Jeneratörü Güncelleme
        for(let i=0; i<this.activeGrass.length; i++) {
            let g = this.activeGrass[i];
            g.position.z += GameEngine.gameSpeed * (dt*60);
            if(g.position.z > 20) {
                this.grassPool.release(g);
                this.activeGrass.splice(i, 1);
                i--;
                this.spawnGrass(-200 - Math.random()*15); // Arkada sürekli yeni çim çıksın
            }
        }
    }
};