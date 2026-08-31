import os
import json
import urllib.request
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARCADE_DIR = os.path.join(BASE_DIR, "arcade")
JSNES_CDN = "https://unpkg.com/jsnes/dist/jsnes.min.js"

# 1. TEK VE EVRENSEL OYNATICI (Dondurma / Ses / Klavye Destekli)
PLAYER_HTML = '''<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Arcade Player</title>
<style>
  * { box-sizing: border-box; }
  body { background: #050505; color: #fff; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; font-family: monospace; }
  #canvas-container { position: relative; border: 4px solid #e74c3c; border-radius: 12px; box-shadow: 0 0 30px rgba(231,76,60,0.4); background: #000; }
  canvas { image-rendering: pixelated; width: 512px; height: 480px; display: block; }
  .controls-bar { margin-top: 12px; font-size: 13px; color: #aaa; text-align: center; }
  .controls-bar span { color: #f1c40f; font-weight: bold; }
  #status-msg { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); font-size: 16px; color: #f1c40f; text-align: center; }
</style>
</head>
<body>

<div id="canvas-container">
  <div id="status-msg">ROM Yükleniyor...</div>
  <canvas id="nes-canvas" width="256" height="240"></canvas>
</div>

<div class="controls-bar">
  <span>Yön Tuşları:</span> Hareket | <span>Z:</span> A (Zıpla) | <span>X:</span> B (Ateş/Koş) | <span>Enter:</span> Start | <span>Shift:</span> Select
</div>

<script src="jsnes.min.js"></script>
<script>
  const canvas = document.getElementById('nes-canvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(256, 240);
  const statusMsg = document.getElementById('status-msg');
  let isPaused = false;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    }
  }

  const nes = new jsnes.NES({
    onFrame: function(frameBuffer) {
      var i = 0;
      for (var y = 0; y < 240; ++y) {
        for (var x = 0; x < 256; ++x) {
          i = y * 256 + x;
          imageData.data[i * 4]     = frameBuffer[i] & 0xff;
          imageData.data[i * 4 + 1] = (frameBuffer[i] >> 8) & 0xff;
          imageData.data[i * 4 + 2] = (frameBuffer[i] >> 16) & 0xff;
          imageData.data[i * 4 + 3] = 0xff;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    },
    onAudioSample: function(left, right) {}
  });

  const KEY_MAP = {
    38: jsnes.Controller.BUTTON_UP,
    40: jsnes.Controller.BUTTON_DOWN,
    37: jsnes.Controller.BUTTON_LEFT,
    39: jsnes.Controller.BUTTON_RIGHT,
    13: jsnes.Controller.BUTTON_START,
    16: jsnes.Controller.BUTTON_SELECT,
    90: jsnes.Controller.BUTTON_A,
    88: jsnes.Controller.BUTTON_B,
  };

  window.addEventListener('keydown', e => {
    initAudio();
    if (KEY_MAP[e.keyCode] !== undefined) {
      nes.buttonDown(1, KEY_MAP[e.keyCode]);
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', e => {
    if (KEY_MAP[e.keyCode] !== undefined) {
      nes.buttonUp(1, KEY_MAP[e.keyCode]);
      e.preventDefault();
    }
  });

  // 60 saniyede bir dondurma / devam etme
  window.addEventListener('message', e => {
    if (e.data === 'PAUSE_GAME') {
      isPaused = true;
      if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
    } else if (e.data === 'RESUME_GAME') {
      isPaused = false;
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      requestAnimationFrame(runFrame);
    }
  });

  function runFrame() {
    if (!isPaused) {
      nes.frame();
      requestAnimationFrame(runFrame);
    }
  }

  // URL parametresinden ROM yolunu al
  const urlParams = new URLSearchParams(window.location.search);
  const romFile = urlParams.get('rom');

  if (!romFile) {
    statusMsg.innerText = "ROM parametresi belirtilmedi!";
  } else {
    fetch(romFile)
      .then(res => {
        if (!res.ok) throw new Error("Dosya bulunamadı: " + romFile);
        return res.arrayBuffer();
      })
      .then(buffer => {
        statusMsg.style.display = 'none';
        nes.loadROM(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        requestAnimationFrame(runFrame);
      })
      .catch(err => {
        statusMsg.innerText = "Hata: " + err.message;
      });
  }
</script>
</body>
</html>
'''

