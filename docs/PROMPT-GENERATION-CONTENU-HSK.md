# Prompt de generation de contenu HSK pour Lingullio

## Instructions d'utilisation

Copiez le prompt ci-dessous dans votre IA (Claude, ChatGPT, etc.).
Envoyez-le tel quel, puis suivez les instructions de l'IA.
Elle generera les fichiers JSON un par un dans l'ordre indique.

Vous devrez faire **7 generations** par niveau HSK :

| # | Contenu | Volume HSK 1 |
|---|---------|-------------|
| 1 | Vocabulaire | 300 mots |
| 2 | Caracteres | ~175 caracteres uniques |
| 3 | Grammaire | ~35 points |
| 4 | Modules + Lecons (plan de cours) | ~10 modules, ~50 lecons |
| 5 | Contenu des lecons (cours) | ~50 blocs HTML |
| 6 | Exercices | ~200 exercices |
| 7 | Examens blancs | 2-3 examens complets |

---

## LE PROMPT (a copier integralement)

---

Tu es un expert en linguistique chinoise et en conception pedagogique pour l'examen HSK (format officiel 2026, norme 3.0 finale). Tu travailles pour Lingullio, une plateforme EdTech premium de preparation aux examens de langues asiatiques.

Ta mission : generer le contenu pedagogique COMPLET pour **HSK 1** (300 mots, ~175 caracteres, ~35 points de grammaire) au format JSON strict, pret a etre insere dans une base PostgreSQL/Supabase.

## CONTEXTE HSK 3.0 (norme 2025 finale)

- HSK 3.0 = 9 niveaux (3 paliers : elementaire 1-3, intermediaire 4-6, avance 7-9)
- HSK 1 = 300 mots (cumulatif), ~175 caracteres uniques
- L'examen HSK 1 teste : comprehension orale, comprehension ecrite, expression ecrite (caracteres de base)
- Source de reference : liste officielle du Ministere de l'Education chinois, norme finale 2025

## REGLES IMPERATIVES

1. **Pinyin** : utiliser les accents unicode (nǐ hǎo), PAS les chiffres (ni3 hao3)
2. **Traductions** : TOUJOURS fournir FR + EN
3. **Exemples** : chaque mot de vocabulaire doit avoir au moins 1 phrase d'exemple utilisant UNIQUEMENT du vocabulaire HSK 1
4. **Encodage** : UTF-8, pas d'echappement inutile, les caracteres chinois en clair
5. **Themes** : utiliser UNIQUEMENT ces valeurs normalisees pour le vocabulaire :
   - `greetings`, `family`, `food_drink`, `numbers`, `time_dates`, `transport`, `school_work`, `body_health`, `weather_nature`, `shopping`, `places`, `daily_life`, `communication`, `feelings`, `clothing`, `hobbies`, `directions`, `basic_verbs`, `basic_adjectives`, `pronouns_particles`
6. **Types de mots** (word_type) : utiliser UNIQUEMENT :
   - `noun`, `verb`, `adjective`, `adverb`, `pronoun`, `conjunction`, `particle`, `measure_word`, `preposition`, `interjection`, `numeral`, `proper_noun`
7. **hsk_level** : utiliser le format `"HSK1"` (pas `"1"`, pas `"HSK 1"`)
8. **Pas de doublons** : chaque caractere / mot / point de grammaire est unique
9. **Pas d'UUID** : je les genererai moi-meme. Utiliser des identifiants sequentiels temporaires (`"_temp_id": "vocab_001"`, etc.) pour les references internes

## GENERATION 1/7 : VOCABULAIRE (300 mots)

Genere un fichier JSON contenant les 300 mots du HSK 1 (norme 3.0 finale 2025).

Format pour CHAQUE mot :

```json
{
  "_temp_id": "vocab_001",
  "simplified": "你好",
  "traditional": null,
  "pinyin": "nǐ hǎo",
  "hsk_level": "HSK1",
  "word_type": "interjection",
  "theme": "greetings",
  "frequency_rank": 1,
  "radical": null,
  "stroke_count": null,
  "translations": {
    "fr": {
      "meaning": "bonjour",
      "example_sentence": "你好，我叫李明。",
      "example_pinyin": "Nǐ hǎo, wǒ jiào Lǐ Míng.",
      "example_translation": "Bonjour, je m'appelle Li Ming.",
      "usage_notes": "Salutation standard, utilisable dans toute situation."
    },
    "en": {
      "meaning": "hello",
      "example_sentence": "你好，我叫李明。",
      "example_pinyin": "Nǐ hǎo, wǒ jiào Lǐ Míng.",
      "example_translation": "Hello, my name is Li Ming.",
      "usage_notes": "Standard greeting, usable in any situation."
    }
  }
}
```

