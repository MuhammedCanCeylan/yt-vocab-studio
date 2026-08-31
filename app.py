import os
import re
import json
import socket
import hashlib
import urllib.request
import urllib.parse
import html as html_lib
import logging
import atexit
import threading
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, render_template, request, jsonify, send_from_directory
from youtube_transcript_api import YouTubeTranscriptApi

logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='.', static_url_path='')
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

CACHE_FILE = "translation_cache.json"
_translation_cache = {}
_cache_lock = threading.Lock()
_cache_dirty = False

# Cihazlar arası veri transferi için thread-safe bellek havuzu
SYNC_STORAGE = {}
_sync_lock = threading.Lock()

# --- YEREL AĞ IP TESPİTİ (QR KOD VE MOBİL İÇİN) ---
def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

# --- ÖNBELLEK YÖNETİMİ (Thread-Safe & Optimize Disk I/O) ---
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            _translation_cache = json.load(f)
    except Exception:
        _translation_cache = {}

def save_cache():
    global _cache_dirty
    with _cache_lock:
        if not _cache_dirty:
            return
        try:
            tmp_file = CACHE_FILE + ".tmp"
            with open(tmp_file, 'w', encoding='utf-8') as f:
                json.dump(_translation_cache, f, ensure_ascii=False, indent=2)
            os.replace(tmp_file, CACHE_FILE)
            _cache_dirty = False
        except Exception as e:
            logger.error(f"Cache yazma hatasi: {e}")

atexit.register(save_cache)

CONTRACTIONS_TR = {
    "i'll": "yapacağım / edeceğim", "ill": "hasta", "i'm": "ben", "im": "ben",
    "i've": "yaptım / ettim", "i'd": "yapardım / ederdim", "won't": "yapmayacak",
    "wont": "yapmayacak", "don't": "yapma", "doesn't": "yapmaz",
    "didn't": "yapmadı", "can't": "yapamaz", "couldn't": "yapamadı",
    "isn't": "değil", "aren't": "değiller", "wasn't": "değildi",
    "weren't": "değillerdi", "haven't": "yapmadı / sahip değil",
    "hasn't": "yapmadı", "hadn't": "yapmamıştı", "wouldn't": "yapmazdı",
    "shouldn't": "yapmamalı", "we'll": "yapacağız", "you'll": "yapacaksın",
    "they'll": "yapacaklar", "he'll": "yapacak", "she'll": "yapacak",
    "it'll": "yapacak", "let's": "hadi", "that's": "o",
    "what's": "ne", "there's": "orada", "who's": "kim", "ain't": "değil"
}

# --- ÇEVİRİ MOTORLARI ---
def _engine_google(text, source, target):
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source}&tl={target}&dt=t&q={urllib.parse.quote(text)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req, timeout=3) as res:
        data = json.loads(res.read().decode('utf-8'))
        return data[0][0][0]

def _engine_mymemory(text, source, target):
    src = source if source != 'auto' else 'en'
    url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(text)}&langpair={src}|{target}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=3) as res:
        data = json.loads(res.read().decode('utf-8'))
        match = data.get('responseData', {}).get('translatedText')
        if match and match.strip() and not match.startswith("MYMEMORY WARNING"):
            return match
    raise Exception("MyMemory limit/error")

def _engine_lingva(text, source, target):
    src = source if source != 'auto' else 'en'
    url = f"https://lingva.ml/api/v1/{src}/{target}/{urllib.parse.quote(text)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=3) as res:
        data = json.loads(res.read().decode('utf-8'))
        return data.get('translation')

def translate_text(text, source='auto', target='tr'):
    global _cache_dirty
    if not text or not text.strip():
        return ""
    text_clean = text.strip()

    if source == 'en' and target == 'tr' and text_clean.lower() in CONTRACTIONS_TR:
        return CONTRACTIONS_TR[text_clean.lower()]

    cache_key = hashlib.md5(f"{text_clean.lower()}:{source}:{target}".encode('utf-8')).hexdigest()
    with _cache_lock:
        if cache_key in _translation_cache:
            return _translation_cache[cache_key]

    try:
        res = _engine_google(text_clean, source, target)
        if res and res.strip():
            with _cache_lock:
                _translation_cache[cache_key] = res
                _cache_dirty = True
            return res
    except Exception:
        pass

    try:
        res = _engine_mymemory(text_clean, source, target)
        if res and res.strip():
            with _cache_lock:
                _translation_cache[cache_key] = res
                _cache_dirty = True
            return res
    except Exception:
        pass

    try:
        res = _engine_lingva(text_clean, source, target)
        if res and res.strip():
            with _cache_lock:
                _translation_cache[cache_key] = res
                _cache_dirty = True
            return res
    except Exception:
        pass

    return text_clean

