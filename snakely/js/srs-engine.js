// js/srs-engine.js
import { State } from './state.js';

export const SRS_STATUS = {
    YENI: 'yeni',             // 0 Karşılaşma
    ASINA: 'asina',           // 1-2 Başarılı Karşılaşma
    PEKISTIRME: 'pekistirme', // Hata yapılmış veya tekrar vadesi gelmiş
    OGRENILMIS: 'ogrenilmis', // 3+ Üst üste doğru ve oturmuş
    USTA: 'usta'              // 5+ Doğru ve uzun vade
};

// Leitner / HLR Aralıklı Tekrar Vade Aralıkları (Gün cinsinden)
const STAGE_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 90];

export class SRSEngine {
    /**
     * Bir kelimenin cevap sonrası yeni durumunu, aşamasını ve tekrar vadesini hesaplar.
     */
    static processAttempt(level, wordEn, isCorrect) {
        const record = State.getWordRecord(level, wordEn);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        record.attempts += 1;
        record.lastStudied = now;

        if (isCorrect) {
            record.correct += 1;
            record.stage = Math.min(record.stage + 1, STAGE_INTERVALS_DAYS.length - 1);
            
            // Durum ataması
            if (record.stage >= 5) {
                record.status = SRS_STATUS.USTA;
            } else if (record.stage >= 3) {
                record.status = SRS_STATUS.OGRENILMIS;
            } else {
                record.status = SRS_STATUS.ASINA;
            }

            const intervalDays = STAGE_INTERVALS_DAYS[record.stage];
            record.nextDue = now + (intervalDays * oneDayMs);
        } else {
            record.wrong = (record.wrong || 0) + 1;
            // Hata yapıldığında kelime doğrudan pekiştirme kutusuna düşer
            record.stage = Math.max(1, record.stage - 1);
            record.status = SRS_STATUS.PEKISTIRME;
            // Hemen tekrar etmesi için vadeyi yarına veya 12 saat sonraya ayarla
            record.nextDue = now + (12 * 60 * 60 * 1000);
        }

        State.saveWordRecord(level, wordEn, record);
        return record;
    }

    /**
     * Seviyedeki tüm kelimelerin durum dağılımını ve genel başarı yüzdesini hesaplar.
     */
    static calculateLevelMetrics(level, rawWordsList) {
        const total = rawWordsList.length;
        let counts = {
            [SRS_STATUS.YENI]: 0,
            [SRS_STATUS.ASINA]: 0,
            [SRS_STATUS.PEKISTIRME]: 0,
            [SRS_STATUS.OGRENILMIS]: 0,
            [SRS_STATUS.USTA]: 0
        };

        rawWordsList.forEach(w => {
            const record = State.getWordRecord(level, w.en || w.lemma);
            const status = record.status || SRS_STATUS.YENI;
            if (counts[status] !== undefined) {
                counts[status]++;
            } else {
                counts[SRS_STATUS.YENI]++;
            }
        });

        // İlerleme yüzdesi: Öğrenilmiş (%70 ağırlık) + Usta (%100 ağırlık) + Aşina (%30 ağırlık)
        const weightedMastery = (counts[SRS_STATUS.USTA] * 1.0) + 
                                (counts[SRS_STATUS.OGRENILMIS] * 0.7) + 
                                (counts[SRS_STATUS.ASINA] * 0.3);
        const percentage = total > 0 ? Math.min(100, Math.round((weightedMastery / total) * 100)) : 0;

        return {
            total,
            percentage,
            counts,
            masteredCount: counts[SRS_STATUS.OGRENILMIS] + counts[SRS_STATUS.USTA],
            reviewCount: counts[SRS_STATUS.PEKISTIRME],
            newCount: counts[SRS_STATUS.YENI]
        };
    }

    /**
     * Vadesi gelen (Due date geçmiş veya hemen çalışılması gereken) kelimeleri ayıklar.
     */
    static getDueWords(level, rawWordsList) {
        const now = Date.now();
        return rawWordsList.filter(w => {
            const record = State.getWordRecord(level, w.en || w.lemma);
            if (record.status === SRS_STATUS.PEKISTIRME) return true;
            if (record.nextDue && record.nextDue <= now) return true;
            return false;
        });
    }

    /**
     * Kullanıcının doğruluk oranı %75'in altında olan en çok zorlandığı kelimeleri listeler.
     */
    static getStruggledWords(allLevelsWordsMap, limit = 10) {
        const result = [];

        Object.keys(State.state.wordStats).forEach(key => {
            const [level, wordEn] = key.split(':');
            const record = State.state.wordStats[key];

            if (record.attempts >= 2) {
                const accuracy = record.correct / record.attempts;
                if (accuracy < 0.75) {
                    const wordObj = allLevelsWordsMap[level]?.find(
                        w => (w.en || w.lemma).toLowerCase() === wordEn.toLowerCase()
                    );
                    result.push({
                        level,
                        en: wordEn,
                        tr: wordObj?.tr || '',
                        pos: wordObj?.pos || 'NOUN',
                        correct: record.correct,
                        attempts: record.attempts,
                        accuracy: Math.round(accuracy * 100)
                    });
                }
            }
        });

        // En düşük doğruluk oranına göre sırala
        return result.sort((a, b) => a.accuracy - b.accuracy).slice(0, limit);
    }
}