Envoie les mots par lots de 50 (6 lots). A la fin de chaque lot, ecris "LOT X/6 TERMINE - Dis 'continue' pour le lot suivant."

Contraintes :
- Les 300 mots doivent correspondre a la LISTE OFFICIELLE HSK 3.0 norme 2025
- Repartis dans les themes ci-dessus de maniere equilibree
- frequency_rank de 1 a 300 par ordre de frequence d'usage reel
- traditional = null si identique au simplifie, sinon le caractere traditionnel
- Les phrases d'exemple ne doivent contenir QUE du vocabulaire HSK 1

---

Quand le vocabulaire sera complet, je te demanderai la Generation 2/7 (Caracteres), puis 3/7 (Grammaire), etc.

## GENERATION 2/7 : CARACTERES (~175 caracteres uniques)

Extrais tous les caracteres uniques qui apparaissent dans les 300 mots du vocabulaire HSK 1.

Format pour CHAQUE caractere :

```json
{
  "_temp_id": "char_001",
  "character": "你",
  "pinyin": "nǐ",
  "radical": "亻",
  "stroke_count": 7,
  "hsk_level": "HSK1",
  "frequency_rank": 1,
  "decomposition": "⿰亻尔",
  "translations": {
    "fr": {
      "meaning": "tu, vous (singulier)",
      "mnemonic": "Une personne (亻) debout — c'est la personne en face de toi, 'tu'."
    },
    "en": {
      "meaning": "you (singular)",
      "mnemonic": "A person (亻) standing — it's the person facing you, 'you'."
    }
  }
}
```

Contraintes :
- Chaque caractere n'apparait QU'UNE fois
- `radical` : le radical officiel Kangxi
- `stroke_count` : nombre exact de traits
- `decomposition` : decomposition IDS (Ideographic Description Sequence) si applicable
- `mnemonic` : phrase memorielle creative et efficace, differente pour FR et EN
- Trier par frequency_rank (caractere le plus courant en premier)

## GENERATION 3/7 : GRAMMAIRE (~35 points)

Genere les points de grammaire essentiels du HSK 1.

Format pour CHAQUE point :

```json
{
  "_temp_id": "gram_001",
  "pattern": "S + 是 + N",
  "hsk_level": "HSK1",
  "sort_order": 1,
  "difficulty": 1,
  "translations": {
    "fr": {
      "title": "Phrase avec 是 (etre)",
      "explanation_html": "<h3>Structure</h3><p>Sujet + <strong>是</strong> + Nom</p><h3>Usage</h3><p>Le verbe <strong>是</strong> (shì) sert a identifier ou classifier. C'est l'equivalent de 'etre' devant un nom.</p><h3>Attention</h3><p>On n'utilise PAS 是 devant un adjectif. Pour dire 'je suis content', on dit 我很高兴 (pas 我是高兴).</p>",
      "examples": [
        {
          "zh": "我是学生。",
          "pinyin": "Wǒ shì xuéshēng.",
          "translation": "Je suis etudiant."
        },
        {
          "zh": "她是老师。",
          "pinyin": "Tā shì lǎoshī.",
          "translation": "Elle est professeur."
        },
        {
          "zh": "这是我的书。",
          "pinyin": "Zhè shì wǒ de shū.",
          "translation": "C'est mon livre."
        }
      ],
      "common_errors": [
        {
          "error": "我是好。",
          "correction": "我很好。",
          "explanation": "On n'utilise pas 是 devant un adjectif. Utilisez 很 + adjectif."
        }
      ]
    },
    "en": {
      "title": "Sentences with 是 (to be)",
      "explanation_html": "<h3>Structure</h3><p>Subject + <strong>是</strong> + Noun</p><h3>Usage</h3><p>The verb <strong>是</strong> (shì) is used to identify or classify. It is the equivalent of 'to be' before a noun.</p><h3>Caution</h3><p>Do NOT use 是 before an adjective. To say 'I am happy', say 我很高兴 (not 我是高兴).</p>",
      "examples": [
        {
          "zh": "我是学生。",
          "pinyin": "Wǒ shì xuéshēng.",
          "translation": "I am a student."
        },
        {
          "zh": "她是老师。",
          "pinyin": "Tā shì lǎoshī.",
          "translation": "She is a teacher."
        },
        {
          "zh": "这是我的书。",
          "pinyin": "Zhè shì wǒ de shū.",
          "translation": "This is my book."
        }
      ],
      "common_errors": [
        {
          "error": "我是好。",
          "correction": "我很好。",
          "explanation": "Do not use 是 before an adjective. Use 很 + adjective."
        }
      ]
    }
  }
}
```

