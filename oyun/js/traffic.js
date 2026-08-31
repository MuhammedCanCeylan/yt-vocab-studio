// traffic.js – Trafik ve Yol Engelleri
const TrafficManager = {
    activeCars: [], spawnTimer: 0, spawnInterval: 4,
    carTypes: ['police', 'ambulance', 'taxi', 'garbage-truck', 'firetruck', 'hatchback-sports', 'suv-luxury', 'truck', 'van', 'sedan', 'construction-barrier', 'construction-cone', 'spike-block'],
    carPool: new Map(),

    init() { this.carTypes.forEach(t => this.carPool.set(t, [])); },
    
    getCar(type) {
        const pool = this.carPool.get(type);
        if (pool && pool.length > 0) {
            const car = pool.pop();
            car.visible = true;
            return car;
        }
        const newCar = GameEngine.models[type].clone();
        newCar.userData.type = type;
        GameEngine.scene.add(newCar);
        return newCar;
    },
    
    releaseCar(car) {
        car.visible = false;
        const type = car.userData.type;
        if(this.carPool.has(type)) this.carPool.get(type).push(car);
    },
    
    spawn() {
        // FIX: ÖLÜM TUZAĞI ÇÖZÜMÜ (SAFE ZONE)
        // Eğer kapı ekrandaysa araba/engel çıkarma! Kapıların 130 metre arkası ve 30 metre önüne kadar geniş bir güvenli alan yarattık.
        if (typeof GateManager !== 'undefined' && GateManager.isGateActive) {
            const gateZ = GateManager.leftGate.position.z;
            if (gateZ > -130 && gateZ < 30) return; // Kapıya yakınsan spawn olma!
        }

        if (this.activeCars.length > 0) {
            const lastCar = this.activeCars[this.activeCars.length - 1];
            if (lastCar.mesh.position.z < -100) return;
        }
        
        const type = this.carTypes[Math.floor(Math.random() * this.carTypes.length)];
        if (!GameEngine.models[type]) return;
        
        const car = this.getCar(type);
        const lane = Math.random() > 0.5 ? GameEngine.LANE_POS : -GameEngine.LANE_POS;
        if(typeof applyModelSettings === 'function') applyModelSettings(car, type);
        
        // Arabalar da güvenli olsun diye daha geride (-180) spawn oluyor
        car.position.set(lane, (typeof ModelAyarlari !== 'undefined' && ModelAyarlari[type]) ? ModelAyarlari[type].yOffset || 0 : 0, -180);
        
        const isObstacle = typeof ModelAyarlari !== 'undefined' && ModelAyarlari[type] && ModelAyarlari[type].category === 'obstacle';
        const speed = isObstacle ? 0 : 0.5; // Tuzaklar sabit durur
        
        this.activeCars.push({ mesh: car, speed: speed });
    },
    
    update(dt) {
        if (!GameEngine.isPlaying) return;
        this.spawnTimer -= dt;
        const difficultyMultiplier = GameEngine.difficulty === 'hard' ? 0.5 : (GameEngine.difficulty === 'medium' ? 0.75 : 1);
        
        if (this.spawnTimer <= 0 && Math.random() > 0.4) {
            this.spawn();
            this.spawnTimer = this.spawnInterval * difficultyMultiplier;
        }
        
        for(let i=this.activeCars.length-1; i>=0; i--) {
            const car = this.activeCars[i];
            car.mesh.position.z += (GameEngine.gameSpeed + car.speed) * (dt * 60);

            const dx = Math.abs(PlayerController.currentX - car.mesh.position.x);
            const dz = Math.abs(PlayerController.group.position.z - car.mesh.position.z);
            if (dx < 2 && dz < 3) {
                if(typeof AudioManager !== 'undefined') AudioManager.play('crash');
                if(typeof ScreenShake !== 'undefined') ScreenShake.shake(1.0, 0.5);
                if(typeof TrackManager !== 'undefined') TrackManager.spawnParticles(PlayerController.group.position, 'smoke');
                
                GameEngine.isPlaying = false;
                if(typeof MarketManager !== 'undefined') MarketManager.addCoins(GameEngine.collectedCoins);
                if(typeof StatsManager !== 'undefined') StatsManager.recordGame(GameEngine.gameMode, GameEngine.currentScore, GameEngine.wordsAnswered, GameEngine.collectedCoins, GameEngine.maxCombo, false, GameEngine.mistakes);
                
                setTimeout(() => {
                    if(typeof safeSetDisplay !== 'undefined') {
                        safeSetDisplay('ui-layer', 'none');
                        safeSetDisplay('game-over-screen', 'flex');
                    }
                    if(typeof safeSetText !== 'undefined') safeSetText('correct-answer-text', `${GameEngine.currentEnWord} = ${GameEngine.currentCorrectTr}`);
                }, 500);
            }
            if (car.mesh.position.z > 30) {
                this.releaseCar(car.mesh);
                this.activeCars.splice(i, 1);
            }
        }
    },
    
    reset() {
        this.activeCars.forEach(c => this.releaseCar(c.mesh));
        this.activeCars = [];
        this.spawnTimer = 3;
    }
};