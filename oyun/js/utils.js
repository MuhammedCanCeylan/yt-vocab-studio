// utils.js – Yardımcı Fonksiyonlar ve UI Sürükleme Aracı

/**
 * HTML elementine güvenli bir şekilde metin yazar.
 * Element yoksa sessizce geçer.
 * @param {string} id - Elementin ID'si
 * @param {string} text - Yazılacak metin
 */
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = text || '';
    }
}

/**
 * HTML elementinin display özelliğini güvenli bir şekilde değiştirir.
 * Element yoksa sessizce geçer.
 * @param {string} id - Elementin ID'si
 * @param {string} display - CSS display değeri ('none', 'flex', 'block', vb.)
 */
function safeSetDisplay(id, display) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = display;
    }
}

/**
 * localStorage'dan veri okur. Veri yoksa çökmek yerine fallback değerini döndürür.
 * (OYUNUN ÇÖKMESİNİ ENGELLEYEN KRİTİK FONKSİYON)
 */
function safeGetItem(key, fallback) { 
    try { 
        return localStorage.getItem(key) || fallback; 
    } catch(e) { 
        return fallback; 
    } 
}

/**
 * localStorage'a veri yazar. Kota dolduysa veya gizli moddaysa sessizce geçer.
 * (OYUNUN ÇÖKMESİNİ ENGELLEYEN KRİTİK FONKSİYON)
 */
function safeSetItem(key, val) { 
    try { 
        localStorage.setItem(key, val); 
    } catch(e) {} 
}

/**
 * localStorage'dan güvenli bir şekilde JSON verisi okur.
 * Veri yoksa veya bozuksa varsayılan değeri döndürür.
 * @param {string} key - localStorage anahtarı
 * @param {*} defaultValue - Varsayılan değer
 * @returns {*} Parse edilmiş veri veya varsayılan değer
 */
function safeParseJSON(key, defaultValue) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) {
            return defaultValue;
        }
        return JSON.parse(raw);
    } catch (e) {
        console.warn(`safeParseJSON: "${key}" anahtarı okunamadı, varsayılan değer döndürülüyor.`);
        return defaultValue;
    }
}

/**
 * localStorage'a güvenli bir şekilde JSON verisi yazar.
 * @param {string} key - localStorage anahtarı
 * @param {*} value - Kaydedilecek değer
 */
function safeSetJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn(`safeSetJSON: "${key}" anahtarı yazılamadı.`);
    }
}

/**
 * Bir elementi belirli bir handle (başlık çubuğu) ile sürüklenebilir yapar.
 * Özellikle Unity tarzı panel pencereleri için kullanışlıdır.
 * @param {HTMLElement} element - Sürüklenecek ana element
 * @param {HTMLElement} handle - Sürükleme işleminin başlatılacağı tutamaç
 */
function makeDraggable(element, handle) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    if(!handle || !element) return;

    handle.addEventListener('mousedown', (e) => {
        // Kapatma butonuna basılırsa sürüklemeyi iptal et
        if(e.target.tagName === 'BUTTON' || e.target.classList.contains('unity-close-btn')) return;
        
        isDragging = true;
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        element.style.left = (e.clientX - offsetX) + 'px';
        element.style.top = (e.clientY - offsetY) + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

/**
 * Belirli bir aralıkta rastgele tam sayı üretir.
 * @param {number} min - Alt sınır (dahil)
 * @param {number} max - Üst sınır (dahil)
 * @returns {number} Rastgele tam sayı
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sayıyı belirli bir aralıkta sınırlar.
 * @param {number} value - Girdi değeri
 * @param {number} min - Minimum değer
 * @param {number} max - Maksimum değer
 * @returns {number} Sınırlanmış değer
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * İki sayı arasında doğrusal interpolasyon yapar.
 * @param {number} a - Başlangıç değeri
 * @param {number} b - Bitiş değeri
 * @param {number} t - 0 ile 1 arasında ilerleme oranı
 * @returns {number} Ara değer
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Saniye cinsinden süreyi "dakika:saniye" formatına çevirir.
 * @param {number} seconds - Süre (saniye)
 * @returns {string} Formatlanmış süre
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Fonksiyon çağrılarını belirli bir süre boyunca sınırlar.
 * @param {Function} func - Sınırlanacak fonksiyon
 * @param {number} limit - Milisaniye cinsinden bekleme süresi
 * @returns {Function} Sınırlanmış fonksiyon
 */
function throttle(func, limit = 250) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}

/**
 * Fonksiyonun çalışmasını belirli bir süre geciktirir.
 * @param {Function} func - Geciktirilecek fonksiyon
 * @param {number} delay - Milisaniye cinsinden gecikme
 * @returns {Function} Geciktirilmiş fonksiyon
 */
function debounce(func, delay = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Bir nesneyi derinlemesine kopyalar.
 * @param {Object} obj - Kopyalanacak nesne
 * @returns {Object} Kopya
 */
function deepClone(obj) {
    if (typeof structuredClone === 'function') {
        return structuredClone(obj);
    }
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        return { ...obj };
    }
}

/**
 * Rastgele bir HEX renk kodu üretir.
 * @returns {string} Örnek: "#a3b4c5"
 */
function randomHexColor() {
    return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
}

/**
 * Bir dizi içindeki öğeleri karıştırır (Fisher-Yates algoritması).
 * @param {Array} array - Karıştırılacak dizi
 * @returns {Array} Karıştırılmış dizi
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}