Contraintes :
- ~35 points de grammaire couvrant TOUTES les structures du HSK 1
- difficulty de 1 a 3 (pour HSK 1, la plupart seront 1 ou 2)
- Au moins 3 exemples par point
- Au moins 1 erreur courante par point
- explanation_html : HTML propre avec des balises <h3>, <p>, <strong>, <ul>/<li>
- Les exemples n'utilisent QUE du vocabulaire HSK 1

## GENERATION 4/7 : MODULES + LECONS (plan de cours)

Genere la structure pedagogique complete du cours HSK 1.
Le cours couvre DEUX axes :
1. **Apprentissage progressif** (cours structuré, lecon par lecon)
2. **Preparation a l'examen** (strategies, examens blancs, entrainement specifique)

Format MODULES :

```json
{
  "_temp_id": "mod_001",
  "course_slug": "hsk-1",
  "sort_order": 1,
  "estimated_duration_minutes": 180,
  "translations": {
    "fr": {
      "title": "Les bases du chinois",
      "description": "Decouvrez les fondamentaux : pinyin, tons, premiers caracteres et salutations.",
      "objectives": [
        "Maitriser le systeme pinyin et les 4 tons",
        "Reconnaitre et ecrire les 20 premiers caracteres",
        "Se presenter et saluer en chinois",
        "Comprendre la structure SVO du chinois"
      ]
    },
    "en": {
      "title": "Chinese Basics",
      "description": "Discover the fundamentals: pinyin, tones, first characters and greetings.",
      "objectives": [
        "Master the pinyin system and the 4 tones",
        "Recognize and write the first 20 characters",
        "Introduce yourself and greet in Chinese",
        "Understand the SVO structure of Chinese"
      ]
    }
  }
}
```

