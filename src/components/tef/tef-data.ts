// ============================================================
// TEF Canada - All training data extracted from the preparation material
// ============================================================

// ── Diagnostic questions ──
export interface DiagQuestion {
  q: string;
  choices: string[];
  correct: number;
}

export const diagQuestions: DiagQuestion[] = [
  { q: "Je dois ___ un formulaire pour ma demande.", choices: ["écrire", "remplir", "lire"], correct: 1 },
  { q: "Le ___ a bien fonctionné : nous avons trouvé un appartement en une semaine.", choices: ["hasard", "réseau", "bruit"], correct: 1 },
  { q: "___, cette solution présente aussi des inconvénients.", choices: ["Cependant", "Il n'en demeure pas moins que", "Et"], correct: 1 },
  { q: "On aurait tort de réduire ce débat à une opposition ___.", choices: ["intéressante", "simpliste", "rapide"], correct: 1 },
  { q: "Bien qu'il ___ fatigué, il a terminé son travail.", choices: ["est", "soit", "sera"], correct: 1 },
  { q: "C'est le collègue ___ je t'ai parlé hier.", choices: ["que", "dont", "qui"], correct: 1 },
  { q: "Non seulement il est arrivé en retard, ___ il a oublié ses documents.", choices: ["et", "mais encore", "donc"], correct: 1 },
  { q: "On ne saurait ___ que cette réforme comporte des risques.", choices: ["dire", "nier", "croire"], correct: 1 },
];

// ── CE (Compréhension écrite) exercises ──
export interface QuizChoice {
  t: string;
  piege?: string;
  exp?: string;
}

export interface QuizQuestion {
  q: string;
  choices: QuizChoice[];
  correct: number;
}

export interface QuizItem {
  meta: string;
  text?: string;
  questions: QuizQuestion[];
}

