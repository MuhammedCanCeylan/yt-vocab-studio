// js/views/exam-view.js
import { State } from '../state.js';

export class ExamView {
    constructor(app) {
        this.app = app;
        this.lobbyContainer = document.getElementById('view-exam-lobby');
        this.sessionContainer = document.getElementById('view-exam-session');
        this.resultContainer = document.getElementById('view-exam-result');

        this.timer = null;
        this.secondsLeft = 600;
        this.currentIndex = 0;
        this.questions = [];
        this.answers = [];
        this.selectedOption = null;
    }

    renderLobby() {
        if (!this.lobbyContainer) return;
        const stats = State.state.examStats;

        this.lobbyContainer.innerHTML = `
            <div class="btn-back-row">
                <button class="btn-back" id="btn-exam-back-home">← Geri</button>
                <h3 class="page-title-center">Sınav</h3>
            </div>

            <div class="exam-ticket-card">
                <div>
                    <div style="font-size:12px; opacity:0.85; font-weight:700;">Sınav hakkın</div>
                    <h2 style="font-size:36px; font-weight:900;">${State.state.tickets}</h2>
                </div>
                <i class="ti ti-ticket" style="font-size:48px; opacity:0.8;"></i>
            </div>

            <div class="exam-stats-grid">
                <div class="exam-stat-box"><span style="font-size:11px; color:var(--text-muted); font-weight:700;">Toplam Soru</span><div style="font-weight:800; font-size:16px;">${stats.seen}</div></div>
                <div class="exam-stat-box"><span style="font-size:11px; color:var(--text-muted); font-weight:700;">Doğru</span><div style="font-weight:800; font-size:16px; color:var(--green);">${stats.correct}</div></div>
                <div class="exam-stat-box"><span style="font-size:11px; color:var(--text-muted); font-weight:700;">Yanlış</span><div style="font-weight:800; font-size:16px; color:var(--red);">${stats.wrong}</div></div>
                <div class="exam-stat-box"><span style="font-size:11px; color:var(--text-muted); font-weight:700;">Başarı</span><div style="font-weight:800; font-size:16px;">${stats.seen > 0 ? Math.round((stats.correct/stats.seen)*100) : 0}%</div></div>
            </div>

            <button class="btn-check-main" id="btn-start-exam-quiz" style="background:#22C55E; color:#FFF; margin-bottom:10px;">
                ▶ Sınava Başla (10 Soru)
            </button>

            <div style="font-weight:800; font-size:14px; margin:16px 0 10px;"><i class="ti ti-history"></i> Son Sınavlar</div>
            <div>
                ${stats.history.length === 0 ? `<div style="font-size:13px; color:var(--text-muted);">Henüz sınav tamamlanmadı.</div>` : stats.history.slice(0, 5).map(h => `
                    <div style="background:var(--surface); border-radius:16px; padding:14px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow-card); margin-bottom:8px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div class="prog-circle" style="background:#DCFCE7; color:#16A34A; border:none;">${h.score}/${h.total}</div>
                            <div>
                                <div style="font-weight:800; font-size:14px;">${h.date}</div>
                                <div style="font-size:11px; color:var(--text-muted);">⏱ ${h.duration}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('btn-exam-back-home').onclick = () => this.app.openView('home');
        document.getElementById('btn-start-exam-quiz').onclick = () => this.startQuiz();
    }

