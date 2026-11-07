"""Arabic nouns for the library's pictures, drafted with Gemini (gemini-3.5-flash): for each picture
(its id and English names, concepts.json in the current folder) the Arabic nouns an Arabic speaker
would type, singular, plural and gender, in Modern Standard Arabic without vowel marks. Writes
out-NN.json; scripts/lang/ar-nouns-build.mjs makes src/lang-ar-nouns.js from them.
  GKF=path/to/key-file python3 scripts/lang/ar-nouns-draft.py   (in the folder with concepts.json)
"""
import json, os, urllib.request, time, concurrent.futures as cf
KEY = open(os.environ['GKF']).read().strip()
API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'
rows = json.load(open('concepts.json'))
PROMPT = '''You are building an Arabic word list for a picture app for children and teachers: when someone types an Arabic word, the app draws the matching picture.
For each picture below (an id and its English names), give the Arabic NOUNS a speaker would naturally type to get that picture.
Rules:
- Each entry: {"id": ..., "nouns": [{"sg": singular, "pl": plural or null, "g": "m"|"f"}]}.
- Modern Standard Arabic, the everyday word (e.g. "كلب", "قطة", "سيارة", "هاتف"), WITHOUT vowel marks (no harakat, no tanween, no shadda), WITHOUT the article "ال", no adjectives unless the noun is a fixed phrase.
- Plural: the usual plural (broken plural where that is normal, e.g. "كلاب", "أطفال", "قطط"; sound plural otherwise, e.g. "سيارات").
- Most common word first; add 1-2 common synonyms at most (a well-known Gulf/Levant/Egyptian word only when it is very common, e.g. "موبايل").
- People and jobs: give the masculine and the feminine form if the picture is not gendered ("معلم", "معلمة"); if the id says man/woman, give that gender only.
- If there is no natural Arabic noun for the picture (an abstract symbol, a gesture), give "nouns": [].
Answer with a JSON list only.
Pictures:
'''
def call(batch, i):
    path = f'out-{i:02d}.json'
    if os.path.exists(path): return f'have {i}'
    body = {'contents': [{'parts': [{'text': PROMPT + json.dumps(batch, ensure_ascii=False)}]}], 'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.2}}
    err = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(API, data=json.dumps(body).encode(), headers={'x-goog-api-key': KEY, 'Content-Type': 'application/json'})
            d = json.load(urllib.request.urlopen(req, timeout=300))
            out = json.loads(d['candidates'][0]['content']['parts'][0]['text'])
            json.dump(out, open(path, 'w'), ensure_ascii=False, indent=0)
            return f'ok {i}: {len(out)} entries, usage {d.get("usageMetadata", {}).get("totalTokenCount")}'
        except Exception as e:
            err = e; time.sleep(5)
    return f'FAIL {i}: {err}'
batches = [rows[k:k + 100] for k in range(0, len(rows), 100)]
with cf.ThreadPoolExecutor(4) as ex:
    for line in ex.map(lambda a: call(*a), [(b, i) for i, b in enumerate(batches)]): print(line, flush=True)
