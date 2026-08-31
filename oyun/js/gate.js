// gate.js – Kapı (kelime seçimi) yönetimi
const GateManager = {
    leftGate: new THREE.Group(), rightGate: new THREE.Group(), leftMat: null, rightMat: null, isGateActive: false,
    coinPool: null, activeCoins: [], chestObj: null, signObj: null, hintArrow: null,
    leftCanvas: null, leftCtx: null, leftTexture: null, rightCanvas: null, rightCtx: null, rightTexture: null,
    flashMatCorrect: new THREE.MeshBasicMaterial({ color: 0x4EBE59, transparent: true, opacity: 0.8, fog: false }),
    flashMatWrong: new THREE.MeshBasicMaterial({ color: 0xE74C3C, transparent: true, opacity: 0.8, fog: false }),

    init() {
        GameEngine.scene.add(this.leftGate);
        GameEngine.scene.add(this.rightGate);
        this.leftCanvas = document.createElement('canvas');
        this.leftCanvas.width = 512; this.leftCanvas.height = 256;
        this.leftCtx = this.leftCanvas.getContext('2d');
        this.leftTexture = new THREE.CanvasTexture(this.leftCanvas);
        this.rightCanvas = document.createElement('canvas');
        this.rightCanvas.width = 512; this.rightCanvas.height = 256;
        this.rightCtx = this.rightCanvas.getContext('2d');
        this.rightTexture = new THREE.CanvasTexture(this.rightCanvas);
        
        // FIX: MeshBasicMaterial ve fog:false sayesinde yazılar karanlıkta ve siste PİRIL PİRIL parlayacak!
        this.leftMat = new THREE.MeshBasicMaterial({ map: this.leftTexture, fog: false });
        this.rightMat = new THREE.MeshBasicMaterial({ map: this.rightTexture, fog: false });

        const buildGate = (group, mat) => {
            if(GameEngine.models['Door']) {
                const d = GameEngine.models['Door'].clone();
                if(typeof applyModelSettings !== 'undefined') applyModelSettings(d, 'Door');
                group.add(d);
            }
            const board = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 0.5), mat);
            board.position.set(0, 4.8, 1);
            group.add(board);
            const energy = new THREE.Mesh(new THREE.PlaneGeometry(3,4), new THREE.MeshBasicMaterial({color:0x3498db, transparent:true, opacity:0.25, side:THREE.DoubleSide}));
            energy.position.set(0,2,0);
            group.add(energy);
            group.visible = false;

            const flashBorder = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.3, 0.6), this.flashMatCorrect);
            flashBorder.position.set(0, 4.8, 1);
            flashBorder.visible = false;
            flashBorder.name = "flashLayer";
            group.add(flashBorder);
        };
        buildGate(this.leftGate, this.leftMat);
        buildGate(this.rightGate, this.rightMat);

        this.coinPool = new ObjectPool(() => {
            const c = GameEngine.models['coin-gold'] ? GameEngine.models['coin-gold'].clone() : new THREE.Group();
            if(typeof applyModelSettings !== 'undefined') applyModelSettings(c, 'coin-gold');
            GameEngine.scene.add(c);
            return c;
        }, 15);

        this.hintArrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.3, 1, 4),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0 })
        );
        this.hintArrow.rotation.z = -Math.PI/2;
        GameEngine.scene.add(this.hintArrow);
    },

    updateCanvasTexture(ctx, texture, text) {
        ctx.fillStyle = '#171712';
        ctx.fillRect(0, 0, 512, 256);
        ctx.lineWidth = 15;
        ctx.strokeStyle = '#F5B700';
        ctx.strokeRect(10, 10, 492, 236);
        ctx.font = 'bold 56px "KenneyFuture", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let displayText = text.length > 12 ? text.substring(0, 12) + '..' : text;
        ctx.fillText(displayText, 256, 128);
        texture.needsUpdate = true;
    },

    revealResult(gateGroup, isCorrect) {
        const flashLayer = gateGroup.children.find(c => c.name === "flashLayer");
        if(flashLayer) {
            flashLayer.material = isCorrect ? this.flashMatCorrect : this.flashMatWrong;
            flashLayer.visible = true;
            setTimeout(() => { flashLayer.visible = false; }, 500); 
        }
    },

    reset() {
        this.leftGate.visible = false;
        this.rightGate.visible = false;
        this.isGateActive = false;
        this.activeCoins.forEach(c => this.coinPool.release(c));
        this.activeCoins = [];
        if(this.chestObj) { GameEngine.scene.remove(this.chestObj); this.chestObj = null; }
        if(this.signObj) { GameEngine.scene.remove(this.signObj); this.signObj = null; }
        if(this.hintArrow) this.hintArrow.material.opacity = 0;
        const lf = this.leftGate.children.find(c=>c.name==="flashLayer");
        if(lf) lf.visible=false;
        const rf = this.rightGate.children.find(c=>c.name==="flashLayer");
        if(rf) rf.visible=false;
    },

    spawnGatePair() {
        if (!GameEngine.isPlaying || GameEngine.isLevelComplete) return;
        const r1 = Math.floor(Math.random() * GameEngine.wordPool.length);
        let r2 = Math.floor(Math.random() * GameEngine.wordPool.length);
        while (r1 === r2 && GameEngine.wordPool.length > 1) {
            r2 = Math.floor(Math.random() * GameEngine.wordPool.length);
        }
        GameEngine.currentEnWord = GameEngine.wordPool[r1];
        const wrongEnWord = GameEngine.wordPool[r2];
        GameEngine.currentCorrectTr = GameEngine.translationDict[GameEngine.currentEnWord] || GameEngine.currentEnWord;
        const wrongTr = GameEngine.translationDict[wrongEnWord] || wrongEnWord;

        if(typeof safeSetText !== 'undefined') safeSetText('target-word', GameEngine.currentEnWord);
        const tW = document.getElementById('target-word');
        if(tW) { tW.style.transform = 'scale(1)'; tW.style.color = '#FFF'; }

        const correctIsLeft = Math.random() > 0.5;
        this.updateCanvasTexture(this.leftCtx, this.leftTexture, correctIsLeft ? GameEngine.currentCorrectTr : wrongTr);
        this.updateCanvasTexture(this.rightCtx, this.rightTexture, !correctIsLeft ? GameEngine.currentCorrectTr : wrongTr);

        this.leftGate.position.set(-GameEngine.LANE_POS, 0, -150); // Kapılar daha uzakta belirsin
        this.leftGate.isCorrect = correctIsLeft;
        this.leftGate.visible = true;
        this.rightGate.position.set(GameEngine.LANE_POS, 0, -150);
        this.rightGate.isCorrect = !correctIsLeft;
        this.rightGate.visible = true;
        this.isGateActive = true;

        const lf = this.leftGate.children.find(c=>c.name==="flashLayer");
        if(lf) lf.visible=false;
        const rf = this.rightGate.children.find(c=>c.name==="flashLayer");
        if(rf) rf.visible=false;

        if(Math.random() > 0.3) this.spawnCoin(-70);
        if(Math.random() > 0.3) this.spawnCoin(-100);
    },
    
    spawnCoin(zPos) {
        const coin = this.coinPool.get();
        const lane = Math.random() > 0.5 ? GameEngine.LANE_POS : -GameEngine.LANE_POS;
        coin.position.set(lane, (typeof ModelAyarlari !== 'undefined' && ModelAyarlari['coin-gold']) ? ModelAyarlari['coin-gold'].yOffset : 0.5, zPos);
        this.activeCoins.push(coin);
    },
    
    spawnFinishLine() {
        if(GameEngine.models.chest) {
            this.chestObj = GameEngine.models.chest.clone();
            if(typeof applyModelSettings !== 'undefined') applyModelSettings(this.chestObj, 'chest');
            this.chestObj.position.set(PlayerController.targetX, ModelAyarlari['chest'] ? ModelAyarlari['chest'].yOffset : 0, -150);
            GameEngine.scene.add(this.chestObj);
        }
        if(typeof safeSetDisplay !== 'undefined') safeSetDisplay('target-word-container', 'none');
    },
    
    update(dt) {
        const speed = GameEngine.gameSpeed * (dt*60);

        for(let i=0; i<this.activeCoins.length; i++) {
            let c = this.activeCoins[i];
            c.position.z += speed;
            c.rotation.y += 0.05;
            if(c.position.z > -1 && c.position.z < 1.5 && Math.abs(PlayerController.currentX - c.position.x) < 1.5) {
                if(typeof TrackManager !== 'undefined') TrackManager.spawnParticles(c.position, 'coin');
                if(typeof AudioManager !== 'undefined') AudioManager.play('coin');
                this.coinPool.release(c);
                this.activeCoins.splice(i,1);
                i--;
                let earned = 1 + Math.floor(GameEngine.combo / 3);
                GameEngine.collectedCoins += earned;
                continue;
            }
            if(c.position.z > 15) {
                this.coinPool.release(c);
                this.activeCoins.splice(i,1);
                i--;
            }
        }

        if(GameEngine.isLevelComplete && this.chestObj) {
            this.chestObj.position.z += speed;
            if(this.signObj) this.signObj.position.z += speed;
            if(this.chestObj.position.z > -1) {
                if(typeof AudioManager !== 'undefined') AudioManager.play('correct');
                GameEngine.isPlaying = false;
                if(typeof MarketManager !== 'undefined') MarketManager.addCoins(GameEngine.collectedCoins);
                if(typeof safeSetDisplay !== 'undefined') {
                    safeSetDisplay('ui-layer', 'none');
                    safeSetDisplay('level-complete-screen', 'flex');
                }
                let fc = document.getElementById('final-coin-text');
                if(fc) fc.innerText = "0";
                let cV = 0;
                let intv = setInterval(() => {
                    cV++;
                    if(fc) fc.innerText = cV;
                    if(cV >= GameEngine.collectedCoins) clearInterval(intv);
                }, 40);
                if(typeof StatsManager !== 'undefined') StatsManager.recordGame('level', GameEngine.currentScore, GameEngine.wordsAnswered, GameEngine.collectedCoins, GameEngine.maxCombo, true, GameEngine.mistakes);
            }
        }

        if(this.leftGate.visible || this.rightGate.visible) {
            this.leftGate.position.z += speed;
            this.rightGate.position.z += speed;

            if (this.isGateActive && this.leftGate.position.z > -0.5) {
                this.isGateActive = false;
                let pLeft = PlayerController.targetX < 0;
                let hitCorrect = (pLeft && this.leftGate.isCorrect) || (!pLeft && this.rightGate.isCorrect);

                this.revealResult(this.leftGate, this.leftGate.isCorrect);
                this.revealResult(this.rightGate, this.rightGate.isCorrect);

                if (hitCorrect) {
                    GameEngine.wordsAnswered++;
                    GameEngine.combo++;
                    if (GameEngine.combo > GameEngine.maxCombo) GameEngine.maxCombo = GameEngine.combo;
                    
                    const comboText = document.getElementById('combo-text');
                    if(comboText) {
                        comboText.innerText = 'x' + GameEngine.combo;
                        const comboHud = document.getElementById('combo-hud');
                        if(comboHud) comboHud.classList.add('active');
                        comboText.parentElement.classList.add('combo-anim');
                        setTimeout(() => comboText.parentElement.classList.remove('combo-anim'), 300);
                    }

                    if(typeof AudioManager !== 'undefined') AudioManager.play('correct');
                    let earned = 1 + Math.floor(GameEngine.combo / 3);
                    GameEngine.collectedCoins += earned;

                    GameEngine.currentScore += GameEngine.gameMode === 'level' ? 1 : 10;
                    const pText = document.getElementById('progress-text');
                    if(pText) {
                        pText.innerText = GameEngine.gameMode === 'level' ? `HEDEF: ${GameEngine.wordsAnswered}/${GameEngine.wordsToWin}` : `SKOR: ${GameEngine.currentScore}`;
                        pText.parentElement.style.transform = 'scale(1.1)';
                        setTimeout(() => pText.parentElement.style.transform = 'scale(1)', 150);
                    }

                    GameEngine.updateBiome();
                    GameEngine.updateDifficulty();
                    if(GameEngine.gameMode === 'level' && GameEngine.wordsAnswered >= GameEngine.wordsToWin) {
                        GameEngine.isLevelComplete = true;
                        this.spawnFinishLine();
                    } else {
                        this.spawnGatePair();
                    }
                } else {
                    GameEngine.combo = 0;
                    GameEngine.mistakes++;
                    if(typeof safeSetText !== 'undefined') safeSetText('combo-text', 'x1');
                    const cH = document.getElementById('combo-hud');
                    if(cH) cH.classList.remove('active');
                    if(typeof AudioManager !== 'undefined') AudioManager.play('crash');
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
            }
        }
    }
};