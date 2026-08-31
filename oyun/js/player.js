// player.js – Oyuncu kontrolü
const PlayerController = {
    group: new THREE.Group(), targetX: -3.5, currentX: -3.5, mixer: null, currentModel: null, tiltAmount: 0, 
    
    init() {
        GameEngine.scene.add(this.group); this.changeCharacter(MarketManager.selected);
        
        window.addEventListener('keydown', (e) => { 
            if (!GameEngine.isPlaying) return; 
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveLeft(); 
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveRight(); 
        });
        
        let tsX = 0, tsY = 0, tsTime = 0; 
        window.addEventListener('touchstart', (e) => { tsX = e.touches[0].clientX; tsY = e.touches[0].clientY; tsTime = Date.now(); }, {passive: true});
        window.addEventListener('touchend', (e) => { 
            if (!GameEngine.isPlaying) return; 
            const dx = e.changedTouches[0].clientX - tsX; const dy = e.changedTouches[0].clientY - tsY; 
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30 && (Date.now() - tsTime) < 300) { if (dx < 0) this.moveLeft(); else this.moveRight(); } 
        }, {passive: true});
    },
    
    moveLeft() { this.targetX = -GameEngine.LANE_POS; },
    moveRight() { this.targetX = GameEngine.LANE_POS; },
    
    changeCharacter(charId) {
        if(this.currentModel) { this.group.remove(this.currentModel); if (this.mixer) this.mixer.stopAllAction(); this.currentModel = null; }
        let gltf = GameEngine.models[charId] || GameEngine.models['Casual_Hoodie']; if(!gltf || !gltf.scene) return;
        if (typeof THREE.SkeletonUtils !== 'undefined') { this.currentModel = THREE.SkeletonUtils.clone(gltf.scene); } else { this.currentModel = gltf.scene.clone(); }
        
        applyModelSettings(this.currentModel, charId); 
        
        // FIX: Karakterin kameraya doğru değil, ufka doğru koşması sağlandı! (180 derece döndürüldü)
        this.currentModel.rotation.y += Math.PI; 
        
        this.currentModel.traverse(c => { if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; }}); this.group.add(this.currentModel);
        this.mixer = new THREE.AnimationMixer(this.currentModel); const runClip = gltf.animations && (THREE.AnimationClip.findByName(gltf.animations, 'Run') || gltf.animations[0]); if(runClip) this.mixer.clipAction(runClip).play();
    },
    reset() { this.targetX = -GameEngine.LANE_POS; this.currentX = -GameEngine.LANE_POS; this.group.position.set(this.targetX, 0, 0); this.group.rotation.z = 0; this.tiltAmount = 0; },
    updatePhysics(dt) {
        const lerpFactor = 0.25; this.currentX = THREE.MathUtils.lerp(this.currentX, this.targetX, lerpFactor); this.group.position.x = this.currentX;
        const targetTilt = (this.targetX - this.currentX) * 0.2; this.tiltAmount = THREE.MathUtils.lerp(this.tiltAmount, targetTilt, 0.1); this.group.rotation.z = this.tiltAmount; 
        this.group.position.y = Math.abs(Math.sin(Date.now() * 0.015)) * 0.1;
    }
};