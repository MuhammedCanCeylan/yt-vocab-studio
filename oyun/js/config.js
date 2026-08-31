// config.js – Sabitler ve model ayarları

// FIX: Zengin Yedek Kelime Sözlüğü (Redeclaration hatasını önlemek için buraya taşındı)
const FALLBACK_WORDS = { 
    "apple": "elma", "car": "araba", "house": "ev", "computer": "bilgisayar", "fire": "ateş", "water": "su",
    "tree": "ağaç", "bird": "kuş", "sun": "güneş", "moon": "ay", "star": "yıldız", "book": "kitap",
    "road": "yol", "sky": "gökyüzü", "fast": "hızlı", "slow": "yavaş", "game": "oyun", "play": "oynamak"
};

const ModelAyarlari = {
    'Casual_Hoodie': { scale: 1.40, rotY: 0, yOffset: 0.00 },
    'light-curved': { scale: 4.50, rotY: 0, yOffset: 0.00 }, // FIX: Cüce lamba sorunu
    'bat_low': { scale: 1.10, rotY: 0, yOffset: 0.00 },
    'Beach': { scale: 1.40, rotY: 0, yOffset: 0.00 },
    'Adventurer': { scale: 1.40, rotY: 0, yOffset: 0.00 },
    'Backpack': { scale: 1.00, rotY: 0, yOffset: 0.40 },
    'ambulance': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'block-grass-large': { scale: 4.00, rotY: 0, yOffset: 0.00 },
    'bomb': { scale: 1.00, rotY: 0, yOffset: 0.00 },
    'Book': { scale: 1.00, rotY: 0, yOffset: 0.00 },
    'bush01': { scale: 2.00, rotY: 0, yOffset: 0.00 },
    'cactus_short': { scale: 5.00, rotY: 0, yOffset: 0.24 },
    'cactus_tall': { scale: 5.00, rotY: 0, yOffset: 0.00 },
    'campfire_logs': { scale: 5.00, rotY: 0, yOffset: 0.24 },
    'case_low': { scale: 2.00, rotY: 0, yOffset: 0.04 },
    'chest': { scale: 1.50, rotY: 0, yOffset: 0.00 },
    'Coin': { scale: 0.50, rotY: 0, yOffset: 0.46 },
    'coin-gold': { scale: 2.20, rotY: 0, yOffset: 0.00 },
    'coin-silver': { scale: 2.20, rotY: 0, yOffset: 0.00 },
    'construction-barrier': { scale: 14.00, rotY: 0, yOffset: 0.00 },
    'construction-cone': { scale: 14.00, rotY: 0, yOffset: 0.00 },
    'Crown': { scale: 0.50, rotY: 0, yOffset: 0.09 },
    'Cube_Spikes': { scale: 0.70, rotY: 0, yOffset: 0.60 },
    'delivery': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'Door': { scale: 0.87, rotY: 0, yOffset: 0.00 },
    'door-large-open': { scale: 3.50, rotY: 0, yOffset: 0.00 },
    'Farmer': { scale: 1.40, rotY: 0, yOffset: 0.00 },
    'firetruck': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'floopydisk': { scale: 1.20, rotY: 0, yOffset: 0.18 },
    'garbage-truck': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'grass_patch': { scale: 1.30, rotY: 0, yOffset: 0.00 },
    'grass01': { scale: 2.00, rotY: 0, yOffset: 0.00 },
    'hatchback-sports': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'key': { scale: 1.00, rotY: 0, yOffset: 0.00 },
    'King': { scale: 1.40, rotY: 0, yOffset: 0.00 },
    'log_stackLarge': { scale: 4.20, rotY: 0, yOffset: 0.00 },
    'magestaff_low': { scale: 1.00, rotY: 0, yOffset: 0.81 },
    'mushroom_redGroup': { scale: 5.00, rotY: 0, yOffset: 0.00 },
    'mushroom_redTall': { scale: 5.00, rotY: 0, yOffset: 0.00 },
    'mushroom_tanTall': { scale: 5.00, rotY: 0, yOffset: 0.00 },
    'phone_low': { scale: 1.00, rotY: 0, yOffset: 0.00 },
    'police': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'Punk': { scale: 1.40, rotY: 0, yOffset: 0.00 },
    'road-straight': { scale: 12.00, rotY: 90, yOffset: 0.00 }, // FIX: Yol genişliği artırıldı
    'rock_largeA': { scale: 13.00, rotY: 0, yOffset: 0.00 },
    'rock_largeB': { scale: 13.00, rotY: 0, yOffset: 0.00 },
    'rock_tallA': { scale: 13.00, rotY: 0, yOffset: 0.00 },
    'sedan': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'sign': { scale: 5.00, rotY: 0, yOffset: 0.00 },
    'sign-highway': { scale: 9.00, rotY: 90, yOffset: 0.00 },
    'Skull': { scale: 0.50, rotY: 0, yOffset: 0.00 },
    'Spacesuit': { scale: 1.40, rotY: 0, yOffset: 0.00 },
    'spike-block': { scale: 1.80, rotY: 0, yOffset: 0.00 },
    'Spikes': { scale: 1.00, rotY: 0, yOffset: 0.00 },
    'star': { scale: 3.00, rotY: 0, yOffset: 0.00 },
    'statue_head': { scale: 5.00, rotY: 180, yOffset: 0.00 },
    'statue_obelisk': { scale: 5.00, rotY: 0, yOffset: 0.00 },
    'statue_ring': { scale: 5.00, rotY: 0, yOffset: 0.00 },
    'Suit': { scale: 1.40, rotY: 0, yOffset: 0.00 },
    'suv': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'suv-luxury': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'Swat': { scale: 1.40, rotY: 0, yOffset: 0.00 },
    'Sword': { scale: 0.80, rotY: 0, yOffset: 0.00 },
    'taxi': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'tent_detailedClosed': { scale: 8.00, rotY: 180, yOffset: 0.00 },
    'trap-spikes-large': { scale: 2.30, rotY: 0, yOffset: 0.00 },
    'tree_oak_dark': { scale: 5.00, rotY: 0, yOffset: 0.00 },
    'tree_palmDetailedTall': { scale: 4.70, rotY: 0, yOffset: 0.00 },
    'tree_pineTallA_detailed': { scale: 5.00, rotY: 0, yOffset: 0.00 },
    'tree01': { scale: 1.30, rotY: 0, yOffset: 0.00 },
    'tree02': { scale: 1.30, rotY: 0, yOffset: 0.00 },
    'tree04': { scale: 1.30, rotY: 0, yOffset: 0.00 },
    'tree07': { scale: 1.30, rotY: 0, yOffset: 0.00 },
    'truck': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'van': { scale: 2.40, rotY: 0, yOffset: 0.00 },
    'Worker': { scale: 1.40, rotY: 0, yOffset: 0.00 }
};

function applyModelSettings(mesh, key) {
    const ayar = ModelAyarlari[key];
    if (ayar) {
        mesh.scale.set(ayar.scale, ayar.scale, ayar.scale);
        mesh.rotation.y = ayar.rotY * (Math.PI / 180);
        mesh.position.y = ayar.yOffset || 0;
    }
}