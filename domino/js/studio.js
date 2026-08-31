// studio.js - 3ds Max / Blender Tarzı Sahne Tasarım Motoru

const Studio = {
    isActive: false,
    transformControl: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    
    // Tıklanabilir Gizli Kutular ve Çizgiler (Helper)
    selectableObjects: [],
    camHelper: null, camBox: null,
    lightHelper: null, lightBox: null,

    init() {
        // 1. STÜDYO KAMERASI (Oyun kamerasına dışarıdan bakmak için uçan kamera)
        Game.studioCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        Game.controls = new THREE.OrbitControls(Game.studioCamera, Game.renderer.domElement);
        Game.controls.enabled = false;

        // 2. TRANSFORM CONTROLS (Tıklayınca çıkan X, Y, Z okları)
        this.transformControl = new THREE.TransformControls(Game.studioCamera, Game.renderer.domElement);
        this.transformControl.addEventListener('dragging-changed', (event) => {
            Game.controls.enabled = !event.value; // Oku çekerken kameranın dönmesini engelle
        });
        
        // Oklarla objeyi çektiğinde asıl değerleri güncelle
        this.transformControl.addEventListener('change', () => this.onTransformChange());
        Game.scene.add(this.transformControl);

        // 3. 3DS MAX TARZI HELPER (ÇİZGİ) VE HİTBOX (TIKLAMA) OBJELERİ YARAT
        this.setupHelpers();

        // 4. MOUSE VE KLAVYE OLAYLARI
        window.addEventListener('mousedown', (e) => this.onMouseClick(e));
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
    },

    setupHelpers() {
        // Oyun Kamerası Çizgileri ve Tıklama Kutusu
        this.camHelper = new THREE.CameraHelper(Game.camera);
        Game.scene.add(this.camHelper);
        
        this.camBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 2), new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true}));
        this.camBox.userData = { type: 'camera' };
        Game.scene.add(this.camBox);
        this.selectableObjects.push(this.camBox);

        // Kırmızı Işık Çizgileri ve Tıklama Kutusu
        this.lightHelper = new THREE.PointLightHelper(Game.redLight, 1.5);
        Game.scene.add(this.lightHelper);
        
        this.lightBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true}));
        this.lightBox.userData = { type: 'light' };
        Game.scene.add(this.lightBox);
        this.selectableObjects.push(this.lightBox);

        this.hideHelpers(); // Başlangıçta gizle
    },

    onTransformChange() {
        const obj = this.transformControl.object;
        if(!obj) return;
        
        // Eğer seçilen obje Kamera Kutusu ise, Asıl Kamerayı ona eşitle!
        if(obj.userData.type === 'camera') {
            Game.camera.position.copy(obj.position);
            Game.camera.rotation.copy(obj.rotation);
            this.camHelper.update();
            
            // Paneli de canlı güncelle (opsiyonel)
            const camYInput = document.getElementById('inp-camy');
            if(camYInput) camYInput.value = obj.position.y;
        } 
        // Eğer seçilen obje Işık ise
        else if (obj.userData.type === 'light') {
            Game.redLight.position.copy(obj.position);
            this.lightHelper.update();
        }
        // Eğer seçilen obje Domino Taşı ise
        else if (obj.userData.type === 'domino') {
            const rotYInput = document.getElementById('inp-rot-y');
            if(rotYInput) rotYInput.value = THREE.MathUtils.radToDeg(obj.rotation.y);
        }
    },

    onMouseClick(e) {
        if(!this.isActive) return;
        if(e.clientX > window.innerWidth - 380) return; // Sağdaki menüye tıklandıysa boşver

        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, Game.studioCamera);

        // Raycaster ile sahnede neye tıklandığını bul
        let targets = [...this.selectableObjects];
        if(DominoManager.studioDomino) targets.push(DominoManager.studioDomino);

        const intersects = this.raycaster.intersectObjects(targets, true);
        
        if(intersects.length > 0) {
            let selected = intersects[0].object;
            // Eğer dominonun alt kaplamasına tıklandıysa ana grubu seç
            if(selected.parent && selected.parent.userData.type === 'domino') selected = selected.parent;
            
            this.transformControl.attach(selected);
        } else if (e.button === 0) { // Sol tıkla boşluğa basarsan seçimi bırak
            this.transformControl.detach();
        }
    },

    onKeyDown(e) {
        if(!this.isActive) return;
        // W, E, R Tuşlarıyla 3ds Max/Blender modu değiştir
        switch(e.key.toLowerCase()) {
            case 'w': this.transformControl.setMode('translate'); break; // Taşıma (Oklar)
            case 'e': this.transformControl.setMode('rotate'); break;    // Döndürme (Halkalar)
            case 'r': this.transformControl.setMode('scale'); break;     // Büyütme (Kareler)
        }
    },

    toggle(state) {
        this.isActive = state;
        Game.isStudioMode = state;
        Game.controls.enabled = state;

        if(state) {
            // STÜDYOYA GİR (Kamerayı dışarı al, Helperları göster)
            Game.studioCamera.position.copy(Game.camera.position).add(new THREE.Vector3(8, 8, -8));
            Game.controls.target.copy(Game.camera.position);
            
            this.camBox.position.copy(Game.camera.position);
            this.camBox.rotation.copy(Game.camera.rotation);
            this.lightBox.position.copy(Game.redLight.position);
            
            this.camHelper.visible = true; this.camBox.visible = true;
            this.lightHelper.visible = true; this.lightBox.visible = true;
            Game.gridHelper.visible = true;
        } else {
            // OYUNA DÖN (Her şeyi gizle)
            this.hideHelpers();
            this.transformControl.detach();
        }
    },

    hideHelpers() {
        this.camHelper.visible = false; this.camBox.visible = false;
        this.lightHelper.visible = false; this.lightBox.visible = false;
        if(Game.gridHelper) Game.gridHelper.visible = false;
    }
};