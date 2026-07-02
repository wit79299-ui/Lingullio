#!/usr/bin/env python3
"""
Import ~238 HSK-1 characters into Supabase characters + character_translations tables.
Also fixes pinyin on the 10 existing seed characters.
"""
import requests, json, re, sys, uuid

# ─── Supabase config ────────────────────────────────────────────────
with open('/home/user/webapp/.env.local') as f:
    content = f.read()
    SUPABASE_URL = re.search(r'NEXT_PUBLIC_SUPABASE_URL=(.*)', content).group(1).strip()
    SERVICE_KEY = re.search(r'SUPABASE_SERVICE_ROLE_KEY=(.*)', content).group(1).strip()

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}
HEADERS_REPR = {**HEADERS, 'Prefer': 'return=representation'}

# ─── HSK-1 Character Data ──────────────────────────────────────────
# Format: (character, pinyin, radical, stroke_count, meaning_fr, meaning_en, mnemonic_fr, mnemonic_en)
HSK1_CHARS = [
    ("一", "yī", "一", 1, "un, une", "one", "Un trait horizontal simple = le chiffre un", "A single horizontal stroke = the number one"),
    ("七", "qī", "一", 2, "sept", "seven", "Le chiffre sept ressemble à un crochet retourné", "Seven looks like an inverted hook"),
    ("三", "sān", "一", 3, "trois", "three", "Trois traits horizontaux empilés = trois", "Three horizontal strokes stacked = three"),
    ("上", "shàng", "一", 3, "dessus, monter", "up, above", "Une ligne verticale qui monte au-dessus de la base", "A vertical line rising above the base"),
    ("下", "xià", "一", 3, "dessous, descendre", "down, below", "Une ligne verticale qui descend sous la base", "A vertical line going down below the base"),
    ("不", "bù", "一", 4, "ne pas, non", "not, no", "Un oiseau (丕) qui ne peut pas s'envoler", "A bird that cannot fly away"),
    ("东", "dōng", "一", 5, "est", "east", "Le soleil (日) qui se lève derrière un arbre (木) simplifié", "The sun rising behind a simplified tree"),
    ("两", "liǎng", "一", 7, "deux (quantité)", "two (quantity)", "Deux personnes (人人) sous un toit (一冂)", "Two people under a roof"),
    ("个", "gè", "人", 3, "classificateur général", "general measure word", "Une personne (人) avec un bâton vertical", "A person with a vertical stick"),
    ("么", "me", "丿", 3, "particule interrogative", "question particle", "Un petit crochet interrogatif", "A small questioning hook"),
    ("九", "jiǔ", "丿", 2, "neuf", "nine", "Le chiffre neuf ressemble à un bras plié", "Nine looks like a bent arm"),
    ("也", "yě", "乚", 3, "aussi", "also", "Un scorpion stylisé — aussi dangereux qu'utile", "A stylized scorpion — also dangerous as useful"),
    ("习", "xí", "乙", 3, "étudier, pratiquer", "study, practice", "Des ailes (羽 simplifié) qui s'exercent à voler", "Simplified wings practicing to fly"),
    ("书", "shū", "乙", 4, "livre", "book", "Un pinceau (聿 simplifié) pour écrire des livres", "A simplified brush for writing books"),
    ("买", "mǎi", "乙", 6, "acheter", "to buy", "Une tête (头) qui choisit quoi acheter", "A head choosing what to buy"),
    ("了", "le", "乙", 2, "particule accomplie", "completed action particle", "Un crochet simple = action terminée", "A simple hook = action completed"),
    ("事", "shì", "亅", 8, "affaire, chose", "matter, thing", "Un stylo (聿) sur une bouche (口) = affaires à discuter", "A pen over a mouth = matters to discuss"),
    ("二", "èr", "二", 2, "deux", "two", "Deux traits horizontaux = le chiffre deux", "Two horizontal strokes = the number two"),
    ("五", "wǔ", "二", 4, "cinq", "five", "Cinq traits croisés entre deux lignes horizontales", "Five crossing strokes between two horizontal lines"),
    ("些", "xiē", "二", 8, "quelques, certains", "some, a few", "Ce (此) sur deux (二) = quelques-uns de ceux-ci", "This over two = some of these"),
    ("亮", "liàng", "亠", 9, "lumineux, brillant", "bright, light", "Une grande lumière (高+几) qui brille", "A great light shining bright"),
    ("什", "shén", "亻", 4, "quoi (dans 什么)", "what (in 什么)", "Une personne (亻) avec dix (十) questions", "A person with ten questions"),
    ("今", "jīn", "人", 4, "aujourd'hui, actuel", "today, now", "Une personne (人) sous un toit = maintenant, ici", "A person under a roof = now, here"),
    ("他", "tā", "亻", 5, "il, lui", "he, him", "Une personne (亻) et aussi (也) quelqu'un d'autre", "A person and also someone else"),
    ("以", "yǐ", "人", 5, "avec, par, depuis", "with, by, since", "Une personne et un outil = par ce moyen", "A person and a tool = by this means"),
    ("们", "men", "亻", 5, "suffixe pluriel", "plural suffix", "Une personne (亻) à la porte (门) = les gens", "A person at the gate = the people"),
    ("件", "jiàn", "亻", 6, "pièce, article", "piece, item", "Une personne (亻) avec un bœuf (牛) = un article de travail", "A person with an ox = a work item"),
    ("休", "xiū", "亻", 6, "se reposer", "to rest", "Une personne (亻) sous un arbre (木) = repos", "A person under a tree = rest"),
    ("会", "huì", "人", 6, "pouvoir, réunion", "can, meeting", "Des gens (人) rassemblés sous un toit (云) = réunion", "People gathered under a cloud = meeting"),
    ("住", "zhù", "亻", 7, "habiter, vivre", "to live, reside", "Une personne (亻) qui reste comme un maître (主)", "A person staying like a master"),
    ("作", "zuò", "亻", 7, "faire, travailler", "to do, to work", "Une personne (亻) qui commence (乍) à travailler", "A person who starts to work"),
    ("便", "biàn", "亻", 9, "pratique, commode", "convenient", "Une personne (亻) qui change (更) facilement", "A person who changes easily"),
    ("候", "hòu", "亻", 10, "attendre, moment", "to wait, moment", "Une personne (亻) qui attend la flèche (矢) du temps", "A person waiting for time's arrow"),
    ("做", "zuò", "亻", 11, "faire, fabriquer", "to do, make", "Une personne (亻) qui fait une chose ancienne (故)", "A person doing something established"),
    ("儿", "ér", "儿", 2, "enfant, fils", "child, son", "Deux petites jambes d'enfant qui marchent", "Two small child legs walking"),
    ("元", "yuán", "儿", 4, "yuan, origine", "yuan, origin", "Deux (二) jambes (儿) = base originelle", "Two legs = original base"),
    ("先", "xiān", "儿", 6, "d'abord, avant", "first, before", "Un bœuf (牛) devant des jambes (儿) = en premier", "An ox before legs = first"),
    ("八", "bā", "八", 2, "huit", "eight", "Deux traits qui s'écartent comme le chiffre 8 divisé", "Two strokes splitting like number 8 divided"),
    ("公", "gōng", "八", 4, "public, juste", "public, fair", "Le privé (厶) partagé (八) = public", "Private shared = public"),
    ("六", "liù", "八", 4, "six", "six", "Un toit (亠) avec huit (八) en dessous", "A top with eight below"),
    ("关", "guān", "八", 6, "fermer, relation", "close, relationship", "Le ciel (天) fermé par huit (八) = relation", "Heaven closed by eight = relationship"),
    ("兴", "xìng", "八", 6, "intérêt, excitation", "interest, excitement", "Soulever (举 simplifié) avec enthousiasme", "Lifting with enthusiasm"),
    ("再", "zài", "冂", 6, "encore, de nouveau", "again", "Un cadre (冂) avec un trait central = répétition", "A frame with center stroke = repetition"),
    ("写", "xiě", "冖", 5, "écrire", "to write", "Un toit (冖) qui abrite l'écriture", "A roof sheltering writing"),
    ("冷", "lěng", "冫", 7, "froid", "cold", "De la glace (冫) et un ordre (令) = froid glacial", "Ice and a command = freezing cold"),
    ("几", "jǐ", "几", 2, "combien, quelques", "how many, several", "Une petite table = compter sur les doigts", "A small table = counting on fingers"),
    ("出", "chū", "凵", 5, "sortir", "to go out", "Des montagnes (山山) qui émergent d'un récipient", "Mountains emerging from a container"),
    ("分", "fēn", "刀", 4, "diviser, minute", "divide, minute", "Huit (八) coupé par un couteau (刀) = divisé", "Eight cut by a knife = divided"),
    ("到", "dào", "刂", 8, "arriver à", "to arrive", "Atteindre (至) avec un couteau (刂) = arriver", "Reaching with a blade = arriving"),
    ("前", "qián", "刂", 9, "devant, avant", "in front, before", "Un couteau (刂) devant la lune (月) = en avant", "A blade before the moon = forward"),
    ("包", "bāo", "勹", 5, "paquet, emballer", "package, wrap", "Un bras (勹) qui enveloppe un bébé (巳)", "An arm wrapping a baby"),
    ("医", "yī", "匚", 7, "médecin, médecine", "doctor, medicine", "Une boîte (匚) contenant des flèches (矢) = médecine ancienne", "A box containing arrows = ancient medicine"),
    ("十", "shí", "十", 2, "dix", "ten", "Une croix = dix doigts croisés", "A cross = ten crossed fingers"),
    ("千", "qiān", "十", 3, "mille", "thousand", "Dix (十) multiplié par un trait (丿) = mille", "Ten multiplied by a stroke = thousand"),
    ("午", "wǔ", "十", 4, "midi", "noon", "Le soleil au zénith sur dix (十) = midi", "The sun at zenith over ten = noon"),
    ("半", "bàn", "十", 5, "moitié, demi", "half", "Un bœuf (牛) coupé par deux (二) = moitié", "An ox cut by two = half"),
    ("卖", "mài", "十", 8, "vendre", "to sell", "Acheter (买) avec dix (十) au-dessus = vendre", "Buy with ten above = to sell"),
    ("去", "qù", "厶", 5, "aller, partir", "to go", "Un sol (土) et une bouche privée (厶) = partir", "Ground and a private mouth = leaving"),
    ("友", "yǒu", "又", 4, "ami", "friend", "Deux (二) mains (又) ensemble = amitié", "Two hands together = friendship"),
    ("口", "kǒu", "口", 3, "bouche", "mouth", "Un carré ouvert = une bouche", "An open square = a mouth"),
    ("只", "zhǐ", "口", 5, "seulement", "only", "Une bouche (口) avec huit (八) = juste cela", "A mouth with eight = just that"),
    ("叫", "jiào", "口", 5, "appeler, crier", "to call", "Une bouche (口) qui fait un signe tordu (丩)", "A mouth making a twisted sign"),
    ("可", "kě", "口", 5, "pouvoir, possible", "can, possible", "Une bouche (口) qui dit oui avec un crochet", "A mouth saying yes with a hook"),
    ("号", "hào", "口", 5, "numéro", "number", "Une bouche (口) qui annonce un numéro", "A mouth announcing a number"),
    ("司", "sī", "口", 5, "administrer", "manage, company", "Une bouche (口) qui dirige horizontalement", "A mouth directing horizontally"),
    ("吃", "chī", "口", 6, "manger", "to eat", "Une bouche (口) qui mendie (乞) de la nourriture", "A mouth begging for food"),
    ("同", "tóng", "口", 6, "même, identique", "same", "Une bouche (口) dans un cadre (冂) = en commun", "A mouth in a frame = in common"),
    ("名", "míng", "口", 6, "nom", "name", "Le soir (夕) une bouche (口) appelle votre nom", "In the evening a mouth calls your name"),
    ("后", "hòu", "口", 6, "après, derrière", "after, behind", "Une bouche (口) derrière = ce qui vient après", "A mouth behind = what comes after"),
    ("吗", "ma", "口", 6, "particule interrogative", "question particle", "Une bouche (口) et un cheval (马) = question galopante", "A mouth and a horse = galloping question"),
    ("吧", "ba", "口", 7, "particule suggestive", "suggestion particle", "Une bouche (口) et un serpent (巴) = suggestion douce", "A mouth and a snake = gentle suggestion"),
    ("听", "tīng", "口", 7, "écouter", "to listen", "Une bouche (口) et une livre (斤) = écouter les mots pesés", "A mouth and a pound = listening to weighed words"),
    ("呢", "ne", "口", 8, "particule (et toi ?)", "particle (what about?)", "Une bouche (口) sur de la terre (尼) = qu'en est-il ?", "A mouth on earth = what about?"),
    ("和", "hé", "口", 8, "et, avec, harmonie", "and, with, harmony", "Des céréales (禾) et une bouche (口) = harmonie par la nourriture", "Grain and a mouth = harmony through food"),
    ("哥", "gē", "口", 10, "frère aîné", "older brother", "Deux bouches (口口) empilées qui parlent = grand frère", "Two stacked mouths talking = big brother"),
    ("哪", "nǎ", "口", 9, "où, quel", "where, which", "Une bouche (口) dans une ville (那) = où ?", "A mouth in a city = where?"),
    ("唱", "chàng", "口", 11, "chanter", "to sing", "Une bouche (口) avec deux soleils (昌) = chanter joyeusement", "A mouth with two suns = singing joyfully"),
    ("商", "shāng", "口", 11, "commerce", "commerce", "Des bouches (口) sous un toit = négocier", "Mouths under a roof = negotiating"),
    ("喂", "wèi", "口", 12, "allô, nourrir", "hello, to feed", "Une bouche (口) qui nourrit l'estomac (胃)", "A mouth feeding the stomach"),
    ("喜", "xǐ", "口", 12, "joie, aimer", "joy, happy", "Des tambours (壴) et une bouche (口) = joie exprimée", "Drums and a mouth = expressed joy"),
    ("喝", "hē", "口", 12, "boire", "to drink", "Une bouche (口) qui boit avec un cri (曷)", "A mouth drinking with a cry"),
    ("四", "sì", "囗", 5, "quatre", "four", "Quatre traits dans un enclos (囗)", "Four strokes inside an enclosure"),
    ("回", "huí", "囗", 6, "retourner, revenir", "to return", "Une bouche (口) dans un enclos (囗) = revenir au point de départ", "A mouth inside an enclosure = returning to start"),
    ("在", "zài", "土", 6, "être à, dans", "at, in", "La terre (土) existe (才) = être présent ici", "Earth exists = being present here"),
    ("坐", "zuò", "土", 7, "s'asseoir", "to sit", "Deux personnes (人人) sur la terre (土) = assises", "Two people on the ground = sitting"),
    ("块", "kuài", "土", 7, "morceau, yuan", "piece, lump", "De la terre (土) décidée (夬) = un morceau", "Decided earth = a piece"),
    ("士", "shì", "士", 3, "lettré, soldat", "scholar, soldier", "Un grand (大) trait au-dessus d'un petit = savant", "A big stroke above a small one = scholar"),
    ("外", "wài", "夕", 5, "extérieur", "outside", "Le soir (夕) et la divination (卜) = dehors la nuit", "Evening and divination = outside at night"),
    ("多", "duō", "夕", 6, "beaucoup", "many, much", "Deux soirs (夕夕) empilés = tant de nuits, tant d'histoires", "Two evenings stacked = so many nights, so many stories"),
    ("天", "tiān", "大", 4, "ciel, jour", "sky, day", "Un grand (大) trait au-dessus (一) = le ciel", "A great stroke above = the sky"),
    ("太", "tài", "大", 4, "trop, très", "too, very", "Grand (大) avec un point en plus = trop grand", "Big with an extra dot = too much"),
    ("女", "nǚ", "女", 3, "femme", "woman", "Une personne agenouillée gracieusement", "A person kneeling gracefully"),
    ("奶", "nǎi", "女", 5, "grand-mère, lait", "grandmother, milk", "Une femme (女) qui nourrit (乃) = grand-mère", "A woman who nurtures = grandmother"),
    ("她", "tā", "女", 6, "elle", "she, her", "Une femme (女) et aussi (也) = elle", "A woman and also = she"),
    ("妈", "mā", "女", 6, "maman", "mother", "Une femme (女) et un cheval (马) = maman (force+douceur)", "A woman and a horse = mom (strength+tenderness)"),
    ("妹", "mèi", "女", 8, "sœur cadette", "younger sister", "Une femme (女) pas encore (未) adulte = petite sœur", "A woman not yet grown = younger sister"),
    ("姐", "jiě", "女", 8, "sœur aînée", "older sister", "Une femme (女) avec une montée (且) = grande sœur", "A woman with a rise = older sister"),
    ("子", "zǐ", "子", 3, "enfant, fils", "child, son", "Un bébé emmailloté avec les bras ouverts", "A swaddled baby with open arms"),
    ("字", "zì", "宀", 6, "caractère, lettre", "character, word", "Un enfant (子) sous un toit (宀) = apprendre ses lettres", "A child under a roof = learning letters"),
    ("孩", "hái", "子", 9, "enfant", "child", "Un enfant (子) et un squelette (亥) = petit qui grandit", "A child and growth = little one growing"),
    ("它", "tā", "宀", 5, "il/elle (chose)", "it", "Un toit (宀) couvrant un serpent (匕) = la chose", "A roof covering something = it"),
    ("宜", "yí", "宀", 8, "convenable, bon marché", "suitable, cheap", "Sous un toit (宀) des offrandes (且) = convenable", "Under a roof with offerings = suitable"),
    ("客", "kè", "宀", 9, "invité, client", "guest, customer", "Chaque (各) personne sous un toit (宀) = invité", "Each person under a roof = guest"),
    ("家", "jiā", "宀", 10, "famille, maison", "family, home", "Un cochon (豕) sous un toit (宀) = foyer prospère", "A pig under a roof = prosperous home"),
    ("对", "duì", "寸", 5, "correct, envers", "correct, toward", "Un pouce (寸) et une mesure (又) = exact", "An inch and a measure = exact"),
    ("小", "xiǎo", "小", 3, "petit", "small", "Trois petits traits comme des grains", "Three small strokes like tiny grains"),
    ("少", "shǎo", "小", 4, "peu, jeune", "few, young", "Petit (小) avec un trait en moins = encore moins", "Small with one less stroke = even fewer"),
    ("岁", "suì", "山", 6, "an, âge", "year, age", "Une montagne (山) avec un arrêt (夕) = une année qui passe", "A mountain with a pause = a passing year"),
    ("工", "gōng", "工", 3, "travail, ouvrier", "work, worker", "Un outil entre deux plans = travail", "A tool between two planes = work"),
    ("市", "shì", "巾", 5, "marché, ville", "market, city", "Un tissu (巾) avec un point = lieu de commerce", "A cloth with a dot = marketplace"),
    ("师", "shī", "巾", 6, "professeur, maître", "teacher, master", "Un tissu (巾) et une colline = maître de l'horizon", "A cloth and a hill = master of the horizon"),
    ("常", "cháng", "巾", 11, "souvent, habituel", "often, usual", "Un tissu (巾) et un ministre (尚) = habit habituel", "A cloth and a dignitary = usual habit"),
    ("年", "nián", "干", 6, "année", "year", "Un homme qui porte la récolte = cycle annuel", "A man carrying the harvest = annual cycle"),
    ("床", "chuáng", "广", 7, "lit", "bed", "Un bâtiment (广) avec du bois (木) = un lit", "A building with wood = a bed"),
    ("店", "diàn", "广", 8, "magasin", "shop, store", "Un bâtiment (广) avec une fortune (占) = boutique", "A building with fortune = shop"),
    ("开", "kāi", "廾", 4, "ouvrir, commencer", "open, start", "Deux mains (廾) qui ouvrent une porte", "Two hands opening a door"),
    ("弟", "dì", "弓", 7, "petit frère", "younger brother", "Un arc (弓) avec des flèches (丷) = le cadet qui s'entraîne", "A bow with arrows = the younger one practicing"),
    ("影", "yǐng", "彡", 15, "ombre, film", "shadow, movie", "Lumière du jour (景) et des rayons (彡) = ombre", "Daylight and rays = shadow"),
    ("很", "hěn", "彳", 9, "très", "very", "Un pas (彳) et un regard (艮) = très déterminé", "A step and a glance = very determined"),
    ("得", "de", "彳", 11, "obtenir, devoir", "get, must", "Un pas (彳), un soleil (日) et une main (寸) = obtenir", "A step, a sun and an inch = to obtain"),
    ("忙", "máng", "忄", 6, "occupé", "busy", "Un cœur (忄) qui meurt (亡) = trop occupé", "A heart dying = too busy"),
    ("怎", "zěn", "心", 9, "comment", "how", "Soudain (乍) le cœur (心) se demande comment", "Suddenly the heart wonders how"),
    ("息", "xī", "心", 10, "souffle, repos", "breath, rest", "Le nez (自) et le cœur (心) = respirer et se reposer", "The nose and heart = breathe and rest"),
    ("您", "nín", "心", 11, "vous (poli)", "you (formal)", "Toi (你) dans mon cœur (心) = forme respectueuse", "You in my heart = respectful form"),
    ("想", "xiǎng", "心", 13, "penser, vouloir", "think, want", "Un regard (相) dans le cœur (心) = réflexion", "A look in the heart = reflection"),
    ("房", "fáng", "户", 8, "chambre, maison", "room, house", "Une porte (户) et un carré (方) = pièce carrée", "A door and a square = square room"),
    ("手", "shǒu", "手", 4, "main", "hand", "Les cinq doigts d'une main ouverte", "Five fingers of an open hand"),
    ("打", "dǎ", "扌", 5, "frapper, jouer", "hit, play", "Une main (扌) qui frappe un clou (丁)", "A hand hitting a nail"),
    ("找", "zhǎo", "扌", 7, "chercher", "to look for", "Une main (扌) et une lance (戈) = chercher arme en main", "A hand and a spear = searching with weapon"),
    ("文", "wén", "文", 4, "texte, culture", "text, culture", "Des lignes croisées = écriture, civilisation", "Crossed lines = writing, civilization"),
    ("新", "xīn", "斤", 13, "nouveau", "new", "Du bois (木) coupé à la hache (斤) avec précision (亲) = renouveau", "Wood cut with precision = renewal"),
    ("日", "rì", "日", 4, "jour, soleil", "day, sun", "Un cadre lumineux avec un trait central = le soleil", "A bright frame with a center line = the sun"),
    ("早", "zǎo", "日", 6, "tôt, matin", "early, morning", "Le soleil (日) au-dessus de dix (十) = lever du soleil", "The sun above ten = sunrise"),
    ("时", "shí", "日", 7, "temps, heure", "time, hour", "Le soleil (日) et un temple (寺) = le temps qui passe", "The sun and a temple = passing time"),
    ("明", "míng", "日", 8, "clair, demain", "bright, tomorrow", "Le soleil (日) et la lune (月) = lumineux", "Sun and moon = bright"),
    ("星", "xīng", "日", 9, "étoile", "star", "La vie (生) sous le soleil (日) = étoile née", "Life under the sun = born star"),
    ("昨", "zuó", "日", 9, "hier", "yesterday", "Le soleil (日) d'avant (乍) = hier", "The sun before = yesterday"),
    ("晚", "wǎn", "日", 11, "soir, tard", "evening, late", "Le soleil (日) qui disparaît (免) = le soir vient", "The sun disappearing = evening comes"),
    ("月", "yuè", "月", 4, "lune, mois", "moon, month", "Un croissant de lune avec des traits", "A crescent moon with strokes"),
    ("有", "yǒu", "月", 6, "avoir", "to have", "Une main (又) sur la lune (月) = posséder", "A hand on the moon = to possess"),
    ("朋", "péng", "月", 8, "ami", "friend", "Deux lunes (月月) côte à côte = amis", "Two moons side by side = friends"),
    ("服", "fú", "月", 8, "vêtement, servir", "clothing, serve", "Le corps (月) et se soumettre (卩又) = vêtir/servir", "The body and submission = dress/serve"),
    ("期", "qī", "月", 12, "période, date", "period, date", "Deux mois (月) et un début (其) = une période", "Two months and a start = a period"),
    ("本", "běn", "木", 5, "origine, livre", "origin, book", "Un arbre (木) avec une racine (一) en bas = fondement", "A tree with a root below = foundation"),
    ("机", "jī", "木", 6, "machine, avion", "machine, airplane", "Du bois (木) et un crochet (几) = mécanisme", "Wood and a hook = mechanism"),
    ("条", "tiáo", "木", 7, "bande, classificateur", "strip, measure word", "Un arbre (木) et un fil d'attaque (攵) = longue bande", "A tree and a strike = long strip"),
    ("来", "lái", "木", 7, "venir", "to come", "Un arbre (木) avec des personnes = les gens qui viennent", "A tree with people = people coming"),
    ("杯", "bēi", "木", 8, "tasse, verre", "cup, glass", "Du bois (木) et non (不) = contenant qui ne fuit pas", "Wood and not = container that doesn't leak"),
    ("果", "guǒ", "木", 8, "fruit, résultat", "fruit, result", "Un champ (田) sur un arbre (木) = fruit", "A field on a tree = fruit"),
    ("校", "xiào", "木", 10, "école", "school", "Du bois (木) et un croisement (交) = école (lieu d'échange)", "Wood and crossing = school (place of exchange)"),
    ("样", "yàng", "木", 10, "apparence, type", "appearance, type", "Du bois (木) et un mouton (羊) = modèle", "Wood and sheep = model"),
    ("桌", "zhuō", "木", 10, "table, bureau", "table, desk", "Le soleil (日) sur du bois (木) avec un capuchon = table", "Sun on wood with a cap = table"),
    ("椅", "yǐ", "木", 12, "chaise", "chair", "Du bois (木) et étrange (奇) = un siège spécial", "Wood and strange = a special seat"),
    ("欢", "huān", "欠", 6, "content, joyeux", "happy, joyful", "Un bâillement (欠) de plaisir = joie", "A yawn of pleasure = joy"),
    ("歌", "gē", "欠", 14, "chanson", "song", "Deux frères (哥) qui bâillent (欠) = chanson", "Two brothers yawning = song"),
    ("正", "zhèng", "止", 5, "juste, correct", "right, correct", "Un pied (止) sur une ligne (一) = droit et correct", "A foot on a line = straight and correct"),
    ("气", "qì", "气", 4, "air, énergie", "air, energy", "Des vapeurs qui s'élèvent = qi, énergie vitale", "Vapors rising = qi, vital energy"),
    ("水", "shuǐ", "水", 4, "eau", "water", "Un courant central avec des éclaboussures", "A central flow with splashes"),
    ("汉", "hàn", "氵", 5, "chinois, Han", "Chinese, Han", "L'eau (氵) et une personne (又) = peuple de la rivière Han", "Water and a person = people of the Han river"),
    ("没", "méi", "氵", 7, "ne pas avoir", "not have", "L'eau (氵) qui submerge (殳) = disparu, ne pas avoir", "Water submerging = gone, not having"),
    ("漂", "piào", "氵", 14, "joli, flotter", "pretty, float", "L'eau (氵) et un billet (票) = flotter joliment", "Water and a ticket = floating prettily"),
    ("火", "huǒ", "火", 4, "feu", "fire", "Des flammes qui dansent sur un foyer", "Flames dancing on a hearth"),
    ("点", "diǎn", "灬", 9, "point, heure", "point, o'clock", "Un devin (占) et du feu (灬) = point lumineux", "A fortune-teller and fire = luminous point"),
    ("热", "rè", "灬", 10, "chaud", "hot", "Tenir (执) du feu (灬) en main = brûlant", "Holding fire in hand = burning hot"),
    ("爱", "ài", "爫", 10, "amour, aimer", "love", "Un cœur (心) protégé par des griffes (爫) et un ami (友) = amour", "A heart protected by claws and a friend = love"),
    ("爸", "bà", "父", 8, "papa", "father, dad", "Le père (父) qui serpente (巴) = papa", "Father who meanders = dad"),
    ("牛", "niú", "牛", 4, "bœuf, vache", "cow, ox", "Un bœuf vu de face avec ses cornes", "An ox seen from the front with horns"),
    ("狗", "gǒu", "犭", 8, "chien", "dog", "Un animal (犭) avec une phrase (句) = chien fidèle", "An animal with a phrase = faithful dog"),
    ("猫", "māo", "犭", 11, "chat", "cat", "Un animal (犭) des champs (苗) = chat qui chasse", "A field animal = hunting cat"),
    ("玩", "wán", "王", 8, "jouer", "to play", "Un roi (王) et l'origine (元) = jeu royal", "A king and origin = royal play"),
    ("现", "xiàn", "王", 8, "maintenant, actuel", "now, present", "Le jade (王) visible (见) = apparaître maintenant", "Jade visible = appearing now"),
    ("班", "bān", "王", 10, "classe, groupe", "class, group", "Deux jades (王王) séparés par un couteau (刂) = répartir en classes", "Two jades separated by a blade = dividing into classes"),
    ("电", "diàn", "田", 5, "électricité", "electricity", "Un champ (田) traversé par un éclair (乚)", "A field struck by lightning"),
    ("男", "nán", "田", 7, "homme", "man, male", "La force (力) dans le champ (田) = homme qui travaille", "Strength in the field = working man"),
    ("病", "bìng", "疒", 10, "maladie", "illness, sick", "Un lit de malade (疒) et un troisième (丙) symptôme = malade", "A sickbed and symptoms = sick"),
    ("白", "bái", "白", 5, "blanc", "white", "Un rayon de soleil pur = blanc", "A pure ray of sunlight = white"),
    ("百", "bǎi", "白", 6, "cent", "hundred", "Un (一) blanc (白) = cent pureté", "One white = hundred purities"),
    ("的", "de", "白", 8, "de (possessif)", "possessive particle", "Le blanc (白) et une cuillère (勺) = la clarté de la possession", "White and a spoon = clarity of possession"),
    ("看", "kàn", "目", 9, "regarder, voir", "look, see", "Une main (手) sur les yeux (目) = regarder au loin", "A hand over eyes = looking far"),
    ("真", "zhēn", "目", 10, "vrai, vraiment", "true, really", "Les yeux (目) sur une table (匕) = vérité vérifiable", "Eyes on a table = verifiable truth"),
    ("睡", "shuì", "目", 13, "dormir", "to sleep", "Les yeux (目) qui pendent (垂) = s'endormir", "Eyes drooping = falling asleep"),
    ("知", "zhī", "矢", 8, "savoir", "to know", "Une flèche (矢) et une bouche (口) = parler avec précision = savoir", "An arrow and a mouth = speaking with precision = knowing"),
    ("租", "zū", "禾", 10, "louer", "to rent", "Des céréales (禾) et un début (且) = louer des terres", "Grain and a start = renting land"),
    ("穿", "chuān", "穴", 9, "porter (vêtement)", "to wear", "Un trou (穴) et des dents (牙) = enfiler un vêtement", "A hole and teeth = putting on clothes"),
    ("第", "dì", "竹", 11, "ordinal (1er, 2e)", "ordinal prefix", "Du bambou (竹) et un frère (弟) = classement ordonné", "Bamboo and brother = ordered ranking"),
    ("米", "mǐ", "米", 6, "riz", "rice", "Des grains sur une tige = riz", "Grains on a stalk = rice"),
    ("系", "xì", "糸", 7, "système, lien", "system, link", "Des fils de soie (糸) liés ensemble = système", "Silk threads tied together = system"),
    ("给", "gěi", "糸", 9, "donner", "to give", "Des fils (纟) et un rassemblement (合) = tisser pour donner", "Threads and gathering = weaving to give"),
    ("老", "lǎo", "老", 6, "vieux, ancien", "old", "Un homme avec une canne et des cheveux longs = vieux sage", "A man with a cane and long hair = old sage"),
    ("能", "néng", "月", 10, "pouvoir, capacité", "can, ability", "Un ours (能) fort = avoir la capacité", "A strong bear = having ability"),
    ("脑", "nǎo", "月", 10, "cerveau", "brain", "Le corps (月) et un crâne (凶巛) = cerveau", "Body and a skull = brain"),
    ("苹", "píng", "艹", 8, "pomme (dans 苹果)", "apple (in 苹果)", "De l'herbe (艹) et la paix (平) = pomme paisible", "Grass and peace = peaceful apple"),
    ("茶", "chá", "艹", 9, "thé", "tea", "De l'herbe (艹), un homme (人) et un arbre (木) = cueillir le thé", "Grass, a person, and a tree = picking tea"),
    ("菜", "cài", "艹", 11, "légume, plat", "vegetable, dish", "De l'herbe (艹) qu'on cueille (采) = légumes", "Grass that is picked = vegetables"),
    ("蛋", "dàn", "虫", 11, "œuf", "egg", "Un insecte (虫) et une balle (疋) = œuf pondu", "An insect and a ball = laid egg"),
    ("衣", "yī", "衣", 6, "vêtement", "clothing", "Un corps habillé avec des manches", "A dressed body with sleeves"),
    ("西", "xī", "西", 6, "ouest", "west", "Un oiseau (鸟 simplifié) qui se pose au couchant", "A bird settling at sunset"),
    ("要", "yào", "西", 9, "vouloir, falloir", "want, need", "L'ouest (西) et une femme (女) = désirer", "The west and a woman = desire"),
    ("见", "jiàn", "见", 4, "voir, rencontrer", "see, meet", "Un œil (目) sur des jambes (儿) = voir en marchant", "An eye on legs = seeing while walking"),
    ("视", "shì", "见", 8, "regarder, vision", "watch, vision", "Un autel (礻) et voir (见) = contempler", "An altar and seeing = contemplating"),
    ("觉", "jué", "见", 9, "sentir, sensation", "feel, sense", "Apprendre (学) à voir (见) = ressentir", "Learning to see = feeling"),
    ("认", "rèn", "讠", 4, "reconnaître", "recognize", "Des mots (讠) et un homme (人) = reconnaître quelqu'un", "Words and a person = recognizing someone"),
    ("识", "shí", "讠", 7, "connaître", "know, recognize", "Des mots (讠) et un signe (只) = savoir identifier", "Words and a sign = knowing to identify"),
    ("话", "huà", "讠", 8, "parole, langue", "speech, language", "Des mots (讠) et une langue (舌) = paroles", "Words and a tongue = speech"),
    ("语", "yǔ", "讠", 9, "langue, langage", "language", "Des mots (讠) et moi (吾) = ma langue", "Words and I = my language"),
    ("说", "shuō", "讠", 9, "dire, parler", "say, speak", "Des mots (讠) et la joie (兑) = dire avec plaisir", "Words and joy = speaking with pleasure"),
    ("请", "qǐng", "讠", 10, "s'il vous plaît", "please, invite", "Des mots (讠) et le bleu (青) = demander poliment", "Words and blue = asking politely"),
    ("读", "dú", "讠", 10, "lire", "to read", "Des mots (讠) et vendre (卖) = acheter des mots = lire", "Words and selling = buying words = reading"),
    ("课", "kè", "讠", 10, "cours, leçon", "class, lesson", "Des mots (讠) et un fruit (果) = récolter le savoir", "Words and fruit = harvesting knowledge"),
    ("谁", "shéi", "讠", 10, "qui", "who", "Des mots (讠) et un oiseau (隹) = qui parle ?", "Words and a bird = who speaks?"),
    ("谢", "xiè", "讠", 12, "merci", "thank you", "Des mots (讠), un corps (身) et une lance (寸) = gratitude du corps et de l'esprit", "Words, body and lance = gratitude of body and mind"),
    ("贵", "guì", "贝", 9, "cher, précieux", "expensive, precious", "Un coquillage (贝) sous un capuchon (中) = trésor précieux", "A shell under a cap = precious treasure"),
    ("起", "qǐ", "走", 10, "se lever, commencer", "rise, start", "Courir (走) et soi-même (己) = se lever seul", "Running and self = rising alone"),
    ("超", "chāo", "走", 12, "dépasser, super", "exceed, super", "Courir (走) et appeler (召) = dépasser en courant", "Running and calling = exceeding while running"),
    ("车", "chē", "车", 4, "voiture, véhicule", "car, vehicle", "Un axe et des roues vus de dessus", "An axle and wheels seen from above"),
    ("边", "biān", "辶", 5, "côté, bord", "side, edge", "Marcher (辶) vers la force (力) = aller au bord", "Walking toward strength = going to the edge"),
    ("还", "hái", "辶", 7, "encore, aussi", "still, also", "Marcher (辶) et ne pas (不) s'arrêter = encore", "Walking and not stopping = still"),
    ("这", "zhè", "辶", 7, "ce, ceci", "this", "Marcher (辶) et un texte (文) = désigner ceci", "Walking and text = pointing to this"),
    ("道", "dào", "辶", 12, "chemin, voie", "road, way", "Marcher (辶) avec la tête (首) haute = la voie", "Walking with head high = the way"),
    ("那", "nà", "阝", 6, "ce, celui-là", "that", "Un village (阝) et deux (二) = celui-là, là-bas", "A village and two = that one, over there"),
    ("都", "dōu", "阝", 10, "tout, tous", "all, both", "Un village (阝) et un chef (者) = toute la ville", "A village and a leader = the whole city"),
    ("里", "lǐ", "里", 7, "dans, dedans", "inside, in", "Un champ (田) et la terre (土) = à l'intérieur de la terre", "A field and earth = inside the earth"),
    ("钟", "zhōng", "钅", 9, "horloge, cloche", "clock, bell", "Du métal (钅) et le centre (中) = cloche centrale", "Metal and center = central bell"),
    ("钱", "qián", "钅", 10, "argent, monnaie", "money", "Du métal (钅) et une lance (戋) = pièces métalliques", "Metal and a lance = metal coins"),
    ("问", "wèn", "门", 6, "demander", "to ask", "Une bouche (口) à la porte (门) = demander à l'entrée", "A mouth at the gate = asking at the entrance"),
    ("间", "jiān", "门", 7, "entre, espace", "between, space", "Le soleil (日) dans la porte (门) = lumière entre les battants", "Sun in the gate = light between doors"),
    ("院", "yuàn", "阝", 9, "cour, hôpital", "courtyard, hospital", "Un village (阝) complet (完) = institution", "A complete village = institution"),
    ("雨", "yǔ", "雨", 8, "pluie", "rain", "Des gouttes tombant d'un nuage sous le ciel", "Drops falling from a cloud under the sky"),
    ("雪", "xuě", "雨", 11, "neige", "snow", "La pluie (雨) qui se transforme (彐) en flocons = neige", "Rain transforming into flakes = snow"),
    ("零", "líng", "雨", 13, "zéro", "zero", "La pluie (雨) et un ordre (令) = les dernières gouttes = zéro", "Rain and a command = the last drops = zero"),
    ("非", "fēi", "非", 8, "non, pas", "not, non-", "Deux ailes opposées = contradiction, non", "Two opposing wings = contradiction, not"),
    ("面", "miàn", "面", 9, "visage, nouilles", "face, noodles", "Un visage vu de face dans un cadre", "A face seen head-on in a frame"),
    ("题", "tí", "页", 15, "sujet, question", "topic, question", "C'est (是) la page (页) = le sujet", "It is the page = the topic"),
    ("飞", "fēi", "飞", 3, "voler", "to fly", "Un oiseau aux ailes déployées en vol", "A bird with spread wings in flight"),
    ("饭", "fàn", "饣", 7, "riz cuit, repas", "cooked rice, meal", "De la nourriture (饣) et une opposition (反) = repas qui rassemble", "Food and opposition = meal that brings together"),
    ("饺", "jiǎo", "饣", 9, "ravioli chinois", "dumpling", "De la nourriture (饣) et un croisement (交) = pâte croisée = ravioli", "Food and crossing = crossed dough = dumpling"),
    ("高", "gāo", "高", 10, "haut, grand", "tall, high", "Un pavillon haut avec un toit et des étages", "A tall pavilion with a roof and floors"),
    ("鸡", "jī", "鸟", 7, "poulet", "chicken", "Un oiseau (鸟) et un signe (又) = volaille domestique", "A bird and a sign = domestic poultry"),
]