    startQuiz() {
        if (!State.useTicket()) {
            return alert('Sınav biletiniz kalmadı!');
        }

        this.secondsLeft = 600;
        this.currentIndex = 0;
        this.answers = [];
        this.selectedOption = null;

        // Örnek cümle bankası
        this.questions = [
            { s: "Did you _____ up from sleeping when the phone rang?", opts: ["answer", "wake", "speak", "listen"], corr: "wake", tr: "Telefon çaldığında uykudan uyandın mı?" },
            { s: "The old _____ sat on the park bench.", opts: ["man", "tree", "river", "cloud"], corr: "man", tr: "Yaşlı adam parktaki bankta oturdu." },
            { s: "There are many cafes with tables in the main _____.", opts: ["square", "shop", "office", "forest"], corr: "square", tr: "Ana meydanda masaları olan birçok kafe var." },
            { s: "Please _____ talking and listen to me.", opts: ["drink", "sleep", "stop", "eat"], corr: "stop", tr: "Lütfen konuşmayı bırak ve beni dinle." }
        ];

        this.app.openView('exam-session');
        this.showQuestion();

        clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.secondsLeft--;
            const m = Math.floor(this.secondsLeft / 60);
            const s = this.secondsLeft % 60;
            const timerEl = document.getElementById('exam-timer');
            if (timerEl) timerEl.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            if (this.secondsLeft <= 0) {
                clearInterval(this.timer);
                this.finish();
            }
        }, 1000);
    }

    showQuestion() {
        if (this.currentIndex >= this.questions.length) {
            clearInterval(this.timer);
            this.finish();
            return;
        }

        const q = this.questions[this.currentIndex];
        this.sessionContainer.innerHTML = `
            <div class="exam-session-body">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="timer-circle" id="exam-timer">10:00</div>
                    <div style="font-weight:800; font-size:16px;">Soru ${this.currentIndex + 1}/${this.questions.length}</div>
                </div>

                <div class="exam-q-box">
                    <span style="background:rgba(245,158,11,0.2); color:#FBBF24; padding:3px 8px; border-radius:8px; font-size:11px; font-weight:800;">Boşluğu doldur</span>
                    <div style="font-size:20px; font-weight:800; margin-top:10px; line-height:1.4;">${q.s}</div>
                </div>

                <div id="exam-choices-list">
                    ${q.opts.map(opt => `
                        <div class="exam-choice-btn" data-opt="${opt}">
                            <span style="opacity:0.6;">○</span> ${opt}
                        </div>
                    `).join('')}
                </div>

                <button class="btn-check-main" id="btn-next-exam-step" style="background:#F59E0B; color:#FFF; margin-top:auto;">Sonraki →</button>
            </div>
        `;

        this.sessionContainer.querySelectorAll('.exam-choice-btn').forEach(btn => {
            btn.onclick = () => {
                this.sessionContainer.querySelectorAll('.exam-choice-btn').forEach(b => {
                    b.classList.remove('selected');
                    b.querySelector('span').innerText = '○';
                });
                btn.classList.add('selected');
                btn.querySelector('span').innerText = '●';
                this.selectedOption = btn.dataset.opt;
            };
        });

        document.getElementById('btn-next-exam-step').onclick = () => {
            if (!this.selectedOption) return alert('Lütfen bir seçenek işaretleyin!');
            const ok = this.selectedOption === q.corr;
            this.answers.push({ q, user: this.selectedOption, ok });
            this.selectedOption = null;
            this.currentIndex++;
            this.showQuestion();
        };
    }

    finish() {
        const correct = this.answers.filter(a => a.ok).length;
        const durationSec = 600 - this.secondsLeft;
        const durM = Math.floor(durationSec / 60);
        const durS = durationSec % 60;
        const durStr = `${String(durM).padStart(2,'0')}:${String(durS).padStart(2,'0')}`;

        State.recordExamResult(correct, this.questions.length, durStr, this.answers);
        this.app.openView('exam-result');

        this.resultContainer.innerHTML = `
            <h3 style="font-family:'Space Grotesk'; font-size:22px; font-weight:800; color:var(--purple); text-align:center; margin-bottom:16px;">Sınav Sonucu</h3>
            <div style="background:linear-gradient(135deg, #22C55E, #16A34A); border-radius:24px; padding:24px; color:#FFF; text-align:center; margin-bottom:16px;">
                <h1 style="font-size:42px; font-weight:900;">${correct} / ${this.questions.length}</h1>
                <p style="font-weight:800; font-size:15px;">Harika bir sonuç!</p>
                <div style="font-size:12px; opacity:0.85; margin-top:4px;">⏱ Süre: ${durStr}</div>
            </div>
            <div>
                ${this.answers.map(ans => `
                    <div style="background:var(--surface); border-radius:16px; padding:16px; margin-bottom:10px; box-shadow:var(--shadow-card);">
                        <div style="font-weight:800; font-size:15px; margin-bottom:4px;">${ans.ok ? '✓' : '✕'} ${ans.q.s.replace('_____', ans.q.corr.toUpperCase())}</div>
                        <div style="font-size:13px; color:var(--text-muted);">${ans.q.tr}</div>
                        <div style="font-size:12px; font-weight:800; margin-top:6px; color:${ans.ok ? 'var(--green)' : 'var(--red)'};">
                            ${ans.ok ? `Doğru: ${ans.q.corr}` : `Senin cevabın: ${ans.user} • Doğru: ${ans.q.corr}`}
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn-check-main" id="btn-exam-finish-ok" style="background:var(--purple); color:#FFF; margin-top:14px;">Tamam</button>
        `;

        document.getElementById('btn-exam-finish-ok').onclick = () => {
            this.app.openView('exam-lobby');
            this.renderLobby();
        };
    }
}