// domino.js - Üst Kadrajlı Kamera, İri Taşlar ve Dinamik Fizik Sistemi
const DominoManager = {
    logicalSize: new THREE.Vector3(0.5, 1.0, 0.15), 

    world: null,
    dominoes: [],
    
    currentIndex: 0,
    highestSpawnedIndex: 39,
    isFalling: false,
    physicsPaused: true, 

    devSettings: {
        scale: 2.0,       // 🔥 TAŞLAR DAHA İRİ VE NET 🔥
        spacing: 0.9,     
        camY: 3.8,        // 🔥 KAMERA YUKARI ÇIKARILDI 🔥
        camZ: 5.2,        
        camOffsetX: -2.0, 
        camLookY: -0.3,   // 🔥 Kamera aşağı bakıyor -> Taşlar ekranın ÜSTÜNDE görünecek 🔥
        camLookZ: 0
    },

    async init() {
        if (typeof window.RAPIER === 'undefined') {
            console.log("⏳ Rapier3D İndiriliyor...");
            const rapierModule = await import('https://cdn.skypack.dev/@dimforge/rapier3d-compat');
            window.RAPIER = rapierModule;
            await RAPIER.init();
            console.log("🚀 Rapier3D Fizik Motoru Aktif!");
        }

        if (typeof DevPanel !== 'undefined' && DevPanel.settings) {
            this.devSettings = { ...this.devSettings, ...DevPanel.settings };
        }
        
        this.initPhysicsWorld();
        this.resetChain();
        this.processCustomPhysics(); 
    },

    initPhysicsWorld() {
        if (this.world) return;
        this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

        let groundDesc = RAPIER.RigidBodyDesc.fixed();
        let groundBody = this.world.createRigidBody(groundDesc);
        let groundCollider = RAPIER.ColliderDesc.cuboid(500.0, 0.1, 500.0).setFriction(1.0);
        this.world.createCollider(groundCollider, groundBody);
    },

    processCustomPhysics() {
        if (!Game.scene || !this.world) return;
        
        Game.scene.traverse(child => {
            if (child.isMesh && child.userData && child.userData.hasPhysics && !child.userData.body) {
                
                const bbox = new THREE.Box3().setFromObject(child);
                const size = bbox.getSize(new THREE.Vector3());

                let rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
                    .setTranslation(child.position.x, child.position.y, child.position.z)
                    .setRotation({x: child.quaternion.x, y: child.quaternion.y, z: child.quaternion.z, w: child.quaternion.w});
                
                let rigidBody = this.world.createRigidBody(rigidBodyDesc);
                
                let colliderDesc = RAPIER.ColliderDesc.cuboid(size.x/2, size.y/2, size.z/2)
                    .setFriction(0.6)
                    .setRestitution(0.1); 
                
                this.world.createCollider(colliderDesc, rigidBody);

                child.userData.body = rigidBody;
            }
        });
    },

    createDominoMaterials(index, topVal, botVal) {
        const startColor = new THREE.Color(0xff6b6b); 
        const endColor = new THREE.Color(0x4ecdc4);
        const currentHex = startColor.lerp(endColor, index / 40).getStyle(); 

        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = currentHex;
        ctx.fillRect(0, 0, 256, 512);
        
        ctx.fillStyle = '#111111';
        ctx.fillRect(20, 252, 216, 8);

        const drawDot = (x, y) => {
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.fillStyle = '#111111';
            ctx.fill();
        };

        const drawHalf = (val, offsetY) => {
            const cx = 128, cy = 128 + offsetY;
            const l = 64, r = 192, t = 64 + offsetY, b = 192 + offsetY;

            if ([1, 3, 5].includes(val)) drawDot(cx, cy);
            if ([2, 3, 4, 5, 6].includes(val)) { drawDot(l, t); drawDot(r, b); }
            if ([4, 5, 6].includes(val)) { drawDot(r, t); drawDot(l, b); }
            if (val === 6) { drawDot(l, cy); drawDot(r, cy); }
        };

        drawHalf(topVal, 0);
        drawHalf(botVal, 256);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        
        const mainMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4, metalness: 0.1 });
        const sideMat = new THREE.MeshStandardMaterial({ color: currentHex, roughness: 0.4, metalness: 0.1 });

        return [sideMat, sideMat, sideMat, sideMat, mainMat, mainMat];
    },

    resetChain() {
        if (this.dominoes) {
            this.dominoes.forEach(d => {
                if (!d) return;
                if (Game.scene) Game.scene.remove(d.mesh);
                if (this.world) this.world.removeRigidBody(d.body);
            });
        }
        this.dominoes = [];
        this.currentIndex = 0;
        this.highestSpawnedIndex = 39; 
        this.isFalling = false;
        this.physicsPaused = true;

        for (let i = 0; i <= this.highestSpawnedIndex; i++) {
            this.addDomino(i);
        }

        if (Game && Game.camera) {
            Game.camera.position.set(this.devSettings.camOffsetX, this.devSettings.camY, this.devSettings.camZ);
            
            const lookY = this.devSettings.camLookY !== undefined ? this.devSettings.camLookY : -0.3;
            const lookZ = this.devSettings.camLookZ !== undefined ? this.devSettings.camLookZ : 0;
            Game.camera.lookAt(0, lookY, lookZ); 
        }

        this.processCustomPhysics();
    },

    addDomino(index) {
        if (!this.world) return null;

        const s = this.devSettings.scale;
        const width = this.logicalSize.x * s;
        const height = this.logicalSize.y * s;
        const depth = this.logicalSize.z * s;

        const px = index * this.devSettings.spacing;
        const pz = 0;
        const py = (height / 2) + 0.1; 

        const topVal = Math.floor(Math.random() * 6) + 1;
        const botVal = Math.floor(Math.random() * 6) + 1;

        const geom = new THREE.BoxGeometry(width, height, depth);
        const mats = this.createDominoMaterials(index, topVal, botVal);
        const mesh = new THREE.Mesh(geom, mats);
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const rotQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        mesh.position.set(px, py, pz);
        mesh.quaternion.copy(rotQuat); 
        if (Game.scene) Game.scene.add(mesh);

        let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(px, py, pz)
            .setRotation({ x: rotQuat.x, y: rotQuat.y, z: rotQuat.z, w: rotQuat.w });
            
        let rigidBody = this.world.createRigidBody(rigidBodyDesc);

        let colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
            .setRestitution(0.1) 
            .setFriction(0.6)    
            .setDensity(1.5);    
            
        this.world.createCollider(colliderDesc, rigidBody);
        rigidBody.sleep();

        this.dominoes[index] = { mesh: mesh, body: rigidBody, isFallen: false, topVal, botVal };
        return mesh;
    },

    recycleDomino(oldIndex, newIndex) {
        let d = this.dominoes[oldIndex];
        if (!d) return;

        const s = this.devSettings.scale;
        const px = newIndex * this.devSettings.spacing;
        const pz = 0;
        const py = ((this.logicalSize.y / 2) * s) + 0.1;

        const rotQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        
        d.body.setTranslation({x: px, y: py, z: pz}, false);
        d.body.setRotation({x: rotQuat.x, y: rotQuat.y, z: rotQuat.z, w: rotQuat.w}, false);
        d.body.setLinvel({x: 0, y: 0, z: 0}, false);
        d.body.setAngvel({x: 0, y: 0, z: 0}, false);
        d.body.sleep();

        d.mesh.position.set(px, py, pz);
        d.mesh.quaternion.copy(rotQuat);
        
        d.mesh.material = this.createDominoMaterials(newIndex % 40, d.topVal, d.botVal);

        d.isFallen = false;

        this.dominoes[newIndex] = d;
        this.dominoes[oldIndex] = null;
    },

    triggerFall() {
        if (this.dominoes[this.currentIndex]) {
            this.isFalling = true;
            this.physicsPaused = false; 

            if (typeof AudioEngine !== 'undefined') AudioEngine.playHit();

            const currentObj = this.dominoes[this.currentIndex];
            const rigidBody = currentObj.body;
            rigidBody.wakeUp();

            if (this.currentIndex === 0) {
                const s = this.devSettings.scale;
                const impulseStrength = 0.7 * s; 
                const pos = rigidBody.translation();
                const hitY = pos.y + (this.logicalSize.y * 0.4 * s);

                rigidBody.applyImpulseAtPoint(
                    { x: impulseStrength, y: 0.05, z: 0 }, 
                    { x: pos.x, y: hitY, z: pos.z }, 
                    true
                );
            }
        }
    },

    breakChain(reason = null) {
        this.isFalling = false;
        this.physicsPaused = true;
        if (reason) {
            const el = document.getElementById('correct-answer-text');
            if (el) el.innerText = reason;
        }
        if (typeof Game !== 'undefined' && Game.gameOver) Game.gameOver();
    },

    advanceToNextQuestion() {
        this.physicsPaused = true; 
        this.isFalling = false;
        this.currentIndex++; 
        
        const recycleTarget = this.currentIndex - 15;
        if (recycleTarget >= 0 && this.dominoes[recycleTarget]) {
            this.highestSpawnedIndex++;
            this.recycleDomino(recycleTarget, this.highestSpawnedIndex);
        }

        if (typeof UI !== 'undefined') UI.onDominoFell();
    },

    update(dt) {
        if (!this.world || this.dominoes.length === 0) return;

        if (!this.physicsPaused && (!Game.isPaused)) {
            this.world.step(); 
        }

        if (this.isFalling && !this.physicsPaused) {
            const nextIndex = this.currentIndex + 1;
            
            if (this.dominoes[nextIndex]) {
                const nextObj = this.dominoes[nextIndex];
                if (nextObj && nextObj.body) {
                    const rot = nextObj.body.rotation(); 
                    const rotZ = Math.abs(rot.z);
                    const rotX = Math.abs(rot.x);
                    
                    if (rotZ > 0.15 || rotX > 0.15) {  
                        this.advanceToNextQuestion();
                    }
                }
            } else {
                const currentObj = this.dominoes[this.currentIndex];
                if (currentObj && currentObj.body) {
                    const rot = currentObj.body.rotation();
                    if (Math.abs(rot.z) > 0.5 || Math.abs(rot.x) > 0.5) {
                        this.advanceToNextQuestion();
                    }
                }
            }
        }

        let newlyFallen = 0;

        this.dominoes.forEach(d => {
            if (!d || !d.body) return;
            
            const t = d.body.translation();
            const r = d.body.rotation();

            d.mesh.position.set(t.x, t.y, t.z);
            d.mesh.quaternion.set(r.x, r.y, r.z, r.w);

            if (!d.isFallen && (Math.abs(r.z) > 0.6 || Math.abs(r.x) > 0.6)) {
                d.isFallen = true;
                newlyFallen++;
            }
        });

        if (newlyFallen > 0 && typeof Game !== 'undefined') {
            Game.score += newlyFallen;
            const scoreEl = document.getElementById('hud-score');
            if (scoreEl) scoreEl.innerText = Game.score;
        }

        const targetDomino = this.dominoes[this.currentIndex];
        if (targetDomino && typeof Game !== 'undefined' && Game.camera && !Game.isStudioMode) {
            
            const targetCamX = targetDomino.mesh.position.x + this.devSettings.camOffsetX;
            Game.camera.position.x += (targetCamX - Game.camera.position.x) * dt * 4;

            if (!Game.isPaused) {
                Game.camera.position.y += (this.devSettings.camY - Game.camera.position.y) * dt * 6;
                Game.camera.position.z += (this.devSettings.camZ - Game.camera.position.z) * dt * 6;
            }
            
            const lookY = this.devSettings.camLookY !== undefined ? this.devSettings.camLookY : -0.3;
            const lookZ = this.devSettings.camLookZ !== undefined ? this.devSettings.camLookZ : 0;
            
            Game.camera.lookAt(Game.camera.position.x - this.devSettings.camOffsetX, lookY, lookZ);
        }
    }
};