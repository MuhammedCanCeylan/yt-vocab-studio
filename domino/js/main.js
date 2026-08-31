// main.js - Başlatıcı, Modelleri Yükleyici ve Çeviri Zekası
document.addEventListener("DOMContentLoaded", () => {
    
    // Sesleri Başlat
    if (typeof AudioEngine !== 'undefined') AudioEngine.init();

    // Savaş alanını (3D Scene) kur
    if (typeof Game !== 'undefined') Game.init();

    const loader = new THREE.GLTFLoader();
    const currAssetEl = document.getElementById('current-asset');
    const loadingBar = document.getElementById('loading-bar');
    
    // Domino modelini yükle
    loader.load('assets/SM_Domino_1_.glb', (gltf) => {
        if(currAssetEl) currAssetEl.innerText = "Yüklendi!";
        if(loadingBar) loadingBar.style.width = "100%";
        
        // Modeli Domino Yöneticisine gönder
        if(typeof DominoManager !== 'undefined') DominoManager.init(gltf);
        
    }, undefined, (error) => {
        console.warn("Model Yüklenemedi! (Eğer SM_Domino_1_.glb yoksa oyun açılmaz)", error);
        if(currAssetEl) currAssetEl.innerText = "Model bulunamadı! (Hata)";
    });

    // --- ANA SİTE BAĞLANTISI VE ÇEVİRİ MOTORU ---
    window.addEventListener('message', async (event) => {
        if (event.data && event.data.type === 'VOCAB_LIST' && Array.isArray(event.data.words)) {
            MainData.wordPool = event.data.words;
            if(currAssetEl) currAssetEl.innerText = "Kelimeler Çevriliyor...";
            
            try {
                // DİKKAT: Bilinmeyen kelimeleri doğrudan Python API'mize yollayıp çevirilerini çekiyoruz!
                const res = await fetch('/api/translate_batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ words: MainData.wordPool, source: 'en', target: 'tr' })
                });
                
                const dict = await res.json();
                
                // Eğer API Array döndürürse Objeye çevir, Obje ise direkt al
                MainData.translationDict = {};
                if (Array.isArray(dict)) {
                    dict.forEach(item => { if(item && item.word) MainData.translationDict[item.word.toLowerCase()] = item.tr; });
                } else {
                    for(let key in dict) { MainData.translationDict[key.toLowerCase()] = dict[key]; }
                }
            } catch(e) {
                console.warn("Çeviri API'sine ulaşılamadı, kelimeler İngilizce kalabilir.", e);
            }

            // Yükleme ekranını kaldır, Başlat ekranını aç
            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('start-screen').style.display = 'flex';
        }
    });

    // Test modundayken veya ana siteden hiç veri gelmezse
    setTimeout(() => {
        if (MainData.wordPool.length === 0) {
            MainData.wordPool = Object.keys(FALLBACK_WORDS);
            MainData.translationDict = { ...FALLBACK_WORDS };
            console.log("Bağlantı algılanmadı, test kelimeleri yüklendi.");
            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('start-screen').style.display = 'flex';
        }
    }, 2500);
});