Format LECONS (a l'interieur de chaque module) :

```json
{
  "_temp_id": "les_001",
  "_parent_module": "mod_001",
  "sort_order": 1,
  "lesson_type": "standard",
  "estimated_duration_minutes": 25,
  "translations": {
    "fr": {
      "title": "Le systeme pinyin",
      "description": "Decouvrez le pinyin, le systeme de romanisation du chinois mandarin.",
      "content_html": null
    },
    "en": {
      "title": "The Pinyin System",
      "description": "Discover pinyin, the romanization system for Mandarin Chinese.",
      "content_html": null
    }
  },
  "vocabulary_refs": ["vocab_001", "vocab_002"],
  "grammar_refs": ["gram_001"],
  "character_refs": ["char_001", "char_002"]
}
```

Contraintes :
- **~10 modules** couvrant tout le programme HSK 1
- **~5 lecons par module** (mix de types)
- lesson_type parmi : `standard` (cours), `practice` (exercices), `review` (revision), `diagnostic` (test), `assessment` (evaluation), `mock_exam` (examen blanc)
- Progression logique : les premiers modules = bases (pinyin, tons, pronoms), les derniers = synthese et preparation examen
- Le module final doit etre dedie a la **preparation a l'examen** (strategies, examens blancs)
- Chaque lecon reference les mots de vocabulaire, points de grammaire et caracteres qu'elle couvre (via _temp_id)
- content_html = null pour cette generation (sera genere dans la generation 5/7)

Structure suggeree des 10 modules :
1. Les bases du chinois (pinyin, tons)
2. Salutations et presentations
3. La famille et les personnes
4. Nombres, dates et heure
5. La vie quotidienne (nourriture, boissons)
6. Lieux et deplacements
7. Activites et loisirs
8. Achats et descriptions
9. Communication et sentiments
10. Revision generale et preparation a l'examen HSK 1

## GENERATION 5/7 : CONTENU DES LECONS (cours HTML)

Pour chaque lecon de type `standard`, genere le contenu pedagogique HTML complet.

Format :

```json
{
  "_lesson_ref": "les_001",
  "translations": {
    "fr": {
      "content_html": "<section class='lesson-intro'><h2>Introduction</h2><p>Le pinyin est le systeme officiel de romanisation du chinois mandarin...</p></section><section class='lesson-core'><h2>Les initiales</h2><p>Le chinois mandarin comporte 21 initiales (consonnes)...</p><div class='example-box'><p class='zh'>b, p, m, f</p><p class='note'>Semblables au francais</p></div>...</section><section class='lesson-practice'><h2>A retenir</h2><ul><li>Point cle 1</li><li>Point cle 2</li></ul></section>"
    },
    "en": {
      "content_html": "<section class='lesson-intro'><h2>Introduction</h2><p>Pinyin is the official romanization system for Mandarin Chinese...</p></section>..."
    }
  }
}
```

Contraintes :
- HTML semantique avec classes CSS pour le styling (je gere le CSS)
- Classes a utiliser : `lesson-intro`, `lesson-core`, `lesson-practice`, `lesson-summary`, `example-box`, `tip-box`, `warning-box`, `cultural-note`
- Chaque lecon standard = 800-1500 mots de contenu
- Inclure des encadres culturels quand pertinent
- Le contenu doit etre pedagogique, progressif et engageant
- NE PAS generer de content_html pour les lecons de type `practice`, `review`, `diagnostic`, `assessment`, `mock_exam` (celles-ci seront composees d'exercices)

## GENERATION 6/7 : EXERCICES (~200 exercices)

Genere les exercices associes aux lecons.

Format pour CHAQUE exercice :

```json
{
  "_temp_id": "ex_001",
  "_lesson_ref": "les_003",
  "exercise_type": "mcq",
  "difficulty": 1,
  "points": 10,
  "estimated_duration_seconds": 30,
  "skill_tags": ["vocabulary", "reading"],
  "hsk_level": "HSK1",
  "sort_order": 1,
  "translations": {
    "fr": {
      "prompt": "Que signifie 你好 ?",
      "instruction": "Choisissez la bonne traduction.",
      "explanation": "你好 (nǐ hǎo) est la salutation standard en chinois.",
      "hint": "Pensez a une salutation courante."
    },
    "en": {
      "prompt": "What does 你好 mean?",
      "instruction": "Choose the correct translation.",
      "explanation": "你好 (nǐ hǎo) is the standard greeting in Chinese.",
      "hint": "Think of a common greeting."
    }
  },
  "options": [
    {
      "sort_order": 1,
      "is_correct": true,
      "translations": {
        "fr": { "content": "Bonjour", "error_explanation": null },
        "en": { "content": "Hello", "error_explanation": null }
      }
    },
    {
      "sort_order": 2,
      "is_correct": false,
      "translations": {
        "fr": { "content": "Au revoir", "error_explanation": "再见 (zàijiàn) signifie 'au revoir', pas 你好." },
        "en": { "content": "Goodbye", "error_explanation": "再见 (zàijiàn) means 'goodbye', not 你好." }
      }
    },
    {
      "sort_order": 3,
      "is_correct": false,
      "translations": {
        "fr": { "content": "Merci", "error_explanation": "谢谢 (xièxie) signifie 'merci', pas 你好." },
        "en": { "content": "Thank you", "error_explanation": "谢谢 (xièxie) means 'thank you', not 你好." }
      }
    },
    {
      "sort_order": 4,
      "is_correct": false,
      "translations": {
        "fr": { "content": "Pardon", "error_explanation": "对不起 (duìbùqǐ) signifie 'pardon', pas 你好." },
        "en": { "content": "Sorry", "error_explanation": "对不起 (duìbùqǐ) means 'sorry', not 你好." }
      }
    }
  ]
}
```

Types d'exercices a generer (repartition pour ~200 exercices) :

| Type | Code | % | Description |
|------|------|---|-------------|
| QCM | `mcq` | 25% | Choix multiple, 4 options |
| Trou a remplir | `fill_blank` | 15% | Completer une phrase |
| Appariement | `matching` | 10% | Relier chinois/traduction |
| Remettre en ordre | `reorder` | 10% | Remettre les mots d'une phrase dans l'ordre |
| Dictee | `dictation` | 10% | Ecouter et ecrire (prompt = description audio) |
| Comprehension orale | `listening_comprehension` | 5% | Ecouter et repondre |
| Comprehension ecrite | `reading_comprehension` | 10% | Lire un texte et repondre |
| Flashcard | `flashcard` | 5% | Carte recto/verso |
| Reconnaissance caractere | `character_recognition` | 5% | Identifier un caractere |
| Traduction controlee | `controlled_translation` | 5% | Traduire avec contraintes |

Contraintes :
- Chaque lecon de type `practice` doit avoir 8-12 exercices
- Chaque lecon de type `review` doit avoir 10-15 exercices (reprenant le vocabulaire des lecons precedentes)
- Les options de QCM doivent etre des distracteurs PLAUSIBLES (pas de reponses absurdes)
- Pour `fill_blank` : pas besoin d'options, mais l'`explanation` doit contenir la bonne reponse
- Pour `matching`, `reorder` : utiliser le champ `metadata` pour les donnees specifiques
- Pour les exercices sans options (fill_blank, dictation, etc.), `options` = []
- skill_tags parmi : `vocabulary`, `grammar`, `reading`, `listening`, `writing`, `speaking`, `characters`

Metadata specifique par type :

```json
// fill_blank
{ "metadata": { "correct_answer": "是", "alternatives": ["是"] } }

// matching (dans metadata)
{ "metadata": { "pairs": [
  { "left": "你好", "right": "Bonjour" },
  { "left": "谢谢", "right": "Merci" }
] } }

// reorder
{ "metadata": { "correct_order": ["我", "是", "学生"], "sentence_translation": "Je suis etudiant." } }

// dictation
{ "metadata": { "audio_text": "你好", "correct_text": "你好", "pinyin": "nǐ hǎo" } }
```

## GENERATION 7/7 : EXAMENS BLANCS (2-3 examens)

Genere 2 examens blancs complets au format officiel HSK 1 (2026).

Format :

```json
{
  "_temp_id": "mock_001",
  "course_slug": "hsk-1",
  "sort_order": 1,
  "total_duration_minutes": 40,
  "total_points": 100,
  "translations": {
    "fr": {
      "title": "Examen blanc HSK 1 - N°1",
      "description": "Examen blanc complet au format officiel HSK 1 (2026). 40 minutes, 100 points."
    },
    "en": {
      "title": "HSK 1 Mock Exam #1",
      "description": "Full mock exam in official HSK 1 (2026) format. 40 minutes, 100 points."
    }
  },
  "sections": [
    {
      "_temp_id": "mock_001_sec_01",
      "section_type": "listening",
      "sort_order": 1,
      "duration_minutes": 15,
      "total_points": 40,
      "translations": {
        "fr": { "title": "Comprehension orale", "instructions": "Ecoutez l'enregistrement et repondez aux questions." },
        "en": { "title": "Listening Comprehension", "instructions": "Listen to the recording and answer the questions." }
      },
      "exercises": ["(reference aux _temp_id des exercices generes dans la generation 6/7, OU generer de nouveaux exercices specifiques a l'examen)"]
    },
    {
      "_temp_id": "mock_001_sec_02",
      "section_type": "reading",
      "sort_order": 2,
      "duration_minutes": 15,
      "total_points": 40,
      "translations": {
        "fr": { "title": "Comprehension ecrite", "instructions": "Lisez les textes et repondez aux questions." },
        "en": { "title": "Reading Comprehension", "instructions": "Read the texts and answer the questions." }
      }
    },
    {
      "_temp_id": "mock_001_sec_03",
      "section_type": "writing",
      "sort_order": 3,
      "duration_minutes": 10,
      "total_points": 20,
      "translations": {
        "fr": { "title": "Expression ecrite", "instructions": "Completez les phrases et ecrivez les caracteres demandes." },
        "en": { "title": "Writing", "instructions": "Complete the sentences and write the requested characters." }
      }
    }
  ]
}
```

Structure officielle HSK 1 (2026) :
- Section 1 : Comprehension orale (15 min, 40 points, ~20 questions)
- Section 2 : Comprehension ecrite (15 min, 40 points, ~20 questions)  
- Section 3 : Expression ecrite (10 min, 20 points, ~10 questions)
- Total : 40 minutes, 100 points, seuil de reussite = 60/100

---

## RESUME : ORDRE DE GENERATION

1. **Vocabulaire** : 300 mots (6 lots de 50)
2. **Caracteres** : ~175 caracteres uniques extraits du vocabulaire
3. **Grammaire** : ~35 points de grammaire
4. **Modules + Lecons** : ~10 modules, ~50 lecons (plan de cours)
5. **Contenu des lecons** : HTML pedagogique pour chaque lecon `standard`
6. **Exercices** : ~200 exercices repartis dans les lecons
7. **Examens blancs** : 2-3 examens complets

Commence par la **Generation 1/7 : Vocabulaire, Lot 1/6 (mots 1 a 50)**.
