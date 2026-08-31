// snakely/js/views/home-view.js
import { SRSEngine } from '../srs-engine.js';

export class HomeView {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('view-home');
    }

    render() {
        if (!this.container) return;
        const levels = [
            { id: 'A1', name: 'A1', class: 'lvl-a1', badge: 'Önerilen' },
            { id: 'A2', name: 'A2', class: 'lvl-a2' },
            { id: 'B1', name: 'B1', class: 'lvl-b1' },
            { id: 'B2', name: 'B2', class: 'lvl-b2' },
            { id: 'C1', name: 'C1', class: 'lvl-c1' }
        ];

        this.container.innerHTML = levels.map(lvl => {
            const words = this.app.allWordsMap[lvl.id] || [];
            const metrics = SRSEngine.calculateLevelMetrics(lvl.id, words);

            return `
                <div class="level-card ${lvl.class}" data-level="${lvl.id}">
                    <div>
                        <div style="display:flex; align-items:center;">
                            <span class="lvl-code">${lvl.name}</span>
                            ${lvl.badge ? `<span class="lvl-badge">${lvl.badge}</span>` : ''}
                        </div>
                        <div style="font-size:13px; opacity:0.9; margin-top:2px;">${metrics.total} kelime</div>
                    </div>
                    <div class="prog-circle">${metrics.percentage}%</div>
                </div>
            `;
        }).join('') + `
            <div class="level-card lvl-custom" id="btn-custom-pack">
                <div>
                    <span class="lvl-code" style="font-size:22px;">Design Your Own</span>
                    <div style="font-size:13px; opacity:0.9;">Kendin Tasarla</div>
                </div>
                <i class="ti ti-settings" style="font-size:32px;"></i>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        this.container.querySelectorAll('.level-card[data-level]').forEach(card => {
            card.onclick = () => {
                const lvl = card.dataset.level;
                this.app.startStudySession(lvl);
            };
        });

        // alert() kaldırıldı -> Yerine özel Toast popup bağlandı
        const customBtn = document.getElementById('btn-custom-pack');
        if (customBtn) {
            customBtn.onclick = () => {
                this.app.toast('Kendin Tasarla özelliği yakında aktif olacaktır!', 'info');
            };
        }
    }
}