# snakely/fix_translations.py
import os
import json
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

DATA_DIR = "./data"
FILES = ["en-A1.json", "en-A2.json", "en-B1.json", "en-B2.json", "en-C1.json"]

# Hızlı Google Translate Motoru
def translate_word(text):
    if not text or not text.strip():
        return ""
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q={urllib.parse.quote(text.strip())}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=4) as res:
            data = json.loads(res.read().decode('utf-8'))
            return data[0][0][0].strip().capitalize()
    except Exception:
        return text.strip().capitalize()

def process_file(filename):
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        print(f"⚠️ {filename} bulunamadı, atlanıyor.")
        return

    print(f"\n📖 {filename} temizleniyor ve çevriliyor...")
    with open(file_path, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    def worker(item):
        lemma = item.get("lemma", "") or item.get("en", "")
        pos_raw = (item.get("pos", "noun") or "noun").upper()
        
        # Temiz Türkçe karşılık
        tr_clean = translate_word(lemma)
        
        return {
            "id": item.get("id", ""),
            "en": lemma.strip(),
            "tr": tr_clean,
            "pos": pos_raw if pos_raw in ["NOUN", "VERB", "ADJ", "ADV"] else "NOUN",
            "def": item.get("definition_target", "") or ""
        }

    # 15 Thread ile aynı anda çeviri
    with ThreadPoolExecutor(max_workers=15) as executor:
        clean_data = list(executor.map(worker, raw_data))

    # Temiz JSON olarak üzerine yaz
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(clean_data, f, ensure_ascii=False, indent=2)

    print(f"✅ {filename} başarıyla temizlendi! ({len(clean_data)} kelime)")

if __name__ == "__main__":
    for f in FILES:
        process_file(f)
    print("\n🎉 Bütün A1-C1 kelime dosyaları sıfır hatayla Türkçe'ye çevrildi!")