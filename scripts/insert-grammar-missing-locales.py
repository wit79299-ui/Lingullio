#!/usr/bin/env python3
"""
Insert grammar_point_translations for 8 missing locales:
th, zh-Hans, zh-Hant, id, hi, pl, ro, uk

Strategy: Copy full rows from EN, translate title only.
The explanation_html, examples, common_errors stay in EN 
(they contain Chinese content that doesn't change).
"""

import json, os
from urllib.request import Request, urlopen
from urllib.error import HTTPError

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or 'https://gmpjkoajhhwvxwsdohll.supabase.co'
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    os.environ[k.strip()] = v.strip()
        SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL)
        SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

assert SUPABASE_KEY, "Missing SUPABASE_SERVICE_ROLE_KEY"

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

def supa_get(table, params=''):
    req = Request(f'{SUPABASE_URL}/rest/v1/{table}?{params}', headers=HEADERS)
    return json.loads(urlopen(req).read())

def supa_post(table, rows):
    headers = {**HEADERS, 'Prefer': 'resolution=ignore-duplicates'}
    req = Request(f'{SUPABASE_URL}/rest/v1/{table}',
        data=json.dumps(rows).encode('utf-8'),
        headers=headers, method='POST')
    try:
        resp = urlopen(req)
        return resp.status, len(rows)
    except HTTPError as e:
        body = e.read().decode()[:300]
        print(f"    POST error {e.code}: {body}")
        return e.code, 0

# ═══════════════════════════════════════════════════════════════
# Title translations per locale
# ═══════════════════════════════════════════════════════════════