# --- YOUTUBE TRANSCRIPT VE CÜMLE AYRIŞTIRMA ---
def extract_video_id(url_or_id):
    url_or_id = url_or_id.strip()
    if len(url_or_id) == 11 and not ("/" in url_or_id or "." in url_or_id):
        return url_or_id
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?\/].*)?$",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"shorts\/([0-9A-Za-z_-]{11})",
        r"embed\/([0-9A-Za-z_-]{11})"
    ]
    for p in patterns:
        m = re.search(p, url_or_id)
        if m:
            return m.group(1)
    return None

def extract_strict_sentences(raw_lines):
    final_lines = []
    for line in raw_lines:
        line = re.sub(r'\[.*?\]|\(.*?\)', '', line).replace('♪', '').strip()
        line = re.sub(r'\s+', ' ', line)
        if not line:
            continue
        sub_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', line) if s.strip()]
        for s in sub_sentences:
            if len(s) < 2:
                continue
            s = s[0].upper() + s[1:]
            if s[-1] not in ['.', '!', '?']:
                s += "."
            final_lines.append(s)
    return final_lines

def fetch_transcript_dual(video_id):
    result = {'original_language': 'en', 'original_text': '', 'english_text': '', 'english_lines': [], 'title': '', 'success': False, 'error': ''}

    try:
        tlist = YouTubeTranscriptApi.list_transcripts(video_id)
        all_t = list(tlist)
        if all_t:
            original = all_t[0]
            result['original_language'] = original.language_code
            
            english = None
            try:
                english = tlist.find_transcript(['en', 'en-US', 'en-GB', 'a.en'])
            except Exception:
                if original.language_code.startswith('en'):
                    english = original
                elif original.is_translatable:
                    try:
                        english = original.translate('en')
                    except Exception:
                        pass

            def fetch_lines(t):
                if not t: return "", []
                raw = [s['text'].strip() if isinstance(s, dict) else s.text.strip() for s in t.fetch()]
                raw = [r for r in raw if r]
                sents = extract_strict_sentences(raw)
                return " ".join(sents), sents

            result['original_text'], _ = fetch_lines(original)
            if english:
                result['english_text'], result['english_lines'] = fetch_lines(english)
            else:
                result['english_text'], result['english_lines'] = fetch_lines(original)

            if result['english_text'].strip():
                result['success'] = True
                return result
    except Exception as e:
        result['error'] = str(e)

    try:
        import yt_dlp
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB'],
            'quiet': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            result['title'] = info.get('title', '')
            subtitles = info.get('subtitles') or info.get('automatic_captions') or {}

            eng_key = next((k for k in subtitles.keys() if k.startswith('en')), None)
            if eng_key:
                formats = subtitles[eng_key]
                target_f = next((f for f in formats if f.get('ext') == 'json3'), formats[0])
                req = urllib.request.Request(target_f.get('url'), headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    content = resp.read().decode('utf-8', errors='ignore')

                raw_lines = []
                if 'events' in content:
                    for ev in json.loads(content).get('events', []):
                        seg_text = "".join([seg.get('utf8', '') for seg in ev.get('segs', [])])
                        if seg_text.strip():
                            raw_lines.append(seg_text.strip())
                else:
                    for t in re.findall(r'<text[^>]*>(.*?)</text>', content):
                        txt = html_lib.unescape(t).strip()
                        if txt: raw_lines.append(txt)

                sents = extract_strict_sentences(raw_lines)
                result['english_text'] = " ".join(sents)
                result['english_lines'] = sents
                result['success'] = True
                return result
    except Exception:
        pass

    return result

# ===================== ENDPOINTS & ROUTING =====================

@app.before_request
def detect_mobile():
    if request.path == '/' and not request.args.get('desktop'):
        user_agent = request.headers.get('User-Agent', '').lower()
        is_mobile = any(k in user_agent for k in ['android', 'iphone', 'ipad', 'mobile', 'tablet'])
        if is_mobile:
            return render_template('mobile.html')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/m')
def mobile_view():
    return render_template('mobile.html')

@app.route('/quizlet')
def quizlet_view():
    return render_template('quizlet.html')

# --- SNAKELY KELİME ÖĞRENME PLATFORMU ROTALARI ---
@app.route('/snakely')
@app.route('/snakely/')
def snakely_index():
    return send_from_directory('snakely', 'index.html')

@app.route('/snakely/<path:filename>')
def snakely_static_files(filename):
    return send_from_directory('snakely', filename)

@app.route('/manifest.json')
def manifest():
    return send_from_directory('.', 'manifest.json')

@app.route('/sw.js')
def service_worker():
    return send_from_directory('.', 'sw.js')

@app.route('/arcade/<path:filename>')
def serve_arcade(filename):
    arcade_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'arcade')
    return send_from_directory(arcade_dir, filename)

