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
  { q: "Je dois ___ un formulaire pour ma demande.", choices: ["ecrire", "remplir", "lire"], correct: 1 },
  { q: "Le ___ a bien fonctionne : nous avons trouve un appartement en une semaine.", choices: ["hasard", "reseau", "bruit"], correct: 1 },
  { q: "___, cette solution presente aussi des inconvenients.", choices: ["Cependant", "Il n'en demeure pas moins que", "Et"], correct: 1 },
  { q: "On aurait tort de reduire ce debat a une opposition ___.", choices: ["interessante", "simpliste", "rapide"], correct: 1 },
  { q: "Bien qu'il ___ fatigue, il a termine son travail.", choices: ["est", "soit", "sera"], correct: 1 },
  { q: "C'est le collegue ___ je t'ai parle hier.", choices: ["que", "dont", "qui"], correct: 1 },
  { q: "Non seulement il est arrive en retard, ___ il a oublie ses documents.", choices: ["et", "mais encore", "donc"], correct: 1 },
  { q: "On ne saurait ___ que cette reforme comporte des risques.", choices: ["dire", "nier", "croire"], correct: 1 },
];

// ── CE (Comprehension ecrite) exercises ──
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
    text: "Grand 3 pieces, 2e etage, proche des transports. Cuisine equipee. Loyer : 950 $/mois, charges non comprises. Disponible des le 1er du mois prochain. Caution d'un mois exigee. Visites : lundi-vendredi, 9h-17h.",
    questions: [
      { q: "Quel est le montant du loyer mensuel ?", choices: [{ t: "850 $", piege: "Piege P2", exp: "Donnee proche du vrai chiffre — toujours relire la phrase exacte." }, { t: "950 $" }, { t: "1050 $", piege: "Piege P2", exp: "Donnee proche du vrai chiffre." }], correct: 1 },
      { q: "Les charges sont-elles incluses ?", choices: [{ t: "Non" }, { t: "Oui", piege: "Piege P5", exp: "Contredit directement 'charges non comprises' — une negation manquee inverse tout le sens." }, { t: "Partiellement", piege: "Piege P6", exp: "Sur-inference : cette nuance n'existe pas dans le texte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Travail (teletravail) · NCLC 7",
    text: "De plus en plus d'entreprises quebecoises adoptent le teletravail hybride. 62% des employes estiment que cette formule ameliore leur equilibre de vie. Cependant, certains gestionnaires s'inquietent d'une perte de cohesion d'equipe. Plusieurs organisations ont mis en place des rencontres hebdomadaires obligatoires en presentiel.",
    questions: [
      { q: "Quelle est l'idee principale du texte ?", choices: [{ t: "Le teletravail est interdit" }, { t: "Le teletravail hybride souleve avantages et inquietudes" }, { t: "Les employes preferent le bureau", piege: "Piege P4", exp: "Confond l'opinion rapportee des gestionnaires avec la these generale du texte." }], correct: 1 },
      { q: "Pourquoi des rencontres hebdomadaires sont-elles imposees ?", choices: [{ t: "Pour reduire les couts", piege: "Piege P6", exp: "Cause plausible en general mais absente de ce texte precis." }, { t: "Pour preserver la cohesion d'equipe" }, { t: "Pour evaluer les employes", piege: "Piege P6", exp: "Sur-inference non soutenue par le texte." }], correct: 1 },
    ],
  },
  {
    meta: "Famille D · Editorial IA · NCLC 9",
    text: "On aurait tort de reduire le debat sur l'IA en education a une opposition simpliste entre progres et menace. Il serait toutefois reducteur de n'y voir qu'une menace : nombre d'organisations y trouvent un levier pour repenser leur culture d'entreprise, a condition d'accompagner cette transition par une formation continue adequate.",
    questions: [
      { q: "L'expression 'il serait reducteur de' indique que l'auteur...", choices: [{ t: "Approuve totalement l'idee precedente", piege: "Piege P1", exp: "Sens quasi oppose — l'expression nuance, elle ne valide pas." }, { t: "Nuance une vision trop simpliste" }, { t: "Rejette categoriquement une opinion", piege: "Piege P1", exp: "Trop extreme par rapport au ton mesure du texte." }], correct: 1 },
      { q: "Le mot 'levier' dans ce contexte signifie :", choices: [{ t: "Un outil de mesure" }, { t: "Un moyen d'action pour progresser" }, { t: "Une contrainte legale", piege: "Piege P1", exp: "Faux sens frequent par association erronee avec la reglementation." }], correct: 1 },
    ],
  },
  {
    meta: "Famille C · Lecture rapide (grille tarifaire) · NCLC 6",
    text: "Formule Essentiel : 29$/mois, musculation seulement. Formule Confort : 45$/mois, musculation + cours collectifs. Formule Premium : 65$/mois, acces illimite + piscine.",
    questions: [
      { q: "Quelle formule inclut la piscine ?", choices: [{ t: "Essentiel" }, { t: "Confort" }, { t: "Premium" }], correct: 2 },
      { q: "Quelle est la difference de prix entre Essentiel et Confort ?", choices: [{ t: "10 $", piege: "Piege P2", exp: "Erreur de calcul plausible en lecture rapide." }, { t: "16 $" }, { t: "20 $", piege: "Piege P2", exp: "Erreur de calcul plausible." }], correct: 1 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire · NCLC 9",
    text: "Il n'en demeure pas moins que la transition energetique, aussi ___(1)___ soit-elle sur le plan ecologique, ne saurait s'operer sans une reflexion approfondie sur ses consequences sociales.",
    questions: [
      { q: "Blanc (1) — quel mot convient ?", choices: [{ t: "necessaire" }, { t: "inutile", piege: "Piege P5", exp: "Antonyme direct qui inverserait le sens de toute la phrase." }, { t: "simple", piege: "Piege P1", exp: "Sens trop faible par rapport au registre soutenu du texte." }], correct: 0 },
    ],
  },
];

// ── CO (Comprehension orale) exercises ──
export const coItems: QuizItem[] = [
  {
    meta: "Section A · Dialogue court · NCLC 5",
    text: "— Excusez-moi, vous savez ou se trouve l'arret d'autobus le plus proche ?\n— Oui, continuez tout droit, puis tournez a gauche apres la pharmacie. L'arret est juste en face du parc.\n— Merci beaucoup !",
    questions: [{ q: "Quelle image correspond a cette conversation ?", choices: [{ t: "Une personne qui achete un billet de train" }, { t: "Une personne qui demande son chemin" }, { t: "Une personne qui attend un ami au parc", piege: "Piege CO-P2", exp: "Le parc n'est qu'un repere geographique donne dans la reponse, pas le sujet." }], correct: 1 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 7",
    text: "« Mesdames et messieurs, en raison d'un incident technique, le train a destination de Quebec prevu a 14h15 partira avec un retard estime de vingt minutes. Nous vous prions de nous excuser. »",
    questions: [{ q: "Quel est l'objectif de cette annonce ?", choices: [{ t: "Annoncer l'annulation d'un train", piege: "Piege CO-P6", exp: "Confond un simple retard avec une annulation complete — le piege le plus frequent en Section B." }, { t: "Informer les passagers d'un retard" }, { t: "Proposer un remboursement", piege: "Piege CO-P6", exp: "Rien dans le texte n'evoque un remboursement." }], correct: 1 }],
  },
  {
    meta: "Section C · Message repondeur · NCLC 7",
    text: "« Bonjour, c'est Sophie. J'ai un empechement de derniere minute pour notre rendez-vous de demain — mon fils est malade. Est-ce qu'on pourrait plutot se voir jeudi ? Rappelle-moi. »",
    questions: [{ q: "Pourquoi Sophie appelle-t-elle ?", choices: [{ t: "Pour annuler definitivement", piege: "Piege CO-P6", exp: "Report ≠ annulation — piege classique de cette section." }, { t: "Pour reporter un rendez-vous" }, { t: "Pour confirmer un rendez-vous", piege: "Piege CO-P6", exp: "Contredit le contenu du message." }], correct: 1 }],
  },
  {
    meta: "Section D · Micro-trottoir · NCLC 9",
    text: "« Le teletravail... Franchement, ceux qui pensent que c'est la solution miracle n'ont probablement jamais gere une equipe a distance. Ceci dit, je ne dirais pas non plus que c'est catastrophique. »",
    questions: [{ q: "Quel est le point de vue de la personne ?", choices: [{ t: "Le teletravail est une excellente solution sans reserve", piege: "Piege CO-P3 + CO-P7", exp: "'Solution miracle' est ironique, pas positif — c'est le script le plus piegeux de la banque." }, { t: "Le teletravail est un echec total", piege: "Piege CO-P7", exp: "Reduit une position nuancee a un extreme." }, { t: "Position nuancee, a condition de repenser la collaboration" }], correct: 2 }],
  },
];

// ── EE (Expression ecrite) model texts ──
export interface EEItem {
  sujet: string;
  n6: string;
  n9: string;
}

export const eeItems: EEItem[] = [
  {
    sujet: "Section A — Fait divers : « Hier soir, les pompiers sont intervenus dans un immeuble du centre-ville apres qu'un voisin a signale une forte odeur de fumee... » Continuez cet article.",
    n6: "Les pompiers sont arrives rapidement. Ils ont decouvert que la fumee venait d'une casserole oubliee sur la cuisiniere. Personne n'etait blesse, mais l'appartement etait rempli de fumee. La locataire dormait dans une autre piece et n'avait rien remarque. Les pompiers ont aere l'appartement et explique les dangers de laisser la cuisine sans surveillance. (78 mots)",
    n9: "Les pompiers, alertes a 22h precises, sont intervenus avec une rapidite remarquable. Il s'est avere que l'incident, quoique impressionnant par la fumee degagee, ne presentait heureusement aucun danger reel : une casserole oubliee sur le feu en etait l'unique cause. Ce n'est qu'au moment ou les pompiers ont frappe energiquement a sa porte que la locataire a realise l'ampleur de ce qui aurait pu etre un veritable drame. (115 mots)",
  },
  {
    sujet: "Section B — Argumentation : « Certaines entreprises imposent un retour obligatoire au bureau apres plusieurs annees de teletravail. Qu'en pensez-vous ? »",
    n6: "A mon avis, cette question ne doit pas etre tranchee de facon radicale. Le teletravail presente de vrais avantages : moins de transport, plus de flexibilite. Cependant, le bureau reste important pour la communication entre collegues. C'est pourquoi je pense qu'un modele hybride serait la meilleure solution. (56 mots — a etoffer jusqu'a 200)",
    n9: "Il serait sans doute excessif de trancher cette question de maniere binaire. Certes, on ne saurait nier que le teletravail a permis a beaucoup de retrouver un meilleur equilibre. Il n'en demeure pas moins que la dimension collective du travail — la spontaneite des echanges informels — se trouve fragilisee par un eloignement prolonge. Des lors, il conviendrait sans doute d'envisager une organisation modulable plutot qu'une opposition binaire. (98 mots — a etoffer jusqu'a 200)",
  },
];

// ── EE Grading grid ──
export const eeGrille = {
  headers: ["Critere", "NCLC 5-6", "NCLC 7", "NCLC 8-9"],
  rows: [
    ["Respect de la tache", "Structure basique", "+ ton adapte", "Nuances de registre"],
    ["Organisation", "et, mais, donc", "cependant, par ailleurs", "neanmoins, il n'en demeure pas moins que"],
    ["Richesse lexicale", "Repetitions tolerees", "Synonymes basiques", "Precis, sans repetition"],
    ["Grammaire", "Erreurs frequentes", "Erreurs occasionnelles", "Quasi sans erreur"],
    ["5e critere (A: narratif / B: argumentatif)", "Simple", "Structure", "Nuance, contre-argument anticipe"],
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
    titre: "Section A — Obtenir des renseignements : logement",
    base: "Candidat : Bonjour, je vous appelle pour l'appartement en ligne. Il est encore disponible ?",
    variantes: [
      ["Objection", "« En fait, il vient d'etre loue il y a une heure »", "Rebondir, demander d'autres biens"],
      ["Question retour", "« Vous cherchez pour combien de temps ? »", "Repondre du tac au tac"],
      ["Acceptation", "Propose directement une visite", "Savoir conclure efficacement"],
    ],
  },
  {
    titre: "Section B — Argumenter : salle de sport",
    base: "Candidat : Cette publicite presente un abonnement avec cours d'essai gratuit...",
    variantes: [
      ["Objection prix", "« Ca doit etre hors de prix »", "Reorienter sur le rapport qualite-prix"],
      ["Objection vecu", "« J'ai deja essaye, ca n'a pas dure »", "Differencier l'offre d'une experience passee"],
      ["Acceptation", "« D'accord, comment je m'inscris ? »", "Cloturer efficacement, pas juste convaincre"],
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
  { domaine: "Identite & vie quotidienne", stadeI: "se lever, le matin, la famille, habiter", stadeII: "le quotidien, s'adapter, le mode de vie, le voisinage", stadeIII: "l'ancrage, la sociabilite, la metamorphose personnelle", exII: "s'habituer a un rythme", exIII: "trouver ses marques" },
  { domaine: "Logement & vie pratique", stadeI: "l'appartement, le loyer, la cle, demenager", stadeII: "le bail, la caution, l'etat des lieux, les charges", stadeIII: "la copropriete, le litige locatif, la mise en demeure", exII: "signer un bail", exIII: "faire valoir ses droits" },
  { domaine: "Travail & recherche d'emploi", stadeI: "le travail, le patron, le salaire, embaucher", stadeII: "l'entretien d'embauche, la candidature, la periode d'essai", stadeIII: "la reconversion, l'employabilite, le plafond de verre", exII: "decrocher un entretien", exIII: "monter en competences" },
  { domaine: "Education & formation", stadeI: "l'ecole, le professeur, apprendre, le diplome", stadeII: "la formation continue, l'equivalence de diplome", stadeIII: "l'accreditation professionnelle, la VAE", exII: "faire reconnaitre ses acquis", exIII: "obtenir une accreditation" },
  { domaine: "Sante & bien-etre", stadeI: "le medecin, l'hopital, malade, le rendez-vous", stadeII: "l'assurance maladie, le suivi medical, la clinique", stadeIII: "le parcours de soins, la resilience psychologique", exII: "consulter un specialiste", exIII: "preserver son equilibre mental" },
  { domaine: "Administration, immigration", stadeI: "le formulaire, le document, signer", stadeII: "le dossier, le delai de traitement, l'admissibilite", stadeIII: "le systeme de classement global, la conformite", exII: "deposer une demande", exIII: "repondre aux criteres d'admissibilite" },
  { domaine: "Societe, actualite & medias", stadeI: "la nouvelle, le journal, regarder", stadeII: "l'actualite, le debat public, le sondage", stadeIII: "la polarisation, la desinformation, le biais mediatique", exII: "susciter un debat", exIII: "dejouer la desinformation" },
  { domaine: "Environnement", stadeI: "la nature, le climat, proteger", stadeII: "le rechauffement, le recyclage, le developpement durable", stadeIII: "la transition energetique, la sobriete, l'empreinte carbone", exII: "reduire son empreinte", exIII: "concilier croissance et durabilite" },
  { domaine: "Technologie & numerique", stadeI: "l'ordinateur, le telephone, internet", stadeII: "l'application, le teletravail, la securite numerique", stadeIII: "l'intelligence artificielle, la fracture numerique", exII: "travailler a distance", exIII: "encadrer l'usage des donnees" },
  { domaine: "Consommation & finances", stadeI: "acheter, le prix, l'argent", stadeII: "le budget, l'epargne, le credit", stadeIII: "la fiscalite, la planification financiere", exII: "etablir un budget", exIII: "optimiser sa fiscalite" },
  { domaine: "Relations sociales & culture", stadeI: "l'ami, la fete, sortir", stadeII: "le reseau social, l'integration, la diversite culturelle", stadeIII: "le metissage culturel, la cohesion sociale", exII: "s'integrer a une communaute", exIII: "favoriser le vivre-ensemble" },
  { domaine: "Voyage & mobilite", stadeI: "le train, l'avion, le billet", stadeII: "le transport en commun, l'itineraire", stadeIII: "la mobilite durable, l'amenagement urbain", exII: "planifier un itineraire", exIII: "favoriser une mobilite douce" },
  { domaine: "Droit, justice & citoyennete", stadeI: "la loi, voter, le juge", stadeII: "les droits et libertes, le tribunal", stadeIII: "l'Etat de droit, la jurisprudence", exII: "exercer ses droits", exIII: "intenter un recours" },
  { domaine: "Sport & loisirs", stadeI: "jouer, le sport, le match", stadeII: "l'entrainement, la competition, le club sportif", stadeIII: "le depassement de soi, le fair-play", exII: "s'entrainer regulierement", exIII: "repousser ses limites" },
  { domaine: "Alimentation & gastronomie", stadeI: "manger, la nourriture, cuisiner", stadeII: "l'alimentation equilibree, le marche local", stadeIII: "la souverainete alimentaire, le circuit court", exII: "adopter une alimentation equilibree", exIII: "privilegier les circuits courts" },
  { domaine: "Arts, culture & medias", stadeI: "le film, la musique, le livre", stadeII: "l'exposition, le spectacle, le patrimoine", stadeIII: "la mediation culturelle, le rayonnement culturel", exII: "assister a un spectacle", exIII: "favoriser le rayonnement culturel" },
  { domaine: "Entrepreneuriat", stadeI: "l'entreprise, vendre, le client", stadeII: "le plan d'affaires, le financement, la concurrence", stadeIII: "la levee de fonds, la proposition de valeur", exII: "lancer un projet d'entreprise", exIII: "affiner sa proposition de valeur" },
  { domaine: "Politique & vie democratique", stadeI: "le gouvernement, voter, l'election", stadeII: "le debat democratique, le scrutin, la reforme", stadeIII: "la gouvernance, la reddition de comptes", exII: "exercer son droit de vote", exIII: "exiger une reddition de comptes" },
  { domaine: "Securite & prevention", stadeI: "le danger, la securite, prevenir", stadeII: "la prevention des risques, le dispositif de securite", stadeIII: "le principe de precaution, la cybermenace", exII: "mettre en place un dispositif", exIII: "appliquer le principe de precaution" },
  { domaine: "Management & organisation", stadeI: "le chef, diriger, l'equipe", stadeII: "la gestion de projet, la delegation, l'echeance", stadeIII: "le management transversal, l'intelligence collective", exII: "respecter une echeance", exIII: "piloter la gestion du changement" },
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
    title: "Comprehension ecrite", tag: "CE", tagColor: "bg-red-100 text-red-700",
    traps: [
      { name: "P1 — Mot repris, sens detourne", description: "Le distracteur reprend un mot exact du texte mais dans un sens different. Ne validez jamais une reponse juste parce que le mot apparait dans le texte." },
      { name: "P2 — Donnee proche mais inexacte", description: "Chiffre, date ou heure tres proche de la bonne reponse. Toujours relire la phrase exacte avant de repondre." },
      { name: "P3 — Vrai mais hors sujet", description: "L'info du distracteur est correcte mais ne repond pas a la question posee. Reformulez la question avant de lire les options." },
      { name: "P4 — Opinion rapportee confondue avec celle de l'auteur", description: "Reperez les connecteurs de nuance ('il serait toutefois reducteur de') : la vraie these arrive souvent apres." },
      { name: "P5 — Negation ou restriction cachee", description: "'Sauf', 'a moins que', 'ne... que' inversent souvent le sens general." },
      { name: "P6 — Sur-inference", description: "Une conclusion semble logique mais n'est pas la SEULE possible a partir du texte. Si ce n'est pas la seule, ce n'est pas la bonne reponse." },
    ],
  },
  {
    title: "Comprehension orale", tag: "CO", tagColor: "bg-blue-100 text-blue-700",
    traps: [
      { name: "CO-P1 — Changement de plan en cours de message", description: "Attendez la fin complete avant de repondre — pas de retour en arriere possible." },
      { name: "CO-P2 — Mot mal interprete", description: "Deux mots proches a l'oral (reporter/rapporter). Entrainez-vous sur les paires proches." },
      { name: "CO-P3 — Le ton inverse le sens litteral", description: "Ironie et attenuation — un mot positif peut etre ironique au stade III." },
      { name: "CO-P4 — Nombres/heures proches", description: "Attention a la syllabe finale des nombres francais ('-ze' vs '-ante')." },
      { name: "CO-P5 — Bruit de fond qui masque un detail", description: "Entrainez-vous volontairement avec du bruit ambiant realiste." },
      { name: "CO-P6 — Confusion de degre/gravite", description: "Le plus frequent : retard confondu avec annulation, panne temporaire avec fermeture definitive." },
      { name: "CO-P7 — Opinion nuancee reduite a une position tranchee", description: "Les meilleurs candidats resistent a l'envie de classer une opinion en 'pour' ou 'contre'." },
    ],
  },
  {
    title: "Expression ecrite", tag: "EE", tagColor: "bg-green-100 text-green-700",
    traps: [
      { name: "1 — Longueur insuffisante", description: "Sous 80/200 mots, le critere 'respect de la tache' est automatiquement penalise, quelle que soit la qualite." },
      { name: "2 — Hors-sujet progressif", description: "Relisez la consigne a mi-parcours, pas seulement au debut." },
      { name: "3 — Repetition lexicale", description: "Preparez 2-3 synonymes des mots-cles probables avant de rediger." },
      { name: "4 — Absence de connecteur de nuance", description: "Plafonne le score a NCLC 6-7 meme avec un bon vocabulaire." },
      { name: "5 — Desequilibre argumentatif", description: "Au stade III : anticiper une objection et la refuter, pas juste developper un seul argument." },
    ],
  },
  {
    title: "Expression orale", tag: "EO", tagColor: "bg-amber-100 text-amber-700",
    traps: [
      { name: "1 — Le script memorise", description: "S'effondre des que l'examinateur devie. Entrainez la reaction, pas une reponse fixe." },
      { name: "2 — Le silence prolonge", description: "Penalise la fluidite. Utilisez des chevilles ('alors, voyons...') pour combler la reflexion." },
      { name: "3 — Ne jamais relancer", description: "Plafonne le critere 'Interaction', le plus determinant de l'epreuve." },
      { name: "4 — Repondre au dernier mot sans reformuler", description: "Reformulez avant de repondre sur le fond." },
      { name: "5 — Le sujet ambigu", description: "Ne supposez jamais une info non donnee — demandez toujours." },
    ],
  },
];

// ── Bareme officiel ──
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
