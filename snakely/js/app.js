// snakely/js/app.js
import { State } from './state.js';
import { SessionEngine } from './session-engine.js';
import { HomeView } from './views/home-view.js';
import { StudyView } from './views/study-view.js';
import { VaultView } from './views/vault-view.js';
import { ProgressView } from './views/progress-view.js';
import { ExamView } from './views/exam-view.js';

class App {
    constructor() {
        this.session = new SessionEngine();
        this.allWordsMap = { A1: [], A2: [], B1: [], B2: [], C1: [] };

        this.views = {
            home: new HomeView(this),
            study: new StudyView(this),
            vault: new VaultView(this),
            progress: new ProgressView(this),
            exam: new ExamView(this)
        };
    }

    async init() {
        await this.loadAllJSON();
        this.initDOM();
        this.updateHeaderUI();
        this.openView('home');
    }

    /* ÖZEL SİTE İÇİ BİLDİRİM (TOAST) */
    toast(message, type = 'info') {
        const toastEl = document.getElementById('snakely-toast');
        if (!toastEl) return;
        toastEl.className = `toast-popup ${type} show`;
        toastEl.innerHTML = `<i class="ti ti-info-circle"></i> <span>${message}</span>`;
        setTimeout(() => {
            toastEl.classList.remove('show');
        }, 2600);
    }

    async loadAllJSON() {
        for (let lvl of ['A1', 'A2', 'B1', 'B2', 'C1']) {
            try {
                const res = await fetch(`data/en-${lvl}.json`);
                if (!res.ok) throw new Error('Yüklenemedi');
                this.allWordsMap[lvl] = await res.json();
            } catch (e) {
                console.warn(`[Snakely] data/en-${lvl}.json fetch hatası.`);
                this.allWordsMap[lvl] = [];
            }
        }
    }

    initDOM() {
        // Nav bar yönlendirmesi
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.onclick = () => {
                const v = item.dataset.view;
                if (v === 'vault') {
                    this.openView('vault-overview');
                    this.views.vault.renderOverview();
                } else if (v === 'account') {
                    this.openView('account');
                    this.renderAccountView();
                } else {
                    this.openView(v);
                }
            };
        });

        document.getElementById('nav-btn-hearts').onclick = () => this.toast('❤️ 5 Canınız bulunuyor!', 'info');

        // Top pill yönlendirmeleri
        const examPill = document.getElementById('hdr-exam-pill');
        if (examPill) {
            examPill.onclick = () => {
                this.openView('exam-lobby');
                this.views.exam.renderLobby();
            };
        }

        const freePill = document.getElementById('hdr-free-pill');
        if (freePill) {
            freePill.onclick = () => this.startStudySession('A1');
        }

        // Sheet Kapatma
        document.querySelectorAll('.sheet-overlay').forEach(overlay => {
            overlay.onclick = (e) => {
                if (e.target === overlay || e.target.classList.contains('sheet-item')) {
                    overlay.classList.remove('active');
                }
            };
        });

        // Soru Tipi ve Filtre Seçicileri
        document.querySelectorAll('#type-sheet .sheet-item').forEach(item => {
            item.onclick = () => {
                this.session.questionType = item.dataset.type;
                this.closeSheets();
                this.views.study.render(this.session.getCurrentCard());
            };
        });

        document.querySelectorAll('#filter-sheet .sheet-item').forEach(item => {
            item.onclick = () => {
                this.session.filter = item.dataset.filter;
                this.closeSheets();
                this.startStudySession(this.session.level);
            };
        });
    }

    renderAccountView() {
        const c = document.getElementById('view-account');
        if (!c) return;
        c.innerHTML = `
            <div class="btn-back-row">
                <button class="btn-back" onclick="window.MainApp.openView('home')">← Geri</button>
                <h3 class="page-title-center">Hesap & Ayarlar</h3>
            </div>

            <div class="vault-card" style="margin-bottom:16px;">
                <div class="vault-avatar" style="background:#7C3AED; color:#FFF;">M</div>
                <div>
                    <h4 style="font-size:16px; font-weight:800; font-family:'Space Grotesk';">Misafir Kullanıcı</h4>
                    <p style="font-size:12px; color:var(--text-muted); font-weight:700;">İlerlemeniz tarayıcınızda saklanıyor</p>
                </div>
            </div>

            <div class="task-card" style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:800; font-family:'Space Grotesk';">Ses Efektleri</div>
                <div class="toggle-switch ${State.state.sound ? 'active' : ''}" onclick="this.classList.toggle('active'); window.MainApp.toggleSound();">
                    <div class="toggle-knob"></div>
                </div>
            </div>
        `;
    }

    toggleSound() {
        State.toggleSound();
        this.toast(State.state.sound ? 'Ses efektleri açıldı' : 'Ses efektleri kapatıldı', 'info');
    }

    updateHeaderUI() {
        document.getElementById('hdr-tickets').innerText = State.state.tickets;
        document.getElementById('hdr-streak').innerText = State.state.streak;
    }

    openView(viewId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`view-${viewId}`);
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(nav => {
            const match = nav.dataset.view === viewId || (viewId.startsWith('vault') && nav.dataset.view === 'vault');
            nav.classList.toggle('active', match);
        });

        if (viewId === 'home') this.views.home.render();
        if (viewId === 'progress') this.views.progress.render();
        if (viewId === 'vault-overview') this.views.vault.renderOverview();
        if (viewId === 'exam-lobby') this.views.exam.renderLobby();

        window.scrollTo(0, 0);
    }

    startStudySession(level, customWordList = null) {
        const words = this.allWordsMap[level] || [];
        const firstCard = this.session.start(level, words, this.session.filter, this.session.questionType, customWordList);
        this.openView('study');
        this.views.study.render(firstCard);
    }

    finishStudySession() {
        State.addXP(100);
        this.updateHeaderUI();
        this.toast('🎉 Oturum Tamamlandı! (+100 XP)', 'success');
        this.openView('home');
    }

    speak(text) {
        if (!window.speechSynthesis || !State.state.sound) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'en-US';
        window.speechSynthesis.speak(utt);
    }

    openSheet(id) { document.getElementById(id)?.classList.add('active'); }
    closeSheets() { document.querySelectorAll('.sheet-overlay').forEach(el => el.classList.remove('active')); }
}

export const MainApp = new App();
window.MainApp = MainApp;
window.addEventListener('DOMContentLoaded', () => MainApp.init());