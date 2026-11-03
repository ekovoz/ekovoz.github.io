// ============================================================================
// web/i18n_ui.js — Diccionarios Políglotas de Interfaz (18 Lenguas Puente)
// Trazabilidad: Ronda 13 (D1, D2, DEB-R13-02, DEB-R13-07, GOLD-567)
// ============================================================================
        const languagePacks = [
        {
                "code": "en",
                "name": "English (Default)",
                "autonym": "English",
                "dir": "ltr",
                "script": "Latn"
        },
        {
                "code": "es",
                "name": "Español",
                "autonym": "Español",
                "dir": "ltr",
                "script": "Latn"
        },
        {
                "code": "bn-BD",
                "name": "Bengali — Bangladesh (Kitabul Mokaddos · ঈসা মসীহ)",
                "autonym": "বাংলা (বাংলাদেশ)",
                "dir": "ltr",
                "script": "Beng"
        },
        {
                "code": "bn-IN",
                "name": "Bengali — West Bengal / Traditional (প্রভু যীশু)",
                "autonym": "বাংলা (ভারত/প্রচলিত)",
                "dir": "ltr",
                "script": "Beng"
        },
        {
                "code": "fr",
                "name": "Français",
                "autonym": "Français",
                "dir": "ltr",
                "script": "Latn"
        },
        {
                "code": "pt",
                "name": "Português",
                "autonym": "Português",
                "dir": "ltr",
                "script": "Latn"
        },
        {
                "code": "it",
                "name": "Italiano",
                "autonym": "Italiano",
                "dir": "ltr",
                "script": "Latn"
        },
        {
                "code": "id",
                "name": "Bahasa Indonesia",
                "autonym": "Bahasa Indonesia",
                "dir": "ltr",
                "script": "Latn"
        },
        {
                "code": "tr",
                "name": "Türkçe",
                "autonym": "Türkçe",
                "dir": "ltr",
                "script": "Latn"
        },
        {
                "code": "ru",
                "name": "Русский",
                "autonym": "Русский",
                "dir": "ltr",
                "script": "Cyrl"
        },
        {
                "code": "zh-Hans",
                "name": "Chino Simplificado",
                "autonym": "简体中文",
                "dir": "ltr",
                "script": "Hans"
        },
        {
                "code": "ja",
                "name": "Japonés",
                "autonym": "日本語",
                "dir": "ltr",
                "script": "Jpan"
        },
        {
                "code": "ko",
                "name": "Coreano",
                "autonym": "한국어",
                "dir": "ltr",
                "script": "Kore"
        },
        {
                "code": "hi",
                "name": "Hindi",
                "autonym": "हिन्दी",
                "dir": "ltr",
                "script": "Deva"
        },
        {
                "code": "bn",
                "name": "Bengalí",
                "autonym": "বাংলা",
                "dir": "ltr",
                "script": "Beng"
        },
        {
                "code": "ar",
                "name": "Árabe",
                "autonym": "العربية",
                "dir": "rtl",
                "script": "Arab"
        },
        {
                "code": "ur",
                "name": "Urdu",
                "autonym": "اردو",
                "dir": "rtl",
                "script": "Aran"
        },
        {
                "code": "fa",
                "name": "Persa",
                "autonym": "فارسی",
                "dir": "rtl",
                "script": "Arab"
        }
];

        const previewSlides = [
        {
                "src": "/web/preview/0007.png",
                "caption": {
                        "es": "Lámina 07 · Mateo 5:3b: «…pues ellos son el reino del cielo»",
                        "en": "Plate 07 · Matthew 5:3b: \"...for theirs is the kingdom of heaven\"",
                        "fr": "Planche 07 · Matthieu 5:3b : « …car le royaume des cieux est à eux »",
                        "pt": "Prancha 07 · Mateus 5:3b: «…porque deles é o reino dos céus»",
                        "it": "Tavola 07 · Matteo 5:3b: «…perché di essi è il regno dei cieli»",
                        "id": "Lembar 07 · Matius 5:3b: «…karena merekalah yang empunya Kerajaan Sorga»",
                        "tr": "Levha 07 · Matta 5:3b: «…çünkü Göklerin Egemenliği onlarındır»",
                        "ru": "Лист 07 · Матфея 5:3b: «…ибо их есть Царство Небесное»",
                        "zh-Hans": "图版 07 · 马太福音 5:3b：“……因为天国是他们的”",
                        "ja": "図版 07 · マタイ 5:3b：「……天の御国はその人たちのものだからです」",
                        "ko": "도판 07 · 마태복음 5:3b: “천국이 그들의 것임이요”",
                        "hi": "चित्र 07 · मत्ती 5:3b: \"…क्योंकि स्वर्ग का राज्य उन्हीं का है\"",
                        "bn": "পাতা ০৭ · মথি ৫:৩b: \"…কারণ স্বর্গরাজ্য তাদেরই\"",
                        "ar": "لوحة ٠٧ · متى ٥:٣b: «لأَنَّ لَهُمْ مَلَكُوتَ السَّمَاوَاتِ»",
                        "ur": "تصویر ۰۷ · متی ۵:۳b: ”کیونکہ آسمان کی بادشاہی انہی کی ہے“",
                        "fa": "تصویر ۰۷ · متی ۵:۳b: «زیرا پادشاهی آسمان از آن ایشان است»"
                }
        },
        {
                "src": "/web/preview/0018.png",
                "caption": {
                        "es": "Lámina 18 · Mateo 5:9a: «Felices los pacificadores…»",
                        "en": "Plate 18 · Matthew 5:9a: \"Blessed are the peacemakers...\"",
                        "fr": "Planche 18 · Matthieu 5:9a : « Heureux ceux qui procurent la paix… »",
                        "pt": "Prancha 18 · Mateus 5:9a: «Bem-aventurados os pacificadores…»",
                        "it": "Tavola 18 · Matteo 5:9a: «Beati gli operatori di pace…»",
                        "id": "Lembar 18 · Matius 5:9a: «Berbahagialah orang yang membawa damai…»",
                        "tr": "Levha 18 · Matta 5:9a: «Ne mutlu barışı sağlayanlara…»",
                        "ru": "Лист 18 · Матфея 5:9a: «Блаженны миротворцы…»",
                        "zh-Hans": "图版 18 · 马太福音 5:9a：“使人和睦的人有福了……”",
                        "ja": "図版 18 · マタイ 5:9a：「平和をつくる人たちはさいわいです……」",
                        "ko": "도판 18 · 마태복음 5:9a: “화평하게 하는 자는 복이 있나니…”",
                        "hi": "चित्र 18 · मत्ती 5:9a: \"धन्य हैं वे जो मेल करवाने वाले हैं…\"",
                        "bn": "পাতা ১৮ · মথি ৫:৯a: \"ধন্য তারা যারা শান্তি স্থাপন করে…\"",
                        "ar": "لوحة ١٨ · متى ٥:٩a: «طُوبَى لِصَانِعِي السَّلاَمِ…»",
                        "ur": "تصویر ۱۸ · متی ۵:۹a: ”مبارک ہیں وہ جو صلح کرواتے ہیں…“",
                        "fa": "تصویر ۱۸ · متی ۵:۹a: «خوشابحال صلح‌کنندگان…»"
                }
        },
        {
                "src": "/web/preview/0016.png",
                "caption": {
                        "es": "Lámina 16 · Mateo 5:8a: «Felices los de limpio corazón…»",
                        "en": "Plate 16 · Matthew 5:8a: \"Blessed are the pure in heart...\"",
                        "fr": "Planche 16 · Matthieu 5:8a : « Heureux ceux qui ont le cœur pur… »",
                        "pt": "Prancha 16 · Mateus 5:8a: «Bem-aventurados os limpos de coração…»",
                        "it": "Tavola 16 · Matteo 5:8a: «Beati i puri di cuore…»",
                        "id": "Lembar 16 · Matius 5:8a: «Berbahagialah orang yang suci hatinya…»",
                        "tr": "Levha 16 · Matta 5:8a: «Ne mutlu yüreği temiz olanlara…»",
                        "ru": "Лист 16 · Матфея 5:8a: «Блаженны чистые сердцем…»",
                        "zh-Hans": "图版 16 · 马太福音 5:8a：“清心的人有福了……”",
                        "ja": "図版 16 · マタイ 5:8a：「心の清い人たちはさいわいです……」",
                        "ko": "도판 16 · 마태복음 5:8a: “마음이 청결한 자는 복이 있나니…”",
                        "hi": "चित्र 16 · मत्ती 5:8a: \"धन्य हैं वे जिनके मन शुद्ध हैं…\"",
                        "bn": "পাতা ১৬ · মথি ৫:৮a: \"ধন্য তারা যাদের অন্তর শুচি…\"",
                        "ar": "لوحة ١٦ · متى ٥:٨a: «طُوبَى لأَنْقِيَاءِ الْقَلْبِ…»",
                        "ur": "تصویر ۱۶ · متی ۵:۸a: ”مبارک ہیں وہ جو پاک دل ہیں…“",
                        "fa": "تصویر ۱۶ · متی ۵:۸a: «خوشابحال پاک‌دلان…»"
                }
        }
];

        const plateCaptions = {
        "0007": {
                "es": "Lámina 07 · Mateo 5:3b: «…pues ellos son el reino del cielo»",
                "en": "Plate 07 · Matthew 5:3b: \"...for theirs is the kingdom of heaven\"",
                "fr": "Planche 07 · Matthieu 5:3b : « …car le royaume des cieux est à eux »",
                "pt": "Prancha 07 · Mateus 5:3b: «…porque deles é o reino dos céus»",
                "it": "Tavola 07 · Matteo 5:3b: «…perché di essi è il regno dei cieli»",
                "id": "Lembar 07 · Matius 5:3b: «…karena merekalah yang empunya Kerajaan Sorga»",
                "tr": "Levha 07 · Matta 5:3b: «…çünkü Göklerin Egemenliği onlarındır»",
                "ru": "Лист 07 · Матфея 5:3b: «…ибо их есть Царство Небесное»",
                "zh-Hans": "图版 07 · 马太福音 5:3b：“……因为天国是他们的”",
                "ja": "図版 07 · マタイ 5:3b：「……天の御国はその人たちのものだからです」",
                "ko": "도판 07 · 마태복음 5:3b: “천국이 그들의 것임이요”",
                "hi": "चित्र 07 · मत्ती 5:3b: \"…क्योंकि स्वर्ग का राज्य उन्हीं का है\"",
                "bn": "পাতা ০৭ · মথি ৫:৩b: \"…কারণ স্বর্গরাজ্য তাদেরই\"",
                "ar": "لوحة ٠٧ · متى ٥:٣b: «لأَنَّ لَهُمْ مَلَكُوتَ السَّمَاوَاتِ»",
                "ur": "تصویر ۰۷ · متی ۵:۳b: ”کیونکہ آسمان کی بادشاہی انہی کی ہے“",
                "fa": "تصویر ۰۷ · متی ۵:۳b: «زیرا پادشاهی آسمان از آن ایشان است»"
        },
        "0018": {
                "es": "Lámina 18 · Mateo 5:9a: «Felices los pacificadores…»",
                "en": "Plate 18 · Matthew 5:9a: \"Blessed are the peacemakers...\"",
                "fr": "Planche 18 · Matthieu 5:9a : « Heureux ceux qui procurent la paix… »",
                "pt": "Prancha 18 · Mateus 5:9a: «Bem-aventurados os pacificadores…»",
                "it": "Tavola 18 · Matteo 5:9a: «Beati gli operatori di pace…»",
                "id": "Lembar 18 · Matius 5:9a: «Berbahagialah orang yang membawa damai…»",
                "tr": "Levha 18 · Matta 5:9a: «Ne mutlu barışı sağlayanlara…»",
                "ru": "Лист 18 · Матфея 5:9a: «Блаженны миротворцы…»",
                "zh-Hans": "图版 18 · 马太福音 5:9a：“使人和睦的人有福了……”",
                "ja": "図版 18 · マタイ 5:9a：「平和をつくる人たちはさいわいです……」",
                "ko": "도판 18 · 마태복음 5:9a: “화평하게 하는 자는 복이 있나니…”",
                "hi": "चित्र 18 · मत्ती 5:9a: \"धन्य हैं वे जो मेल करवाने वाले हैं…\"",
                "bn": "পাতা ১৮ · মথি ৫:৯a: \"ধন্য তারা যারা শান্তি স্থাপন করে…\"",
                "ar": "لوحة ١٨ · متى ٥:٩a: «طُوبَى لِصَانِعِي السَّلاَمِ…»",
                "ur": "تصویر ۱۸ · متی ۵:۹a: ”مبارک ہیں وہ جو صلح کرواتے ہیں…“",
                "fa": "تصویر ۱۸ · متی ۵:۹a: «خوشابحال صلح‌کنندگان…»"
        },
        "0016": {
                "es": "Lámina 16 · Mateo 5:8a: «Felices los de limpio corazón…»",
                "en": "Plate 16 · Matthew 5:8a: \"Blessed are the pure in heart...\"",
                "fr": "Planche 16 · Matthieu 5:8a : « Heureux ceux qui ont le cœur pur… »",
                "pt": "Prancha 16 · Mateus 5:8a: «Bem-aventurados os limpos de coração…»",
                "it": "Tavola 16 · Matteo 5:8a: «Beati i puri di cuore…»",
                "id": "Lembar 16 · Matius 5:8a: «Berbahagialah orang yang suci hatinya…»",
                "tr": "Levha 16 · Matta 5:8a: «Ne mutlu yüreği temiz olanlara…»",
                "ru": "Лист 16 · Матфея 5:8a: «Блаженны чистые сердцем…»",
                "zh-Hans": "图版 16 · 马太福音 5:8a：“清心的人有福了……”",
                "ja": "図版 16 · マタイ 5:8a：「心の清い人たちはさいわいです……」",
                "ko": "도판 16 · 마태복음 5:8a: “마음이 청결한 자는 복이 있나니…”",
                "hi": "चित्र 16 · मत्ती 5:8a: \"धन्य हैं वे जिनके मन शुद्ध हैं…\"",
                "bn": "পাতা ১৬ · মথি ৫:৮a: \"ধন্য তারা যাদের অন্তর শুচি…\"",
                "ar": "لوحة ١٦ · متى ٥:٨a: «طُوبَى لأَنْقِيَاءِ الْقَلْبِ…»",
                "ur": "تصویر ۱۶ · متی ۵:۸a: ”مبارک ہیں وہ جو پاک دل ہیں…“",
                "fa": "تصویر ۱۶ · متی ۵:۸a: «خوشابحال پاک‌دلان…»"
        }
};

        const plateVersesData = {
        "1": {
                "es": "Los felices del Señor Jesús",
                "en": "The blessed of the Lord Jesus",
                "fr": "Les heureux du Seigneur Jésus",
                "pt": "Os bem-aventurados do Senhor Jesus",
                "it": "I beati del Signore Gesù",
                "id": "Mereka yang Berbahagia dari Tuhan Yesus",
                "tr": "Rab İsa'nın Mutlu Olanları",
                "ru": "Блаженные Господа Иисуса",
                "zh-Hans": "主耶稣蒙福的百姓",
                "zh": "主耶稣蒙福的百姓",
                "ja": "主イエスのさいわいな人々",
                "ko": "주 예수님의 복된 사람들",
                "hi": "प्रभु यीशु के हर्षित लोग",
                "bn": "প্রভু যীশুর আনন্দময় মানুষ",
                "ar": "شعب الرب يسوع المبتهجون",
                "ur": "خداوند یسوع کے مبارک لوگ",
                "fa": "مبارک‌بادهای خداوند عیسی"
        },
        "2": {
                "es": "Guarda / Respeto",
                "en": "Flyleaf / Endpaper",
                "fr": "Garde / Respect",
                "pt": "Guarda / Respeito",
                "it": "Guardia / Rispetto",
                "id": "Halaman Pelindung",
                "tr": "Kapak İçi / Boş Yaprak",
                "ru": "Форзац",
                "zh-Hans": "环衬 / 扉页",
                "zh": "环衬 / 扉页",
                "ja": "見返し",
                "ko": "면지 / 보호지",
                "hi": "सुरक्षा पृष्ठ",
                "bn": "ফ্লাইলিফ",
                "ar": "صفحة الحماية",
                "ur": "حفاظتی صفحہ",
                "fa": "صفحه سفید"
        },
        "3": {
                "es": "Separador Gráfico",
                "en": "Graphic Divider",
                "fr": "Séparateur Graphique",
                "pt": "Separador Gráfico",
                "it": "Separatore Grafico",
                "id": "Pembatas Grafis",
                "tr": "Grafik Ayırıcı",
                "ru": "Графический разделитель",
                "zh-Hans": "图文分隔页",
                "zh": "图文分隔页",
                "ja": "グラフィック扉",
                "ko": "간지",
                "hi": "ग्राफिक विभाजक",
                "bn": "গ্রাফিক বিভাজক",
                "ar": "فاصل بصري",
                "ur": "تصویری تقسیم کار",
                "fa": "جداکننده گرافیکی"
        },
        "4": {
                "es": "Página de Cortesía",
                "en": "Courtesy Page",
                "fr": "Page de Courtoisie",
                "pt": "Página de Cortesia",
                "it": "Pagina di Cortesia",
                "id": "Halaman Penghormatan",
                "tr": "Nezaket Sayfası",
                "ru": "Авантитул",
                "zh-Hans": "附赠页 / 献词页",
                "zh": "附赠页 / 献词页",
                "ja": "扉絵",
                "ko": "속표지",
                "hi": "सौजन्य पृष्ठ",
                "bn": "সৌজন্য পাতা",
                "ar": "صفحة التقدير",
                "ur": "توصیفی صفحہ",
                "fa": "صفحه ادای احترام"
        },
        "5": {
                "es": "«y abriendo Su boca, les enseñaba diciendo:» (Mt 5:2)",
                "en": "“and opening His mouth, He taught them, saying:” (Mt 5:2)",
                "fr": "« et ouvrant sa bouche, il les enseigna : » (Mt 5:2)",
                "pt": "«e, abrindo a sua boca, os ensinava, dizendo:» (Mt 5:2)",
                "it": "«E aperta la bocca, insegnava loro dicendo:» (Mt 5:2)",
                "id": "«Maka Yesus pun mulai berbicara dan mengajar mereka, kata-Nya:» (Mat 5:2)",
                "tr": "«Ve ağzını açıp onlara öğreterek şöyle dedi:» (Mat 5:2)",
                "ru": "«И Он, отверзши уста Свои, учил их, говоря:» (Мф 5:2)",
                "zh-Hans": "“他开口教导他们，说：”（太 5:2）",
                "zh": "“他开口教导他们，说：”（太 5:2）",
                "ja": "「口を開き、彼らに教えて言われた：」（マタイ 5:2）",
                "ko": "“입을 열어 그들을 가르쳐 이르시되:” (마 5:2)",
                "hi": "“और अपना मुंह खोलकर, उसने उन्हें यह कहते हुए सिखाया:” (मत्ती 5:2)",
                "bn": "“এবং তার মুখ খুলে, তিনি তাদের শিক্ষা দিয়ে, বললেন:” (মথি 5:2)",
                "ar": "«وتحدث ليعلمهم قائلاً» (متى 5:2)",
                "ur": "”اور اپنا منہ کھول کر ان کو یوں تعلیم دینے لگے:“ (متی 5:2)",
                "fa": "« و دهان خود را گشوده، بدیشان تعلیم داده، گفت: » (متی 5:2)"
        },
        "6": {
                "es": "«Felices los pobres de espíritu…» (Mt 5:3a)",
                "en": "“Blessed are the poor in spirit” (Mt 5:3a)",
                "fr": "« Heureux les pauvres en esprit » (Mt 5:3a)",
                "pt": "«Bem-aventurados os pobres de espírito…» (Mt 5:3a)",
                "it": "«Beati i poveri in spirito…» (Mt 5:3a)",
                "id": "«Berbahagialah orang yang miskin di hadapan Allah…» (Mat 5:3a)",
                "tr": "«Ne mutlu ruhta yoksul olanlara…» (Mat 5:3a)",
                "ru": "«Блаженны нищие духом…» (Мф 5:3a)",
                "zh-Hans": "“在灵里贫乏的人的人有福了……”（太 5:3a）",
                "zh": "“在灵里贫乏的人的人有福了……”（太 5:3a）",
                "ja": "「心の貧しい人々は幸いである……」（マタイ 5:3a）",
                "ko": "“심령이 가난한 자는 복이 있나니…” (마 5:3a)",
                "hi": "“धन्य हैं आत्मा में गरीब” (मत्ती 5:3a)",
                "bn": "“সুখী তারাই যারা আত্মার দরিদ্র” (মথি 5:3a)",
                "ar": "«المبتهجون هم المدركون لفقرهم الروحي» (متى 5:3a)",
                "ur": "”مبارک ہیں وہ جو دل کے غریب ہیں…“ (متی 5:3a)",
                "fa": "« خوشابه‌حال مسکینان در روح… » (متی 5:3a)"
        },
        "7": {
                "es": "«…pues ellos son el reino del cielo» (Mt 5:3b)",
                "en": "“…because they are the kingdom of heaven” (Mt 5:3b)",
                "fr": "« ...car ils sont le royaume des cieux » (Mt 5:3b)",
                "pt": "«…porque deles é o reino dos céus» (Mt 5:3b)",
                "it": "«…perché di loro è il regno dei cieli» (Mt 5:3b)",
                "id": "«…karena merekalah yang empunya Kerajaan Sorga» (Mat 5:3b)",
                "tr": "«…çünkü Göklerin Hükümranlığı onlarındır» (Mat 5:3b)",
                "ru": "«…ибо их есть Царство Небесное» (Мф 5:3b)",
                "zh-Hans": "“……因为他们即为天国”（太 5:3b）",
                "zh": "“……因为他们即为天国”（太 5:3b）",
                "ja": "「……天の御国はその人たちのものだからです」（マタイ 5:3b）",
                "ko": "“…천국이 그들의 것임이요” (마 5:3b)",
                "hi": "“... क्योंकि वे स्वर्ग का राज्य हैं।” (मत्ती 5:3b)",
                "bn": "“...কারণ তারা স্বর্গরাজ্য।” (মথি 5:3b)",
                "ar": "«لأنهم ملكوت السموات» (متى 5:3b)",
                "ur": "”…کیونکہ آسمان کی بادشاہی انہی کی ہے“ (متی 5:3b)",
                "fa": "« …زیرا پادشاهی آسمان از آن ایشان است » (متی 5:3b)"
        },
        "8": {
                "es": "«Felices los afligidos…» (Mt 5:4a)",
                "en": "“Blessed are the sorrowful” (Mt 5:4a)",
                "fr": "« Heureux les affligés » (Mt 5:4a)",
                "pt": "«Bem-aventurados os que choram…» (Mt 5:4a)",
                "it": "«Beati quelli che fanno cordoglio…» (Mt 5:4a)",
                "id": "«Berbahagialah orang yang berdukacita…» (Mat 5:4a)",
                "tr": "«Ne mutlu yaslı olanlara…» (Mat 5:4a)",
                "ru": "«Блаженны плачущие…» (Мф 5:4a)",
                "zh-Hans": "“悲伤的人有福了……”（太 5:4a）",
                "zh": "“悲伤的人有福了……”（太 5:4a）",
                "ja": "「悲しむ人々は幸いである……」（マタイ 5:4a）",
                "ko": "“애통하는 자는 복이 있나니…” (마 5:4a)",
                "hi": "“धन्य हैं उदास मन वाले” (मत्ती 5:4a)",
                "bn": "“ধন্য সেই শোককারীরা” (মথি 5:4a)",
                "ar": "«المبتهجون هم الحَزَانَى» (متى 5:4a)",
                "ur": "”مبارک ہیں وہ جو غمگین ہیں…“ (متی 5:4a)",
                "fa": "« خوشابه‌حال ماتم‌زدگان… » (متی 5:4a)"
        },
        "9": {
                "es": "«…pues serán reconfortados» (Mt 5:4b)",
                "en": "“…because they will be comforted” (Mt 5:4b)",
                "fr": "« ...car ils seront réconfortés » (Mt 5:4b)",
                "pt": "«…porque eles serão consolados» (Mt 5:4b)",
                "it": "«…perché saranno consolati» (Mt 5:4b)",
                "id": "«…karena mereka akan dihibur» (Mat 5:4b)",
                "tr": "«…çünkü onlar teselli edilecekler» (Mat 5:4b)",
                "ru": "«…ибо они утешатся» (Мф 5:4b)",
                "zh-Hans": "“……因为他们会得到安慰”（太 5:4b）",
                "zh": "“……因为他们会得到安慰”（太 5:4b）",
                "ja": "「……その人たちは慰められるからです」（マタイ 5:4b）",
                "ko": "“…그들이 위로를 받을 것임이요” (마 5:4b)",
                "hi": "“... क्योंकि उन्हें आराम मिलेगा।” (मत्ती 5:4b)",
                "bn": "“...কারণ তারা সান্ত্বনা পাবে।” (মথি 5:4b)",
                "ar": "«لأنهم سيُعزَّون» (متى 5:4b)",
                "ur": "”…کیونکہ وہ تسلی پائیں گے“ (متی 5:4b)",
                "fa": "« …زیرا ایشان تسلی خواهند یافت » (متی 5:4b)"
        },
        "10": {
                "es": "«Felices los humildes…» (Mt 5:5a)",
                "en": "“Blessed are the humble” (Mt 5:5a)",
                "fr": "« Heureux les humbles » (Mt 5:5a)",
                "pt": "«Bem-aventurados os mansos…» (Mt 5:5a)",
                "it": "«Beati i mansueti…» (Mt 5:5a)",
                "id": "«Berbahagialah orang yang lemah lembut…» (Mat 5:5a)",
                "tr": "«Ne mutlu uysal olanlara…» (Mat 5:5a)",
                "ru": "«Блаженны кроткие…» (Мф 5:5a)",
                "zh-Hans": "“谦逊的人有福了……”（太 5:5a）",
                "zh": "“谦逊的人有福了……”（太 5:5a）",
                "ja": "「柔和な人々は幸いである……」（マタイ 5:5a）",
                "ko": "“온유한 자는 복이 있나니…” (마 5:5a)",
                "hi": "“धन्य हैं वे जो विनम्र हैं” (मत्ती 5:5a)",
                "bn": "“ধন্য তারা নম্র” (মথি 5:5a)",
                "ar": "«المبتهجون هم المتواضعون» (متى 5:5a)",
                "ur": "”مبارک ہیں وہ جو حلیم ہیں…“ (متی 5:5a)",
                "fa": "« خوشابه‌حال حلیمان… » (متی 5:5a)"
        },
        "11": {
                "es": "«…pues serán herederos de la tierra» (Mt 5:5b)",
                "en": "“…because they will inherit the earth” (Mt 5:5b)",
                "fr": "« ...car ils hériteront la terre » (Mt 5:5b)",
                "pt": "«…porque eles herdarão a terra» (Mt 5:5b)",
                "it": "«…perché erediteranno la terra» (Mt 5:5b)",
                "id": "«…karena mereka akan memiliki bumi» (Mat 5:5b)",
                "tr": "«…çünkü onlar yeri miras alacaklar» (Mat 5:5b)",
                "ru": "«…ибо они наследуют землю» (Мф 5:5b)",
                "zh-Hans": "“……因为他们将承受地土”（太 5:5b）",
                "zh": "“……因为他们将承受地土”（太 5:5b）",
                "ja": "「……その人たちは地を受け継ぐからです」（マタイ 5:5b）",
                "ko": "“…그들이 땅을 기업으로 받을 것임이요” (마 5:5b)",
                "hi": "“... क्योंकि वे पृथ्वी के वारिस होंगे।” (मत्ती 5:5b)",
                "bn": "“...কারণ তারা পৃথিবীর উত্তরাধিকারী হবে।” (মথি 5:5b)",
                "ar": "«لأنهم سيرثون الأرض» (متى 5:5b)",
                "ur": "”…کیونکہ وہ زمین کے وارث ہوں گے“ (متی 5:5b)",
                "fa": "« …زیرا ایشان وارث زمین خواهند شد » (متی 5:5b)"
        },
        "12": {
                "es": "«Felices los hambrientos y sedientos de la rectitud…» (Mt 5:6a)",
                "en": "“Blessed are those who are hungry and thirsty for righteousness” (Mt 5:6a)",
                "fr": "« Heureux ceux qui ont faim et soif de justice » (Mt 5:6a)",
                "pt": "«Bem-aventurados os que têm fome e sede de justiça…» (Mt 5:6a)",
                "it": "«Beati coloro che sono affamati e assetati di giustizia…» (Mt 5:6a)",
                "id": "«Berbahagialah orang yang lapar dan haus akan kebenaran…» (Mat 5:6a)",
                "tr": "«Ne mutlu doğruluğa acıkıp susayanlara…» (Mat 5:6a)",
                "ru": "«Блаженны алчущие и жаждущие правды…» (Мф 5:6a)",
                "zh-Hans": "“饥渴慕义的人有福了……”（太 5:6a）",
                "zh": "“饥渴慕义的人有福了……”（太 5:6a）",
                "ja": "「義に飢え渇く人々は幸いである……」（マタイ 5:6a）",
                "ko": "“의에 주리고 목마른 자는 복이 있나니…” (마 5:6a)",
                "hi": "“धन्य हैं वे जो न्याय के भूखे प्यासे हैं” (मत्ती 5:6a)",
                "bn": "“সুখী তারাই যারা ধার্মিকতার জন্য ক্ষুধার্ত ও তৃষ্ণার্ত” (মথি 5:6a)",
                "ar": "«المبتهجون هم جوعى البِر والمتعطّشون له» (متى 5:6a)",
                "ur": "”مبارک ہیں وہ جو راستبازی کے بھوکے اور پیاسے ہیں…“ (متی 5:6a)",
                "fa": "« خوشابه‌حال گرسنگان و تشنگان عدالت… » (متی 5:6a)"
        },
        "13": {
                "es": "«…pues serán satisfechos» (Mt 5:6b)",
                "en": "“...because they will be satisfied” (Mt 5:6b)",
                "fr": "« ...car ils seront satisfaits » (Mt 5:6b)",
                "pt": "«…porque eles serão fartos» (Mt 5:6b)",
                "it": "«…perché saranno saziati» (Mt 5:6b)",
                "id": "«…karena mereka akan dipuaskan» (Mat 5:6b)",
                "tr": "«…çünkü onlar doyurulacaklar» (Mat 5:6b)",
                "ru": "«…ибо они насытятся» (Мф 5:6b)",
                "zh-Hans": "“……因为他们会满意的”（太 5:6b）",
                "zh": "“……因为他们会满意的”（太 5:6b）",
                "ja": "「……その人たちは満ち足りるからです」（マタイ 5:6b）",
                "ko": "“…그들이 배부를 것임이요” (마 5:6b)",
                "hi": "“... क्योंकि वे संतुष्ट होंगे।” (मत्ती 5:6b)",
                "bn": "“...কারণ তারা সন্তুষ্ট হবে।” (মথি 5:6b)",
                "ar": "«لأنهم سيُرضون» (متى 5:6b)",
                "ur": "”…کیونکہ وہ آسودہ ہوں گے“ (متی 5:6b)",
                "fa": "« …زیرا ایشان سیر خواهند شد » (متی 5:6b)"
        },
        "14": {
                "es": "«Felices los compasivos…» (Mt 5:7a)",
                "en": "“Blessed are the compassionate” (Mt 5:7a)",
                "fr": "« Heureux sont ceux qui témoignent de la compassion » (Mt 5:7a)",
                "pt": "«Bem-aventurados os misericordiosos…» (Mt 5:7a)",
                "it": "«Beati i misericordiosi…» (Mt 5:7a)",
                "id": "«Berbahagialah orang yang murah hatinya…» (Mat 5:7a)",
                "tr": "«Ne mutlu merhametli olanlara…» (Mat 5:7a)",
                "ru": "«Блаженны милостивые…» (Мф 5:7a)",
                "zh-Hans": "“有同情心的人有福了……”（太 5:7a）",
                "zh": "“有同情心的人有福了……”（太 5:7a）",
                "ja": "「あわれみ深い人々は幸いである……」（マタイ 5:7a）",
                "ko": "“긍휼히 여기는 자는 복이 있나니…” (마 5:7a)",
                "hi": "“धन्य हैं वे जो दयालु हैं” (मत्ती 5:7a)",
                "bn": "“ধন্য তারা যারা সহানুভূতিশীল” (মথি 5:7a)",
                "ar": "«المبتهجون هم الرحماء» (متى 5:7a)",
                "ur": "”مبارک ہیں وہ جو رحم دل ہیں…“ (متی 5:7a)",
                "fa": "« خوشابه‌حال رحیمان… » (متی 5:7a)"
        },
        "15": {
                "es": "«…pues ellos recibirán compasión» (Mt 5:7b)",
                "en": "“…because they will receive compassion” (Mt 5:7b)",
                "fr": "« ...car ils recevront de la compassion » (Mt 5:7b)",
                "pt": "«…porque eles alcançarão misericórdia» (Mt 5:7b)",
                "it": "«…perché troveranno misericordia» (Mt 5:7b)",
                "id": "«…karena mereka akan beroleh kemurahan» (Mat 5:7b)",
                "tr": "«…çünkü onlara merhamet edilecek» (Mat 5:7b)",
                "ru": "«…ибо они помилованы будут» (Мф 5:7b)",
                "zh-Hans": "“……因为他们会得到怜悯”（太 5:7b）",
                "zh": "“……因为他们会得到怜悯”（太 5:7b）",
                "ja": "「……その人たちはあわれみを受けるからです」（マタイ 5:7b）",
                "ko": "“…그들이 긍휼히 여김을 받을 것임이요” (마 5:7b)",
                "hi": "“... क्योंकि वे करुणा प्राप्त करेंगे।” (मत्ती 5:7b)",
                "bn": "“... কারণ তাদের করুণা করা হবে।” (মথি 5:7b)",
                "ar": "«لأن سيُرحمون» (متى 5:7b)",
                "ur": "”…کیونکہ ان پر رحم کیا جائے گا“ (متی 5:7b)",
                "fa": "« …زیرا بر ایشان رحمت خواهد شد » (متی 5:7b)"
        },
        "16": {
                "es": "«Felices los de limpio corazón…» (Mt 5:8a)",
                "en": "“Blessed are the pure of heart” (Mt 5:8a)",
                "fr": "« Heureux sont ceux qui ont le cœur pur » (Mt 5:8a)",
                "pt": "«Bem-aventurados os limpos de coração…» (Mt 5:8a)",
                "it": "«Beati i puri di cuore…» (Mt 5:8a)",
                "id": "«Berbahagialah orang yang suci hatinya…» (Mat 5:8a)",
                "tr": "«Ne mutlu yüreği temiz olanlara…» (Mat 5:8a)",
                "ru": "«Блаженны чистые сердцем…» (Мф 5:8a)",
                "zh-Hans": "“心灵纯净的人有福了”（太 5:8a）",
                "zh": "“心灵纯净的人有福了”（太 5:8a）",
                "ja": "「心の清い人々は幸いである……」（マタイ 5:8a）",
                "ko": "“마음이 청결한 자는 복이 있나니…” (마 5:8a)",
                "hi": "“खुशनसीब होते हैं वो जिनका दिल साफ होता है” (मत्ती 5:8a)",
                "bn": "“ধন্য যারা হৃদয় বিশুদ্ধ” (মথি 5:8a)",
                "ar": "«المبتهجون هم أنقياء القلب» (متى 5:8a)",
                "ur": "”مبارک ہیں وہ جو پاک دل ہیں…“ (متی 5:8a)",
                "fa": "« خوشابه‌حال پاک‌دلان… » (متی 5:8a)"
        },
        "17": {
                "es": "«…pues ellos verán a Dios» (Mt 5:8b)",
                "en": "“…because they will see God” (Mt 5:8b)",
                "fr": "« ...car ils verront Dieu » (Mt 5:8b)",
                "pt": "«…porque eles verão a Deus» (Mt 5:8b)",
                "it": "«…perché vedranno Dio» (Mt 5:8b)",
                "id": "«…karena mereka akan melihat Allah» (Mat 5:8b)",
                "tr": "«…çünkü onlar Tanrı'yı görecekler» (Mat 5:8b)",
                "ru": "«…ибо они Бога узрят» (Мф 5:8b)",
                "zh-Hans": "“......因为他们会看到上帝”（太 5:8b）",
                "zh": "“......因为他们会看到上帝”（太 5:8b）",
                "ja": "「……その人たちは神を見るからです」（マタイ 5:8b）",
                "ko": "“…그들이 하나님을 볼 것임이요” (마 5:8b)",
                "hi": "“... क्योंकि वे भगवान को देखेंगे।” (मत्ती 5:8b)",
                "bn": "“...কারণ তারা ঈশ্বরকে দেখতে পাবে।” (মথি 5:8b)",
                "ar": "«لأنهم سيرون الله» (متى 5:8b)",
                "ur": "”…کیونکہ وہ خدا کو دیکھیں گے“ (متی 5:8b)",
                "fa": "« …زیرا ایشان خدا را خواهند دید » (متی 5:8b)"
        },
        "18": {
                "es": "«Felices los pacificadores…» (Mt 5:9a)",
                "en": "“Blessed are the peacemakers” (Mt 5:9a)",
                "fr": "« Heureux sont les artisans de paix » (Mt 5:9a)",
                "pt": "«Bem-aventurados os pacificadores…» (Mt 5:9a)",
                "it": "«Beati gli operatori di pace…» (Mt 5:9a)",
                "id": "«Berbahagialah orang yang membawa damai…» (Mat 5:9a)",
                "tr": "«Ne mutlu barışı sağlayanlara…» (Mat 5:9a)",
                "ru": "«Блаженны миротворцы…» (Мф 5:9a)",
                "zh-Hans": "“和平缔造者有福了……”（太 5:9a）",
                "zh": "“和平缔造者有福了……”（太 5:9a）",
                "ja": "「平和をつくる人々は幸いである……」（マタイ 5:9a）",
                "ko": "“화평하게 하는 자는 복이 있나니…” (마 5:9a)",
                "hi": "“धन्य हैं वे जो शांतिदूत हैं” (मत्ती 5:9a)",
                "bn": "“ধন্য শান্তিরক্ষীরা” (মথি 5:9a)",
                "ar": "«المبتهجون هم صانعو السلام» (متى 5:9a)",
                "ur": "”مبارک ہیں وہ جو صلح کرواتے ہیں…“ (متی 5:9a)",
                "fa": "« خوشابه‌حال صلح‌کنندگان… » (متی 5:9a)"
        },
        "19": {
                "es": "«…pues serán llamados hijos de Dios» (Mt 5:9b)",
                "en": "“…because they will be called children of God” (Mt 5:9b)",
                "fr": "« ...car ils seront appelés fils de Dieu » (Mt 5:9b)",
                "pt": "«…porque eles serão chamados filhos de Deus» (Mt 5:9b)",
                "it": "«…perché saranno chiamati figli di Dio» (Mt 5:9b)",
                "id": "«…karena mereka akan disebut anak-anak Allah» (Mat 5:9b)",
                "tr": "«…çünkü onlara Tanrı oğulları denecek» (Mat 5:9b)",
                "ru": "«…ибо они будут наречены сынами Божиими» (Мф 5:9b)",
                "zh-Hans": "“……因为他们将被称作神的儿女”（太 5:9b）",
                "zh": "“……因为他们将被称作神的儿女”（太 5:9b）",
                "ja": "「……その人たちは神の子どもと呼ばれるからです」（マタイ 5:9b）",
                "ko": "“…그들이 하나님의 아들이라 일컬음을 받을 것임이요” (마 5:9b)",
                "hi": "“... क्योंकि वे परमेश्वर की सन्तान कहलाएंगे।” (मत्ती 5:9b)",
                "bn": "“...কারণ তাদের বলা হবে ঈশ্বরের সন্তান।” (মথি 5:9b)",
                "ar": "«لأنهم سيُدعون أولاد الله» (متى 5:9b)",
                "ur": "”…کیونکہ وہ خدا کے بیٹے کہلائیں گے“ (متی 5:9b)",
                "fa": "« …زیرا ایشان فرزندان خدا خوانده خواهند شد » (متی 5:9b)"
        },
        "20": {
                "es": "«Felices los perseguidos debido a la rectitud…» (Mt 5:10a)",
                "en": "“Blessed are those who are persecuted for the sake of righteousness” (Mt 5:10a)",
                "fr": "« Heureux sont ceux qui sont persécutés à cause de la justice » (Mt 5:10a)",
                "pt": "«Bem-aventurados os que sofrem perseguição por causa da justiça…» (Mt 5:10a)",
                "it": "«Beati i perseguitati per motivo di giustizia…» (Mt 5:10a)",
                "id": "«Berbahagialah orang yang dianiaya oleh sebab kebenaran…» (Mat 5:10a)",
                "tr": "«Ne mutlu doğruluk uğruna zulüm görenlere…» (Mat 5:10a)",
                "ru": "«Блаженны изгнанные за правду…» (Мф 5:10a)",
                "zh-Hans": "“为求正义而被迫害的人有福了……”（太 5:10a）",
                "zh": "“为求正义而被迫害的人有福了……”（太 5:10a）",
                "ja": "「義のために迫害されている人々は幸いである……」（マタイ 5:10a）",
                "ko": "“의를 위하여 박해를 받은 자는 복이 있나니…” (마 5:10a)",
                "hi": "“धन्य हैं वे जिन्हें न्याय के लिए सताया जाता है” (मत्ती 5:10a)",
                "bn": "“সুখী তারা যারা ধার্মিকতার জন্য নির্যাতিত হয়” (মথি 5:10a)",
                "ar": "«المبتهجون هم المضطَهَدون في سبيل البِر» (متى 5:10a)",
                "ur": "”مبارک ہیں وہ جو راستبازی کے سبب سے ستائے گئے ہیں…“ (متی 5:10a)",
                "fa": "« خوشابه‌حال آنان که به خاطر عدالت جفا می‌بینند… » (متی 5:10a)"
        },
        "21": {
                "es": "«…pues ellos son el reino del cielo» (Mt 5:10b)",
                "en": "“…because they are the kingdom of heaven” (Mt 5:10b)",
                "fr": "« ...car ils sont le royaume des cieux » (Mt 5:10b)",
                "pt": "«…porque deles é o reino dos céus» (Mt 5:10b)",
                "it": "«…perché di loro è il regno dei cieli» (Mt 5:10b)",
                "id": "«…karena merekalah yang empunya Kerajaan Sorga» (Mat 5:10b)",
                "tr": "«…çünkü Göklerin Hükümranlığı onlarındır» (Mat 5:10b)",
                "ru": "«…ибо их есть Царство Небесное» (Мф 5:10b)",
                "zh-Hans": "“……因为他们即为天国”（太 5:10b）",
                "zh": "“……因为他们即为天国”（太 5:10b）",
                "ja": "「……天の御国はその人たちのものだからです」（マタイ 5:10b）",
                "ko": "“…천국이 그들의 것임이요” (마 5:10b)",
                "hi": "“... क्योंकि वे स्वर्ग का राज्य हैं।” (मत्ती 5:10b)",
                "bn": "“...কারণ তারা স্বর্গরাজ্য।” (মথি 5:10b)",
                "ar": "«لأنهم ملكوت السموات» (متى 5:10b)",
                "ur": "”…کیونکہ آسمان کی بادشاہی انہی کی ہے“ (متی 5:10b)",
                "fa": "« …زیرا پادشاهی آسمان از آن ایشان است » (متی 5:10b)"
        },
        "22": {
                "es": "«Felices son cuando los insultan, persiguen y falsamente dicen toda maldad contra ustedes debido a Mí» (Mt 5:11)",
                "en": "“Blessed are you when people insult you, persecute you, and falsely say all kinds of evil things about you because of Me” (Mt 5:11)",
                "fr": "« Heureux êtes-vous quand les personnes vous insultent, vous persécutent et disent faussement toutes sortes de mauvaises choses à votre sujet à cause de Moi » (Mt 5:11)",
                "pt": "«Bem-aventurados sois vós, quando vos injuriarem e perseguirem, e mentindo, disserem todo o mal contra vós por minha causa» (Mt 5:11)",
                "it": "«Beati voi, quando vi insulteranno e vi perseguiteranno e, mentendo, diranno contro di voi ogni sorta di male per causa mia» (Mt 5:11)",
                "id": "«Berbahagialah kamu, jika karena Aku kamu dicela dan dianiaya dan kepadamu difitnahkan segala yang jahat» (Mat 5:11)",
                "tr": "«Benim yüzümden insanlar size sövüp zulmettikleri, yalan yere size karşı her türlü kötülüğü söyledikleri zaman ne mutlusunuz!» (Mat 5:11)",
                "ru": "«Блаженны вы, когда будут поносить вас и гнать и всячески неправедно злословить за Меня» (Мф 5:11)",
                "zh-Hans": "“当人们因为我而侮辱你、迫害你、撒谎说你的各种坏话时，你是有福的”（太 5:11）",
                "zh": "“当人们因为我而侮辱你、迫害你、撒谎说你的各种坏话时，你是有福的”（太 5:11）",
                "ja": "「わたしのために人々があなたがたをののしり、迫害し、ありとあらゆる悪口を浴びせるとき、あなたがたは幸いです」（マタイ 5:11）",
                "ko": "“나로 말미암아 너희를 욕하고 박해하고 거짓으로 너희를 거슬러 모든 악한 말을 할 때에는 너희에게 복이 있나니” (마 5:11)",
                "hi": "“आनन्दित रहो जब लोग तुम्हारा अपमान करें, तुम्हें सताएं, और मेरे कारण तुम्हारे बारे में हर तरह की बुरी बातें कहें।” (मत्ती 5:11)",
                "bn": "“আনন্দিত হও যখন লোকেরা তোমাকে অপমান করে, তোমাকে নির্যাতন করে এবং মিথ্যাভাবে তোমার সম্পর্কে সব ধরনের খারাপ কথা বলে আমার কারণে।” (মথি 5:11)",
                "ar": "«أنت المبتهج إذا أهانك الناس واضطهدوك وقالوا عنك كذباً كل أنواع الخبائث بسببي» (متى 5:11)",
                "ur": "”جب لوگ میرے سبب سے تم کو لعن طعن کریں گے اور ستائیں گے اور طرح طرح کی بدگوئی کریں گے تو تم مبارک ہو گے“ (متی 5:11)",
                "fa": "« خوشابه‌حال شما آنگاه که به خاطر من به شما دشنام دهند و جفا رسانند و هر سخن بدی را به دروغ بر شما بگویند » (متی 5:11)"
        },
        "23": {
                "es": "«Alégrense y celebren, porque grande es su recompensa en el cielo…» (Mt 5:12a)",
                "en": "“Be glad and rejoice because great will be your reward in heaven” (Mt 5:12a)",
                "fr": "« Soyez dans l'allégresse et réjouissez-vous, car grande sera votre récompense dans les cieux » (Mt 5:12a)",
                "pt": "«Alegrai-vos e exultai, porque é grande o vosso galardão nos céus…» (Mt 5:12a)",
                "it": "«Rallegratevi e giubilate, perché il vostro premio è grande nei cieli…» (Mt 5:12a)",
                "id": "«Bersukacita dan bergembiralah, karena upahmu besar di sorga…» (Mat 5:12a)",
                "tr": "«Sevinin, sevinçle coşun! Çünkü göklerdeki ödülünüz büyüktür…» (Mat 5:12a)",
                "ru": "«Радуйтесь и веселитесь, ибо велика ваша награда на небесах…» (Мф 5:12a)",
                "zh-Hans": "“应当欢喜快乐，因为你们将在天堂中得以赏赐回报……”（太 5:12a）",
                "zh": "“应当欢喜快乐，因为你们将在天堂中得以赏赐回报……”（太 5:12a）",
                "ja": "「喜びなさい、大いに喜べ。天においてあなたがたの受ける報いは大きいからである……」（マタイ 5:12a）",
                "ko": "“기뻐하고 즐거워하라 하늘에서 너희의 상이 큼이라…” (마 5:12a)",
                "hi": "“आनन्दित और आनन्दित रहो, क्योंकि स्वर्ग में तुम्हारा प्रतिफल महान है” (मत्ती 5:12a)",
                "bn": "“আনন্দিত হও এবং আনন্দ কর, কারণ স্বর্গে তোমার পুরস্কার অনেক বড়” (মথি 5:12a)",
                "ar": "«افرح وابتهج لأن أجرك عظيم في الجنة» (متى 5:12a)",
                "ur": "”خوشی کرنا اور نہایت شادمان ہونا کیونکہ آسمان پر تمہارا اجر بڑا ہے…“ (متی 5:12a)",
                "fa": "« شاد و خرسند باشید، زیرا پاداش شما در آسمان عظیم است… » (متی 5:12a)"
        },
        "24": {
                "es": "«…porque de esta forma persiguieron a los portavoces antes que ustedes» (Mt 5:12b)",
                "en": "“…because in this same way, the spokespeople who came before you were also persecuted” (Mt 5:12b)",
                "fr": "« ...car c'est ainsi que les messagers qui vous ont précédés ont été persécutés » (Mt 5:12b)",
                "pt": "«…pois assim perseguiram os profetas que foram antes de vós» (Mt 5:12b)",
                "it": "«…poiché così hanno perseguitato i profeti che sono stati prima di voi» (Mt 5:12b)",
                "id": "«…sebab demikian juga telah dianiaya nabi-nabi yang sebelum kamu» (Mat 5:12b)",
                "tr": "«…çünkü sizden önceki peygamberlere de böyle zulmettiler» (Mat 5:12b)",
                "ru": "«…ибо так гнали и пророков, бывших прежде вас» (Мф 5:12b)",
                "zh-Hans": "“……因为同样的，那些比你更早的使者也受到了迫害”（太 5:12b）",
                "zh": "“……因为同样的，那些比你更早的使者也受到了迫害”（太 5:12b）",
                "ja": "「……あなたがたより前にいた預言者たちをも、人々はそのように迫害したのです」（マタイ 5:12b）",
                "ko": "“…너희 전에 있던 선지자들도 이같이 박해하였느니라” (마 5:12b)",
                "hi": "“... क्योंकि इसी तरह से आपके सामने आने वाले वक्ताओं को भी सताया गया था।” (मत्ती 5:12b)",
                "bn": "“…কারণ এইভাবে, আপনার আগে আসা মুখপাত্ররাও নির্যাতিত হয়েছিল।” (মথি 5:12b)",
                "ar": "«لأنك على خطى من تحدث قبلك؛ فقد تعرضوا هم أيضاً للاضطهاد» (متى 5:12b)",
                "ur": "”…کیونکہ انہوں نے ان نبیوں کو بھی ستایا جو تم سے پہلے تھے“ (متی 5:12b)",
                "fa": "« …چرا که پیش از شما بر انبیایی نیز که بودند همین‌گونه جفا می‌رسانیدند » (متی 5:12b)"
        },
        "25": {
                "es": "«Cuando vio a las multitudes, subió a la colina y tomó asiento» (Mt 5:1a)",
                "en": "“When He saw the crowds, He climbed the hillside and sat down” (Mt 5:1a)",
                "fr": "« Quand Il vit la foule, Il monta sur le flanc de la colline et s'assit » (Mt 5:1a)",
                "pt": "«E Jesus, vendo a multidão, subiu a um monte, e, assentando-se,» (Mt 5:1a)",
                "it": "«Vedendo le folle, salì sul monte; e messosi a sedere» (Mt 5:1a)",
                "id": "«Ketika Yesus melihat orang banyak itu, naiklah Ia ke atas bukit dan setelah Ia duduk» (Mat 5:1a)",
                "tr": "«İsa kalabalıkları görünce dağa çıktı. Oturunca» (Mat 5:1a)",
                "ru": "«Увидев народ, Он взошел на гору; и, когда сел» (Мф 5:1a)",
                "zh-Hans": "“他看见众人，就爬上山坡坐下”（太 5:1a）",
                "zh": "“他看见众人，就爬上山坡坐下”（太 5:1a）",
                "ja": "「イエスはこの群衆を見て、山に登り、座につかれると、」（マタイ 5:1a）",
                "ko": "“예수께서 무리를 보시고 산에 올라가 앉으시니” (마 5:1a)",
                "hi": "“भीड़ को देखकर वह पहाड़ी पर चढ़कर बैठ गया।” (मत्ती 5:1a)",
                "bn": "“যখন তিনি ভিড় দেখলেন, তিনি পাহাড়ের চূড়ায় উঠে বসলেন।” (মথি 5:1a)",
                "ar": "«عندما أبصَر الجموع، صعد إلى جانب التل وجلس» (متى 5:1a)",
                "ur": "”وہ بھیڑوں کو دیکھ کر پہاڑ پر چڑھ گیا اور بیٹھ گیا،“ (متی 5:1a)",
                "fa": "« چون عیسی جمعیت‌ها را دید، بر فراز تپه رفت و نشست » (متی 5:1a)"
        },
        "26": {
                "es": "«Sus alumnos se acercaron a Él,» (Mt 5:1b)",
                "en": "“His students came to Him,” (Mt 5:1b)",
                "fr": "« Ses étudiants vinrent auprès de Lui, » (Mt 5:1b)",
                "pt": "«aproximaram-se dele os seus discípulos;» (Mt 5:1b)",
                "it": "«I suoi discepoli gli si accostarono,» (Mt 5:1b)",
                "id": "«Datanglah murid-murid-Nya kepada-Nya,» (Mat 5:1b)",
                "tr": "«Öğrencileri O'na geldi,» (Mat 5:1b)",
                "ru": "«Приступили к Нему ученики Его,» (Мф 5:1b)",
                "zh-Hans": "“他的学生来到他面前，”（太 5:1b）",
                "zh": "“他的学生来到他面前，”（太 5:1b）",
                "ja": "「弟子たちがみもとに近寄って来た」（マタイ 5:1b）",
                "ko": "“제자들이 나아온지라,” (마 5:1b)",
                "hi": "“उनके छात्र उनके पास आए,” (मत्ती 5:1b)",
                "bn": "“তাঁর ছাত্ররা তাঁর কাছে এসেছিল,” (মথি 5:1b)",
                "ar": "«أتى تلاميذه إليه» (متى 5:1b)",
                "ur": "”اور اس کے شاگرد اس کے پاس آئے“ (متی 5:1b)",
                "fa": "« و شاگردانش نزد وی آمدند، » (متی 5:1b)"
        },
        "27": {
                "es": "Él indicó que esta obra sea compartida libremente entre sus felices.",
                "en": "He gave instructions to freely share this work among His joyful.",
                "fr": "Il donna des instructions pour le partage libre de ce travail auprès de ses heureux.",
                "pt": "Ele orientou que esta obra seja compartilhada livremente entre os seus bem-aventurados.",
                "it": "Egli ha indicato che quest'opera sia condivisa liberamente tra i suoi beati. I più piccoli del regno dei cieli.",
                "id": "Dia menyatakan agar karya ini dibagikan secara cuma-cuma di antara mereka yang berbahagia. Yang terkecil dalam Kerajaan Sorga.",
                "tr": "O, bu eserin Kendi mutlu olanları arasında serbestçe paylaşılmasını buyurdu. Göklerin Egemenliğinde en küçük olanlar için.",
                "ru": "Он указал, чтобы этот труд свободно распространялся среди Его блаженных. Наименьших в Царстве Небесном.",
                "zh-Hans": "他指示要在他喜乐的子民中自由地分享这项工作。",
                "zh": "他指示要在他喜乐的子民中自由地分享这项工作。",
                "ja": "主はこの作品が主の幸いな人々の間で自由に分かち合われることを望まれました。",
                "ko": "그분께서는 이 작품이 그분의 복된 자들 사이에 자유롭게 공유되기를 명하셨습니다.",
                "hi": "उन्होंने इस काम को अपने आनंदित लोगों के बीच स्वतंत्र रूप से साझा करने का निर्देश दिया।",
                "bn": "তিনি এই কাজকে তাঁর আনন্দিতদের মধ্যে অবাধে ভাগ করে নেওয়ার নির্দেশ দিয়েছিলেন।",
                "ar": "فوجههم لمشاركة هذا العمل بحرية بين مبتهجيه",
                "ur": "انہوں نے ہدایت دی کہ یہ کام ان کے مبارک لوگوں میں آزادانہ طور پر شیئر کیا جائے۔",
                "fa": "او فرمان داد که این اثر آزادانه در میان مبارکانش به اشتراک گذاشته شود."
        },
        "28": {
                "es": "Los más pequeñitos del reino del cielo.",
                "en": "The smallest ones in the Kingdom of Heaven.",
                "fr": "Les plus petits dans le royaume des cieux.",
                "pt": "Os pequeninos do reino dos céus.",
                "it": "Egli ha indicato che quest'opera sia condivisa liberamente tra i suoi beati. I più piccoli del regno dei cieli.",
                "id": "Dia menyatakan agar karya ini dibagikan secara cuma-cuma di antara mereka yang berbahagia. Yang terkecil dalam Kerajaan Sorga.",
                "tr": "O, bu eserin Kendi mutlu olanları arasında serbestçe paylaşılmasını buyurdu. Göklerin Egemenliğinde en küçük olanlar için.",
                "ru": "Он указал, чтобы этот труд свободно распространялся среди Его блаженных. Наименьших в Царстве Небесном.",
                "zh-Hans": "献给天国中最小的人。",
                "zh": "献给天国中最小的人。",
                "ja": "天の御国において最も小さい者たちへ。",
                "ko": "천국에서 지극히 작은 자들에게.",
                "hi": "उनके लिए जो स्वर्ग के राज्य में छोटे हैं।",
                "bn": "স্বর্গরাজ্যে সবচেয়ে ছোট।",
                "ar": "إنهم صغار ملكوت السموات",
                "ur": "آسمان کی بادشاہی میں سب سے چھوٹوں کے لیے۔",
                "fa": "کوچک‌ترین‌ها در پادشاهی آسمان."
        }
};

        const translations = {
        "es": {
		"nameCarta": "Carta",
		"subCarta": "América",
		"nameA4": "A4",
		"subA4": "Internacional",
		"focalVerse": "«…porque de esta forma persiguieron a los portavoces antes que ustedes» (Mt 5:12b)",
		"plateIndexText": "Lámina 24 de 28",
		"foldModalTitle": "Cómo Imprimir y Doblar",
		"foldStep1Title": "1. Imprime frente y vuelta",
		"foldStep1Desc": "En tu impresora, activa «Doble cara» volteando por el borde corto.",
		"foldStep2Title": "2. Dobla a la mitad",
		"foldStep2Desc": "Junta todas las hojas impresas en orden y pliégalas juntas por el centro.",
		"foldStep3Title": "3. Engrapa en el lomo",
		"foldStep3Desc": "Aplica 2 grapas en el pliegue central. ¡Listo para colorear!",
		"btnFoldDismiss": "Entendido",
		"tapToZoom": "Toca para ampliar",
		"labelCartaSub": "América",
		"labelA4Sub": "Internacional",
		"btnPrintPlate": "Imprimir esta lámina",
		"btnShare": "Compartir",
		"toastCopied": "Enlace copiado al portapapeles",
		"plateLabel": "Lámina",
		"foldGuideTrigger": "📖 ¿Cómo imprimir y doblar?",
                "pageTitle": "Ekovoz: Recursos Gratis",
                "badge": "Recurso Abierto de Dominio Público",
                "title": "Los Felices del Señor Jesús",
                "desc": "Cuaderno de las Bienaventuranzas para Colorear (Mateo 5)",
                "langLabel": "Idioma / Language",
                "previewBadge": "Ver 3 láminas de muestra",
                "triptychTitle": "Láminas Destacadas",
                "triptychHint": "Toca cualquier lámina para ver en alta resolución",
                "btnTitleSheets": "Láminas Sueltas (PDF)",
                "btnSubSheets": "1 página por hoja · Ideal para colorear",
                "btnTitleBooklet": "Cuadernillo (PDF)",
                "btnSubBooklet": "Folleto para doblar y engrapar · A caballo",
                "opticalTrigger": "Compartir sin cables (Pantalla a cámara)",
                "offlineBadge": "100% offline y transferible de pantalla a cámara",
                "footerNote": "Obra educativa de dominio público basada en el texto de Mateo 5. Libre para imprimir, colorear y compartir.",
                "opticalModalTitle": "Transferencia Óptica (Pantalla a Cámara)",
                "opticalStep1Title": "Transmitir en Pantalla",
                "opticalStep1Desc": "Abre el reproductor Ekovoz en esta pantalla para proyectar la obra en secuencias ópticas de alta velocidad (sin cables, internet ni Bluetooth).",
                "opticalStep2Title": "Recibir con Cámara",
                "opticalStep2Desc": "Apunta con la cámara de cualquier teléfono hacia esta pantalla para descargar el PDF completo sin conexión de red.",
                "btnLaunchEkovoz": "Iniciar Reproductor Ekovoz",
                "btnModalClose": "Cerrar",
                "previewModalTitle": "Muestra de Láminas para Colorear",
                "plateModalTitle": "Vista Previa en Alta Resolución",
                "carouselPrev": "← Anterior",
                "carouselNext": "Siguiente →",
                "contactBtn": "Contacto & Colaboración",
                "contactTitle": "Contacto & Colaboración Editorial",
                "contactCloseAria": "Cerrar",
                "contactSubject": "Mensaje desde Ekovoz Editorial",
                "contactNameLabel": "Nombre o Seudónimo",
                "contactNamePlaceholder": "Tu nombre",
                "contactEmailLabel": "Correo Electrónico (para responderte)",
                "contactEmailPlaceholder": "tu@correo.com",
                "contactMessageLabel": "Mensaje o Propuesta de Traducción",
                "contactMessagePlaceholder": "¿En qué podemos colaborar o qué idioma te gustaría revisar?",
                "contactCancel": "Cancelar",
                "contactSubmit": "Enviar Mensaje",
                "contactSending": "Enviando mensaje...",
                "contactSuccess": "¡Mensaje enviado con éxito! Gracias por comunicarte con nosotros.",
                "contactError": "Error al enviar el mensaje. Inténtalo más tarde.",
                "contactConnectionError": "Error de conexión. Verifica tu conexión a internet.",
                "contactTopicLabel": "Motivo / Asunto",
                "optCollab": "Colaboración editorial o traducción",
                "optSupport": "Problemas de descarga o lectura (Soporte)",
                "optGeneral": "Consulta general o sugerencia",
                "githubIssueHint": "¿Prefieres reportar un ticket de soporte técnico público?",
                "linkGithubIssue": "Abrir incidencia en GitHub",
                "btnPrintPlate": "Imprimir esta lámina",
                "btnShare": "Compartir",
                "toastCopied": "Enlace copiado al portapapeles",
                "plateLabel": "Lámina",
                "foldGuideTrigger": "📖 ¿Cómo imprimir y doblar?",
                "foldModalTitle": "Cómo Imprimir y Doblar"
        },
        "it": {
		"nameCarta": "Letter",
		"subCarta": "Americhe",
		"nameA4": "A4",
		"subA4": "Internazionale",
		"focalVerse": "«…poiché così hanno perseguitato i profeti che sono stati prima di voi» (Mt 5:12b)",
		"plateIndexText": "Tavola 24 di 28",
		"foldModalTitle": "Come Stampare e Piegare",
		"foldStep1Title": "1. Stampa fronte e retro",
		"foldStep1Desc": "Nelle impostazioni della stampante, attiva «Fronte-retro» con capovolgimento sul bordo corto.",
		"foldStep2Title": "2. Piega a metà",
		"foldStep2Desc": "Raccogli tutti i fogli stampati in ordine e piegali insieme al centro.",
		"foldStep3Title": "3. Spillare sul dorso",
		"foldStep3Desc": "Applica 2 punti metallici lungo la piega centrale. Pronto da colorare!",
		"btnFoldDismiss": "Ho capito",
		"tapToZoom": "Tocca per ingrandire",
		"labelCartaSub": "Americhe",
		"labelA4Sub": "Internazionale",
		"btnPrintPlate": "Stampa questa tavola",
		"btnShare": "Condividi",
		"toastCopied": "Link copiato negli appunti",
		"plateLabel": "Tavola",
		"foldGuideTrigger": "📖 Come stampare e piegare?",
                "pageTitle": "Ekovoz: Risorse Gratuite",
                "badge": "Risorsa Aperta di Pubblico Dominio",
                "title": "I Beati del Signore Gesù",
                "desc": "Libretto da Colorare sulle Beatitudini (Matteo 5)",
                "langLabel": "Lingua",
                "previewBadge": "Vedi 3 tavole di esempio",
                "triptychTitle": "Tavole in Evidenza",
                "triptychHint": "Tocca qualsiasi tavola per visualizzare in alta risoluzione",
                "btnTitleSheets": "Pagine Singole (PDF)",
                "btnSubSheets": "Per visualizzare su schermo o colorare foglio per foglio",
                "btnTitleBooklet": "Libretto (PDF)",
                "btnSubBooklet": "Per stampare opuscolo (Fronte-retro e spillato)",
                "opticalTrigger": "Condividi senza fili (Schermo a fotocamera)",
                "offlineBadge": "100% offline e trasferibile da schermo a fotocamera",
                "footerNote": "Opera educativa di pubblico dominio basata sul testo di Matteo 5. Libera da stampare, colorare e condividere.",
                "contactBtn": "Contatto & Collaborazione",
                "opticalModalTitle": "Trasferimento Ottico (Schermo a Fotocamera)",
                "opticalStep1Title": "Trasmettere sullo Schermo",
                "opticalStep1Desc": "Apri il player Ekovoz su questo schermo per trasmettere l'opera in sequenze ottiche ad alta velocità.",
                "opticalStep2Title": "Ricevere con la Fotocamera",
                "opticalStep2Desc": "Inquadra questo schermo con la fotocamera di qualsiasi dispositivo per scaricare il PDF completo senza internet.",
                "btnLaunchEkovoz": "Avvia Player Ekovoz",
                "btnModalClose": "Chiudi",
                "previewModalTitle": "Esempio di Tavole da Colorare",
                "plateModalTitle": "Anteprima ad Alta Risoluzione",
                "carouselPrev": "← Precedente",
                "carouselNext": "Successivo →",
                "contactTitle": "Contatto & Collaborazione Editoriale",
                "contactCloseAria": "Chiudi",
                "contactSubject": "Messaggio da Ekovoz Editoriale",
                "contactNameLabel": "Nome o Pseudonimo",
                "contactNamePlaceholder": "Il tuo nome",
                "contactEmailLabel": "Indirizzo Email (per risponderti)",
                "contactEmailPlaceholder": "tu@email.com",
                "contactMessageLabel": "Messaggio o Proposta di Traduzione",
                "contactMessagePlaceholder": "Come possiamo collaborare o quale lingua desideri verificare?",
                "contactCancel": "Annulla",
                "contactSubmit": "Invia Messaggio",
                "contactSending": "Invio del messaggio in corso...",
                "contactSuccess": "Messaggio inviato con successo! Grazie per averci contattato.",
                "contactError": "Errore durante l'invio. Riprova più tardi.",
                "contactConnectionError": "Errore di connessione. Verifica la connessione a Internet.",
                "contactTopicLabel": "Motivo / Argomento",
                "optCollab": "Collaborazione editoriale o traduzione",
                "optSupport": "Problemi di download o lettura (Supporto)",
                "optGeneral": "Richiesta generale o suggerimento",
                "githubIssueHint": "Preferisci segnalare un problema técnico público?",
                "linkGithubIssue": "Apri una segnalazione su GitHub"
        },
        "id": {
		"nameCarta": "Letter",
		"subCarta": "Amerika",
		"nameA4": "A4",
		"subA4": "Internasional",
		"focalVerse": "«…sebab demikian juga telah dianiaya nabi-nabi yang sebelum kamu» (Mat 5:12b)",
		"plateIndexText": "Lembar 24 dari 28",
		"foldModalTitle": "Cara Mencetak dan Melipat",
		"foldStep1Title": "1. Cetak bolak-balik",
		"foldStep1Desc": "Pada pengaturan printer, pilih «Bolak-balik» membalik pada tepi pendek.",
		"foldStep2Title": "2. Lipat menjadi dua",
		"foldStep2Desc": "Kumpulkan semua lembar cetak secara berurutan dan lipat bersama di bagian tengah.",
		"foldStep3Title": "3. Steples di punggung",
		"foldStep3Desc": "Beri 2 staples di lipatan tengah. Siap untuk diwarnai!",
		"btnFoldDismiss": "Mengerti",
		"tapToZoom": "Ketuk untuk memperbesar",
		"labelCartaSub": "Amerika",
		"labelA4Sub": "Internasional",
		"btnPrintPlate": "Cetak lembar ini",
		"btnShare": "Bagikan",
		"toastCopied": "Tautan disalin ke papan klip",
		"plateLabel": "Lembar",
		"foldGuideTrigger": "📖 Cara mencetak dan melipat?",
                "pageTitle": "Ekovoz: Sumber Gratis",
                "badge": "Sumber Terbuka Domain Publik",
                "title": "Mereka yang Berbahagia dari Tuhan Yesus",
                "desc": "Buku Mewarnai Khotbah di Bukit (Matius 5)",
                "langLabel": "Bahasa",
                "previewBadge": "Lihat 3 lembar contoh",
                "triptychTitle": "Lembar Unggulan",
                "triptychHint": "Ketuk lembar mana saja untuk resolusi tinggi",
                "btnTitleSheets": "Lembar Lepas (PDF)",
                "btnSubSheets": "Untuk layar atau mewarnai per halaman",
                "btnTitleBooklet": "Buku Saku (PDF)",
                "btnSubBooklet": "Untuk cetak buku lipat (Bolak-balik dan stapler)",
                "opticalTrigger": "Bagikan tanpa kabel (Layar ke kamera)",
                "offlineBadge": "100% offline dan dapat ditransfer layar ke kamera",
                "footerNote": "Karya pendidikan domain publik berdasarkan Matius 5. Bebas dicetak, diwarnai, dan dibagikan.",
                "contactBtn": "Kontak & Kolaborasi",
                "opticalModalTitle": "Transfer Optik (Layar ke Kamera)",
                "opticalStep1Title": "Kirim di Layar",
                "opticalStep1Desc": "Buka pemutar Ekovoz di layar ini untuk memproyeksikan buku dalam kode visual berkecepatan tinggi.",
                "opticalStep2Title": "Terima dengan Kamera",
                "opticalStep2Desc": "Arahkan kamera ponsel lain ke layar ini untuk mengunduh PDF secara lengkap tanpa internet.",
                "btnLaunchEkovoz": "Mulai Pemutar Ekovoz",
                "btnModalClose": "Tutup",
                "previewModalTitle": "Contoh Lembar Mewarnai",
                "plateModalTitle": "Pratinjau Resolusi Tinggi",
                "carouselPrev": "← Sebelumnya",
                "carouselNext": "Berikutnya →",
                "contactTitle": "Kontak & Kolaborasi Editorial",
                "contactCloseAria": "Tutup",
                "contactSubject": "Pesan dari Editorial Ekovoz",
                "contactNameLabel": "Nama atau Nama Samaran",
                "contactNamePlaceholder": "Nama Anda",
                "contactEmailLabel": "Alamat Email (untuk balasan)",
                "contactEmailPlaceholder": "anda@email.com",
                "contactMessageLabel": "Pesan atau Usulan Terjemahan",
                "contactMessagePlaceholder": "Bagaimana kita bisa berkolaborasi atau bahasa apa yang ingin Anda tinjau?",
                "contactCancel": "Batal",
                "contactSubmit": "Kirim Pesan",
                "contactSending": "Mengirim pesan...",
                "contactSuccess": "Pesan berhasil dikirim! Terima kasih telah menghubungi kami.",
                "contactError": "Gagal mengirim pesan. Silakan coba lagi nanti.",
                "contactConnectionError": "Kesalahan koneksi. Periksa koneksi internet Anda.",
                "contactTopicLabel": "Alasan / Topik",
                "optCollab": "Kolaborasi editorial atau penerjemahan",
                "optSupport": "Masalah unduhan atau pembacaan (Bantuan)",
                "optGeneral": "Pertanyaan umum atau saran",
                "githubIssueHint": "Lebih suka melaporkan masalah teknis publik?",
                "linkGithubIssue": "Buka issue di GitHub"
        },
        "tr": {
		"nameCarta": "Letter",
		"subCarta": "Amerika",
		"nameA4": "A4",
		"subA4": "Uluslararası",
		"focalVerse": "«…çünkü sizden önceki peygamberlere de böyle zulmettiler» (Mat 5:12b)",
		"plateIndexText": "Levha 24 / 28",
		"foldModalTitle": "Nasıl Yazdırılır ve Katlanır",
		"foldStep1Title": "1. Çift taraflı yazdırın",
		"foldStep1Desc": "Yazıcınızda, kısa kenardan çevirerek «Çift taraflı» seçeneğini etkinleştirin.",
		"foldStep2Title": "2. Ortadan ikiye katlayın",
		"foldStep2Desc": "Tüm sayfaları sırayla toplayın ve ortadan birlikte katlayın.",
		"foldStep3Title": "3. Sırtından zımbalayın",
		"foldStep3Desc": "Orta kat yerine 2 zımba uygulayın. Boyamaya hazır!",
		"btnFoldDismiss": "Anladım",
		"tapToZoom": "Büyütmek için dokunun",
		"labelCartaSub": "Amerika",
		"labelA4Sub": "Uluslararası",
		"btnPrintPlate": "Bu levhayı yazdır",
		"btnShare": "Paylaş",
		"toastCopied": "Bağlantı panoya kopyalandı",
		"plateLabel": "Levha",
		"foldGuideTrigger": "📖 Nasıl yazdırılır ve katlanır?",
                "pageTitle": "Ekovoz: Ücretsiz Kaynaklar",
                "badge": "Kamu Malı Açık Eğitim Kaynağı",
                "title": "Rab İsa'nın Mutlu Olanları",
                "desc": "Dağdaki Vaaz Boyama Kitabı (Matta 5)",
                "langLabel": "Dil",
                "previewBadge": "3 örnek sayfayı gör",
                "triptychTitle": "Öne Çıkan Levhalar",
                "triptychHint": "Yüksek çözünürlük için herhangi bir levhaya dokunun",
                "btnTitleSheets": "Tek Sayfalar (PDF)",
                "btnSubSheets": "Ekranda okumak veya sayfa sayfa boyamak için",
                "btnTitleBooklet": "Kitapçık (PDF)",
                "btnSubBooklet": "Katlanıp zımbalanan kitapçık baskısı için",
                "opticalTrigger": "Kablosuz paylaş (Ekrandan kameraya)",
                "offlineBadge": "100% çevrimdışı ve ekrandan kameraya aktarılabilir",
                "footerNote": "Matta 5 metnine dayalı kamu malı eğitim eseri. Basmak, boyamak ve paylaşmak serbesttir.",
                "contactBtn": "İletişim & İş Birliği",
                "opticalModalTitle": "Optik Aktarım (Ekrandan Kameraya)",
                "opticalStep1Title": "Ekranda Yansıt",
                "opticalStep1Desc": "Kitabı yüksek hızlı optik dizilerle iletmek için bu ekranda Ekovoz oynatıcıyı açın.",
                "opticalStep2Title": "Kamera ile Al",
                "opticalStep2Desc": "İnternet olmadan PDF'yi indirmek için herhangi bir telefon kamerasını bu ekrana yöneltin.",
                "btnLaunchEkovoz": "Ekovoz Oynatıcıyı Başlat",
                "btnModalClose": "Kapat",
                "previewModalTitle": "Boyama Levhaları Örneği",
                "plateModalTitle": "Yüksek Çözünürlüklü Önizleme",
                "carouselPrev": "← Önceki",
                "carouselNext": "Sonraki →",
                "contactTitle": "İletişim & Yayın İş Birliği",
                "contactCloseAria": "Kapat",
                "contactSubject": "Ekovoz Yayıncılık İletişim Mesajı",
                "contactNameLabel": "İsim veya Takma Ad",
                "contactNamePlaceholder": "Adınız",
                "contactEmailLabel": "E-posta Adresi (yanıt için)",
                "contactEmailPlaceholder": "adiniz@eposta.com",
                "contactMessageLabel": "Mesaj veya Çeviri Önerisi",
                "contactMessagePlaceholder": "Nasıl iş birliği yapabiliriz veya hangi dili incelemek istersiniz?",
                "contactCancel": "İptal",
                "contactSubmit": "Mesaj Gönder",
                "contactSending": "Mesaj gönderiliyor...",
                "contactSuccess": "Mesaj başarıyla gönderildi! Bizimle iletişime geçtiğiniz için teşekkür ederiz.",
                "contactError": "Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.",
                "contactConnectionError": "Bağlantı hatası. İnternet bağlantınızı kontrol edin.",
                "contactTopicLabel": "Konu / Başlık",
                "optCollab": "Editoryal iş birliği veya çeviri",
                "optSupport": "İndirme veya okuma sorunları (Destek)",
                "optGeneral": "Genel soru veya öneri",
                "githubIssueHint": "Herkese açık bir teknik sorun bildirmek ister misiniz?",
                "linkGithubIssue": "GitHub'da sorun açın"
        },
        "ru": {
		"nameCarta": "Letter",
		"subCarta": "Америка",
		"nameA4": "A4",
		"subA4": "Международный",
		"focalVerse": "«…ибо так гнали и пророков, бывших прежде вас» (Мф 5:12b)",
		"plateIndexText": "Лист 24 из 28",
		"foldModalTitle": "Как распечатать и сложить",
		"foldStep1Title": "1. Двусторонняя печать",
		"foldStep1Desc": "В настройках принтера выберите «Двусторонняя печать» с переворотом по короткому краю.",
		"foldStep2Title": "2. Сложите пополам",
		"foldStep2Desc": "Соберите все листы по порядку и согните их вместе по центру.",
		"foldStep3Title": "3. Скрепите скобами",
		"foldStep3Desc": "Закрепите 2 скобами по линии сгиба. Готово к раскрашиванию!",
		"btnFoldDismiss": "Понятно",
		"tapToZoom": "Нажмите для увеличения",
		"labelCartaSub": "Америка",
		"labelA4Sub": "Международный",
		"btnPrintPlate": "Печать этого листа",
		"btnShare": "Поделиться",
		"toastCopied": "Ссылка скопирована в буфер обмена",
		"plateLabel": "Лист",
		"foldGuideTrigger": "📖 Как распечатать и сложить?",
                "pageTitle": "Ekovoz: Бесплатные ресурсы",
                "badge": "Открытый Образовательный Материал",
                "title": "Блаженные Господа Иисуса",
                "desc": "Раскраска по Заповедям Блаженства (Матфея 5)",
                "langLabel": "Язык",
                "previewBadge": "Посмотреть 3 страницы",
                "triptychTitle": "Избранные Иллюстрации",
                "triptychHint": "Нажмите на любую страницу для высокого разрешения",
                "btnTitleSheets": "Отдельные Листы (PDF)",
                "btnSubSheets": "Для чтения с экрана или раскрашивания по страницам",
                "btnTitleBooklet": "Брошюра (PDF)",
                "btnSubBooklet": "Для печати книжки (Двусторонняя печать и скрепка)",
                "opticalTrigger": "Передать без проводов (С экрана на камеру)",
                "offlineBadge": "100% офлайн и передача с экрана на камеру",
                "footerNote": "Образовательное издание в общественном достоянии на основе Матфея 5. Свободно для печати и распространения.",
                "contactBtn": "Контакты и Сотрудничество",
                "opticalModalTitle": "Оптическая передача (Экран на камеру)",
                "opticalStep1Title": "Трансляция на экране",
                "opticalStep1Desc": "Откройте плеер Ekovoz на этом экране для передачи книги в виде оптических кодов.",
                "opticalStep2Title": "Прием камерой",
                "opticalStep2Desc": "Наведите камеру другого телефона на этот экран для полной загрузки книги без интернета.",
                "btnLaunchEkovoz": "Запустить плеер Ekovoz",
                "btnModalClose": "Закрыть",
                "previewModalTitle": "Образцы Страниц для Раскрашивания",
                "plateModalTitle": "Предпросмотр в Высоком Разрешении",
                "carouselPrev": "← Назад",
                "carouselNext": "Вперед →",
                "contactTitle": "Контакты и Редакционное Сотрудничество",
                "contactCloseAria": "Закрыть",
                "contactSubject": "Сообщение из редакции Ekovoz",
                "contactNameLabel": "Имя или Псевдоним",
                "contactNamePlaceholder": "Ваше имя",
                "contactEmailLabel": "Электронная почта (для ответа)",
                "contactEmailPlaceholder": "vy@email.ru",
                "contactMessageLabel": "Сообщение или Предложение по Переводу",
                "contactMessagePlaceholder": "В чём мы можем сотрудничать или какой язык вы хотите проверить?",
                "contactCancel": "Отмена",
                "contactSubmit": "Отправить Сообщение",
                "contactSending": "Отправка сообщения...",
                "contactSuccess": "Сообщение успешно отправлено! Спасибо за обращение.",
                "contactError": "Ошибка при отправке сообщения. Пожалуйста, попробуйте позже.",
                "contactConnectionError": "Ошибка соединения. Проверьте подключение к интернету.",
                "contactTopicLabel": "Тема / Причина",
                "optCollab": "Редакционное сотрудничество или перевод",
                "optSupport": "Проблемы со скачиванием или чтением (Поддержка)",
                "optGeneral": "Общий вопрос или предложение",
                "githubIssueHint": "Предпочитаете создать публичный запрос о проблеме?",
                "linkGithubIssue": "Открыть issue на GitHub"
        },
        "en": {
		"nameCarta": "Letter",
		"subCarta": "Americas",
		"nameA4": "A4",
		"subA4": "International",
		"focalVerse": "“…because in this same way, the spokespeople who came before you were also persecuted” (Mt 5:12b)",
		"plateIndexText": "Plate 24 of 28",
		"foldModalTitle": "How to Print and Fold",
		"foldStep1Title": "1. Print double-sided",
		"foldStep1Desc": "In your printer settings, select «Double-sided» flipping on short edge.",
		"foldStep2Title": "2. Fold in half",
		"foldStep2Desc": "Stack all printed pages in order and fold them together along the center.",
		"foldStep3Title": "3. Staple on spine",
		"foldStep3Desc": "Apply 2 staples along the center fold. Ready to color!",
		"btnFoldDismiss": "Got it",
		"tapToZoom": "Tap to zoom",
		"labelCartaSub": "Americas",
		"labelA4Sub": "International",
		"btnPrintPlate": "Print this plate",
		"btnShare": "Share",
		"toastCopied": "Link copied to clipboard",
		"plateLabel": "Plate",
		"foldGuideTrigger": "📖 How to print and fold?",
                "pageTitle": "Ekovoz: Free Resources",
                "badge": "Public Domain Educational Resource",
                "title": "The Blessed of the Lord Jesus",
                "desc": "Beatitudes Coloring Book (Matthew 5)",
                "langLabel": "Language",
                "previewBadge": "View 3 sample plates",
                "triptychTitle": "Featured Plates",
                "triptychHint": "Tap any plate to inspect in high resolution",
                "btnTitleSheets": "Single Sheets (PDF)",
                "btnSubSheets": "For screen viewing or coloring sheet by sheet",
                "btnTitleBooklet": "Booklet (PDF)",
                "btnSubBooklet": "For folded booklet printing (Duplex & stapled)",
                "opticalTrigger": "Share wirelessly (Screen to camera)",
                "offlineBadge": "100% offline and transferable screen-to-camera",
                "footerNote": "Public domain educational work based on Matthew 5. Free to print, color, and share.",
                "contactBtn": "Contact & Collaboration",
                "opticalModalTitle": "Optical Transfer (Screen to Camera)",
                "opticalStep1Title": "Stream on Screen",
                "opticalStep1Desc": "Launch the Ekovoz player on this display to broadcast the book via high-speed visual codes.",
                "opticalStep2Title": "Receive with Camera",
                "opticalStep2Desc": "Aim any smartphone camera at this screen to download the complete PDF without internet.",
                "btnLaunchEkovoz": "Launch Ekovoz Player",
                "btnModalClose": "Close",
                "previewModalTitle": "Coloring Plates Sample",
                "plateModalTitle": "High-Resolution Preview",
                "carouselPrev": "← Previous",
                "carouselNext": "Next →",
                "contactTitle": "Contact & Editorial Collaboration",
                "contactCloseAria": "Close",
                "contactSubject": "Message from Ekovoz Editorial",
                "contactNameLabel": "Name or Pseudonym",
                "contactNamePlaceholder": "Your name",
                "contactEmailLabel": "Email Address (for our reply)",
                "contactEmailPlaceholder": "you@email.com",
                "contactMessageLabel": "Message or Translation Proposal",
                "contactMessagePlaceholder": "How can we collaborate or which language would you like to review?",
                "contactCancel": "Cancel",
                "contactSubmit": "Send Message",
                "contactSending": "Sending message...",
                "contactSuccess": "Message sent successfully! Thank you for contacting us.",
                "contactError": "Error sending message. Please try again later.",
                "contactConnectionError": "Connection error. Please check your internet connection.",
                "contactTopicLabel": "Topic / Subject",
                "optCollab": "Editorial collaboration or translation",
                "optSupport": "Download or reading issues (Support)",
                "optGeneral": "General inquiry or suggestion",
                "githubIssueHint": "Prefer to report a public technical issue?",
                "linkGithubIssue": "Open issue on GitHub",
                "btnPrintPlate": "Print this plate",
                "btnShare": "Share",
                "toastCopied": "Link copied to clipboard",
                "plateLabel": "Plate",
                "foldGuideTrigger": "📖 How to print and fold?",
                "foldModalTitle": "How to Print and Fold"
        },
        "zh-Hans": {
		"nameCarta": "信纸",
		"subCarta": "美洲标准",
		"nameA4": "A4",
		"subA4": "国际通用",
		"focalVerse": "“……因为天国是他们的”（太 5:3b）",
		"plateIndexText": "图版 7 / 28",
		"foldModalTitle": "如何打印与折叠",
		"foldStep1Title": "1. 双面打印",
		"foldStep1Desc": "在打印机设置中，选择“双面打印”（沿短边翻转）。",
		"foldStep2Title": "2. 对折装订",
		"foldStep2Desc": "将所有打印好的纸张按顺序叠齐，沿中缝一起对折。",
		"foldStep3Title": "3. 书脊装订",
		"foldStep3Desc": "在中心折缝处订上2枚骑马钉。即可开始涂色！",
		"btnFoldDismiss": "明白",
		"tapToZoom": "点击放大",
		"labelCartaSub": "美洲信纸",
		"labelA4Sub": "国际A4",
		"btnPrintPlate": "打印此图版",
		"btnShare": "分享",
		"toastCopied": "链接已复制到剪贴板",
		"plateLabel": "图版",
		"foldGuideTrigger": "📖 如何打印与折叠？",
                "pageTitle": "Ekovoz: 免费资源",
                "badge": "公有领域教育资源",
                "title": "主耶稣蒙福的百姓",
                "desc": "八福填色书 (马太福音 5)",
                "langLabel": "语言",
                "previewBadge": "查看 3 张样品",
                "triptychTitle": "精选图版",
                "triptychHint": "点击任意图版查看高分辨率大图",
                "btnTitleSheets": "单页版 (PDF)",
                "btnSubSheets": "适合屏幕浏览或逐页涂色",
                "btnTitleBooklet": "小册子 (PDF)",
                "btnSubBooklet": "用于骑马钉装订打印 (双面与中缝装订)",
                "opticalTrigger": "无网光流传输 (屏幕对摄像头)",
                "offlineBadge": "100% 离线，支持屏幕对摄像头光学传输",
                "footerNote": "基于马太福音第5章的公有领域教育图书。可自由打印、涂色与分享。",
                "contactBtn": "联系与合作",
                "opticalModalTitle": "光学传输 (屏幕对摄像头)",
                "opticalStep1Title": "在屏幕上投射",
                "opticalStep1Desc": "在此屏幕上打开 Ekovoz 播放器，以高速视觉光流播送全书。",
                "opticalStep2Title": "用摄像头接收",
                "opticalStep2Desc": "用另一台手机的摄像头对准此屏幕，无需网络即可完整接收 PDF 文件。",
                "btnLaunchEkovoz": "启动 Ekovoz 播放器",
                "btnModalClose": "关闭",
                "previewModalTitle": "填色图版样品",
                "plateModalTitle": "高分辨率预览",
                "carouselPrev": "← 上一张",
                "carouselNext": "下一张 →",
                "contactTitle": "联系与编辑合作",
                "contactCloseAria": "关闭",
                "contactSubject": "来自 Ekovoz 编辑部的留言",
                "contactNameLabel": "姓名或笔名",
                "contactNamePlaceholder": "您的名字",
                "contactEmailLabel": "电子邮箱 (以便给您回复)",
                "contactEmailPlaceholder": "you@example.com",
                "contactMessageLabel": "留言或翻译建议",
                "contactMessagePlaceholder": "我们可以如何合作，或者您希望审校哪种语言？",
                "contactCancel": "取消",
                "contactSubmit": "发送留言",
                "contactSending": "正在发送留言...",
                "contactSuccess": "留言发送成功！感谢与我们联系。",
                "contactError": "发送失败，请稍后重试。",
                "contactConnectionError": "网络连接错误，请检查您的网络连接。",
                "contactTopicLabel": "事由 / 主题",
                "optCollab": "编辑协作或翻译建议",
                "optSupport": "下载或阅读问题（技术支持）",
                "optGeneral": "通用咨询或建议",
                "githubIssueHint": "更愿意提交公开的技术支持工单？",
                "linkGithubIssue": "在 GitHub 上提出 Issue"
        },
        "hi": {
		"nameCarta": "लेटर",
		"subCarta": "अमेरिका",
		"nameA4": "A4",
		"subA4": "अंतरराष्ट्रीय",
		"focalVerse": "“... क्योंकि इसी तरह से आपके सामने आने वाले वक्ताओं को भी सताया गया था।” (मत्ती 5:12b)",
		"plateIndexText": "चित्र 24 / 28",
		"foldModalTitle": "प्रिंट और मोड़ने की विधि",
		"foldStep1Title": "1. दोनों तरफ प्रिंट करें",
		"foldStep1Desc": "प्रिंटर सेटिंग्स में 'शॉर्ट एज' पर दोनों तरफ प्रिंट चुनें।",
		"foldStep2Title": "2. बीच से मोड़ें",
		"foldStep2Desc": "सभी पन्नों को क्रम में रखें और बीच से एक साथ मोड़ें।",
		"foldStep3Title": "3. बीच में स्टेपल करें",
		"foldStep3Desc": "बीच की मोड़ पर 2 स्टेपल लगाएं। रंग भरने के लिए तैयार!",
		"btnFoldDismiss": "समझ गया",
		"tapToZoom": "बड़ा करने के लिए टैप करें",
		"labelCartaSub": "लेटर",
		"labelA4Sub": "अंतरराष्ट्रीय A4",
		"btnPrintPlate": "यह चित्र प्रिंट करें",
		"btnShare": "साझा करें",
		"toastCopied": "लिंक क्लिपबोर्ड पर कॉपी हो गया",
		"plateLabel": "चित्र",
		"foldGuideTrigger": "📖 कैसे प्रिंट और मोड़ें?",
                "pageTitle": "Ekovoz: मुफ़्त संसाधन",
                "badge": "सार्वजनिक डोमेन शैक्षिक संसाधन",
                "title": "प्रभु यीशु के हर्षित लोग",
                "desc": "धन्यवचन रंग भरने की किताब (मत्ती 5)",
                "langLabel": "भाषा",
                "previewBadge": "3 नमूना पृष्ठ देखें",
                "triptychTitle": "विशेष चित्र",
                "triptychHint": "उच्च रिज़ॉल्यूशन के लिए किसी भी चित्र पर टैप करें",
                "btnTitleSheets": "अलग पृष्ठ (PDF)",
                "btnSubSheets": "स्क्रीन पर देखने या अलग पृष्ठ रंगने के लिए",
                "btnTitleBooklet": "पुस्तिका (PDF)",
                "btnSubBooklet": "मुद्रित पुस्तिका के लिए (दो तरफा और स्टेपल)",
                "opticalTrigger": "बिना तार साझा करें (स्क्रीन से कैमरा)",
                "offlineBadge": "100% ऑफ़लाइन और स्क्रीन-टू-कैमरा भेजने योग्य",
                "footerNote": "मत्ती 5 पर आधारित सार्वजनिक डोमेन शैक्षिक पुस्तक। प्रिंट, रंग भरने और साझा करने के लिए स्वतंत्र।",
                "contactBtn": "संपर्क और सहयोग",
                "opticalModalTitle": "ऑप्टिकल ट्रांसफर (स्क्रीन से कैमरा)",
                "opticalStep1Title": "स्क्रीन पर चलाएं",
                "opticalStep1Desc": "तेज गति के प्रकाश कोड द्वारा पुस्तक प्रसारित करने के लिए Ekovoz प्लेयर खोलें।",
                "opticalStep2Title": "कैमरे से प्राप्त करें",
                "opticalStep2Desc": "बिना इंटरनेट पूरी PDF डाउनलोड करने के लिए किसी भी फोन का कैमरा स्क्रीन की ओर करें।",
                "btnLaunchEkovoz": "Ekovoz प्लेयर शुरू करें",
                "btnModalClose": "बंद करें",
                "previewModalTitle": "रंग भरने वाले पन्नों का नमूना",
                "plateModalTitle": "उच्च रिज़ॉल्यूशन पूर्वावलोकन",
                "carouselPrev": "← पिछला",
                "carouselNext": "अगला →",
                "contactTitle": "संपर्क एवं संपादकीय सहयोग",
                "contactCloseAria": "बंद करें",
                "contactSubject": "Ekovoz संपादकीय संदेश",
                "contactNameLabel": "नाम या उपनाम",
                "contactNamePlaceholder": "आपका नाम",
                "contactEmailLabel": "ईमेल पता (उत्तर देने के लिए)",
                "contactEmailPlaceholder": "aapka@email.com",
                "contactMessageLabel": "संदेश या अनुवाद प्रस्ताव",
                "contactMessagePlaceholder": "हम कैसे सहयोग कर सकते हैं या आप किस भाषा की समीक्षा करना चाहते हैं?",
                "contactCancel": "रद्द करें",
                "contactSubmit": "संदेश भेजें",
                "contactSending": "संदेश भेजा जा रहा है...",
                "contactSuccess": "संदेश सफलतापूर्वक भेजा गया! हमसे संपर्क करने के लिए धन्यवाद।",
                "contactError": "संदेश भेजने में त्रुटि। कृपया बाद में पुनः प्रयास करें।",
                "contactConnectionError": "कनेक्शन त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।",
                "contactTopicLabel": "विषय / कारण",
                "optCollab": "संपादकीय सहयोग या अनुवाद",
                "optSupport": "डाउनलोड या पढ़ने में समस्या (सहायता)",
                "optGeneral": "सामान्य प्रश्न या सुझाव",
                "githubIssueHint": "सार्वजनिक तकनीकी समस्या दर्ज करना पसंद करते हैं?",
                "linkGithubIssue": "GitHub पर Issue खोलें"
        },
        "bn-BD": {
		"nameCarta": "লেটার (Letter)",
		"subCarta": "আমেরিকা (MX/US)",
		"nameA4": "A4",
		"subA4": "আন্তর্জাতিক (বাংলাদেশ/বিশ্ব)",
		"focalVerse": "“…কারণ এইভাবে তোমাদের আগের নবীদেরও তারা জুলুম করেছিল।” (মতী ৫:১২b)",
		"plateIndexText": "পাতা ২৪ / ২৮",
		"foldModalTitle": "মুদ্রণ ও ভাঁজ করার নিয়ম (A4 / ২ কলাম)",
		"foldStep1Title": "১. উভয় পিঠে মুদ্রণ (Horizontal)",
		"foldStep1Desc": "প্রিন্টার সেটিংসে 'শর্ট এজ' বেছে উভয় পিঠে প্রিন্ট করুন।",
		"foldStep2Title": "২. মাঝে ভাঁজ করুন",
		"foldStep2Desc": "সব পাতা ক্রমানুসারে সাজিয়ে একসাথে মাঝে ভাঁজ করুন।",
		"foldStep3Title": "৩. মাঝে সেলাই বা স্টেপল করুন",
		"foldStep3Desc": "মাঝখানের ভাঁজে সেলাই বা ২টি পিন লাগান। পড়ার ও রঙ করার জন্য প্রস্তুত!",
		"btnFoldDismiss": "বুঝেছি",
		"tapToZoom": "বড় করে দেখতে ট্যাপ করুন",
		"labelCartaSub": "লেটার",
		"labelA4Sub": "বাংলাদেশ ও আন্তর্জাতিক A4",
		"btnPrintPlate": "এই পাতা প্রিন্ট করুন",
		"btnShare": "শেয়ার করুন",
		"toastCopied": "লিংক ক্লিপবোর্ডে কপি হয়েছে",
		"plateLabel": "পাতা",
		"foldGuideTrigger": "📖 কীভাবে প্রিন্ট ও ভাঁজ করবেন?",
                "pageTitle": "Ekovoz: কিতাবুল মোকাদ্দস ও উন্মুক্ত শিক্ষা সম্পদ (বাংলাদেশ)",
                "badge": "পাবলিক ডোমেন উন্মুক্ত সম্পদ · বাংলাদেশ (bn-BD)",
                "title": "ঈসা মসীহের মোবারক মানুষ",
                "desc": "মতী ৫ (মোবারক বাণী) — কিতাবুল মোকাদ্দস / মুসলমানি বাংলা রেজিস্টার",
                "langLabel": "ভাষা / Language:",
                "previewBadge": "৩টি নমুনা পাতা দেখুন",
                "triptychTitle": "নির্বাচিত পাতা",
                "triptychHint": "উচ্চ রেজোলিউশনে দেখতে যেকোনো পাতায় ট্যাপ করুন",
                "btnTitleSheets": "একক পাতা (PDF · Print)",
                "btnSubSheets": "পর্দায় দেখতে বা পাতা ধরে রং করতে",
                "btnTitleBooklet": "বুকলেট (PDF · Booklet)",
                "btnSubBooklet": "ভাঁজ করা পুস্তিকা মুদ্রণের জন্য (উভয় পিঠ ও স্টেপল)",
                "opticalTrigger": "তারহীন আদান-প্রদান (পর্দা থেকে ক্যামেরা)",
                "offlineBadge": "১০০% অফলাইনে পর্দা থেকে ক্যামেরায় স্থানান্তরযোগ্য",
                "footerNote": "মতী ৫ ভিত্তিক পাবলিক ডোমেন শিক্ষামূলক প্রকাশনা। অবাধে মুদ্রণ, রং করা ও শেয়ারের জন্য উন্মুক্ত।",
                "contactBtn": "যোগাযোগ ও সহযোগিতা",
                "opticalModalTitle": "আলোকীয় স্থানান্তর (পর্দা থেকে ক্যামেরা)",
                "opticalStep1Title": "পর্দায় সম্প্রচার",
                "opticalStep1Desc": "উচ্চগতির আলোকীয় কোডে বইটি সম্প্রচার করতে Ekovoz প্লেয়ার খুলুন।",
                "opticalStep2Title": "ক্যামেরা দিয়ে গ্রহণ",
                "opticalStep2Desc": "ইন্টারনেট ছাড়া সম্পূর্ণ PDF পেতে ক্যামেরার সাহায্যে পর্দায় তাকান।",
                "btnLaunchEkovoz": "Ekovoz প্লেয়ার খুলুন",
                "btnModalClose": "বন্ধ করুন",
                "previewModalTitle": "রং করার পাতার নমুনা",
                "plateModalTitle": "উচ্চ রেজোলিউশন প্রিভিউ",
                "carouselPrev": "← পূর্ববর্তী",
                "carouselNext": "পরবর্তী →",
                "contactTitle": "যোগাযোগ ও সম্পাদকীয় সহযোগিতা",
                "contactCloseAria": "বন্ধ করুন",
                "contactSubject": "Ekovoz সম্পাদকীয় বার্তা (bn-BD)",
                "contactNameLabel": "নাম বা ছদ্মনাম",
                "contactNamePlaceholder": "আপনার নাম",
                "contactEmailLabel": "ইমেইল ঠিকানা (উত্তরের জন্য)",
                "contactEmailPlaceholder": "apni@email.bd",
                "contactMessageLabel": "বার্তা বা অনুবাদ প্রস্তাব",
                "contactMessagePlaceholder": "আমরা কীভাবে সহযোগিতা করতে পারি বা আপনি কোন ভাষা পর্যালোচনা করতে চান?",
                "contactCancel": "বাতিল",
                "contactSubmit": "বার্তা পাঠান",
                "contactSending": "বার্তা পাঠানো হচ্ছে...",
                "contactSuccess": "বার্তা সফলভাবে পাঠানো হয়েছে! আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ।",
                "contactError": "বার্তা পাঠাতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।",
                "contactConnectionError": "সংযোগ ত্রুটি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।",
                "contactTopicLabel": "বিষয় / কারণ",
                "optCollab": "সম্পাদনা সহযোগিতা বা অনুবাদ",
                "optSupport": "ডাউনলোড বা পড়ার সমস্যা (সহায়তা)",
                "optGeneral": "সাধারণ অনুসন্ধান বা পরামর্শ",
                "githubIssueHint": "একটি প্রকাশ্য প্রযুক্তিগত সমস্যা রিপোর্ট করতে চান?",
                "linkGithubIssue": "GitHub-এ Issue খুলুন"
        },
        "bn-IN": {
		"nameCarta": "লেটার",
		"subCarta": "আমেরিকা",
		"nameA4": "A4",
		"subA4": "আন্তর্জাতিক",
		"focalVerse": "“…কারণ এইভাবে, আপনার আগে আসা মুখপাত্ররাও নির্যাতিত হয়েছিল।” (মথি ৫:12b)",
		"plateIndexText": "পাতা ২৪ / ২৮",
		"foldModalTitle": "মুদ্রণ ও ভাঁজ করার নিয়ম",
		"foldStep1Title": "১. উভয় পিঠে মুদ্রণ",
		"foldStep1Desc": "প্রিন্টার সেটিংসে 'শর্ট এজ' বেছে উভয় পিঠে প্রিন্ট করুন।",
		"foldStep2Title": "২. মাঝে ভাঁজ করুন",
		"foldStep2Desc": "সব পাতা ক্রমানুসারে সাজিয়ে একসাথে মাঝে ভাঁজ করুন।",
		"foldStep3Title": "৩. মাঝে স্টেপল করুন",
		"foldStep3Desc": "মাঝখানের ভাঁজে ২টি স্টেপলার পিন লাগান। রঙ করার জন্য প্রস্তুত!",
		"btnFoldDismiss": "বুঝেছি",
		"tapToZoom": "বড় করে দেখতে ট্যাপ করুন",
		"labelCartaSub": "লেটার",
		"labelA4Sub": "আন্তর্জাতিক A4",
		"btnPrintPlate": "এই পাতা প্রিন্ট করুন",
		"btnShare": "শেয়ার করুন",
		"toastCopied": "লিংক ক্লিপবোর্ডে কপি হয়েছে",
		"plateLabel": "পাতা",
		"foldGuideTrigger": "📖 কীভাবে প্রিন্ট ও ভাঁজ করবেন?",
                "pageTitle": "Ekovoz: বিনামূল্যের সম্পদ (ভারত / প্রচলিত বাংলা)",
                "badge": "পাবলিক ডোমেন শিক্ষা সম্পদ · প্রচলিত বাংলা (bn-IN)",
                "title": "প্রভু যীশুর আনন্দময় মানুষ",
                "desc": "অষ্ট আশীর্বাদ রং করার বই (মথি ৫ · প্রচলিত চলিত রীতি)",
                "langLabel": "ভাষা / Language:",
                "previewBadge": "৩টি নমুনা পাতা দেখুন",
                "triptychTitle": "নির্বাচিত পাতা",
                "triptychHint": "উচ্চ রেজোলিউশনে দেখতে যেকোনো পাতায় ট্যাপ করুন",
                "btnTitleSheets": "একক পাতা (PDF · Print)",
                "btnSubSheets": "পর্দায় দেখতে বা পাতা ধরে রং করতে",
                "btnTitleBooklet": "বুকলেট (PDF · Booklet)",
                "btnSubBooklet": "ভাঁজ করা পুস্তিকা মুদ্রণের জন্য (উভয় পিঠ ও স্টেপল)",
                "opticalTrigger": "তারহীন আদান-প্রদান (পর্দা থেকে ক্যামেরা)",
                "offlineBadge": "১০০% অফলাইনে পর্দা থেকে ক্যামেরায় স্থানান্তরযোগ্য",
                "footerNote": "মথি ৫ ভিত্তিক পাবলিক ডোমেন শিক্ষামূলক প্রকাশনা। অবাধে মুদ্রণ, রং করা ও শেয়ারের জন্য উন্মুক্ত।",
                "contactBtn": "যোগাযোগ ও সহযোগিতা",
                "opticalModalTitle": "আলোকীয় স্থানান্তর (পর্দা থেকে ক্যামেরা)",
                "opticalStep1Title": "পর্দায় সম্প্রচার",
                "opticalStep1Desc": "উচ্চগতির আলোকীয় কোডে বইটি সম্প্রচার করতে Ekovoz প্লেয়ার খুলুন।",
                "opticalStep2Title": "ক্যামেরা দিয়ে গ্রহণ",
                "opticalStep2Desc": "ইন্টারনেট ছাড়া সম্পূর্ণ PDF পেতে ক্যামেরার সাহায্যে পর্দায় তাকান।",
                "btnLaunchEkovoz": "Ekovoz প্লেয়ার খুলুন",
                "btnModalClose": "বন্ধ করুন",
                "previewModalTitle": "রং করার পাতার নমুনা",
                "plateModalTitle": "উচ্চ রেজোলিউশন প্রিভিউ",
                "carouselPrev": "← পূর্ববর্তী",
                "carouselNext": "পরবর্তী →",
                "contactTitle": "যোগাযোগ ও সম্পাদকীয় সহযোগিতা",
                "contactCloseAria": "বন্ধ করুন",
                "contactSubject": "Ekovoz সম্পাদকীয় বার্তা (bn-IN)",
                "contactNameLabel": "নাম বা ছদ্মনাম",
                "contactNamePlaceholder": "আপনার নাম",
                "contactEmailLabel": "ইমেইল ঠিকানা (উত্তরের জন্য)",
                "contactEmailPlaceholder": "apni@email.in",
                "contactMessageLabel": "বার্তা বা অনুবাদ প্রস্তাব",
                "contactMessagePlaceholder": "আমরা কীভাবে সহযোগিতা করতে পারি বা আপনি কোন ভাষা পর্যালোচনা করতে চান?",
                "contactCancel": "বাতিল",
                "contactSubmit": "বার্তা পাঠান",
                "contactSending": "বার্তা পাঠানো হচ্ছে...",
                "contactSuccess": "বার্তা সফলভাবে পাঠানো হয়েছে! আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ।",
                "contactError": "বার্তা পাঠাতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।",
                "contactConnectionError": "সংযোগ ত্রুটি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।",
                "contactTopicLabel": "বিষয় / কারণ",
                "optCollab": "সম্পাদনা সহযোগিতা বা অনুবাদ",
                "optSupport": "ডাউনলোড বা পড়ার সমস্যা (সহায়তা)",
                "optGeneral": "সাধারণ অনুসন্ধান বা পরামর্শ",
                "githubIssueHint": "একটি প্রকাশ্য প্রযুক্তিগত সমস্যা রিপোর্ট করতে চান?",
                "linkGithubIssue": "GitHub-এ Issue খুলুন"
        },
        "bn": {
		"nameCarta": "লেটার",
		"subCarta": "আমেরিকা",
		"nameA4": "A4",
		"subA4": "আন্তর্জাতিক",
		"focalVerse": "“…কারণ এইভাবে, আপনার আগে আসা মুখপাত্ররাও নির্যাতিত হয়েছিল।” (মথি ৫:12b)",
		"plateIndexText": "পাতা ২৪ / ২৮",
		"foldModalTitle": "মুদ্রণ ও ভাঁজ করার নিয়ম",
		"foldStep1Title": "১. উভয় পিঠে মুদ্রণ",
		"foldStep1Desc": "প্রিন্টার সেটিংসে 'শর্ট এজ' বেছে উভয় পিঠে প্রিন্ট করুন।",
		"foldStep2Title": "২. মাঝে ভাঁজ করুন",
		"foldStep2Desc": "সব পাতা ক্রমানুসারে সাজিয়ে একসাথে মাঝে ভাঁজ করুন।",
		"foldStep3Title": "৩. মাঝে স্টেপল করুন",
		"foldStep3Desc": "মাঝখানের ভাঁজে ২টি স্টেপলার পিন লাগান। রঙ করার জন্য প্রস্তুত!",
		"btnFoldDismiss": "বুঝেছি",
		"tapToZoom": "বড় করে দেখতে ট্যাপ করুন",
		"labelCartaSub": "লেটার",
		"labelA4Sub": "আন্তর্জাতিক A4",
		"btnPrintPlate": "এই পাতা প্রিন্ট করুন",
		"btnShare": "শেয়ার করুন",
		"toastCopied": "লিংক ক্লিপবোর্ডে কপি হয়েছে",
		"plateLabel": "পাতা",
		"foldGuideTrigger": "📖 কীভাবে প্রিন্ট ও ভাঁজ করবেন?",
                "pageTitle": "Ekovoz: বিনামূল্যের সম্পদ",
                "badge": "পাবলিক ডোমেন শিক্ষা সম্পদ",
                "title": "প্রভু যীশুর আনন্দময় মানুষ",
                "desc": "অষ্ট আশীর্বাদ রং করার বই (মথি ৫)",
                "langLabel": "ভাষা",
                "previewBadge": "৩টি নমুনা পাতা দেখুন",
                "triptychTitle": "নির্বাচিত পাতা",
                "triptychHint": "উচ্চ রেজোলিউশনে দেখতে যেকোনো পাতায় ট্যাপ করুন",
                "btnTitleSheets": "একক পাতা (PDF)",
                "btnSubSheets": "পর্দায় দেখতে বা পাতা ধরে রং করতে",
                "btnTitleBooklet": "বুকলেট (PDF)",
                "btnSubBooklet": "ভাঁজ করা পুস্তিকা মুদ্রণের জন্য (উভয় পিঠ ও স্টেপল)",
                "opticalTrigger": "তারহীন আদান-প্রদান (পর্দা থেকে ক্যামেরা)",
                "offlineBadge": "১০০% অফলাইনে পর্দা থেকে ক্যামেরায় স্থানান্তরযোগ্য",
                "footerNote": "মথি ৫ ভিত্তিক পাবলিক ডোমেন শিক্ষামূলক প্রকাশনা। অবাধে মুদ্রণ, রং করা ও শেয়ারের জন্য উন্মুক্ত।",
                "contactBtn": "যোগাযোগ ও সহযোগিতা",
                "opticalModalTitle": "আলোকীয় স্থানান্তর (পর্দা থেকে ক্যামেরা)",
                "opticalStep1Title": "পর্দায় সম্প্রচার",
                "opticalStep1Desc": "উচ্চগতির আলোকীয় কোডে বইটি সম্প্রচার করতে Ekovoz প্লেয়ার খুলুন।",
                "opticalStep2Title": "ক্যামেরা দিয়ে গ্রহণ",
                "opticalStep2Desc": "ইন্টারনেট ছাড়া সম্পূর্ণ PDF পেতে ক্যামেরার সাহায্যে পর্দায় তাকান।",
                "btnLaunchEkovoz": "Ekovoz প্লেয়ার খুলুন",
                "btnModalClose": "বন্ধ করুন",
                "previewModalTitle": "রং করার পাতার নমুনা",
                "plateModalTitle": "উচ্চ রেজোলিউশন প্রিভিউ",
                "carouselPrev": "← পূর্ববর্তী",
                "carouselNext": "পরবর্তী →",
                "contactTitle": "যোগাযোগ ও সম্পাদকীয় সহযোগিতা",
                "contactCloseAria": "বন্ধ করুন",
                "contactSubject": "Ekovoz সম্পাদকীয় বার্তা",
                "contactNameLabel": "নাম বা ছদ্মনাম",
                "contactNamePlaceholder": "আপনার নাম",
                "contactEmailLabel": "ইমেইল ঠিকানা (উত্তরের জন্য)",
                "contactEmailPlaceholder": "apni@email.com",
                "contactMessageLabel": "বার্তা বা অনুবাদ প্রস্তাব",
                "contactMessagePlaceholder": "আমরা কীভাবে সহযোগিতা করতে পারি বা আপনি কোন ভাষা পর্যালোচনা করতে চান?",
                "contactCancel": "বাতিল",
                "contactSubmit": "বার্তা পাঠান",
                "contactSending": "বার্তা পাঠানো হচ্ছে...",
                "contactSuccess": "বার্তা সফলভাবে পাঠানো হয়েছে! আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ।",
                "contactError": "বার্তা পাঠাতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।",
                "contactConnectionError": "সংযোগ ত্রুটি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।",
                "contactTopicLabel": "বিষয় / কারণ",
                "optCollab": "সম্পাদনা সহযোগিতা বা অনুবাদ",
                "optSupport": "ডাউনলোড বা পড়ার সমস্যা (সহায়তা)",
                "optGeneral": "সাধারণ অনুসন্ধান বা পরামর্শ",
                "githubIssueHint": "একটি প্রকাশ্য প্রযুক্তিগত সমস্যা রিপোর্ট করতে চান?",
                "linkGithubIssue": "GitHub-এ Issue খুলুন"
        },
        "ar": {
		"nameCarta": "رسالة",
		"subCarta": "الأمريكتان",
		"nameA4": "A4",
		"subA4": "دولي",
		"focalVerse": "«لأنك على خطى من تحدث قبلك؛ فقد تعرضوا هم أيضاً للاضطهاد» (متى 5:12b)",
		"plateIndexText": "لوحة ٢٤ من ٢٨",
		"foldModalTitle": "كيفية الطباعة والطي",
		"foldStep1Title": "١. طباعة على الوجهين",
		"foldStep1Desc": "في إعدادات الطابعة، فعّل «الطباعة على الوجهين» مع التقليب على الحافة القصيرة.",
		"foldStep2Title": "٢. الطي من المنتصف",
		"foldStep2Desc": "رتّب الأوراق المطبوعة بالتسلسل واطوها معاً من الوسط.",
		"foldStep3Title": "٣. التدبيس في المنتصف",
		"foldStep3Desc": "ضع دبوسين على خط الطي في الوسط. جاهز للتلوين!",
		"btnFoldDismiss": "فهمت",
		"tapToZoom": "المس للتكبير",
		"labelCartaSub": "أمريكا",
		"labelA4Sub": "دولي",
		"btnPrintPlate": "طباعة هذه اللوحة",
		"btnShare": "مشاركة",
		"toastCopied": "تم نسخ الرابط إلى الحافظة",
		"plateLabel": "لوحة",
		"foldGuideTrigger": "📖 كيفية الطباعة والطي؟",
                "pageTitle": "إيكوفوز: موارد تعليمية مجانية",
                "badge": "مورد مفتوح في الملك العام",
                "title": "شعب الرب يسوع المبتهجون",
                "desc": "كراسة تلوين للأطفال حول التطويبات (متى ٥)",
                "langLabel": "اللغة",
                "previewBadge": "عرض ٣ لوحات نموذجية",
                "triptychTitle": "لوحات مميزة",
                "triptychHint": "المس أي لوحة لرؤيتها بدقة عالية",
                "btnTitleSheets": "صفحات فردية (PDF)",
                "btnSubSheets": "للعرض أو التلوين ورقة بورقة",
                "btnTitleBooklet": "كتيب قابل للطي (PDF)",
                "btnSubBooklet": "للطباعة على الوجهين والتدبيس في المنتصف",
                "opticalTrigger": "مشاركة لاسلكية (من شاشة إلى كاميرا)",
                "offlineBadge": "١٠٠٪ بدون إنترنت وينتقل من شاشة لكاميرا",
                "footerNote": "عمل تعليمي في الملك العام يستند إلى إنجيل متى ٥. مجاني للطباعة والتلوين والمشاركة.",
                "contactBtn": "اتصال وتعاون",
                "opticalModalTitle": "النقل البصري (من شاشة إلى كاميرا)",
                "opticalStep1Title": "البث على الشاشة",
                "opticalStep1Desc": "افتح مشغل إيكوفوز على هذه الشاشة لبث العمل بتسلسلات ضوئية عالية السرعة بدون إنترنت أو بلوتوث.",
                "opticalStep2Title": "الاستقبال بالكاميرا",
                "opticalStep2Desc": "وجّه كاميرا أي هاتف نحو هذه الشاشة لتنزيل كراسة التلوين كاملة بصيغة PDF فوراً.",
                "btnLaunchEkovoz": "تشغيل مشغل إيكوفوز",
                "btnModalClose": "إغلاق",
                "previewModalTitle": "عينة من لوحات التلوين",
                "plateModalTitle": "معاينة بدقة عالية",
                "carouselPrev": "← السابق",
                "carouselNext": "التالي →",
                "contactTitle": "الاتصال والتعاون التحريري",
                "contactCloseAria": "إغلاق",
                "contactSubject": "رسالة إلى إيكوفوز",
                "contactNameLabel": "الاسم أو اللقب",
                "contactNamePlaceholder": "اسمك الكريم",
                "contactEmailLabel": "البريد الإلكتروني (للرد عليك)",
                "contactEmailPlaceholder": "you@example.com",
                "contactMessageLabel": "رسالتك أو اقتراح الترجمة",
                "contactMessagePlaceholder": "كيف يمكننا التعاون أو ما هي اللغة التي ترغب في مراجعتها؟",
                "contactCancel": "إلغاء",
                "contactSubmit": "إرسال الرسالة",
                "contactSending": "جارٍ إرسال الرسالة...",
                "contactSuccess": "تم إرسال الرسالة بنجاح! شكراً لتواصلك معنا.",
                "contactError": "حدث خطأ أثناء الإرسال. يرجى المحاولة لاحقاً.",
                "contactConnectionError": "خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت.",
                "contactTopicLabel": "الموضوع / السبب",
                "optCollab": "تعاون تحريري أو ترجمة",
                "optSupport": "مشكلات التنزيل أو القراءة (الدعم الفني)",
                "optGeneral": "استفسار عام أو اقتراح",
                "githubIssueHint": "هل تفضل فتح تذكرة دعم فني عامة؟",
                "linkGithubIssue": "فتح مسألة على GitHub"
        },
        "fr": {
		"nameCarta": "Lettre",
		"subCarta": "Amériques",
		"nameA4": "A4",
		"subA4": "International",
		"focalVerse": "« ...car c'est ainsi que les messagers qui vous ont précédés ont été persécutés » (Mt 5:12b)",
		"plateIndexText": "Planche 24 sur 28",
		"foldModalTitle": "Comment Imprimer et Plier",
		"foldStep1Title": "1. Imprimer en recto-verso",
		"foldStep1Desc": "Dans votre imprimante, activez « Recto-verso » en retournant sur le bord court.",
		"foldStep2Title": "2. Plier en deux",
		"foldStep2Desc": "Rassemblez les feuilles dans l'ordre et pliez-les ensemble par le milieu.",
		"foldStep3Title": "3. Agrafer au pli",
		"foldStep3Desc": "Placez 2 agrafes sur le pli central. Prêt à colorier !",
		"btnFoldDismiss": "Compris",
		"tapToZoom": "Toucher pour agrandir",
		"labelCartaSub": "Amériques",
		"labelA4Sub": "International",
		"btnPrintPlate": "Imprimer cette planche",
		"btnShare": "Partager",
		"toastCopied": "Lien copié dans le presse-papiers",
		"plateLabel": "Planche",
		"foldGuideTrigger": "📖 Comment imprimer et plier ?",
                "pageTitle": "Ekovoz : Ressources Gratuites",
                "badge": "Ressource Éducative du Domaine Public",
                "title": "Les Heureux du Seigneur Jésus",
                "desc": "Cahier de Coloriage sur les Béatitudes (Matthieu 5)",
                "langLabel": "Langue",
                "previewBadge": "Voir 3 planches d'exemple",
                "triptychTitle": "Planches Sélectionnées",
                "triptychHint": "Touchez une planche pour la voir en haute résolution",
                "btnTitleSheets": "Feuilles Individuelles (PDF)",
                "btnSubSheets": "Pour lecture écran ou coloriage page par page",
                "btnTitleBooklet": "Livret Plié (PDF)",
                "btnSubBooklet": "Pour impression brochure (Recto-verso et agrafé)",
                "opticalTrigger": "Partage sans fil (Écran à caméra)",
                "offlineBadge": "100% hors ligne et transférable écran-à-caméra",
                "footerNote": "Œuvre éducative du domaine public basée sur Matthieu 5. Libre d'imprimer, colorier et partager.",
                "contactBtn": "Contact & Collaboration",
                "opticalModalTitle": "Transfert Optique (Écran à Caméra)",
                "opticalStep1Title": "Diffuser sur l'Écran",
                "opticalStep1Desc": "Ouvrez le lecteur Ekovoz sur cet écran pour projeter l'ouvrage en séquences visuelles rapides sans réseau ni Bluetooth.",
                "opticalStep2Title": "Recevoir avec la Caméra",
                "opticalStep2Desc": "Pointez la caméra d'un autre appareil vers cet écran pour télécharger le livret PDF complet immédiatement.",
                "btnLaunchEkovoz": "Démarrer le Lecteur Ekovoz",
                "btnModalClose": "Fermer",
                "previewModalTitle": "Exemples de Planches à Colorier",
                "plateModalTitle": "Aperçu Haute Résolution",
                "carouselPrev": "← Précédent",
                "carouselNext": "Suivant →",
                "contactTitle": "Contact & Collaboration Éditoriale",
                "contactCloseAria": "Fermer",
                "contactSubject": "Message depuis le site Ekovoz",
                "contactNameLabel": "Nom ou Pseudonyme",
                "contactNamePlaceholder": "Votre nom",
                "contactEmailLabel": "Adresse E-mail (pour vous répondre)",
                "contactEmailPlaceholder": "vous@email.fr",
                "contactMessageLabel": "Message ou Proposition de Traduction",
                "contactMessagePlaceholder": "Comment pouvons-nous collaborer ou quelle langue souhaitez-vous réviser ?",
                "contactCancel": "Annuler",
                "contactSubmit": "Envoyer le Message",
                "contactSending": "Envoi du message en cours...",
                "contactSuccess": "Message envoyé avec succès ! Merci de nous avoir contactés.",
                "contactError": "Erreur lors de l'envoi. Veuillez réessayer plus tard.",
                "contactConnectionError": "Erreur de connexion. Vérifiez votre connexion Internet.",
                "contactTopicLabel": "Motif / Sujet",
                "optCollab": "Collaboration éditoriale ou traduction",
                "optSupport": "Problèmes de téléchargement ou lecture (Support)",
                "optGeneral": "Demande générale ou suggestion",
                "githubIssueHint": "Vous préférez signaler un problème technique public ?",
                "linkGithubIssue": "Ouvrir un ticket sur GitHub"
        },
        "pt": {
		"nameCarta": "Carta",
		"subCarta": "Américas",
		"nameA4": "A4",
		"subA4": "Internacional",
		"focalVerse": "«…pois assim perseguiram os profetas que foram antes de vós» (Mt 5:12b)",
		"plateIndexText": "Prancha 24 de 28",
		"foldModalTitle": "Como Imprimir e Dobrar",
		"foldStep1Title": "1. Imprima frente e verso",
		"foldStep1Desc": "Na sua impressora, selecione «Frente e verso» virando pela borda curta.",
		"foldStep2Title": "2. Dobre ao meio",
		"foldStep2Desc": "Junte todas as folhas impressas em ordem e dobre-as juntas pelo centro.",
		"foldStep3Title": "3. Grampeie na lombada",
		"foldStep3Desc": "Aplique 2 grampos na dobra central. Pronto para colorir!",
		"btnFoldDismiss": "Entendido",
		"tapToZoom": "Toque para ampliar",
		"labelCartaSub": "Américas",
		"labelA4Sub": "Internacional",
		"btnPrintPlate": "Imprimir esta prancha",
		"btnShare": "Compartilhar",
		"toastCopied": "Link copiado para a área de transferência",
		"plateLabel": "Prancha",
		"foldGuideTrigger": "📖 Como imprimir e dobrar?",
                "pageTitle": "Ekovoz: Recursos Gratuitos",
                "badge": "Recurso Aberto de Domínio Público",
                "title": "Os Bem-Aventurados do Senhor Jesus",
                "desc": "Caderno de Colorir sobre as Bem-Aventuranças (Mateus 5)",
                "langLabel": "Idioma",
                "previewBadge": "Ver 3 pranchas de exemplo",
                "triptychTitle": "Pranchas em Destaque",
                "triptychHint": "Toque em qualquer prancha para ver em alta resolução",
                "btnTitleSheets": "Folhas Avulsas (PDF)",
                "btnSubSheets": "Para ver na tela ou colorir página por página",
                "btnTitleBooklet": "Livreto Dobrado (PDF)",
                "btnSubBooklet": "Para impressão em livreto (Frente e verso e grampeado)",
                "opticalTrigger": "Compartilhar sem fio (Tela para câmera)",
                "offlineBadge": "100% offline e transferível de tela para câmera",
                "footerNote": "Obra educativa de domínio público baseada em Mateus 5. Livre para imprimir, colorir e compartilhar.",
                "contactBtn": "Contato & Colaboração",
                "opticalModalTitle": "Transferência Óptica (Tela para Câmera)",
                "opticalStep1Title": "Transmitir na Tela",
                "opticalStep1Desc": "Abra o reprodutor Ekovoz nesta tela para projetar a obra em sequências ópticas de alta velocidade sem internet nem Bluetooth.",
                "opticalStep2Title": "Receber com a Câmera",
                "opticalStep2Desc": "Aponte a câmera de qualquer celular para esta tela para baixar o PDF completo sem fio.",
                "btnLaunchEkovoz": "Iniciar Reprodutor Ekovoz",
                "btnModalClose": "Fechar",
                "previewModalTitle": "Amostra de Pranchas para Colorir",
                "plateModalTitle": "Pré-visualização em Alta Resolução",
                "carouselPrev": "← Anterior",
                "carouselNext": "Próximo →",
                "contactTitle": "Contato & Colaboração Editorial",
                "contactCloseAria": "Fechar",
                "contactSubject": "Mensagem da Ekovoz Editorial",
                "contactNameLabel": "Nome ou Pseudônimo",
                "contactNamePlaceholder": "Seu nome",
                "contactEmailLabel": "Endereço de E-mail (para resposta)",
                "contactEmailPlaceholder": "voce@email.com",
                "contactMessageLabel": "Mensagem ou Proposta de Tradução",
                "contactMessagePlaceholder": "Como podemos colaborar ou qual idioma você gostaria de revisar?",
                "contactCancel": "Cancelar",
                "contactSubmit": "Enviar Mensagem",
                "contactSending": "Enviando mensagem...",
                "contactSuccess": "Mensagem enviada com sucesso! Obrigado por entrar em contato.",
                "contactError": "Erro ao enviar a mensagem. Tente novamente mais tarde.",
                "contactConnectionError": "Erro de conexão. Verifique sua conexão com a Internet.",
                "contactTopicLabel": "Motivo / Assunto",
                "optCollab": "Colaboração editorial ou tradução",
                "optSupport": "Problemas de download ou leitura (Suporte)",
                "optGeneral": "Consulta geral ou sugestão",
                "githubIssueHint": "Prefere relatar um problema técnico público?",
                "linkGithubIssue": "Abrir issue no GitHub"
        },
        "ja": {
		"nameCarta": "レター",
		"subCarta": "米国規格",
		"nameA4": "A4",
		"subA4": "国際規格",
		"focalVerse": "「……あなたがたより前にいた預言者たちをも、人々はそのように迫害したのです」（マタイ 5:12b）",
		"plateIndexText": "図版 24 / 28",
		"foldModalTitle": "印刷と折り方ガイド",
		"foldStep1Title": "1. 両面印刷",
		"foldStep1Desc": "プリンター設定で「短辺とじ両面印刷」を選択してください。",
		"foldStep2Title": "2. 二つ折りにする",
		"foldStep2Desc": "印刷した用紙を順番に重ね、中央で二つ折りにします。",
		"foldStep3Title": "3. 背をホチキス留め",
		"foldStep3Desc": "中央の折り目にホチキスを2箇所留めます。色ぬりの準備完了！",
		"btnFoldDismiss": "わかりました",
		"tapToZoom": "タップして拡大",
		"labelCartaSub": "レター",
		"labelA4Sub": "国際A4",
		"btnPrintPlate": "この図版を印刷",
		"btnShare": "共有する",
		"toastCopied": "リンクをクリップボードにコピーしました",
		"plateLabel": "図版",
		"foldGuideTrigger": "📖 印刷と折り方ガイド",
                "pageTitle": "Ekovoz: 無料教育リソース",
                "badge": "パブリックドメインの教育リソース",
                "title": "主イエスのさいわいな人々",
                "desc": "山上の垂訓・八福のぬりえ本（マタイ 5）",
                "langLabel": "言語",
                "previewBadge": "サンプル3枚を見る",
                "triptychTitle": "注目の図版",
                "triptychHint": "タップして高解像度で表示",
                "btnTitleSheets": "個別シート (PDF)",
                "btnSubSheets": "画面閲覧や1枚ずつのぬりえ用",
                "btnTitleBooklet": "中綴じ冊子 (PDF)",
                "btnSubBooklet": "両面印刷・中央ホチキス留め製本用",
                "opticalTrigger": "ワイヤレス光共有 (画面からカメラへ)",
                "offlineBadge": "100%オフライン・画面からカメラへ直接転送可能",
                "footerNote": "マタイによる福音書第5章に基づくパブリックドメイン作品。印刷・ぬりえ・共有自由。",
                "contactBtn": "お問い合わせ・ご協力",
                "opticalModalTitle": "光通信データ転送（画面からカメラへ）",
                "opticalStep1Title": "画面で配信",
                "opticalStep1Desc": "この画面でEkovozプレーヤーを開き、インターネットやBluetoothを使わずに高速視覚コードで作品を配信します。",
                "opticalStep2Title": "カメラで受信",
                "opticalStep2Desc": "スマートフォンのカメラをこの画面に向けるだけで、完全なPDF作品をオフラインで直接受信できます。",
                "btnLaunchEkovoz": "Ekovozプレーヤーを起動",
                "btnModalClose": "閉じる",
                "previewModalTitle": "ぬりえ図版サンプル",
                "plateModalTitle": "高解像度プレビュー",
                "carouselPrev": "← 前へ",
                "carouselNext": "次へ →",
                "contactTitle": "お問い合わせ・編集協力",
                "contactCloseAria": "閉じる",
                "contactSubject": "Ekovoz編集部へのお問い合わせ",
                "contactNameLabel": "お名前またはペンネーム",
                "contactNamePlaceholder": "お名前",
                "contactEmailLabel": "メールアドレス（返信用）",
                "contactEmailPlaceholder": "you@example.jp",
                "contactMessageLabel": "メッセージまたは翻訳のご提案",
                "contactMessagePlaceholder": "どのようなご協力が可能か、または校正を希望される言語をお知らせください。",
                "contactCancel": "キャンセル",
                "contactSubmit": "送信する",
                "contactSending": "メッセージを送信中...",
                "contactSuccess": "メッセージが正常に送信されました！ご連絡ありがとうございます。",
                "contactError": "送信エラーが発生しました。後でもう一度お試しください。",
                "contactConnectionError": "接続エラー。インターネット環境をご確認ください。",
                "contactTopicLabel": "ご用件 / トピック",
                "optCollab": "編集協力・翻訳のご提案",
                "optSupport": "ダウンロードや閲覧の不具合（サポート）",
                "optGeneral": "一般的なお問い合わせ・ご意見",
                "githubIssueHint": "公開の技術サポートチケットを作成しますか？",
                "linkGithubIssue": "GitHubでIssueを開く"
        },
        "ko": {
		"nameCarta": "레터",
		"subCarta": "미주",
		"nameA4": "A4",
		"subA4": "국제 규격",
		"focalVerse": "“…너희 전에 있던 선지자들도 이같이 박해하였느니라” (마 5:12b)",
		"plateIndexText": "도판 24 / 28",
		"foldModalTitle": "인쇄 및 접는 방법",
		"foldStep1Title": "1. 양면 인쇄",
		"foldStep1Desc": "프린터 설정에서 '짧은 쪽으로 넘김' 양면 인쇄를 선택하세요.",
		"foldStep2Title": "2. 반으로 접기",
		"foldStep2Desc": "인쇄된 모든 페이지를 순서대로 모아 가운데를 접습니다.",
		"foldStep3Title": "3. 가운데 스테이플러 고정",
		"foldStep3Desc": "접힌 선에 스테이플러 2개를 찍습니다. 색칠 준비 완료!",
		"btnFoldDismiss": "확인",
		"tapToZoom": "탭하여 확대",
		"labelCartaSub": "레터",
		"labelA4Sub": "국제 A4",
		"btnPrintPlate": "이 도판 인쇄",
		"btnShare": "공유하기",
		"toastCopied": "링크가 클립보드에 복사되었습니다",
		"plateLabel": "도판",
		"foldGuideTrigger": "📖 인쇄 및 접는 방법",
                "pageTitle": "Ekovoz: 무료 교육 자료",
                "badge": "공공 도메인 교육 자료",
                "title": "주 예수님의 복된 사람들",
                "desc": "산상수훈 팔복 색칠공부 책 (마태복음 5장)",
                "langLabel": "언어",
                "previewBadge": "샘플 3장 보기",
                "triptychTitle": "주요 도판",
                "triptychHint": "도판을 터치하여 고해상도로 보기",
                "btnTitleSheets": "낱장 인쇄용 (PDF)",
                "btnSubSheets": "화면 보기 또는 장별 색칠용",
                "btnTitleBooklet": "중철 제본 소책자 (PDF)",
                "btnSubBooklet": "양면 인쇄 후 반으로 접어 스테이플러 제본",
                "opticalTrigger": "무선 광학 전송 (화면에서 카메라로)",
                "offlineBadge": "100% 오프라인, 화면에서 카메라로 직접 전송 가능",
                "footerNote": "마태복음 5장을 기반으로 한 공공 도메인 교육 자료입니다. 인쇄, 색칠, 공유가 자유롭습니다.",
                "contactBtn": "문의 및 협력",
                "opticalModalTitle": "광학 데이터 전송 (화면에서 카메라로)",
                "opticalStep1Title": "화면으로 전송",
                "opticalStep1Desc": "인터넷이나 블루투스 없이 초고속 광학 코드로 책을 전송하려면 이 화면에서 Ekovoz 플레이어를 실행하세요.",
                "opticalStep2Title": "카메라로 수신",
                "opticalStep2Desc": "다른 기기의 카메라를 이 화면으로 비추면 오프라인에서 완전한 PDF 소책자를 즉시 수신할 수 있습니다.",
                "btnLaunchEkovoz": "Ekovoz 플레이어 시작",
                "btnModalClose": "닫기",
                "previewModalTitle": "색칠 도판 샘플",
                "plateModalTitle": "고해상도 미리보기",
                "carouselPrev": "← 이전",
                "carouselNext": "다음 →",
                "contactTitle": "문의 및 출판 협력",
                "contactCloseAria": "닫기",
                "contactSubject": "Ekovoz 출판팀에 보내는 메시지",
                "contactNameLabel": "성함 또는 필명",
                "contactNamePlaceholder": "성함",
                "contactEmailLabel": "이메일 주소 (답변용)",
                "contactEmailPlaceholder": "you@example.kr",
                "contactMessageLabel": "메시지 또는 번역 제안",
                "contactMessagePlaceholder": "어떻게 협력할 수 있는지, 또는 검수하고 싶은 언어가 무엇인지 알려주세요.",
                "contactCancel": "취소",
                "contactSubmit": "메시지 보내기",
                "contactSending": "메시지를 전송하는 중...",
                "contactSuccess": "메시지가 성공적으로 전송되었습니다! 문의해 주셔서 감사합니다.",
                "contactError": "전송 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.",
                "contactConnectionError": "연결 오류입니다. 인터넷 상태를 확인해 주세요.",
                "contactTopicLabel": "문의 유형 / 주제",
                "optCollab": "편집 협력 또는 번역 제안",
                "optSupport": "다운로드 또는 열람 문제 (기술 지원)",
                "optGeneral": "일반 문의 또는 제안",
                "githubIssueHint": "공개 기술 지원 티켓을 등록하시겠습니까?",
                "linkGithubIssue": "GitHub에서 Issue 열기"
        },
        "ur": {
		"nameCarta": "لیٹر",
		"subCarta": "امریکہ",
		"nameA4": "A4",
		"subA4": "بین الاقوامی",
		"focalVerse": "”…کیونکہ انہوں نے ان نبیوں کو بھی ستایا جو تم سے پہلے تھے“ (متی 5:12b)",
		"plateIndexText": "تصویر ۲۴ از ۲۸",
		"foldModalTitle": "چاپ اور موڑنے کا طریقہ",
		"foldStep1Title": "۱. دونوں طرف پرنٹ کریں",
		"foldStep1Desc": "پرنٹر سیٹنگز میں شارٹ ایج پر دونوں طرف پرنٹنگ منتخب کریں۔",
		"foldStep2Title": "۲. درمیان سے موڑیں",
		"foldStep2Desc": "تمام صفحات کو ترتیب سے رکھیں اور درمیان سے ایک ساتھ موڑیں۔",
		"foldStep3Title": "۳. درمیان میں سٹیپل کریں",
		"foldStep3Desc": "درمیانی موڑ پر ۲ سٹیپل لگائیں۔ رنگ بھرنے کے لیے تیار!",
		"btnFoldDismiss": "سمجھ گیا",
		"tapToZoom": "بڑا کرنے کے لیے ٹیپ کریں",
		"labelCartaSub": "لیٹر",
		"labelA4Sub": "بین الاقوامی A4",
		"btnPrintPlate": "یہ تصویر پرنٹ کریں",
		"btnShare": "شیئر کریں",
		"toastCopied": "لنک کلپ بورڈ پر کاپی ہو گیا",
		"plateLabel": "تصویر",
		"foldGuideTrigger": "📖 چاپ اور موڑنے کا طریقہ",
                "pageTitle": "ایکوووز: مفت تعلیمی وسائل",
                "badge": "عوامی ملکیت کا تعلیمی وسیلہ",
                "title": "خداوند یسوع کے مبارک لوگ",
                "desc": "مبارکبادوں کی رنگ بھرنے والی کتاب (متی ۵)",
                "langLabel": "زبان",
                "previewBadge": "۳ نمونے کے صفحات دیکھیں",
                "triptychTitle": "نمایاں تصاویر",
                "triptychHint": "بڑی تصویر دیکھنے کے لیے کسی بھی صفحے پر ٹیپ کریں",
                "btnTitleSheets": "علیحدہ صفحات (PDF)",
                "btnSubSheets": "اسکرین پر پڑھنے یا ایک ایک کر کے رنگ بھرنے کے لیے",
                "btnTitleBooklet": "کتابچہ (PDF)",
                "btnSubBooklet": "درمیان سے فولڈ اور اسٹیپل کر کے کتاب بنانے کے لیے",
                "opticalTrigger": "وائرلیس اشتراک (اسکرین سے کیمرے تک)",
                "offlineBadge": "۱۰۰٪ آف لائن اور اسکرین سے کیمرے میں منتقلی کے قابل",
                "footerNote": "متی باب ۵ پر مبنی عوامی ملکیت کا تعلیمی کام۔ پرنٹ، رنگ بھرنے اور شیئر کرنے کے لیے آزاد۔",
                "contactBtn": "رابطہ اور تعاون",
                "opticalModalTitle": "بصری منتقلی (اسکرین سے کیمرے تک)",
                "opticalStep1Title": "اسکرین پر نشر کریں",
                "opticalStep1Desc": "انٹرنیٹ، کیبل یا بلوٹوتھ کے بغیر تیز رفتار آپٹیکل کوڈز کے ذریعے کتاب نشر کرنے کے لیے Ekovoz پلیئر کھولیں۔",
                "opticalStep2Title": "کیمرے سے وصول کریں",
                "opticalStep2Desc": "بغیر انٹرنیٹ مکمل پی ڈی ایف فوری طور پر ڈاؤن لوڈ کرنے کے لیے کسی بھی فون کا کیمرہ اس اسکرین کی طرف کریں۔",
                "btnLaunchEkovoz": "Ekovoz پلیئر شروع کریں",
                "btnModalClose": "بند کریں",
                "previewModalTitle": "رنگ بھرنے والے صفحات کے نمونے",
                "plateModalTitle": "ہائی ریزولوشن پیش نظارہ",
                "carouselPrev": "← پچھلا",
                "carouselNext": "اگلا →",
                "contactTitle": "رابطہ اور ادارتی تعاون",
                "contactCloseAria": "بند کریں",
                "contactSubject": "Ekovoz کے لیے پیغام",
                "contactNameLabel": "نام یا قلمی نام",
                "contactNamePlaceholder": "آپ کا نام",
                "contactEmailLabel": "ای میل پتہ (جواب کے لیے)",
                "contactEmailPlaceholder": "you@example.pk",
                "contactMessageLabel": "پیغام یا ترجمہ کی تجویز",
                "contactMessagePlaceholder": "ہم کس طرح تعاون کر سکتے ہیں یا آپ کس زبان کی نظرثانی کرنا چاہتے ہیں؟",
                "contactCancel": "منسوخ کریں",
                "contactSubmit": "پیغام بھیجیں",
                "contactSending": "پیغام بھیجا جا رہا ہے...",
                "contactSuccess": "پیغام کامیابی سے بھیج دیا گیا! رابطہ کرنے کا شکریہ۔",
                "contactError": "پیغام بھیجنے میں خرابی۔ براہ کرم بعد میں کوشش کریں۔",
                "contactConnectionError": "کنکشن کی خرابی۔ براہ کرم اپنا انٹرنیٹ چیک کریں۔",
                "contactTopicLabel": "موضوع / وجہ",
                "optCollab": "ادارتی تعاون یا ترجمہ",
                "optSupport": "ڈاؤن لوڈ یا پڑھنے میں مسئلہ (سپورٹ)",
                "optGeneral": "عمومی سوال یا تجویز",
                "githubIssueHint": "کیا آپ پبلک سپورٹ ٹکٹ درج کرنا چاہتے ہیں؟",
                "linkGithubIssue": "GitHub پر Issue کھولیں"
        },
        "fa": {
		"nameCarta": "لتر",
		"subCarta": "آمریکا",
		"nameA4": "A4",
		"subA4": "بین‌المللی",
		"focalVerse": "« …چرا که پیش از شما بر انبیایی نیز که بودند همین‌گونه جفا می‌رسانیدند » (متی 5:12b)",
		"plateIndexText": "تصویر ۲۴ از ۲۸",
		"foldModalTitle": "راهنمای چاپ و تا کردن",
		"foldStep1Title": "۱. چاپ دورو",
		"foldStep1Desc": "در تنظیمات چاپگر، گزینه «چاپ دورو» با چرخش در لبه کوتاه را فعال کنید.",
		"foldStep2Title": "۲. تا کردن از وسط",
		"foldStep2Desc": "همه برگه‌های چاپ‌شده را به ترتیب بچینید و از مرکز تا کنید.",
		"foldStep3Title": "۳. منگنه کردن عطف",
		"foldStep3Desc": "۲ منگنه در خط تا مرکزی بزنید. آماده رنگ‌آمیزی است!",
		"btnFoldDismiss": "متوجه شدم",
		"tapToZoom": "لمس برای بزرگنمایی",
		"labelCartaSub": "آمریکا",
		"labelA4Sub": "بین‌المللی",
		"btnPrintPlate": "چاپ این تصویر",
		"btnShare": "اشتراک‌گذاری",
		"toastCopied": "پیوند در بریده‌دان کپی شد",
		"plateLabel": "تصویر",
		"foldGuideTrigger": "📖 راهنمای چاپ و تا کردن",
                "pageTitle": "اکووز: منابع آموزشی رایگان",
                "badge": "منبع باز در مالکیت عمومی",
                "title": "مبارک‌بادهای خداوند عیسی",
                "desc": "کتاب رنگ‌آمیزی موعظه سر کوه (متی ۵)",
                "langLabel": "زبان",
                "previewBadge": "مشاهده ۳ صفحه نمونه",
                "triptychTitle": "تصاویر برگزیده",
                "triptychHint": "برای وضوح بالا روی هر صفحه ضربه بزنید",
                "btnTitleSheets": "برگه‌های تکی (PDF)",
                "btnSubSheets": "برای مشاهده در صفحه یا رنگ‌آمیزی برگه به برگه",
                "btnTitleBooklet": "دفترچه تاشو (PDF)",
                "btnSubBooklet": "برای چاپ دوطرفه و منگنه‌کوبی در عطف",
                "opticalTrigger": "اشتراک بی‌سیم (صفحه به دوربین)",
                "offlineBadge": "۱۰۰٪ آفلاین و قابل انتقال از صفحه به دوربین",
                "footerNote": "اثر آموزشی در مالکیت عمومی بر اساس متی ۵. آزاد برای چاپ، رنگ‌آمیزی و اشتراک‌گذاری.",
                "contactBtn": "تماس و همکاری",
                "opticalModalTitle": "انتقال نوری (صفحه به دوربین)",
                "opticalStep1Title": "پخش بر روی صفحه نمایش",
                "opticalStep1Desc": "پخش‌کننده اکووز را باز کنید تا کتاب را با کدهای نوری پرسرعت بدون کابل، اینترنت یا بلوتوث مخابره نمایید.",
                "opticalStep2Title": "دریافت با دوربین",
                "opticalStep2Desc": "دوربین هر تلفن همراهی را به سمت این صفحه بگیرید تا فایل کامل PDF را بدون نیاز به شبکه دریافت کنید.",
                "btnLaunchEkovoz": "شروع پخش‌کننده اکووز",
                "btnModalClose": "بستن",
                "previewModalTitle": "نمونه برگه‌های رنگ‌آمیزی",
                "plateModalTitle": "پیش‌نمایش با کیفیت بالا",
                "carouselPrev": "← قبلی",
                "carouselNext": "بعدی →",
                "contactTitle": "تماس و همکاری تحریریه",
                "contactCloseAria": "بستن",
                "contactSubject": "پیام برای انتشارات اکووز",
                "contactNameLabel": "نام یا نام مستعار",
                "contactNamePlaceholder": "نام شما",
                "contactEmailLabel": "آدرس ایمیل (برای پاسخگویی)",
                "contactEmailPlaceholder": "you@example.ir",
                "contactMessageLabel": "پیام یا پیشنهاد ترجمه",
                "contactMessagePlaceholder": "چگونه می‌توانیم همکاری کنیم یا مایل به بازبینی چه زبانی هستید؟",
                "contactCancel": "انصراف",
                "contactSubmit": "ارسال پیام",
                "contactSending": "در حال ارسال پیام...",
                "contactSuccess": "پیام با موفقیت ارسال شد! با سپاس از تماس شما.",
                "contactError": "خطا در ارسال پیام. لطفاً بعداً تلاش فرمایید.",
                "contactConnectionError": "خطای اتصال. لطفاً اتصال اینترنت خود را بررسی کنید.",
                "contactTopicLabel": "موضوع / دلیل",
                "optCollab": "همکاری تحریریه یا ترجمه",
                "optSupport": "مشکل در دانلود یا خواندن (پشتیبانی)",
                "optGeneral": "پرسش کلی یا پیشنهاد",
                "githubIssueHint": "آیا ترجیح می‌دهید یک گزارش فنی عمومی ثبت کنید؟",
                "linkGithubIssue": "ایجاد Issue در GitHub"
        }
};

