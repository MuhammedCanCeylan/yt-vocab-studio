// editor.js - Modülleri sırayla ve güvenle başlatan Ana Dosya

import { StateManager } from './core/StateManager.js';
import { UIManager } from './ui/UIManager.js';
import { Viewport } from './3d/Viewport.js';
import { GizmoControls } from './3d/GizmoControls.js'; // ARTIK AKTİF!

class StudioEngine {
    constructor() {
        console.log('🚀 3ds Max Studio Motoru Ateşleniyor...');
        this.init();
    }

    init() {
        // 1. Zeka (Kayıtlı Ayarları Yükle)
        StateManager.loadPreset('default');
        
        // 2. Arayüzü Çiz (HTML DOM)
        UIManager.init();
        
        // 3. 3D Sahneyi oluştur ve UI'ın içine oturt
        Viewport.init();
        
        // 4. Tıklama, X-Y-Z Okları ve W, E, R Tuşları!
        GizmoControls.init();
        
        console.log('✅ BÜTÜN SİSTEM AKTİF: 3ds Max Deneyimine Hoş Geldiniz!');
    }
}

// DOM tamamen yüklendiğinde motoru çalıştır (Çakışmaları önler)
document.addEventListener('DOMContentLoaded', () => new StudioEngine());