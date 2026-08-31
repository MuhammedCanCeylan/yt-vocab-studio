# 📚 YT Vocab Study Studio & Snakely Studio

[![License: All Rights Reserved](https://img.shields.io/badge/License-All_Rights_Reserved-red.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Azure_Cloud-success.svg)](http://20.203.250.249)

**YT Vocab Study Studio**, YouTube videolarından, kitaplardan ve metinlerden otomatik kelime çıkaran; akıllı aralıklı tekrar (SRS), oyunlaştırma, retro arcade entegrasyonu ve mobil PWA senkronizasyonu sunan kapsamlı bir dil öğrenme ekosistemidir.

🌐 **Canlı Demo:** [http://20.203.250.249](http://20.203.250.249)  
📱 **Mobil Web App:** [http://20.203.250.249/m](http://20.203.250.249/m)

---

## ✨ Öne Çıkan Özellikler

### 🎬 1. Video & Metin Analiz Laboratuvarı
* **YouTube Altyazı Ayrıştırma:** Herhangi bir altyazılı YouTube videosunun transkriptini çeker, phrasal verb'leri ve kelimeleri frekanslarına göre ayıklar.
* **Akıllı Kitap/Metin Okuyucu:** Uzun İngilizce metinleri otomatik sayfalara böler, üzerine gelinen (hover/touch) kelimelerin anında Türkçe karşılığını ve telaffuzunu gösterir.
* **Dual Player & Mini Pencere:** Altyazıları Türkçe-İngilizce eşzamanlı göstererek video üzerinden çalışma imkânı tanır.

### 🧠 2. Çoklu Çalışma & Quiz Modülleri
* **Klasik Kartlar (Flashcards):** 3D dönen kartlar, TTS (Metin Okuma) seslendirme, karıştırma ve otomatik oynatma.
* **Ayır & Sına (Swipe):** Tinder/Anki tarzı bilinen ve öğrenilecek kelimeleri sağa-sola ayırma mekaniği.
* **Aşamalı Öğren:** Çoktan seçmeli algoritmik kelime pekiştirme.
* **Test Sınavı:** Çoktan seçmeli ve yazılı karma deneme sınavı.
* **Eşleştirme Oyunu:** Zamana karşı refleks kelime-anlam eşleştirme oyunu.

### 🕹️ 3. Oyunlaştırılmış Öğrenme Motorları
* **⛏️ Vocab Miner (Minecraft):** Bilinmeyen kelimelerin ve Türkçe karşılıklarının aktarıldığı WebGL tabanlı voxel madencilik modu.
* **🕹️ Retro Arcade Arena:** 8.500+ NES oyunu oynarken belirli aralıklarla oyunu dondurup kelime kontrolü yapan entegre arcade emülatörü.
* **🎲 Domino & Mini Oyunlar:** Kelimeleri eğlenerek pekiştiren canvas tabanlı mini oyunlar.
* **🐍 Snakely Studio:** A1-C1 Avrupa Dil Portföyü standartlarında seviye bazlı, can ve sandık mekanikli modern mobil öğrenme stüdyosu.

### 📱 4. Mobil PWA & Sıfır Sunucu QR Eşitleme
* **Liquid Glass Navigasyon:** iOS ve Instagram tarzı parmak hareketlerini takip eden dinamik bulanık cam (blur + saturate) alt bar.
* **QR Kod ile Veri Aktarımı:** Hesap açmaya gerek kalmadan, tek bir QR taramasıyla PC'deki tüm ilerlemeyi ve kelime havuzunu telefona aktarma.

---

## 🛠️ Teknoloji Yığını

* **Backend:** Python, Flask, Gunicorn, YouTube Transcript API
* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 (Neo-brutalist & Liquid Glassmorphism)
* **Kütüphaneler:** Tabler Icons, Chart.js, Html5-Qrcode, QRCode.js
* **Emülasyon & Oyun Motorları:** WebGL, WASM (Eaglercraft 1.8.8), Libretro Web Player

---

## 🚀 Kurulum ve Yerel Çalıştırma

### 1. Gereksinimler
* Python 3.10 veya üzeri
* Git

### 2. Projeyi Klonlayın
```bash
git clone [https://github.com/MuhammedCanCeylan/yt-vocab-studio.git](https://github.com/MuhammedCanCeylan/yt-vocab-studio.git)
cd yt-vocab-studio