if (typeof window !== 'undefined') {
  window.languagePacks = languagePacks;
  window.previewSlides = previewSlides;
  window.plateCaptions = plateCaptions;
  window.plateVersesData = plateVersesData;
  window.translations = translations;
  window.EKOVOZ_TRANSLATIONS = translations;
}

// ============================================================================
// Máquina de Estados Unificada Harel XOR (window.EkovozStore — D1, D2, D4)
// Invariante: sum_{i in {study, print, field, share}} I(sheet_i visible) <= 1
// ============================================================================
const EkovozStore = {
  activeWork: 'biblia',
  uiLang: 'en',
  langCode: 'stp',
  orthography: 'INALI',
  paperFormat: 'a4',
  activeSheet: 'none',
  listeners: [],
  subscribe(fn) {
    if (typeof fn === 'function') this.listeners.push(fn);
  },
  notify() {
    for (const fn of this.listeners) {
      try { fn(this); } catch (_) {}
    }
  },
  transitionSheet(sheetName, doc = typeof document !== 'undefined' ? document : null) {
    const valid = ['none', 'study', 'print', 'field', 'share'];
    const target = valid.includes(sheetName) ? sheetName : 'none';
    const next = this.activeSheet === target && target !== 'none' ? 'none' : target;
    this.activeSheet = next;
    if (doc && typeof doc.getElementById === 'function') {
      const sheetMap = {
        study: 'bibleEasyDrawerPanel',
        print: 'biblePrintEditionsSheet',
        field: 'bibleFieldWorkshopSheet',
        share: 'bibleShareAndAuditSheet'
      };
      const doorMap = {
        study: 'bibleEasyDrawer',
        print: 'btnOpenPrintEditionsSheet',
        field: 'btnOpenFieldWorkshopSheet',
        share: 'btnOpenShareAndAuditSheet'
      };
      for (const [key, elId] of Object.entries(sheetMap)) {
        const el = doc.getElementById(elId);
        if (el) {
          const isOpen = next === key;
          el.hidden = !isOpen;
          if (typeof el.setAttribute === 'function') {
            el.setAttribute('data-sheet-open', isOpen ? 'true' : 'false');
            if (isOpen) {
              if (typeof el.removeAttribute === 'function') el.removeAttribute('hidden');
            } else {
              el.setAttribute('hidden', '');
            }
          }
        }
        const doorBtn = doc.getElementById(doorMap[key]);
        if (doorBtn && typeof doorBtn.setAttribute === 'function') {
          doorBtn.setAttribute('aria-expanded', next === key ? 'true' : 'false');
          doorBtn.setAttribute('data-open', next === key ? 'true' : 'false');
        }
      }
    }
    this.notify();
    return this.activeSheet;
  }
};

