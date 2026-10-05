// ═══════════════════════════════════════════════════════════════════════════
// TEF Lessons — Structured learning content for each section
// ═══════════════════════════════════════════════════════════════════════════

export interface LessonStep {
  type: 'theory' | 'tip' | 'example' | 'warning' | 'practice';
  title: string;
  titleEN: string;
  content: string;
  contentEN: string;
}

export interface Lesson {
  id: string;
  section: 'CE' | 'CO' | 'EE' | 'EO';
  order: number;
  title: string;
  titleEN: string;
  description: string;
  descriptionEN: string;
  nclcRange: string;
  duration: string; // e.g. "10 min"
  steps: LessonStep[];
}

export const lessons: Lesson[] = [
  // ════════════════════════════════════
  // CE LESSONS
  // ════════════════════════════════════
  {
    id: 'ce-1', section: 'CE', order: 1,
    title: 'Comprendre la structure du CE', titleEN: 'Understanding the CE Structure',
    description: 'Les 4 familles de textes et comment les aborder.', descriptionEN: 'The 4 text families and how to approach them.',
    nclcRange: '5-9', duration: '8 min',
    steps: [
      { type: 'theory', title: 'Les 4 familles', titleEN: 'The 4 Families',
        content: 'Le CE du TEF se compose de 4 familles de textes :\n\n**Famille A — Textes courts de la vie quotidienne** (annonces, affiches, petites annonces)\n→ NCLC 5-6. Repérez les données factuelles : dates, prix, lieux, conditions.\n\n**Famille B — Textes lacunaires** (textes à trous, courriels professionnels)\n→ NCLC 6-9. Choisissez le mot grammaticalement et sémantiquement correct.\n\n**Famille C — Lecture rapide** (tableaux, grilles comparatives, horaires)\n→ NCLC 6-8. Croisez les critères de la question avec les données du tableau.\n\n**Famille D — Textes argumentatifs** (articles, éditoriaux, chroniques)\n→ NCLC 7-9. Identifiez la thèse, les nuances et les opinions rapportées.',
        contentEN: 'The TEF CE consists of 4 text families:\n\n**Family A — Short everyday texts** (announcements, posters, classifieds)\n→ NCLC 5-6. Look for factual data: dates, prices, locations, conditions.\n\n**Family B — Cloze texts** (gap-fill texts, professional emails)\n→ NCLC 6-9. Choose the grammatically and semantically correct word.\n\n**Family C — Quick reading** (tables, comparison grids, schedules)\n→ NCLC 6-8. Cross-reference the question criteria with the table data.\n\n**Family D — Argumentative texts** (articles, editorials, columns)\n→ NCLC 7-9. Identify the thesis, nuances, and reported opinions.' },
      { type: 'tip', title: 'Règle d\'or #1', titleEN: 'Golden Rule #1',
        content: '**Lisez TOUJOURS la question AVANT le texte.** Cela vous donne un filtre de lecture et vous évite de perdre du temps sur des détails non questionnés.',
        contentEN: '**ALWAYS read the question BEFORE the text.** This gives you a reading filter and prevents wasting time on unquestioned details.' },
      { type: 'warning', title: 'Piège le plus fréquent', titleEN: 'Most Common Trap',
        content: '**P6 — Sur-inférence** : La réponse vous semble logique « en général », mais elle n\'est pas dans CE texte. Au TEF, la seule source de vérité est le texte devant vous. Si l\'information n\'y est pas explicitement, ce n\'est pas la bonne réponse.',
        contentEN: '**P6 — Over-inference**: The answer seems logical "in general," but it\'s not in THIS text. In the TEF, the only source of truth is the text in front of you. If the information isn\'t explicitly there, it\'s not the right answer.' },
      { type: 'example', title: 'Exemple concret', titleEN: 'Concrete Example',
        content: 'Texte : « Clinique ouverte du lundi au vendredi, 8h-20h. Samedi 9h-17h. Fermée le dimanche et les jours fériés. »\n\nQuestion : « Quand la clinique est-elle fermée ? »\n\n❌ A) Le samedi et le dimanche → Faux ! Le samedi elle est ouverte.\n✅ B) Le dimanche et les jours fériés → Exact, c\'est dans le texte.\n❌ C) Uniquement le dimanche → Piège P3 : vrai mais incomplet (oublie les jours fériés).',
        contentEN: 'Text: "Clinic open Monday to Friday, 8am-8pm. Saturday 9am-5pm. Closed Sundays and holidays."\n\nQuestion: "When is the clinic closed?"\n\n❌ A) Saturday and Sunday → Wrong! It\'s open on Saturday.\n✅ B) Sunday and holidays → Exactly what the text says.\n❌ C) Only Sunday → Trap P3: true but incomplete (forgets holidays).' },
      { type: 'tip', title: 'Gestion du temps', titleEN: 'Time Management',
        content: '**60 minutes pour ~50 questions.** Budget recommandé :\n• Famille A/C : 1 min par question (factuel)\n• Famille B : 1.5 min par question (réflexion grammaticale)\n• Famille D : 2 min par question (analyse argumentative)\n\nSi une question vous bloque > 2 min, passez et revenez à la fin.',
        contentEN: '**60 minutes for ~50 questions.** Recommended budget:\n• Family A/C: 1 min per question (factual)\n• Family B: 1.5 min per question (grammatical thinking)\n• Family D: 2 min per question (argument analysis)\n\nIf a question blocks you > 2 min, skip and come back later.' },
    ],
  },
  {
    id: 'ce-2', section: 'CE', order: 2,
    title: 'Maîtriser les textes lacunaires (Famille B)', titleEN: 'Mastering Cloze Texts (Family B)',
    description: 'Stratégies pour les textes à trous NCLC 6-9.', descriptionEN: 'Strategies for gap-fill texts NCLC 6-9.',
    nclcRange: '6-9', duration: '10 min',
    steps: [
      { type: 'theory', title: 'Ce qui est testé', titleEN: 'What Is Being Tested',
        content: 'Les textes lacunaires testent 3 compétences :\n\n1. **Grammaire** : accord sujet-verbe, temps verbal, mode (subjonctif vs indicatif)\n2. **Connecteurs logiques** : cause (parce que), concession (quoique, bien que), conséquence (donc, dès lors)\n3. **Prépositions** : pour/par/de/à — les confusions sont le piège P1 le plus fréquent.',
        contentEN: 'Cloze texts test 3 skills:\n\n1. **Grammar**: subject-verb agreement, verb tense, mood (subjunctive vs indicative)\n2. **Logical connectors**: cause (because), concession (although), consequence (therefore)\n3. **Prepositions**: for/by/of/to — confusion is the most common P1 trap.' },
      { type: 'tip', title: 'Méthode en 3 étapes', titleEN: '3-Step Method',
        content: '**Étape 1** : Lisez le texte EN ENTIER sans regarder les blancs. Comprenez le sens global.\n**Étape 2** : Pour chaque blanc, identifiez sa fonction : connecteur ? verbe ? préposition ?\n**Étape 3** : Testez chaque option en la lisant à voix haute dans la phrase. L\'oreille détecte souvent ce que l\'analyse rate.',
        contentEN: '**Step 1**: Read the ENTIRE text without looking at the blanks. Understand the overall meaning.\n**Step 2**: For each blank, identify its function: connector? verb? preposition?\n**Step 3**: Test each option by reading it aloud in the sentence. Your ear often catches what analysis misses.' },
      { type: 'warning', title: 'Piège NCLC 8-9 : le subjonctif', titleEN: 'NCLC 8-9 Trap: The Subjunctive',
        content: '« Bien qu\'il **soit** fatigué... » (subjonctif) vs « Parce qu\'il **est** fatigué... » (indicatif).\n\nMots déclencheurs du subjonctif : bien que, quoique, pour que, avant que, à moins que, il faut que, il est possible que.\n\nSi vous voyez un de ces mots dans le contexte du blanc → le subjonctif est probable.',
        contentEN: '"Although he **is** tired..." (subjunctive in French) vs "Because he **is** tired..." (indicative).\n\nSubjunctive triggers: although, so that, before, unless, it is necessary that, it is possible that.\n\nIf you see one of these words near the blank → subjunctive is likely.' },
      { type: 'example', title: 'Connecteurs de nuance (NCLC 7+)', titleEN: 'Nuance Connectors (NCLC 7+)',
        content: '**Concession** : quoique, bien que, malgré, il n\'en demeure pas moins que, certes... mais\n**Opposition** : en revanche, toutefois, cependant, néanmoins\n**Cause** : en raison de, du fait de, puisque, étant donné que\n**Conséquence** : dès lors, c\'est pourquoi, aussi (en début de phrase = donc)\n\n⚠️ « Quoique » ≠ « Parce que » → Le piège P5 classique qui inverse la logique.',
        contentEN: '**Concession**: although, despite, nevertheless\n**Opposition**: on the other hand, however, nonetheless\n**Cause**: due to, given that, since\n**Consequence**: therefore, that\'s why\n\n⚠️ "Although" ≠ "Because" → Classic P5 trap that inverts the logic.' },
    ],
  },

  // ════════════════════════════════════
  // CO LESSONS
  // ════════════════════════════════════
  {
    id: 'co-1', section: 'CO', order: 1,
    title: 'Comprendre la structure du CO', titleEN: 'Understanding the CO Structure',
    description: 'Les 4 sections d\'écoute et comment les aborder.', descriptionEN: 'The 4 listening sections and how to approach them.',
    nclcRange: '5-9', duration: '8 min',
    steps: [
      { type: 'theory', title: 'Les 4 sections', titleEN: 'The 4 Sections',
        content: 'Le CO du TEF se compose de 4 sections :\n\n**Section A — Dialogues courts** (NCLC 5-6)\nDeux personnes, situation quotidienne. Durée : 20-30 secondes.\n→ Question typique : « Quelle image / situation correspond ? »\n\n**Section B — Annonces publiques** (NCLC 6-7)\nMessages dans des lieux publics (gare, aéroport, magasin).\n→ Piège #1 : confondre retard et annulation (CO-P6).\n\n**Section C — Messages répondeur / conversations** (NCLC 7-8)\nMessages téléphoniques, appels professionnels.\n→ Piège : report ≠ annulation, blessure mineure ≠ urgence.\n\n**Section D — Micro-trottoirs / débats** (NCLC 8-10)\nOpinions nuancées, arguments contradictoires.\n→ Piège #1 : réduire une opinion nuancée à « pour » ou « contre » (CO-P7).',
        contentEN: 'The TEF CO consists of 4 sections:\n\n**Section A — Short dialogues** (NCLC 5-6)\nTwo people, everyday situation. Duration: 20-30 seconds.\n→ Typical question: "Which image/situation matches?"\n\n**Section B — Public announcements** (NCLC 6-7)\nMessages in public places (station, airport, store).\n→ Trap #1: confusing delay with cancellation (CO-P6).\n\n**Section C — Voicemail / conversations** (NCLC 7-8)\nPhone messages, professional calls.\n→ Trap: postponement ≠ cancellation, minor injury ≠ emergency.\n\n**Section D — Street interviews / debates** (NCLC 8-10)\nNuanced opinions, contradictory arguments.\n→ Trap #1: reducing a nuanced opinion to "for" or "against" (CO-P7).' },
      { type: 'tip', title: 'Règle d\'or : écouter jusqu\'au bout', titleEN: 'Golden Rule: Listen to the End',
        content: '**Ne répondez JAMAIS avant la fin du message audio.** C\'est la cause n°1 d\'erreur au CO.\n\nExemple classique : « L\'appartement a été loué... [pause] mais nous avons un autre bien similaire disponible. »\nSi vous répondez après « loué », vous manquez l\'information clé.\n\nLe TEF place systématiquement l\'information décisive dans la 2e moitié du message.',
        contentEN: '**NEVER answer before the end of the audio.** This is the #1 cause of CO errors.\n\nClassic example: "The apartment has been rented... [pause] but we have a similar property available."\nIf you answer after "rented," you miss the key information.\n\nThe TEF systematically places decisive information in the 2nd half of the message.' },
      { type: 'warning', title: 'Les nombres et les heures', titleEN: 'Numbers and Times',
        content: '**CO-P4 : Nombres proches à l\'oral**\n\n« quatorze » (14) vs « quarante » (40) — même début !\n« seize » (16) vs « soixante » (60)\n« deux heures » vs « douze heures »\n\nAstuce : concentrez-vous sur la **dernière syllabe**. Le suffixe « -ante » indique les dizaines.',
        contentEN: '**CO-P4: Similar-sounding numbers**\n\n"fourteen" vs "forty" — same start in French!\n"sixteen" vs "sixty"\n"two o\'clock" vs "twelve o\'clock"\n\nTip: focus on the **last syllable**. The "-ante" suffix indicates tens.' },
    ],
  },

  // ════════════════════════════════════
  // EE LESSONS
  // ════════════════════════════════════
  {
    id: 'ee-1', section: 'EE', order: 1,
    title: 'Méthodologie de l\'Expression écrite', titleEN: 'Written Expression Methodology',
    description: 'Structure, critères de notation et stratégies.', descriptionEN: 'Structure, scoring criteria and strategies.',
    nclcRange: '5-9', duration: '12 min',
    steps: [
      { type: 'theory', title: 'Les 2 sections du EE', titleEN: 'The 2 EE Sections',
        content: '**Section A — Fait divers / lettre formelle** (80-120 mots)\nOn vous donne un début d\'article ou une situation, vous continuez.\n→ Évaluation : narration cohérente, registre adapté.\n\n**Section B — Argumentation** (180-220 mots)\nUne question d\'opinion. Vous développez votre point de vue avec des arguments.\n→ Évaluation : structure argumentative, contre-argument, nuance.\n\nLes 5 critères de notation :\n1. Respect de la tâche (format, longueur, consigne)\n2. Organisation (plan, connecteurs)\n3. Richesse lexicale (synonymes, précision)\n4. Grammaire (accords, temps, syntaxe)\n5. Qualité narrative (A) ou argumentative (B)',
        contentEN: '**Section A — News story / formal letter** (80-120 words)\nYou\'re given the start of an article or situation, you continue.\n→ Evaluation: coherent narration, appropriate register.\n\n**Section B — Argumentation** (180-220 words)\nAn opinion question. You develop your viewpoint with arguments.\n→ Evaluation: argumentative structure, counter-argument, nuance.\n\nThe 5 scoring criteria:\n1. Task compliance (format, length, instructions)\n2. Organization (plan, connectors)\n3. Lexical richness (synonyms, precision)\n4. Grammar (agreements, tenses, syntax)\n5. Narrative quality (A) or argumentative quality (B)' },
      { type: 'tip', title: 'Le secret du NCLC 7+ : les connecteurs', titleEN: 'The NCLC 7+ Secret: Connectors',
        content: '**NCLC 5-6** : et, mais, donc, parce que, aussi\n**NCLC 7** : cependant, par ailleurs, en revanche, bien que, afin de\n**NCLC 8-9** : il n\'en demeure pas moins que, on ne saurait nier que, force est de constater que, quoique, dès lors\n\n**Astuce** : avant de commencer, notez 3-4 connecteurs NCLC 7+ que vous utiliserez. Placez-en au moins un par paragraphe.',
        contentEN: '**NCLC 5-6**: and, but, so, because, also\n**NCLC 7**: however, furthermore, on the other hand, although, in order to\n**NCLC 8-9**: nevertheless, one cannot deny that, it must be acknowledged that, although, therefore\n\n**Tip**: before starting, write down 3-4 NCLC 7+ connectors you\'ll use. Place at least one per paragraph.' },
      { type: 'example', title: 'Plan type Section B', titleEN: 'Section B Template',
        content: '**Introduction** (2-3 lignes)\n→ Reformulez la question, annoncez votre position nuancée.\n« Cette question mérite une analyse nuancée... »\n\n**Argument 1** (4-5 lignes)\n→ Votre point principal + exemple concret.\n« D\'une part, ... Par exemple, ... »\n\n**Contre-argument + réfutation** (3-4 lignes)\n→ Montrez que vous avez réfléchi aux deux côtés.\n« Certes, on pourrait objecter que... Il n\'en demeure pas moins que... »\n\n**Conclusion** (2-3 lignes)\n→ Synthèse sans répétition.\n« En définitive, il conviendrait de... plutôt que de... »',
        contentEN: '**Introduction** (2-3 lines)\n→ Rephrase the question, announce your nuanced position.\n\n**Argument 1** (4-5 lines)\n→ Your main point + concrete example.\n\n**Counter-argument + rebuttal** (3-4 lines)\n→ Show you\'ve thought about both sides.\n\n**Conclusion** (2-3 lines)\n→ Synthesis without repetition.' },
      { type: 'warning', title: 'Les 3 erreurs fatales', titleEN: 'The 3 Fatal Errors',
        content: '1. **Longueur insuffisante** : sous 80 mots (A) ou 180 mots (B) → pénalité automatique sur le critère 1.\n2. **Répétition lexicale** : plafonne à NCLC 6 même avec une bonne grammaire. Préparez 2-3 synonymes pour vos mots-clés.\n3. **Pas de connecteur de nuance** : impossible d\'atteindre NCLC 7 sans « cependant », « néanmoins » ou équivalent.',
        contentEN: '1. **Insufficient length**: under 80 words (A) or 180 words (B) → automatic penalty on criterion 1.\n2. **Lexical repetition**: caps at NCLC 6 even with good grammar. Prepare 2-3 synonyms for your keywords.\n3. **No nuance connector**: impossible to reach NCLC 7 without "however," "nevertheless" or equivalent.' },
    ],
  },

  // ════════════════════════════════════
  // EO LESSONS
  // ════════════════════════════════════
  {
    id: 'eo-1', section: 'EO', order: 1,
    title: 'Maîtriser l\'Expression orale', titleEN: 'Mastering Oral Expression',
    description: 'Les 2 sections, les critères et la stratégie de réaction.', descriptionEN: 'The 2 sections, criteria and reaction strategy.',
    nclcRange: '5-9', duration: '10 min',
    steps: [
      { type: 'theory', title: 'Les 2 sections du EO', titleEN: 'The 2 EO Sections',
        content: '**Section A — Obtenir des renseignements** (5 min)\nVous jouez un rôle dans une situation quotidienne (logement, santé, commerce).\nL\'examinateur joue l\'interlocuteur et pose des questions / fait des objections.\n→ Critère clé : la capacité à relancer et reformuler.\n\n**Section B — Argumenter** (10 min)\nOn vous montre un document (affiche, article). Vous devez convaincre l\'examinateur.\n→ Critère clé : la capacité à structurer un argument ET à répondre aux objections.',
        contentEN: '**Section A — Getting information** (5 min)\nYou play a role in an everyday situation (housing, health, shopping).\nThe examiner plays the interlocutor and asks questions / makes objections.\n→ Key criterion: ability to follow up and rephrase.\n\n**Section B — Arguing** (10 min)\nYou\'re shown a document (poster, article). You must convince the examiner.\n→ Key criterion: ability to structure an argument AND respond to objections.' },
      { type: 'tip', title: 'La technique R.R.R. (Reformuler-Répondre-Relancer)', titleEN: 'The R.R.R. Technique (Rephrase-Respond-Redirect)',
        content: '**Reformulez** l\'objection de l\'examinateur :\n« Si je comprends bien, vous pensez que... »\n\n**Répondez** sur le fond :\n« C\'est un point intéressant, cependant... »\n\n**Relancez** avec une question :\n« Et vous, qu\'est-ce qui vous conviendrait le mieux ? »\n\nCette technique montre 3 compétences en une seule réplique : écoute, argumentation, interaction.',
        contentEN: '**Rephrase** the examiner\'s objection:\n"If I understand correctly, you think that..."\n\n**Respond** on substance:\n"That\'s an interesting point, however..."\n\n**Redirect** with a question:\n"And what would work best for you?"\n\nThis technique demonstrates 3 skills in one reply: listening, argumentation, interaction.' },
      { type: 'warning', title: 'Le piège du silence', titleEN: 'The Silence Trap',
        content: '**Un silence de plus de 3 secondes pénalise la fluidité.** Utilisez des chevilles :\n\n• « Eh bien, voyons... » / « Alors, comment dire... »\n• « C\'est une bonne question, laissez-moi réfléchir... »\n• « Effectivement, c\'est un point important... »\n\nCes chevilles achètent 5-10 secondes de réflexion sans pénalité.',
        contentEN: '**A silence of more than 3 seconds penalizes fluency.** Use fillers:\n\n• "Well, let\'s see..." / "So, how to put it..."\n• "That\'s a good question, let me think..."\n• "Indeed, that\'s an important point..."\n\nThese fillers buy 5-10 seconds of thinking without penalty.' },
      { type: 'tip', title: 'Vocabulaire d\'interaction (NCLC 7+)', titleEN: 'Interaction Vocabulary (NCLC 7+)',
        content: '**Concéder** : Certes, je reconnais que, il est vrai que, vous avez raison sur ce point\n**Nuancer** : Cela dit, pour autant, il n\'en demeure pas moins que, toutefois\n**Reformuler** : Autrement dit, en d\'autres termes, si je comprends bien\n**Conclure** : En définitive, tout compte fait, à mon sens\n\nUtilisez au moins 3 de ces expressions pendant l\'épreuve pour atteindre NCLC 7.',
        contentEN: '**Concede**: Certainly, I acknowledge that, it\'s true that\n**Nuance**: That said, however, nevertheless\n**Rephrase**: In other words, if I understand correctly\n**Conclude**: Ultimately, all things considered, in my view\n\nUse at least 3 of these expressions during the test to reach NCLC 7.' },
    ],
  },
];
