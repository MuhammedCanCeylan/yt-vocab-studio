// js/session-engine.js
import { State } from './state.js';
import { SRSEngine, SRS_STATUS } from './srs-engine.js';
import { DistractorEngine } from './distractor-engine.js';

export class SessionEngine {
    constructor() {
        this.level = 'A1';
        this.filter = 'karisik';
        this.questionType = 'sikli'; // 'sikli' | 'yazmali' | 'karisik'
        this.allLevelWords = [];
        this.queue = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.hintsRemaining = 4;
        this.sessionHistory = [];
    }

    /**
     * Oturumu başlatır ve akıllı 10'luk blok oluşturur.
     */
    start(level, allWords, filter = 'karisik', questionType = 'sikli', overrideWords = null) {
        this.level = level;
        this.allLevelWords = allWords || [];
        this.filter = filter;
        this.questionType = questionType;
        this.currentIndex = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.hintsRemaining = 4;
        this.sessionHistory = [];

        if (overrideWords && overrideWords.length > 0) {
            this.queue = DistractorEngine.shuffle([...overrideWords]).slice(0, 15);
        } else {
            this.queue = this.buildSmartQueue();
        }

        return this.getCurrentCard();
    }

    /**
     * Pedagojik Dağılım: 3 Pekiştirme + 5 Yeni + 2 Öğrenilmiş / Aşina
     */
    buildSmartQueue() {
        if (this.filter !== 'karisik') {
            const filtered = this.allLevelWords.filter(w => {
                const rec = State.getWordRecord(this.level, w.en || w.lemma);
                return (rec.status || SRS_STATUS.YENI) === this.filter;
            });
            if (filtered.length > 0) {
                return DistractorEngine.shuffle(filtered).slice(0, 10);
            }
        }

        const reviewPool = [];
        const newPool = [];
        const masteredPool = [];

        this.allLevelWords.forEach(w => {
            const rec = State.getWordRecord(this.level, w.en || w.lemma);
            const status = rec.status || SRS_STATUS.YENI;
            if (status === SRS_STATUS.PEKISTIRME) reviewPool.push(w);
            else if (status === SRS_STATUS.YENI) newPool.push(w);
            else masteredPool.push(w);
        });

        const selectedReview = DistractorEngine.shuffle(reviewPool).slice(0, 3);
        const selectedNew = DistractorEngine.shuffle(newPool).slice(0, 5);
        const selectedMastered = DistractorEngine.shuffle(masteredPool).slice(0, 2);

        let combined = [...selectedReview, ...selectedNew, ...selectedMastered];

        // Eğer havuz yetersizse seviyenin geri kalanından tamamla
        if (combined.length < 10) {
            const remaining = this.allLevelWords.filter(w => !combined.includes(w));
            const extra = DistractorEngine.shuffle(remaining).slice(0, 10 - combined.length);
            combined = [...combined, ...extra];
        }

        return DistractorEngine.shuffle(combined);
    }

    getCurrentCard() {
        if (this.currentIndex >= this.queue.length) {
            return null; // Oturum tamamlandı
        }

        const targetWord = this.queue[this.currentIndex];
        const activeType = this.questionType === 'karisik' 
            ? (this.currentIndex % 2 === 0 ? 'sikli' : 'yazmali') 
            : this.questionType;

        const choices = activeType === 'sikli' 
            ? DistractorEngine.generateChoices(targetWord, this.allLevelWords, 3) 
            : [];

        return {
            index: this.currentIndex,
            total: this.queue.length,
            word: targetWord,
            type: activeType,
            choices,
            correctCount: this.correctCount,
            wrongCount: this.wrongCount,
            hintsRemaining: this.hintsRemaining,
            progressPct: Math.round(((this.currentIndex) / this.queue.length) * 100)
        };
    }

    /**
     * Cevabı kontrol eder ve Quizlet tarzı Micro-Looping uygular.
     */
    submitAnswer(userAnswer) {
        const card = this.getCurrentCard();
        if (!card) return null;

        const word = card.word;
        const correctTr = (word.tr || '').trim().toLowerCase();
        const userClean = (userAnswer || '').trim().toLowerCase();

        // Yazmalı modda anlam birden fazla karşılık içeriyorsa (örn: "Ön / Cephe") kontrol et
        const isCorrect = correctTr === userClean || correctTr.split(/[\/,]/).some(part => part.trim() === userClean);

        // SRS Motoruna işle
        SRSEngine.processAttempt(this.level, word.en || word.lemma, isCorrect);

        if (isCorrect) {
            this.correctCount++;
        } else {
            this.wrongCount++;
            // Micro-Looping: Yanlış yapılan kelimeyi hemen 3 soru sonraya tekrar kuyruğa sok
            const reinsertIndex = Math.min(this.currentIndex + 3, this.queue.length);
            this.queue.splice(reinsertIndex, 0, word);
        }

        this.sessionHistory.push({
            word,
            userAnswer,
            isCorrect
        });

        this.currentIndex++;
        return {
            isCorrect,
            correctAnswer: word.tr,
            nextCard: this.getCurrentCard()
        };
    }

    useHint() {
        if (this.hintsRemaining <= 0) return null;
        this.hintsRemaining--;
        const card = this.getCurrentCard();
        return DistractorEngine.getHint(card.word, 1);
    }
}