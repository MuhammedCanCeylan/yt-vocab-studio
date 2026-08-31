// devpanel.js - Oyun İçi Geliştirici Paneli v2.1
// Blender ruhu, oyun basitliği. localStorage, presetler, export/import, performans monitörü.

const DevPanel = {
    isVisible: false,
    settings: {},
    presets: [],
    defaults: {
        // Domino
        rotX: 0, rotY: 0, rotZ: 90,
        scale: 1.5, pivotY: 3.5,
        // Kamera
        camY: 3.0, camZ: 15.0, camOffsetX: -4.0,
        camRotX: 0, camRotY: 0,
        // Fizik
        spacing: 3.0, fallSpeed: 5.5,
        // Görünüm
        materialColor: '#cccccc', customTexture: '',
        // Işık & Ortam
        bgColor: '#111111', ambientIntensity: 0.6,
        lightX: 10, lightY: 20, lightZ: 10,
        lightColor: '#ffffff', lightIntensity: 1.0,
        shadowsEnabled: true,
        // Gelişmiş
        autoRotate: false, autoRotateSpeed: 1.0,
        showGrid: true, gridSize: 20
    },

    init() {
        this.loadSettings();
        this.loadPresets();
        this.ensureContainer();
        this.injectCSS();
        this.injectHTML();
        this.injectToggleButton();
        this.bindEvents();
        this.bindKeyboard();
        this.applySettingsToUI();
        this.updateLabels();
        this.startPerformanceMonitor();
    },

    ensureContainer() {
        let container = document.getElementById('dev-panel-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'dev-panel-container';
            document.body.appendChild(container);
        }
        return container;
    },

    injectCSS() {
        const style = document.createElement('style');
        style.innerHTML = `
            /* === TOGGLE BUTONU (Sürüklenebilir) === */
            #dev-panel-toggle {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 48px;
                height: 48px;
                background: #313244;
                border: 2px solid #45475a;
                border-radius: 12px;
                color: #89b4fa;
                font-size: 20px;
                cursor: grab;
                z-index: 299;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                transition: transform 0.2s, background 0.2s;
                user-select: none;
                touch-action: none;
            }
            #dev-panel-toggle:active { cursor: grabbing; transform: scale(0.95); }
            #dev-panel-toggle:hover { background: #45475a; }

            /* === ANA PANEL === */
            #dev-panel {
                position: fixed;
                top: 0;
                right: 0;
                width: 380px;
                max-width: 100vw;
                height: 100vh;
                background: #1e1e2e;
                border-left: 1px solid #313244;
                z-index: 300;
                pointer-events: auto;
                color: #cdd6f4;
                font-family: 'Segoe UI', system-ui, sans-serif;
                font-size: 13px;
                display: none;
                flex-direction: column;
                overflow: hidden;
                box-shadow: -8px 0 40px rgba(0,0,0,0.8);
            }
            #dev-panel.visible { display: flex; }

            /* === HEADER === */
            .dev-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 16px;
                background: #181825;
                border-bottom: 1px solid #313244;
            }
            .dev-panel-title {
                font-weight: 700;
                color: #cdd6f4;
                font-size: 15px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .dev-panel-title::before {
                content: '◈';
                color: #89b4fa;
                font-size: 18px;
            }
            .dev-header-actions {
                display: flex;
                gap: 8px;
            }
            .dev-btn-icon {
                background: none;
                border: none;
                color: #a6adc8;
                font-size: 16px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: all 0.2s;
            }
            .dev-btn-icon:hover { background: #313244; color: #f38ba8; }

            /* === SEKMELER === */
            .dev-panel-tabs {
                display: flex;
                flex-wrap: wrap;
                background: #181825;
                border-bottom: 1px solid #313244;
                padding: 6px 8px;
                gap: 4px;
            }
            .dev-tab {
                background: transparent;
                border: none;
                color: #a6adc8;
                padding: 8px 14px;
                cursor: pointer;
                font-size: 12px;
                border-radius: 6px;
                font-weight: 600;
                transition: all 0.2s;
                position: relative;
            }
            .dev-tab:hover { background: #313244; color: #cdd6f4; }
            .dev-tab.active { background: #89b4fa; color: #1e1e2e; }
            .dev-tab .shortcut {
                font-size: 10px;
                opacity: 0.6;
                margin-left: 4px;
            }

            /* === İÇERİK === */
            .dev-panel-content {
                padding: 16px;
                overflow-y: auto;
                flex: 1;
                scrollbar-width: thin;
                scrollbar-color: #45475a #181825;
            }
            .dev-panel-content::-webkit-scrollbar { width: 8px; }
            .dev-panel-content::-webkit-scrollbar-track { background: #181825; }
            .dev-panel-content::-webkit-scrollbar-thumb { background: #45475a; border-radius: 4px; }
            .dev-tab-content { display: none; animation: fadeIn 0.2s; }
            .dev-tab-content.active { display: block; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

            /* === KATEGORİLER === */
            .dev-category {
                background: #313244;
                padding: 8px 12px;
                font-weight: 700;
                margin: 20px 0 12px 0;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
                border: 1px solid #45475a;
                color: #cdd6f4;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .dev-category:first-child { margin-top: 0; }

            /* === SATIRLAR === */
            .dev-row {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 16px;
            }
            .dev-row label {
                display: flex;
                justify-content: space-between;
                font-weight: 500;
                color: #a6adc8;
                font-size: 12px;
            }
            .dev-row label span {
                color: #f5e0dc;
                font-family: 'JetBrains Mono', monospace;
                background: #11111b;
                padding: 2px 8px;
                border-radius: 4px;
                border: 1px solid #45475a;
                min-width: 50px;
                text-align: right;
                font-size: 11px;
            }

            /* === INPUTLAR === */
            input[type="range"] {
                -webkit-appearance: none;
                width: 100%;
                background: transparent;
                outline: none;
                margin-top: 4px;
            }
            input[type="range"]::-webkit-slider-runnable-track {
                width: 100%;
                height: 6px;
                cursor: pointer;
                background: #11111b;
                border-radius: 3px;
                border: 1px solid #45475a;
            }
            input[type="range"]::-webkit-slider-thumb {
                height: 18px;
                width: 10px;
                border-radius: 3px;
                background: #89b4fa;
                cursor: pointer;
                -webkit-appearance: none;
                margin-top: -7px;
                border: 1px solid #b4befe;
                transition: background 0.2s;
            }
            input[type="range"]:hover::-webkit-slider-thumb { background: #b4befe; }
            input[type="range"]:focus::-webkit-slider-thumb { background: #f38ba8; border-color: #fab387; }

            input[type="text"], input[type="number"] {
                width: 100%;
                padding: 8px;
                background: #11111b;
                color: #cdd6f4;
                border: 1px solid #45475a;
                border-radius: 6px;
                box-sizing: border-box;
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                transition: border-color 0.2s;
            }
            input[type="text"]:focus, input[type="number"]:focus {
                outline: none;
                border-color: #89b4fa;
            }

            input[type="color"] {
                width: 100%;
                height: 32px;
                border: 1px solid #45475a;
                border-radius: 6px;
                background: #11111b;
                cursor: pointer;
                padding: 2px;
            }

            input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: #89b4fa;
                cursor: pointer;
            }

            .dev-row-inline {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            .dev-row-inline label {
                flex: 1;
                color: #a6adc8;
                font-size: 12px;
            }

            /* === PRESETLER === */
            .dev-preset-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-bottom: 16px;
            }
            .dev-preset-btn {
                background: #313244;
                border: 1px solid #45475a;
                color: #cdd6f4;
                padding: 8px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 600;
                transition: all 0.2s;
                text-align: center;
            }
            .dev-preset-btn:hover { background: #45475a; }
            .dev-preset-btn.active { background: #89b4fa; color: #1e1e2e; border-color: #89b4fa; }

            .dev-preset-actions {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
            }

            /* === FOOTER === */
            .dev-panel-footer {
                display: flex;
                gap: 8px;
                padding: 14px;
                background: #181825;
                border-top: 1px solid #313244;
                flex-wrap: wrap;
            }
            .dev-btn-primary {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 700;
                background: #89b4fa;
                color: #1e1e2e;
                transition: all 0.2s;
                min-width: 100px;
                font-size: 12px;
            }
            .dev-btn-primary:hover { background: #b4befe; transform: translateY(-1px); }
            .dev-btn-secondary {
                flex: 1;
                padding: 10px;
                border: 1px solid #45475a;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                background: #313244;
                color: #cdd6f4;
                transition: all 0.2s;
                min-width: 100px;
                font-size: 12px;
            }
            .dev-btn-secondary:hover { background: #45475a; }
            .dev-btn-danger {
                padding: 10px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                background: #f38ba8;
                color: #1e1e2e;
                transition: all 0.2s;
                font-size: 12px;
            }
            .dev-btn-danger:hover { background: #fab387; }

            /* === PERFORMANS === */
            .dev-stat-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 12px;
            }
            .dev-stat-card {
                background: #11111b;
                border: 1px solid #45475a;
                border-radius: 8px;
                padding: 12px;
                text-align: center;
            }
            .dev-stat-value {
                font-family: 'JetBrains Mono', monospace;
                font-size: 20px;
                font-weight: 700;
                color: #89b4fa;
            }
            .dev-stat-label {
                font-size: 11px;
                color: #a6adc8;
                margin-top: 4px;
            }

            /* === MOBİL === */
            @media (max-width: 480px) {
                #dev-panel { width: 100vw; }
                .dev-panel-tabs { overflow-x: auto; flex-wrap: nowrap; }
                .dev-tab { white-space: nowrap; }
            }
        `;
        document.head.appendChild(style);
    },

    injectHTML() {
        const container = this.ensureContainer();
        container.innerHTML = `
            <div id="dev-panel">
                <div class="dev-panel-header">
                    <div class="dev-panel-title">Geliştirici Paneli</div>
                    <div class="dev-header-actions">
                        <button class="dev-btn-icon" id="btn-export" title="Export (Ctrl+S)">💾</button>
                        <button class="dev-btn-icon" id="btn-import" title="Import">📂</button>
                        <button class="dev-btn-icon dev-minimize" title="Kapat (ESC)">✕</button>
                    </div>
                </div>
                <div class="dev-panel-tabs">
                    <button class="dev-tab active" data-tab="domino">Domino <span class="shortcut">1</span></button>
                    <button class="dev-tab" data-tab="camera">Kamera <span class="shortcut">2</span></button>
                    <button class="dev-tab" data-tab="light">Işık <span class="shortcut">3</span></button>
                    <button class="dev-tab" data-tab="physics">Fizik <span class="shortcut">4</span></button>
                    <button class="dev-tab" data-tab="perf">Perf <span class="shortcut">5</span></button>
                </div>
                <div class="dev-panel-content">
                    <!-- DOMINO SEKMESİ -->
                    <div class="dev-tab-content active" id="tab-domino">
                        <div class="dev-category">🔄 Dönüş Açıları</div>
                        <div class="dev-row">
                            <label>X Açısı (Eğim): <span id="val-rot-x">0</span>°</label>
                            <input type="range" id="inp-rot-x" min="-180" max="180" step="5" value="0">
                        </div>
                        <div class="dev-row">
                            <label>Y Açısı (Yön): <span id="val-rot-y">0</span>°</label>
                            <input type="range" id="inp-rot-y" min="-180" max="180" step="5" value="0">
                        </div>
                        <div class="dev-row">
                            <label>Z Açısı (Yatma): <span id="val-rot-z">90</span>°</label>
                            <input type="range" id="inp-rot-z" min="-180" max="180" step="5" value="90">
                        </div>
                        
                        <div class="dev-category">📏 Boyut & Konum</div>
                        <div class="dev-row">
                            <label>Boyut (Scale): <span id="val-scale">1.5</span></label>
                            <input type="range" id="inp-scale" min="0.1" max="10.0" step="0.1" value="1.5">
                        </div>
                        <div class="dev-row">
                            <label>Yerden Yükseklik (Pivot Y): <span id="val-pivot">3.5</span></label>
                            <input type="range" id="inp-pivot" min="-5.0" max="20.0" step="0.1" value="3.5">
                        </div>

                        <div class="dev-category">💾 Hızlı Presetler</div>
                        <div class="dev-preset-grid">
                            <button class="dev-preset-btn" data-preset="0">Slot 1</button>
                            <button class="dev-preset-btn" data-preset="1">Slot 2</button>
                            <button class="dev-preset-btn" data-preset="2">Slot 3</button>
                        </div>
                        <div class="dev-preset-actions">
                            <button class="dev-btn-secondary" id="btn-save-preset" style="flex:1;">💾 Kaydet</button>
                            <button class="dev-btn-secondary" id="btn-load-preset" style="flex:1;">📂 Yükle</button>
                        </div>
                    </div>

                    <!-- KAMERA SEKMESİ -->
                    <div class="dev-tab-content" id="tab-camera">
                        <div class="dev-category">🎥 Pozisyon</div>
                        <div class="dev-row">
                            <label>Yükseklik (Y): <span id="val-camy">3.0</span></label>
                            <input type="range" id="inp-camy" min="0.5" max="50.0" step="0.5" value="3.0">
                        </div>
                        <div class="dev-row">
                            <label>Uzaklık (Z): <span id="val-camz">15.0</span></label>
                            <input type="range" id="inp-camz" min="1.0" max="100.0" step="0.5" value="15.0">
                        </div>
                        <div class="dev-row">
                            <label>Yatay Kaydırma (X): <span id="val-cam-offset-x">-4.0</span></label>
                            <input type="range" id="inp-cam-offset-x" min="-20.0" max="20.0" step="0.5" value="-4.0">
                        </div>

                        <div class="dev-category">🎯 Rotasyon</div>
                        <div class="dev-row">
                            <label>Kamera X Açısı: <span id="val-cam-rot-x">0</span>°</label>
                            <input type="range" id="inp-cam-rot-x" min="-90" max="90" step="1" value="0">
                        </div>
                        <div class="dev-row">
                            <label>Kamera Y Açısı: <span id="val-cam-rot-y">0</span>°</label>
                            <input type="range" id="inp-cam-rot-y" min="-180" max="180" step="1" value="0">
                        </div>

                        <div class="dev-category">⚙️ Ekstra</div>
                        <div class="dev-row-inline">
                            <label>Otomatik Döndürme</label>
                            <input type="checkbox" id="inp-auto-rotate">
                        </div>
                        <div class="dev-row">
                            <label>Döndürme Hızı: <span id="val-auto-rotate-speed">1.0</span></label>
                            <input type="range" id="inp-auto-rotate-speed" min="0.1" max="10.0" step="0.1" value="1.0">
                        </div>
                    </div>

                    <!-- IŞIK SEKMESİ -->
                    <div class="dev-tab-content" id="tab-light">
                        <div class="dev-category">🌅 Ortam</div>
                        <div class="dev-row">
                            <label>Arka Plan Rengi:</label>
                            <input type="color" id="inp-bg-color" value="#111111">
                        </div>
                        <div class="dev-row">
                            <label>Ambiyans Şiddeti: <span id="val-ambient">0.6</span></label>
                            <input type="range" id="inp-ambient" min="0" max="2" step="0.1" value="0.6">
                        </div>

                        <div class="dev-category">💡 Ana Işık</div>
                        <div class="dev-row">
                            <label>Işık X: <span id="val-light-x">10</span></label>
                            <input type="range" id="inp-light-x" min="-50" max="50" step="1" value="10">
                        </div>
                        <div class="dev-row">
                            <label>Işık Y: <span id="val-light-y">20</span></label>
                            <input type="range" id="inp-light-y" min="0" max="100" step="1" value="20">
                        </div>
                        <div class="dev-row">
                            <label>Işık Z: <span id="val-light-z">10</span></label>
                            <input type="range" id="inp-light-z" min="-50" max="50" step="1" value="10">
                        </div>
                        <div class="dev-row">
                            <label>Işık Rengi:</label>
                            <input type="color" id="inp-light-color" value="#ffffff">
                        </div>
                        <div class="dev-row">
                            <label>Işık Şiddeti: <span id="val-light-intensity">1.0</span></label>
                            <input type="range" id="inp-light-intensity" min="0" max="5" step="0.1" value="1.0">
                        </div>

                        <div class="dev-category">🎨 Görünüm</div>
                        <div class="dev-row">
                            <label>Domino Rengi:</label>
                            <input type="color" id="inp-material-color" value="#cccccc">
                        </div>
                        <div class="dev-row" style="margin-top:12px;">
                            <label>Doku URL:</label>
                            <input type="text" id="inp-custom-tex" placeholder="assets/texture.jpg">
                        </div>
                        <button class="dev-btn-secondary" id="btn-load-texture" style="width:100%; margin-top:8px;">🖼️ Doku Yükle</button>
                        <div class="dev-row-inline" style="margin-top:12px;">
                            <label>Gölgeler Aktif</label>
                            <input type="checkbox" id="inp-shadows" checked>
                        </div>
                        <div class="dev-row-inline">
                            <label>Izgara (Grid) Göster</label>
                            <input type="checkbox" id="inp-show-grid" checked>
                        </div>
                    </div>

                    <!-- FİZİK SEKMESİ -->
                    <div class="dev-tab-content" id="tab-physics">
                        <div class="dev-category">⚙️ Fizik & Mantık</div>
                        <div class="dev-row">
                            <label>Parça Aralığı: <span id="val-spacing">3.0</span></label>
                            <input type="range" id="inp-spacing" min="0.5" max="15.0" step="0.1" value="3.0">
                        </div>
                        <div class="dev-row">
                            <label>Düşme Hızı: <span id="val-fall-speed">5.5</span></label>
                            <input type="range" id="inp-fall-speed" min="0.1" max="30.0" step="0.5" value="5.5">
                        </div>
                        <div class="dev-row">
                            <label>Izgara Boyutu: <span id="val-grid-size">20</span></label>
                            <input type="range" id="inp-grid-size" min="0" max="100" step="1" value="20">
                        </div>
                    </div>

                    <!-- PERFORMANS SEKMESİ -->
                    <div class="dev-tab-content" id="tab-perf">
                        <div class="dev-category">📊 Gerçek Zamanlı</div>
                        <div class="dev-stat-grid">
                            <div class="dev-stat-card">
                                <div class="dev-stat-value" id="stat-fps">60</div>
                                <div class="dev-stat-label">FPS</div>
                            </div>
                            <div class="dev-stat-card">
                                <div class="dev-stat-value" id="stat-ms">16</div>
                                <div class="dev-stat-label">ms (frame)</div>
                            </div>
                            <div class="dev-stat-card">
                                <div class="dev-stat-value" id="stat-objs">0</div>
                                <div class="dev-stat-label">Obje Sayısı</div>
                            </div>
                            <div class="dev-stat-card">
                                <div class="dev-stat-value" id="stat-mem">0</div>
                                <div class="dev-stat-label">MB (JS Heap)</div>
                            </div>
                        </div>

                        <div class="dev-category">🔧 Hızlı Aksiyonlar</div>
                        <button class="dev-btn-secondary" id="btn-force-gc" style="width:100%; margin-bottom:8px;">🧹 Bellek Temizliği (GC Hint)</button>
                        <button class="dev-btn-secondary" id="btn-log-scene" style="width:100%;">📝 Sahne Bilgisi Logla</button>
                    </div>
                </div>
                
                <div class="dev-panel-footer">
                    <button class="dev-btn-primary" id="btn-apply-restart">▶ Uygula & Sıfırla</button>
                    <button class="dev-btn-secondary" id="btn-reset">↺ Varsayılana Dön</button>
                </div>
            </div>
            <input type="file" id="dev-file-import" accept=".json" style="display:none;">
        `;
    },

    injectToggleButton() {
        if (document.getElementById('dev-panel-toggle')) return;
        const btn = document.createElement('button');
        btn.id = 'dev-panel-toggle';
        btn.innerHTML = '⚙️';
        btn.title = 'Geliştirici Paneli (~)';
        document.body.appendChild(btn);

        let isDragging = false;
        let hasMoved = false;
        let startX, startY, startLeft, startTop;

        const onStart = (clientX, clientY) => {
            isDragging = true;
            hasMoved = false;
            startX = clientX;
            startY = clientY;
            const rect = btn.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            btn.style.cursor = 'grabbing';
        };
        const onMove = (clientX, clientY) => {
            if (!isDragging) return;
            const dx = clientX - startX;
            const dy = clientY - startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
            if (hasMoved) {
                btn.style.left = `${startLeft + dx}px`;
                btn.style.top = `${startTop + dy}px`;
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
            }
        };
        const onEnd = () => {
            isDragging = false;
            btn.style.cursor = 'grab';
        };

        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            onStart(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', onEnd);

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            onStart(touch.clientX, touch.clientY);
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (isDragging) {
                const touch = e.touches[0];
                onMove(touch.clientX, touch.clientY);
                e.preventDefault();
            }
        }, { passive: false });
        window.addEventListener('touchend', onEnd);

        btn.addEventListener('click', (e) => {
            if (hasMoved) {
                e.preventDefault();
                hasMoved = false;
                return;
            }
            this.toggle();
        });
    },

    bindEvents() {
        // Sekme değiştirme
        document.querySelectorAll('.dev-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Kapatma
        document.querySelector('.dev-minimize').addEventListener('click', () => this.toggle());

        // Range, Color, Checkbox canlı güncelleme
        document.querySelectorAll('#dev-panel input[type="range"], #dev-panel input[type="color"], #dev-panel input[type="checkbox"]')
            .forEach(input => input.addEventListener('input', () => this.onLiveChange()));

        // Text inputlar: input event ile canlı önizleme (URL vs.)
        document.querySelectorAll('#dev-panel input[type="text"]')
            .forEach(input => input.addEventListener('input', () => {
                this.collectSettings();
                this.saveSettings();
                this.updateLabels();
                if (typeof DominoManager !== 'undefined') DominoManager.applyLiveSettings(this.settings);
            }));

        // Doku yükleme butonu
        document.getElementById('btn-load-texture').addEventListener('click', () => this.applyCustomTexture());

        // Uygula & Sıfırla
        document.getElementById('btn-apply-restart').addEventListener('click', () => this.applyAndReset());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetToDefaults());

        // Presetler
        document.querySelectorAll('.dev-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => this.loadPresetSlot(parseInt(btn.dataset.preset)));
        });
        document.getElementById('btn-save-preset').addEventListener('click', () => this.saveCurrentPreset());
        document.getElementById('btn-load-preset').addEventListener('click', () => this.showPresetLoader());

        // Export/Import
        document.getElementById('btn-export').addEventListener('click', () => this.exportSettings());
        document.getElementById('btn-import').addEventListener('click', () => document.getElementById('dev-file-import').click());
        document.getElementById('dev-file-import').addEventListener('change', (e) => this.importSettings(e));

        // Performans butonları
        document.getElementById('btn-force-gc').addEventListener('click', () => {
            if (window.gc) window.gc();
            console.log('DevPanel: GC hint gönderildi.');
        });
        document.getElementById('btn-log-scene').addEventListener('click', () => {
            if (typeof DominoManager !== 'undefined') {
                console.log('DevPanel: Sahne bilgisi:', DominoManager);
            }
        });
    },

    bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // ~ veya ` tuşu ile aç/kapa
            if (e.key === '~' || e.key === '`') {
                e.preventDefault();
                this.toggle();
                return;
            }
            // ESC ile kapat (sadece panel açıkken)
            if (e.key === 'Escape' && this.isVisible) {
                this.toggle();
                return;
            }
            // Sekme kısayolları 1-5 (sadece panel açıkken)
            if (!this.isVisible) return;
            const tabs = ['domino', 'camera', 'light', 'physics', 'perf'];
            const num = parseInt(e.key);
            if (num >= 1 && num <= 5) {
                this.switchTab(tabs[num - 1]);
            }
        });
    },

    loadSettings() {
        const saved = localStorage.getItem('devPanelSettings_v2');
        if (saved) {
            try {
                this.settings = { ...this.defaults, ...JSON.parse(saved) };
            } catch (e) {
                console.warn('DevPanel: Kayıtlı ayarlar bozuk, varsayılanlar yükleniyor.');
                this.settings = { ...this.defaults };
            }
        } else {
            this.settings = { ...this.defaults };
        }
    },

    saveSettings() {
        try {
            localStorage.setItem('devPanelSettings_v2', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('DevPanel: localStorage kaydedilemedi.');
        }
    },

    loadPresets() {
        try {
            const saved = localStorage.getItem('devPanelPresets');
            this.presets = saved ? JSON.parse(saved) : [null, null, null];
        } catch (e) {
            console.warn('DevPanel: Presetler bozuk, sıfırlandı.');
            this.presets = [null, null, null];
        }
    },

    savePresets() {
        try {
            localStorage.setItem('devPanelPresets', JSON.stringify(this.presets));
        } catch (e) {
            console.warn('DevPanel: Presetler kaydedilemedi.');
        }
    },

    applySettingsToUI() {
        const s = this.settings;
        const getVal = (key, def) => s[key] !== undefined ? s[key] : def;

        const map = {
            'inp-rot-x': getVal('rotX', 0),
            'inp-rot-y': getVal('rotY', 0),
            'inp-rot-z': getVal('rotZ', 90),
            'inp-scale': getVal('scale', 1.5),
            'inp-pivot': getVal('pivotY', 3.5),
            'inp-camy': getVal('camY', 3.0),
            'inp-camz': getVal('camZ', 15.0),
            'inp-cam-offset-x': getVal('camOffsetX', -4.0),
            'inp-cam-rot-x': getVal('camRotX', 0),
            'inp-cam-rot-y': getVal('camRotY', 0),
            'inp-spacing': getVal('spacing', 3.0),
            'inp-fall-speed': getVal('fallSpeed', 5.5),
            'inp-material-color': getVal('materialColor', '#cccccc'),
            'inp-custom-tex': getVal('customTexture', ''),
            'inp-bg-color': getVal('bgColor', '#111111'),
            'inp-ambient': getVal('ambientIntensity', 0.6),
            'inp-light-x': getVal('lightX', 10),
            'inp-light-y': getVal('lightY', 20),
            'inp-light-z': getVal('lightZ', 10),
            'inp-light-color': getVal('lightColor', '#ffffff'),
            'inp-light-intensity': getVal('lightIntensity', 1.0),
            'inp-shadows': getVal('shadowsEnabled', true),
            'inp-auto-rotate': getVal('autoRotate', false),
            'inp-auto-rotate-speed': getVal('autoRotateSpeed', 1.0),
            'inp-show-grid': getVal('showGrid', true),
            'inp-grid-size': getVal('gridSize', 20)
        };

        Object.entries(map).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') el.checked = !!value;
                else el.value = value;
            }
        });

        // Preset butonlarını güncelle
        this.presets.forEach((preset, idx) => {
            const btn = document.querySelector(`.dev-preset-btn[data-preset="${idx}"]`);
            if (btn) {
                if (preset) {
                    btn.textContent = preset.name || `Slot ${idx + 1}`;
                    btn.classList.add('active');
                } else {
                    btn.textContent = `Slot ${idx + 1}`;
                    btn.classList.remove('active');
                }
            }
        });
    },

    collectSettings() {
        const getVal = (id, def, type = 'float') => {
            const el = document.getElementById(id);
            if (!el) return def;
            if (type === 'bool') return el.checked;
            if (type === 'int') return parseInt(el.value) || def;
            return parseFloat(el.value) || def;
        };

        this.settings = {
            rotX: getVal('inp-rot-x', 0, 'int'),
            rotY: getVal('inp-rot-y', 0, 'int'),
            rotZ: getVal('inp-rot-z', 90, 'int'),
            scale: getVal('inp-scale', 1.5),
            pivotY: getVal('inp-pivot', 3.5),
            camY: getVal('inp-camy', 3.0),
            camZ: getVal('inp-camz', 15.0),
            camOffsetX: getVal('inp-cam-offset-x', -4.0),
            camRotX: getVal('inp-cam-rot-x', 0, 'int'),
            camRotY: getVal('inp-cam-rot-y', 0, 'int'),
            spacing: getVal('inp-spacing', 3.0),
            fallSpeed: getVal('inp-fall-speed', 5.5),
            materialColor: document.getElementById('inp-material-color')?.value || '#cccccc',
            customTexture: document.getElementById('inp-custom-tex')?.value || '',
            bgColor: document.getElementById('inp-bg-color')?.value || '#111111',
            ambientIntensity: getVal('inp-ambient', 0.6),
            lightX: getVal('inp-light-x', 10, 'int'),
            lightY: getVal('inp-light-y', 20, 'int'),
            lightZ: getVal('inp-light-z', 10, 'int'),
            lightColor: document.getElementById('inp-light-color')?.value || '#ffffff',
            lightIntensity: getVal('inp-light-intensity', 1.0),
            shadowsEnabled: getVal('inp-shadows', true, 'bool'),
            autoRotate: getVal('inp-auto-rotate', false, 'bool'),
            autoRotateSpeed: getVal('inp-auto-rotate-speed', 1.0),
            showGrid: getVal('inp-show-grid', true, 'bool'),
            gridSize: getVal('inp-grid-size', 20, 'int')
        };
        return this.settings;
    },

    updateLabels() {
        const s = this.settings;
        const setText = (id, val, suffix = '') => {
            const el = document.getElementById(id);
            if (el) el.textContent = (typeof val === 'number' ? val.toFixed(1) : val) + suffix;
        };
        setText('val-rot-x', s.rotX, '°');
        setText('val-rot-y', s.rotY, '°');
        setText('val-rot-z', s.rotZ, '°');
        setText('val-scale', s.scale);
        setText('val-pivot', s.pivotY);
        setText('val-camy', s.camY);
        setText('val-camz', s.camZ);
        setText('val-cam-offset-x', s.camOffsetX);
        setText('val-cam-rot-x', s.camRotX, '°');
        setText('val-cam-rot-y', s.camRotY, '°');
        setText('val-spacing', s.spacing);
        setText('val-fall-speed', s.fallSpeed);
        setText('val-ambient', s.ambientIntensity);
        setText('val-light-x', s.lightX);
        setText('val-light-y', s.lightY);
        setText('val-light-z', s.lightZ);
        setText('val-light-intensity', s.lightIntensity);
        setText('val-auto-rotate-speed', s.autoRotateSpeed);
        setText('val-grid-size', s.gridSize);
    },

    onLiveChange() {
        this.collectSettings();
        this.saveSettings();
        this.updateLabels();
        if (typeof DominoManager !== 'undefined') {
            DominoManager.applyLiveSettings(this.settings);
        } else {
            console.warn('DevPanel: DominoManager bulunamadı, canlı önizleme yapılamadı.');
        }
    },

    applyAndReset() {
        this.onLiveChange();
        if (typeof DominoManager !== 'undefined') {
            DominoManager.rebuildTemplate();
            DominoManager.resetChain();
        } else {
            console.warn('DevPanel: DominoManager bulunamadı, yeniden başlatma yapılamadı.');
        }
    },

    applyCustomTexture() {
        const url = document.getElementById('inp-custom-tex').value.trim();
        if (!url) {
            alert('Lütfen bir doku URL girin.');
            return;
        }
        this.settings.customTexture = url;
        this.saveSettings();
        if (typeof DominoManager !== 'undefined') {
            DominoManager.loadCustomTexture(url);
        } else {
            console.warn('DevPanel: DominoManager bulunamadı, doku yüklenemedi.');
        }
    },

    resetToDefaults() {
        this.settings = { ...this.defaults };
        this.applySettingsToUI();
        this.onLiveChange();
    },

   toggle() {
        const panel = document.getElementById('dev-panel');
        this.isVisible = !this.isVisible;
        panel.classList.toggle('visible', this.isVisible);
        
        if (typeof Game !== 'undefined') Game.isPaused = this.isVisible;

        // STUDIO KONTROLCÜSÜNÜ TETİKLE!
        if (typeof Studio !== 'undefined') Studio.toggle(this.isVisible);

        const elementsToHide = document.querySelectorAll('.screen, #ui-layer, .hud-controls, #vignette-glow');
        if (this.isVisible) {
            elementsToHide.forEach(el => el.style.display = 'none');
            if (typeof DominoManager !== 'undefined') DominoManager.buildStudioScene();
        } else {
            document.getElementById('start-screen').style.display = 'flex';
            document.querySelector('.hud-controls').style.display = 'flex';
            document.getElementById('vignette-glow').style.display = 'block';
            if (typeof DominoManager !== 'undefined') DominoManager.resetChain();
        }
    },

    switchTab(tabName) {
        document.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.dev-tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.dev-tab[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`tab-${tabName}`)?.classList.add('active');
    },

    // === PRESET SİSTEMİ ===
    saveCurrentPreset() {
        const name = prompt('Preset adı:', `Ayar ${new Date().toLocaleTimeString()}`);
        if (!name) return;
        const emptyIdx = this.presets.findIndex(p => !p);
        const idx = emptyIdx !== -1 ? emptyIdx : 0;
        this.presets[idx] = { name, settings: { ...this.settings } };
        this.savePresets();
        this.applySettingsToUI();
        alert(`"${name}" Slot ${idx + 1}'e kaydedildi.`);
    },

    loadPresetSlot(idx) {
        const preset = this.presets[idx];
        if (!preset) {
            alert(`Slot ${idx + 1} boş.`);
            return;
        }
        this.settings = { ...this.defaults, ...preset.settings };
        this.applySettingsToUI();
        this.onLiveChange();
    },

    showPresetLoader() {
        const names = this.presets.map((p, i) => p ? `${i + 1}: ${p.name}` : `${i + 1}: (boş)`).join('\n');
        const choice = prompt(`Yüklemek istediğin preset:\n${names}`);
        if (!choice) return;
        const idx = parseInt(choice) - 1;
        if (idx >= 0 && idx < 3) this.loadPresetSlot(idx);
    },

    // === EXPORT / IMPORT ===
    exportSettings() {
        const data = JSON.stringify({ settings: this.settings, presets: this.presets }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devpanel-settings-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importSettings(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.settings) {
                    this.settings = { ...this.defaults, ...data.settings };
                    this.saveSettings();
                }
                if (data.presets) {
                    this.presets = data.presets;
                    this.savePresets();
                }
                this.applySettingsToUI();
                this.onLiveChange();
                alert('Ayarlar başarıyla yüklendi!');
            } catch (err) {
                alert('Dosya okunamadı: ' + err.message);
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    },

    // === PERFORMANS MONİTÖRÜ ===
    startPerformanceMonitor() {
        let lastTime = performance.now();
        let frames = 0;
        const loop = () => {
            frames++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                const fps = Math.round((frames * 1000) / (now - lastTime));
                const ms = ((now - lastTime) / frames).toFixed(1);
                if (this.isVisible) {
                    const fpsEl = document.getElementById('stat-fps');
                    const msEl = document.getElementById('stat-ms');
                    const objEl = document.getElementById('stat-objs');
                    const memEl = document.getElementById('stat-mem');
                    if (fpsEl) fpsEl.textContent = fps;
                    if (msEl) msEl.textContent = ms;
                    if (objEl && typeof DominoManager !== 'undefined') {
                        objEl.textContent = DominoManager.getObjectCount?.() || '?';
                    }
                    if (memEl && performance.memory) {
                        memEl.textContent = Math.round(performance.memory.usedJSHeapSize / 1048576);
                    } else if (memEl) {
                        memEl.textContent = 'N/A';
                    }
                }
                frames = 0;
                lastTime = now;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DevPanel.init();
});