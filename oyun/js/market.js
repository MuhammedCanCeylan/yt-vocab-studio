// market.js – Market ve karakter yönetimi
const MarketManager = {
    coins: 0,
    unlocked: safeParseJSON('vocab_runner_unlocked', ['Casual_Hoodie']),
    selected: safeGetItem('vocab_runner_selected', 'Casual_Hoodie'),
    previewModel: null,
    previewMixer: null,

    characters: [
        { id: 'Casual_Hoodie', name: 'Genç', price: 0 },
        { id: 'Beach', name: 'Tatilci', price: 30 },
        { id: 'Worker', name: 'Usta', price: 50 },
        { id: 'Farmer', name: 'Çiftçi', price: 80 },
        { id: 'Adventurer', name: 'Kaşif', price: 100 },
        { id: 'Punk', name: 'Punk', price: 150 },
        { id: 'Suit', name: 'Ajan', price: 200 },
        { id: 'Spacesuit', name: 'Uzaylı', price: 300 },
        { id: 'Swat', name: 'SWAT', price: 400 },
        { id: 'King', name: 'Kral', price: 500 }
    ],

    init() {
        let savedCoins = parseInt(safeGetItem('vocab_runner_coins', '0'));
        this.coins = isNaN(savedCoins) ? 0 : savedCoins;
        this.save();
    },
    save() {
        safeSetItem('vocab_runner_coins', this.coins);
        safeSetItem('vocab_runner_unlocked', JSON.stringify(this.unlocked));
        safeSetItem('vocab_runner_selected', this.selected);
        safeSetText('menu-total-coins', this.coins);
        safeSetText('store-total-coins', this.coins);
    },
    addCoins(amount) { this.coins += amount; this.save(); },
    openStore() {
        safeSetDisplay('start-screen', 'none');
        safeSetDisplay('market-screen', 'flex');
        const pv = document.getElementById('market-3d-preview');
        if(pv) pv.style.display = 'block';
        this.renderStore();
        this.updatePreview(this.selected);
    },
    closeStore() {
        safeSetDisplay('market-screen', 'none');
        safeSetDisplay('start-screen', 'flex');
        const pv = document.getElementById('market-3d-preview');
        if(pv) pv.style.display = 'none';
        PlayerController.changeCharacter(this.selected);
        if(this.previewModel) { GameEngine.scene.remove(this.previewModel); this.previewModel = null; }
    },
    updatePreview(charId) {
        if(this.previewModel) { GameEngine.scene.remove(this.previewModel); }
        let gltf = GameEngine.models[charId] || GameEngine.models['Casual_Hoodie'];
        if(!gltf || !gltf.scene) return;

        if (typeof THREE.SkeletonUtils !== 'undefined') {
            this.previewModel = THREE.SkeletonUtils.clone(gltf.scene);
        } else {
            this.previewModel = gltf.scene.clone();
        }
        applyModelSettings(this.previewModel, charId);
        this.previewModel.scale.multiplyScalar(1.5);
        this.previewModel.position.set(0, 1, 5);
        GameEngine.scene.add(this.previewModel);

        this.previewMixer = new THREE.AnimationMixer(this.previewModel);
        const idleClip = gltf.animations && (THREE.AnimationClip.findByName(gltf.animations, 'Idle') || gltf.animations[0]);
        if(idleClip) this.previewMixer.clipAction(idleClip).play();
    },
    update(dt) {
        if (this.previewModel) this.previewModel.rotation.y += 0.5 * dt;
        if (this.previewMixer) this.previewMixer.update(dt);
    },
    renderStore() {
        const grid = document.getElementById('char-grid');
        if(!grid) return;
        grid.innerHTML = '';
        this.characters.forEach(c => {
            const isUnlocked = this.unlocked.includes(c.id);
            const isSelected = this.selected === c.id;
            const hasModel = !!GameEngine.models[c.id];
            const div = document.createElement('div');
            div.className = `char-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
            let actionText = isSelected ? "✅ SEÇİLDİ" : (isUnlocked ? "SEÇ" : (hasModel ? `SATIN AL` : "YÜKLENMEDİ"));
            div.innerHTML = `<h3 style="color:#FFF; margin:0; font-size:14px;">${c.name}</h3>
                             <span class="char-price">${isUnlocked ? 'SAHİPSİN' : c.price + ' 🪙'}</span>
                             <p style="color:#8A8578; font-size:10px; font-weight:bold; margin:6px 0 0 0;">${actionText}</p>`;
            div.onmouseenter = () => { if(hasModel) this.updatePreview(c.id); };
            div.onmouseleave = () => { this.updatePreview(this.selected); };
            div.onclick = () => {
                if (!hasModel && !isUnlocked) { AudioManager.play('crash'); return; }
                if (isUnlocked) {
                    this.selected = c.id;
                    this.save();
                    this.renderStore();
                    this.updatePreview(c.id);
                } else if (this.coins >= c.price) {
                    this.coins -= c.price;
                    this.unlocked.push(c.id);
                    this.selected = c.id;
                    AudioManager.play('coin');
                    this.save();
                    this.renderStore();
                    this.updatePreview(c.id);
                    AchievementManager.unlock('collector', 'Koleksiyoncu');
                } else {
                    AudioManager.play('crash');
                    div.style.animation = 'shake 0.3s';
                    setTimeout(() => div.style.animation = '', 300);
                }
            };
            grid.appendChild(div);
        });
    }
};