print(f"Total characters to import: {len(HSK1_CHARS)}")

# ─── Import into Supabase ──────────────────────────────────────────

# First, get existing characters to avoid duplicates
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/characters?select=id,character&hsk_level=eq.1',
    headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'},
)
existing = {c['character']: c['id'] for c in r.json()}
print(f"Existing in DB: {len(existing)}")

# Also fix pinyin on existing seed characters
seed_fixes = {
    "你": "nǐ", "好": "hǎo", "我": "wǒ", "是": "shì",
    "人": "rén", "大": "dà", "中": "zhōng", "国": "guó",
    "学": "xué", "生": "shēng",
}
for char, correct_pinyin in seed_fixes.items():
    if char in existing:
        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/characters?id=eq.{existing[char]}',
            headers=HEADERS,
            json={'pinyin': correct_pinyin}
        )
        if r.status_code in (200, 204):
            print(f"  Fixed seed pinyin: {char} -> {correct_pinyin}")

# Filter out existing characters
new_chars = [(c, p, r, s, mfr, men, mnfr, mnen) 
             for c, p, r, s, mfr, men, mnfr, mnen in HSK1_CHARS 
             if c not in existing]
print(f"New characters to import: {len(new_chars)}")

# Import in batches of 50
BATCH = 50
imported = 0
errors = 0