# 37 EN titles → translated titles per locale
TITLES = {
    'th': {
        "Basic greetings": "การทักทายเบื้องต้น",
        "Thanking and replying": "การขอบคุณและตอบรับ",
        "Apologizing and reassuring": "การขอโทษและให้กำลังใจ",
        "Possessive 的": "的 แสดงความเป็นเจ้าของ",
        "The verb 是 (to be) before a noun": "กริยา 是 (เป็น/คือ) หน้าคำนาม",
        "Negating 是": "การปฏิเสธ 是",
        "Yes/no questions with 吗": "คำถามใช่/ไม่ใช่ ด้วย 吗",
        "Predicate adjectives with 很": "คำคุณศัพท์ภาคแสดงกับ 很",
        "Numbers 1 to 100": "ตัวเลข 1 ถึง 100",
        "The classifier 个": "ลักษณนาม 个",
        "Asking someone's age": "การถามอายุ",
        "有 — Expressing possession": "有 — การแสดงการครอบครอง",
        "没有 — Negating 有": "没有 — การปฏิเสธ 有",
        "Alternative questions with 有没有": "คำถามทางเลือกด้วย 有没有",
        "有 — Existence (\"there is\")": "有 — การมีอยู่ (\"มี\")",
        "太...了 — Excess": "太...了 — มากเกินไป",
        "什么 — Asking \"what\"": "什么 — ถาม \"อะไร\"",
        "谁 — Asking \"who\"": "谁 — ถาม \"ใคร\"",
        "哪儿/哪里 — Asking \"where\"": "哪儿/哪里 — ถาม \"ที่ไหน\"",
        "怎么 — Asking \"how\"": "怎么 — ถาม \"อย่างไร\"",
        "怎么样 — Asking for an opinion/state": "怎么样 — ถามความเห็น/สภาพ",
        "Big-to-small order (date and time)": "ลำดับจากใหญ่ไปเล็ก (วันที่และเวลา)",
        "Telling time with 点": "บอกเวลาด้วย 点",
        "Days of the week": "วันในสัปดาห์",
        "The basic subject-verb-object sentence": "ประโยคพื้นฐาน ประธาน-กริยา-กรรม",
        "在 + Verb — Ongoing action": "在 + กริยา — กำลังทำอยู่",
        "喜欢 + Verb — Liking to do something": "喜欢 + กริยา — ชอบทำ",
        "会 — Learned ability": "会 — ความสามารถที่เรียนรู้",
        "想 — Wishing": "想 — อยาก/ต้องการ",
        "要 — To want / must": "要 — ต้องการ/ต้อง",
        "在 + Place — To be located at": "在 + สถานที่ — อยู่ที่",
        "也 and 都 — Adverbs before the verb": "也 และ 都 — กริยาวิเศษณ์หน้ากริยา",
        "一点儿 — A little": "一点儿 — นิดหน่อย",
        "请 — Polite requests": "请 — คำขอสุภาพ",
        "多少 vs 几 — Two ways to ask \"how many\"": "多少 vs 几 — สองวิธีถาม \"เท่าไร\"",
        "Sentences with 是 (to be)": "ประโยคกับ 是 (เป็น/คือ)",
        "Negation with 不": "การปฏิเสธด้วย 不",
    },
    'zh-Hans': {
        "Basic greetings": "基本问候",
        "Thanking and replying": "感谢与回复",
        "Apologizing and reassuring": "道歉与安慰",
        "Possessive 的": "所有格 的",
        "The verb 是 (to be) before a noun": "动词 是 用于名词前",
        "Negating 是": "否定 是",
        "Yes/no questions with 吗": "用 吗 提问是非问题",
        "Predicate adjectives with 很": "用 很 构成谓语形容词",
        "Numbers 1 to 100": "数字 1 到 100",
        "The classifier 个": "量词 个",
        "Asking someone's age": "询问年龄",
        "有 — Expressing possession": "有 — 表示拥有",
        "没有 — Negating 有": "没有 — 否定 有",
        "Alternative questions with 有没有": "用 有没有 提问选择问题",
        "有 — Existence (\"there is\")": "有 — 表示存在",
        "太...了 — Excess": "太...了 — 表示过度",
        '什么 — Asking "what"': '什么 — 问「什么」',
        '谁 — Asking "who"': '谁 — 问「谁」',
        '哪儿/哪里 — Asking "where"': '哪儿/哪里 — 问「哪里」',
        '怎么 — Asking "how"': '怎么 — 问「怎么」',
        "怎么样 — Asking for an opinion/state": "怎么样 — 询问意见或状态",
        "Big-to-small order (date and time)": "从大到小的顺序（日期和时间）",
        "Telling time with 点": "用 点 表达时间",
        "Days of the week": "星期几",
        "The basic subject-verb-object sentence": "基本主谓宾句",
        "在 + Verb — Ongoing action": "在 + 动词 — 正在进行",
        "喜欢 + Verb — Liking to do something": "喜欢 + 动词 — 喜欢做",
        "会 — Learned ability": "会 — 学会的能力",
        "想 — Wishing": "想 — 想要",
        "要 — To want / must": "要 — 想要/必须",
        "在 + Place — To be located at": "在 + 地点 — 在某处",
        "也 and 都 — Adverbs before the verb": "也 和 都 — 动词前的副词",
        "一点儿 — A little": "一点儿 — 一点",
        "请 — Polite requests": "请 — 礼貌请求",
        '多少 vs 几 — Two ways to ask "how many"': '多少 vs 几 — 两种问「多少」',
        "Sentences with 是 (to be)": "用 是 的句子",
        "Negation with 不": "用 不 否定",
    },
    'zh-Hant': {
        "Basic greetings": "基本問候",
        "Thanking and replying": "感謝與回覆",
        "Apologizing and reassuring": "道歉與安慰",
        "Possessive 的": "所有格 的",
        "The verb 是 (to be) before a noun": "動詞 是 用於名詞前",
        "Negating 是": "否定 是",
        "Yes/no questions with 吗": "用 嗎 提問是非問題",
        "Predicate adjectives with 很": "用 很 構成謂語形容詞",
        "Numbers 1 to 100": "數字 1 到 100",
        "The classifier 个": "量詞 個",
        "Asking someone's age": "詢問年齡",
        "有 — Expressing possession": "有 — 表示擁有",
        "没有 — Negating 有": "沒有 — 否定 有",
        "Alternative questions with 有没有": "用 有沒有 提問選擇問題",
        "有 — Existence (\"there is\")": "有 — 表示存在",
        "太...了 — Excess": "太...了 — 表示過度",
        '什么 — Asking "what"': '什麼 — 問「什麼」',
        '谁 — Asking "who"': '誰 — 問「誰」',
        '哪儿/哪里 — Asking "where"': '哪兒/哪裡 — 問「哪裡」',
        '怎么 — Asking "how"': '怎麼 — 問「怎麼」',
        "怎么样 — Asking for an opinion/state": "怎麼樣 — 詢問意見或狀態",
        "Big-to-small order (date and time)": "從大到小的順序（日期和時間）",
        "Telling time with 点": "用 點 表達時間",
        "Days of the week": "星期幾",
        "The basic subject-verb-object sentence": "基本主謂賓句",
        "在 + Verb — Ongoing action": "在 + 動詞 — 正在進行",
        "喜欢 + Verb — Liking to do something": "喜歡 + 動詞 — 喜歡做",
        "会 — Learned ability": "會 — 學會的能力",
        "想 — Wishing": "想 — 想要",
        "要 — To want / must": "要 — 想要/必須",
        "在 + Place — To be located at": "在 + 地點 — 在某處",
        "也 and 都 — Adverbs before the verb": "也 和 都 — 動詞前的副詞",
        "一点儿 — A little": "一點兒 — 一點",
        "请 — Polite requests": "請 — 禮貌請求",
        '多少 vs 几 — Two ways to ask "how many"': '多少 vs 幾 — 兩種問「多少」',
        "Sentences with 是 (to be)": "用 是 的句子",
        "Negation with 不": "用 不 否定",
    },
    'id': {
        "Basic greetings": "Salam dasar",
        "Thanking and replying": "Berterima kasih dan membalas",
        "Apologizing and reassuring": "Meminta maaf dan meyakinkan",
        "Possessive 的": "Kepemilikan 的",
        "The verb 是 (to be) before a noun": "Kata kerja 是 (adalah) sebelum kata benda",
        "Negating 是": "Menegasikan 是",
        "Yes/no questions with 吗": "Pertanyaan ya/tidak dengan 吗",
        "Predicate adjectives with 很": "Kata sifat predikat dengan 很",
        "Numbers 1 to 100": "Angka 1 sampai 100",
        "The classifier 个": "Kata penggolong 个",
        "Asking someone's age": "Menanyakan umur",
        "有 — Expressing possession": "有 — Menyatakan kepemilikan",
        "没有 — Negating 有": "没有 — Menegasikan 有",
        "Alternative questions with 有没有": "Pertanyaan alternatif dengan 有没有",
        "有 — Existence (\"there is\")": "有 — Keberadaan (\"ada\")",
        "太...了 — Excess": "太...了 — Berlebihan",
        "什么 — Asking \"what\"": "什么 — Menanyakan \"apa\"",
        "谁 — Asking \"who\"": "谁 — Menanyakan \"siapa\"",
        "哪儿/哪里 — Asking \"where\"": "哪儿/哪里 — Menanyakan \"di mana\"",
        "怎么 — Asking \"how\"": "怎么 — Menanyakan \"bagaimana\"",
        "怎么样 — Asking for an opinion/state": "怎么样 — Meminta pendapat/keadaan",
        "Big-to-small order (date and time)": "Urutan besar ke kecil (tanggal dan waktu)",
        "Telling time with 点": "Menyatakan waktu dengan 点",
        "Days of the week": "Hari dalam seminggu",
        "The basic subject-verb-object sentence": "Kalimat dasar subjek-kata kerja-objek",
        "在 + Verb — Ongoing action": "在 + Kata kerja — Sedang berlangsung",
        "喜欢 + Verb — Liking to do something": "喜欢 + Kata kerja — Suka melakukan",
        "会 — Learned ability": "会 — Kemampuan yang dipelajari",
        "想 — Wishing": "想 — Ingin",
        "要 — To want / must": "要 — Mau/harus",
        "在 + Place — To be located at": "在 + Tempat — Berada di",
        "也 and 都 — Adverbs before the verb": "也 dan 都 — Kata keterangan sebelum kata kerja",
        "一点儿 — A little": "一点儿 — Sedikit",
        "请 — Polite requests": "请 — Permintaan sopan",
        "多少 vs 几 — Two ways to ask \"how many\"": "多少 vs 几 — Dua cara bertanya \"berapa\"",
        "Sentences with 是 (to be)": "Kalimat dengan 是 (adalah)",
        "Negation with 不": "Penolakan dengan 不",
    },
    'hi': {
        "Basic greetings": "बुनियादी अभिवादन",
        "Thanking and replying": "धन्यवाद और उत्तर देना",
        "Apologizing and reassuring": "माफी मांगना और आश्वासन देना",
        "Possessive 的": "स्वामित्व सूचक 的",
        "The verb 是 (to be) before a noun": "संज्ञा से पहले क्रिया 是 (होना)",
        "Negating 是": "是 का नकारात्मक",
        "Yes/no questions with 吗": "吗 से हाँ/नहीं प्रश्न",
        "Predicate adjectives with 很": "很 के साथ विधेय विशेषण",
        "Numbers 1 to 100": "संख्या 1 से 100",
        "The classifier 个": "वर्गीकरण शब्द 个",
        "Asking someone's age": "उम्र पूछना",
        "有 — Expressing possession": "有 — स्वामित्व व्यक्त करना",
        "没有 — Negating 有": "没有 — 有 का नकारात्मक",
        "Alternative questions with 有没有": "有没有 से वैकल्पिक प्रश्न",
        "有 — Existence (\"there is\")": "有 — अस्तित्व (\"है\")",
        "太...了 — Excess": "太...了 — अधिकता",
        "什么 — Asking \"what\"": "什么 — \"क्या\" पूछना",
        "谁 — Asking \"who\"": "谁 — \"कौन\" पूछना",
        "哪儿/哪里 — Asking \"where\"": "哪儿/哪里 — \"कहाँ\" पूछना",
        "怎么 — Asking \"how\"": "怎么 — \"कैसे\" पूछना",
        "怎么样 — Asking for an opinion/state": "怎么样 — राय/स्थिति पूछना",
        "Big-to-small order (date and time)": "बड़े से छोटे क्रम में (तारीख और समय)",
        "Telling time with 点": "点 से समय बताना",
        "Days of the week": "सप्ताह के दिन",
        "The basic subject-verb-object sentence": "बुनियादी कर्ता-क्रिया-कर्म वाक्य",
        "在 + Verb — Ongoing action": "在 + क्रिया — जारी कार्य",
        "喜欢 + Verb — Liking to do something": "喜欢 + क्रिया — कुछ करना पसंद करना",
        "会 — Learned ability": "会 — सीखी गई क्षमता",
        "想 — Wishing": "想 — चाहना",
        "要 — To want / must": "要 — चाहना/होना चाहिए",
        "在 + Place — To be located at": "在 + स्थान — पर स्थित होना",
        "也 and 都 — Adverbs before the verb": "也 और 都 — क्रिया से पहले क्रिया-विशेषण",
        "一点儿 — A little": "一点儿 — थोड़ा",
        "请 — Polite requests": "请 — विनम्र अनुरोध",
        "多少 vs 几 — Two ways to ask \"how many\"": "多少 vs 几 — \"कितने\" पूछने के दो तरीके",
        "Sentences with 是 (to be)": "是 (होना) वाले वाक्य",
        "Negation with 不": "不 से नकारात्मक",
    },
    'pl': {
        "Basic greetings": "Podstawowe pozdrowienia",
        "Thanking and replying": "Dziękowanie i odpowiadanie",
        "Apologizing and reassuring": "Przepraszanie i uspokajanie",
        "Possessive 的": "Dzierżawcze 的",
        "The verb 是 (to be) before a noun": "Czasownik 是 (być) przed rzeczownikiem",
        "Negating 是": "Zaprzeczenie 是",
        "Yes/no questions with 吗": "Pytania tak/nie z 吗",
        "Predicate adjectives with 很": "Przymiotniki orzecznikowe z 很",
        "Numbers 1 to 100": "Liczby od 1 do 100",
        "The classifier 个": "Klasyfikator 个",
        "Asking someone's age": "Pytanie o wiek",
        "有 — Expressing possession": "有 — Wyrażanie posiadania",
        "没有 — Negating 有": "没有 — Zaprzeczenie 有",
        "Alternative questions with 有没有": "Pytania alternatywne z 有没有",
        "有 — Existence (\"there is\")": "有 — Istnienie (\"jest\")",
        "太...了 — Excess": "太...了 — Nadmiar",
        "什么 — Asking \"what\"": "什么 — Pytanie \"co\"",
        "谁 — Asking \"who\"": "谁 — Pytanie \"kto\"",
        "哪儿/哪里 — Asking \"where\"": "哪儿/哪里 — Pytanie \"gdzie\"",
        "怎么 — Asking \"how\"": "怎么 — Pytanie \"jak\"",
        "怎么样 — Asking for an opinion/state": "怎么样 — Pytanie o opinię/stan",
        "Big-to-small order (date and time)": "Kolejność od dużego do małego (data i czas)",
        "Telling time with 点": "Podawanie czasu z 点",
        "Days of the week": "Dni tygodnia",
        "The basic subject-verb-object sentence": "Podstawowe zdanie podmiot-orzeczenie-dopełnienie",
        "在 + Verb — Ongoing action": "在 + Czasownik — Trwająca czynność",
        "喜欢 + Verb — Liking to do something": "喜欢 + Czasownik — Lubienie robienia",
        "会 — Learned ability": "会 — Wyuczona umiejętność",
        "想 — Wishing": "想 — Chcenie",
        "要 — To want / must": "要 — Chcieć/musieć",
        "在 + Place — To be located at": "在 + Miejsce — Znajdować się w",
        "也 and 都 — Adverbs before the verb": "也 i 都 — Przysłówki przed czasownikiem",
        "一点儿 — A little": "一点儿 — Trochę",
        "请 — Polite requests": "请 — Grzeczne prośby",
        "多少 vs 几 — Two ways to ask \"how many\"": "多少 vs 几 — Dwa sposoby pytania \"ile\"",
        "Sentences with 是 (to be)": "Zdania z 是 (być)",
        "Negation with 不": "Przeczenie z 不",
    },
    'ro': {
        "Basic greetings": "Salutări de bază",
        "Thanking and replying": "Mulțumirea și răspunsul",
        "Apologizing and reassuring": "Scuze și încurajări",
        "Possessive 的": "Posesivul 的",
        "The verb 是 (to be) before a noun": "Verbul 是 (a fi) înaintea unui substantiv",
        "Negating 是": "Negarea lui 是",
        "Yes/no questions with 吗": "Întrebări da/nu cu 吗",
        "Predicate adjectives with 很": "Adjective predicative cu 很",
        "Numbers 1 to 100": "Numerele de la 1 la 100",
        "The classifier 个": "Clasificatorul 个",
        "Asking someone's age": "A întreba vârsta",
        "有 — Expressing possession": "有 — Exprimarea posesiei",
        "没有 — Negating 有": "没有 — Negarea lui 有",
        "Alternative questions with 有没有": "Întrebări alternative cu 有没有",
        "有 — Existence (\"there is\")": "有 — Existența (\"există\")",
        "太...了 — Excess": "太...了 — Exces",
        "什么 — Asking \"what\"": "什么 — A întreba \"ce\"",
        "谁 — Asking \"who\"": "谁 — A întreba \"cine\"",
        "哪儿/哪里 — Asking \"where\"": "哪儿/哪里 — A întreba \"unde\"",
        "怎么 — Asking \"how\"": "怎么 — A întreba \"cum\"",
        "怎么样 — Asking for an opinion/state": "怎么样 — A cere o opinie/stare",
        "Big-to-small order (date and time)": "Ordinea de la mare la mic (dată și oră)",
        "Telling time with 点": "Spunerea orei cu 点",
        "Days of the week": "Zilele săptămânii",
        "The basic subject-verb-object sentence": "Propoziția de bază subiect-verb-obiect",
        "在 + Verb — Ongoing action": "在 + Verb — Acțiune în curs",
        "喜欢 + Verb — Liking to do something": "喜欢 + Verb — A-ți plăcea să faci",
        "会 — Learned ability": "会 — Abilitate învățată",
        "想 — Wishing": "想 — A dori",
        "要 — To want / must": "要 — A vrea/a trebui",
        "在 + Place — To be located at": "在 + Loc — A se afla la",
        "也 and 都 — Adverbs before the verb": "也 și 都 — Adverbe înaintea verbului",
        "一点儿 — A little": "一点儿 — Un pic",
        "请 — Polite requests": "请 — Cereri politicoase",
        "多少 vs 几 — Two ways to ask \"how many\"": "多少 vs 几 — Două moduri de a întreba \"câți\"",
        "Sentences with 是 (to be)": "Propoziții cu 是 (a fi)",
        "Negation with 不": "Negarea cu 不",
    },
    'uk': {
        "Basic greetings": "Основні привітання",
        "Thanking and replying": "Подяка та відповідь",
        "Apologizing and reassuring": "Вибачення та заспокоєння",
        "Possessive 的": "Присвійне 的",
        "The verb 是 (to be) before a noun": "Дієслово 是 (бути) перед іменником",
        "Negating 是": "Заперечення 是",
        "Yes/no questions with 吗": "Питання так/ні з 吗",
        "Predicate adjectives with 很": "Предикативні прикметники з 很",
        "Numbers 1 to 100": "Числа від 1 до 100",
        "The classifier 个": "Класифікатор 个",
        "Asking someone's age": "Запитання про вік",
        "有 — Expressing possession": "有 — Вираження володіння",
        "没有 — Negating 有": "没有 — Заперечення 有",
        "Alternative questions with 有没有": "Альтернативні питання з 有没有",
        "有 — Existence (\"there is\")": "有 — Існування (\"є\")",
        "太...了 — Excess": "太...了 — Надмірність",
        "什么 — Asking \"what\"": "什么 — Запитання \"що\"",
        "谁 — Asking \"who\"": "谁 — Запитання \"хто\"",
        "哪儿/哪里 — Asking \"where\"": "哪儿/哪里 — Запитання \"де\"",
        "怎么 — Asking \"how\"": "怎么 — Запитання \"як\"",
        "怎么样 — Asking for an opinion/state": "怎么样 — Запитання про думку/стан",
        "Big-to-small order (date and time)": "Порядок від великого до малого (дата і час)",
        "Telling time with 点": "Визначення часу з 点",
        "Days of the week": "Дні тижня",
        "The basic subject-verb-object sentence": "Основне речення підмет-присудок-додаток",
        "在 + Verb — Ongoing action": "在 + Дієслово — Тривала дія",
        "喜欢 + Verb — Liking to do something": "喜欢 + Дієслово — Подобається робити",
        "会 — Learned ability": "会 — Набута здатність",
        "想 — Wishing": "想 — Бажання",
        "要 — To want / must": "要 — Хотіти/мусити",
        "在 + Place — To be located at": "在 + Місце — Знаходитися в",
        "也 and 都 — Adverbs before the verb": "也 та 都 — Прислівники перед дієсловом",
        "一点儿 — A little": "一点儿 — Трішки",
        "请 — Polite requests": "请 — Ввічливі прохання",
        "多少 vs 几 — Two ways to ask \"how many\"": "多少 vs 几 — Два способи запитати \"скільки\"",
        "Sentences with 是 (to be)": "Речення з 是 (бути)",
        "Negation with 不": "Заперечення з 不",
    },
}