export const ceItems: QuizItem[] = [
  {
    meta: "Famille A · Vie quotidienne · NCLC 5",
    text: "Grand 3 pièces, 2e étage, proche des transports. Cuisine équipée. Loyer : 950 $/mois, charges non comprises. Disponible dès le 1er du mois prochain. Caution d'un mois exigée. Visites : lundi-vendredi, 9h-17h.",
    questions: [
      { q: "Quel est le montant du loyer mensuel ?", choices: [{ t: "850 $", piege: "Piège P2", exp: "Donnée proche du vrai chiffre : toujours relire la phrase exacte." }, { t: "950 $" }, { t: "1050 $", piege: "Piège P2", exp: "Donnée proche du vrai chiffre." }], correct: 1 },
      { q: "Les charges sont-elles incluses ?", choices: [{ t: "Non" }, { t: "Oui", piege: "Piège P5", exp: "Contredit directement « charges non comprises » : une négation manquée inverse tout le sens." }, { t: "Partiellement", piege: "Piège P6", exp: "Sur-inférence : cette nuance n'existe pas dans le texte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Travail (télétravail) · NCLC 7",
    text: "De plus en plus d'entreprises québécoises adoptent le télétravail hybride. 62 % des employés estiment que cette formule améliore leur équilibre de vie. Cependant, certains gestionnaires s'inquiètent d'une perte de cohésion d'équipe. Plusieurs organisations ont mis en place des rencontres hebdomadaires obligatoires en présentiel.",
    questions: [
      { q: "Quelle est l'idée principale du texte ?", choices: [{ t: "Le télétravail est interdit" }, { t: "Le télétravail hybride soulève avantages et inquiétudes" }, { t: "Les employés préfèrent le bureau", piege: "Piège P4", exp: "Confond l'opinion rapportée des gestionnaires avec la thèse générale du texte." }], correct: 1 },
      { q: "Pourquoi des rencontres hebdomadaires sont-elles imposées ?", choices: [{ t: "Pour réduire les coûts", piege: "Piège P6", exp: "Cause plausible en général mais absente de ce texte précis." }, { t: "Pour préserver la cohésion d'équipe" }, { t: "Pour évaluer les employés", piege: "Piège P6", exp: "Sur-inférence non soutenue par le texte." }], correct: 1 },
    ],
  },
  {
    meta: "Famille D · Éditorial IA · NCLC 9",
    text: "On aurait tort de réduire le débat sur l'IA en éducation à une opposition simpliste entre progrès et menace. Il serait toutefois réducteur de n'y voir qu'une menace : nombre d'organisations y trouvent un levier pour repenser leur culture d'entreprise, à condition d'accompagner cette transition par une formation continue adéquate.",
    questions: [
      { q: "L'expression « il serait réducteur de » indique que l'auteur…", choices: [{ t: "Approuve totalement l'idée précédente", piege: "Piège P1", exp: "Sens quasi opposé : l'expression nuance, elle ne valide pas." }, { t: "Nuance une vision trop simpliste" }, { t: "Rejette catégoriquement une opinion", piege: "Piège P1", exp: "Trop extrême par rapport au ton mesuré du texte." }], correct: 1 },
      { q: "Le mot « levier » dans ce contexte signifie :", choices: [{ t: "Un outil de mesure" }, { t: "Un moyen d'action pour progresser" }, { t: "Une contrainte légale", piege: "Piège P1", exp: "Faux sens fréquent par association erronée avec la réglementation." }], correct: 1 },
    ],
  },
  {
    meta: "Famille C · Lecture rapide (grille tarifaire) · NCLC 6",
    text: "Formule Essentiel : 29 $/mois, musculation seulement. Formule Confort : 45 $/mois, musculation + cours collectifs. Formule Premium : 65 $/mois, accès illimité + piscine.",
    questions: [
      { q: "Quelle formule inclut la piscine ?", choices: [{ t: "Essentiel" }, { t: "Confort" }, { t: "Premium" }], correct: 2 },
      { q: "Quelle est la différence de prix entre Essentiel et Confort ?", choices: [{ t: "10 $", piege: "Piège P2", exp: "Erreur de calcul plausible en lecture rapide." }, { t: "16 $" }, { t: "20 $", piege: "Piège P2", exp: "Erreur de calcul plausible." }], correct: 1 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire · NCLC 9",
    text: "Il n'en demeure pas moins que la transition énergétique, aussi ___(1)___ soit-elle sur le plan écologique, ne saurait s'opérer sans une réflexion approfondie sur ses conséquences sociales.",
    questions: [
      { q: "Blanc (1) : quel mot convient ?", choices: [{ t: "nécessaire" }, { t: "inutile", piege: "Piège P5", exp: "Antonyme direct qui inverserait le sens de toute la phrase." }, { t: "simple", piege: "Piège P1", exp: "Sens trop faible par rapport au registre soutenu du texte." }], correct: 0 },
    ],
  },
];

// ── CO (Compréhension orale) exercises ──
export const coItems: QuizItem[] = [
  {
    meta: "Section A · Dialogue court · NCLC 5",
    text: "– Excusez-moi, vous savez où se trouve l'arrêt d'autobus le plus proche ?\n– Oui, continuez tout droit, puis tournez à gauche après la pharmacie. L'arrêt est juste en face du parc.\n– Merci beaucoup !",
    questions: [{ q: "Quelle image correspond à cette conversation ?", choices: [{ t: "Une personne qui achète un billet de train" }, { t: "Une personne qui demande son chemin" }, { t: "Une personne qui attend un ami au parc", piege: "Piège CO-P2", exp: "Le parc n'est qu'un repère géographique donné dans la réponse, pas le sujet." }], correct: 1 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 7",
    text: "« Mesdames et messieurs, en raison d'un incident technique, le train à destination de Québec prévu à 14 h 15 partira avec un retard estimé de vingt minutes. Nous vous prions de nous excuser. »",
    questions: [{ q: "Quel est l'objectif de cette annonce ?", choices: [{ t: "Annoncer l'annulation d'un train", piege: "Piège CO-P6", exp: "Confond un simple retard avec une annulation complète : le piège le plus fréquent en Section B." }, { t: "Informer les passagers d'un retard" }, { t: "Proposer un remboursement", piege: "Piège CO-P6", exp: "Rien dans le texte n'évoque un remboursement." }], correct: 1 }],
  },
  {
    meta: "Section C · Message répondeur · NCLC 7",
    text: "« Bonjour, c'est Sophie. J'ai un empêchement de dernière minute pour notre rendez-vous de demain, mon fils est malade. Est-ce qu'on pourrait plutôt se voir jeudi ? Rappelle-moi. »",
    questions: [{ q: "Pourquoi Sophie appelle-t-elle ?", choices: [{ t: "Pour annuler définitivement", piege: "Piège CO-P6", exp: "Report ≠ annulation : piège classique de cette section." }, { t: "Pour reporter un rendez-vous" }, { t: "Pour confirmer un rendez-vous", piege: "Piège CO-P6", exp: "Contredit le contenu du message." }], correct: 1 }],
  },
  {
    meta: "Section D · Micro-trottoir · NCLC 9",
    text: "« Le télétravail… Franchement, ceux qui pensent que c'est la solution miracle n'ont probablement jamais géré une équipe à distance. Ceci dit, je ne dirais pas non plus que c'est catastrophique. »",
    questions: [{ q: "Quel est le point de vue de la personne ?", choices: [{ t: "Le télétravail est une excellente solution sans réserve", piege: "Piège CO-P3 + CO-P7", exp: "« Solution miracle » est ironique, pas positif : c'est le script le plus piégeux de la banque." }, { t: "Le télétravail est un échec total", piege: "Piège CO-P7", exp: "Réduit une position nuancée à un extrême." }, { t: "Position nuancée, à condition de repenser la collaboration" }], correct: 2 }],
  },
];

// ── EE (Expression écrite) model texts ──
export interface EEItem {
  sujet: string;
  n6: string;
  n9: string;
}

export const eeItems: EEItem[] = [
  {
    sujet: "Section A : Fait divers. « Hier soir, les pompiers sont intervenus dans un immeuble du centre-ville après qu'un voisin a signalé une forte odeur de fumée… » Continuez cet article.",
    n6: "Les pompiers sont arrivés rapidement. Ils ont découvert que la fumée venait d'une casserole oubliée sur la cuisinière. Personne n'était blessé, mais l'appartement était rempli de fumée. La locataire dormait dans une autre pièce et n'avait rien remarqué. Les pompiers ont aéré l'appartement et expliqué les dangers de laisser la cuisine sans surveillance. (78 mots)",
    n9: "Les pompiers, alertés à 22 h précises, sont intervenus avec une rapidité remarquable. Il s'est avéré que l'incident, quoique impressionnant par la fumée dégagée, ne présentait heureusement aucun danger réel : une casserole oubliée sur le feu en était l'unique cause. Ce n'est qu'au moment où les pompiers ont frappé énergiquement à sa porte que la locataire a réalisé l'ampleur de ce qui aurait pu être un véritable drame. (115 mots)",
  },
  {
    sujet: "Section B : Argumentation. « Certaines entreprises imposent un retour obligatoire au bureau après plusieurs années de télétravail. Qu'en pensez-vous ? »",
    n6: "À mon avis, cette question ne doit pas être tranchée de façon radicale. Le télétravail présente de vrais avantages : moins de transport, plus de flexibilité. Cependant, le bureau reste important pour la communication entre collègues. C'est pourquoi je pense qu'un modèle hybride serait la meilleure solution. (56 mots, à étoffer jusqu'à 200)",
    n9: "Il serait sans doute excessif de trancher cette question de manière binaire. Certes, on ne saurait nier que le télétravail a permis à beaucoup de retrouver un meilleur équilibre. Il n'en demeure pas moins que la dimension collective du travail, la spontanéité des échanges informels, se trouve fragilisée par un éloignement prolongé. Dès lors, il conviendrait sans doute d'envisager une organisation modulable plutôt qu'une opposition binaire. (98 mots, à étoffer jusqu'à 200)",
  },
];

// ── EE Grading grid ──
export const eeGrille = {
  headers: ["Critère", "NCLC 5-6", "NCLC 7", "NCLC 8-9"],
  rows: [
    ["Respect de la tâche", "Structure basique", "+ ton adapté", "Nuances de registre"],
    ["Organisation", "et, mais, donc", "cependant, par ailleurs", "néanmoins, il n'en demeure pas moins que"],
    ["Richesse lexicale", "Répétitions tolérées", "Synonymes basiques", "Précis, sans répétition"],
    ["Grammaire", "Erreurs fréquentes", "Erreurs occasionnelles", "Quasi sans erreur"],
    ["5e critère (A : narratif / B : argumentatif)", "Simple", "Structuré", "Nuancé, contre-argument anticipé"],
  ],
};

// ── EO (Expression orale) scenarios ──
export interface EOItem {
  titre: string;
  base: string;
  variantes: [string, string, string][];
}

export const eoItems: EOItem[] = [
  {
    titre: "Section A : Obtenir des renseignements (logement)",
    base: "Candidat : Bonjour, je vous appelle pour l'appartement en ligne. Il est encore disponible ?",
    variantes: [
      ["Objection", "« En fait, il vient d'être loué il y a une heure »", "Rebondir, demander d'autres biens"],
      ["Question retour", "« Vous cherchez pour combien de temps ? »", "Répondre du tac au tac"],
      ["Acceptation", "Propose directement une visite", "Savoir conclure efficacement"],
    ],
  },
  {
    titre: "Section B : Argumenter (salle de sport)",
    base: "Candidat : Cette publicité présente un abonnement avec cours d'essai gratuit…",
    variantes: [
      ["Objection prix", "« Ça doit être hors de prix »", "Réorienter sur le rapport qualité-prix"],
      ["Objection vécu", "« J'ai déjà essayé, ça n'a pas duré »", "Différencier l'offre d'une expérience passée"],
      ["Acceptation", "« D'accord, comment je m'inscris ? »", "Clôturer efficacement, pas juste convaincre"],
    ],
  },
];

// ── Lexique (vocabulary bank) ──
export interface LexiqueItem {
  domaine: string;
  stadeI: string;
  stadeII: string;
  stadeIII: string;
  exII: string;
  exIII: string;
}

export const lexique: LexiqueItem[] = [
  { domaine: "Identité & vie quotidienne", stadeI: "se lever, le matin, la famille, habiter", stadeII: "le quotidien, s'adapter, le mode de vie, le voisinage", stadeIII: "l'ancrage, la sociabilité, la métamorphose personnelle", exII: "s'habituer à un rythme", exIII: "trouver ses marques" },
  { domaine: "Logement & vie pratique", stadeI: "l'appartement, le loyer, la clé, déménager", stadeII: "le bail, la caution, l'état des lieux, les charges", stadeIII: "la copropriété, le litige locatif, la mise en demeure", exII: "signer un bail", exIII: "faire valoir ses droits" },
  { domaine: "Travail & recherche d'emploi", stadeI: "le travail, le patron, le salaire, embaucher", stadeII: "l'entretien d'embauche, la candidature, la période d'essai", stadeIII: "la reconversion, l'employabilité, le plafond de verre", exII: "décrocher un entretien", exIII: "monter en compétences" },
  { domaine: "Éducation & formation", stadeI: "l'école, le professeur, apprendre, le diplôme", stadeII: "la formation continue, l'équivalence de diplôme", stadeIII: "l'accréditation professionnelle, la VAE", exII: "faire reconnaître ses acquis", exIII: "obtenir une accréditation" },
  { domaine: "Santé & bien-être", stadeI: "le médecin, l'hôpital, malade, le rendez-vous", stadeII: "l'assurance maladie, le suivi médical, la clinique", stadeIII: "le parcours de soins, la résilience psychologique", exII: "consulter un spécialiste", exIII: "préserver son équilibre mental" },
  { domaine: "Administration, immigration", stadeI: "le formulaire, le document, signer", stadeII: "le dossier, le délai de traitement, l'admissibilité", stadeIII: "le système de classement global, la conformité", exII: "déposer une demande", exIII: "répondre aux critères d'admissibilité" },
  { domaine: "Société, actualité & médias", stadeI: "la nouvelle, le journal, regarder", stadeII: "l'actualité, le débat public, le sondage", stadeIII: "la polarisation, la désinformation, le biais médiatique", exII: "susciter un débat", exIII: "déjouer la désinformation" },
  { domaine: "Environnement", stadeI: "la nature, le climat, protéger", stadeII: "le réchauffement, le recyclage, le développement durable", stadeIII: "la transition énergétique, la sobriété, l'empreinte carbone", exII: "réduire son empreinte", exIII: "concilier croissance et durabilité" },
  { domaine: "Technologie & numérique", stadeI: "l'ordinateur, le téléphone, internet", stadeII: "l'application, le télétravail, la sécurité numérique", stadeIII: "l'intelligence artificielle, la fracture numérique", exII: "travailler à distance", exIII: "encadrer l'usage des données" },
  { domaine: "Consommation & finances", stadeI: "acheter, le prix, l'argent", stadeII: "le budget, l'épargne, le crédit", stadeIII: "la fiscalité, la planification financière", exII: "établir un budget", exIII: "optimiser sa fiscalité" },
  { domaine: "Relations sociales & culture", stadeI: "l'ami, la fête, sortir", stadeII: "le réseau social, l'intégration, la diversité culturelle", stadeIII: "le métissage culturel, la cohésion sociale", exII: "s'intégrer à une communauté", exIII: "favoriser le vivre-ensemble" },
  { domaine: "Voyage & mobilité", stadeI: "le train, l'avion, le billet", stadeII: "le transport en commun, l'itinéraire", stadeIII: "la mobilité durable, l'aménagement urbain", exII: "planifier un itinéraire", exIII: "favoriser une mobilité douce" },
  { domaine: "Droit, justice & citoyenneté", stadeI: "la loi, voter, le juge", stadeII: "les droits et libertés, le tribunal", stadeIII: "l'État de droit, la jurisprudence", exII: "exercer ses droits", exIII: "intenter un recours" },
  { domaine: "Sport & loisirs", stadeI: "jouer, le sport, le match", stadeII: "l'entraînement, la compétition, le club sportif", stadeIII: "le dépassement de soi, le fair-play", exII: "s'entraîner régulièrement", exIII: "repousser ses limites" },
  { domaine: "Alimentation & gastronomie", stadeI: "manger, la nourriture, cuisiner", stadeII: "l'alimentation équilibrée, le marché local", stadeIII: "la souveraineté alimentaire, le circuit court", exII: "adopter une alimentation équilibrée", exIII: "privilégier les circuits courts" },
  { domaine: "Arts, culture & médias", stadeI: "le film, la musique, le livre", stadeII: "l'exposition, le spectacle, le patrimoine", stadeIII: "la médiation culturelle, le rayonnement culturel", exII: "assister à un spectacle", exIII: "favoriser le rayonnement culturel" },
  { domaine: "Entrepreneuriat", stadeI: "l'entreprise, vendre, le client", stadeII: "le plan d'affaires, le financement, la concurrence", stadeIII: "la levée de fonds, la proposition de valeur", exII: "lancer un projet d'entreprise", exIII: "affiner sa proposition de valeur" },
  { domaine: "Politique & vie démocratique", stadeI: "le gouvernement, voter, l'élection", stadeII: "le débat démocratique, le scrutin, la réforme", stadeIII: "la gouvernance, la reddition de comptes", exII: "exercer son droit de vote", exIII: "exiger une reddition de comptes" },
  { domaine: "Sécurité & prévention", stadeI: "le danger, la sécurité, prévenir", stadeII: "la prévention des risques, le dispositif de sécurité", stadeIII: "le principe de précaution, la cybermenace", exII: "mettre en place un dispositif", exIII: "appliquer le principe de précaution" },
  { domaine: "Management & organisation", stadeI: "le chef, diriger, l'équipe", stadeII: "la gestion de projet, la délégation, l'échéance", stadeIII: "le management transversal, l'intelligence collective", exII: "respecter une échéance", exIII: "piloter la gestion du changement" },
];

// ── Traps guide ──
export interface TrapSection {
  title: string;
  tag: string;
  tagColor: string;
  traps: { name: string; description: string }[];
}

export const trapSections: TrapSection[] = [
  {
    title: "Compréhension écrite", tag: "CE", tagColor: "bg-red-100 text-red-700",
    traps: [
      { name: "P1 : Mot repris, sens détourné", description: "Le distracteur reprend un mot exact du texte mais dans un sens différent. Ne validez jamais une réponse juste parce que le mot apparaît dans le texte." },
      { name: "P2 : Donnée proche mais inexacte", description: "Chiffre, date ou heure très proche de la bonne réponse. Toujours relire la phrase exacte avant de répondre." },
      { name: "P3 : Vrai mais hors sujet", description: "L'info du distracteur est correcte mais ne répond pas à la question posée. Reformulez la question avant de lire les options." },
      { name: "P4 : Opinion rapportée confondue avec celle de l'auteur", description: "Repérez les connecteurs de nuance (« il serait toutefois réducteur de ») : la vraie thèse arrive souvent après." },
      { name: "P5 : Négation ou restriction cachée", description: "« Sauf », « à moins que », « ne… que » inversent souvent le sens général." },
      { name: "P6 : Sur-inférence", description: "Une conclusion semble logique mais n'est pas la SEULE possible à partir du texte. Si ce n'est pas la seule, ce n'est pas la bonne réponse." },
    ],
  },
  {
    title: "Compréhension orale", tag: "CO", tagColor: "bg-blue-100 text-blue-700",
    traps: [
      { name: "CO-P1 : Changement de plan en cours de message", description: "Attendez la fin complète avant de répondre : pas de retour en arrière possible." },
      { name: "CO-P2 : Mot mal interprété", description: "Deux mots proches à l'oral (reporter/rapporter). Entraînez-vous sur les paires proches." },
      { name: "CO-P3 : Le ton inverse le sens littéral", description: "Ironie et atténuation : un mot positif peut être ironique au stade III." },
      { name: "CO-P4 : Nombres/heures proches", description: "Attention à la syllabe finale des nombres français (« -ze » vs « -ante »)." },
      { name: "CO-P5 : Bruit de fond qui masque un détail", description: "Entraînez-vous volontairement avec du bruit ambiant réaliste." },
      { name: "CO-P6 : Confusion de degré/gravité", description: "Le plus fréquent : retard confondu avec annulation, panne temporaire avec fermeture définitive." },
      { name: "CO-P7 : Opinion nuancée réduite à une position tranchée", description: "Les meilleurs candidats résistent à l'envie de classer une opinion en « pour » ou « contre »." },
    ],
  },
  {
    title: "Expression écrite", tag: "EE", tagColor: "bg-green-100 text-green-700",
    traps: [
      { name: "1 : Longueur insuffisante", description: "Sous 80/200 mots, le critère « respect de la tâche » est automatiquement pénalisé, quelle que soit la qualité." },
      { name: "2 : Hors-sujet progressif", description: "Relisez la consigne à mi-parcours, pas seulement au début." },
      { name: "3 : Répétition lexicale", description: "Préparez 2-3 synonymes des mots-clés probables avant de rédiger." },
      { name: "4 : Absence de connecteur de nuance", description: "Plafonne le score à NCLC 6-7 même avec un bon vocabulaire." },
      { name: "5 : Déséquilibre argumentatif", description: "Au stade III : anticiper une objection et la réfuter, pas juste développer un seul argument." },
    ],
  },
  {
    title: "Expression orale", tag: "EO", tagColor: "bg-amber-100 text-amber-700",
    traps: [
      { name: "1 : Le script mémorisé", description: "S'effondre dès que l'examinateur dévie. Entraînez la réaction, pas une réponse fixe." },
      { name: "2 : Le silence prolongé", description: "Pénalise la fluidité. Utilisez des chevilles (« alors, voyons… ») pour combler la réflexion." },
      { name: "3 : Ne jamais relancer", description: "Plafonne le critère « Interaction », le plus déterminant de l'épreuve." },
      { name: "4 : Répondre au dernier mot sans reformuler", description: "Reformulez avant de répondre sur le fond." },
      { name: "5 : Le sujet ambigu", description: "Ne supposez jamais une info non donnée : demandez toujours." },
    ],
  },
];

// ── Barème officiel ──
export const bareme = {
  headers: ["NCLC", "CE /300", "CO /360", "EE /450", "EO /450"],
  rows: [
    ["4", "121-150", "145-180", "181-225", "181-225"],
    ["5", "151-180", "181-216", "226-270", "226-270"],
    ["6", "181-206", "217-248", "271-309", "271-309"],
    ["7 ⭐", "207-232", "249-279", "310-348", "310-348"],
    ["8", "233-247", "280-297", "349-370", "349-370"],
    ["9", "248-262", "298-315", "371-392", "371-392"],
    ["10", "263-277", "316-333", "393-415", "393-415"],
    ["11-12", "278-300", "334-360", "416-450", "416-450"],
  ],
};
