import tkinter as tk
from tkinter import scrolledtext, messagebox, ttk
import subprocess
import os
import sys
import time
import threading
import webbrowser
import shutil

SAMPLE_URL = "https://www.youtube.com/watch?v=FxG-7AsbjeI"
APP_PORT = 5000

class ModernButton(tk.Canvas):
    """Modern degrade ve hover efektli buton bileşeni"""
    def __init__(self, parent, text, command, bg_color="#1e293b", hover_color="#334155", accent="#38bdf8", text_color="#f8fafc", width=260, height=44, icon=""):
        super().__init__(parent, width=width, height=height, bg="#0f172a", highlightthickness=0, cursor="hand2")
        self.command = command
        self.bg_color = bg_color
        self.hover_color = hover_color
        self.accent = accent
        self.text_color = text_color
        self.text = f"{icon}  {text}" if icon else text
        self.w = width
        self.h = height
        
        self.draw(self.bg_color)
        self.bind("<Enter>", lambda e: self.draw(self.hover_color, border=self.accent))
        self.bind("<Leave>", lambda e: self.draw(self.bg_color))
        self.bind("<Button-1>", lambda e: self.on_click())

    def draw(self, fill, border=None):
        self.delete("all")
        r = 10
        x1, y1, x2, y2 = 2, 2, self.w - 2, self.h - 2
        
        outline = border if border else "#334155"
        self.create_rectangle(x1, y1, x2, y2, fill=fill, outline=outline, width=1.5)
        
        self.create_text(self.w / 2, self.h / 2, text=self.text, fill=self.text_color, font=("Segoe UI", 10, "bold"))

    def on_click(self):
        if self.command:
            self.command()

class YTVocabLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("YT Vocab Studio - Control Center")
        self.root.geometry("740x580")
        self.root.resizable(False, False)
        self.root.configure(bg="#0f172a")

        self.server_process = None

        # --- ÜST HEADER ---
        header_frame = tk.Frame(root, bg="#0f172a")
        header_frame.pack(fill=tk.X, pady=(20, 10), padx=25)

        title_lbl = tk.Label(
            header_frame,
            text="YT VOCAB STUDY STUDIO",
            font=("Space Grotesk", 16, "bold"),
            fg="#38bdf8",
            bg="#0f172a"
        )
        title_lbl.pack(anchor="w")

        sub_lbl = tk.Label(
            header_frame,
            text="Gelişmiş Çalışma & Retro Arcade Kontrol Merkezi",
            font=("Segoe UI", 10),
            fg="#94a3b8",
            bg="#0f172a"
        )
        sub_lbl.pack(anchor="w")

        # --- ORTA BUTON PANELİ ---
        btn_grid = tk.Frame(root, bg="#0f172a")
        btn_grid.pack(pady=12, padx=25)

        btn_start = ModernButton(btn_grid, "Normal Başlat", lambda: self.run_thread(self.normal_start), 
                                 bg_color="#1e293b", hover_color="#0284c7", accent="#38bdf8", icon="▶")
        btn_start.grid(row=0, column=0, padx=8, pady=6)

        btn_reset = ModernButton(btn_grid, "Tam Sıfırla ve Başlat", lambda: self.run_thread(self.reset_start), 
                                 bg_color="#1e293b", hover_color="#ca8a04", accent="#facc15", icon="🔄")
        btn_reset.grid(row=0, column=1, padx=8, pady=6)

        btn_kill = ModernButton(btn_grid, "Port 5000'i Temizle", lambda: self.run_thread(self.kill_port), 
                                bg_color="#1e293b", hover_color="#dc2626", accent="#f87171", icon="🧹")
        btn_kill.grid(row=1, column=0, padx=8, pady=6)

        btn_scan = ModernButton(btn_grid, "Arcade Oyunlarını Tara", lambda: self.run_thread(self.scan_arcade), 
                                bg_color="#1e293b", hover_color="#16a34a", accent="#4ade80", icon="🕹️")
        btn_scan.grid(row=1, column=1, padx=8, pady=6)

        btn_exit = ModernButton(btn_grid, "Sunucuyu Durdur ve Çık", self.exit_app, 
                                bg_color="#18181b", hover_color="#991b1b", accent="#ef4444", text_color="#fca5a5", width=536, icon="✕")
        btn_exit.grid(row=2, column=0, columnspan=2, padx=8, pady=10)

        # --- LOG KONSOLU ---
        log_card = tk.Frame(root, bg="#1e293b", bd=1.5, relief="solid")
        log_card.pack(fill=tk.BOTH, expand=True, padx=25, pady=(5, 20))

        log_header = tk.Frame(log_card, bg="#1e293b")
        log_header.pack(fill=tk.X, padx=12, pady=6)

        tk.Label(log_header, text="KONSOL ÇIKTISI", font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT)

        self.status_badge = tk.Label(log_header, text="● HAZIR", font=("Segoe UI", 8, "bold"), fg="#4ade80", bg="#1e293b")
        self.status_badge.pack(side=tk.RIGHT)

        self.log_text = scrolledtext.ScrolledText(
            log_card,
            wrap=tk.WORD,
            font=("Consolas", 9),
            bg="#0b1120",
            fg="#e2e8f0",
            insertbackground="#38bdf8",
            relief="flat",
            bd=0
        )
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=8, pady=(0, 8))
        self.log_text.config(state=tk.DISABLED)

        self.root.protocol("WM_DELETE_WINDOW", self.exit_app)
        self.log("🚀 Sistem hazırlandı. Başlatmak için bir seçenek belirleyin.")

    def log(self, message):
        def append():
            self.log_text.config(state=tk.NORMAL)
            self.log_text.insert(tk.END, message + "\n")
            self.log_text.see(tk.END)
            self.log_text.config(state=tk.DISABLED)
        self.root.after(0, append)

    def set_status(self, text, color):
        self.root.after(0, lambda: self.status_badge.config(text=text, fg=color))

    def run_thread(self, func):
        t = threading.Thread(target=func, daemon=True)
        t.start()

    def launch_browser(self, url):
        """
        Varsayılan sistem tarayıcısını normal kullanıcı profiliyle (çerezler vb.) açar.
        Bu sayede Google Drive / Oturum açık Chrome ile çalışır.
        """
        self.log("🌐 Varsayılan sistem tarayıcısı (Kişisel Profil) ile açılıyor...")
        try:
            webbrowser.open(url, new=2)
        except Exception as e:
            self.log(f"⚠️ Tarayıcı açılırken hata: {e}")

    def kill_port(self):
        self.set_status("● PORT TEMİZLENİYOR", "#f59e0b")
        self.log("🧹 Port 5000 ve asılı kalan süreçler taranıyor...")
        cmd_netstat = f'netstat -aon | findstr :{APP_PORT}'
        try:
            result = subprocess.run(cmd_netstat, shell=True, capture_output=True, text=True, encoding='utf-8')
            if result.stdout:
                lines = result.stdout.strip().split('\n')
                killed_pids = set()
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        if pid.isdigit() and pid not in killed_pids and pid != "0":
                            self.log(f"   -> Kilitli PID ({pid}) sonlandırılıyor...")
                            subprocess.run(f'taskkill /f /pid {pid}', shell=True, capture_output=True)
                            killed_pids.add(pid)
            else:
                self.log("   -> 5000 portu tamamen boş.")
        except Exception as e:
            self.log(f"   Hata: {e}")

        if self.server_process:
            try:
                self.server_process.terminate()
            except:
                pass
            self.server_process = None

        time.sleep(0.5)
        self.log("✓ Port 5000 kullanıma hazır.")
        self.set_status("● HAZIR", "#4ade80")

    def clear_cache(self):
        self.log("🗑️ Önbellek ve derleme kalıntıları siliniyor...")
        try:
            if os.path.exists("__pycache__"):
                shutil.rmtree("__pycache__")
                self.log("   -> __pycache__ klasörü silindi.")
            for f in os.listdir("."):
                if f.endswith(".pyc"):
                    os.remove(f)
                    self.log(f"   -> {f} silindi.")
        except Exception as e:
            self.log(f"   Önbellek temizleme hatası: {e}")
        self.log("✓ Önbellek temizlendi.")

    def start_flask(self):
        self.set_status("● SUNUCU ÇALIŞIYOR", "#38bdf8")
        target_url = f"http://localhost:{APP_PORT}/?url={SAMPLE_URL}"
        
        self.log(f"🔗 Hedef URL: {target_url}")
        
        # Tarayıcıyı aç
        self.launch_browser(target_url)

        self.log("🐍 Flask sunucusu arka planda ayağa kaldırılıyor (app.py)...")
        try:
            self.server_process = subprocess.Popen([sys.executable, "app.py"])
            self.log("✓ Sunucu aktif! Tarayıcı ekranından çalışabilirsiniz.")
        except Exception as e:
            self.log(f"❌ Sunucu hatası: {e}")
            self.set_status("● HATA", "#ef4444")

    def normal_start(self):
        self.log("\n" + "="*50)
        self.log("▶ NORMAL BAŞLATMA İŞLEMİ")
        self.kill_port()
        self.start_flask()
        self.log("="*50)

    def reset_start(self):
        self.log("\n" + "="*50)
        self.log("🔄 TAM SIFIRLAMA & BAŞLATMA İŞLEMİ")
        self.kill_port()
        self.clear_cache()
        self.start_flask()
        self.log("="*50)

    def scan_arcade(self):
        self.set_status("● TARAMA YAPILIYOR", "#f59e0b")
        self.log("\n" + "="*50)
        self.log("🕹️ ARCADE OYUNLARI TARANIYOR (arcade_yukle.py)...")
        try:
            result = subprocess.run([sys.executable, "arcade_yukle.py"], capture_output=True, text=True, encoding='utf-8')
            if result.stdout:
                self.log(result.stdout.strip())
            if result.stderr:
                self.log("[UYARI] " + result.stderr.strip())
            self.log("✓ Tarama tamamlandı.")
        except Exception as e:
            self.log(f"❌ Tarama hatası: {e}")
        self.log("="*50)
        self.set_status("● HAZIR", "#4ade80")

    def exit_app(self):
        if messagebox.askokcancel("Çıkış", "Sunucuyu durdurup çıkmak istiyor musunuz?"):
            self.kill_port()
            self.root.quit()
            self.root.destroy()
            sys.exit(0)

if __name__ == "__main__":
    root = tk.Tk()
    app = YTVocabLauncher(root)
    root.mainloop()