if (typeof window !== 'undefined') {
  window.EkovozStore = EkovozStore;
}

let currentSlideIdx = 0;
let currentPaperFormat = 'a4';
let currentPlateIndex = 24;
const TOTAL_PLATES = 28;
let preloadPrev = null;
let preloadNext = null;

function resolveDistLangSlug(lang) {
  if (lang === 'zh') return 'zh-Hans';
  if (lang === 'bn-BD' || lang === 'bn-IN') return 'bn';
  return lang || 'en';
}

function updateCarouselView() {
  const carouselImg = document.getElementById('carouselImg');
  const carouselCaption = document.getElementById('carouselCaption');
  if (!carouselImg || !carouselCaption) return;
  const lang = document.getElementById('langSelect')?.value || 'es';
  const slide = previewSlides[currentSlideIdx];
  carouselImg.src = slide.src;
  carouselCaption.innerText = slide.caption[lang] || slide.caption['es'];
  const dots = document.querySelectorAll('.carousel-dots .dot');
  dots.forEach((d, idx) => {
    if (idx === currentSlideIdx) d.classList.add('active');
    else d.classList.remove('active');
  });
}

function setSlide(idx) { currentSlideIdx = idx; updateCarouselView(); }
function nextSlide() { currentSlideIdx = (currentSlideIdx + 1) % previewSlides.length; updateCarouselView(); }
function prevSlide() { currentSlideIdx = (currentSlideIdx - 1 + previewSlides.length) % previewSlides.length; updateCarouselView(); }

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  try {
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  } catch (_) {
    modal.setAttribute('open', '');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  try {
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  } catch (_) {
    modal.removeAttribute('open');
  }
}