for i in range(0, len(new_chars), BATCH):
    batch = new_chars[i:i+BATCH]
    
    # Prepare character records
    char_records = []
    for idx, (char, pinyin, radical, strokes, mfr, men, mnfr, mnen) in enumerate(batch):
        # Generate UUID: f1000NNN format (hex-valid)
        global_idx = i + idx + len(existing) + 1
        char_id = f"f1{global_idx:06d}-0000-0000-0000-000000000001"
        char_records.append({
            'id': char_id,
            'character': char,
            'pinyin': pinyin,
            'radical': radical,
            'stroke_count': strokes,
            'hsk_level': '1',
            'frequency_rank': global_idx,
            'status': 'published',
        })
    
    # Insert characters
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/characters',
        headers={**HEADERS, 'Prefer': 'return=representation'},
        json=char_records,
    )
    if r.status_code not in (200, 201):
        print(f"  ERROR inserting chars batch {i}: {r.status_code} {r.text[:200]}")
        errors += 1
        continue
    
    inserted_chars = r.json()
    print(f"  Batch {i//BATCH+1}: inserted {len(inserted_chars)} characters")
    
    # Prepare translations
    trans_records = []
    for j, (char, pinyin, radical, strokes, mfr, men, mnfr, mnen) in enumerate(batch):
        char_id = inserted_chars[j]['id']
        # French translation
        trans_records.append({
            'character_id': char_id,
            'locale': 'fr',
            'meaning': mfr,
            'mnemonic': mnfr,
        })
        # English translation
        trans_records.append({
            'character_id': char_id,
            'locale': 'en',
            'meaning': men,
            'mnemonic': mnen,
        })
    
    # Insert translations
    r2 = requests.post(
        f'{SUPABASE_URL}/rest/v1/character_translations',
        headers=HEADERS,
        json=trans_records,
    )
    if r2.status_code not in (200, 201, 204):
        print(f"  ERROR inserting translations batch {i}: {r2.status_code} {r2.text[:200]}")
        errors += 1
    else:
        imported += len(batch)
        print(f"  + {len(trans_records)} translations")

print(f"\n✅ Imported {imported} characters, {errors} errors")

# Final count
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/characters?select=character&hsk_level=eq.1',
    headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'},
)
total = len(r.json())
print(f"Total HSK-1 characters in DB: {total}")
