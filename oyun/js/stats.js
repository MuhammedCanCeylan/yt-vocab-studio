// stats.js – İstatistik ve başarımlar
const StatsManager = {
    data: safeParseJSON('vocab_runner_stats', {
        totalGames: 0, totalWords: 0, totalCoins: 0, bestCombo: 0,
        endlessHighScore: 0, levelCompletions: 0, perfectLevels: 0, totalMistakes: 0
    }),
    save() { safeSetItem('vocab_runner_stats', JSON.stringify(this.data)); },

    recordGame(mode, score, wordsAnswered, coins, combo, isWin, mistakes) {
        this.data.totalGames++;
        this.data.totalWords += (wordsAnswered || 0);
        this.data.totalCoins += (coins || 0);
        this.data.totalMistakes += (mistakes || 0);
        if (combo > this.data.bestCombo) this.data.bestCombo = combo;
        if (mode === 'endless' && score > this.data.endlessHighScore) this.data.endlessHighScore = score;
        if (isWin) {
            this.data.levelCompletions++;
            if (mistakes === 0) this.data.perfectLevels++;
        }
        this.save();
        this.updateMenuStats();
    },
    updateMenuStats() { safeSetText('menu-highscore', this.data.endlessHighScore); },
    open() {
        safeSetDisplay('start-screen', 'none');
        safeSetDisplay('stats-screen', 'flex');
        const s = this.data;
        const content = document.getElementById('stats-content');
        if(content) {
            content.innerHTML = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; text-align:center;">
                <div><div style="font-size:24px; color:#F5B700;">${s.totalGames}</div><div style="font-size:11px; color:#8A8578;">Oyun</div></div>
                <div><div style="font-size:24px; color:#4EBE59;">${s.totalWords}</div><div style="font-size:11px; color:#8A8578;">Çözülen Kelime</div></div>
                <div><div style="font-size:24px; color:#F5B700;">${s.totalCoins}</div><div style="font-size:11px; color:#8A8578;">Kazanılan Altın</div></div>
                <div><div style="font-size:24px; color:#ff6b35;">${s.bestCombo}</div><div style="font-size:11px; color:#8A8578;">En İyi Kombo</div></div>
                <div><div style="font-size:24px; color:#3498db;">${s.endlessHighScore}</div><div style="font-size:11px; color:#8A8578;">Sonsuz Rekor</div></div>
                <div><div style="font-size:24px; color:#9b59b6;">${s.perfectLevels}</div><div style="font-size:11px; color:#8A8578;">Kusursuz Bölüm</div></div>
            </div>`;
        }
    },
    close() { safeSetDisplay('stats-screen', 'none'); safeSetDisplay('start-screen', 'flex'); }
};

const AchievementManager = {
    unlocked: safeParseJSON('vocab_runner_achievements', []),
    unlock(id, name) {
        if (this.unlocked.includes(id)) return;
        this.unlocked.push(id);
        safeSetItem('vocab_runner_achievements', JSON.stringify(this.unlocked));
        safeSetText('popup-text', name);
        const popup = document.getElementById('achievement-popup');
        if(popup) {
            popup.classList.add('show');
            AudioManager.play('correct');
            setTimeout(() => popup.classList.remove('show'), 3000);
        }
    }
};