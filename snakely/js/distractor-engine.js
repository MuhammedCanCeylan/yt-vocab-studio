// js/distractor-engine.js

export class DistractorEngine {
    /**
     * Fisher-Yates algoritması ile diziyi rastgele karıştırır ($O(N)$).
     */
    static shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Kelime türüne (POS: NOUN, VERB, ADJ, ADV) göre pedagojik olarak mantıklı
     * ve doğru cevabı ele vermeyen 4 şık (1 doğru + 3 çeldirici) üretir[cite: 6].
     * 
     * @param {Object} targetWord - { en: "difference", tr: "Fark", pos: "NOUN" }
     * @param {Array} wordPool - İlgili seviyedeki tüm kelime havuzu
     * @param {number} count - Üretilecek yanlış seçenek sayısı (Varsayılan 3)
     */
    static generateChoices(targetWord, wordPool, count = 3) {
        if (!targetWord || !targetWord.tr) {
            return [];
        }

        const correctTr = targetWord.tr.trim();
        const targetPos = (targetWord.pos || 'NOUN').toUpperCase();

        // Doğru cevap dışındaki tüm adaylar
        const candidates = wordPool.filter(w => {
            const tr = (w.tr || '').trim();
            const en = (w.en || w.lemma || '').trim();
            return tr && tr.toLowerCase() !== correctTr.toLowerCase() && en.toLowerCase() !== (targetWord.en || targetWord.lemma).toLowerCase();
        });

        // 1. ÖNCELİK: Aynı Kelime Türüne (POS) sahip kelimeler (İsme İsim, Fiile Fiil)
        const samePosPool = candidates.filter(w => (w.pos || 'NOUN').toUpperCase() === targetPos);
        const diffPosPool = candidates.filter(w => (w.pos || 'NOUN').toUpperCase() !== targetPos);

        let distractors = [];

        if (samePosPool.length >= count) {
            distractors = this.shuffle(samePosPool)
                .slice(0, count)
                .map(w => w.tr.trim());
        } else {
            // Aynı türden yeterli kelime yoksa havuzun geri kalanından tamamla
            const fromSame = this.shuffle(samePosPool).map(w => w.tr.trim());
            const needed = count - fromSame.length;
            const fromDiff = this.shuffle(diffPosPool)
                .slice(0, needed)
                .map(w => w.tr.trim());
            distractors = [...fromSame, ...fromDiff];
        }

        // Acil durum yedeği (Havuz çok küçükse)
        const genericFallbacks = ['Zaman', 'Yer', 'Durum', 'Neden', 'Sonuç', 'Farklı'];
        while (distractors.length < count) {
            const fallback = genericFallbacks.find(f => f !== correctTr && !distractors.includes(f));
            if (fallback) distractors.push(fallback);
            else break;
        }

        // Doğru cevapla birleştir ve karıştır
        const allChoices = [correctTr, ...distractors];
        return this.shuffle(allChoices);
    }

    /**
     * Yazma modu için ilk harf veya ipucu şablonu oluşturur.
     */
    static getHint(targetWord, hintLevel = 1) {
        const tr = targetWord.tr || '';
        if (!tr) return '';

        if (hintLevel === 1) {
            return `İlk harf: "${tr.charAt(0).toUpperCase()}..."`;
        } else if (hintLevel === 2) {
            const masked = tr.split('').map((ch, i) => (i === 0 || i === tr.length - 1 || ch === ' ' ? ch : '_')).join(' ');
            return `Kelime kalıbı: ${masked}`;
        }
        return `Anlam uzunluğu: ${tr.length} harf`;
    }
}