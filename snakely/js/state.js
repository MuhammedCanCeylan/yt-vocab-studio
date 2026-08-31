// js/state.js
const STORAGE_KEY = 'snakely_app_state';

const defaultState = {
    xp: 0,
    level: 1,
    streak: 0,
    lastStudyDate: null,
    tickets: 3,
    theme: 'light',
    sound: true,
    reminder: true,
    // Format: { "A1:difference": { correct: 2, wrong: 1, attempts: 3, status: 'pekistirme', stage: 1, lastStudied: 1725110000, nextDue: 1725196400 } }
    wordStats: {},
    examStats: {
        seen: 0,
        correct: 0,
        wrong: 0,
        history: [] // { date: string, score: number, total: number, duration: string, details: array }
    }
};

class StateManager {
    constructor() {
        this.state = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return this.mergeDeep(defaultState, parsed);
            }
        } catch (e) {
            console.error('[Snakely State] Yükleme hatası:', e);
        }
        return JSON.parse(JSON.stringify(defaultState));
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error('[Snakely State] Kaydetme hatası:', e);
        }
    }

    mergeDeep(target, source) {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) Object.assign(output, { [key]: source[key] });
                    else output[key] = this.mergeDeep(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    // --- XP & KADEME & SERİ ---
    addXP(amount) {
        this.state.xp += amount;
        this.state.level = Math.floor(this.state.xp / 150) + 1;
        this.updateStreak();
        this.save();
        return { xp: this.state.xp, level: this.state.level };
    }

    updateStreak() {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        if (this.state.lastStudyDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

            if (this.state.lastStudyDate === yesterdayStr) {
                this.state.streak += 1;
            } else if (!this.state.lastStudyDate) {
                this.state.streak = 1;
            } else {
                this.state.streak = 1; // Seri kırıldı, baştan başla
            }
            this.state.lastStudyDate = today;
            this.save();
        }
    }

    // --- KELİME KAYITLARI & STATS ---
    getWordKey(level, wordEn) {
        return `${level.toUpperCase()}:${wordEn.trim().toLowerCase()}`;
    }

    getWordRecord(level, wordEn) {
        const key = this.getWordKey(level, wordEn);
        return this.state.wordStats[key] || {
            correct: 0,
            wrong: 0,
            attempts: 0,
            status: 'yeni',
            stage: 0,
            lastStudied: null,
            nextDue: null
        };
    }

    saveWordRecord(level, wordEn, record) {
        const key = this.getWordKey(level, wordEn);
        this.state.wordStats[key] = Object.assign({}, this.getWordRecord(level, wordEn), record);
        this.save();
    }

    // --- SINAV BİLETLERİ & GEÇMİŞ ---
    useTicket() {
        if (this.state.tickets > 0) {
            this.state.tickets--;
            this.save();
            return true;
        }
        return false;
    }

    addTickets(amount = 1) {
        this.state.tickets += amount;
        this.save();
    }

    recordExamResult(score, total, durationStr, details) {
        this.state.examStats.seen += total;
        this.state.examStats.correct += score;
        this.state.examStats.wrong += (total - score);

        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        this.state.examStats.history.unshift({
            date: dateStr,
            score,
            total,
            duration: durationStr,
            details
        });

        if (this.state.examStats.history.length > 20) {
            this.state.examStats.history.pop();
        }

        this.save();
    }

    // --- AYARLAR ---
    setTheme(theme) {
        this.state.theme = theme;
        this.save();
    }

    toggleSound() {
        this.state.sound = !this.state.sound;
        this.save();
        return this.state.sound;
    }
}

export const State = new StateManager();