# --- YEREL AĞ & QR EŞİTLEME SERVİSLERİ ---
@app.route('/api/sync/info', methods=['GET'])
def sync_info():
    ip = get_local_ip()
    port = 5000
    host_header = request.headers.get('Host', '')
    if ':' in host_header:
        try:
            port = int(host_header.split(':')[1])
        except Exception:
            port = 5000
            
    return jsonify({
        "local_ip": ip,
        "mobile_url": f"http://{ip}:{port}/m"
    })

@app.route('/api/sync/push', methods=['POST'])
def sync_push():
    data = request.get_json(silent=True) or {}
    with _sync_lock:
        SYNC_STORAGE['latest'] = data
    return jsonify({"status": "ok"})

@app.route('/api/sync/get', methods=['GET'])
def sync_get():
    with _sync_lock:
        data = SYNC_STORAGE.get('latest', {})
    return jsonify(data)

# --- VİDEO VE ÇEVİRİ SERVİSLERİ ---
@app.route('/api/fetch_video_data', methods=['POST'])
def fetch_video_data():
    try:
        req_data = request.get_json(silent=True) or {}
        vid = extract_video_id(req_data.get('url', ''))
        if not vid:
            return jsonify({'error': 'Geçersiz YouTube URL!'}), 400

        t_result = fetch_transcript_dual(vid)
        if not t_result['success']:
            return jsonify({'error': "Altyazı çekilemedi. Telifli veya altyazısız olabilir."}), 400

        title = t_result.get('title')
        if not title:
            try:
                url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=4) as res:
                    title = json.loads(res.read().decode('utf-8')).get('title', f"Video ({vid})")
            except Exception:
                title = f"YouTube Video ({vid})"

        return jsonify({
            'success': True,
            'id': vid,
            'title': title,
            'original_language': t_result['original_language'],
            'original_text': t_result['original_text'],
            'english_text': t_result['english_text'],
            'english_lines': t_result['english_lines']
        })
    except Exception as e:
        logger.error(f"fetch_video_data error: {e}")
        return jsonify({'error': 'Sunucu hatası.'}), 500

@app.route('/api/translate', methods=['POST'])
def translate():
    try:
        req_data = request.get_json(silent=True) or {}
        word = req_data.get('word', '')
        src = req_data.get('source', 'en')
        tgt = req_data.get('target', 'tr')
        translated = translate_text(word, src, tgt)
        return jsonify({'word': word, 'tr': translated, 'source': src, 'target': tgt})
    except Exception:
        return jsonify({'tr': ''})

@app.route('/api/translate_batch', methods=['POST'])
def translate_batch():
    try:
        req_data = request.get_json(silent=True) or {}
        words = req_data.get('words', [])
        source = req_data.get('source', 'en')
        target = req_data.get('target', 'tr')

        results = {}

        def translate_worker(w):
            return w, translate_text(w, source, target)

        with ThreadPoolExecutor(max_workers=12) as executor:
            worker_results = executor.map(translate_worker, words)
            for w, tr in worker_results:
                results[w] = tr

        save_cache()
        return jsonify(results)
    except Exception:
        return jsonify({})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=os.environ.get('FLASK_DEBUG') == '1')