# German and Arabic words for the nearest-picture list (src/data/nearest-en.js): drafted with Gemini
# (gemini-3.5-flash), checked by scripts/lang/nearest-langs.mjs (a word Toonaro already knows keeps
# its meaning). Input: a JSON list of {en, drawn_as}; output: out-NN.json files in this folder.
#   GKF=<file with the API key> python3 scripts/lang/nearest-translate.py words.json <out folder>
import json, os, sys, urllib.request, time, concurrent.futures as cf

KEY = open(os.environ['GKF']).read().strip()
API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'
rows = json.load(open(sys.argv[1]))
out_dir = sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
PROMPT = '''You are building German and Arabic word lists for a picture app for children, teachers and families.
Each English noun below is drawn with a picture (drawn_as tells you which meaning is meant: "bank" drawn as "river" is a river bank).
For each, give the everyday German noun and the everyday Arabic noun (Modern Standard Arabic, as a child or a parent would type it) for that meaning.
Rules:
- Answer: [{"en": ..., "de": [{"sg": singular, "pl": plural or null}], "ar": [{"sg": singular, "pl": plural or null}]}] - one entry per word, in the same order.
- German: standard spelling with its capital letter, no article. Arabic: no vowel marks, no article "ال".
- One word each, two only if a second is just as common. A single word, not a phrase or a description.
- If there is no everyday word for it in that language (a rare species, a technical or Latin term, an old-fashioned word), give [] for that language. Never make up a word or describe it.
- Never give a word that is rude, offensive or a slur, even if the English word is.
Answer with the JSON list only.
Words:
'''

def call(batch, i):
    path = os.path.join(out_dir, f'out-{i:02d}.json')
    if os.path.exists(path):
        return f'have {i}'
    body = {'contents': [{'parts': [{'text': PROMPT + json.dumps(batch, ensure_ascii=False)}]}],
            'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.1}}
    err = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(API, data=json.dumps(body).encode(), headers={'x-goog-api-key': KEY, 'Content-Type': 'application/json'})
            d = json.load(urllib.request.urlopen(req, timeout=300))
            out = json.loads(d['candidates'][0]['content']['parts'][0]['text'])
            json.dump(out, open(path, 'w'), ensure_ascii=False)
            return f'ok {i}: {len(out)} entries, tokens {d.get("usageMetadata", {}).get("totalTokenCount")}'
        except Exception as e:
            err = e
            time.sleep(5)
    return f'FAIL {i}: {err}'

batches = [rows[k:k + 150] for k in range(0, len(rows), 150)]
with cf.ThreadPoolExecutor(4) as ex:
    for line in ex.map(lambda a: call(*a), [(b, i) for i, b in enumerate(batches)]):
        print(line, flush=True)
