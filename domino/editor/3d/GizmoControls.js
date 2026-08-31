// GizmoControls.js - Kesin World Space Kilidi ve Ctrl+Z Motoru
import { StateManager } from '../core/StateManager.js';
import { Viewport } from './Viewport.js';
import { UIManager } from '../ui/UIManager.js';

window._gizmoDragging = false; 

export const GizmoControls = {
    transformControl: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    selectedObject: null,
    highlightColor: 0x00a1de,

    faceSelectionMode: false,
    selectedMaterialIndex: -1,

    undoStack: [],
    redoStack: [],
    dragStartState: null,

    init() {
        window.GizmoAPI = this; 
        
        const domTarget = Viewport.dummyDOM || (Viewport.renderer ? Viewport.renderer.domElement : document.body);
        this.transformControl = new THREE.TransformControls(Viewport.getActiveCamera(), domTarget);
        
        this.transformControl.addEventListener('dragging-changed', (event) => {
            if (Viewport.orbit) Viewport.orbit.enabled = !event.value;
            window._gizmoDragging = event.value; 

            const obj = this.transformControl.object;
            if (event.value) { 
                if (obj) {
                    this.dragStartState = {
                        p: obj.position.clone(),
                        r: obj.rotation.clone(),
                        s: obj.scale.clone()
                    };
                }
            } else { 
                if (obj && this.dragStartState) {
                    this.undoStack.push({
                        obj: obj,
                        old: this.dragStartState,
                        new: {
                            p: obj.position.clone(),
                            r: obj.rotation.clone(),
                            s: obj.scale.clone()
                        }
                    });
                    this.redoStack = []; 
                    this.dragStartState = null;
                }
            }
        });

        this.applySnapSettings();
        StateManager.subscribe((key) => {
            if (['snapGrid', 'snapGridSize', 'snapAngle', 'snapAngleDeg', 'ALL'].includes(key)) {
                this.applySnapSettings();
            }
        });

        this.transformControl.addEventListener('change', () => {
            const obj = this.transformControl.object;
            if (!obj) return;

            if (this.transformControl.dragging && typeof UIManager !== 'undefined' && UIManager.updateCoordinates) {
                UIManager.updateCoordinates(obj.position.x, obj.position.y, obj.position.z);
            }

            if (!this.transformControl.dragging) return; 

            if (obj.name === "Ana_Domino") {
                if (this.transformControl.getMode() === 'scale') {
                    let s = Number(obj.scale.x.toFixed(2));
                    if (s < 0.05) s = 0.05;
                    StateManager.update('scale', s);
                }
                else if (this.transformControl.getMode() === 'rotate') {
                    StateManager.updateMultiple({
                        rotX: Math.round(THREE.MathUtils.radToDeg(obj.rotation.x)),
                        rotY: Math.round(THREE.MathUtils.radToDeg(obj.rotation.y)),
                        rotZ: Math.round(THREE.MathUtils.radToDeg(obj.rotation.z))
                    });
                } 
                else if (this.transformControl.getMode() === 'translate') {
                    StateManager.updateMultiple({
                        posX: Number(obj.position.x.toFixed(2)),
                        pivotY: Number(obj.position.y.toFixed(2)),
                        posZ: Number(obj.position.z.toFixed(2))
                    });
                }
            } 
            else if (obj.name === "Spot_Isigi" || obj.name.includes("Light")) {
                StateManager.updateMultiple({
                    lightX: Number(obj.position.x.toFixed(2)),
                    lightY: Number(obj.position.y.toFixed(2)),
                    lightZ: Number(obj.position.z.toFixed(2))
                });
            }
            else if (obj.name === "Isik_Hedefi") {
                StateManager.updateMultiple({
                    lightTargetX: Number(obj.position.x.toFixed(2)),
                    lightTargetY: Number(obj.position.y.toFixed(2)),
                    lightTargetZ: Number(obj.position.z.toFixed(2))
                });
            }
            else if (obj.name === "Oyun_Kamerasi") {
                StateManager.updateMultiple({
                    cameraPosX: Number(obj.position.x.toFixed(2)),
                    cameraPosY: Number(obj.position.y.toFixed(2)),
                    cameraPosZ: Number(obj.position.z.toFixed(2))
                });
            }
            else if (obj.name === "Kamera_Hedefi") {
                StateManager.updateMultiple({
                    cameraTargetX: Number(obj.position.x.toFixed(2)),
                    cameraTargetY: Number(obj.position.y.toFixed(2)),
                    cameraTargetZ: Number(obj.position.z.toFixed(2))
                });
            }
        });

        if (Viewport.scene) {
            Viewport.scene.add(this.transformControl);
        }
        
        if (Viewport.renderer && Viewport.renderer.domElement) {
            Viewport.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        }
        
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
    },

    // 🔥 KİLİT NOKTA: MOD VE EKSEN DEĞİŞTİRİCİ 🔥
    // Bu fonksiyon çağrıldığı an Translate için ZORLA Dünya eksenini ayarlar.
    setGizmoMode(mode) {
        if (!this.transformControl) return;
        this.transformControl.setMode(mode);
        
        if (mode === 'translate') {
            if (typeof this.transformControl.setSpace === 'function') this.transformControl.setSpace('world');
            this.transformControl.space = 'world'; 
        } else if (mode === 'rotate' || mode === 'scale') {
            if (typeof this.transformControl.setSpace === 'function') this.transformControl.setSpace('local');
            this.transformControl.space = 'local'; 
        }
    },

    undo() {
        if (this.undoStack.length === 0) return;
        const action = this.undoStack.pop();
        action.obj.position.copy(action.old.p);
        action.obj.rotation.copy(action.old.r);
        action.obj.scale.copy(action.old.s);
        this.redoStack.push(action);
        
        if (action.obj.name === "Ana_Domino") {
            StateManager.updateMultiple({
                posX: Number(action.obj.position.x.toFixed(2)),
                pivotY: Number(action.obj.position.y.toFixed(2)),
                posZ: Number(action.obj.position.z.toFixed(2)),
                rotX: Math.round(THREE.MathUtils.radToDeg(action.obj.rotation.x)),
                rotY: Math.round(THREE.MathUtils.radToDeg(action.obj.rotation.y)),
                rotZ: Math.round(THREE.MathUtils.radToDeg(action.obj.rotation.z)),
                scale: Number(action.obj.scale.x.toFixed(2))
            });
        }
        if (typeof UIManager !== 'undefined' && UIManager.updateCoordinates) {
            UIManager.updateCoordinates(action.obj.position.x, action.obj.position.y, action.obj.position.z);
        }
    },

    redo() {
        if (this.redoStack.length === 0) return;
        const action = this.redoStack.pop();
        action.obj.position.copy(action.new.p);
        action.obj.rotation.copy(action.new.r);
        action.obj.scale.copy(action.new.s);
        this.undoStack.push(action);
        
        if (action.obj.name === "Ana_Domino") {
            StateManager.updateMultiple({
                posX: Number(action.obj.position.x.toFixed(2)),
                pivotY: Number(action.obj.position.y.toFixed(2)),
                posZ: Number(action.obj.position.z.toFixed(2)),
                rotX: Math.round(THREE.MathUtils.radToDeg(action.obj.rotation.x)),
                rotY: Math.round(THREE.MathUtils.radToDeg(action.obj.rotation.y)),
                rotZ: Math.round(THREE.MathUtils.radToDeg(action.obj.rotation.z)),
                scale: Number(action.obj.scale.x.toFixed(2))
            });
        }
        if (typeof UIManager !== 'undefined' && UIManager.updateCoordinates) {
            UIManager.updateCoordinates(action.obj.position.x, action.obj.position.y, action.obj.position.z);
        }
    },

    applySnapSettings() {
        if (!this.transformControl) return;
        const s = StateManager.settings;
        this.transformControl.setTranslationSnap(s.snapGrid ? s.snapGridSize || 1 : null);
        this.transformControl.setRotationSnap(s.snapAngle ? THREE.MathUtils.degToRad(s.snapAngleDeg || 15) : null);
    },

    getSelectableRoot(obj) {
        if (!obj) return null;
        let current = obj;
        while (current) {
            if (current.userData && current.userData.selectableRoot) {
                return (current.userData.selectableRoot === true) ? current : current.userData.selectableRoot;
            }
            if (current === Viewport.scene) break;
            current = current.parent;
        }
        return obj;
    },

    onPointerDown(e) {
        if (this.transformControl.dragging) return;
        if (this.transformControl.axis !== null) return;

        const rect = (Viewport.dummyDOM && typeof Viewport.dummyDOM.getBoundingClientRect === 'function') 
            ? Viewport.dummyDOM.getBoundingClientRect() 
            : Viewport.renderer.domElement.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

        this.mouse.x = (x / rect.width) * 2 - 1;
        this.mouse.y = -(y / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, Viewport.getActiveCamera());
        
        const targets = [
            Viewport.dominoGroup,
            Viewport.camHitbox, Viewport.cameraTargetHitbox, 
            Viewport.lightHitbox, Viewport.lightTargetHitbox, 
            ...(Viewport.customObjects || [])
        ].filter(Boolean);

        const intersects = this.raycaster.intersectObjects(targets, true);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            const hitObject = hit.object;
            const selectableObject = this.getSelectableRoot(hitObject);
            
            if (selectableObject) {
                this.selectObject(selectableObject);

                if (this.faceSelectionMode && hit.face) {
                    this.selectedMaterialIndex = hit.face.materialIndex ?? 0;
                    if (typeof UIManager !== 'undefined' && UIManager.showFaceInfo) {
                        UIManager.showFaceInfo(`Yüzey Seçildi: İndeks ${this.selectedMaterialIndex}`);
                    }
                } else {
                    this.selectedMaterialIndex = -1;
                    if (typeof UIManager !== 'undefined' && UIManager.showFaceInfo) {
                        UIManager.showFaceInfo("Tüm Obje Seçili");
                    }
                }
            }
        } else if (e.button === 0) {
            this.deselectObject();
            this.selectedMaterialIndex = -1;
            if (typeof UIManager !== 'undefined' && UIManager.showFaceInfo) {
                UIManager.showFaceInfo("");
            }
        }
    },

    selectObject(obj) {
        if (!obj) return;
        const root = this.getSelectableRoot(obj);
        if (!root) return;
        if (this.selectedObject === root) return;

        this.deselectObject();
        this.selectedObject = root;
        this.transformControl.attach(root); 

        // Seçildiği an kesinlikle World Space'e zorluyoruz
        this.setGizmoMode(this.transformControl.getMode());

        this.setHighlight(root, true);

        if (typeof UIManager !== 'undefined') {
            if (UIManager.setSelectedName) UIManager.setSelectedName(root.name);
            if (UIManager.updateCoordinates) UIManager.updateCoordinates(root.position.x, root.position.y, root.position.z);
        }
    },

    deselectObject() {
        if (this.selectedObject) this.setHighlight(this.selectedObject, false);
        this.selectedObject = null;
        this.transformControl.detach();
        if (typeof UIManager !== 'undefined' && UIManager.setSelectedName) {
            UIManager.setSelectedName("None");
        }
    },

    setHighlight(obj, on) {
        if (!obj) return;
        obj.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
                if (!mat || !mat.emissive) return;
                if (on) {
                    child.userData._savedEmissive = mat.emissive.getHex();
                    mat.emissive.setHex(this.highlightColor);
                } else if (child.userData._savedEmissive !== undefined) {
                    mat.emissive.setHex(child.userData._savedEmissive);
                    delete child.userData._savedEmissive;
                }
            });
        });
    },

    onKeyDown(e) {
        const tag = (e.target && e.target.tagName) || '';
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;

        // 🔥 CTRL+Z VE CTRL+Y BURADA DİNLENİYOR 🔥
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            this.undo();
            return;
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            this.redo();
            return;
        }

        switch(e.key.toLowerCase()) {
            case 'q':
                if (typeof UIManager !== 'undefined' && UIManager.executeCommand) UIManager.executeCommand('select');
                break;
            case 'w':
                // 🔥 ARTIK DİREKT BURADAN WORLD EKSENİNE ZORLUYORUZ 🔥
                this.setGizmoMode('translate');
                if (typeof UIManager !== 'undefined' && UIManager.setActiveTool) UIManager.setActiveTool('tool-translate');
                break;
            case 'e':
                this.setGizmoMode('rotate');
                if (typeof UIManager !== 'undefined' && UIManager.setActiveTool) UIManager.setActiveTool('tool-rotate');
                break;
            case 'r':
                this.setGizmoMode('scale');
                if (typeof UIManager !== 'undefined' && UIManager.setActiveTool) UIManager.setActiveTool('tool-scale');
                break;
            case 'escape':
            case 'delete':
            case 'backspace':
                if (this.selectedObject && Viewport.customObjects && Viewport.customObjects.includes(this.selectedObject)) {
                    if (Viewport.removePrimitive) Viewport.removePrimitive(this.selectedObject);
                }
                this.deselectObject();
                break;
        }
    }
};