COLOR_PALETTE = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c", "#3498db", "#9b59b6", "#e84393"]

def setup_arcade():
    os.makedirs(ARCADE_DIR, exist_ok=True)
    
    # 1. JSNES Motorunu İndir / Hazırla
    jsnes_cache_path = os.path.join(ARCADE_DIR, "jsnes.min.js")
    if not os.path.exists(jsnes_cache_path):
        print("⏳ jsnes.min.js indiriliyor...")
        try:
            req = urllib.request.Request(JSNES_CDN, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as resp, open(jsnes_cache_path, 'wb') as f:
                f.write(resp.read())
            print("✓ jsnes.min.js hazırlandı.")
        except Exception as e:
            print(f"Hata (JSNES): {e}")

    # 2. player.html Oluştur
    player_path = os.path.join(ARCADE_DIR, "player.html")
    with open(player_path, "w", encoding="utf-8") as f:
        f.write(PLAYER_HTML)

    # 3. arcade/games ve arcade/romlar Dizinlerini Tara
    search_dirs = [os.path.join(ARCADE_DIR, "games"), os.path.join(ARCADE_DIR, "romlar")]
    installed_games = []
    seen_ids = set()

    print("\n🕹️ NOSTALJİK NES OYUNLARI TARANIYOR...")
    print("=" * 55)

    for s_dir in search_dirs:
        if not os.path.exists(s_dir):
            continue
        
        for root, dirs, files in os.walk(s_dir):
            for file_name in files:
                if file_name.lower().endswith(".nes"):
                    full_path = os.path.join(root, file_name)
                    rel_path = os.path.relpath(full_path, ARCADE_DIR).replace('\\', '/')
                    
                    # Klasör adından kategori belirle
                    category = os.path.basename(root)
                    
                    # Başlığı temizle
                    clean_name = os.path.splitext(file_name)[0]
                    clean_name = re.sub(r'\(.*?\)', '', clean_name)
                    clean_name = re.sub(r'\[.*?\]', '', clean_name)
                    clean_name = clean_name.replace('_', ' ').replace('-', ' ').strip()
                    clean_name = re.sub(r'\s+', ' ', clean_name)
                    game_title = clean_name.title()

                    base_id = re.sub(r'[^a-zA-Z0-9_]', '_', clean_name).lower().strip('_')
                    game_id = base_id
                    counter = 1
                    while game_id in seen_ids or not game_id:
                        game_id = f"{base_id}_{counter}"
                        counter += 1
                    seen_ids.add(game_id)

                    color = COLOR_PALETTE[len(installed_games) % len(COLOR_PALETTE)]

                    installed_games.append({
                        "id": game_id,
                        "title": game_title,
                        "rom": rel_path,
                        "category": category,
                        "icon": "ti-device-gamepad-2",
                        "color": color,
                        "desc": f"{game_title} ({category})"
                    })

    # 4. games.json Dosyasını Kaydet
    games_json_path = os.path.join(ARCADE_DIR, "games.json")
    with open(games_json_path, 'w', encoding='utf-8') as f:
        json.dump(installed_games, f, ensure_ascii=False, indent=2)

    print("=" * 55)
    print(f"🎉 TOPLAM {len(installed_games)} ADET NOSTALJİK OYUN SİSTEME EKLENDİ!")
    print(f"📄 games.json başarıyla güncellendi.")

if __name__ == "__main__":
    setup_arcade()