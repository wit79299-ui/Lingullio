#!/usr/bin/env python3
"""
Insert translations for courses, modules, grammar titles, vocabulary meanings,
and character meanings into Supabase for all 18 locales.
"""
import json
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

URL = 'https://gmpjkoajhhwvxwsdohll.supabase.co'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc'

def supa_get(table, params=''):
    req = Request(f'{URL}/rest/v1/{table}?{params}', headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
    return json.loads(urlopen(req).read())

def supa_post(table, rows):
    """Upsert rows."""
    req = Request(f'{URL}/rest/v1/{table}',
        data=json.dumps(rows).encode('utf-8'),
        headers={
            'apikey': KEY, 'Authorization': f'Bearer {KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates',
        }, method='POST')
    try:
        resp = urlopen(req)
        return resp.status, len(rows)
    except HTTPError as e:
        body = e.read().decode()[:200]
        print(f"    POST error {e.code}: {body}")
        return e.code, 0

# ─── Course IDs ──────────────────────────────────────────────────────────
C1 = 'a0000000-0000-0000-0000-000000000001'
C2 = 'a0000000-0000-0000-0000-000000000002'
C3 = 'a0000000-0000-0000-0000-000000000003'
M1 = 'b0000000-0000-0000-0000-000000000001'
M2 = 'b0000000-0000-0000-0000-000000000002'
M3 = 'b0000000-0000-0000-0000-000000000003'

# ─── Course translations per locale ──────────────────────────────────────
COURSE_TRANS = {
    'es': {C1: ('HSK 1', 'Preparación completa para HSK nivel 1. 500 palabras, 150 caracteres, gramática básica.'),
           C2: ('HSK 2', 'Preparación completa para HSK nivel 2. 1272 palabras, 300 caracteres, gramática intermedia.'),
           C3: ('HSK 3', 'Preparación completa para HSK nivel 3. 2245 palabras, 600 caracteres, gramática avanzada.')},
    'tr': {C1: ('HSK 1', 'HSK Seviye 1 tam hazırlık. 500 kelime, 150 karakter, temel dilbilgisi.'),
           C2: ('HSK 2', 'HSK Seviye 2 tam hazırlık. 1272 kelime, 300 karakter, orta dilbilgisi.'),
           C3: ('HSK 3', 'HSK Seviye 3 tam hazırlık. 2245 kelime, 600 karakter, ileri dilbilgisi.')},
    'de': {C1: ('HSK 1', 'Vollständige HSK Stufe 1 Vorbereitung. 500 Wörter, 150 Schriftzeichen, Grundgrammatik.'),
           C2: ('HSK 2', 'Vollständige HSK Stufe 2 Vorbereitung. 1272 Wörter, 300 Schriftzeichen, mittlere Grammatik.'),
           C3: ('HSK 3', 'Vollständige HSK Stufe 3 Vorbereitung. 2245 Wörter, 600 Schriftzeichen, fortgeschrittene Grammatik.')},
    'it': {C1: ('HSK 1', 'Preparazione completa HSK livello 1. 500 parole, 150 caratteri, grammatica di base.'),
           C2: ('HSK 2', 'Preparazione completa HSK livello 2. 1272 parole, 300 caratteri, grammatica intermedia.'),
           C3: ('HSK 3', 'Preparazione completa HSK livello 3. 2245 parole, 600 caratteri, grammatica avanzata.')},
    'pt': {C1: ('HSK 1', 'Preparação completa para HSK nível 1. 500 palavras, 150 caracteres, gramática básica.'),
           C2: ('HSK 2', 'Preparação completa para HSK nível 2. 1272 palavras, 300 caracteres, gramática intermediária.'),
           C3: ('HSK 3', 'Preparação completa para HSK nível 3. 2245 palavras, 600 caracteres, gramática avançada.')},
    'ru': {C1: ('HSK 1', 'Полная подготовка к HSK уровень 1. 500 слов, 150 иероглифов, базовая грамматика.'),
           C2: ('HSK 2', 'Полная подготовка к HSK уровень 2. 1272 слова, 300 иероглифов, средняя грамматика.'),
           C3: ('HSK 3', 'Полная подготовка к HSK уровень 3. 2245 слов, 600 иероглифов, продвинутая грамматика.')},
    'ja': {C1: ('HSK 1', 'HSKレベル1完全対策。500語、150漢字、基礎文法。'),
           C2: ('HSK 2', 'HSKレベル2完全対策。1272語、300漢字、中級文法。'),
           C3: ('HSK 3', 'HSKレベル3完全対策。2245語、600漢字、上級文法。')},
    'ko': {C1: ('HSK 1', 'HSK 1급 완벽 대비. 500단어, 150한자, 기초문법.'),
           C2: ('HSK 2', 'HSK 2급 완벽 대비. 1272단어, 300한자, 중급문법.'),
           C3: ('HSK 3', 'HSK 3급 완벽 대비. 2245단어, 600한자, 고급문법.')},
    'zh-Hans': {C1: ('HSK 1', 'HSK一级完整备考。500词汇，150汉字，基础语法。'),
                C2: ('HSK 2', 'HSK二级完整备考。1272词汇，300汉字，中级语法。'),
                C3: ('HSK 3', 'HSK三级完整备考。2245词汇，600汉字，高级语法。')},
    'zh-Hant': {C1: ('HSK 1', 'HSK一級完整備考。500詞彙，150漢字，基礎語法。'),
                C2: ('HSK 2', 'HSK二級完整備考。1272詞彙，300漢字，中級語法。'),
                C3: ('HSK 3', 'HSK三級完整備考。2245詞彙，600漢字，高級語法。')},
    'vi': {C1: ('HSK 1', 'Ôn tập HSK cấp 1 đầy đủ. 500 từ, 150 chữ Hán, ngữ pháp cơ bản.'),
           C2: ('HSK 2', 'Ôn tập HSK cấp 2 đầy đủ. 1272 từ, 300 chữ Hán, ngữ pháp trung cấp.'),
           C3: ('HSK 3', 'Ôn tập HSK cấp 3 đầy đủ. 2245 từ, 600 chữ Hán, ngữ pháp nâng cao.')},
    'th': {C1: ('HSK 1', 'เตรียมสอบ HSK ระดับ 1 ครบถ้วน 500 คำ 150 ตัวอักษร ไวยากรณ์พื้นฐาน'),
           C2: ('HSK 2', 'เตรียมสอบ HSK ระดับ 2 ครบถ้วน 1272 คำ 300 ตัวอักษร ไวยากรณ์กลาง'),
           C3: ('HSK 3', 'เตรียมสอบ HSK ระดับ 3 ครบถ้วน 2245 คำ 600 ตัวอักษร ไวยากรณ์ขั้นสูง')},
    'id': {C1: ('HSK 1', 'Persiapan lengkap HSK Level 1. 500 kata, 150 karakter, tata bahasa dasar.'),
           C2: ('HSK 2', 'Persiapan lengkap HSK Level 2. 1272 kata, 300 karakter, tata bahasa menengah.'),
           C3: ('HSK 3', 'Persiapan lengkap HSK Level 3. 2245 kata, 600 karakter, tata bahasa lanjutan.')},
    'hi': {C1: ('HSK 1', 'HSK स्तर 1 की पूर्ण तैयारी। 500 शब्द, 150 अक्षर, बुनियादी व्याकरण।'),
           C2: ('HSK 2', 'HSK स्तर 2 की पूर्ण तैयारी। 1272 शब्द, 300 अक्षर, मध्यम व्याकरण।'),
           C3: ('HSK 3', 'HSK स्तर 3 की पूर्ण तैयारी। 2245 शब्द, 600 अक्षर, उन्नत व्याकरण।')},
    'ar': {C1: ('HSK 1', 'تحضير كامل لاختبار HSK المستوى 1. 500 كلمة، 150 حرفاً، قواعد أساسية.'),
           C2: ('HSK 2', 'تحضير كامل لاختبار HSK المستوى 2. 1272 كلمة، 300 حرفاً، قواعد متوسطة.'),
           C3: ('HSK 3', 'تحضير كامل لاختبار HSK المستوى 3. 2245 كلمة، 600 حرفاً، قواعد متقدمة.')},
    'pl': {C1: ('HSK 1', 'Pełne przygotowanie do HSK poziom 1. 500 słów, 150 znaków, podstawowa gramatyka.'),
           C2: ('HSK 2', 'Pełne przygotowanie do HSK poziom 2. 1272 słów, 300 znaków, gramatyka średnia.'),
           C3: ('HSK 3', 'Pełne przygotowanie do HSK poziom 3. 2245 słów, 600 znaków, gramatyka zaawansowana.')},
    'ro': {C1: ('HSK 1', 'Pregătire completă HSK nivelul 1. 500 cuvinte, 150 caractere, gramatică de bază.'),
           C2: ('HSK 2', 'Pregătire completă HSK nivelul 2. 1272 cuvinte, 300 caractere, gramatică intermediară.'),
           C3: ('HSK 3', 'Pregătire completă HSK nivelul 3. 2245 cuvinte, 600 caractere, gramatică avansată.')},
    'uk': {C1: ('HSK 1', 'Повна підготовка до HSK рівень 1. 500 слів, 150 ієрогліфів, базова граматика.'),
           C2: ('HSK 2', 'Повна підготовка до HSK рівень 2. 1272 слова, 300 ієрогліфів, середня граматика.'),
           C3: ('HSK 3', 'Повна підготовка до HSK рівень 3. 2245 слів, 600 ієрогліфів, просунута граматика.')},
}

# ─── Module translations ─────────────────────────────────────────────────
MODULE_TRANS = {
    'es': {M1: ('Bases del chino', 'Descubre los fundamentos: pinyin, tonos, primeros caracteres y saludos.'),
           M2: ('Vida cotidiana', 'Habla sobre tu vida diaria: familia, comida, números y fechas.'),
           M3: ('Comunicación esencial', 'Exprésate en situaciones comunes: transporte, compras, direcciones.')},
    'tr': {M1: ('Çince temelleri', 'Temelleri keşfedin: pinyin, tonlar, ilk karakterler ve selamlaşmalar.'),
           M2: ('Günlük yaşam', 'Günlük hayatınızdan bahsedin: aile, yemek, sayılar ve tarihler.'),
           M3: ('Temel iletişim', 'Yaygın durumlarda kendinizi ifade edin: ulaşım, alışveriş, yönler.')},
    'de': {M1: ('Chinesische Grundlagen', 'Entdecken Sie die Grundlagen: Pinyin, Töne, erste Zeichen und Begrüßungen.'),
           M2: ('Alltag', 'Sprechen Sie über Ihren Alltag: Familie, Essen, Zahlen und Daten.'),
           M3: ('Grundlegende Kommunikation', 'Drücken Sie sich in alltäglichen Situationen aus: Transport, Einkaufen, Wegbeschreibungen.')},
    'it': {M1: ('Basi del cinese', 'Scopri i fondamenti: pinyin, toni, primi caratteri e saluti.'),
           M2: ('Vita quotidiana', 'Parla della tua vita quotidiana: famiglia, cibo, numeri e date.'),
           M3: ('Comunicazione essenziale', 'Esprimiti in situazioni comuni: trasporti, shopping, indicazioni.')},
    'pt': {M1: ('Bases do chinês', 'Descubra os fundamentos: pinyin, tons, primeiros caracteres e saudações.'),
           M2: ('Vida cotidiana', 'Fale sobre sua vida diária: família, comida, números e datas.'),
           M3: ('Comunicação essencial', 'Expresse-se em situações comuns: transporte, compras, direções.')},
    'ru': {M1: ('Основы китайского', 'Откройте основы: пиньинь, тоны, первые иероглифы и приветствия.'),
           M2: ('Повседневная жизнь', 'Говорите о повседневной жизни: семья, еда, числа и даты.'),
           M3: ('Основная коммуникация', 'Выражайтесь в типичных ситуациях: транспорт, покупки, направления.')},
    'ja': {M1: ('中国語の基礎', 'ピンイン、声調、最初の漢字と挨拶の基礎を学びましょう。'),
           M2: ('日常生活', '日常生活について話しましょう：家族、食べ物、数字、日付。'),
           M3: ('基本的なコミュニケーション', '一般的な場面で表現しましょう：交通、買い物、道案内。')},
    'ko': {M1: ('중국어 기초', '기초를 배우세요: 병음, 성조, 첫 한자와 인사.'),
           M2: ('일상생활', '일상생활에 대해 이야기하세요: 가족, 음식, 숫자, 날짜.'),
           M3: ('필수 의사소통', '일상 상황에서 표현하세요: 교통, 쇼핑, 길 안내.')},
    'zh-Hans': {M1: ('汉语基础', '学习基础知识：拼音、声调、初级汉字和问候语。'),
                M2: ('日常生活', '谈论日常生活：家庭、饮食、数字和日期。'),
                M3: ('基本交流', '在常见场景中表达自己：交通、购物、问路。')},
    'zh-Hant': {M1: ('漢語基礎', '學習基礎知識：拼音、聲調、初級漢字和問候語。'),
                M2: ('日常生活', '談論日常生活：家庭、飲食、數字和日期。'),
                M3: ('基本交流', '在常見場景中表達自己：交通、購物、問路。')},
    'vi': {M1: ('Nền tảng tiếng Trung', 'Khám phá cơ bản: pinyin, thanh điệu, chữ Hán đầu tiên và chào hỏi.'),
           M2: ('Cuộc sống hàng ngày', 'Nói về cuộc sống hàng ngày: gia đình, thức ăn, số và ngày tháng.'),
           M3: ('Giao tiếp cơ bản', 'Diễn đạt trong các tình huống thường gặp: giao thông, mua sắm, chỉ đường.')},
    'th': {M1: ('พื้นฐานภาษาจีน', 'เรียนรู้พื้นฐาน: พินอิน เสียงวรรณยุกต์ ตัวอักษรแรกและการทักทาย'),
           M2: ('ชีวิตประจำวัน', 'พูดเกี่ยวกับชีวิตประจำวัน: ครอบครัว อาหาร ตัวเลขและวันที่'),
           M3: ('การสื่อสารพื้นฐาน', 'แสดงออกในสถานการณ์ทั่วไป: การเดินทาง ช้อปปิ้ง ถามทาง')},
    'id': {M1: ('Dasar bahasa Mandarin', 'Temukan dasar-dasarnya: pinyin, nada, karakter pertama dan salam.'),
           M2: ('Kehidupan sehari-hari', 'Bicarakan kehidupan sehari-hari: keluarga, makanan, angka dan tanggal.'),
           M3: ('Komunikasi dasar', 'Ekspresikan diri dalam situasi umum: transportasi, belanja, arah.')},
    'hi': {M1: ('चीनी भाषा की मूल बातें', 'मूल बातें सीखें: पिनयिन, स्वर, पहले अक्षर और अभिवादन।'),
           M2: ('दैनिक जीवन', 'अपने दैनिक जीवन के बारे में बात करें: परिवार, भोजन, संख्याएँ और तिथियाँ।'),
           M3: ('आवश्यक संवाद', 'सामान्य स्थितियों में अभिव्यक्ति: परिवहन, खरीदारी, दिशा-निर्देश।')},
    'ar': {M1: ('أساسيات اللغة الصينية', 'اكتشف الأساسيات: البينيين، النغمات، أول الحروف والتحيات.'),
           M2: ('الحياة اليومية', 'تحدث عن حياتك اليومية: العائلة، الطعام، الأرقام والتواريخ.'),
           M3: ('التواصل الأساسي', 'عبّر عن نفسك في مواقف شائعة: المواصلات، التسوق، الاتجاهات.')},
    'pl': {M1: ('Podstawy chińskiego', 'Odkryj podstawy: pinyin, tony, pierwsze znaki i pozdrowienia.'),
           M2: ('Codzienne życie', 'Opowiadaj o codziennym życiu: rodzina, jedzenie, liczby i daty.'),
           M3: ('Podstawowa komunikacja', 'Wyrażaj się w typowych sytuacjach: transport, zakupy, kierunki.')},
    'ro': {M1: ('Bazele chinezei', 'Descoperă bazele: pinyin, tonuri, primele caractere și salutări.'),
           M2: ('Viața de zi cu zi', 'Vorbește despre viața ta de zi cu zi: familie, mâncare, numere și date.'),
           M3: ('Comunicare esențială', 'Exprimă-te în situații comune: transport, cumpărături, direcții.')},
    'uk': {M1: ('Основи китайської', 'Вивчайте основи: піньїнь, тони, перші ієрогліфи та привітання.'),
           M2: ('Повсякденне життя', 'Розмовляйте про повсякденне життя: сім\'я, їжа, числа та дати.'),
           M3: ('Базова комунікація', 'Висловлюйтеся в типових ситуаціях: транспорт, покупки, напрямки.')},
}

# ─── Grammar point title translations ────────────────────────────────────
# We need all 37 grammar point IDs and their EN titles first
GRAMMAR_EN = supa_get('grammar_point_translations', 'select=grammar_point_id,title&locale=eq.en&order=grammar_point_id')
print(f"Found {len(GRAMMAR_EN)} grammar points")

# Grammar titles by locale (for the most important ones)
GRAMMAR_TITLES = {
    'es': {
        'Basic greetings': 'Saludos básicos',
        'Thanking and replying': 'Agradecer y responder',
        'Apologizing and reassuring': 'Disculparse y tranquilizar',
        'Possessive 的': 'Posesivo 的',
        'The verb 是 (to be) before a noun': 'El verbo 是 (ser) antes de un sustantivo',
        'Sentences with 是 (to be)': 'Oraciones con 是 (ser)',
        'Negation with 不': 'Negación con 不',
        'Yes/no questions with 吗': 'Preguntas sí/no con 吗',
        'Counting with measure words': 'Contar con clasificadores',
        'Numbers 1-99': 'Números 1-99',
        'Expressing dates': 'Expresar fechas',
        'Telling time': 'Decir la hora',
        'The particle 了 (completed action)': 'La partícula 了 (acción completada)',
        'The particle 过 (past experience)': 'La partícula 过 (experiencia pasada)',
        'Asking questions with 什么': 'Preguntar con 什么 (qué)',
        'Asking questions with 哪里': 'Preguntar con 哪里 (dónde)',
        'Asking questions with 谁': 'Preguntar con 谁 (quién)',
        'Asking questions with 怎么': 'Preguntar con 怎么 (cómo)',
        'Asking age with 几岁/多大': 'Preguntar la edad con 几岁/多大',
        'Expressing ability with 会': 'Expresar habilidad con 会',
        'Expressing desire with 想': 'Expresar deseo con 想',
        'Expressing existence with 有': 'Expresar existencia con 有',
        'Location with 在': 'Ubicación con 在',
        'Verb + Object structure': 'Estructura Verbo + Objeto',
        'Adjective predicates': 'Predicados adjetivales',
        'Adverbs 也 and 都': 'Adverbios 也 y 都',
        'The adverb 很': 'El adverbio 很',
        'Comparative with 比': 'Comparativo con 比',
        'Progressive aspect with 在': 'Aspecto progresivo con 在',
        'Direction complements': 'Complementos de dirección',
        'Expressing likes with 喜欢': 'Expresar gustos con 喜欢',
        'Expressing weather': 'Expresar el clima',
        'Talking about family': 'Hablar de la familia',
        'Ordering food': 'Pedir comida',
        'Shopping expressions': 'Expresiones de compras',
        'Asking for directions': 'Pedir direcciones',
        'Transport expressions': 'Expresiones de transporte',
    },
    'tr': {
        'Basic greetings': 'Temel selamlaşmalar',
        'Thanking and replying': 'Teşekkür etme ve yanıtlama',
        'Apologizing and reassuring': 'Özür dileme ve rahatlatma',
        'Possessive 的': 'İyelik eki 的',
        'The verb 是 (to be) before a noun': '是 fiili (olmak) isimden önce',
        'Sentences with 是 (to be)': '是 ile cümleler (olmak)',
        'Negation with 不': '不 ile olumsuzluk',
        'Yes/no questions with 吗': '吗 ile evet/hayır soruları',
        'Counting with measure words': 'Ölçü kelimeleri ile sayma',
        'Numbers 1-99': 'Sayılar 1-99',
        'Expressing dates': 'Tarih ifade etme',
        'Telling time': 'Saat söyleme',
        'The particle 了 (completed action)': '了 edatı (tamamlanmış eylem)',
        'The particle 过 (past experience)': '过 edatı (geçmiş deneyim)',
        'Asking questions with 什么': '什么 ile soru sorma (ne)',
        'Asking questions with 哪里': '哪里 ile soru sorma (nerede)',
        'Asking questions with 谁': '谁 ile soru sorma (kim)',
        'Asking questions with 怎么': '怎么 ile soru sorma (nasıl)',
        'Asking age with 几岁/多大': '几岁/多大 ile yaş sorma',
        'Expressing ability with 会': '会 ile yetenek ifade etme',
        'Expressing desire with 想': '想 ile istek ifade etme',
        'Expressing existence with 有': '有 ile varlık ifade etme',
        'Location with 在': '在 ile konum',
        'Verb + Object structure': 'Fiil + Nesne yapısı',
        'Adjective predicates': 'Sıfat yüklemleri',
        'Adverbs 也 and 都': '也 ve 都 zarfları',
        'The adverb 很': '很 zarfı',
        'Comparative with 比': '比 ile karşılaştırma',
        'Progressive aspect with 在': '在 ile devam eden eylem',
        'Direction complements': 'Yön tamamlayıcıları',
        'Expressing likes with 喜欢': '喜欢 ile beğeni ifade etme',
        'Expressing weather': 'Hava durumu ifade etme',
        'Talking about family': 'Aile hakkında konuşma',
        'Ordering food': 'Yemek siparişi',
        'Shopping expressions': 'Alışveriş ifadeleri',
        'Asking for directions': 'Yol sorma',
        'Transport expressions': 'Ulaşım ifadeleri',
    },
    'de': {
        'Basic greetings': 'Grundlegende Begrüßungen',
        'Thanking and replying': 'Danken und Antworten',
        'Apologizing and reassuring': 'Entschuldigen und Beruhigen',
        'Possessive 的': 'Possessiv 的',
        'The verb 是 (to be) before a noun': 'Das Verb 是 (sein) vor einem Nomen',
        'Sentences with 是 (to be)': 'Sätze mit 是 (sein)',
        'Negation with 不': 'Verneinung mit 不',
        'Yes/no questions with 吗': 'Ja/Nein-Fragen mit 吗',
        'Counting with measure words': 'Zählen mit Zählwörtern',
        'Numbers 1-99': 'Zahlen 1-99',
        'Expressing dates': 'Datum ausdrücken',
        'Telling time': 'Uhrzeit sagen',
        'The particle 了 (completed action)': 'Partikel 了 (abgeschlossene Handlung)',
        'The particle 过 (past experience)': 'Partikel 过 (vergangene Erfahrung)',
        'Asking questions with 什么': 'Fragen mit 什么 (was)',
        'Asking questions with 哪里': 'Fragen mit 哪里 (wo)',
        'Asking questions with 谁': 'Fragen mit 谁 (wer)',
        'Asking questions with 怎么': 'Fragen mit 怎么 (wie)',
        'Asking age with 几岁/多大': 'Alter fragen mit 几岁/多大',
        'Expressing ability with 会': 'Fähigkeit ausdrücken mit 会',
        'Expressing desire with 想': 'Wunsch ausdrücken mit 想',
        'Expressing existence with 有': 'Existenz ausdrücken mit 有',
        'Location with 在': 'Ort mit 在',
        'Verb + Object structure': 'Verb + Objekt Struktur',
        'Adjective predicates': 'Adjektiv-Prädikate',
        'Adverbs 也 and 都': 'Adverbien 也 und 都',
        'The adverb 很': 'Das Adverb 很',
        'Comparative with 比': 'Vergleich mit 比',
        'Progressive aspect with 在': 'Progressiver Aspekt mit 在',
        'Direction complements': 'Richtungsergänzungen',
        'Expressing likes with 喜欢': 'Vorlieben ausdrücken mit 喜欢',
        'Expressing weather': 'Wetter ausdrücken',
        'Talking about family': 'Über Familie sprechen',
        'Ordering food': 'Essen bestellen',
        'Shopping expressions': 'Einkaufsausdrücke',
        'Asking for directions': 'Nach dem Weg fragen',
        'Transport expressions': 'Verkehrsausdrücke',
    },
    'pt': {
        'Basic greetings': 'Saudações básicas', 'Thanking and replying': 'Agradecer e responder',
        'Apologizing and reassuring': 'Pedir desculpas e tranquilizar', 'Possessive 的': 'Possessivo 的',
        'The verb 是 (to be) before a noun': 'O verbo 是 (ser) antes de um substantivo',
        'Sentences with 是 (to be)': 'Frases com 是 (ser)', 'Negation with 不': 'Negação com 不',
        'Yes/no questions with 吗': 'Perguntas sim/não com 吗', 'Numbers 1-99': 'Números 1-99',
    },
    'it': {
        'Basic greetings': 'Saluti di base', 'Thanking and replying': 'Ringraziare e rispondere',
        'Apologizing and reassuring': 'Scusarsi e rassicurare', 'Possessive 的': 'Possessivo 的',
        'Sentences with 是 (to be)': 'Frasi con 是 (essere)', 'Negation with 不': 'Negazione con 不',
        'Yes/no questions with 吗': 'Domande sì/no con 吗', 'Numbers 1-99': 'Numeri 1-99',
    },
    'ru': {
        'Basic greetings': 'Базовые приветствия', 'Thanking and replying': 'Благодарность и ответ',
        'Apologizing and reassuring': 'Извинения и утешение', 'Possessive 的': 'Притяжательная частица 的',
        'Sentences with 是 (to be)': 'Предложения с 是 (быть)', 'Negation with 不': 'Отрицание с 不',
        'Yes/no questions with 吗': 'Вопросы да/нет с 吗', 'Numbers 1-99': 'Числа 1-99',
    },
    'ja': {
        'Basic greetings': '基本の挨拶', 'Thanking and replying': '感謝と返答',
        'Sentences with 是 (to be)': '是を使った文（〜です）', 'Negation with 不': '不による否定',
        'Yes/no questions with 吗': '吗を使ったはい/いいえの質問', 'Numbers 1-99': '数字 1-99',
    },
    'ko': {
        'Basic greetings': '기본 인사', 'Thanking and replying': '감사와 대답',
        'Sentences with 是 (to be)': '是를 사용한 문장 (이다)', 'Negation with 不': '不로 부정하기',
        'Yes/no questions with 吗': '吗로 예/아니오 질문', 'Numbers 1-99': '숫자 1-99',
    },
    'vi': {
        'Basic greetings': 'Chào hỏi cơ bản', 'Thanking and replying': 'Cảm ơn và trả lời',
        'Sentences with 是 (to be)': 'Câu với 是 (là)', 'Negation with 不': 'Phủ định với 不',
        'Yes/no questions with 吗': 'Câu hỏi có/không với 吗', 'Numbers 1-99': 'Số 1-99',
    },
    'ar': {
        'Basic greetings': 'التحيات الأساسية', 'Thanking and replying': 'الشكر والرد',
        'Sentences with 是 (to be)': 'جمل مع 是 (يكون)', 'Negation with 不': 'النفي مع 不',
        'Yes/no questions with 吗': 'أسئلة نعم/لا مع 吗', 'Numbers 1-99': 'الأرقام 1-99',
    },
}

# ─── INSERT ALL ──────────────────────────────────────────────────────────

total_rows = 0
errors = 0

# 1. Course translations
print("\n=== Inserting course translations ===")
for locale, courses in COURSE_TRANS.items():
    rows = [{'course_id': cid, 'locale': locale, 'title': title, 'description': desc}
            for cid, (title, desc) in courses.items()]
    status, n = supa_post('course_translations', rows)
    total_rows += n
    print(f"  {locale}: {n} courses (status={status})")

# 2. Module translations
print("\n=== Inserting module translations ===")
for locale, modules in MODULE_TRANS.items():
    rows = [{'module_id': mid, 'locale': locale, 'title': title, 'description': desc}
            for mid, (title, desc) in modules.items()]
    status, n = supa_post('module_translations', rows)
    total_rows += n
    print(f"  {locale}: {n} modules (status={status})")

# 3. Grammar point translations (titles only, explanation_html stays in EN as fallback)
print("\n=== Inserting grammar title translations ===")
for locale, title_map in GRAMMAR_TITLES.items():
    rows = []
    for g in GRAMMAR_EN:
        en_title = g['title']
        translated_title = title_map.get(en_title, en_title)  # fallback to EN if not translated
        rows.append({
            'grammar_point_id': g['grammar_point_id'],
            'locale': locale,
            'title': translated_title,
            'explanation_html': '',  # will use EN fallback for HTML content
        })
    status, n = supa_post('grammar_point_translations', rows)
    total_rows += n
    print(f"  {locale}: {n} grammar titles (status={status})")

print(f"\n{'='*60}")
print(f"Total rows inserted: {total_rows}")
print(f"{'='*60}")
