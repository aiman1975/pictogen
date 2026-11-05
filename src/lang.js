// Language packs: the words PictoGen reads text by, one pack per language - English and German so
// far (Arabic next, Spanish after). The outline's own words ("## Recap", "## Zusammenfassung",
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
      [/(geld|bargeld|einkommen|gehalt|lohn|preis|kosten|bezahl|budget|vermögen|gewinn|verdien|gebühr)/i, 'money_bag'],
      [/(spar|münze|cent\b)/i, 'coin'],
      [/(zins|wachs|wachstum|steig|zunahme|rendite|anlage|investi|aktie|börse|markt)/i, 'chart_increasing'],
      [/(verlust|sink|rückgang|fall|schulden|inflation)/i, 'chart_decreasing'],
      [/(daten|statistik|zahlen|ergebnis|umfrage|prozent|durchschnitt|diagramm)/i, 'bar_chart'],
      [/(zeit|jahre|jahrzehnt|monat|langfristig|geduld|warte|früh|später|frist)/i, 'hourglass_not_done'],
      [/(uhr|stunde|minute|zeitplan|routine|morgens|wecker)/i, 'alarm_clock'],
      [/(kalender|datum|termin|woche|planung|plan\b)/i, 'calendar'],
      [/(warnung|warn|risiko|riskant|gefahr|gefährlich|vorsicht|bedrohung|betrug|phishing|fehler|achtung)/i, 'warning'],
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
};

/** The language a text is written in: 'de' or 'en' (more to come); English when unsure */
export function detectLanguage(text) {
  const s = String(text ?? '').toLowerCase();
  const ws = s.match(/\p{L}+/gu) ?? [];
  if (!ws.length) return 'en';
  // (German's own letters count too)
  const umlauts = (s.match(/[äöüß]/g) ?? []).length;
  // (words only one of them has: "in", "so", "will", "also" are both German and English)
  const de = ws.filter((w) => LANGS.de.stop.has(w) && !LANGS.en.stop.has(w)).length + umlauts * 0.5;
  const en = ws.filter((w) => LANGS.en.stop.has(w) && !LANGS.de.stop.has(w)).length;
  return de > en * 1.2 && de >= 2 ? 'de' : 'en';
}

/** A language's pack ('de', 'en'...), English when there is none */
export const langPack = (code) => LANGS[code] ?? LANGS.en;
