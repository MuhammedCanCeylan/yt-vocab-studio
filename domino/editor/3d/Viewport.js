// Viewport.js - 2D Derinlik Kilidi, Proxy DOM ve Hayalet (Ghost) Çizim Motoru (Eksiksiz Sürüm)
import { StateManager } from '../core/StateManager.js';
import { UIManager } from '../ui/UIManager.js';

export const Viewport = {
    scene: null, camera: null, activeCamera: null, renderer: null, orbit: null,
    dominoGroup: null, dominoMesh: null, ambientLight: null,
    spotLight: null, spotLightHelper: null, lightHitbox: null,
    lightTargetHitbox: null, lightTargetLine: null,
    gameCam: null, gameCamHelper: null, camHitbox: null,
    cameraTargetHitbox: null, cameraTargetLine: null,
    customObjects: [],
    
    // 🔥 HAYALET KOPYALAR İÇİN HAVUZ 🔥
    ghostObjects: [],
    
    _unsubscribeState: null,

    views: [],
    activeViewIndex: 3, 
    isQuadView: false,
    dummyDOM: null,

    init() {
        const container = document.getElementById('max-viewport');
        if (!container) return;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(StateManager.settings.bgColor);
        
        const aspect = container.clientWidth / container.clientHeight;
        const frustum = 30;

        const camTop = new THREE.OrthographicCamera(-frustum*aspect/2, frustum*aspect/2, frustum/2, -frustum/2, 0.1, 1000);
        camTop.position.set(0, 50, 0); 
        camTop.up.set(0, 0, -1); 
        camTop.lookAt(0, 0, 0);

        const camFront = new THREE.OrthographicCamera(-frustum*aspect/2, frustum*aspect/2, frustum/2, -frustum/2, 0.1, 1000);
        camFront.position.set(0, 0, 50); 
        camFront.lookAt(0, 0, 0);

        const camRight = new THREE.OrthographicCamera(-frustum*aspect/2, frustum*aspect/2, frustum/2, -frustum/2, 0.1, 1000);
        camRight.position.set(50, 0, 0); 
        camRight.lookAt(0, 0, 0);

        const camPersp = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        camPersp.position.set(15, 12, 20); 
        camPersp.lookAt(0, 1.5, 0);

        this.views = [
            { name: 'Top', type: 'ortho', rect: [0, 0.5, 0.5, 0.5], camera: camTop },
            { name: 'Front', type: 'ortho', rect: [0, 0, 0.5, 0.5], camera: camFront },
            { name: 'Right', type: 'ortho', rect: [0.5, 0, 0.5, 0.5], camera: camRight },
            { name: 'Perspective', type: 'persp', rect: [0.5, 0.5, 0.5, 0.5], camera: camPersp }
        ];

        this.camera = this.views[3].camera;
        this.activeCamera = this.camera; 

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        this.dummyDOM = new Proxy(this.renderer.domElement, {
            get: (target, prop) => {
                if (prop === 'getBoundingClientRect') {
                    return () => {
                        const rect = target.getBoundingClientRect();
                        if (!Viewport.isQuadView) return rect;
                        const v = Viewport.views[Viewport.activeViewIndex].rect;
                        const domLeft = rect.left + v[0] * rect.width;
                        const domTop = rect.top + (1 - v[1] - v[3]) * rect.height;
                        const domWidth = v[2] * rect.width;
                        const domHeight = v[3] * rect.height;
                        return { left: domLeft, top: domTop, width: domWidth, height: domHeight, right: domLeft + domWidth, bottom: domTop + domHeight };
                    };
                }
                if (prop === 'clientWidth') return Viewport.isQuadView ? target.clientWidth * Viewport.views[Viewport.activeViewIndex].rect[2] : target.clientWidth;
                if (prop === 'clientHeight') return Viewport.isQuadView ? target.clientHeight * Viewport.views[Viewport.activeViewIndex].rect[3] : target.clientHeight;
                const value = target[prop];
                return typeof value === 'function' ? value.bind(target) : value;
            }
        });

        this.orbit = new THREE.OrbitControls(this.camera, this.dummyDOM);
        this.orbit.target.set(0, 1.5, 0);

        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            if (!this.isQuadView) return;
            const rect = this.renderer.domElement.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width;
            const ny = 1 - ((e.clientY - rect.top) / rect.height); 
            
            let clickedViewIndex = this.activeViewIndex;
            this.views.forEach((v, i) => {
                if (nx >= v.rect[0] && nx <= v.rect[0]+v.rect[2] && ny >= v.rect[1] && ny <= v.rect[1]+v.rect[3]) {
                    clickedViewIndex = i;
                }
            });
            
            if (this.activeViewIndex !== clickedViewIndex) {
                this.setActiveView(clickedViewIndex);
            }
        }, true);

        this.scene.add(new THREE.GridHelper(100, 100, 0x666666, 0x333333));
        this.ambientLight = new THREE.AmbientLight(0xffffff, StateManager.settings.ambientLight);
        this.scene.add(this.ambientLight);

        this.spotLight = new THREE.SpotLight(StateManager.settings.lightColor, StateManager.settings.lightIntensity);
        this.spotLight.position.set(StateManager.settings.lightX, StateManager.settings.lightY, StateManager.settings.lightZ);
        this.spotLight.castShadow = true;
        this.scene.add(this.spotLight);
        this.scene.add(this.spotLight.target);
        this.spotLightHelper = new THREE.SpotLightHelper(this.spotLight);
        this.scene.add(this.spotLightHelper);

        this.lightHitbox = new THREE.Mesh(new THREE.BoxGeometry(1.5,1.5,1.5), new THREE.MeshBasicMaterial({color: 0xffff00, transparent: true, opacity: 0.3}));
        this.lightHitbox.position.copy(this.spotLight.position);
        this.lightHitbox.name = "Spot_Isigi";
        this.scene.add(this.lightHitbox);

        this.lightTargetHitbox = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 }));
        this.lightTargetHitbox.position.set(StateManager.settings.lightTargetX, StateManager.settings.lightTargetY, StateManager.settings.lightTargetZ);
        this.lightTargetHitbox.name = "Isik_Hedefi";
        this.scene.add(this.lightTargetHitbox);
        this.spotLight.target.position.copy(this.lightTargetHitbox.position);

        const lightLineGeo = new THREE.BufferGeometry().setFromPoints([this.spotLight.position, this.lightTargetHitbox.position]);
        this.lightTargetLine = new THREE.Line(lightLineGeo, new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 }));
        this.scene.add(this.lightTargetLine);

        this.gameCam = new THREE.PerspectiveCamera(75, 16/9, 0.5, 50);
        this.gameCam.position.set(StateManager.settings.cameraPosX, StateManager.settings.cameraPosY, StateManager.settings.cameraPosZ);
        this.gameCamHelper = new THREE.CameraHelper(this.gameCam);
        this.scene.add(this.gameCamHelper);

        this.camHitbox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 3), new THREE.MeshBasicMaterial({color: 0x00ffff, transparent: true, opacity: 0.3}));
        this.camHitbox.position.copy(this.gameCam.position);
        this.camHitbox.rotation.copy(this.gameCam.rotation);
        this.camHitbox.name = "Oyun_Kamerasi";
        this.scene.add(this.camHitbox);

        this.cameraTargetHitbox = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 }));
        this.cameraTargetHitbox.position.set(StateManager.settings.cameraTargetX, StateManager.settings.cameraTargetY, StateManager.settings.cameraTargetZ);
        this.cameraTargetHitbox.name = "Kamera_Hedefi";
        this.scene.add(this.cameraTargetHitbox);
        this.gameCam.lookAt(this.cameraTargetHitbox.position);

        const camLineGeo = new THREE.BufferGeometry().setFromPoints([this.gameCam.position, this.cameraTargetHitbox.position]);
        this.cameraTargetLine = new THREE.Line(camLineGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 }));
        this.scene.add(this.cameraTargetLine);

        // 🔥 VARSAYILAN DOMİNO AYARLARI (Scale: 1.5, Spacing: 0.9) 🔥
        StateManager.updateMultiple({
            scale: 1.5,
            spacing: 0.9
        });

        this.createDomino();
        window.addEventListener('resize', () => this.onResize());
        this._unsubscribeState = StateManager.subscribe((key, value, state) => this.onStateChange(key, value, state));
        this.animate();
    },

    getActiveCamera() {
        return this.isQuadView ? this.views[this.activeViewIndex].camera : this.activeCamera;
    },

    toggleQuadView() {
        this.isQuadView = !this.isQuadView;
        const borders = document.getElementById('quad-borders');
        if (borders) borders.style.display = this.isQuadView ? 'block' : 'none';
        this.setActiveView(this.activeViewIndex);
        this.onResize();
    },

    setActiveView(index) {
        this.activeViewIndex = index;
        const view = this.views[index];
        const label = document.getElementById('vp-camera-toggle');
        if(label) label.textContent = view.name;

        this.activeCamera = view.camera;

        if (this.orbit) {
            this.orbit.object = view.camera;
            this.orbit.enableRotate = (view.type === 'persp');
        }
        
        if (window.GizmoAPI && window.GizmoAPI.transformControl) {
            const gizmo = window.GizmoAPI.transformControl;
            gizmo.camera = view.camera;
            
            if (view.name === 'Top') {
                gizmo.showX = true; gizmo.showY = false; gizmo.showZ = true; 
            } else if (view.name === 'Front') {
                gizmo.showX = true; gizmo.showY = true; gizmo.showZ = false; 
            } else if (view.name === 'Right') {
                gizmo.showX = false; gizmo.showY = true; gizmo.showZ = true; 
            } else {
                gizmo.showX = true; gizmo.showY = true; gizmo.showZ = true; 
            }
        }
        if (typeof UIManager !== 'undefined' && UIManager.highlightActiveView) {
            UIManager.highlightActiveView(index);
        }
    },

    toggleCamera() {
        if (this.activeCamera === this.camera) {
            this.activeCamera = this.gameCam;
            this.orbit.enabled = false; 
            if (window.GizmoAPI) window.GizmoAPI.transformControl.camera = this.gameCam; 
            return "Kamera_01";
        } else {
            this.activeCamera = this.camera; 
            this.orbit.enabled = true; 
            if (window.GizmoAPI) window.GizmoAPI.transformControl.camera = this.camera;
            return "Perspective";
        }
    },

    addPrimitive(type) {
        let mesh, name;
        if (type === 'pointlight') {
            mesh = new THREE.PointLight(0xffffff, 2, 50);
            const helper = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true}));
            mesh.add(helper);
            name = "PointLight_" + Date.now();
        } else if (type === 'spotlight') {
            mesh = new THREE.SpotLight(0xffffff, 2);
            mesh.angle = Math.PI / 6;
            const helper = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 8), new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true}));
            helper.rotation.x = -Math.PI / 2;
            mesh.add(helper);
            name = "SpotLight_" + Date.now();
        } else {
            let geo;
            if (type === 'cube') { geo = new THREE.BoxGeometry(2, 2, 2); name = "Box_00" + (this.customObjects.length + 1); } 
            else if (type === 'plane') { geo = new THREE.PlaneGeometry(10, 10); geo.rotateX(-Math.PI / 2); name = "Plane_00" + (this.customObjects.length + 1); } 
            else if (type === 'sphere') { geo = new THREE.SphereGeometry(1.5, 32, 32); name = "Sphere_00" + (this.customObjects.length + 1); }
            else if (type === 'cylinder') { geo = new THREE.CylinderGeometry(1, 1, 3, 32); name = "Cylinder_00" + (this.customObjects.length + 1); }
            else if (type === 'cone') { geo = new THREE.ConeGeometry(1.5, 3, 32); name = "Cone_00" + (this.customObjects.length + 1); }
            else if (type === 'torus') { geo = new THREE.TorusGeometry(1.5, 0.4, 16, 100); name = "Torus_00" + (this.customObjects.length + 1); }

            const baseMat = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide });
            const matArray = [ baseMat.clone(), baseMat.clone(), baseMat.clone(), baseMat.clone(), baseMat.clone(), baseMat.clone() ];
            mesh = new THREE.Mesh(geo, matArray);
        }
        mesh.position.set(Math.random() * 4 - 2, 2, Math.random() * 4 - 2);
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
        
        // Varsayılan sonsuzluk ayarları
        mesh.userData = { selectableRoot: mesh, hasPhysics: false, isInfinite: false, type: type, infSpacing: 5, infCount: 10 };
        this.scene.add(mesh);
        this.customObjects.push(mesh);
        if(window.GizmoAPI) window.GizmoAPI.selectObject(mesh);
    },

    removePrimitive(obj) {
        this.scene.remove(obj);
        this.customObjects = this.customObjects.filter(o => o !== obj);
        // Silinen objenin hayaletlerini de temizle
        this.updateGhosts(obj, true);
    },

    createDomino() {
        if (this.dominoGroup) {
            this.scene.remove(this.dominoGroup);
            this.dominoGroup = null;
            this.dominoMesh = null;
        }

        const group = new THREE.Group();
        group.name = "Ana_Domino";
        group.userData.selectableRoot = group; 
        const geo = new THREE.BoxGeometry(1.5, 6.3, 3);
        
        const baseMat = new THREE.MeshStandardMaterial({ color: StateManager.settings.materialColor });
        const matArray = [ baseMat.clone(), baseMat.clone(), baseMat.clone(), baseMat.clone(), baseMat.clone(), baseMat.clone() ];
        
        const mesh = new THREE.Mesh(geo, matArray);
        mesh.name = "Ana_Domino_Mesh";
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.position.y = 3.15; 
        mesh.userData.selectableRoot = group; 
        group.add(mesh);

        this.dominoGroup = group;
        this.dominoMesh = mesh;
        this.applyDominoTransform(StateManager.settings);
        this.scene.add(group);
    },

    applyDominoTransform(state) {
        if (!this.dominoGroup || window._gizmoDragging) return;
        const scale = Number(state.scale ?? 1.5);
        this.dominoGroup.scale.set(scale, scale, scale);
        this.dominoGroup.rotation.order = 'YXZ';
        this.dominoGroup.rotation.set(THREE.MathUtils.degToRad(Number(state.rotX ?? 0)), THREE.MathUtils.degToRad(Number(state.rotY ?? 0)), THREE.MathUtils.degToRad(Number(state.rotZ ?? 0)));
        this.dominoGroup.position.set(Number(state.posX ?? 0), Number(state.pivotY ?? 0), Number(state.posZ ?? 0));
        this.dominoGroup.updateMatrixWorld(true);
    },

    // 🔥 YENİ: HAYALET KOPYALARI ÇİZME MOTORU 🔥
    updateGhosts(sourceObj, removeAll = false) {
        // Önce bu objeye ait eski hayaletleri sahneden ve diziden temizle
        this.ghostObjects = this.ghostObjects.filter(ghost => {
            if (ghost.userData.sourceName === sourceObj.name) {
                this.scene.remove(ghost);
                return false;
            }
            return true;
        });

        if (removeAll || !sourceObj.userData.isInfinite) return;

        const count = sourceObj.userData.infCount || 10;
        const spacing = sourceObj.userData.infSpacing || 5;

        // X ekseninde geriye doğru kopya oluştur
        for (let i = 1; i <= count; i++) {
            const ghost = sourceObj.clone();
            
            // Gizmo objeyi seçmesin diye kök referansını iptal ediyoruz
            ghost.userData = { sourceName: sourceObj.name, isGhost: true }; 
            
            // Konumunu kaydır
            ghost.position.x += (i * spacing);
            
            // Saydamlık ayarı (Gittikçe silikleşsin)
            const opacity = 1 - (i / (count + 1));
            ghost.traverse(child => {
                if (child.isMesh) {
                    child.material = child.material.clone(); // Orijinal materyali bozmamak için kopyala
                    child.material.transparent = true;
                    child.material.opacity = opacity;
                    child.castShadow = false; // Hayaletlerin gölgesi olmasın, performansı korur
                }
            });

            this.scene.add(ghost);
            this.ghostObjects.push(ghost);
        }
    },

    changeObjectColor(objName, hexColor) {
        let targetObj = objName === "Ana_Domino" ? this.dominoMesh : this.customObjects.find(o => o.name === objName);
        if (targetObj) {
            if (Array.isArray(targetObj.material)) targetObj.material.forEach(m => m.color.set(hexColor));
            else targetObj.material.color.set(hexColor);
            
            if (objName !== "Ana_Domino") this.updateGhosts(targetObj); // Rengi değişince hayaleti de güncelle
        }
        if (objName === "Ana_Domino") StateManager.update('materialColor', hexColor);
    },

    changeObjectName(oldName, newName) {
        if (oldName === "Ana_Domino") return; 
        const obj = this.customObjects.find(o => o.name === oldName);
        if (obj) obj.name = newName;
    },

    applyTextureLocal(objName, url, faceIndex = -1) {
        if (!url) return;
        const loader = new THREE.TextureLoader();
        loader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace; 
            let targetObj = objName === "Ana_Domino" ? this.dominoGroup : this.customObjects.find(o => o.name === objName);
            if (targetObj) {
                targetObj.traverse((child) => {
                    if (child.isMesh && Array.isArray(child.material)) {
                        if (faceIndex >= 0 && faceIndex < child.material.length) {
                            child.material[faceIndex].map = texture; child.material[faceIndex].needsUpdate = true;
                        } else {
                            child.material.forEach(m => { m.map = texture; m.needsUpdate = true; });
                        }
                    }
                });
                if (objName !== "Ana_Domino") this.updateGhosts(targetObj);
            }
        });
    },

    removeTexture(objName) {
        let targetObj = objName === "Ana_Domino" ? this.dominoGroup : this.customObjects.find(o => o.name === objName);
        if (targetObj) {
            targetObj.traverse((child) => {
                if (child.isMesh && Array.isArray(child.material)) {
                    child.material.forEach(m => { m.map = null; m.needsUpdate = true; });
                }
            });
            if (objName !== "Ana_Domino") this.updateGhosts(targetObj);
        }
    },

    onStateChange(key, value, state) {
        const fullUpdate = key === 'ALL' || key === 'MULTIPLE' || key === 'RESET';
        if (['scale', 'rotX', 'rotY', 'rotZ', 'pivotY', 'posX', 'posZ'].includes(key) || fullUpdate) this.applyDominoTransform(state);
        if (key === 'materialColor' || fullUpdate) {
            if(this.dominoMesh && Array.isArray(this.dominoMesh.material)) this.dominoMesh.material.forEach(m => m.color.set(state.materialColor));
        }
        if (['lightX', 'lightY', 'lightZ', 'lightColor', 'lightIntensity'].includes(key) || fullUpdate) {
            this.spotLight.color.set(state.lightColor); this.spotLight.intensity = state.lightIntensity;
            if (this.lightHitbox) { this.lightHitbox.position.set(state.lightX, state.lightY, state.lightZ); this.spotLight.position.copy(this.lightHitbox.position); }
        }
        if (['lightTargetX', 'lightTargetY', 'lightTargetZ'].includes(key) || fullUpdate) {
            this.lightTargetHitbox.position.set(state.lightTargetX, state.lightTargetY, state.lightTargetZ); this.spotLight.target.position.copy(this.lightTargetHitbox.position);
        }
        if (['cameraPosX', 'cameraPosY', 'cameraPosZ'].includes(key) || fullUpdate) {
            this.camHitbox.position.set(state.cameraPosX, state.cameraPosY, state.cameraPosZ); this.gameCam.position.copy(this.camHitbox.position); this.gameCam.lookAt(this.cameraTargetHitbox.position);
        }
        if (['cameraTargetX', 'cameraTargetY', 'cameraTargetZ'].includes(key) || fullUpdate) {
            this.cameraTargetHitbox.position.set(state.cameraTargetX, state.cameraTargetY, state.cameraTargetZ); this.gameCam.lookAt(this.cameraTargetHitbox.position); this.camHitbox.rotation.copy(this.gameCam.rotation); 
        }
    },

    onResize() {
        const container = document.getElementById('max-viewport');
        if(!container) return;
        const w = container.clientWidth; const h = container.clientHeight; const aspect = w / h;

        this.views.forEach(v => {
            if (v.type === 'persp') { v.camera.aspect = aspect; v.camera.updateProjectionMatrix(); } 
            else { const f = 30; v.camera.left = -f*aspect/2; v.camera.right = f*aspect/2; v.camera.top = f/2; v.camera.bottom = -f/2; v.camera.updateProjectionMatrix(); }
        });
        
        this.gameCam.aspect = aspect;
        this.gameCam.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    },

    updateTargetLines() {
        if (this.lightTargetLine) {
            const pos = this.lightTargetLine.geometry.attributes.position.array;
            pos[0] = this.spotLight.position.x; pos[1] = this.spotLight.position.y; pos[2] = this.spotLight.position.z;
            pos[3] = this.lightTargetHitbox.position.x; pos[4] = this.lightTargetHitbox.position.y; pos[5] = this.lightTargetHitbox.position.z;
            this.lightTargetLine.geometry.attributes.position.needsUpdate = true;
        }
        if (this.cameraTargetLine) {
            const pos = this.cameraTargetLine.geometry.attributes.position.array;
            pos[0] = this.gameCam.position.x; pos[1] = this.gameCam.position.y; pos[2] = this.gameCam.position.z;
            pos[3] = this.cameraTargetHitbox.position.x; pos[4] = this.cameraTargetHitbox.position.y; pos[5] = this.cameraTargetHitbox.position.z;
            this.cameraTargetLine.geometry.attributes.position.needsUpdate = true;
        }
    },

    animate() {
        requestAnimationFrame(() => this.animate());
        if(this.orbit) this.orbit.update();
        if(this.spotLightHelper) this.spotLightHelper.update();
        if(this.gameCamHelper) this.gameCamHelper.update();
        this.updateTargetLines(); 
        
        // 🔥 ANLIK HAYALET (GHOST) GÜNCELLEMESİ 🔥
        // Obje hareket ettikçe hayaletleri de onunla birlikte kaydır
        this.customObjects.forEach(obj => {
            if (obj.userData.isInfinite) {
                const spacing = obj.userData.infSpacing || 5;
                let ghostIndex = 1;
                this.ghostObjects.forEach(ghost => {
                    if (ghost.userData.sourceName === obj.name) {
                        ghost.position.copy(obj.position);
                        ghost.rotation.copy(obj.rotation);
                        ghost.scale.copy(obj.scale);
                        ghost.position.x += (ghostIndex * spacing); // Sadece X ekseninde geriye diz
                        ghostIndex++;
                    }
                });
            }
        });

        const container = document.getElementById('max-viewport');
        if(!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (this.renderer && this.scene) {
            if (this.isQuadView) {
                this.renderer.setScissorTest(true);
                this.views.forEach((view, index) => {
                    const l = Math.floor(width * view.rect[0]);
                    const b = Math.floor(height * view.rect[1]);
                    const w = Math.floor(width * view.rect[2]);
                    const h = Math.floor(height * view.rect[3]);

                    this.renderer.setViewport(l, b, w, h);
                    this.renderer.setScissor(l, b, w, h);
                    this.renderer.render(this.scene, view.camera);
                });
            } else {
                this.renderer.setScissorTest(false);
                this.renderer.setViewport(0, 0, width, height);
                this.renderer.render(this.scene, this.activeCamera);
            }
        }
    },

    exportLevel(levelName) {
        const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.gameCam.quaternion);
        const camTarget = this.gameCam.position.clone().add(camDir.multiplyScalar(10));

        StateManager.updateMultiple({
            cameraPosX: Number(this.gameCam.position.x.toFixed(2)),
            cameraPosY: Number(this.gameCam.position.y.toFixed(2)),
            cameraPosZ: Number(this.gameCam.position.z.toFixed(2)),
            cameraTargetX: Number(camTarget.x.toFixed(2)),
            cameraTargetY: Number(camTarget.y.toFixed(2)),
            cameraTargetZ: Number(camTarget.z.toFixed(2))
        });

        const getMaterialData = (mesh) => {
            if (!mesh || !mesh.material) return [];
            let mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            return mats.map(m => ({ color: m.color ? m.color.getHex() : 0xffffff })); 
        };

        const levelData = {
            name: levelName,
            engineState: StateManager.settings, 
            domino: {
                position: this.dominoGroup.position.toArray(),
                rotation: this.dominoGroup.rotation.toArray(),
                scale: this.dominoGroup.scale.toArray(),
                materials: getMaterialData(this.dominoMesh)
            },
            objects: this.customObjects.map(obj => ({
                name: obj.name,
                type: obj.userData.type || (obj.geometry ? obj.geometry.type : 'Object'),
                position: obj.position.toArray(),
                rotation: obj.rotation.toArray(),
                scale: obj.scale.toArray(),
                materials: getMaterialData(obj),
                hasPhysics: obj.userData.hasPhysics || false,
                isInfinite: obj.userData.isInfinite || false,
                infSpacing: obj.userData.infSpacing !== undefined ? obj.userData.infSpacing : 5,
                infCount: obj.userData.infCount !== undefined ? obj.userData.infCount : 10
            }))
        };

        let allLevels = JSON.parse(localStorage.getItem('domino_custom_levels') || '{}');
        allLevels[levelName] = levelData;
        
        localStorage.setItem('domino_custom_levels', JSON.stringify(allLevels));
        localStorage.setItem('domino_active_level', levelName);
        console.log(`🚀 [Sistem] '${levelName}' adlı harita başarıyla kaydedildi!`);
    }
};