function openPreviewModal() {
  currentSlideIdx = 0;
  updateCarouselView();
  openModal('previewModal');
}

function setPaperFormat(fmt) {
  currentPaperFormat = fmt === 'letter' ? 'letter' : 'a4';
  EkovozStore.paperFormat = currentPaperFormat;
  const btnCarta = document.getElementById('toggleCarta');
  const btnA4 = document.getElementById('toggleA4');
  if (currentPaperFormat === 'letter') {
    btnCarta?.classList.add('active');
    btnCarta?.setAttribute('aria-checked', 'true');
    btnA4?.classList.remove('active');
    btnA4?.setAttribute('aria-checked', 'false');
  } else {
    btnA4?.classList.add('active');
    btnA4?.setAttribute('aria-checked', 'true');
    btnCarta?.classList.remove('active');
    btnCarta?.setAttribute('aria-checked', 'false');
  }
  const kindlePaperSel = document.getElementById('kindlePaperFormatSelector');
  if (kindlePaperSel && kindlePaperSel.value !== currentPaperFormat) {
    kindlePaperSel.value = currentPaperFormat;
    kindlePaperSel.dispatchEvent(new Event('change'));
  }
  try { localStorage.setItem('ekovoz_paper', currentPaperFormat); } catch (_) {}
  updateDownloadLinks();
  EkovozStore.notify();
}

