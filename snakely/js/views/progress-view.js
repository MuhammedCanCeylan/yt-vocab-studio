// js/views/progress-view.js
import { State } from '../state.js';
import { SRSEngine } from '../srs-engine.js';

export class ProgressView {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('view-progress');
    }

    render() {
        if (!this.container) return;
        const kademe = Math.floor(State.state.xp / 150) + 1;
        const struggled = SRSEngine.getStruggledWords(this.app.allWordsMap, 6);

        this.container.innerHTML = `
            <div class="xp-banner">
                <div style="width:58px; height:58px; border-radius:50%; background:#FFF; color:#6366F1; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:900;">${kademe}</div>
                <div>
                    <h3 style="font-size:20px; font-weight:800;">${kademe}. Kademe</h3>
                    <div style="font-size:13px; opacity:0.9;">✨ Toplam XP: ${State.state.xp}</div>
                    <div style="font-size:11px; opacity:0.75; margin-top:3px;">Sonraki kademeye ${150 - (State.state.xp % 150)} XP kaldı</div>
                </div>
            </div>

            <div style="font-weight:800; font-size:16px; margin-bottom:10px;">🎯 Günün Görevleri</div>
            <div class="task-card">
                <div>
                    <div style="font-weight:800; font-size:15px;">Öğrenim modu</div>
                    <div style="font-size:12px; color:var(--text-muted);">10 soru tamamla</div>
                </div>
                <span style="background:#EEF2FF; color:#6366F1; font-weight:800; font-size:12px; padding:4px 10px; border-radius:12px;">+100 XP</span>
            </div>

            <div style="font-weight:800; font-size:16px; margin:18px 0 10px;">🧠 En Zorlandığın Kelimeler</div>
            <div id="struggled-list">
                ${struggled.length === 0 ? `
                    <div class="task-card">
                        <div>
                            <div style="font-weight:800; font-size:14px;">Henüz zorlandığın kelime yok.</div>
                            <div style="font-size:12px; color:var(--text-muted);">Hata yaptığın kelimeler burada toplanır.</div>
                        </div>
                        <i class="ti ti-mood-smile" style="font-size:24px; color:var(--green);"></i>
                    </div>
                ` : struggled.map(item => `
                    <div class="task-card">
                        <div>
                            <div style="font-weight:800; font-size:15px;">${item.en} <span style="font-size:11px; opacity:0.7;">(${item.level})</span></div>
                            <div style="font-size:12px; color:var(--red); font-weight:700;">%${item.accuracy} Başarı (${item.correct}/${item.attempts})</div>
                        </div>
                        <button class="top-pill btn-repeat-struggled" data-lvl="${item.level}" data-en="${item.en}">Çalış</button>
                    </div>
                `).join('')}
            </div>
        `;

        this.container.querySelectorAll('.btn-repeat-struggled').forEach(btn => {
            btn.onclick = () => {
                const lvl = btn.dataset.lvl;
                const en = btn.dataset.en;
                const wordObj = this.app.allWordsMap[lvl]?.find(w => (w.en || w.lemma) === en);
                if (wordObj) this.app.startStudySession(lvl, [wordObj]);
            };
        });
    }
}