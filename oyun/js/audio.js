// audio.js – Ses yönetimi
const AudioManager = {
    enabled: true, listener: null, sounds: {}, bgmStarted: false,
    init(camera) {
        this.listener = new THREE.AudioListener(); camera.add(this.listener);
        const loader = new THREE.AudioLoader();
        const loadSnd = (name, path, vol=0.5, isLoop=false) => {
            const snd = new THREE.Audio(this.listener);
            loader.load(path, (buf) => {
                snd.setBuffer(buf); snd.setVolume(vol); snd.setLoop(isLoop);
                this.sounds[name] = snd;
            }, undefined, ()=>{});
        };
        loadSnd('coin', 'assets/tap-a.ogg', 0.6, false);
        loadSnd('correct', 'assets/switch-a.ogg', 0.5, false);
        loadSnd('crash', 'assets/click-a.ogg', 0.8, false);
        loadSnd('bgm', 'assets/bgm.mp3', 0.2, true);
        loadSnd('combo', 'assets/tap-b.ogg', 0.7, false);
        loadSnd('levelup', 'assets/upgrade.ogg', 0.7, false);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { if(this.sounds['bgm']) this.sounds['bgm'].pause(); }
            else { if(this.enabled && this.bgmStarted && this.sounds['bgm']) this.sounds['bgm'].play(); }
        });
    },
    play(name) {
        if(!this.enabled || !this.sounds[name]) return;
        if (this.sounds[name].isPlaying) this.sounds[name].stop();
        this.sounds[name].play();
    },
    startBGM() { if (!this.bgmStarted) { this.bgmStarted = true; this.play('bgm'); } },
    toggle() {
        this.enabled = !this.enabled;
        safeSetText('audio-toggle', this.enabled ? "🔊" : "🔇");
        if(!this.enabled) { Object.values(this.sounds).forEach(s => { if(s.isPlaying) s.stop(); }); }
        else if(this.enabled && this.sounds['bgm'] && this.bgmStarted) { this.sounds['bgm'].play(); }
    }
};