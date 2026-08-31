// ui.js - Kusursuz Süre Akışı, Güvenli Kelime Havuzu ve Tıklama Yönetimi
const UI = {
    timeLeft: 5.0,
    maxTime: 5.0,
    currentEnWord: "",
    currentCorrectTr: "",
    isWaitingForAnimation: false,

    startNewTurn() {
        this.isWaitingForAnimation = false;
        this.timeLeft = this.maxTime;
        
        const timerBar = document.getElementById('timer-bar');
        if(timerBar) {
            timerBar.style.width = "100%";
            timerBar.style.backgroundColor = "#ff0000";
        }
        
        for(let i=0; i<4; i++) {
            const b = document.getElementById(`btn-${i}`);
            if(b) {
                b.className = "option-btn";
                b.disabled = false;
            }
        }

        if (typeof MainData !== 'undefined' && MainData.wordPool && MainData.wordPool.length > 0) {
            this.currentEnWord = MainData.wordPool[Math.floor(Math.random() * MainData.wordPool.length)];
            this.currentCorrectTr = MainData.translationDict[this.currentEnWord.toLowerCase()] || "ÇEVİRİ YOK";
            
            const targetWordEl = document.getElementById('target-word');
            if(targetWordEl) targetWordEl.innerText = this.currentEnWord;
            
            let options = [this.currentCorrectTr];
            let keys = Object.keys(MainData.translationDict);
            
            // 🔥 ÇÖZÜM: SONSUN DÖNGÜYÜ ENGELLEYEN GÜVENLİ ŞIK SEÇİCİ 🔥
            // Diğer tüm çevirileri alıp benzersiz (unique) bir liste yapıyoruz
            let availableTranslations = keys.map(k => MainData.translationDict[k])
                                            .filter(tr => tr && tr !== this.currentCorrectTr);
            availableTranslations = [...new Set(availableTranslations)];
            
            // Listeyi rastgele karıştır
            availableTranslations.sort(() => Math.random() - 0.5);

            // Şıklar 4 olana kadar listeden çek, liste biterse "NONE" bas!
            while(options.length < 4) {
                if (availableTranslations.length > 0) {
                    options.push(availableTranslations.pop());
                } else {
                    options.push("NONE"); 
                }
            }
            
            options.sort(() => Math.random() - 0.5);
            
            for(let i=0; i<4; i++) {
                const btn = document.getElementById(`btn-${i}`);
                if(btn) {
                    btn.innerText = options[i];
                    // Eğer seçenek NONE ise tıklanmasını engellemek isteyebilirsin, ama oyunu bozmasın diye normal bırakıyoruz
                    btn.dataset.isCorrect = (options[i] === this.currentCorrectTr) ? "true" : "false";
                }
            }
        }
    },

    selectOption(index) {
        if(this.isWaitingForAnimation || !Game.isPlaying) return;
        
        const btn = document.getElementById(`btn-${index}`);
        
        // Eğer kullanıcı NONE'a tıkladıysa ve bu doğru cevap değilse işlemi yap
        if(btn.innerText === "NONE") {
            // İstersen burada NONE butonuna tıklanmasını tamamen yoksayabilirsin:
            // return; 
        }

        this.isWaitingForAnimation = true;
        const isCorrect = btn.dataset.isCorrect === "true";

        if(isCorrect) {
            btn.classList.add("correct");
            if(typeof DominoManager !== 'undefined') DominoManager.triggerFall();
            
        } else {
            btn.classList.add("wrong");
            for(let i=0; i<4; i++) {
                const b = document.getElementById(`btn-${i}`);
                if(b.dataset.isCorrect === "true") b.classList.add("correct");
                b.disabled = true;
            }
            
            const ansText = document.getElementById('correct-answer-text');
            if(ansText) ansText.innerText = `${this.currentEnWord.toUpperCase()} = ${this.currentCorrectTr.toUpperCase()}`;
            
            if(typeof DominoManager !== 'undefined') DominoManager.breakChain();
        }
    },

    onDominoFell() {
        this.startNewTurn();
    },

    updateTimer(dt) {
        if (this.isWaitingForAnimation || !Game.isPlaying) return;
        
        this.timeLeft -= dt;
        const pct = Math.max(0, (this.timeLeft / this.maxTime) * 100);
        const bar = document.getElementById('timer-bar');
        if(bar) bar.style.width = pct + "%";

        if (this.timeLeft <= 0) {
            this.isWaitingForAnimation = true;
            
            const ansText = document.getElementById('correct-answer-text');
            if(ansText) ansText.innerText = "SÜRE BİTTİ! " + `${this.currentEnWord.toUpperCase()} = ${this.currentCorrectTr.toUpperCase()}`;
            
            for(let i=0; i<4; i++) {
                const b = document.getElementById(`btn-${i}`);
                if(b.dataset.isCorrect === "true") b.classList.add("correct");
                b.disabled = true;
            }
            if(typeof DominoManager !== 'undefined') DominoManager.breakChain("ZAMAN DOLDU!");
        }
    }
};