function switchSovereignWork(workId) {
  const isFelices = workId === 'felices';
  EkovozStore.activeWork = isFelices ? 'felices' : 'biblia';
  const bibleSec = document.getElementById('bibleSovereignSection');
  const felicesSec = document.getElementById('felicesSovereignSection');
  const tabBiblia = document.getElementById('tabWorkBiblia');
  const tabFelices = document.getElementById('tabWorkFelices');
  if (bibleSec && felicesSec) {
    bibleSec.hidden = isFelices;
    bibleSec.style.display = isFelices ? 'none' : '';
    felicesSec.hidden = !isFelices;
    felicesSec.style.display = isFelices ? '' : 'none';
    bibleSec.setAttribute('data-active-work', isFelices ? 'false' : 'true');
    felicesSec.setAttribute('data-active-work', isFelices ? 'true' : 'false');
  }
  if (tabBiblia && tabFelices) {
    tabBiblia.setAttribute('aria-selected', isFelices ? 'false' : 'true');
    tabFelices.setAttribute('aria-selected', isFelices ? 'true' : 'false');
    tabBiblia.style.fontWeight = isFelices ? '600' : '700';
    tabFelices.style.fontWeight = isFelices ? '700' : '600';
  }
  EkovozStore.notify();
}

function selectSovereignBibleLang(langCode) {
  switchSovereignWork('biblia');
  EkovozStore.langCode = langCode;
  const bibleLangSel = document.getElementById('bibleSelectLang');
  if (bibleLangSel) {
    bibleLangSel.value = langCode;
    bibleLangSel.dispatchEvent(new Event('change'));
  }
  const ulsCurrentLang = document.getElementById('ulsCurrentLang');
  if (ulsCurrentLang && langCode === 'stp') {
    ulsCurrentLang.innerText = "O'dam · Español";
  }
  closeModal('langModal');
}

