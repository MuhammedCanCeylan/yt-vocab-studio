// main.js – Asset yükleme ve Ana Site (PostMessage) Veri Köprüsü
const AssetManager = {
    loadAll(onProgress, onComplete) {
        const loader = new THREE.GLTFLoader();
        const texLoader = new THREE.TextureLoader();
        GameEngine.particleMats = {
            star: new THREE.SpriteMaterial({ map: texLoader.load('assets/star_01.png'), color: 0xF5B700, transparent: true, blending: THREE.AdditiveBlending }),
            smoke: new THREE.SpriteMaterial({ map: texLoader.load('assets/smoke_04.png'), color: 0xbdc3c7, transparent: true, blending: THREE.NormalBlending })
        };

        const charIds = ['Casual_Hoodie', 'Beach', 'Worker', 'Farmer', 'Adventurer', 'Punk', 'Suit', 'Spacesuit', 'King', 'Swat'];
        const gltfIds = ['Door', 'Skull', 'Spikes', 'Cube_Spikes', 'Coin'];

        const modelsToLoad = Object.keys(ModelAyarlari).map(id => {
            let ext = '.glb';
            if (charIds.includes(id) || gltfIds.includes(id)) ext = '.gltf';
            return {
                id: id,
                path: `assets/${id}${ext}`,
                isChar: charIds.includes(id),
                c: true,  
                r: true   
            };
        });

        let loaded = 0;
        const total = modelsToLoad.length + 2;

        const prep = (s, cast, rec, isCoin) => {
            s.traverse(c => {
                if(c.isMesh) {
                    c.castShadow = cast;
                    c.receiveShadow = rec;
                    if(isCoin && c.material) {
                        c.material.metalness = 1.0;
                        c.material.roughness = 0.1;
                        c.material.color.setHex(0xFFD700);
                    }
                }
            });
            return s;
        };

        texLoader.load('assets/sky.png', (tex) => {
            tex.mapping = THREE.EquirectangularReflectionMapping;
            GameEngine.scene.background = tex;
            GameEngine.scene.environment = tex;
            loaded++;
            onProgress((loaded / total) * 100, 'Gökyüzü');
            if(loaded === total) onComplete();
        }, undefined, () => {
            loaded++;
            onProgress((loaded / total) * 100, 'Sky Hata');
            if(loaded === total) onComplete();
        });

        loader.load('assets/monsters/scene.gltf', (gltf) => {
            GameEngine.monsters = [];
            gltf.scene.traverse((n) => { if (n.isMesh) GameEngine.monsters.push(n); });
            loaded++;
            onProgress((loaded / total) * 100, 'Canavarlar');
            if(loaded === total) onComplete();
        }, undefined, () => {
            loaded++;
            onProgress((loaded / total) * 100, 'Monster Hata');
            if(loaded === total) onComplete();
        });

        modelsToLoad.forEach(m => {
            loader.load(m.path, (gltf) => {
                GameEngine.models[m.id] = m.isChar ? gltf : prep(gltf.scene, m.c, m.r, m.id.includes('coin'));
                loaded++;
                onProgress((loaded / total) * 100, m.id);
                if(loaded === total) onComplete();
            }, undefined, () => {
                loaded++;
                onProgress((loaded / total) * 100, m.id);
                if(loaded === total) onComplete();
            });
        });
    }
};

function enableMenuButtons() {
    ['start-lvl-btn', 'start-inf-btn', 'market-btn', 'stats-btn', 'test-btn'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.disabled = false;
    });
}

// ==============================================================
// ANA SİTEDEN KELİMELERİ ALAN KÖPRÜ (POSTMESSAGE LİSTENER)
// ==============================================================
window.addEventListener('message', async (event) => {
    // Güvenlik: Kendi domaininden gelmiyorsa reddet (Lokal testlere izin ver)
    if (event.origin !== window.location.origin && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') return;
    
    // Kelimeler array olarak geldiyse ve en az 1 kelime varsa kabul et
    if (event.data && event.data.type === 'VOCAB_LIST' && Array.isArray(event.data.words) && event.data.words.length > 0) {
        
        const rawWords = event.data.words.map(w => typeof w === 'string' ? w.trim().toLowerCase() : '');
        const uniqueWords = [...new Set(rawWords.filter(w => w !== ''))];
        
        if (uniqueWords.length === 0) return;

        // Kelimeleri motorun içine yaz ve kazanma hedefini ayarla
        GameEngine.wordPool = uniqueWords;
        GameEngine.wordsToWin = uniqueWords.length; // 2 kelime yollarsan hedef 0/2 olur
        
        safeSetText('status-desc', `${GameEngine.wordPool.length} KELİME ALINDI. Çevriliyor...`);
        
        try {
            // Çeviri API'sine istek at
            const res = await fetch('/api/translate_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: GameEngine.wordPool, source: 'en', target: 'tr' })
            });
            
            if (!res.ok) throw new Error(`API yanıt vermedi (Status: ${res.status})`);
            
            GameEngine.translationDict = await res.json();
            
            safeSetText('status-desc', `SİSTEM HAZIR. Oynamaya başlayabilirsin!`);
            enableMenuButtons();
            
        } catch (e) {
            console.warn("> Çeviri API hatası (Büyük ihtimalle lokaldesin). Kelimeler silinmiyor, İngilizce bırakılıyor.", e);
            
            // HATA DÜZELTMESİ: API çalışmazsa kelimeleri ÇÖPE ATMA!
            // İngilizce kelimeyi Türkçe çevirisiymiş gibi kendisine eşitle (Örn: stop = stop)
            GameEngine.translationDict = {};
            uniqueWords.forEach(w => {
                GameEngine.translationDict[w] = w;
            });
            
            safeSetText('status-desc', `API YOK. Kelimeler orjinal haliyle yüklendi.`);
            enableMenuButtons();
        }
    }
});

setTimeout(() => enableMenuButtons(), 2000);

// Eğer ana siteden mesaj gelmeden oyun açılırsa yedekleri yükle
if (typeof FALLBACK_WORDS !== 'undefined') {
    GameEngine.wordPool = Object.keys(FALLBACK_WORDS);
    GameEngine.translationDict = { ...FALLBACK_WORDS };
}

if (typeof SpeedLines !== 'undefined') SpeedLines.init();
GameEngine.init();

// Test ortamı için otomatik mesaj tetikleyici
if (window.location.search.includes('test=1')) {
    setTimeout(() => {
        window.postMessage({ type: 'VOCAB_LIST', words: Object.keys(FALLBACK_WORDS) }, '*');
    }, 500);
}