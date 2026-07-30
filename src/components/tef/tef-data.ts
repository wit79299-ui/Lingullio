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
  img?: string;  // optional image path for image-based questions (CO Section A)
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
  // ── Nouveaux exercices CE ──
  {
    meta: "Famille A · Santé · NCLC 5",
    text: "Clinique Sans Rendez-Vous. Ouverte du lundi au vendredi, 8 h-20 h. Samedi 9 h-17 h. Fermée le dimanche et les jours fériés. Carte d'assurance maladie obligatoire. Temps d'attente moyen : 45 minutes.",
    questions: [
      { q: "Quand la clinique est-elle fermée ?", choices: [{ t: "Le samedi et le dimanche" }, { t: "Le dimanche et les jours fériés" }, { t: "Uniquement le dimanche", piege: "Piège P3", exp: "Information partielle : les jours fériés sont aussi mentionnés." }], correct: 1 },
      { q: "Quel document faut-il apporter ?", choices: [{ t: "Une pièce d'identité", piege: "Piège P6", exp: "Plausible mais non mentionné dans le texte." }, { t: "Une carte d'assurance maladie" }, { t: "Une ordonnance", piege: "Piège P6", exp: "Sur-inférence : ce n'est pas une pharmacie." }], correct: 1 },
    ],
  },
  {
    meta: "Famille A · Transport · NCLC 5",
    text: "Avis aux usagers : à compter du 15 septembre, la ligne 7 du métro sera interrompue entre les stations Berri-UQAM et Jean-Talon pour travaux de maintenance. Un service d'autobus de remplacement sera offert. Durée prévue : 3 semaines.",
    questions: [
      { q: "Quelle est la cause de l'interruption ?", choices: [{ t: "Une grève des employés" }, { t: "Des travaux de maintenance" }, { t: "Un accident technique", piege: "Piège P1", exp: "Mot « technique » proche mais le texte dit « maintenance »." }], correct: 1 },
      { q: "Comment les usagers pourront-ils se déplacer ?", choices: [{ t: "En taxi gratuit" }, { t: "En autobus de remplacement" }, { t: "Par une autre ligne de métro", piege: "Piège P6", exp: "Pas mentionné dans le texte." }], correct: 1 },
    ],
  },
  {
    meta: "Famille C · Offre d'emploi · NCLC 6",
    text: "Poste : Assistant administratif. Salaire : 22 $/h. Contrat : temps plein, 35 h/semaine. Exigences : DEC en bureautique, 2 ans d'expérience minimum, bilingue (français-anglais). Avantages : assurance collective, 3 semaines de vacances après 1 an.",
    questions: [
      { q: "Quel est le salaire hebdomadaire approximatif ?", choices: [{ t: "700 $" }, { t: "770 $" }, { t: "880 $", piege: "Piège P2", exp: "Erreur de calcul : 22 × 35 = 770, pas 880." }], correct: 1 },
      { q: "Quelle condition n'est PAS mentionnée ?", choices: [{ t: "Un diplôme en bureautique" }, { t: "La maîtrise de trois langues" }, { t: "Deux ans d'expérience" }], correct: 1 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire · NCLC 7",
    text: "La ___(1)___ culturelle du Québec se manifeste à travers ses festivals, sa gastronomie et sa littérature. Cette province a su préserver son identité ___(2)___ tout en accueillant des influences du monde entier.",
    questions: [
      { q: "Blanc (1) : quel mot convient ?", choices: [{ t: "richesse" }, { t: "pauvreté", piege: "Piège P5", exp: "Antonyme qui contredit le reste de la phrase." }, { t: "difficulté", piege: "Piège P1", exp: "Sens incompatible avec festivals, gastronomie, littérature." }], correct: 0 },
      { q: "Blanc (2) : quel mot convient ?", choices: [{ t: "linguistique" }, { t: "économique", piege: "Piège P3", exp: "Vrai en soi mais hors sujet dans ce contexte culturel." }, { t: "sportive" }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Immigration · NCLC 7",
    text: "Le Programme des travailleurs qualifiés du Québec évalue les candidats selon plusieurs critères : la scolarité, l'expérience professionnelle, la connaissance du français et de l'anglais, ainsi que l'âge. Un minimum de 50 points est nécessaire pour être sélectionné. La connaissance du français est le critère le plus pondéré.",
    questions: [
      { q: "Quel critère a le plus de poids ?", choices: [{ t: "L'expérience professionnelle", piege: "Piège P3", exp: "Critère réel mais pas le plus pondéré." }, { t: "La connaissance du français" }, { t: "L'âge du candidat", piege: "Piège P3", exp: "Critère mentionné mais pas le principal." }], correct: 1 },
      { q: "Combien de points faut-il pour être sélectionné ?", choices: [{ t: "40 points" }, { t: "50 points" }, { t: "60 points", piege: "Piège P2", exp: "Chiffre proche mais inexact." }], correct: 1 },
    ],
  },
  {
    meta: "Famille D · Éditorial éducation · NCLC 8",
    text: "Force est de constater que le système éducatif québécois, malgré des investissements conséquents, peine à réduire le décrochage scolaire en milieu défavorisé. Les solutions proposées oscillent entre un encadrement renforcé et une refonte pédagogique plus individualisée. Toutefois, aucune approche unique ne saurait résoudre à elle seule un problème aussi structurel.",
    questions: [
      { q: "Selon l'auteur, le problème du décrochage est :", choices: [{ t: "Facile à résoudre avec plus de budget", piege: "Piège P4", exp: "Simplifie la thèse de l'auteur qui parle d'un problème « structurel »." }, { t: "Complexe et nécessite plusieurs approches" }, { t: "Uniquement lié au manque de financement", piege: "Piège P6", exp: "Le texte mentionne les investissements comme déjà « conséquents »." }], correct: 1 },
    ],
  },
  {
    meta: "Famille C · Comparatif de forfaits · NCLC 6",
    text: "Forfait Découverte : 5 cours/mois, 120 $. Forfait Régulier : 10 cours/mois, 200 $. Forfait Illimité : cours illimités, 280 $. Tous les forfaits incluent l'accès au vestiaire. Seul le forfait Illimité donne accès au sauna.",
    questions: [
      { q: "Quel est le coût par cours du forfait Régulier ?", choices: [{ t: "24 $", piege: "Piège P2", exp: "200/10 = 20, pas 24." }, { t: "20 $" }, { t: "28 $", piege: "Piège P2", exp: "C'est le prix par cours du forfait Illimité divisé par 10." }], correct: 1 },
      { q: "Le sauna est accessible avec quel(s) forfait(s) ?", choices: [{ t: "Tous les forfaits", piege: "Piège P5", exp: "Le mot « seul » est restrictif : « seul le forfait Illimité »." }, { t: "Régulier et Illimité" }, { t: "Illimité uniquement" }], correct: 2 },
    ],
  },
  {
    meta: "Famille A · Annonce communautaire · NCLC 5",
    text: "Fête de quartier le samedi 21 juin, de 10 h à 16 h, au parc Lafontaine. Activités gratuites pour toute la famille : jeux gonflables, maquillage, spectacle de magie à 14 h. Restauration sur place (prix variés). En cas de pluie, l'événement est reporté au dimanche.",
    questions: [
      { q: "Toutes les activités sont-elles gratuites ?", choices: [{ t: "Oui, tout est gratuit", piege: "Piège P5", exp: "La restauration est payante : « prix variés »." }, { t: "Non, la restauration est payante" }, { t: "Non, le spectacle est payant", piege: "Piège P3", exp: "Le spectacle fait partie des « activités gratuites »." }], correct: 1 },
    ],
  },
  {
    meta: "Famille D · Chronique économique · NCLC 9",
    text: "On ne saurait réduire la question de l'inflation à un simple déséquilibre entre l'offre et la demande. Des facteurs géopolitiques, des ruptures dans les chaînes d'approvisionnement et des politiques monétaires expansionnistes concourent à un phénomène dont la complexité défie les analyses linéaires. Quoique les banques centrales disposent d'outils éprouvés, leur efficacité se trouve remise en question dans un contexte de dette publique historiquement élevée.",
    questions: [
      { q: "L'auteur considère que l'inflation :", choices: [{ t: "A une cause unique et identifiable", piege: "Piège P4", exp: "Contredit directement la thèse de l'auteur sur la complexité." }, { t: "Est un phénomène multi-causal et complexe" }, { t: "Est principalement due aux banques centrales", piege: "Piège P3", exp: "Les banques centrales sont un facteur parmi d'autres, pas la cause principale." }], correct: 1 },
      { q: "Le mot « quoique » introduit :", choices: [{ t: "Une confirmation de l'idée précédente" }, { t: "Une concession (nuance)", }, { t: "Une contradiction totale", piege: "Piège P1", exp: "« Quoique » est concessif, pas contradictoire." }], correct: 1 },
    ],
  },
  {
    meta: "Famille B · Courriel professionnel · NCLC 7",
    text: "Objet : Modification des horaires. Bonjour à tous, veuillez noter que, dès le 1er octobre, les bureaux ouvriront à 8 h 30 au lieu de 9 h. La pause déjeuner sera réduite de 60 à 45 minutes. En contrepartie, la journée se terminera à 16 h 30 au lieu de 17 h. Cordialement, La Direction.",
    questions: [
      { q: "Quel est le nouvel horaire de fin de journée ?", choices: [{ t: "17 h", piege: "Piège P1", exp: "C'est l'ancien horaire, pas le nouveau." }, { t: "16 h 30" }, { t: "16 h", piege: "Piège P2", exp: "Chiffre proche mais inexact." }], correct: 1 },
      { q: "Le temps de travail total change-t-il ?", choices: [{ t: "Oui, il augmente d'une heure" }, { t: "Non, il reste le même (7 h 45)" }, { t: "Oui, il diminue", piege: "Piège P2", exp: "8h30-16h30 avec 45 min pause = 7h15 vs 9h-17h avec 60 min = 7h. Le temps augmente légèrement." }], correct: 0 },
    ],
  },
  // ── 15 nouveaux exercices CE (fichier CE_Entrainement_Ajout15) ──
  {
    meta: "Famille A · Ouverture succursale · NCLC 5",
    text: "Ouverture d'une nouvelle succursale de la banque, lundi prochain, au 88 boulevard Saint-Laurent. Café et pâtisseries offerts aux premiers 50 visiteurs, dès 9h.",
    questions: [
      { q: "Que reçoivent les 50 premiers visiteurs ?", choices: [{ t: "Café et pâtisseries" }, { t: "Un cadeau surprise", piege: "Piège P6", exp: "Plausible pour une ouverture mais non mentionné." }, { t: "Un rabais bancaire", piege: "Piège P6", exp: "Sur-inférence non soutenue par le texte." }], correct: 0 },
      { q: "À partir de quelle heure ?", choices: [{ t: "9h" }, { t: "8h", piege: "Piège P2", exp: "Heure proche, teste la lecture précise." }, { t: "10h", piege: "Piège P2", exp: "Heure proche." }], correct: 0 },
    ],
  },
  {
    meta: "Famille A · Navette gratuite · NCLC 6",
    text: "Le service de navette gratuite vers le centre commercial fonctionne désormais tous les jours, y compris les jours fériés, de 9h à 21h, départ toutes les 20 minutes depuis la station de métro.",
    questions: [
      { q: "La navette fonctionne-t-elle les jours fériés ?", choices: [{ t: "Oui" }, { t: "Non", piege: "Piège P5", exp: "Contredit « y compris les jours fériés »." }, { t: "Seulement certains jours fériés", piege: "Piège P6", exp: "Nuance absente du texte." }], correct: 0 },
      { q: "Toutes les combien de minutes part la navette ?", choices: [{ t: "20 minutes" }, { t: "30 minutes", piege: "Piège P2", exp: "Intervalle plausible mais inexact." }, { t: "15 minutes", piege: "Piège P2", exp: "Intervalle plausible mais inexact." }], correct: 0 },
    ],
  },
  {
    meta: "Famille A · Garde d'enfants · NCLC 5",
    text: "Recherche gardienne pour deux enfants (5 et 8 ans), les mercredis après-midi de 13h à 17h. Expérience avec jeunes enfants requise. Salaire : 16$/heure. Doit habiter à distance de marche.",
    questions: [
      { q: "Quel jour la gardienne est-elle nécessaire ?", choices: [{ t: "Le mercredi" }, { t: "Le samedi", piege: "Piège P6", exp: "Jour plausible pour de la garde mais non mentionné." }, { t: "Tous les jours", piege: "Piège P5", exp: "Contredit « les mercredis » seulement." }], correct: 0 },
      { q: "Quelle condition de localisation est exigée ?", choices: [{ t: "Habiter à distance de marche" }, { t: "Avoir une voiture", piege: "Piège P1", exp: "Inverse le sens, le texte demande justement l'absence de besoin de véhicule." }, { t: "Habiter dans le même immeuble", piege: "Piège P6", exp: "Plus restrictif que ce qui est réellement demandé." }], correct: 0 },
    ],
  },
  {
    meta: "Famille A · Centre sportif · NCLC 6",
    text: "Le centre sportif municipal offre désormais des cours d'essai gratuits pour toutes ses activités durant la première semaine de septembre. Aucune inscription préalable requise, présentez-vous simplement 15 minutes avant le début du cours.",
    questions: [
      { q: "Faut-il s'inscrire à l'avance pour le cours d'essai ?", choices: [{ t: "Non" }, { t: "Oui, en ligne", piege: "Piège P5", exp: "Contredit « aucune inscription préalable requise »." }, { t: "Oui, par téléphone", piege: "Piège P5", exp: "Même contradiction." }], correct: 0 },
      { q: "Combien de temps avant le cours faut-il arriver ?", choices: [{ t: "15 minutes" }, { t: "30 minutes", piege: "Piège P2", exp: "Durée plausible mais inexacte." }, { t: "5 minutes", piege: "Piège P2", exp: "Durée plausible mais inexacte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire (commande) · NCLC 6",
    text: "Bonjour Madame Tremblay, je vous écris ___(1)___ vous informer que votre commande est prête à être récupérée en magasin. Vous avez jusqu'au 15 du mois ___(2)___ venir la chercher, après quoi elle sera remise en vente.",
    questions: [
      { q: "Blanc (1) : quel mot convient ?", choices: [{ t: "pour" }, { t: "par", piege: "Piège P1", exp: "« par » ne convient pas pour exprimer un but ici." }, { t: "de", piege: "Piège P1", exp: "Préposition incorrecte dans cette construction." }], correct: 0 },
      { q: "Blanc (2) : quel mot convient ?", choices: [{ t: "pour" }, { t: "à", piege: "Piège P1", exp: "Construction incorrecte, « jusqu'à... pour » est la structure attendue." }, { t: "sans", piege: "Piège P5", exp: "Inverserait le sens (il FAUT venir la chercher, pas l'inverse)." }], correct: 0 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire (élections) · NCLC 7",
    text: "Malgré les efforts déployés ces dernières années, le taux de participation aux élections municipales ___(1)___ préoccupant, ce ___(2)___ plusieurs experts attribuent à un désintérêt croissant envers la politique locale.",
    questions: [
      { q: "Blanc (1) : quel mot convient ?", choices: [{ t: "demeure" }, { t: "demeurent", piege: "Piège P1", exp: "Le sujet « taux » est singulier, accord incorrect avec le pluriel." }, { t: "demeurait", piege: "Piège P1", exp: "Temps incohérent avec le contexte présent du texte." }], correct: 0 },
      { q: "Blanc (2) : quel mot convient ?", choices: [{ t: "que" }, { t: "qui", piege: "Piège P1", exp: "« que » est complément d'objet de « attribuent », « qui » serait sujet, incorrect ici." }, { t: "dont", piege: "Piège P1", exp: "Construction incorrecte dans ce contexte précis." }], correct: 0 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire (automatisation) · NCLC 8",
    text: "Si l'automatisation ___(1)___ certes des emplois dans certains secteurs, elle en crée également de nouveaux, ___(2)___ nécessitent des compétences différentes, ce qui pose la question de la formation professionnelle adaptée.",
    questions: [
      { q: "Blanc (1) : quel mot convient ?", choices: [{ t: "supprime" }, { t: "supprimait", piege: "Piège P1", exp: "Incohérence avec le présent général employé dans le reste de la phrase." }, { t: "aurait supprimé", piege: "Piège P1", exp: "Conditionnel non justifié, l'automatisation supprime réellement des emplois." }], correct: 0 },
      { q: "Blanc (2) : quel mot convient ?", choices: [{ t: "qui" }, { t: "que", piege: "Piège P1", exp: "« qui » est sujet du verbe « nécessitent », « que » serait complément, incorrect ici." }, { t: "dont", piege: "Piège P1", exp: "Construction incorrecte dans ce contexte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire (avancées technologiques) · NCLC 9",
    text: "On ne saurait ___(1)___ que les avancées technologiques récentes aient transformé le marché du travail, ___(2)___ cette transformation ne s'opère pas de manière uniforme selon les secteurs, creusant parfois des inégalités préoccupantes.",
    questions: [
      { q: "Blanc (1) : quel mot convient ?", choices: [{ t: "nier" }, { t: "dire", piege: "Piège P1", exp: "« on ne saurait dire » changerait le sens, l'expression figée attendue est « on ne saurait nier »." }, { t: "croire", piege: "Piège P1", exp: "Sens incohérent avec la suite de la phrase, qui confirme le fait." }], correct: 0 },
      { q: "Blanc (2) : quel mot convient ?", choices: [{ t: "quoique" }, { t: "parce que", piege: "Piège P5", exp: "Inverserait la relation concessive voulue en relation causale." }, { t: "donc", piege: "Piège P5", exp: "Inverserait la logique concessive en conséquence directe." }], correct: 0 },
    ],
  },
  {
    meta: "Famille C · Tableau cours du soir · NCLC 6",
    text: "| Cours du soir | Jour | Durée | Prix |\n| Espagnol débutant | Lundi | 8 semaines | 180$ |\n| Yoga | Mercredi | 10 semaines | 150$ |\n| Photographie | Vendredi | 6 semaines | 210$ |",
    questions: [
      { q: "Quel cours dure le moins longtemps ?", choices: [{ t: "Photographie" }, { t: "Espagnol débutant", piege: "Piège P2", exp: "Durée intermédiaire, proche de la plus courte." }, { t: "Yoga", piege: "Piège P2", exp: "Durée la plus longue, distracteur par inversion." }], correct: 0 },
      { q: "Quel cours a lieu le mercredi ?", choices: [{ t: "Yoga" }, { t: "Espagnol débutant", piege: "Piège P2", exp: "Jour différent (lundi), confusion de ligne." }, { t: "Photographie", piege: "Piège P2", exp: "Jour différent (vendredi), confusion de ligne." }], correct: 0 },
    ],
  },
  {
    meta: "Famille C · Tableau assurances · NCLC 7",
    text: "| Compagnie | Prime annuelle | Franchise | Couverture dégât d'eau |\n| Assurco | 850$ | 500$ | Oui |\n| Protectia | 720$ | 750$ | Non |\n| Securex | 900$ | 300$ | Oui |",
    questions: [
      { q: "Quelle compagnie a la franchise la plus basse ?", choices: [{ t: "Securex" }, { t: "Assurco", piege: "Piège P2", exp: "Franchise intermédiaire, proche de la plus basse." }, { t: "Protectia", piege: "Piège P2", exp: "Franchise la plus élevée, distracteur par inversion." }], correct: 0 },
      { q: "Quelle compagnie ne couvre pas les dégâts d'eau ?", choices: [{ t: "Protectia" }, { t: "Assurco", piege: "Piège P5", exp: "Le tableau indique « Oui » pour cette compagnie." }, { t: "Securex", piege: "Piège P5", exp: "Le tableau indique « Oui » pour cette compagnie." }], correct: 0 },
    ],
  },
  {
    meta: "Famille C · Tableau candidats · NCLC 8",
    text: "| Candidat | Années d'expérience | Langues parlées | Disponibilité |\n| Candidat 1 | 3 | Français, anglais | Immédiate |\n| Candidat 2 | 7 | Français, anglais, espagnol | Dans 1 mois |\n| Candidat 3 | 5 | Français | Immédiate |",
    questions: [
      { q: "Quel candidat parle le plus de langues ET a le plus d'expérience ?", choices: [{ t: "Candidat 2" }, { t: "Candidat 1", piege: "Piège P3", exp: "Parle deux langues mais a le moins d'expérience des trois." }, { t: "Candidat 3", piege: "Piège P3", exp: "Ne parle qu'une langue, ne remplit pas le premier critère." }], correct: 0 },
      { q: "Quel candidat est disponible immédiatement ET a le plus d'expérience parmi ceux disponibles ?", choices: [{ t: "Candidat 3" }, { t: "Candidat 1", piege: "Piège P2", exp: "Disponible immédiatement mais moins d'expérience que le Candidat 3." }, { t: "Candidat 2", piege: "Piège P5", exp: "N'est PAS disponible immédiatement, contredit le premier critère." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Paiement sans contact · NCLC 7",
    text: "Alors que de plus en plus de commerces adoptent le paiement sans contact, certains groupes de défense des consommateurs s'inquiètent de l'exclusion progressive des personnes sans compte bancaire ou peu familières avec les technologies numériques. Plusieurs municipalités étudient des mesures pour garantir un accès équitable aux services essentiels.",
    questions: [
      { q: "Quelle est l'inquiétude soulevée dans le texte ?", choices: [{ t: "L'exclusion de certaines personnes du paiement sans contact" }, { t: "La hausse des prix liée au sans-contact", piege: "Piège P6", exp: "Préoccupation plausible en général mais absente de ce texte." }, { t: "Le risque de fraude bancaire", piege: "Piège P6", exp: "Sur-inférence non soutenue par le texte." }], correct: 0 },
      { q: "Que font certaines municipalités face à cette situation ?", choices: [{ t: "Elles étudient des mesures pour un accès équitable" }, { t: "Elles interdisent le paiement sans contact", piege: "Piège P6", exp: "Mesure plus radicale que ce qui est réellement décrit." }, { t: "Elles ignorent le problème", piege: "Piège P5", exp: "Contredit directement « étudient des mesures »." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Labels écologiques · NCLC 8",
    text: "La multiplication des labels écologiques sur les produits de consommation, censée guider les choix des consommateurs vers des options plus durables, produit paradoxalement l'effet inverse chez une partie du public, submergé par une profusion de certifications aux critères peu transparents et parfois contradictoires entre elles.",
    questions: [
      { q: "Quel est l'effet paradoxal décrit dans le texte ?", choices: [{ t: "La profusion de labels peut décourager plutôt qu'aider les consommateurs" }, { t: "Les labels ont fait baisser les prix", piege: "Piège P6", exp: "Conséquence plausible en général mais absente du texte." }, { t: "Les entreprises ont cessé d'utiliser des labels", piege: "Piège P6", exp: "Contredit « multiplication des labels »." }], correct: 0 },
      { q: "Qu'est-ce qui est reproché à ces certifications ?", choices: [{ t: "Des critères peu transparents et parfois contradictoires" }, { t: "Un coût trop élevé pour les entreprises", piege: "Piège P6", exp: "Préoccupation plausible en général mais non mentionnée." }, { t: "Leur absence totale de réglementation", piege: "Piège P6", exp: "Sur-inférence, le texte ne parle pas de réglementation." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Crise du logement · NCLC 9",
    text: "Réduire la crise du logement à un simple déséquilibre entre l'offre et la demande relève d'une lecture pour le moins partielle du phénomène. S'il est vrai que la construction peine à suivre la croissance démographique dans plusieurs grands centres urbains, cette explication occulte des dynamiques tout aussi déterminantes, telles que la financiarisation croissante du marché immobilier ou la multiplication des logements utilisés comme placements plutôt que comme résidences.",
    questions: [
      { q: "Quelle est la thèse principale de l'auteur ?", choices: [{ t: "La crise du logement ne se résume pas au seul déséquilibre offre-demande" }, { t: "La crise du logement est uniquement due à un manque de construction", piege: "Piège P4", exp: "C'est précisément l'explication que l'auteur juge partielle, pas sa position." }, { t: "La crise du logement n'existe pas réellement", piege: "Piège P6", exp: "Contredit l'ensemble du texte, qui traite bien d'une crise réelle." }], correct: 0 },
      { q: "Quelles dynamiques l'auteur ajoute-t-il à l'explication traditionnelle ?", choices: [{ t: "La financiarisation du marché et les logements utilisés comme placements" }, { t: "Le manque de main-d'œuvre en construction", piege: "Piège P6", exp: "Cause plausible en général mais non mentionnée dans ce texte." }, { t: "La hausse des taux d'intérêt", piege: "Piège P6", exp: "Sur-inférence non soutenue par le texte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Bénévolat ponctuel · NCLC 8",
    text: "L'essor du bénévolat ponctuel, favorisé par des plateformes numériques permettant de s'engager pour quelques heures seulement, bouscule le modèle traditionnel des organismes communautaires, historiquement bâtis sur un engagement bénévole régulier et durable. Certains y voient une adaptation nécessaire aux modes de vie contemporains, d'autres craignent un affaiblissement du tissu associatif à long terme.",
    questions: [
      { q: "Qu'est-ce qui bouscule le modèle traditionnel du bénévolat ?", choices: [{ t: "L'essor du bénévolat ponctuel via des plateformes numériques" }, { t: "La baisse générale de l'intérêt pour le bénévolat", piege: "Piège P6", exp: "Contredit « essor », qui indique une augmentation, pas une baisse." }, { t: "Le manque de financement des organismes", piege: "Piège P6", exp: "Cause plausible en général mais absente du texte." }], correct: 0 },
      { q: "Quelle inquiétude est mentionnée par certains ?", choices: [{ t: "Un affaiblissement du tissu associatif à long terme" }, { t: "Une hausse des coûts de gestion", piege: "Piège P6", exp: "Sur-inférence non soutenue par le texte." }, { t: "Une baisse de la qualité des services rendus", piege: "Piège P6", exp: "Sur-inférence, non mentionnée dans le texte." }], correct: 0 },
    ],
  },
];

// ── CO (Compréhension orale) exercises ──
export const coItems: QuizItem[] = [
  {
    meta: "Section A · Dialogue court · NCLC 5",
    text: "– Excusez-moi, vous savez où se trouve l'arrêt d'autobus le plus proche ?\n– Oui, continuez tout droit, puis tournez à gauche après la pharmacie. L'arrêt est juste en face du parc.\n– Merci beaucoup !",
    questions: [{ q: "Quelle situation correspond à cette conversation ?", choices: [{ t: "Une personne qui achète un billet de train" }, { t: "Une personne qui demande son chemin" }, { t: "Une personne qui attend un ami au parc", piege: "Piège CO-P2", exp: "Le parc n'est qu'un repère géographique donné dans la réponse, pas le sujet." }], correct: 1 }],
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
  // ── Nouveaux exercices CO ──
  {
    meta: "Section A · Dialogue court · NCLC 5",
    text: "– Bonjour, je cherche le rayon des produits laitiers, s'il vous plaît.\n– C'est au fond du magasin, allée 6, juste après les fruits et légumes.\n– Merci, et les œufs ?\n– Juste à côté, dans la même allée.",
    questions: [
      { q: "Où se trouvent les produits laitiers ?", choices: [{ t: "À l'entrée du magasin", piege: "Piège CO-P2", exp: "Le contraire est dit : « au fond du magasin »." }, { t: "Au fond du magasin, allée 6" }, { t: "Au rayon surgelés", piege: "Piège CO-P6", exp: "Aucune mention des surgelés dans le dialogue." }], correct: 1 },
      { q: "Où sont les œufs ?", choices: [{ t: "Dans une allée différente" }, { t: "Dans la même allée que les produits laitiers" }, { t: "À la caisse", piege: "Piège CO-P6", exp: "Information inventée, absente du dialogue." }], correct: 1 },
    ],
  },
  {
    meta: "Section A · Dialogue court · NCLC 5",
    text: "– Allô, cabinet médical Beaubien, bonjour !\n– Bonjour, j'aimerais prendre un rendez-vous avec le docteur Tremblay.\n– Le docteur Tremblay est en vacances jusqu'au 15. Je peux vous proposer le docteur Lévesque jeudi à 10 h.\n– D'accord, c'est noté. Merci.",
    questions: [
      { q: "Pourquoi le patient ne peut-il pas voir le docteur Tremblay ?", choices: [{ t: "Il est malade" }, { t: "Il est en vacances" }, { t: "Il a quitté le cabinet", piege: "Piège CO-P6", exp: "Confusion de degré : vacances ≠ départ définitif." }], correct: 1 },
      { q: "Quel est le rendez-vous proposé ?", choices: [{ t: "Lundi à 14 h", piege: "Piège CO-P4", exp: "Jour et heure inventés, proches mais inexacts." }, { t: "Jeudi à 10 h" }, { t: "Vendredi à 10 h", piege: "Piège CO-P4", exp: "Heure correcte mais jour erroné." }], correct: 1 },
    ],
  },
  {
    meta: "Section B · Annonce publique · NCLC 6",
    text: "« Chers passagers, nous vous informons que le vol AC-872 à destination de Toronto est maintenant prêt pour l'embarquement à la porte 14. Les passagers voyageant avec des enfants en bas âge et les personnes à mobilité réduite sont invités à se présenter en premier. »",
    questions: [
      { q: "Quelle est la destination du vol ?", choices: [{ t: "Montréal" }, { t: "Toronto" }, { t: "Vancouver", piege: "Piège CO-P2", exp: "Destination plausible mais non mentionnée." }], correct: 1 },
      { q: "Qui embarque en premier ?", choices: [{ t: "Les passagers de première classe", piege: "Piège CO-P6", exp: "Information attendue mais non dite dans cette annonce." }, { t: "Les familles avec enfants et les personnes à mobilité réduite" }, { t: "Tous les passagers en même temps" }], correct: 1 },
    ],
  },
  {
    meta: "Section B · Annonce publique · NCLC 7",
    text: "« Mesdames et messieurs, la bibliothèque municipale sera fermée du 23 au 30 décembre pour les fêtes. Le service de retour de livres reste disponible via la boîte de dépôt extérieure, ouverte 24 heures sur 24. Les amendes de retard sont suspendues pendant cette période. »",
    questions: [
      { q: "Peut-on retourner des livres pendant la fermeture ?", choices: [{ t: "Non, c'est impossible", piege: "Piège CO-P1", exp: "Le message précise ensuite la boîte de dépôt extérieure : il faut écouter jusqu'au bout." }, { t: "Oui, via la boîte de dépôt extérieure" }, { t: "Seulement en semaine", piege: "Piège CO-P6", exp: "La boîte est ouverte « 24 heures sur 24 », pas seulement en semaine." }], correct: 1 },
      { q: "Que se passe-t-il pour les amendes de retard ?", choices: [{ t: "Elles sont doublées pendant les fêtes" }, { t: "Elles sont suspendues" }, { t: "Elles restent les mêmes", piege: "Piège CO-P5", exp: "Manquer le mot « suspendues » fait croire qu'aucun changement n'est annoncé." }], correct: 1 },
    ],
  },
  {
    meta: "Section C · Message répondeur · NCLC 7",
    text: "« Bonjour monsieur Dupont, ici la clinique dentaire Sourire. Nous vous appelons pour confirmer votre rendez-vous de mercredi à 15 h 30. Si vous avez des questions ou si vous devez annuler, merci de nous rappeler au 514-555-0123 avant mardi midi. En l'absence de nouvelles, votre rendez-vous est maintenu. »",
    questions: [
      { q: "Quel est le jour du rendez-vous ?", choices: [{ t: "Mardi" }, { t: "Mercredi" }, { t: "Jeudi", piege: "Piège CO-P4", exp: "Jour proche mais inexact." }], correct: 1 },
      { q: "Que se passe-t-il si le patient ne rappelle pas ?", choices: [{ t: "Le rendez-vous est annulé automatiquement", piege: "Piège CO-P5", exp: "C'est l'inverse : « en l'absence de nouvelles, votre rendez-vous est maintenu »." }, { t: "Le rendez-vous est maintenu" }, { t: "Un autre rendez-vous sera proposé", piege: "Piège CO-P6", exp: "Sur-inférence non soutenue par le message." }], correct: 1 },
    ],
  },
  {
    meta: "Section C · Conversation téléphonique · NCLC 8",
    text: "« – Bonjour, c'est l'agence Immobilia. Nous avons un appartement qui correspond à vos critères : 4 et demie, quartier Rosemont, 1 350 $ par mois, chauffage inclus.\n– Ça m'intéresse, mais c'est un peu au-dessus de mon budget. Vous n'auriez rien autour de 1 200 $ ?\n– Pas dans ce quartier, mais j'ai un 3 et demie à Villeray pour 1 150 $, eau chaude incluse.\n– D'accord, je voudrais le visiter. »",
    questions: [
      { q: "Pourquoi le premier appartement ne convient-il pas tout à fait ?", choices: [{ t: "Il est trop petit" }, { t: "Il est trop cher" }, { t: "Le quartier ne plaît pas", piege: "Piège CO-P3", exp: "Le client dit « un peu au-dessus de mon budget », pas de plainte sur le quartier." }], correct: 1 },
      { q: "Quel appartement le client décide-t-il de visiter ?", choices: [{ t: "Le 4 et demie à Rosemont", piege: "Piège CO-P1", exp: "Le client a changé d'avis en cours de conversation." }, { t: "Le 3 et demie à Villeray" }, { t: "Les deux appartements" }], correct: 1 },
    ],
  },
  {
    meta: "Section D · Entrevue radio · NCLC 8",
    text: "« Journaliste : Professeur Martin, la réforme du système de santé au Québec, est-ce un succès ?\n– C'est trop tôt pour le dire avec certitude. On observe des améliorations dans les temps d'attente aux urgences, c'est indéniable. Mais la pénurie de personnel, notamment d'infirmières, reste un problème aigu. Et puis, centraliser la gestion n'a pas toujours eu les effets escomptés sur le terrain. »",
    questions: [
      { q: "Le professeur Martin considère que la réforme est :", choices: [{ t: "Un succès total", piege: "Piège CO-P7", exp: "Réduit une position très nuancée à un extrême positif." }, { t: "Un échec complet", piege: "Piège CO-P7", exp: "Ignore les « améliorations » reconnues par le professeur." }, { t: "Partiellement efficace mais avec des faiblesses persistantes" }], correct: 2 },
      { q: "Quel problème reste « aigu » selon le professeur ?", choices: [{ t: "Le financement des hôpitaux" }, { t: "La pénurie de personnel infirmier" }, { t: "La centralisation administrative", piege: "Piège CO-P3", exp: "La centralisation est critiquée mais ce n'est pas elle qui est qualifiée d'« aiguë »." }], correct: 1 },
    ],
  },
  {
    meta: "Section D · Débat entre experts · NCLC 10",
    text: "« – La francisation des nouveaux arrivants ne se limite pas à leur enseigner le français. C'est un processus d'intégration socioculturelle qui doit inclure une compréhension des réalités québécoises.\n– Certes, mais encore faut-il que les ressources suivent. On a beau avoir les meilleures intentions du monde, si les classes sont surchargées et les enseignants épuisés, les résultats resteront en deçà des attentes.\n– Je ne conteste pas cela, mais réduire le débat à une question de moyens serait simpliste. Il y a aussi la question de l'approche pédagogique. »",
    questions: [
      { q: "Quel est le point de désaccord principal ?", choices: [{ t: "L'un est contre la francisation, l'autre est pour", piege: "Piège CO-P7", exp: "Les deux experts sont favorables à la francisation ; le désaccord porte sur les priorités." }, { t: "L'un insiste sur les moyens, l'autre sur l'approche pédagogique" }, { t: "L'un veut supprimer les cours de français", piege: "Piège CO-P6", exp: "Totalement absent du débat." }], correct: 1 },
      { q: "L'expression « on a beau avoir les meilleures intentions du monde » signifie :", choices: [{ t: "Les intentions sont suffisantes" }, { t: "Même avec de bonnes intentions, cela ne suffit pas" }, { t: "Les intentions sont mauvaises", piege: "Piège CO-P5", exp: "Contresens total : « avoir beau » exprime une concession, pas une critique des intentions." }], correct: 1 },
    ],
  },
  // ── 8 nouveaux exercices CO (fichier CO_Entrainement_Ajout8) ──
  {
    meta: "Section A · Dialogue court · NCLC 5",
    text: "– Vous avez la taille en dessous pour ce chandail ?\n– Laissez-moi vérifier... oui, on en a un en petit, dans la cabine d'essayage à votre gauche.\n– Parfait, merci !",
    questions: [{ q: "Quelle image correspond ?", choices: [{ t: "Une personne qui essaie un vêtement dans un magasin", img: "/static/images/co/train1_q1_a.jpg" }, { t: "Une personne qui retourne un article", img: "/static/images/co/train1_q1_b.jpg", piege: "Piège CO-P2", exp: "Aucun ancrage dans le dialogue, générique." }, { t: "Une personne qui paie à la caisse", img: "/static/images/co/train1_q1_c.jpg", piege: "Piège CO-P2", exp: "Étape ultérieure non mentionnée dans ce dialogue." }], correct: 0 }],
  },
  {
    meta: "Section A · Dialogue court · NCLC 7",
    text: "– Tu as des nouvelles de ton dossier de prêt étudiant ?\n– Oui, ils m'ont dit que ça allait prendre encore deux ou trois semaines à cause du volume de demandes en ce moment.\n– Ah, c'est plus long que ce que tu pensais alors.\n– Oui, un peu, mais au moins j'ai la confirmation que le dossier avance.",
    questions: [{ q: "Quelle est la situation actuelle du dossier ?", choices: [{ t: "Il avance, mais avec un délai plus long que prévu" }, { t: "Il a été refusé", piege: "Piège CO-P1", exp: "Contredit « j'ai la confirmation que le dossier avance »." }, { t: "Il est complètement terminé", piege: "Piège CO-P1", exp: "Contredit « encore deux ou trois semaines »." }], correct: 0 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 6",
    text: "« Mesdames et messieurs, nous vous rappelons que les bagages laissés sans surveillance seront saisis par la sécurité. Merci de garder vos effets personnels avec vous en tout temps. »",
    questions: [{ q: "Quel est l'objectif de cette annonce ?", choices: [{ t: "Rappeler une consigne de sécurité sur les bagages" }, { t: "Annoncer la perte d'un bagage", piege: "Piège CO-P6", exp: "Rien n'indique un incident réel, c'est une consigne préventive générale." }, { t: "Annoncer une fouille obligatoire des bagages", piege: "Piège CO-P6", exp: "Mesure plus stricte que ce qui est réellement annoncé." }], correct: 0 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 8",
    text: "« En raison de l'affluence exceptionnelle liée à l'événement de ce soir, nous invitons notre clientèle à prévoir un temps d'attente supplémentaire pour le service au comptoir. Nous vous remercions de votre patience. »",
    questions: [{ q: "Quel est l'objectif de cette annonce ?", choices: [{ t: "Prévenir d'un délai d'attente plus long que d'habitude" }, { t: "Annoncer la fermeture du comptoir", piege: "Piège CO-P6", exp: "Confond une attente prolongée avec une fermeture." }, { t: "Annoncer l'annulation de l'événement", piege: "Piège CO-P6", exp: "Aucun lien, l'événement a bien lieu, c'est le service qui est affecté." }], correct: 0 }],
  },
  {
    meta: "Section C · Message répondeur · NCLC 6",
    text: "« Bonjour, c'est le pressing qui vous appelle pour vous dire que vos vêtements sont prêts depuis hier. On ferme à 18h ce soir, n'hésitez pas à passer avant si possible. »",
    questions: [{ q: "Pourquoi le pressing appelle-t-il ?", choices: [{ t: "Pour informer que la commande est prête" }, { t: "Pour annoncer un problème avec les vêtements", piege: "Piège CO-P6", exp: "Rien n'indique un problème, seulement que la commande est prête." }, { t: "Pour annoncer une fermeture définitive", piege: "Piège CO-P6", exp: "« ferme à 18h ce soir » concerne l'horaire du jour, pas une fermeture permanente." }], correct: 0 }],
  },
  {
    meta: "Section C · Message répondeur · NCLC 8",
    text: "« Bonjour, c'est l'école qui appelle au sujet de votre enfant. Rien d'inquiétant, mais il s'est légèrement blessé au genou pendant la récréation. L'infirmière l'a examiné et tout va bien, on voulait simplement vous tenir informé au cas où vous remarqueriez un petit bleu ce soir. »",
    questions: [{ q: "Pourquoi l'école appelle-t-elle ?", choices: [{ t: "Pour informer d'une blessure mineure déjà prise en charge" }, { t: "Pour demander de venir chercher l'enfant en urgence", piege: "Piège CO-P6", exp: "Contredit « rien d'inquiétant » et « tout va bien »." }, { t: "Pour signaler un problème de comportement", piege: "Piège CO-P2", exp: "Hors sujet, aucun lien avec le contenu réel de l'appel." }], correct: 0 }],
  },
  {
    meta: "Section D · Micro-trottoir · NCLC 7",
    text: "« Les commerces de proximité, moi j'essaie d'y aller le plus possible, mais faut être honnête, c'est souvent plus cher qu'en ligne. Donc je fais un compromis : les produits frais, je les achète au quartier, et le reste, ça dépend vraiment du prix. »",
    questions: [{ q: "Quelle est la position de la personne ?", choices: [{ t: "Un compromis entre soutien local et considération du prix" }, { t: "Elle achète toujours en ligne par principe", piege: "Piège CO-P7", exp: "Contredit « j'essaie d'y aller le plus possible » pour les commerces locaux." }, { t: "Elle refuse catégoriquement d'acheter en ligne", piege: "Piège CO-P7", exp: "Contredit « le reste, ça dépend vraiment du prix », qui inclut l'achat en ligne." }], correct: 0 }],
  },
  {
    meta: "Section D · Micro-trottoir · NCLC 9",
    text: "« La retraite à 65 ans, disons que c'est un chiffre qui a été fixé il y a des décennies, dans un contexte complètement différent d'aujourd'hui. Je ne dis pas qu'il faut la repousser à tout prix, mais je pense qu'on devrait au moins ouvrir la discussion sérieusement, plutôt que de traiter ce chiffre comme gravé dans la pierre. »",
    questions: [{ q: "Quel est le point de vue de la personne ?", choices: [{ t: "Elle appelle à rouvrir le débat, sans prendre position tranchée sur l'âge exact" }, { t: "Elle est fermement pour repousser l'âge de la retraite", piege: "Piège CO-P7", exp: "Contredit « je ne dis pas qu'il faut la repousser à tout prix »." }, { t: "Elle pense que l'âge actuel est parfaitement adapté", piege: "Piège CO-P7", exp: "Contredit « fixé... dans un contexte complètement différent d'aujourd'hui »." }], correct: 0 }],
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
  // ── Nouveaux sujets EE ──
  {
    sujet: "Section A : Lettre formelle. Vous avez reçu un colis endommagé d'une boutique en ligne. Rédigez une lettre de réclamation au service client pour demander un échange ou un remboursement.",
    n6: "Madame, Monsieur, je vous écris pour signaler un problème avec ma commande numéro 45823, reçue le 12 janvier. Le colis est arrivé très abîmé : la boîte était ouverte et le produit à l'intérieur était cassé. Je vous demande de m'envoyer un nouveau produit ou de me rembourser. Je peux vous envoyer des photos si nécessaire. J'espère une réponse rapide. Cordialement. (62 mots, à étoffer jusqu'à 200)",
    n9: "Madame, Monsieur, je me permets de vous adresser la présente afin de porter à votre attention un désagrément survenu lors de la réception de ma commande n° 45823 du 8 janvier dernier. Force est de constater que l'emballage présentait des détériorations significatives — coin supérieur enfoncé, ruban adhésif décollé — et que l'article commandé, en l'occurrence un vase en céramique, était brisé en plusieurs morceaux. Aussi vous saurais-je gré de bien vouloir procéder soit à un remplacement dans les meilleurs délais, soit à un remboursement intégral, conformément aux dispositions de votre politique de retour. Je tiens à votre disposition l'ensemble des pièces justificatives, y compris des photographies horodatées de l'état du colis à la réception. Dans l'attente d'une réponse de votre part, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées. (138 mots)",
  },
  {
    sujet: "Section B : Argumentation. « Les réseaux sociaux représentent-ils une menace pour la démocratie ? » Développez votre point de vue en vous appuyant sur des exemples concrets.",
    n6: "Les réseaux sociaux ont des avantages et des inconvénients pour la démocratie. D'un côté, ils permettent à tout le monde de s'exprimer et de partager des informations. Par exemple, pendant les élections, les citoyens peuvent débattre en ligne. Mais de l'autre côté, il y a beaucoup de fausses nouvelles qui circulent. Les gens ne vérifient pas toujours si une information est vraie avant de la partager. À mon avis, il faudrait mieux éduquer les gens pour qu'ils fassent la différence entre les vraies et les fausses informations. (89 mots, à étoffer jusqu'à 200)",
    n9: "Il serait réducteur de considérer les réseaux sociaux uniquement sous l'angle de la menace, tant leur rôle dans la démocratisation de l'accès à l'information est indéniable. Toutefois, il n'en demeure pas moins que la diffusion virale de contenus non vérifiés, l'amplification algorithmique des opinions polarisantes et la création de « bulles de filtre » constituent des défis majeurs pour le débat démocratique. On ne saurait ignorer, par exemple, l'influence documentée des campagnes de désinformation sur plusieurs scrutins récents à travers le monde. Néanmoins, plutôt que de céder à un technopessimisme stérile, il conviendrait d'envisager une régulation proportionnée, conjuguant transparence algorithmique et éducation aux médias, afin de préserver l'espace public numérique comme un lieu de délibération éclairée. (119 mots, à étoffer jusqu'à 200)",
  },
  {
    sujet: "Section A : Résumé narratif. Lisez le texte suivant et rédigez un résumé en 80 à 100 mots : « En 2023, la ville de Montréal a inauguré un nouveau réseau de pistes cyclables protégées reliant les quartiers nord aux quartiers centraux. Ce projet, financé en partie par le gouvernement provincial, vise à réduire la congestion automobile et à favoriser la mobilité active. Les commerçants des rues concernées ont exprimé des inquiétudes quant à la perte de stationnement, tandis que les groupes écologistes ont salué cette initiative. Un premier bilan sera dressé après un an. »",
    n6: "En 2023, Montréal a créé de nouvelles pistes cyclables entre le nord et le centre-ville. Le projet est financé par le gouvernement provincial. L'objectif est de diminuer le trafic automobile et d'encourager les gens à utiliser le vélo. Les commerçants ne sont pas contents parce qu'il y a moins de places de stationnement. Les groupes écologistes, eux, sont satisfaits de cette décision. Un bilan sera fait dans un an. (71 mots, à étoffer)",
    n9: "La métropole montréalaise a procédé, en 2023, à l'inauguration d'un réseau de pistes cyclables sécurisées établissant une liaison entre les quartiers septentrionaux et le cœur de la ville. Cofinancé par l'échelon provincial, ce projet poursuit un double objectif : atténuer la congestion routière et promouvoir les déplacements actifs. Si les commerçants riverains déplorent la réduction de l'offre de stationnement, les milieux environnementalistes saluent cette avancée. L'efficacité de l'initiative fera l'objet d'une évaluation au terme d'une première année d'exploitation. (80 mots)",
  },
  {
    sujet: "Section B : Opinion nuancée. « L'intelligence artificielle va-t-elle remplacer les enseignants ? » Présentez les deux points de vue et exprimez votre opinion personnelle argumentée.",
    n6: "L'intelligence artificielle se développe très rapidement dans le domaine de l'éducation. Certains pensent qu'elle pourrait remplacer les enseignants parce qu'elle peut corriger des exercices, proposer des cours personnalisés et être disponible à tout moment. Cependant, d'autres croient que les enseignants sont irremplaçables car ils comprennent les émotions des élèves et peuvent les motiver. Personnellement, je pense que l'IA est un outil utile mais qu'un vrai professeur sera toujours nécessaire pour guider les élèves. (78 mots, à étoffer jusqu'à 200)",
    n9: "Qu'il s'agisse de la correction automatisée des évaluations, de la génération de parcours d'apprentissage adaptatifs ou du tutorat conversationnel, les avancées de l'intelligence artificielle en éducation sont incontestables. Pour autant, il serait hasardeux de conclure que la technologie supplante l'humain. L'acte éducatif ne se réduit pas à la transmission de savoirs : il engage une dimension relationnelle, une capacité d'empathie et un jugement contextuel dont aucun modèle algorithmique, aussi perfectionné soit-il, ne saurait s'acquitter pleinement. Il n'en demeure pas moins que s'arc-bouter sur un refus de la technologie serait tout aussi contre-productif. Aussi convient-il de repenser le rôle de l'enseignant non pas comme un transmetteur menacé, mais comme un médiateur augmenté par des outils intelligents, capable de consacrer davantage de temps à l'accompagnement individualisé et au développement de la pensée critique. (133 mots, à étoffer jusqu'à 200)",
  },
  // ── 4 nouveaux sujets EE (fichier EE_EO_Entrainement_Ajout) ──
  {
    sujet: "Section A : Fait divers. « Un facteur a eu la surprise de découvrir, en glissant le courrier dans une boîte aux lettres, qu'un petit chat s'y était réfugié pendant la nuit... » Continuez cet article.",
    n6: "Le facteur a d'abord eu peur en entendant un bruit, puis a découvert le chaton tremblant de froid. Il a immédiatement contacté le propriétaire de la maison, qui n'était au courant de rien. Ensemble, ils ont réalisé que le chat appartenait probablement à un voisin, puisqu'il portait un collier avec un nom. Le propriétaire de la boîte aux lettres a proposé de garder le chaton au chaud en attendant de retrouver ses vrais propriétaires. (82 mots)",
    n9: "C'est en entendant un bruit suspect provenant de la boîte aux lettres que le facteur a fait cette découverte pour le moins inattendue : un chaton, visiblement transi de froid, s'y était réfugié durant la nuit. Ayant aussitôt alerté le propriétaire des lieux, totalement étranger à cette présence, les deux hommes ont rapidement constaté, grâce au collier orné d'un nom, que l'animal appartenait vraisemblablement à un voisin. En attendant de retrouver ses propriétaires légitimes, le résident s'est proposé spontanément d'accueillir le petit félin au chaud, épargnant ainsi à celui-ci une plus longue exposition au froid. (114 mots)",
  },
  {
    sujet: "Section A : Fait divers. « Les résidents d'un immeuble ont eu la surprise, en descendant chercher leur courrier hier matin, de découvrir une fresque murale entièrement nouvelle dans le hall d'entrée... » Continuez cet article.",
    n6: "Personne ne savait qui avait peint cette fresque colorée représentant le quartier. Après quelques recherches, les résidents ont découvert que c'était l'œuvre d'un jeune artiste local qui avait demandé la permission au syndic quelques semaines plus tôt, mais dont la réponse s'était perdue dans les communications. Finalement, tout le monde a trouvé la fresque magnifique et personne ne s'est plaint. Le syndic a même proposé d'organiser un petit événement pour célébrer officiellement l'œuvre. (80 mots)",
    n9: "Nul, parmi les résidents, n'était en mesure d'expliquer l'origine de cette fresque haute en couleur représentant fidèlement le quartier environnant. Ce n'est qu'après quelques recherches que l'on a fini par identifier son auteur : un jeune artiste local ayant, quelques semaines auparavant, sollicité l'autorisation du syndic — demande dont la réponse s'était malheureusement égarée dans les méandres administratifs habituels. Loin de susciter la moindre plainte, l'œuvre a au contraire fait l'unanimité, au point que le syndic envisage désormais d'organiser un événement pour en célébrer officiellement l'existence. (108 mots)",
  },
  {
    sujet: "Section B : Argumentation. Devrait-on interdire l'usage du téléphone portable dans les salles de classe, même pendant les pauses ?",
    n6: "Je pense que oui, ça devrait être interdit, même pendant les pauses. Les téléphones distraient beaucoup les élèves et les empêchent de vraiment se reposer ou de socialiser avec leurs camarades pendant les pauses. Par contre, je pense qu'il faudrait faire une exception pour les urgences, par exemple si un parent a besoin de joindre son enfant rapidement. L'important c'est de trouver un équilibre entre la discipline et le bon sens. (80 mots)",
    n9: "Il me semble que cette interdiction, aussi stricte puisse-t-elle paraître, se justifie pleinement au regard des effets bien documentés des écrans sur la concentration et les interactions sociales entre élèves. Certes, on pourrait objecter qu'une pause devrait rester un moment de liberté ; il n'en demeure pas moins que l'omniprésence des téléphones tend justement à appauvrir ces moments d'échange informel, pourtant essentiels au développement social des jeunes. Une exception raisonnable pourrait néanmoins être envisagée pour les situations d'urgence familiale, à condition qu'elle demeure encadrée et ne devienne pas un prétexte généralisé. (112 mots)",
  },
  {
    sujet: "Section B : Argumentation. Les restaurants devraient-ils être obligés d'indiquer la provenance exacte de tous leurs ingrédients sur leur menu ?",
    n6: "Je pense que ce serait une bonne idée, mais difficile à appliquer partout. Pour les grands restaurants, ça pourrait être possible, mais pour les petits restaurants avec peu de personnel, ça demanderait beaucoup de travail supplémentaire. Je pense que les clients ont le droit de savoir d'où vient leur nourriture, surtout s'ils ont des préoccupations environnementales ou éthiques. Peut-être qu'on pourrait commencer par obliger seulement les grandes chaînes de restaurants. (78 mots)",
    n9: "Si le principe de transparence alimentaire me paraît difficilement contestable sur le fond, sa mise en œuvre pratique soulève en revanche de réelles interrogations, notamment pour les petits établissements dont les ressources administratives demeurent limitées. Il conviendrait sans doute d'envisager une application progressive, en commençant par les grandes chaînes disposant des moyens nécessaires, avant d'étendre progressivement l'obligation. Cela dit, on ne saurait ignorer que les consommateurs sont de plus en plus nombreux à réclamer cette information, ne serait-ce que pour des raisons éthiques ou environnementales, ce qui plaide en faveur d'une évolution — même graduelle — de la réglementation actuelle. (112 mots)",
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
  // ── Nouveaux scénarios EO ──
  {
    titre: "Section A : Obtenir des renseignements (santé)",
    base: "Candidat : Bonjour, j'aimerais m'inscrire comme patient à votre clinique. Quelles sont les étapes ?",
    variantes: [
      ["Question retour", "« Avez-vous un médecin de famille actuellement ? »", "Répondre honnêtement et relancer sur les délais d'attente"],
      ["Objection", "« Nous n'acceptons plus de nouveaux patients pour le moment »", "Demander des alternatives (liste d'attente, clinique partenaire)"],
      ["Précision", "« Il nous faut votre carte d'assurance maladie et une preuve d'adresse »", "Demander si des rendez-vous en ligne sont possibles"],
    ],
  },
  {
    titre: "Section A : Faire une réclamation (commerce)",
    base: "Candidat : Bonjour, j'ai acheté ce téléphone ici il y a deux semaines et l'écran ne fonctionne plus correctement.",
    variantes: [
      ["Question retour", "« Avez-vous votre facture et la garantie ? »", "Confirmer, présenter les documents et demander les options"],
      ["Objection", "« Malheureusement, les dommages physiques ne sont pas couverts par la garantie »", "Expliquer que ce n'est pas un dommage physique mais un défaut, demander un superviseur"],
      ["Proposition", "« On peut vous proposer une réparation sous 10 jours ouvrables »", "Négocier un échange ou un prêt en attendant"],
    ],
  },
  {
    titre: "Section B : Argumenter (environnement)",
    base: "Candidat : Sur cette affiche, on voit une campagne pour encourager les citoyens à utiliser les transports en commun plutôt que leur voiture…",
    variantes: [
      ["Objection pratique", "« Les transports en commun ne desservent pas bien mon quartier »", "Reconnaître le problème et argumenter sur les améliorations possibles et le covoiturage"],
      ["Objection liberté", "« C'est mon droit d'utiliser ma voiture comme je veux »", "Nuancer entre liberté individuelle et responsabilité collective, évoquer la pollution"],
      ["Accord", "« Je suis d'accord, mais c'est quand même cher l'abonnement »", "Comparer le coût global (essence, assurance, stationnement) vs abonnement mensuel"],
    ],
  },
  {
    titre: "Section B : Argumenter (débat éducation numérique)",
    base: "Candidat : Ce document montre que 70 % des écoles québécoises ont intégré des tablettes numériques dans l'enseignement…",
    variantes: [
      ["Objection santé", "« Les écrans, c'est mauvais pour les yeux des enfants »", "Nuancer avec les bénéfices pédagogiques et proposer un encadrement du temps d'écran"],
      ["Objection inégalité", "« Toutes les familles n'ont pas les moyens de fournir une tablette »", "Reconnaître le problème et argumenter pour un financement public des équipements"],
      ["Provocation", "« On apprend mieux avec un livre, la technologie c'est une mode »", "Défendre la complémentarité livre-numérique sans dénigrer l'interlocuteur, citer des études"],
    ],
  },
  // ── 2 nouveaux scénarios EO (fichier EE_EO_Entrainement_Ajout) ──
  {
    titre: "Section A : Obtenir des renseignements (changement d'adresse bancaire)",
    base: "Candidat : Bonjour, j'ai déménagé récemment et j'aimerais mettre à jour mon adresse pour mon compte bancaire.",
    variantes: [
      ["Précision (identité)", "« Pour des raisons de sécurité, je vais devoir vérifier votre identité, vous avez une pièce d'identité sur vous ? »", "Répondre avec assurance à une vérification de sécurité, sans être déstabilisé"],
      ["Question retour", "« Vous voulez aussi mettre à jour l'adresse sur votre carte de crédit, ou seulement pour le compte principal ? »", "Clarifier sa demande avec précision"],
      ["Objection (délai)", "« Sachez que la mise à jour peut prendre jusqu'à 5 jours ouvrables avant d'être effective. »", "Réagir à un délai, demander si une confirmation immédiate est possible en attendant"],
    ],
  },
  {
    titre: "Section B : Argumenter (atelier réparation vélos communautaire)",
    base: "Candidat : Cette annonce présente un atelier communautaire où on peut apprendre à réparer son vélo soi-même, avec l'aide de bénévoles. Je pense que ça pourrait vous être utile.",
    variantes: [
      ["Objection (compétence)", "« Je ne connais absolument rien à la mécanique, ça me semble intimidant. »", "Rassurer sur l'accompagnement offert, insister sur l'aspect débutant bienvenu"],
      ["Objection (utilité)", "« De toute façon, je peux juste payer quelqu'un pour réparer mon vélo, ça revient au même. »", "Réorienter l'argument sur l'aspect économique à long terme (autonomie, économies futures)"],
      ["Acceptation immédiate", "« D'accord, ça a l'air intéressant, ça se passe quand exactement ? »", "Clôturer efficacement avec une information concrète (jour, lieu)"],
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