function updateDownloadLinks() {
  const lang = document.getElementById('langSelect')?.value || 'en';
  const distLang = resolveDistLangSlug(lang);
  const sheetsLink = document.getElementById('linkSheets');
  const bookletLink = document.getElementById('linkBooklet');
  if (!sheetsLink || !bookletLink) return;
  const sheetsName = `felices-${distLang}-v1-sheets.pdf`;
  const bookletName = `felices-${distLang}-v1-booklet.pdf`;
  if (currentPaperFormat === 'a4') {
    sheetsLink.href = `/dist/${distLang}/v1/campo/a4/${sheetsName}`;
    bookletLink.href = `/dist/${distLang}/v1/campo/a4/${bookletName}`;
  } else {
    sheetsLink.href = `/dist/${distLang}/v1/mostrador/${sheetsName}`;
    bookletLink.href = `/dist/${distLang}/v1/mostrador/${bookletName}`;
  }
  sheetsLink.setAttribute('download', sheetsName);
  bookletLink.setAttribute('download', bookletName);
}

function getPlateUrl(idx) {
  const lang = document.getElementById('langSelect')?.value || 'en';
  const distLang = resolveDistLangSlug(lang);
  const num = String(idx).padStart(2, '0');
  return `/dist/${distLang}/v1/mostrador/${num}.jpg`;
}

