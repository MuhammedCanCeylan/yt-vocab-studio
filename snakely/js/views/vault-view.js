// snakely/js/views/vault-view.js
import { State } from '../state.js';
import { SRS_STATUS, SRSEngine } from '../srs-engine.js';
import { SoundFX } from '../sound-fx.js';

export class VaultView {
    constructor(app) {
        this.app = app;
        this.overviewContainer = document.getElementById('view-vault-overview');
        this.detailContainer = document.getElementById('view-vault-detail');
        this.swipeContainer = document.getElementById('view-vault-swipe');

        this.currentLvl = 'A1';
        this.filter = 'all';

        // Swipe Ayırma Durumu
        this.swipeQueue = [];
        this.swipeLearned = [];
        this.swipeUnlearned = [];
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
    }

    /* ================= 1. SANDIK GENEL BAKIŞ ================= */
    renderOverview() {
        if (!this.overviewContainer) return;
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

        this.overviewContainer.innerHTML = `
            <div class="btn-back-row">
                <button class="btn-back" id="btn-vault-back-home">← Geri</button>
                <h3 class="page-title-center">Sandık</h3>
            </div>
            <div>
                ${levels.map(lvl => {
                    const words = this.app.allWordsMap[lvl] || [];
                    let known = 0, learned = 0, review = 0;
                    words.forEach(w => {
                        const rec = State.getWordRecord(lvl, w.en || w.lemma);
                        if (rec.status === SRS_STATUS.ASINA || rec.status === 'bilinen') known++;
                        if (rec.status === SRS_STATUS.OGRENILMIS || rec.status === SRS_STATUS.USTA) learned++;
                        if (rec.status === SRS_STATUS.PEKISTIRME) review++;
                    });

                    return `
                        <div class="vault-card" data-level="${lvl}">
                            <div class="vault-avatar">${lvl}</div>
                            <div>
                                <h4 style="font-size:16px; font-weight:800; font-family:'Space Grotesk';">${lvl} Kelimeleri</h4>
                                <p style="font-size:12px; color:var(--text-muted); font-weight:700;">
                                    Bilinen: ${known} • Öğrenilmiş: ${learned} • Pekiştirme: ${review}
                                </p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        document.getElementById('btn-vault-back-home').onclick = () => this.app.openView('home');
        this.overviewContainer.querySelectorAll('.vault-card[data-level]').forEach(c => {
            c.onclick = () => this.openDetail(c.dataset.level);
        });
    }

    /* ================= 2. SANDIK DETAY & FİLTRELER ================= */
    openDetail(lvl) {
        this.currentLvl = lvl;
        this.filter = 'all';
        this.app.openView('vault-detail');
        this.renderDetail();
    }

