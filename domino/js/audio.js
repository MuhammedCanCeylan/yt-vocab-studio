// audio.js - Ses ve Gerilim Efektleri Motoru
const AudioEngine = {
    bgm: null, hitSound: null, breakSound: null, tickSound: null,
    isMuted: false,

    init() {
        this.bgm = new Audio('assets/bgm_tension.wav');
        this.bgm.loop = true;
        this.bgm.volume = 0.4;

        this.hitSound = new Audio('assets/domino_hit.wav');
        this.hitSound.volume = 0.8;

        this.breakSound = new Audio('assets/chain_break.mp3');
        this.breakSound.volume = 1.0;
        
        this.tickSound = new Audio('assets/tick.wav');
        this.tickSound.volume = 0.5;
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        const btn = document.getElementById('mute-btn');
        if(this.isMuted) {
            if(this.bgm) this.bgm.pause();
            btn.innerHTML = '<i class="ti ti-volume-3"></i>';
            btn.style.color = '#E74C3C';
            btn.style.borderColor = '#E74C3C';
        } else {
            if(this.bgm && typeof Game !== 'undefined' && Game.isPlaying) this.bgm.play();
            btn.innerHTML = '<i class="ti ti-volume"></i>';
            btn.style.color = '#FFF';
            btn.style.borderColor = '#555';
        }
    },

    playBGM() { if(this.bgm && !this.isMuted) this.bgm.play().catch(e => console.log("Otomatik oynatma engellendi")); },
    stopBGM() { if(this.bgm) { this.bgm.pause(); this.bgm.currentTime = 0; } },
    playHit() { if(this.hitSound && !this.isMuted) { this.hitSound.currentTime = 0; this.hitSound.play(); } },
    playBreak() { 
        this.stopBGM();
        if(this.breakSound && !this.isMuted) { this.breakSound.currentTime = 0; this.breakSound.play(); } 
    },
    playTick() { if(this.tickSound && !this.isMuted) { this.tickSound.currentTime = 0; this.tickSound.play(); } }
};