function getPlateVerse(idx, lang) {
  const cleanLang = resolveDistLangSlug(lang);
  const d = plateVersesData[idx] || {};
  const raw = d[lang] || d[cleanLang] || d['en'] || d['es'] || `Plate ${idx}`;
  if (lang === 'bn-BD') {
    return raw
      .replace(/প্রভু যীশুর আনন্দময় মানুষ/g, 'ঈসা মসীহের মোবারক মানুষ')
      .replace(/প্রভু যীশু/g, 'ঈসা মসীহ')
      .replace(/স্বর্গরাজ্যে/g, 'আসমানের রাজ্যে')
      .replace(/স্বর্গরাজ্য/g, 'আসমানের রাজ্য')
      .replace(/মথি/g, 'মতী');
  }
  return raw;
}

function updateFocalPlate() {
  const img = document.getElementById('focalPlateImg');
  const indicator = document.getElementById('plateIndexText');
  const verse = document.getElementById('focalPlateVerse');
  const lang = document.getElementById('langSelect')?.value || 'es';
  const t = translations[lang] || translations['es'] || {};
  const plateLabel = t.plateLabel || 'Lámina';
  if (img) {
    img.src = getPlateUrl(currentPlateIndex);
    img.alt = `${plateLabel} ${currentPlateIndex} / ${TOTAL_PLATES}`;
  }
  if (indicator) indicator.textContent = `${plateLabel} ${currentPlateIndex} / ${TOTAL_PLATES}`;
  if (verse) verse.textContent = getPlateVerse(currentPlateIndex, lang);
  const prevIdx = currentPlateIndex > 1 ? currentPlateIndex - 1 : TOTAL_PLATES;
  const nextIdx = currentPlateIndex < TOTAL_PLATES ? currentPlateIndex + 1 : 1;
  preloadPrev = new Image(); preloadPrev.src = getPlateUrl(prevIdx);
  preloadNext = new Image(); preloadNext.src = getPlateUrl(nextIdx);
}

