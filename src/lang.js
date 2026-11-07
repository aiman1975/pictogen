// Language packs: the words PictoGen reads text by, one pack per language - English, German and
// Arabic so far (Spanish next); rtl: written right to left. The outline's own words ("## Recap", "## Zusammenfassung",
// "Show:", "Bild:") are read in every language at once (src/slides.js); the writer (src/writer.js)
// reads notes by the pack of the language they are written in (detectLanguage).
//   stop        small words that say little (for scoring sentences, and to tell languages apart)
//   openers     filler a point may start with ("However,", "Außerdem")
//   trail       words a shortened line must not end on
//   breaks      words a long sentence may be cut before
//   stat        a number worth showing big, with its unit
//   approx      words before a number that only round it ("about", "etwa")
//   labelLead   how the words after a number begin when they say what it counts ("of", "aller")
//   stepWords   how a step begins ("First", "Zuerst")
//   stepHead    a heading about doing something step by step
//   summaryHead a heading of the notes' own summary
//   abbr        abbreviations whose full stop does not end a sentence
//   quoteVerbs  how someone's words are said to be theirs ("says", "sagt")
//   isVerbs     "X is/are ..." (what a text is about: its title)
//   howTo       a title about doing something
//   versus      "A vs B"
//   texts       the writer's own words: the recap's headline, steps without a heading, a title
//   pictures    words -> library pictures, for explainer cards (src/slides.js picturesFor)

const set = (s) => new Set(s.trim().split(/\s+/));

