import json, os, sys, urllib.request, time, concurrent.futures as cf
KEY = open(os.environ['GKF']).read().strip()
API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'
rows = json.load(open('concepts.json'))
PROMPT = '''You are building a German word list for a picture app: when a German speaker types a word, the app draws the matching picture.
For each picture below (an id and its English names), give the German NOUNS a German speaker would naturally type to get that picture.
Rules:
- Each entry: {"id": ..., "nouns": [{"sg": singular noun, "pl": plural noun or null, "g": "m"|"f"|"n"}]}.
- Nouns only, standard German spelling with capital letter, no articles, no adjectives unless the noun is a fixed compound (e.g. "Fußball").
- Most common word first; add 1-2 common synonyms at most.
- People and jobs: give the masculine and the feminine form if the picture is not gendered ("Koch", "Köchin"); if the id says man/woman, give that gender only.
- If there is no natural German noun for the picture (an abstract symbol, a gesture), give "nouns": [].
- Do not repeat the same noun for two pictures unless it really names both.
Answer with a JSON list only.
Pictures:
'''
def call(batch, i):
    path = f'out-{i:02d}.json'
    if os.path.exists(path): return f'have {i}'
    body = {'contents': [{'parts': [{'text': PROMPT + json.dumps(batch, ensure_ascii=False)}]}], 'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.2}}
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