function nextPlate() { currentPlateIndex = currentPlateIndex < TOTAL_PLATES ? currentPlateIndex + 1 : 1; updateFocalPlate(); }
function prevPlate() { currentPlateIndex = currentPlateIndex > 1 ? currentPlateIndex - 1 : TOTAL_PLATES; updateFocalPlate(); }

function openActivePlateZoom() {
  const img = document.getElementById('plateModalImg');
  const cap = document.getElementById('plateModalCaption');
  const lang = document.getElementById('langSelect')?.value || 'es';
  const t = translations[lang] || translations['es'] || {};
  const plateLabel = t.plateLabel || 'Lámina';
  if (img) img.src = getPlateUrl(currentPlateIndex);
  if (cap) cap.textContent = `${plateLabel} ${currentPlateIndex} · ${getPlateVerse(currentPlateIndex, lang)}`;
  openModal('plateModal');
}

function printActivePlate() {
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isTouch) window.open(getPlateUrl(currentPlateIndex), '_blank');
  else window.print();
}

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function shareResource() {
  const lang = document.getElementById('langSelect')?.value || 'es';
  const t = translations[lang] || translations['es'] || {};
  const shareData = {
    title: t.title || 'Los Felices del Señor Jesús',
    text: `${t.title || 'Los Felices del Señor Jesús'} — ${getPlateVerse(currentPlateIndex, lang)}`,
    url: window.location.href
  };
  if (navigator.share) navigator.share(shareData).catch(() => {});
  else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(window.location.href).then(() => showToast(t.toastCopied || 'Enlace copiado')).catch(() => showToast(window.location.href));
  } else showToast(window.location.href);
}

function openPlateModal(plateId) {
  const lang = document.getElementById('langSelect')?.value || 'es';
  const img = document.getElementById('plateModalImg');
  const cap = document.getElementById('plateModalCaption');
  if (img) img.src = `/web/preview/${plateId}.png`;
  const dict = plateCaptions[plateId] || {};
  if (cap) cap.textContent = dict[lang] || dict['es'] || `Lámina ${plateId}`;
  openModal('plateModal');
}

function renderUlsGrid(filter = '') {
  const grid = document.getElementById('ulsGrid');
  if (!grid) return;
  const currentLang = document.getElementById('langSelect')?.value || 'es';
  const q = filter.trim().toLowerCase();
  grid.innerHTML = '';
  languagePacks.forEach(pack => {
    const match = !q || pack.code.toLowerCase().includes(q) || pack.name.toLowerCase().includes(q) || pack.autonym.toLowerCase().includes(q);
    if (match) {
      const card = document.createElement('div');
      card.className = 'uls-card' + (pack.code === currentLang ? ' active' : '');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.onclick = () => selectLanguage(pack.code);
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') selectLanguage(pack.code); };
      card.innerHTML = `<div class="uls-card-autonym">${pack.autonym}</div><div class="uls-card-name">${pack.name}</div><div class="uls-card-script">${pack.code.toUpperCase()} · ${pack.script}</div>`;
      grid.appendChild(card);
    }
  });
}

function filterLanguages(query) { renderUlsGrid(query); }

function selectLanguage(code) {
  const select = document.getElementById('langSelect');
  if (select) {
    select.value = code;
    updateUI();
  }
  closeModal('langModal');
}

function openLangModal() {
  const searchInput = document.getElementById('langSearchInput');
  if (searchInput) searchInput.value = '';
  renderUlsGrid('');
  openModal('langModal');
  setTimeout(() => { if (searchInput) searchInput.focus(); }, 50);
}

function updateUI() {
  const selectEl = document.getElementById('langSelect');
  const lang = selectEl?.value || 'en';
  EkovozStore.uiLang = lang;
  const pack = languagePacks.find(p => p.code === lang) || languagePacks[0];
  const t = translations[lang] || translations['en'] || translations['es'];
  document.documentElement.lang = lang;
  document.documentElement.dir = pack.dir;
  const ulsCurrentLang = document.getElementById('ulsCurrentLang');
  if (ulsCurrentLang) ulsCurrentLang.innerText = pack.autonym;
  const bibleLangSel = document.getElementById('bibleSelectLang');
  if (bibleLangSel && ['bn-BD', 'bn-IN', 'en', 'es', 'ar', 'ja', 'hi', 'zh-Hans'].includes(lang)) {
    if (Array.from(bibleLangSel.options).some(o => o.value === lang)) {
      bibleLangSel.value = lang;
      bibleLangSel.dispatchEvent(new Event('change'));
    }
  }
  document.title = t.pageTitle || 'Ekovoz: Free Polyglot Bible & Open Resources';
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el && val) el.innerText = val; };
  setTxt('categoryBadge', t.badge);
  setTxt('workTitle', t.title);
  setTxt('workDesc', t.desc);
  setTxt('langLabel', '🌐 ' + (t.langLabel || 'Language / Idioma:'));
  setTxt('previewBadgeText', t.previewBadge);
  setTxt('triptychTitle', t.triptychTitle || 'Láminas Destacadas');
  setTxt('triptychHint', t.triptychHint || 'Toca cualquier lámina para ver en alta resolución');
  setTxt('btnTitleSheets', t.btnTitleSheets);
  setTxt('btnSubSheets', t.btnSubSheets);
  setTxt('btnTitleBooklet', t.btnTitleBooklet);
  setTxt('btnSubBooklet', t.btnSubBooklet);
  setTxt('opticalTriggerText', t.opticalTrigger);
  setTxt('offlineBadgeText', t.offlineBadge);
  setTxt('footerNote', t.footerNote);
  setTxt('opticalModalTitle', t.opticalModalTitle);
  setTxt('opticalStep1Title', t.opticalStep1Title);
  setTxt('opticalStep1Desc', t.opticalStep1Desc);
  setTxt('opticalStep2Title', t.opticalStep2Title);
  setTxt('opticalStep2Desc', t.opticalStep2Desc);
  setTxt('btnLaunchEkovozText', t.btnLaunchEkovoz);
  setTxt('btnModalClose', t.btnModalClose);
  setTxt('previewModalTitle', t.previewModalTitle);
  setTxt('plateModalTitle', t.plateModalTitle);
  setTxt('btnPreviewClose', t.btnModalClose);
  setTxt('btnPlateClose', t.btnModalClose);
  setTxt('carouselPrevBtn', t.carouselPrev);
  setTxt('carouselNextBtn', t.carouselNext);
  setTxt('footerContactBtn', t.contactBtn);
  setTxt('contactModalTitle', t.contactTitle);
  setTxt('contactNameLabel', t.contactNameLabel);
  setTxt('contactEmailLabel', t.contactEmailLabel);
  setTxt('contactMessageLabel', t.contactMessageLabel);
  setTxt('contactCancelBtn', t.contactCancel);
  setTxt('contactSubmitBtn', t.contactSubmit);
  setTxt('contactTopicLabel', t.contactTopicLabel);
  setTxt('optCollab', t.optCollab);
  setTxt('optSupport', t.optSupport);
  setTxt('optGeneral', t.optGeneral);
  setTxt('githubIssueHint', t.githubIssueHint);
  setTxt('linkGithubIssue', t.linkGithubIssue);
  setTxt('btnPrintPlateText', t.btnPrintPlate || 'Imprimir esta lámina');
  setTxt('btnShareWorkText', t.btnShare || 'Compartir');
  setTxt('foldGuideTrigger', t.foldGuideTrigger || '📖 ¿Cómo imprimir y doblar?');
  setTxt('nameCarta', t.nameCarta || 'Carta');
  setTxt('subCarta', t.subCarta || t.labelCartaSub || 'América');
  setTxt('nameA4', t.nameA4 || 'A4');
  setTxt('subA4', t.subA4 || t.labelA4Sub || 'Internacional');
  setTxt('foldModalTitle', t.foldModalTitle || 'Cómo Imprimir y Doblar');
  setTxt('foldStep1Title', t.foldStep1Title || '1. Imprime frente y vuelta');
  setTxt('foldStep1Desc', t.foldStep1Desc || 'En tu impresora, activa «Doble cara» volteando por el borde corto.');
  setTxt('foldStep2Title', t.foldStep2Title || '2. Dobla a la mitad');
  setTxt('foldStep2Desc', t.foldStep2Desc || 'Junta todas las hojas impresas en orden y pliégalas juntas por el centro.');
  setTxt('foldStep3Title', t.foldStep3Title || '3. Engrapa en el lomo');
  setTxt('foldStep3Desc', t.foldStep3Desc || 'Aplica 2 grapas en el pliegue central. ¡Listo para colorear!');
  setTxt('btnFoldDismiss', t.btnFoldDismiss || 'Entendido');
  setTxt('focalPlateZoomHintText', t.tapToZoom || 'Toca para ampliar');
  updateDownloadLinks();
  updateFocalPlate();
  updateCarouselView();
  renderUlsGrid();
  EkovozStore.notify();
}

function openContactModal() {
  const form = document.getElementById('contactForm');
  if (form) form.reset();
  const status = document.getElementById('contactStatus');
  if (status) { status.textContent = ''; status.style.color = 'var(--text-muted)'; }
  openModal('contactModal');
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    updateCarouselView, setSlide, nextSlide, prevSlide,
    openModal, closeModal, openPreviewModal, setPaperFormat,
    switchSovereignWork, selectSovereignBibleLang, resolveDistLangSlug,
    updateDownloadLinks, getPlateUrl, getPlateVerse, updateFocalPlate,
    nextPlate, prevPlate, openActivePlateZoom, printActivePlate,
    showToast, shareResource, openPlateModal, renderUlsGrid,
    filterLanguages, selectLanguage, openLangModal, updateUI, openContactModal
  });

  window.addEventListener('DOMContentLoaded', () => {
    let initialPaper = 'a4';
    try {
      const params = new URLSearchParams(window.location.search || '');
      const urlPaper = (params.get('paper') || '').toLowerCase();
      const saved = localStorage.getItem('ekovoz_paper');
      if (urlPaper === 'letter' || urlPaper === 'carta' || urlPaper === 'a4') {
        initialPaper = urlPaper === 'carta' ? 'letter' : urlPaper;
      } else if (saved === 'letter' || saved === 'a4') {
        initialPaper = saved;
      } else {
        const isLetterRegion = /^(en-US|es-US|es-MX|en-CA|es-GT|es-CR|es-SV|es-HN|es-NI|es-PA|es-CO|fil)/i.test(navigator.language || '');
        initialPaper = isLetterRegion ? 'letter' : 'a4';
      }
    } catch (_) {}
    setPaperFormat(initialPaper);

    const rawNav = (navigator.language || 'en');
    let userLang = 'en';
    if (/^bn-BD/i.test(rawNav)) userLang = 'bn-BD';
    else if (/^bn/i.test(rawNav)) userLang = 'bn-IN';
    else {
      const shortLang = rawNav.split('-')[0].toLowerCase();
      if (translations[shortLang]) userLang = shortLang;
    }
    try {
      const params = new URLSearchParams(window.location.search || '');
      const qLang = params.get('lang');
      if (qLang && (translations[qLang] || qLang === 'bn-BD' || qLang === 'bn-IN')) userLang = qLang;
      const qWork = (params.get('obra') || params.get('work') || window.location.hash.replace('#', '')).toLowerCase();
      if (qWork === 'felices') switchSovereignWork('felices');
      else switchSovereignWork('biblia');
      const qSheet = (params.get('sheet') || '').toLowerCase();
      if (['study', 'print', 'field', 'share'].includes(qSheet)) {
        EkovozStore.transitionSheet(qSheet);
      }
    } catch (_) {}
    const select = document.getElementById('langSelect');
    if (select && translations[userLang]) select.value = userLang;
    updateUI();

    document.getElementById('contactForm')?.addEventListener('submit', function (e) {
      e.preventDefault();
      const formData = new FormData(this);
      const patchObj = {
        schema: 'ekovoz.sovereign.patch.v13',
        lang_code: EkovozStore.langCode || 'stp',
        cascade_level: formData.get('cascade_level') || formData.get('topic') || 'L3',
        author: formData.get('name') || 'Revisor de Campo',
        message: formData.get('message') || '',
        audio_bytes: 0
      };
      const blob = new Blob([JSON.stringify(patchObj, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `parche-campo-${patchObj.lang_code}-${patchObj.cascade_level}.eco.patch.json`;
      a.click();
      const status = document.getElementById('contactStatus');
      if (status) {
        status.style.color = '#10b981';
        status.textContent = 'Paquete soberano (.eco.patch.json) exportado localmente sin red.';
      }
    });

    if ('serviceWorker' in navigator) {
      if ('caches' in window) {
        caches.keys().then(keys => {
          keys.forEach(k => { if (k !== 'ekovoz-v9') caches.delete(k); });
        });
      }
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => reg.update()).catch(() => {});
      });
    }
  });
}