    renderDetail() {
        if (!this.detailContainer) return;
        const words = this.app.allWordsMap[this.currentLvl] || [];
        const query = (document.getElementById('search-word-input')?.value || '').toLowerCase().trim();

        const filtered = words.filter(w => {
            const rec = State.getWordRecord(this.currentLvl, w.en || w.lemma);
            const status = rec.status || SRS_STATUS.YENI;

            // "Karşılaşılanlar" filtresi: attempts > 0 veya durumu yeni olmayanlar
            let matchFilter = false;
            if (this.filter === 'all') matchFilter = true;
            else if (this.filter === 'karsilasilan') matchFilter = (rec.attempts > 0 || status !== SRS_STATUS.YENI);
            else matchFilter = (status === this.filter);

            const matchQuery = !query || (w.en || w.lemma).toLowerCase().includes(query) || (w.tr || '').toLowerCase().includes(query);
            return matchFilter && matchQuery;
        });

        this.detailContainer.innerHTML = `
            <div class="btn-back-row">
                <button class="btn-back" id="btn-vault-back-overview">← Geri</button>
                <h3 class="page-title-center">${this.currentLvl} Kelimeleri</h3>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:12px;">
                <button class="btn-check-main" id="btn-start-swipe" style="background:#BAE6FD; color:#171712; padding:12px; font-size:13px;">
                    <i class="ti ti-arrows-split-2"></i> Hızlıca Ayır (Swipe)
                </button>
                <button class="btn-check-main" id="btn-practice-vault" style="background:var(--purple); color:#FFF; padding:12px; font-size:13px;">
                    <i class="ti ti-player-play"></i> Sadece Bunları Çalış (${filtered.length})
                </button>
            </div>

            <!-- FİLTRE ÇİPLERİ (YENİ KARŞILAŞILANLAR EKLENDİ) -->
            <div class="filter-chip-bar">
                <div class="filter-chip ${this.filter === 'all' ? 'active' : ''}" data-vf="all">Hepsi</div>
                <div class="filter-chip ${this.filter === 'karsilasilan' ? 'active' : ''}" data-vf="karsilasilan" style="border-color:var(--purple); color:var(--purple); font-weight:800;">🔥 Karşılaşılanlar</div>
                <div class="filter-chip ${this.filter === SRS_STATUS.PEKISTIRME ? 'active' : ''}" data-vf="${SRS_STATUS.PEKISTIRME}">Pekiştirme</div>
                <div class="filter-chip ${this.filter === SRS_STATUS.OGRENILMIS ? 'active' : ''}" data-vf="${SRS_STATUS.OGRENILMIS}">Öğrenilmiş</div>
                <div class="filter-chip ${this.filter === SRS_STATUS.ASINA ? 'active' : ''}" data-vf="${SRS_STATUS.ASINA}">Bilinen</div>
                <div class="filter-chip ${this.filter === SRS_STATUS.YENI ? 'active' : ''}" data-vf="${SRS_STATUS.YENI}">Yeni</div>
            </div>

            <div style="display:flex; gap:8px; margin-bottom:14px;">
                <input type="text" id="search-word-input" value="${query}" placeholder="Kelime veya Türkçe anlam ara..." style="flex:1; padding:12px 16px; border-radius:14px; border:2.5px solid var(--border); background:var(--surface); color:var(--text-dark); font-weight:700; outline:none; box-shadow:var(--shadow-sm);" />
            </div>

            <div id="vault-words-list">
                ${filtered.length === 0 ? `
                    <div style="text-align:center; padding:40px; color:var(--text-muted); font-weight:800; font-family:'Space Grotesk';">
                        Bu filtreye uygun kelime bulunamadı.
                    </div>
                ` : filtered.map(w => {
                    const rec = State.getWordRecord(this.currentLvl, w.en || w.lemma);
                    const status = rec.status || SRS_STATUS.YENI;
                    const classMap = {
                        [SRS_STATUS.ASINA]: 'wrc-known',
                        [SRS_STATUS.OGRENILMIS]: 'wrc-learned',
                        [SRS_STATUS.USTA]: 'wrc-learned',
                        [SRS_STATUS.PEKISTIRME]: 'wrc-review',
                        [SRS_STATUS.YENI]: 'wrc-new'
                    };
                    return `
                        <div class="word-row-card ${classMap[status] || 'wrc-new'}" data-speak="${w.en || w.lemma}">
                            <div>
                                <div style="font-family:'Space Grotesk'; font-size:17px; font-weight:800;">${w.en || w.lemma}</div>
                                <div style="font-size:13px; font-weight:600; opacity:0.9;">${w.tr || '-'}</div>
                            </div>
                            <span class="badge-status">${status.toUpperCase()}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        this.bindDetailEvents(filtered);
    }

    bindDetailEvents(filteredWords) {
        document.getElementById('btn-vault-back-overview').onclick = () => {
            this.app.openView('vault-overview');
            this.renderOverview();
        };

        document.querySelectorAll('.filter-chip[data-vf]').forEach(chip => {
            chip.onclick = () => {
                this.filter = chip.dataset.vf;
                this.renderDetail();
            };
        });

        const searchInput = document.getElementById('search-word-input');
        if (searchInput) {
            searchInput.oninput = () => this.renderDetail();
        }

        document.querySelectorAll('.word-row-card[data-speak]').forEach(row => {
            row.onclick = () => this.app.speak(row.dataset.speak);
        });

        const startSwipeBtn = document.getElementById('btn-start-swipe');
        if (startSwipeBtn) {
            startSwipeBtn.onclick = () => this.startSwipeSorter();
        }

        const practiceBtn = document.getElementById('btn-practice-vault');
        if (practiceBtn) {
            practiceBtn.onclick = () => {
                if (filteredWords.length === 0) return this.app.toast('Çalışılacak kelime bulunamadı!', 'error');
                this.app.startStudySession(this.currentLvl, filteredWords);
            };
        }
    }

    /* ================= 3. SWIPE / HIZLI AYIRMA SİSTEMİ ================= */
    startSwipeSorter() {
        const words = this.app.allWordsMap[this.currentLvl] || [];
        this.swipeQueue = [...words].sort(() => 0.5 - Math.random());
        this.swipeLearned = [];
        this.swipeUnlearned = [];
        this.app.openView('vault-swipe');
        this.renderSwipeCard();
    }

