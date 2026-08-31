// StateManager.js - Sessiz Hataları Engelleyen Profesyonel Sürüm (Load/Save eklendi)
export const StateManager = {
    _settings: {
        scale: 1.0,
        rotX: 0, rotY: 0, rotZ: 0,
        posX: 0, pivotY: 0, posZ: 0, 
        
        spacing: 3.0,
        fallSpeed: 5.5,
        
        materialColor: '#ff4444',
        bgColor: '#111111',
        ambientLight: 0.3,
        
        lightX: 20, lightY: 30, lightZ: -10,
        lightTargetX: 0, lightTargetY: 0, lightTargetZ: 0,
        lightColor: '#ffffff',
        lightIntensity: 1.5,

        cameraPosX: -6, cameraPosY: 4.5, cameraPosZ: 10,
        cameraTargetX: 0, cameraTargetY: 1.5, cameraTargetZ: 0,

        snapGrid: false,
        snapAngle: false
    },

    _listeners: new Set(),
    _debug: true,

    get settings() { return { ...this._settings }; },

    update(key, value) {
        if (!(key in this._settings)) {
            console.warn(`[StateManager] Bilinmeyen key reddedildi: ${key}`);
            return;
        }

        if (this._settings[key] === value) return;

        this._settings[key] = value;
        this._notify(key, value);
    },

    updateMultiple(newSettings) {
        const changedKeys = [];
        for (const [key, value] of Object.entries(newSettings)) {
            if (key in this._settings && this._settings[key] !== value) {
                this._settings[key] = value;
                changedKeys.push(key);
            }
        }
        if (changedKeys.length > 0) this._notify('MULTIPLE', changedKeys);
    },

    subscribe(callback) {
        if (typeof callback !== 'function') return () => {};
        this._listeners.add(callback);
        callback('INIT', null, { ...this._settings });
        return () => this._listeners.delete(callback);
    },

    _notify(key, value) {
        const snapshot = { ...this._settings };
        this._listeners.forEach(callback => {
            try { callback(key, value, snapshot); } catch (e) {}
        });
    },

    // 🔥 İŞTE EKSİK OLAN VE HATA VERDİREN KISIM BURASIYDI 🔥
    savePreset(name = 'default') {
        try { localStorage.setItem(`max_studio_${name}`, JSON.stringify(this._settings)); } catch (e) {}
    },

    loadPreset(name = 'default') {
        try {
            const saved = localStorage.getItem(`max_studio_${name}`);
            if (saved) this.updateMultiple(JSON.parse(saved));
        } catch (e) {}
    }
};