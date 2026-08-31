// UIManager.js - Ana Domino Butonu, Hayalet Menüsü ve Doğru Varsayılanlar
import { StateManager } from '../core/StateManager.js';
import { Viewport } from '../3d/Viewport.js';

export const UIManager = {
    init() {
        this.injectCSS();
        this.buildDOM();
        this.bindEvents();
        this.initMenus();
        this.updateUIFromState();
        StateManager.subscribe(() => this.updateUIFromState());
    },

    injectCSS() {
        const style = document.createElement('style');
        style.innerHTML = `
            :root {
                --max-bg: #292929; --max-panel: #3a3a3a; --max-panel-dark: #2f2f2f;
                --max-dark: #191919; --max-viewport: #1b1b1b; --max-border-dark: #000000;
                --max-border-light: #5c5c5c; --max-text: #c8c8c8; --max-text-dim: #868686;
                --max-text-bright: #efefef; --max-accent-blue: #3d9bdc; --max-accent-orange: #ff8000;
                --max-accent-yellow: #ffd479; --max-input-bg: #1e1e1e; --max-menu-bg: #2b2b2b;
                --max-rollout-header: linear-gradient(to bottom, #4c4c4c, #363636);
                --max-toolbar-grad: linear-gradient(to bottom, #333333, #2a2a2a);
            }
            * { box-sizing: border-box; }
            body { margin: 0; overflow: hidden; background: var(--max-dark); font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 11px; color: var(--max-text); user-select: none; }
            #max-app { display: flex; flex-direction: column; width: 100vw; height: 100vh; background: var(--max-bg); }

            #max-titlebar { height: 24px; background: #232323; display: flex; align-items: center; padding: 0 6px; border-bottom: 1px solid var(--max-border-dark); gap: 6px; }
            #max-titlebar .max-logo { font-weight: 600; color: #fff; font-size: 11px; letter-spacing: 0.4px; display: flex; align-items: center; gap: 5px; }
            #max-titlebar .max-logo .logo-mark { width: 15px; height: 15px; background: var(--max-accent-blue); border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #06202e; }
            .qat-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: var(--max-text-dim); font-size: 12px; border-radius: 2px; cursor: pointer; }
            .qat-icon:hover { background: #444; color: #fff; }
            .titlebar-filename { color: var(--max-text-dim); font-size: 10.5px; margin-left: 4px; flex: 1; }
            
            .max-return-btn { background: #6e1f1f; color: #fff; border: 1px solid #380f0f; padding: 3px 12px; cursor: pointer; border-radius: 2px; font-size: 10.5px; }
            .max-return-btn:hover { background: #872828; }
            .max-saveplay-btn { background: #1f6e2b; color: #fff; border: 1px solid #0f3816; padding: 3px 12px; cursor: pointer; border-radius: 2px; font-size: 10.5px; margin-right: 4px; font-weight: bold; }
            .max-saveplay-btn:hover { background: #2a9439; }

            #max-menubar { height: 22px; background: var(--max-menu-bg); color: var(--max-text); display: flex; align-items: center; padding: 0 4px; border-bottom: 1px solid var(--max-border-dark); font-size: 11px; gap: 1px; position: relative; z-index: 1000; }
            .max-menu-item { padding: 3px 9px; cursor: pointer; border-radius: 1px; position: relative; }
            .max-menu-item:hover { background: var(--max-accent-blue); color: #fff; }
            .max-menu-dropdown { display: none; position: absolute; top: 100%; left: 0; min-width: 180px; background: var(--max-menu-bg); border: 1px solid #111; box-shadow: 3px 3px 8px rgba(0,0,0,0.6); padding: 2px 0; z-index: 1001; }
            .max-menu-item.open .max-menu-dropdown { display: block; }
            .max-menu-dropdown .menu-item { padding: 4px 20px; cursor: pointer; white-space: nowrap; }
            .max-menu-dropdown .menu-item:hover { background: var(--max-accent-blue); color: #fff; }
            .max-menu-dropdown .menu-separator { height: 1px; background: #444; margin: 3px 0; }

            #max-toolbar { height: 36px; background: var(--max-toolbar-grad); display: flex; align-items: center; padding: 0 4px; border-bottom: 1px solid var(--max-border-dark); gap: 1px; overflow-x: auto; }
            .max-tool-btn { min-width: 27px; height: 27px; background: transparent; border: 1px solid transparent; color: var(--max-text); display: flex; justify-content: center; align-items: center; cursor: pointer; font-size: 13px; border-radius: 2px; padding: 0 3px; position: relative; }
            .max-tool-btn:hover { border-color: var(--max-border-light); background: #4a4a4a; }
            .max-tool-btn.active { background: #14344a; border-color: #0c2130; color: var(--max-accent-blue); box-shadow: inset 1px 1px 3px rgba(0,0,0,0.8); }
            .max-tool-btn:disabled { opacity: 0.35; cursor: default; }
            .max-tool-btn:disabled:hover { background: transparent; border-color: transparent; }
            .max-tool-sep { width: 1px; height: 22px; background: var(--max-border-dark); border-right: 1px solid #565656; margin: 0 3px; }
            .max-tool-dropdown { height: 22px; background: var(--max-input-bg); border: 1px solid var(--max-border-dark); color: var(--max-text); font-size: 10px; padding: 0 3px; border-radius: 1px; }

            #max-workspace { display: flex; flex: 1; overflow: hidden; }
            #max-viewport-wrapper { flex: 1; position: relative; display: flex; flex-direction: column; border-right: 2px solid var(--max-border-dark); background: var(--max-viewport); min-width: 0; }
            #max-viewport { flex: 1; background: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px) 0 0 / 40px 40px, linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px) 0 0 / 40px 40px, var(--max-viewport); position: relative; cursor: default; }
            #max-viewport::before { content: ""; position: absolute; inset: 0; pointer-events: none; border: 1px solid transparent; }
            
            #quad-borders { display: none; position: absolute; inset: 0; pointer-events: none; z-index: 10; }
            .quad-line-v { position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; background: #000; transform: translateX(-50%); z-index: 11; }
            .quad-line-h { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #000; transform: translateY(-50%); z-index: 11; }
            .quad-hl { position: absolute; border: 2px solid transparent; z-index: 10; transition: border-color 0.1s; }
            #quad-hl-0 { top: 0; left: 0; width: 50%; height: 50%; }
            #quad-hl-1 { top: 50%; left: 0; width: 50%; height: 50%; }
            #quad-hl-2 { top: 50%; left: 50%; width: 50%; height: 50%; }
            #quad-hl-3 { top: 0; left: 50%; width: 50%; height: 50%; }

            .vp-label-topleft { position: absolute; top: 5px; left: 8px; font-size: 11px; color: #d6d6d6; text-shadow: 1px 1px 1px #000; pointer-events: none; line-height: 1.55; z-index: 5; }
            .vp-label-topleft .vp-line { display: block; }
            .vp-view-name { color: var(--max-accent-yellow); font-weight: 600; cursor: pointer; pointer-events: auto; }
            .vp-label-bottomleft { position: absolute; bottom: 6px; left: 8px; font-size: 10.5px; color: #a8a8a8; text-shadow: 1px 1px 1px #000; pointer-events: none; z-index: 5; }
            
            .vp-navcube { position: absolute; top: 10px; right: 14px; width: 58px; height: 58px; z-index: 6; perspective: 300px; }
            .vp-navcube-face { position: absolute; inset: 0; border: 1px solid #7a7a7a; background: rgba(70,70,70,0.5); color: #d8d8d8; font-size: 8.5px; letter-spacing: 0.3px; display: flex; align-items: center; justify-content: center; border-radius: 1px; }
            .vp-navcube-face:hover { background: rgba(61,155,220,0.55); color: #fff; border-color: var(--max-accent-blue); }
            .vp-navcube-ring { position: absolute; bottom: -22px; left: 50%; transform: translateX(-50%); width: 42px; height: 42px; border: 1px solid rgba(210,210,210,0.35); border-radius: 50%; }
            .vp-navcube-home { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); width: 13px; height: 13px; color: #bbb; font-size: 11px; cursor: pointer; }

            .vp-nav-controls { position: absolute; bottom: 6px; right: 8px; display: grid; grid-template-columns: repeat(2, 24px); gap: 1px; z-index: 6; }
            .vp-nav-btn { width: 24px; height: 24px; background: #333; border: 1px solid #101010; color: #ccc; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; }
            .vp-nav-btn:hover { background: #4a4a4a; color: #fff; }

            #max-statusbar { background: var(--max-bg); border-top: 1px solid var(--max-border-dark); display: flex; flex-direction: column; }
            #max-status-top { height: 23px; display: flex; align-items: center; padding: 0 8px; gap: 10px; border-bottom: 1px solid #202020; font-size: 10px; color: var(--max-text-dim); }
            #max-status-top .status-msg { color: var(--max-text); }
            #max-status-top .coord-group { display: flex; align-items: center; gap: 3px; }
            #max-status-top input { width: 58px; background: var(--max-input-bg); border: 1px solid var(--max-border-dark); color: #ddd; font-size: 10px; padding: 2px 4px; border-radius: 1px; }
            .status-flags { display: flex; gap: 3px; margin-left: 4px; }
            .status-flags span { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; border: 1px solid #444; border-radius: 1px; font-size: 9px; }
            #max-timeline { height: 26px; display: flex; align-items: center; padding: 0 8px; gap: 6px; border-bottom: 1px solid #202020; }
            #max-timeline .time-slider { flex: 1; height: 14px; background: repeating-linear-gradient(90deg, #242424, #242424 9px, #1a1a1a 9px, #1a1a1a 10px); position: relative; border: 1px solid #111; }
            #max-timeline .time-slider .time-handle { position: absolute; top: -1px; left: 0; width: 14px; height: 16px; background: linear-gradient(to bottom, #a8a8a8, #7c7c7c); border: 1px solid #000; border-radius: 1px; }
            .time-btn { width: 21px; height: 21px; background: linear-gradient(to bottom, #4c4c4c, #383838); border: 1px solid #111; color: #ccc; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 1px; }
            .time-btn:hover { background: #565656; }
            #max-bottombar { height: 22px; display: flex; align-items: center; padding: 0 8px; gap: 14px; font-size: 10px; color: var(--max-text-dim); }
            #max-bottombar .sep { width: 1px; height: 14px; background: #444; }

            /* COMMAND PANEL */
            #max-command-panel { width: 300px; background: var(--max-bg); display: flex; flex-direction: column; border-left: 1px solid #555; }
            .cmd-tabs { display: flex; height: 30px; background: var(--max-panel-dark); border-bottom: 1px solid var(--max-border-dark); }
            .cmd-tab { flex: 1; display: flex; justify-content: center; align-items: center; cursor: pointer; font-size: 15px; color: var(--max-text-dim); border-right: 1px solid #262626; }
            .cmd-tab.active { background: var(--max-panel); color: var(--max-accent-blue); border-top: 2px solid var(--max-accent-blue); box-shadow: inset 0 2px 5px rgba(0,0,0,0.35); }
            .cmd-tab:hover:not(.active) { background: #454545; color: var(--max-text-bright); }
            .cmd-content { background: var(--max-panel); flex: 1; padding: 0; display: none; overflow-y: auto; }
            .cmd-content.active { display: block; }
            .cmd-content::-webkit-scrollbar { width: 10px; }
            .cmd-content::-webkit-scrollbar-thumb { background: #222; border: 2px solid var(--max-panel); }

            .create-cat-row { display: flex; background: var(--max-panel-dark); border-bottom: 1px solid var(--max-border-dark); }
            .create-cat-btn { flex: 1; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--max-text-dim); cursor: pointer; border-right: 1px solid #262626; }
            .create-cat-btn.active { background: var(--max-panel); color: var(--max-accent-blue); box-shadow: inset 0 -2px 0 var(--max-accent-blue); }
            .create-cat-btn:hover:not(.active) { color: var(--max-text-bright); }
            .create-subcat-select { margin: 7px; padding: 4px; background: var(--max-input-bg); color: #ddd; border: 1px solid var(--max-border-dark); width: calc(100% - 14px); border-radius: 1px; }

            .rollout { border-bottom: 1px solid #232323; }
            .rollout-header { background: var(--max-rollout-header); color: #e6e6e6; padding: 5px 8px; font-weight: 600; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #6e6e6e; border-bottom: 1px solid #111; }
            .rollout-header:hover { filter: brightness(1.08); }
            .rollout-header .chevron { transition: transform 0.15s; font-size: 9px; color: #bbb; }
            .rollout-header.collapsed .chevron { transform: rotate(-90deg); }
            .rollout-body { padding: 9px 8px; }
            .rollout-body.collapsed { display: none; }

            .create-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
            .max-btn { width: 100%; padding: 6px 4px; background: linear-gradient(to bottom, #626262, #454545); border: 1px solid #111; color: #eee; cursor: pointer; font-size: 11px; border-radius: 1px; text-align: center; }
            .max-btn:hover { background: linear-gradient(to bottom, #6e6e6e, #4f4f4f); }
            .max-btn:active { background: #333; box-shadow: inset 1px 1px 3px #000; }
            .max-btn:disabled { opacity: 0.4; cursor: default; }

            .cmd-row { display: flex; align-items: center; margin-bottom: 5px; justify-content: flex-end; }
            .cmd-row label { width: 78px; text-align: right; padding-right: 6px; color: #c9c9c9; font-size: 10.5px; }
            .spinner-group { display: flex; width: 132px; height: 19px; border: 1px solid #111; border-bottom-color: #5a5a5a; background: var(--max-input-bg); position: relative; border-radius: 1px; }
            .spinner-group input { flex: 1; background: transparent; border: none; color: #fff; text-align: right; font-family: Tahoma, Arial, sans-serif; outline: none; padding-right: 4px; font-size: 10.5px; }
            .spinner-arrows { display: flex; flex-direction: column; width: 13px; border-left: 1px solid #111; }
            .spinner-arrows div { flex: 1; background: #4a4a4a; font-size: 6px; display: flex; align-items: center; justify-content: center; color: #ccc; cursor: pointer; border-bottom: 1px solid #111; }
            .spinner-arrows div:last-child { border-bottom: none; }
            .spinner-arrows div:hover { background: #5c5c5c; color: #fff; }

            .modifier-stack-box { margin: 7px; border: 1px solid var(--max-border-dark); background: var(--max-input-bg); min-height: 76px; padding: 4px; border-radius: 1px; }
            .modifier-stack-item { padding: 4px 7px; color: #fff; background: linear-gradient(to bottom, #3f6f96, #2c4f6b); margin-bottom: 2px; font-size: 11px; border-radius: 1px; border: 1px solid #1c2f3f; }
            .stack-toolbar { display: flex; gap: 1px; padding: 3px 7px 7px; }
            .stack-toolbar .max-tool-btn { min-width: 22px; height: 22px; font-size: 11px; }
            
            .name-color-row { display: flex; gap: 4px; margin: 7px; }
            .name-color-row input[type="text"] { flex: 1; background: var(--max-input-bg); color: #fff; border: 1px solid var(--max-border-dark); padding: 6px; border-radius: 1px; font-size: 11px; outline: none; }
            .name-color-row input[type="text"]:focus { border-color: var(--max-accent-blue); }
            .name-color-row input[type="color"] { width: 26px; height: 27px; padding: 0; background: none; border: 1px solid var(--max-border-dark); cursor: pointer; }
            .name-color-row input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
            .name-color-row input[type="color"]::-webkit-color-swatch { border: none; }

            .sel-icons { display: flex; gap: 4px; padding: 4px 0; margin-bottom: 6px; justify-content: center; }
            .sel-icon { width: 28px; height: 28px; background: #333; border: 1px solid #222; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #00ffff; font-size: 14px; border-radius: 2px; transition: 0.1s;}
            .sel-icon:hover { background: #444; }
            #btn-face-mode.active { background: #14344a; border-color: var(--max-accent-blue); box-shadow: inset 1px 1px 3px rgba(0,0,0,0.8); }
        `;
        document.head.appendChild(style);
    },

    buildDOM() {
        const existing = document.getElementById('max-app');
        if (existing) existing.remove();

        const html = `
            <div id="max-app">
                <div id="max-titlebar">
                    <span class="max-logo"><span class="logo-mark">M</span>3ds Max Studio</span>
                    <span class="titlebar-filename" id="project-name-label">Adsız_Sahne.max</span>
                    
                    <button class="max-saveplay-btn" id="btn-save-play" title="Kısayol: Ctrl+S">Kaydet ve Oyna 🚀</button>
                    <button class="max-return-btn" onclick="window.open('../index.html', '_blank')">Oyuna Dön</button>
                </div>

                <div id="max-menubar"></div>

                <div id="max-toolbar">
                    <button class="max-tool-btn" data-command="undo" title="Undo (Ctrl+Z)">↶</button>
                    <button class="max-tool-btn" data-command="redo" title="Redo (Ctrl+Y)">↷</button>
                    <div class="max-tool-sep"></div>
                    <button class="max-tool-btn" title="Select and Link">🔗</button>
                    <button class="max-tool-btn" title="Unlink Selection">✂</button>
                    <button class="max-tool-btn" title="Bind to Space Warp">🌀</button>
                    <div class="max-tool-sep"></div>
                    <select class="max-tool-dropdown" title="Selection Filter"><option>All</option><option>Geometry</option></select>
                    <button class="max-tool-btn" data-command="select" title="Select Object (Q)">↖</button>
                    <button class="max-tool-btn" title="Select by Name">🏷</button>
                    <button class="max-tool-btn" title="Rectangular Selection Region">▭</button>
                    <button class="max-tool-btn" title="Window/Crossing Selection">⊞</button>
                    <div class="max-tool-sep"></div>
                    <button class="max-tool-btn mode-btn" id="tool-select" data-command="select" title="Select Object (Q)">↖</button>
                    <button class="max-tool-btn mode-btn active" id="tool-translate" data-command="translate" title="Select and Move (W)">✥</button>
                    <button class="max-tool-btn mode-btn" id="tool-rotate" data-command="rotate" title="Select and Rotate (E)">↻</button>
                    <button class="max-tool-btn mode-btn" id="tool-scale" data-command="scale" title="Select and Uniform Scale (R)">⧉</button>
                    <div class="max-tool-sep"></div>
                    <select class="max-tool-dropdown" title="Reference Coordinate System"><option>World</option><option>Local</option></select>
                </div>

                <div id="max-workspace">
                    <div id="max-viewport-wrapper">
                        <div id="max-viewport">
                            <div id="quad-borders">
                                <div class="quad-line-v"></div>
                                <div class="quad-line-h"></div>
                                <div id="quad-hl-0" class="quad-hl"></div>
                                <div id="quad-hl-1" class="quad-hl"></div>
                                <div id="quad-hl-2" class="quad-hl"></div>
                                <div id="quad-hl-3" class="quad-hl"></div>
                            </div>
                            <div class="vp-label-topleft">
                                <span class="vp-line"><span class="vp-active-mark">+</span> <span class="vp-view-name" id="vp-camera-toggle">Perspective</span></span>
                                <span class="vp-line" style="color:#ff8000; font-size:10px;">(Alt+W: 4'lü Ekran)</span>
                            </div>
                        </div>

                        <div id="max-statusbar">
                            <div id="max-status-top">
                                <span class="status-msg">Bir nesne seçin</span>
                                <div style="display:flex; margin-left:auto; gap:3px;">
                                    X: <input type="text" id="coord-x" value="0.0" readonly>
                                    Y: <input type="text" id="coord-y" value="0.0" readonly>
                                    Z: <input type="text" id="coord-z" value="0.0" readonly>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="max-command-panel">
                        <div class="cmd-tabs">
                            <div class="cmd-tab" data-target="panel-create" title="Create">✚</div>
                            <div class="cmd-tab active" data-target="panel-modify" title="Modify">🔧</div>
                        </div>

                        <div class="cmd-content" id="panel-create">
                            <div class="create-cat-row">
                                <div class="create-cat-btn active" data-cat="geometry">◆</div>
                                <div class="create-cat-btn" data-cat="lights">💡</div>
                            </div>
                            
                            <div class="rollout" id="create-geometry-grid">
                                <div class="rollout-header"><span>Standard Primitives</span></div>
                                <div class="rollout-body create-grid">
                                    <button class="max-btn btn-create" data-type="cube">Box</button>
                                    <button class="max-btn btn-create" data-type="sphere">Sphere</button>
                                    <button class="max-btn btn-create" data-type="plane">Plane</button>
                                    <button class="max-btn btn-create" data-type="cylinder">Cylinder</button>
                                </div>
                            </div>

                            <div class="rollout" id="create-lights-grid" style="display:none;">
                                <div class="rollout-header"><span>Standard Lights</span></div>
                                <div class="rollout-body create-grid">
                                    <button class="max-btn btn-create" data-type="pointlight">Point Light</button>
                                    <button class="max-btn btn-create" data-type="spotlight">Spot Light</button>
                                </div>
                            </div>
                        </div>

                        <div class="cmd-content active" id="panel-modify">
                            
                            <!-- 🔥 ANA DOMİNO SEÇME BUTONU EKLENDİ 🔥 -->
                            <div style="padding: 7px; padding-bottom: 0;">
                                <button id="btn-select-domino" class="max-btn" style="background: linear-gradient(to bottom, #d48b22, #a3650f); border-color:#5c3805; font-weight:bold;">🔴 Ana Domino'yu Seç</button>
                            </div>

                            <div class="name-color-row">
                                <input type="text" id="sel-obj-name" value="Ana_Domino" readonly>
                                <input type="color" id="sel-obj-color" value="#ff4444">
                            </div>

                            <div class="rollout">
                                <div class="rollout-header"><span>Selection (Yüzey Seçimi)</span><span class="chevron">▼</span></div>
                                <div class="rollout-body" style="padding-top: 4px;">
                                    <div class="sel-icons">
                                        <div class="sel-icon" title="Vertex">∴</div>
                                        <div class="sel-icon" title="Edge">△</div>
                                        <div class="sel-icon" title="Border">⌓</div>
                                        <div class="sel-icon" id="btn-face-mode" title="Polygon (Yüzey Seç)">🟥</div>
                                        <div class="sel-icon" title="Element">🧊</div>
                                    </div>
                                    <div id="face-info-text" style="color:#00ffff; font-size:11px; font-weight:bold; text-align:center;">Tüm Obje Seçili</div>
                                </div>
                            </div>

                            <div class="rollout">
                                <div class="rollout-header"><span>Oyun Motoru (Engine)</span><span class="chevron">▼</span></div>
                                <div class="rollout-body">
                                    <div class="cmd-row" style="justify-content: space-between;">
                                        <label style="text-align:left; width:auto;">Fizik (Rapier3D):</label>
                                        <input type="checkbox" id="chk-physics" style="cursor:pointer;">
                                    </div>
                                    <div class="cmd-row" style="justify-content: space-between;">
                                        <label style="text-align:left; width:auto;">Sonsuz Tekrar:</label>
                                        <input type="checkbox" id="chk-infinite" style="cursor:pointer;">
                                    </div>
                                    
                                    <!-- 🔥 YENİ: SAYDAM KOPYALAR İÇİN GİZLİ MENÜ 🔥 -->
                                    <div id="infinite-settings" style="display:none; padding-top: 8px; margin-top: 8px; border-top: 1px solid #444;">
                                        ${this.makeSpinner('ui-inf-spacing', 'Kopya Aralığı:', 0.5)}
                                        ${this.makeSpinner('ui-inf-count', 'Görünür Kopya:', 1)}
                                    </div>
                                </div>
                            </div>

                            <div class="modifier-stack-box">
                                <div class="modifier-stack-item">▶ Editable Poly</div>
                                <div class="modifier-stack-item" style="background:transparent; border:none; color:#888; padding-left:15px;" id="base-geo-name">Box</div>
                            </div>

                            <div class="rollout">
                                <div class="rollout-header"><span>Parameters</span><span class="chevron">▼</span></div>
                                <div class="rollout-body">
                                    <!-- 🔥 TAŞ ARALIĞI BURADA 🔥 -->
                                    ${this.makeSpinner('ui-spacing', 'Taş Aralığı:', 0.1)}
                                    ${this.makeSpinner('ui-scale', 'Scale:', 0.1)}
                                    ${this.makeSpinner('ui-rotx', 'Rot X:', 1)}
                                    ${this.makeSpinner('ui-roty', 'Rot Y:', 1)}
                                    ${this.makeSpinner('ui-rotz', 'Rot Z:', 1)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    makeSpinner(id, label, step) {
        return `<div class="cmd-row"><label>${label}</label><div class="spinner-group"><input type="number" id="${id}" step="${step}"><div class="spinner-arrows"><div class="spin-up" data-target="${id}" data-step="${step}">▲</div><div class="spin-down" data-target="${id}" data-step="${-step}">▼</div></div></div></div>`;
    },

    initMenus() {
        const menuData = [
            { label: 'Dosya', items: ['Yeni', 'Aç', 'Kaydet (Ctrl+S)', 'Çıkış'] },
            { label: 'Düzen', items: ['Geri Al', 'Yinele', 'Kopyala', 'Yapıştır', 'Sil', 'Seç'] },
            { label: 'Oluştur', items: ['Box', 'Sphere', 'Plane', 'Cylinder', 'Cone'] }
        ];
        const menubar = document.getElementById('max-menubar');
        menuData.forEach(menu => {
            const item = document.createElement('div');
            item.className = 'max-menu-item';
            item.textContent = menu.label;
            const dropdown = document.createElement('div');
            dropdown.className = 'max-menu-dropdown';
            menu.items.forEach(subItem => {
                const sub = document.createElement('div');
                sub.className = 'menu-item';
                sub.textContent = subItem;
                sub.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.classList.remove('open');
                    if(subItem.includes('Kaydet')) this.promptSave(false);
                });
                dropdown.appendChild(sub);
            });
            item.appendChild(dropdown);
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.max-menu-item.open').forEach(el => el.classList.remove('open'));
                item.classList.add('open');
            });
            menubar.appendChild(item);
        });
        document.addEventListener('click', () => {
            document.querySelectorAll('.max-menu-item.open').forEach(el => el.classList.remove('open'));
        });
    },

    promptSave(playAfter = false) {
        let currentName = document.getElementById('project-name-label').textContent.replace('.max', '');
        if (currentName === 'Adsız_Sahne') currentName = 'Yeni_Bolum_1';
        let levelName = prompt("Lütfen Bölüm Adını Girin:", currentName);
        if (!levelName || levelName.trim() === '') return; 
        document.getElementById('project-name-label').textContent = levelName + '.max';
        if (Viewport && Viewport.exportLevel) {
            Viewport.exportLevel(levelName);
            if (playAfter) {
                alert(`✅ '${levelName}' başarıyla kaydedildi! Oyuna geçiliyor...`);
                window.open('../index.html', '_blank'); 
            }
        }
    },

    highlightActiveView(index) {
        for(let i=0; i<4; i++) {
            const el = document.getElementById(`quad-hl-${i}`);
            if(el) el.style.borderColor = (i === index) ? '#ffd479' : 'transparent';
        }
    },

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
            if (isInput) return;

            if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); this.promptSave(false); }
            if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); if(window.GizmoAPI && window.GizmoAPI.undo) window.GizmoAPI.undo(); }
            if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); if(window.GizmoAPI && window.GizmoAPI.redo) window.GizmoAPI.redo(); }
            if (e.altKey && (e.key.toLowerCase() === 'w' || e.key === '4')) { e.preventDefault(); if (Viewport && Viewport.toggleQuadView) Viewport.toggleQuadView(); }
            
            if (e.key.toLowerCase() === 'c') {
                if (Viewport && Viewport.toggleCamera) {
                    const mode = Viewport.toggleCamera();
                    const vpName = document.getElementById('vp-camera-toggle');
                    if (vpName) vpName.textContent = mode;
                }
            }

            if (e.key.toLowerCase() === 'q') this.executeCommand('select');
            if (e.key.toLowerCase() === 'w') this.executeCommand('translate');
            if (e.key.toLowerCase() === 'e') this.executeCommand('rotate');
            if (e.key.toLowerCase() === 'r') this.executeCommand('scale');
        });

        const btnCameraToggle = document.getElementById('vp-camera-toggle');
        if (btnCameraToggle) {
            btnCameraToggle.addEventListener('click', () => {
                if (Viewport && Viewport.toggleCamera) {
                    btnCameraToggle.textContent = Viewport.toggleCamera();
                }
            });
        }

        const btnSavePlay = document.getElementById('btn-save-play');
        if (btnSavePlay) {
            btnSavePlay.addEventListener('click', () => this.promptSave(true));
        }

        // 🔥 YENİ: ANA DOMİNO SEÇME BUTONU 🔥
        const btnSelectDomino = document.getElementById('btn-select-domino');
        if (btnSelectDomino) {
            btnSelectDomino.addEventListener('click', () => {
                if (window.GizmoAPI && Viewport && Viewport.dominoGroup) {
                    window.GizmoAPI.selectObject(Viewport.dominoGroup);
                }
            });
        }

        document.querySelectorAll('.cmd-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.cmd-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.cmd-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const target = document.getElementById(tab.getAttribute('data-target'));
                if (target) target.classList.add('active');
            });
        });

        document.querySelectorAll('.create-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.create-cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const cat = btn.getAttribute('data-cat');
                document.getElementById('create-geometry-grid').style.display = cat === 'geometry' ? 'block' : 'none';
                document.getElementById('create-lights-grid').style.display = cat === 'lights' ? 'block' : 'none';
            });
        });

        document.querySelectorAll('.rollout-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                header.nextElementSibling.classList.toggle('collapsed');
            });
        });

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.executeCommand(btn.dataset.command));
        });

        document.querySelector('[data-command="undo"]').addEventListener('click', () => { if(window.GizmoAPI && window.GizmoAPI.undo) window.GizmoAPI.undo(); });
        document.querySelector('[data-command="redo"]').addEventListener('click', () => { if(window.GizmoAPI && window.GizmoAPI.redo) window.GizmoAPI.redo(); });

        document.querySelectorAll('.btn-create').forEach(btn => {
            btn.addEventListener('click', () => {
                if (Viewport && Viewport.addPrimitive) {
                    Viewport.addPrimitive(btn.getAttribute('data-type'));
                    const modifyTab = document.querySelector('.cmd-tab[data-target="panel-modify"]');
                    if (modifyTab) modifyTab.click();
                }
            });
        });

        document.querySelectorAll('.spinner-arrows > div').forEach(arrow => {
            arrow.addEventListener('click', () => {
                const id = arrow.getAttribute('data-target');
                const step = parseFloat(arrow.getAttribute('data-step'));
                const input = document.getElementById(id);
                if (input) {
                    input.value = (parseFloat(input.value) || 0) + step;
                    input.dispatchEvent(new Event('input'));
                }
            });
        });

        const map = { 'ui-scale': 'scale', 'ui-spacing': 'spacing', 'ui-rotx': 'rotX', 'ui-roty': 'rotY', 'ui-rotz': 'rotZ' };
        for (const [id, key] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', (e) => StateManager.update(key, parseFloat(e.target.value) || 0));
        }

        const chkPhysics = document.getElementById('chk-physics');
        const chkInfinite = document.getElementById('chk-infinite');
        const infSpacing = document.getElementById('ui-inf-spacing');
        const infCount = document.getElementById('ui-inf-count');
        
        if (chkPhysics) chkPhysics.addEventListener('change', (e) => {
            const name = document.getElementById('sel-obj-name').value;
            if (name && Viewport.customObjects) {
                const obj = Viewport.customObjects.find(o => o.name === name);
                if (obj) { if (!obj.userData) obj.userData = {}; obj.userData.hasPhysics = e.target.checked; }
            }
        });
        
        // 🔥 SONSUZ DÖNGÜ VE HAYALET GÜNCELLEMELERİ 🔥
        if (chkInfinite) chkInfinite.addEventListener('change', (e) => {
            const name = document.getElementById('sel-obj-name').value;
            const infSet = document.getElementById('infinite-settings');
            if(infSet) infSet.style.display = e.target.checked ? 'block' : 'none';

            if (name && Viewport.customObjects) {
                const obj = Viewport.customObjects.find(o => o.name === name);
                if (obj) { 
                    if (!obj.userData) obj.userData = {}; 
                    obj.userData.isInfinite = e.target.checked;
                    
                    if(obj.userData.infSpacing === undefined) obj.userData.infSpacing = 2; // Daha makul varsayılanlar
                    if(obj.userData.infCount === undefined) obj.userData.infCount = 5;
                    
                    if (infSpacing) infSpacing.value = obj.userData.infSpacing;
                    if (infCount) infCount.value = obj.userData.infCount;
                    
                    if(Viewport.updateGhosts) Viewport.updateGhosts(obj);
                }
            }
        });

        if (infSpacing) infSpacing.addEventListener('input', (e) => {
            const name = document.getElementById('sel-obj-name').value;
            if (name && Viewport.customObjects) {
                const obj = Viewport.customObjects.find(o => o.name === name);
                if (obj && obj.userData) {
                    obj.userData.infSpacing = parseFloat(e.target.value) || 2;
                    if(Viewport.updateGhosts) Viewport.updateGhosts(obj);
                }
            }
        });

        if (infCount) infCount.addEventListener('input', (e) => {
            const name = document.getElementById('sel-obj-name').value;
            if (name && Viewport.customObjects) {
                const obj = Viewport.customObjects.find(o => o.name === name);
                if (obj && obj.userData) {
                    obj.userData.infCount = parseInt(e.target.value) || 5;
                    if(Viewport.updateGhosts) Viewport.updateGhosts(obj);
                }
            }
        });

        const nameInput = document.getElementById('sel-obj-name');
        if (nameInput) {
            nameInput.addEventListener('change', (e) => {
                const oldName = this._lastSelectedName;
                if (oldName && oldName !== "Ana_Domino" && Viewport.customObjects) {
                    const obj = Viewport.customObjects.find(o => o.name === oldName);
                    if (obj) { obj.name = e.target.value; this._lastSelectedName = e.target.value; }
                }
            });
        }

        const colorPicker = document.getElementById('sel-obj-color');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                const name = this._lastSelectedName;
                if (name === "Ana_Domino") {
                    StateManager.update('materialColor', e.target.value);
                    if(Viewport.dominoMesh && Array.isArray(Viewport.dominoMesh.material)) {
                        Viewport.dominoMesh.material.forEach(m => m.color.set(e.target.value));
                    }
                } else if (name && Viewport.customObjects) {
                    const obj = Viewport.customObjects.find(o => o.name === name);
                    if (obj) {
                        obj.traverse((child) => {
                            if (child.isMesh && Array.isArray(child.material)) {
                                child.material.forEach(m => m.color.set(e.target.value));
                            }
                        });
                    }
                }
            });
        }
    },

    executeCommand(cmd) {
        if(cmd === 'undo' || cmd === 'redo') return;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.mode-btn[data-command="${cmd}"]`);
        if (btn) btn.classList.add('active');

        if(window.GizmoAPI) {
            if (cmd === 'select') { window.GizmoAPI.deselectObject(); }
            else if (cmd === 'translate') { window.GizmoAPI.setGizmoMode('translate'); }
            else if (cmd === 'rotate') { window.GizmoAPI.setGizmoMode('rotate'); }
            else if (cmd === 'scale') { window.GizmoAPI.setGizmoMode('scale'); }
        }
    },

    updateUIFromState() {
        const s = StateManager.settings;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = val; };
        
        // 🔥 Doğru Varsayılanlar (Scale: 1.5, Aralık: 0.9) 🔥
        setVal('ui-scale', s.scale !== undefined ? s.scale : 1.5); 
        setVal('ui-spacing', s.spacing !== undefined ? s.spacing : 0.9);
        setVal('ui-rotx', s.rotX); setVal('ui-roty', s.rotY); setVal('ui-rotz', s.rotZ);
    },

    updateCoordinates(x, y, z) {
        const cx = document.getElementById('coord-x'); if(cx) cx.value = (x??0).toFixed(2);
        const cy = document.getElementById('coord-y'); if(cy) cy.value = (y??0).toFixed(2);
        const cz = document.getElementById('coord-z'); if(cz) cz.value = (z??0).toFixed(2);
    },

    setSelectedName(name) {
        this._lastSelectedName = name;
        const nameEl = document.getElementById('sel-obj-name');
        const colorEl = document.getElementById('sel-obj-color');
        const baseGeoEl = document.getElementById('base-geo-name');
        
        const chkPhysics = document.getElementById('chk-physics');
        const chkInfinite = document.getElementById('chk-infinite');
        const infSet = document.getElementById('infinite-settings');

        if (nameEl) {
            nameEl.value = name || "Seçim Yok";
            if (name === "Ana_Domino" || !name) nameEl.setAttribute('readonly', true);
            else nameEl.removeAttribute('readonly');
        }

        if (baseGeoEl) {
            baseGeoEl.textContent = name ? name.split('_')[0] : "None";
        }

        if (chkPhysics && chkInfinite) {
            if (name === "Ana_Domino" || !name || name.includes("Light")) {
                chkPhysics.disabled = true; chkInfinite.disabled = true;
                chkPhysics.checked = false; chkInfinite.checked = false;
                if(infSet) infSet.style.display = 'none';
            } else {
                chkPhysics.disabled = false; chkInfinite.disabled = false;
                const obj = Viewport.customObjects ? Viewport.customObjects.find(o => o.name === name) : null;
                if (obj) {
                    if(!obj.userData) obj.userData = {};
                    chkPhysics.checked = obj.userData.hasPhysics || false;
                    chkInfinite.checked = obj.userData.isInfinite || false;
                    
                    if(infSet) infSet.style.display = chkInfinite.checked ? 'block' : 'none';
                    
                    const infSpacing = document.getElementById('ui-inf-spacing');
                    const infCount = document.getElementById('ui-inf-count');
                    if (infSpacing) infSpacing.value = obj.userData.infSpacing !== undefined ? obj.userData.infSpacing : 2;
                    if (infCount) infCount.value = obj.userData.infCount !== undefined ? obj.userData.infCount : 5;
                }
            }
        }

        if (colorEl && name) {
            let targetObj = (name === "Ana_Domino" && Viewport.dominoMesh) ? Viewport.dominoMesh : (Viewport.customObjects ? Viewport.customObjects.find(o => o.name === name) : null);
            
            if (targetObj) {
                targetObj.traverse((child) => {
                    if (child.isMesh && child.material) {
                        let mat = Array.isArray(child.material) ? child.material[0] : child.material;
                        if (mat && mat.color) colorEl.value = '#' + mat.color.getHexString();
                    }
                });
            }
        }
    }
};