    renderSwipeCard() {
        if (!this.swipeContainer) return;

        if (this.swipeQueue.length === 0) {
            // Ayırma Tamamlandı Özeti
            this.swipeContainer.innerHTML = `
                <div class="session-card" style="text-align:center; padding:30px 20px;">
                    <h2 style="font-family:'Space Grotesk'; font-size:26px; font-weight:800; margin-bottom:8px;">Ayırma Tamamlandı! 🎉</h2>
                    <p style="color:var(--text-muted); font-size:14px; font-weight:700; margin-bottom:24px;">
                        <span style="color:var(--green);">${this.swipeLearned.length} Bilinen</span> | 
                        <span style="color:var(--orange);">${this.swipeUnlearned.length} Öğrenilecek</span>
                    </p>

                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${this.swipeUnlearned.length > 0 ? `
                            <button class="btn-check-main" id="btn-study-unlearned-only" style="background:var(--orange); color:#FFF;">
                                ⚡ Yalnızca Bilinmeyenleri Çalış (${this.swipeUnlearned.length})
                            </button>
                        ` : ''}
                        <button class="btn-check-main" id="btn-finish-swipe" style="background:var(--surface);">
                            Sandığa Dön
                        </button>
                    </div>
                </div>
            `;

            const studyUnlearnedBtn = document.getElementById('btn-study-unlearned-only');
            if (studyUnlearnedBtn) {
                studyUnlearnedBtn.onclick = () => this.app.startStudySession(this.currentLvl, this.swipeUnlearned);
            }
            document.getElementById('btn-finish-swipe').onclick = () => {
                this.openDetail(this.currentLvl);
            };
            return;
        }

        const cur = this.swipeQueue[0];

        this.swipeContainer.innerHTML = `
            <div class="btn-back-row">
                <button class="btn-back" id="btn-exit-swipe">✕ Çık</button>
                <h3 class="page-title-center">Hızlıca Ayır (${this.swipeQueue.length})</h3>
            </div>

            <div class="swipe-stage" id="swipe-stage-box">
                <div class="swipe-card-box" id="active-swipe-card">
                    <span class="word-lvl-tag" style="position:absolute; top:16px; left:20px;">${this.currentLvl}</span>
                    <i class="ti ti-volume" style="position:absolute; top:16px; right:20px; font-size:24px; cursor:pointer;" onclick="event.stopPropagation(); window.MainApp.speak('${cur.en || cur.lemma}')"></i>
                    
                    <div style="font-family:'Space Grotesk'; font-size:40px; font-weight:800; color:var(--text-dark); margin-bottom:10px;">${cur.en || cur.lemma}</div>
                    <div style="font-size:18px; font-weight:700; color:var(--text-muted);">${cur.tr || '-'}</div>

                    <div style="position:absolute; bottom:14px; font-size:12px; font-weight:800; color:var(--text-muted);">
                        👈 Sola: Öğrenilecek | Sağa: Biliyorum 👉
                    </div>
                </div>
            </div>

            <div class="swipe-action-controls">
                <div class="btn-swipe-circle" style="background:var(--red);" id="btn-swipe-left" title="Öğrenilecek"><i class="ti ti-x"></i></div>
                <div class="btn-swipe-circle" style="background:var(--green);" id="btn-swipe-right" title="Biliyorum"><i class="ti ti-check"></i></div>
            </div>
        `;

        this.bindSwipeTouchEvents(cur);
    }

    bindSwipeTouchEvents(cur) {
        document.getElementById('btn-exit-swipe').onclick = () => this.openDetail(this.currentLvl);

        const cardEl = document.getElementById('active-swipe-card');
        const stage = document.getElementById('swipe-stage-box');

        document.getElementById('btn-swipe-left').onclick = () => this.handleSwipeAction('left', cur);
        document.getElementById('btn-swipe-right').onclick = () => this.handleSwipeAction('right', cur);

        const onStart = (cx) => {
            this.isDragging = true;
            this.startX = cx;
            cardEl.style.transition = 'none';
        };

        const onMove = (cx) => {
            if (!this.isDragging) return;
            this.currentX = cx - this.startX;
            const rotate = this.currentX * 0.05;
            cardEl.style.transform = `translate(${this.currentX}px, 0px) rotate(${rotate}deg)`;
        };

        const onEnd = () => {
            if (!this.isDragging) return;
            this.isDragging = false;
            cardEl.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease';

            if (this.currentX > 90) this.handleSwipeAction('right', cur);
            else if (this.currentX < -90) this.handleSwipeAction('left', cur);
            else cardEl.style.transform = 'translate(0px, 0px) rotate(0deg)';

            this.currentX = 0;
        };

        stage.ontouchstart = (e) => onStart(e.touches[0].clientX);
        window.ontouchmove = (e) => { if (this.isDragging) onMove(e.touches[0].clientX); };
        window.ontouchend = onEnd;

        stage.onmousedown = (e) => onStart(e.clientX);
        window.onmousemove = (e) => { if (this.isDragging) onMove(e.clientX); };
        window.onmouseup = onEnd;
    }

    handleSwipeAction(direction, word) {
        const cardEl = document.getElementById('active-swipe-card');
        if (cardEl) {
            const moveX = direction === 'right' ? 500 : -500;
            cardEl.style.transform = `translate(${moveX}px, 0px) rotate(${direction === 'right' ? 25 : -25}deg)`;
            cardEl.style.opacity = '0';
        }

        const item = this.swipeQueue.shift();

        if (direction === 'right') {
            SoundFX.playCorrect();
            this.swipeLearned.push(item);
            SRSEngine.processAttempt(this.currentLvl, item.en || item.lemma, true);
        } else {
            SoundFX.playWrong();
            this.swipeUnlearned.push(item);
            SRSEngine.processAttempt(this.currentLvl, item.en || item.lemma, false);
        }

        setTimeout(() => this.renderSwipeCard(), 220);
    }
}