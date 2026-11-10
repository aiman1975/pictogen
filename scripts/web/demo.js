// The Toonaro demo (scripts/build-web.js --demo copies this to /web/demo.js): anyone can try the
// studio in the browser a few times. Everything the studio draws carries the mark "Toonaro · demo" -
// on screen, so in downloads, prints and videos too; after the free tries (counted in this browser),
// Toonaro says how to get the full version. What a visitor types is kept short: a picture from up to
// maxPrompt characters, a clip from up to maxStory.
// Settings: window.__toonaroDemo = { tries, contact, maxPrompt, maxStory }.
(function () {
  var cfg = window.__toonaroDemo || { tries: 3, contact: '' };
  cfg.maxPrompt = cfg.maxPrompt || 120;
  cfg.maxStory = cfg.maxStory || 300;
  var KEY = 'toonaro.demo.v1';
  var studio = /^\/studio/.test(location.pathname);
  var used = function () { try { return Math.max(0, parseInt(localStorage.getItem(KEY) || '0', 10) || 0); } catch (e) { return 0; } };
  var setUsed = function (n) { try { localStorage.setItem(KEY, String(n)); } catch (e) { /* (not kept) */ } };
  // (no number of tries - 0 or none - means as often as they like: the mark and the length limit stay)
  var unlimited = !cfg.tries;
  var left = function () { return unlimited ? Infinity : Math.max(0, cfg.tries - used()); };
  var lang = function () { var l = (document.documentElement.lang || 'en').slice(0, 2); return T[l] ? l : 'en'; };

  var T = {
    en: {
      left: function (n) { return n === 0 ? 'No free tries left' : n === 1 ? '1 free try left' : n + ' free tries left'; },
      title: 'That was your free try-out!',
      text: 'The full version of Toonaro draws without a watermark, as often as you like, and works offline on your own device.',
      contact: 'Interested? Write to us:',
      close: 'Back to my pictures',
      note: function (n) { return 'Try it free in your browser: ' + n + ' pictures or clips (a story of up to ' + cfg.maxStory + ' characters), with a "demo" watermark.'; },
      long: function (n, m) { return 'The demo draws from up to ' + n + ' characters (yours: ' + m + '). Make it a little shorter - the full version has no limit.'; },
      free: 'Free demo, with a watermark. The full version, without it:',
      noteFree: function () { return 'Try it free in your browser, as often as you like - with a "demo" watermark, stories of up to ' + cfg.maxStory + ' characters.'; },
    },
    de: {
      left: function (n) { return n === 0 ? 'Keine kostenlosen Versuche mehr' : n === 1 ? 'Noch 1 kostenloser Versuch' : 'Noch ' + n + ' kostenlose Versuche'; },
      title: 'Das war deine kostenlose Probe!',
      text: 'Die Vollversion von Toonaro malt ohne Wasserzeichen, so oft du willst, und läuft offline auf deinem eigenen Gerät.',
      contact: 'Interesse? Schreib uns:',
      close: 'Zurück zu meinen Bildern',
      note: function (n) { return 'Kostenlos im Browser ausprobieren: ' + n + ' Bilder oder Clips (eine Geschichte mit bis zu ' + cfg.maxStory + ' Zeichen), mit „Demo“-Wasserzeichen.'; },
      long: function (n, m) { return 'Die Demo malt aus bis zu ' + n + ' Zeichen (deine: ' + m + '). Kürze den Text etwas – die Vollversion hat keine Grenze.'; },
      free: 'Kostenlose Demo, mit Wasserzeichen. Die Vollversion, ohne:',
      noteFree: function () { return 'Kostenlos im Browser ausprobieren, so oft du willst – mit „Demo“-Wasserzeichen, Geschichten bis ' + cfg.maxStory + ' Zeichen.'; },
    },
    ar: {
      left: function (n) { return n === 0 ? 'لا توجد محاولات مجانية متبقية' : n === 1 ? 'محاولة مجانية واحدة متبقية' : n === 2 ? 'محاولتان مجانيتان متبقيتان' : n + ' محاولات مجانية متبقية'; },
      title: 'انتهت تجربتك المجانية!',
      text: 'النسخة الكاملة من تونارو ترسم بدون علامة مائية، بقدر ما تشاء، وتعمل دون إنترنت على جهازك.',
      contact: 'مهتم؟ راسلنا:',
      close: 'العودة إلى رسوماتي',
      note: function (n) { return 'جرّبه مجانًا في المتصفح: ' + n + ' صور أو مقاطع (قصة حتى ' + cfg.maxStory + ' حرف)، مع علامة «تجريبي».'; },
      long: function (n, m) { return 'النسخة التجريبية ترسم من ' + n + ' حرف كحد أقصى (نصك: ' + m + '). اختصره قليلًا، فالنسخة الكاملة بلا حدود.'; },
      free: 'نسخة تجريبية مجانية بعلامة مائية. النسخة الكاملة بدونها:',
      noteFree: function () { return 'جرّبه مجانًا في المتصفح بقدر ما تشاء – مع علامة «تجريبي» وقصص حتى ' + cfg.maxStory + ' حرف.'; },
    },
  };
  var t = function (k) { return T[lang()][k]; };

  // ---- The mark on every picture the studio draws (the engine's answers, in build-web's head script)
  var size = function (svg) {
    var m = svg.match(/viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    if (m) return { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
    var w = svg.match(/^[^>]*\swidth="([\d.]+)/), h = svg.match(/^[^>]*\sheight="([\d.]+)/);
    return w && h ? { x: 0, y: 0, w: +w[1], h: +h[1] } : null;
  };
  var mark = function (svg) {
    var b = size(svg);
    // (pictures only: not the small icons and previews)
    if (!b || b.w < 300 || b.h < 160 || svg.indexOf('tn-demo-mark') >= 0) return svg;
    var s = Math.min(b.w, b.h) / 360, r = function (v) { return Math.round(v * 10) / 10; };
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2, fs = Math.min(b.w, b.h) * 0.15;
    var pw = 128 * s, ph = 26 * s, px = b.x + b.w - pw - 10 * s, py = b.y + 10 * s;
    var g = '<g class="tn-demo-mark" pointer-events="none" aria-hidden="true">'
      + '<text x="' + r(cx) + '" y="' + r(cy) + '" transform="rotate(-24 ' + r(cx) + ' ' + r(cy) + ')" text-anchor="middle" dominant-baseline="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="' + r(fs) + '" fill="#ffffff" fill-opacity="0.3" stroke="#1e1b4b" stroke-opacity="0.16" stroke-width="' + r(1.4 * s) + '">Toonaro demo</text>'
      + '<rect x="' + r(px) + '" y="' + r(py) + '" width="' + r(pw) + '" height="' + r(ph) + '" rx="' + r(ph / 2) + '" fill="#1e1b4b" fill-opacity="0.62"/>'
      + '<text x="' + r(px + pw / 2) + '" y="' + r(py + ph * 0.68) + '" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" font-size="' + r(13 * s) + '" fill="#ffffff">Toonaro · demo</text></g>';
    var i = svg.lastIndexOf('</svg>');
    return i < 0 ? svg : svg.slice(0, i) + g + svg.slice(i);
  };
  var markAll = function (v) {
    if (typeof v === 'string') return /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/.test(v) ? mark(v) : v;
    if (Array.isArray(v)) return v.map(markAll);
    if (v && typeof v === 'object') for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) v[k] = markAll(v[k]);
    return v;
  };
  if (studio) window.__toonaroMark = markAll;

  // ---- Looks: the tries badge and the last word
  var css = '.tn-demo-left{display:inline-flex;align-items:center;gap:6px;margin:8px 0 0;padding:4px 12px;border-radius:999px;background:#fff7ed;color:#c2410c;font:800 .85rem Nunito,"Baloo Bhaijaan 2",sans-serif;border:1px solid #fed7aa}'
    + '.tn-demo-left.none{background:#fef2f2;color:#b91c1c;border-color:#fecaca}'
    + '.tn-demo-end{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:grid;place-items:center;padding:16px}'
    + '.tn-demo-end .box{background:#fff;border-radius:24px;max-width:440px;width:100%;padding:24px 24px 20px;text-align:center;box-shadow:0 20px 60px rgba(15,23,42,.3);font-family:Nunito,"Baloo Bhaijaan 2",sans-serif;color:#1e293b}'
    + '.tn-demo-end img{width:130px;height:auto;margin:-6px auto 4px;display:block}'
    + '.tn-demo-end h2{margin:0 0 8px;font-size:1.4rem;font-weight:900}.tn-demo-end p{margin:0 0 12px;line-height:1.5;font-weight:600;color:#475569}'
    + '.tn-demo-end a.mail{font-weight:900;color:#ea580c;text-decoration:none}.tn-demo-end button{margin-top:6px;border:0;border-radius:999px;padding:10px 20px;font-weight:900;font-size:1rem;font-family:inherit;color:#fff;background:linear-gradient(135deg,#fb923c,#f43f5e);cursor:pointer}'
    + '.tn-demo-note{margin:10px 0 0;font-weight:800;color:#c2410c;font-size:.95rem}'
    + '.tn-demo-count{font:700 .8rem Nunito,"Baloo Bhaijaan 2",sans-serif;color:#64748b;margin:4px 0 0}.tn-demo-count.over{color:#b91c1c;font-weight:900}'
    + '.tn-demo-long{margin:8px 0 0;padding:8px 12px;border-radius:12px;background:#fef2f2;color:#b91c1c;font:800 .9rem Nunito,"Baloo Bhaijaan 2",sans-serif}';
  var addCss = function () { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); };

  var badge = null;
  var showLeft = function () {
    if (!badge) return;
    if (unlimited) {
      // (no tries to count: what the demo is, and where the full version is)
      badge.textContent = '✨ ' + t('free') + ' ';
      badge.className = 'tn-demo-left';
      if (cfg.contact && badge.appendChild) {
        var a = document.createElement('a');
        a.textContent = cfg.contact;
        a.href = 'mailto:' + cfg.contact + '?subject=Toonaro';
        a.style.cssText = 'color:inherit;font-weight:900';
        badge.appendChild(a);
      }
      return;
    }
    var n = left();
    badge.textContent = '✨ ' + t('left')(n);
    badge.className = 'tn-demo-left' + (n ? '' : ' none');
  };
  var showEnd = function () {
    if (document.querySelector('.tn-demo-end')) return;
    var o = document.createElement('div');
    o.className = 'tn-demo-end';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="box" dir="' + (lang() === 'ar' ? 'rtl' : 'ltr') + '"><img src="/brand/toonaro-mascot.svg" alt=""><h2></h2><p class="t"></p>'
      + (cfg.contact ? '<p class="c"><span></span> <a class="mail"></a></p>' : '') + '<button type="button"></button></div>';
    o.querySelector('h2').textContent = t('title');
    o.querySelector('.t').textContent = t('text');
    if (cfg.contact) {
      o.querySelector('.c span').textContent = t('contact');
      var a = o.querySelector('a.mail');
      a.textContent = cfg.contact;
      a.href = 'mailto:' + cfg.contact + '?subject=Toonaro';
    }
    var close = function () { o.remove(); };
    o.querySelector('button').textContent = t('close');
    o.querySelector('button').addEventListener('click', close);
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.body.appendChild(o);
    o.querySelector('button').focus();
  };

  // ---- The studio: each picture or clip asked for is a try (Draw, Enter, an example chip; a link
  // that opens the studio with words); changing the style or moving things is free
  if (studio) {
    var q = new URLSearchParams(location.search);
    if (q.get('text') && !unlimited) {
      if (left() > 0) setUsed(used() + 1);
      else {
        // (no tries left: the studio opens with its own first picture, and says so)
        q.delete('text');
        history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
        window.addEventListener('load', function () { setTimeout(showEnd, 600); });
      }
    }
    var stop = function (e) { e.preventDefault(); e.stopImmediatePropagation(); };
    // (what the visitor typed, and how long it may be: the story box when it shows, else the line)
    var typed = function () {
      var story = document.getElementById('story-text');
      if (story && !story.hidden) return { len: story.value.trim().length, max: cfg.maxStory };
      var line = document.getElementById('prompt-input');
      return { len: line ? line.value.trim().length : 0, max: cfg.maxPrompt };
    };
    var sayLong = function (w) {
      var box = document.querySelector('.tn-demo-long');
      if (!w) { if (box) box.remove(); return; }
      if (!box && badge && badge.parentElement) { box = document.createElement('div'); box.className = 'tn-demo-long'; box.setAttribute('role', 'alert'); badge.parentElement.insertBefore(box, badge.nextSibling); }
      if (box) box.textContent = t('long')(w.max, w.len);
    };
    // own: the visitor's words (Draw, Enter, Notes -> explainer); else Toonaro's own examples
    var gate = function (e, own) {
      if (left() <= 0) { stop(e); showLeft(); showEnd(); return; }
      if (own) {
        var w = typed();
        if (w.len > w.max) { stop(e); sayLong(w); return; }
      }
      sayLong(null);
      if (unlimited) return;
      setUsed(used() + 1);
      showLeft();
    };
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('#btn-generate, #btn-notes-outline, .chip, .story-preset-btn');
      if (el) gate(e, el.id === 'btn-generate' || el.id === 'btn-notes-outline');
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target) return;
      if (e.target.id === 'prompt-input' || (e.target.id === 'story-text' && (e.ctrlKey || e.metaKey))) gate(e, true);
    }, true);
  }

  document.addEventListener('DOMContentLoaded', function () {
    addCss();
    if (studio) {
      var btn = document.getElementById('btn-generate');
      if (btn && btn.parentElement) {
        badge = document.createElement('div');
        badge.setAttribute('aria-live', 'polite');
        btn.parentElement.parentElement.insertBefore(badge, btn.parentElement.nextSibling);
        showLeft();
      }
      var line = document.getElementById('prompt-input');
      if (line) line.maxLength = cfg.maxPrompt;
      // (the story box: how many characters, of how many)
      var story = document.getElementById('story-text');
      if (story && badge) {
        var count = document.createElement('div');
        count.className = 'tn-demo-count';
        badge.parentElement.insertBefore(count, badge);
        var tick = function () {
          var n = story.value.trim().length;
          count.hidden = story.hidden;
          count.textContent = n + ' / ' + cfg.maxStory;
          count.className = 'tn-demo-count' + (n > cfg.maxStory ? ' over' : '');
          if (n <= cfg.maxStory) sayLong(null);
        };
        story.addEventListener('input', tick);
        new MutationObserver(tick).observe(story, { attributes: true, attributeFilter: ['hidden'] });
        setInterval(tick, 1000); // (the studio also fills the box itself)
        tick();
      }
    } else if (location.pathname === '/' || /index\.html$/.test(location.pathname)) {
      // (the landing page: what the demo is, under the buttons)
      var ctas = document.querySelector('.ctas');
      if (ctas) {
        var p = document.createElement('p');
        p.className = 'tn-demo-note';
        ctas.parentElement.insertBefore(p, ctas.nextSibling);
        badge = { set textContent(v) {}, set className(v) {} };
        var say = function () { p.textContent = '✨ ' + (unlimited ? t('noteFree')() : t('note')(cfg.tries)); };
        say();
        new MutationObserver(say).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      }
    }
    // (the words follow the language switch)
    new MutationObserver(showLeft).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  });
})();