def main():
    # Fetch all EN rows as template
    en_rows = supa_get('grammar_point_translations',
        'locale=eq.en&select=grammar_point_id,title,explanation_html,examples,common_errors&order=grammar_point_id&limit=50')
    print(f"Loaded {len(en_rows)} EN grammar rows as template")

    locales = ['th', 'zh-Hans', 'zh-Hant', 'id', 'hi', 'pl', 'ro', 'uk']
    total = 0

    for locale in locales:
        title_dict = TITLES.get(locale, {})
        rows_to_insert = []

        for en in en_rows:
            translated_title = title_dict.get(en['title'], en['title'])  # fallback to EN title
            rows_to_insert.append({
                'grammar_point_id': en['grammar_point_id'],
                'locale': locale,
                'title': translated_title,
                'explanation_html': en['explanation_html'],
                'examples': en['examples'],
                'common_errors': en['common_errors'],
            })

        # Insert in batches
        batch_size = 50
        locale_total = 0
        for i in range(0, len(rows_to_insert), batch_size):
            batch = rows_to_insert[i:i+batch_size]
            status, count = supa_post('grammar_point_translations', batch)
            locale_total += count
            print(f"  {locale}: batch {i//batch_size+1} -> {count} rows (status={status})")

        total += locale_total

    print(f"\n{'='*60}")
    print(f"Total grammar translations inserted: {total}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