export const LANGS = {
  en: {
    code: 'en',
    name: 'English',
    stop: set(`a an the and or but if then than so of to in on at by for with from into onto over under about as is are was were be been being
      have has had do does did not no yes it its it's this that these those there here their they them we us our you your he she him her his i me my
      can could will would should may might must shall also just very more most much many some any each every other such only own same too
      what which who whom whose when where why how all both few one two what's let's get gets got make makes made like way ways thing things
      use used using new well even still yet however because while although though since during after before through per via etc`),
    openers: /^(however|moreover|furthermore|additionally|in addition|also|so|and|but|then|therefore|thus|of course|in fact|for example|for instance|in other words|on the other hand|as a result|in short|in summary|to sum up|finally|first|firstly|second|secondly|third|thirdly|next|lastly|overall|basically|essentially|importantly|indeed|today|now|in general|generally|actually|that said|plus)\s*[,:]?\s+/i,
    trail: set('a an the and or but of to in on at by for with from into as is are was were be been that which who than so if its their your our his her this these those such like including e.g. i.e.'),
    breaks: /^(which|that|because|while|although|though|so|but|and|where|when|who|since|unless|whereas|as|if)$/i,
    stat: /(?:[$€£¥]\s?)?\d[\d,.]*(?:\s?[-–]\s?\d[\d,.]*)?\s?(?:%|percent\b|per cent\b|million\b|billion\b|trillion\b|thousand\b|times\b|x\b|k\b|years?\b|months?\b|days?\b|hours?\b|minutes?\b)/i,
    approx: /^(about|around|nearly|almost|over|roughly|approximately|some|just|up|only)$/,
    labelLead: /^(of|in|a|per|more|less|fewer|of the|are|is|have|has|will|can|each|every|for)\b/i,
    stepWords: /^(?:to [^,]{1,30},\s*)?(first|firstly|second|secondly|third|then|next|after that|afterwards|finally|lastly|step \d+|to start|start by|begin by)\b/i,
    stepHead: /\b(how to|steps?|process|getting started|get started|what to do|checklist|guide|routine|plan)\b/i,
    summaryHead: /^(summary|conclusion|in conclusion|takeaways?|key takeaways|tl;?dr|to sum up|in short|bottom line|recap|wrap[- ]up)\b/i,
    abbr: /\b(Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e|approx|incl|No|Inc|Ltd|Co|U\.S|U\.K|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\./g,
    quoteVerbs: 'said|says|wrote|writes|according to',
    isVerbs: 'is|are|was|were|means|refers to|can be',
    howTo: /^how to\b/i,
    versus: /\s+(?:vs\.?|versus)\s+/i,
    texts: { recap: 'Recap', steps: 'Step by step', title: 'An explainer' },
    pictures: [], // (src/slides.js has the English ones)
  },

  de: {
    code: 'de',
    name: 'Deutsch',
    stop: set(`der die das den dem des ein eine einen einem einer eines und oder aber denn doch sondern wenn als wie ob dass weil da damit
      ist sind war waren bin bist sein seid wird werden wurde wurden hat haben hatte hatten habe kann können konnte muss müssen soll sollen will wollen
      darf dürfen mag möchte möchten es er sie ihr ihm ihn ihnen wir uns du dich dir ich mich mir man sich mein dein sein unser euer ihre ihren
      dieser diese dieses diesen diesem jener jede jeder jedes jeden alle allem allen aller alles kein keine keinen nicht nichts nur auch noch schon
      sehr mehr viel viele vielen wenig wenige so zu zum zur im in am an auf aus bei mit nach von vor über unter um durch für gegen ohne bis seit
      hier dort da dann jetzt heute immer nie oft mal etwa ganz gar eben eigentlich einfach also etwas dabei dazu davon damit darauf daran darum
      was wer wo wann warum wieso welche welcher welches dessen deren`),
    openers: /^(außerdem|zudem|jedoch|aber|also|deshalb|daher|darum|trotzdem|übrigens|zum beispiel|beispielsweise|insgesamt|kurz gesagt|tatsächlich|eigentlich|natürlich|heute|jetzt|auch|und|so|dann|zuerst|zunächst|danach|anschließend|schließlich|zum schluss|als erstes|erstens|zweitens|drittens|weiterhin|ebenso|allerdings|im grunde|grundsätzlich|vor allem|wichtig ist|nun)\s*[,:]?\s+/i,
    trail: set('der die das den dem des ein eine einen einem einer eines und oder aber von zu zum zur im in am an auf aus bei mit für als wie dass ist sind war sich so z.B. etwa'),
    breaks: /^(weil|da|während|obwohl|dass|wenn|aber|und|sodass|damit|denn|sondern|der|die|das|welche|welcher|wobei|wodurch)$/i,
    stat: /(?:[$€£¥]\s?)?\d[\d.,]*(?:\s?[-–]\s?\d[\d.,]*)?\s?(?:%|prozent\b|mio\.?|mrd\.?|millionen\b|million\b|milliarden\b|milliarde\b|billionen\b|tausend\b|mal\b|jahre?n?\b|monate?n?\b|wochen?\b|tage?n?\b|stunden?\b|minuten?\b|euro\b)/i,
    approx: /^(etwa|rund|ungefähr|fast|über|knapp|circa|ca|nur|mehr|als|bis|zu)$/,
    labelLead: /^(der|die|des|aller|von|in|im|pro|mehr|weniger|sind|ist|haben|hat|werden|wird|kann|können|jede[rsn]?|für|aus)\b/i,
    stepWords: /^(zuerst|zunächst|als erstes|als nächstes|erstens|zweitens|drittens|dann|danach|anschließend|schließlich|zum schluss|zuletzt|am ende|schritt \d+)\b/i,
    stepHead: /(so geht|so gehst du vor|anleitung|schritte|schritt für schritt|ablauf|vorgehen|checkliste|plan|in \d+ schritten|wie du)/i,
    summaryHead: /^(zusammenfassung|fazit|kurz gesagt|das wichtigste|merke|auf einen blick|kurzfassung|ergebnis)\b/i,
    abbr: /(?<![\p{L}])(z\.\s?B|d\.\s?h|u\.\s?a|bzw|ca|Dr|Prof|Nr|usw|etc|evtl|ggf|inkl|Mio|Mrd|Str|Jh|vgl|sog|bzgl)\./gu,
    quoteVerbs: 'sagt|sagte|meint|meinte|erklärt|erklärte|schreibt|schrieb|so',
    isVerbs: 'ist|sind|war|waren|bedeutet|heißt|nennt man',
    howTo: /^(wie (du|man|sie)|so (geht|gelingt)|anleitung)\b/i,
    versus: /\s+(?:vs\.?|versus|gegen|gegenüber)\s+/i,
    texts: { recap: 'Zusammenfassung', steps: 'Schritt für Schritt', title: 'Ein Erklärvideo' },
    // Pictures for German words (a word's start: "Passwort", "Passwörter", "Sicherheitspasswort")
    pictures: [
      // (a warning first: "Warnzeichen ist Zeitdruck" is a warning more than a time)
      [/(warnung|warn|risiko|riskant|gefahr|gefährlich|vorsicht|bedrohung|betrug|phishing|fehler|achtung)/i, 'warning'],
      [/(geld|bargeld|einkommen|gehalt|lohn|preis|kosten|bezahl|budget|vermögen|gewinn|verdien|gebühr)/i, 'money_bag'],
      [/(spar|münze|cent\b)/i, 'coin'],
      [/(zins|wachs|wachstum|steig|zunahme|rendite|anlage|investi|aktie|börse|markt)/i, 'chart_increasing'],
      [/(verlust|sink|rückgang|fall|schulden|inflation)/i, 'chart_decreasing'],
      [/(daten|statistik|zahlen|ergebnis|umfrage|prozent|durchschnitt|diagramm)/i, 'bar_chart'],
      [/(zeit|jahre|jahrzehnt|monat|langfristig|geduld|warte|früh|später|frist)/i, 'hourglass_not_done'],
      [/(uhr|stunde|minute|zeitplan|routine|morgens|wecker)/i, 'alarm_clock'],
      [/(kalender|datum|termin|woche|planung|plan\b)/i, 'calendar'],
      [/(passwort|passwörter|kennwort|schloss|sicherheit|sicher\b|datenschutz|privat|verschlüssel|anmeld|konto)/i, 'locked'],
      [/(schlüssel|zugang|zugriff)/i, 'key'],
      [/(schutz|schütz|versicherung)/i, 'shield'],
      [/(idee|einfall|tipp|trick|kreativ|innovation)/i, 'light_bulb'],
      [/(gehirn|lernen|lern|gedächtnis|erinner|wissen|verstehen|konzentration)/i, 'brain'],
      [/(prüf|richtig|erledigt|bestätig|kontroll)/i, 'check_mark_button'],
      [/(warum|frage|wieso|weshalb|unbekannt)/i, 'red_question_mark'],
      [/(e-mail|email|mail\b|posteingang|nachricht)/i, 'e_mail'],
      [/(computer|rechner|laptop|software|online|internet|webseite|website|digital)/i, 'laptop'],
      [/(handy|smartphone|telefon|app\b|apps\b)/i, 'mobile_phone'],
      [/(welt|global|land\b|länder|erde|international)/i, 'globe_showing_europe_africa'],
      [/(erfolg|gewinn|ziel|sieg|preis\b|auszeichnung|bester|beste\b)/i, 'trophy'],
      [/(start|schnell|tempo|beschleunig)/i, 'rocket'],
      [/(prozess|system|einstellung|technik|maschine|automati)/i, 'gear'],
      [/(haus|wohnung|miete|zuhause|heim\b)/i, 'house'],
      [/(bank\b|banken|kredit|darlehen)/i, 'bank'],
      [/(buch|bücher|lesen|studie|forschung|schule|unterricht|kurs)/i, 'books'],
      [/(team|gemeinsam|zusammen|partner|vertrag|vertrauen)/i, 'handshake'],
      [/(gesundheit|gesund|herz|liebe|pflege)/i, 'red_heart'],
      [/(energie|strom|elektr)/i, 'high_voltage'],
      [/(sonne|solar|sommer|licht)/i, 'sun'],
      [/(pflanze|natur|garten|samen|gewohnheit|kleine schritte)/i, 'seedling'],
      [/(such|finden|entdeck|erforsch)/i, 'magnifying_glass_tilted_left'],
      [/(sprech|sagen|reden|kommunikation|feedback|gespräch)/i, 'speech_balloon'],
      [/(schlaf|ruhe|müde|nacht|bett\b)/i, 'bed'],
      [/(einkauf|kauf|kunde|ausgabe|ausgeben)/i, 'shopping_cart'],
      [/(karte|zahlung)/i, 'credit_card'],
      [/(wissenschaft|experiment|labor|versuch)/i, 'test_tube'],
      [/(werkzeug|reparatur|reparier|bauen)/i, 'hammer_and_wrench'],
      [/(arbeit|beruf|job|firma|unternehmen|büro)/i, 'briefcase'],
      [/(wasser|trinken|meer|regen)/i, 'droplet'],
      [/(essen|ernährung|obst|lebensmittel)/i, 'red_apple'],
      [/(sport|bewegung|laufen|fitness|training)/i, 'running_shoe'],
      [/(\bki\b|künstliche intelligenz|roboter)/i, 'robot'],
      [/(feier|glückwunsch|party)/i, 'party_popper'],
    ],
  },

  ar: {
    code: 'ar',
    name: 'العربية',
    rtl: true,
    stop: set(`في من على إلى الى عن مع هذا هذه ذلك تلك التي الذي الذين اللذين هو هي هم هن نحن أنت أنتم أنا كان كانت كانوا يكون تكون
      كل بعض أو و ثم لكن لأن إذا إن أن قد لا لم لن ما ماذا كيف متى أين لماذا هل عند بين بعد قبل حتى أيضا أيضًا فقط جدا جدًا أكثر أقل كما
      مثل لدى له لها لهم به بها فيه فيها منه منها عليه عليها يمكن يجب ليس ليست غير هناك هنا كذلك حيث التى وهو وهي وفي ومن وعلى أي إلا`),
    openers: /^(لكن|ولكن|كما|أيضًا|أيضا|بالإضافة إلى ذلك|علاوة على ذلك|لذلك|لذا|وبالتالي|بالتالي|في الواقع|على سبيل المثال|مثلًا|مثلا|باختصار|بشكل عام|عمومًا|عموما|اليوم|الآن|أولًا|أولا|ثانيًا|ثانيا|ثالثًا|ثالثا|ثم|بعد ذلك|أخيرًا|أخيرا|في النهاية|وأخيرًا|وأخيرا|كذلك|إذن)\s*[،,:]?\s+/u,
    trail: set('في من على إلى عن مع و أو ثم أن إن التي الذي هو هي هذا هذه ذلك تلك لكن مثل كما'),
    breaks: /^(لأن|بينما|رغم|الذي|التي|الذين|حيث|عندما|لكن|ولكن|و|أو|إذا|حتى|كي|لكي|مما|كما)$/u,
    stat: /(?:[$€£¥]\s?)?[0-9٠-٩][0-9٠-٩,.٫٬]*(?:\s?[-–]\s?[0-9٠-٩][0-9٠-٩,.٫٬]*)?\s?(?:%|٪|في المئة|في المائة|بالمئة|بالمائة|مليون|مليار|ألف|آلاف|مرة|مرات|سنة|سنوات|أعوام|عامًا|عاما|عام|شهرًا|شهرا|شهر|أشهر|شهور|أسبوعًا|أسبوع|أسابيع|يومًا|يوما|يوم|أيام|ساعة|ساعات|دقيقة|دقائق|دولار|يورو|ريال|درهم|جنيه|دينار)(?![\p{L}])/u,
    approx: /^(حوالي|حوالى|نحو|تقريبًا|تقريبا|أكثر|أقل|قرابة|فقط|ما|يقارب|من)$/u,
    labelLead: /^(من|في|لكل|أكثر|أقل|هم|هي|هو|يمكن|كل|ل|لل|سنويا|سنويًا)/u,
    stepWords: /^(أولًا|أولا|ثانيًا|ثانيا|ثالثًا|ثالثا|رابعًا|رابعا|ثم|بعد ذلك|وبعد ذلك|بعدها|أخيرًا|أخيرا|وأخيرًا|وأخيرا|في النهاية|الخطوة [0-9٠-٩]+|ابدأ|ابدئي)(?![\p{L}])/u,
    stepHead: /(كيف|خطوات|الخطوات|خطوة بخطوة|طريقة|دليل|قائمة|ماذا تفعل)/u,
    summaryHead: /^(الخلاصة|خلاصة|ملخص|الملخص|باختصار|أهم النقاط|النقاط الرئيسية|تذكر|تذكّر|الخاتمة|خاتمة)/u,
    abbr: /(?!)x/g,
    quoteVerbs: 'قال|قالت|يقول|تقول|كتب|كتبت|يوضح|توضح|أوضح|أوضحت|بحسب|حسب|وفقًا ل|وفقا ل',
    isVerbs: 'هو|هي|هم|يعني|تعني|هو عبارة عن|هي عبارة عن',
    howTo: /^كيف/u,
    versus: /\s+(?:vs\.?|versus|مقابل|ضد|أم|في مواجهة)\s+/u,
    texts: { recap: 'الخلاصة', steps: 'خطوة بخطوة', title: 'فيديو توضيحي' },
    // Pictures for Arabic words (part of a word: Arabic adds "ال", "و", "ب", "ل" in front and endings
    // after - "المال", "وأموالك", "بالمال")
    pictures: [
      // (a warning first, as in the others)
      [/(تحذير|خطر|خطير|احذر|انتبه|احتيال|نصب|تصيد|خطأ|أخطاء|تهديد)/u, 'warning'],
      [/(تسوق|شراء|اشتر|عميل|عملاء|مشتريات)/u, 'shopping_cart'],
      [/(مال|أموال|نقود|نقد|دخل|راتب|أجر|سعر|أسعار|تكلفة|تكاليف|دفع|ميزانية|ثروة|ربح|أرباح|رسوم)/u, 'money_bag'],
      [/(ادخار|ادخر|توفير|وفر|عملة|عملات)/u, 'coin'],
      [/(فائدة|فوائد|نمو|ينمو|تنمو|زيادة|ارتفاع|عائد|استثمار|أسهم|سهم|بورصة|سوق|أسواق)/u, 'chart_increasing'],
      [/(خسارة|خسائر|انخفاض|هبوط|تراجع|ديون|دين|تضخم)/u, 'chart_decreasing'],
      [/(بيانات|إحصاء|إحصائيات|أرقام|نتائج|نتيجة|استطلاع|نسبة|متوسط|رسم بياني)/u, 'bar_chart'],
      [/(وقت|الزمن|سنوات|عقود|أشهر|طويل الأمد|صبر|انتظار|مبكر|لاحق|موعد نهائي)/u, 'hourglass_not_done'],
      [/(ساعة|ساعات|دقائق|جدول|روتين|صباح|منبه)/u, 'alarm_clock'],
      [/(تقويم|تاريخ|موعد|أسبوع|خطة|تخطيط)/u, 'calendar'],
      [/(كلمة المرور|كلمات المرور|كلمة السر|قفل|أمان|أمن|آمن|خصوصية|تشفير|تسجيل الدخول|حساب)/u, 'locked'],
      [/(مفتاح|مفاتيح|وصول)/u, 'key'],
      [/(حماية|احم|يحمي|تحمي|تأمين|درع)/u, 'shield'],
      [/(فكرة|أفكار|نصيحة|نصائح|إبداع|ابتكار|حيلة)/u, 'light_bulb'],
      [/(دماغ|عقل|تعلم|تعلّم|ذاكرة|تذكر|معرفة|فهم|تركيز)/u, 'brain'],
      [/(تحقق|صحيح|مكتمل|تأكد|تأكيد)/u, 'check_mark_button'],
      [/(لماذا|سؤال|أسئلة|مجهول)/u, 'red_question_mark'],
      [/(بريد|إيميل|رسالة|رسائل)/u, 'e_mail'],
      [/(حاسوب|كمبيوتر|برنامج|برمجيات|إنترنت|انترنت|موقع|رقمي|أونلاين)/u, 'laptop'],
      [/(هاتف|جوال|موبايل|تطبيق|تطبيقات)/u, 'mobile_phone'],
      [/(عالم|عالمي|دول|دولة|الأرض|دولي)/u, 'globe_showing_europe_africa'],
      [/(نجاح|هدف|أهداف|فوز|جائزة|الأفضل)/u, 'trophy'],
      [/(انطلاق|سريع|سرعة|تسريع)/u, 'rocket'],
      [/(نظام|عملية|تقنية|تكنولوجيا|آلة|أتمتة|إعدادات)/u, 'gear'],
      [/(منزل|بيت|إيجار|سكن)/u, 'house'],
      [/(بنك|بنوك|مصرف|قرض|قروض|ائتمان)/u, 'bank'],
      [/(كتاب|كتب|قراءة|دراسة|بحث علمي|مدرسة|درس|دروس|دورة)/u, 'books'],
      [/(فريق|معًا|معا|شراكة|شريك|ثقة|اتفاق)/u, 'handshake'],
      [/(صحة|صحي|قلب|حب|رعاية)/u, 'red_heart'],
      [/(طاقة|كهرباء)/u, 'high_voltage'],
      [/(شمس|شمسي|صيف|ضوء)/u, 'sun'],
      [/(نبات|طبيعة|حديقة|بذرة|عادة|عادات|خطوات صغيرة)/u, 'seedling'],
      [/(بحث|ابحث|اكتشاف|اكتشف|استكشاف)/u, 'magnifying_glass_tilted_left'],
      [/(تحدث|كلام|تواصل|حوار|محادثة|ملاحظات)/u, 'speech_balloon'],
      [/(نوم|نام|راحة|متعب|ليل|سرير)/u, 'bed'],
      [/(بطاقة|بطاقات)/u, 'credit_card'],
      [/(علوم|تجربة|مختبر|تجارب)/u, 'test_tube'],
      [/(أداة|أدوات|إصلاح|بناء)/u, 'hammer_and_wrench'],
      [/(وظيفة|شركة|شركات|مكتب|مهنة)/u, 'briefcase'],
      [/(ماء|مياه|شرب|بحر|مطر)/u, 'droplet'],
      [/(طعام|غذاء|أكل|فاكهة|تغذية)/u, 'red_apple'],
      [/(رياضة|تمرين|تمارين|جري|لياقة)/u, 'running_shoe'],
      [/(ذكاء اصطناعي|روبوت)/u, 'robot'],
      [/(احتفال|تهنئة|مبروك|حفلة)/u, 'party_popper'],
    ],
  },
};

/** The language a text is written in: 'ar', 'de' or 'en' (more to come); English when unsure */
export function detectLanguage(text) {
  const s = String(text ?? '').toLowerCase();
  const ws = s.match(/\p{L}+/gu) ?? [];
  if (!ws.length) return 'en';
  // (Arabic: by its letters - more Arabic than Latin ones)
  const arabic = (s.match(/[\u0621-\u064A]/g) ?? []).length, latin = (s.match(/[a-zäöüß]/g) ?? []).length;
  if (arabic > latin) return 'ar';
  // (German's own letters count too)
  const umlauts = (s.match(/[äöüß]/g) ?? []).length;
  // (words only one of them has: "in", "so", "will", "also" are both German and English)
  const de = ws.filter((w) => LANGS.de.stop.has(w) && !LANGS.en.stop.has(w)).length + umlauts * 0.5;
  const en = ws.filter((w) => LANGS.en.stop.has(w) && !LANGS.de.stop.has(w)).length;
  return de > en * 1.2 && de >= 2 ? 'de' : 'en';
}

/** A language's pack ('de', 'en'...), English when there is none */
export const langPack = (code) => LANGS[code] ?? LANGS.en;
