// snakely/js/views/study-view.js
import { SoundFX } from '../sound-fx.js';

export class StudyView {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('view-study');
    }

    render(card) {
        if (!this.container) return;

        // Oturum bittiyse tebrik ekranına geç
        if (!card) {
            this.app.finishStudySession();
            return;
        }

        const word = card.word;
        const isChoice = card.type === 'sikli';

        this.container.innerHTML = `
            <div class="session-card">
                <div class="session-top">
                    <div>
                        <div style="font-size:11px; opacity:0.8; font-weight:700;">Study Session</div>
                        <h3 style="font-size:20px; font-weight:800;">${this.app.session.level} • ${isChoice ? 'Şıklı' : 'Yazmalı'}</h3>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <div class="score-pill"><i class="ti ti-check" style="color:var(--green);"></i> <span>${card.correctCount}</span></div>
                        <div class="score-pill"><i class="ti ti-x" style="color:var(--red);"></i> <span>${card.wrongCount}</span></div>
                    </div>
                </div>

                <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width: ${card.progressPct}%;"></div>
                </div>

                <div class="selector-grid">
                    <div class="selector-btn" id="btn-change-qtype">
                        <div>Soru tipi</div>
                        <div>${this.app.session.questionType === 'yazmali' ? 'Yazmalı' : (this.app.session.questionType === 'sikli' ? 'Şıklı' : 'Karışık')}</div>
                    </div>
                    <div class="selector-btn" id="btn-change-qfilter">
                        <div>Kelime</div>
                        <div>${this.app.session.filter === 'karisik' ? 'Karışık' : this.app.session.filter}</div>
                    </div>
                </div>

                <div class="word-box-main">
                    <span class="word-lvl-tag">${this.app.session.level}</span>
                    <span class="word-pos-tag">${(word.pos || 'NOUN').toUpperCase()}</span>
                    <div class="main-word-text">${word.en || word.lemma}</div>
                    <i class="ti ti-volume" id="btn-tts" style="font-size:26px; cursor:pointer;" title="Dinle"></i>
                </div>

                <button class="btn-hint" id="btn-study-hint">💡 İpucu (${card.hintsRemaining})</button>

                ${isChoice ? `
                    <div id="choices-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        ${card.choices.map(ch => `
                            <button class="choice-btn" data-choice="${ch}">${ch}</button>
                        `).join('')}
                    </div>
                ` : `
                    <div id="writing-box">
                        <input type="text" id="input-writing" class="study-input" placeholder="Türkçe anlamını yaz..." autocomplete="off" />
                        <button class="btn-check-main" id="btn-submit-writing"><i class="ti ti-check"></i> Kontrol</button>
                    </div>
                `}
            </div>
        `;

        this.bindEvents(word);
    }

    bindEvents(word) {
        // Telaffuz
        const ttsBtn = document.getElementById('btn-tts');
        if (ttsBtn) {
            ttsBtn.onclick = () => this.app.speak(word.en || word.lemma);
        }

        // İpucu butonu
        const hintBtn = document.getElementById('btn-study-hint');
        if (hintBtn) {
            hintBtn.onclick = () => {
                const hintText = this.app.session.useHint();
                if (hintText) alert(hintText);
                else alert('Bu oturum için ipucu hakkınız bitti!');
                this.render(this.app.session.getCurrentCard());
            };
        }

        // Şıklı seçenek tıklamaları
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.onclick = () => {
                // Çift tıklamayı engellemek için tüm butonları dondur
                document.querySelectorAll('.choice-btn').forEach(b => b.style.pointerEvents = 'none');

                const choice = btn.dataset.choice;
                const result = this.app.session.submitAnswer(choice);

                if (result.isCorrect) {
                    btn.classList.add('correct');
                    SoundFX.playCorrect();
                } else {
                    btn.classList.add('wrong');
                    SoundFX.playWrong();
                    // Doğru şıkkı yeşil olarak göster
                    document.querySelectorAll('.choice-btn').forEach(b => {
                        if (b.dataset.choice.trim().toLowerCase() === result.correctAnswer.trim().toLowerCase()) {
                            b.classList.add('correct');
                        }
                    });
                }

                setTimeout(() => this.render(result.nextCard), 650);
            };
        });

        // Yazmalı mod kontrolleri
        const submitWritingBtn = document.getElementById('btn-submit-writing');
        const inputWriting = document.getElementById('input-writing');
        if (submitWritingBtn && inputWriting) {
            const handleWrite = () => {
                const val = inputWriting.value;
                if (!val.trim()) return;

                const result = this.app.session.submitAnswer(val);
                if (result.isCorrect) {
                    SoundFX.playCorrect();
                    alert('✓ Doğru bildin!');
                } else {
                    SoundFX.playWrong();
                    alert(`✕ Yanlış! Doğru cevap: ${result.correctAnswer}`);
                }
                this.render(result.nextCard);
            };

            submitWritingBtn.onclick = handleWrite;
            inputWriting.onkeydown = (e) => {
                if (e.key === 'Enter') handleWrite();
            };
            inputWriting.focus();
        }

        // Çekmeceleri açma
        const qtypeBtn = document.getElementById('btn-change-qtype');
        if (qtypeBtn) qtypeBtn.onclick = () => this.app.openSheet('type-sheet');

        const qfilterBtn = document.getElementById('btn-change-qfilter');
        if (qfilterBtn) qfilterBtn.onclick = () => this.app.openSheet('filter-sheet');
    }
}