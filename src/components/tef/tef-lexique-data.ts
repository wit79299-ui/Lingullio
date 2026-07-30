/**
 * Enriched lexique data for interactive TEF vocabulary training.
 *
 * Each domain has vocabulary entries organized by NCLC stage (I, II, III)
 * with definitions, example sentences, synonyms, and auto-generated quiz items.
 */

export interface VocabEntry {
  /** The word or expression */
  term: string;
  /** Short definition */
  definition: string;
  /** Example sentence using the term (with the term in **bold** markers) */
  example: string;
  /** Synonyms or related terms */
  synonyms: string[];
  /** NCLC stage: 1 = NCLC 1-4, 2 = NCLC 5-7, 3 = NCLC 8-12 */
  stage: 1 | 2 | 3;
  /** Register: familier, courant, soutenu */
  register: 'familier' | 'courant' | 'soutenu';
}

export interface QuizQuestion {
  type: 'synonym' | 'definition' | 'fill_blank' | 'register';
  question: string;
  choices: string[];
  correctIndex: number;
  /** Reference term for TTS dictée */
  term: string;
}

export interface LexiqueDomain {
  id: string;
  domaine: string;
  icon: string;
  entries: VocabEntry[];
  /** Auto-generated quiz questions */
  quizQuestions: QuizQuestion[];
}

// ── Helper: build quiz questions from entries ──
function buildQuiz(entries: VocabEntry[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  for (const entry of entries) {
    // 1. Definition question
    const wrongDefs = entries
      .filter(e => e.term !== entry.term && e.stage === entry.stage)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map(e => e.definition);
    if (wrongDefs.length >= 2) {
      const choices = [entry.definition, ...wrongDefs].sort(() => Math.random() - 0.5);
      questions.push({
        type: 'definition',
        question: `Quelle est la définition de « ${entry.term} » ?`,
        choices,
        correctIndex: choices.indexOf(entry.definition),
        term: entry.term,
      });
    }

    // 2. Synonym question (if synonyms exist)
    if (entry.synonyms.length > 0) {
      const wrongSyns = entries
        .filter(e => e.term !== entry.term && !entry.synonyms.includes(e.term))
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map(e => e.term);
      if (wrongSyns.length >= 2) {
        const correctSyn = entry.synonyms[0];
        const choices = [correctSyn, ...wrongSyns].sort(() => Math.random() - 0.5);
        questions.push({
          type: 'synonym',
          question: `Quel est un synonyme de « ${entry.term} » ?`,
          choices,
          correctIndex: choices.indexOf(correctSyn),
          term: entry.term,
        });
      }
    }

    // 3. Fill blank question
    if (entry.example.includes('**')) {
      const blank = entry.example.replace(/\*\*[^*]+\*\*/g, '______');
      const wrongTerms = entries
        .filter(e => e.term !== entry.term)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map(e => e.term);
      if (wrongTerms.length >= 2) {
        const choices = [entry.term, ...wrongTerms].sort(() => Math.random() - 0.5);
        questions.push({
          type: 'fill_blank',
          question: `Complétez : ${blank}`,
          choices,
          correctIndex: choices.indexOf(entry.term),
          term: entry.term,
        });
      }
    }

    // 4. Register question
    if (entry.stage >= 2) {
      const registerLabels = { familier: 'Familier', courant: 'Courant', soutenu: 'Soutenu' };
      const choices = ['Familier', 'Courant', 'Soutenu'];
      questions.push({
        type: 'register',
        question: `Quel est le registre de « ${entry.term} » ?`,
        choices,
        correctIndex: choices.indexOf(registerLabels[entry.register]),
        term: entry.term,
      });
    }
  }

  return questions;
}

// ══════════════════════════════════════════════════════════════════════════
// ENRICHED DOMAIN DATA
// ══════════════════════════════════════════════════════════════════════════

const rawDomains: Omit<LexiqueDomain, 'quizQuestions'>[] = [
  {
    id: 'identite',
    domaine: 'Identité & vie quotidienne',
    icon: '🏠',
    entries: [
      { term: 'se lever', definition: 'Sortir du lit, commencer sa journée', example: 'Je dois **se lever** tôt pour aller au travail.', synonyms: ['se réveiller'], stage: 1, register: 'courant' },
      { term: 'la famille', definition: 'Ensemble des personnes liées par le sang ou le mariage', example: 'Ma **famille** habite à Montréal.', synonyms: ['les proches', 'le foyer'], stage: 1, register: 'courant' },
      { term: 'habiter', definition: 'Résider dans un lieu de manière stable', example: 'Nous **habitons** dans un quartier calme.', synonyms: ['résider', 'demeurer', 'vivre'], stage: 1, register: 'courant' },
      { term: 'le quotidien', definition: 'Ce qui se passe chaque jour, la routine', example: 'Le **quotidien** au Canada est très différent de chez moi.', synonyms: ['la routine', 'le train-train'], stage: 2, register: 'courant' },
      { term: "s'adapter", definition: "Modifier son comportement pour s'ajuster à un nouvel environnement", example: "Il faut **s'adapter** au climat canadien.", synonyms: ["s'ajuster", "s'acclimater"], stage: 2, register: 'courant' },
      { term: 'le voisinage', definition: 'Les personnes qui habitent à proximité', example: 'Le **voisinage** est très accueillant ici.', synonyms: ['les voisins', 'le quartier'], stage: 2, register: 'courant' },
      { term: "l'ancrage", definition: "Le fait d'être profondément établi dans un lieu ou une communauté", example: "**L'ancrage** dans une nouvelle ville prend du temps.", synonyms: ["l'enracinement", "l'implantation"], stage: 3, register: 'soutenu' },
      { term: 'la sociabilité', definition: 'Aptitude à vivre en société et à nouer des relations', example: 'Sa **sociabilité** lui a permis de se faire rapidement des amis.', synonyms: ["l'entregent", 'la convivialité'], stage: 3, register: 'soutenu' },
      { term: 'la métamorphose personnelle', definition: 'Transformation profonde de la personnalité ou du mode de vie', example: "L'immigration provoque souvent une **métamorphose personnelle**.", synonyms: ['la transformation', 'le bouleversement'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'logement',
    domaine: 'Logement & vie pratique',
    icon: '🏢',
    entries: [
      { term: "l'appartement", definition: 'Logement dans un immeuble collectif', example: "Nous cherchons un **appartement** de deux chambres.", synonyms: ['le logement', 'le condo'], stage: 1, register: 'courant' },
      { term: 'le loyer', definition: 'Somme payée mensuellement pour occuper un logement', example: 'Le **loyer** à Vancouver est très élevé.', synonyms: ['le prix du bail'], stage: 1, register: 'courant' },
      { term: 'déménager', definition: "Changer de lieu d'habitation", example: 'Nous allons **déménager** le mois prochain.', synonyms: ['changer de logement'], stage: 1, register: 'courant' },
      { term: 'le bail', definition: "Contrat de location entre propriétaire et locataire", example: "J'ai signé un **bail** d'un an.", synonyms: ['le contrat de location'], stage: 2, register: 'courant' },
      { term: 'la caution', definition: 'Somme versée en garantie au début de la location', example: 'La **caution** équivaut à un mois de loyer.', synonyms: ['le dépôt de garantie'], stage: 2, register: 'courant' },
      { term: "l'état des lieux", definition: "Document décrivant l'état du logement à l'entrée et à la sortie", example: "Nous avons fait **l'état des lieux** ensemble.", synonyms: ['le constat'], stage: 2, register: 'courant' },
      { term: 'les charges', definition: 'Frais supplémentaires liés au logement (eau, chauffage, entretien)', example: 'Les **charges** sont comprises dans le loyer.', synonyms: ['les frais annexes'], stage: 2, register: 'courant' },
      { term: 'la copropriété', definition: "Régime juridique d'un immeuble partagé entre plusieurs propriétaires", example: 'Les décisions de **copropriété** sont prises en assemblée.', synonyms: ['le syndicat'], stage: 3, register: 'soutenu' },
      { term: 'le litige locatif', definition: 'Conflit juridique entre locataire et propriétaire', example: 'Un **litige locatif** peut être résolu par la Régie du logement.', synonyms: ['le différend', 'le conflit'], stage: 3, register: 'soutenu' },
      { term: 'la mise en demeure', definition: "Lettre formelle exigeant l'exécution d'une obligation", example: "J'ai envoyé une **mise en demeure** au propriétaire.", synonyms: ['la sommation', "l'injonction"], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'travail',
    domaine: "Travail & recherche d'emploi",
    icon: '💼',
    entries: [
      { term: 'le salaire', definition: "Rémunération perçue en échange d'un travail", example: 'Mon **salaire** est versé le 15 de chaque mois.', synonyms: ['la rémunération', 'la paie'], stage: 1, register: 'courant' },
      { term: 'embaucher', definition: 'Recruter quelqu\'un pour un emploi', example: "L'entreprise va **embaucher** dix personnes.", synonyms: ['recruter', 'engager'], stage: 1, register: 'courant' },
      { term: "l'entretien d'embauche", definition: "Rencontre entre un candidat et un recruteur", example: "J'ai un **entretien d'embauche** demain matin.", synonyms: ["l'entrevue"], stage: 2, register: 'courant' },
      { term: 'la candidature', definition: "Proposition d'un candidat pour un poste", example: "J'ai envoyé ma **candidature** en ligne.", synonyms: ['la postulation'], stage: 2, register: 'courant' },
      { term: "la période d'essai", definition: "Phase initiale d'un contrat permettant d'évaluer le salarié", example: "Ma **période d'essai** dure trois mois.", synonyms: ['la probation'], stage: 2, register: 'courant' },
      { term: 'la reconversion', definition: "Changement radical d'orientation professionnelle", example: 'Après 15 ans en banque, il envisage une **reconversion**.', synonyms: ['la réorientation'], stage: 3, register: 'soutenu' },
      { term: "l'employabilité", definition: "Capacité d'une personne à trouver et conserver un emploi", example: "La formation améliore **l'employabilité** des candidats.", synonyms: ['la compétitivité professionnelle'], stage: 3, register: 'soutenu' },
      { term: 'le plafond de verre', definition: "Barrière invisible empêchant l'avancement professionnel de certains groupes", example: 'Les femmes se heurtent souvent au **plafond de verre**.', synonyms: ['la barrière invisible'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'education',
    domaine: 'Éducation & formation',
    icon: '🎓',
    entries: [
      { term: "l'école", definition: "Établissement d'enseignement", example: "Les enfants vont à **l'école** à pied.", synonyms: ["l'établissement scolaire"], stage: 1, register: 'courant' },
      { term: 'le diplôme', definition: "Titre officiel attestant d'une qualification", example: "Son **diplôme** n'est pas reconnu au Canada.", synonyms: ['le titre', 'le certificat'], stage: 1, register: 'courant' },
      { term: 'la formation continue', definition: 'Apprentissage tout au long de la vie professionnelle', example: 'Mon employeur finance la **formation continue**.', synonyms: ['le perfectionnement'], stage: 2, register: 'courant' },
      { term: "l'équivalence de diplôme", definition: 'Reconnaissance officielle qu\'un diplôme étranger vaut un diplôme local', example: "J'attends mon **équivalence de diplôme** du WES.", synonyms: ['la reconnaissance des acquis'], stage: 2, register: 'courant' },
      { term: "l'accréditation professionnelle", definition: "Reconnaissance officielle permettant d'exercer une profession réglementée", example: "**L'accréditation professionnelle** est obligatoire pour les ingénieurs.", synonyms: ['la certification', "l'agrément"], stage: 3, register: 'soutenu' },
      { term: 'la VAE', definition: "Validation des acquis de l'expérience — obtenir un diplôme grâce à l'expérience", example: 'Grâce à la **VAE**, elle a obtenu son diplôme sans retourner à l\'université.', synonyms: ['la validation des acquis'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'sante',
    domaine: 'Santé & bien-être',
    icon: '🏥',
    entries: [
      { term: 'le médecin', definition: 'Professionnel de santé qui diagnostique et soigne', example: 'J\'ai rendez-vous chez le **médecin** cet après-midi.', synonyms: ['le docteur', 'le praticien'], stage: 1, register: 'courant' },
      { term: 'le rendez-vous', definition: 'Rencontre planifiée à une heure et un lieu précis', example: "Mon **rendez-vous** est à 14 heures.", synonyms: ["la consultation"], stage: 1, register: 'courant' },
      { term: "l'assurance maladie", definition: "Système de protection sociale couvrant les frais de santé", example: "**L'assurance maladie** du Québec couvre les soins de base.", synonyms: ['la RAMQ', 'la couverture santé'], stage: 2, register: 'courant' },
      { term: 'le suivi médical', definition: "Ensemble des consultations régulières pour surveiller l'état de santé", example: 'Un bon **suivi médical** est essentiel pendant la grossesse.', synonyms: ["l'accompagnement médical"], stage: 2, register: 'courant' },
      { term: 'le parcours de soins', definition: "Ensemble organisé des étapes de prise en charge d'un patient", example: 'Le **parcours de soins** au Canada est différent de la France.', synonyms: ['le cheminement thérapeutique'], stage: 3, register: 'soutenu' },
      { term: 'la résilience psychologique', definition: "Capacité à surmonter les épreuves et à se reconstruire", example: "L'immigration exige une grande **résilience psychologique**.", synonyms: ['la force mentale', 'la capacité d\'adaptation'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'administration',
    domaine: 'Administration & immigration',
    icon: '📋',
    entries: [
      { term: 'le formulaire', definition: 'Document avec des cases à remplir', example: 'Remplissez ce **formulaire** en lettres majuscules.', synonyms: ['le document', 'la fiche'], stage: 1, register: 'courant' },
      { term: 'signer', definition: 'Apposer sa signature sur un document', example: 'Vous devez **signer** en bas de la page.', synonyms: ['parapher'], stage: 1, register: 'courant' },
      { term: 'le dossier', definition: 'Ensemble de documents relatifs à une demande', example: 'Mon **dossier** est en cours de traitement.', synonyms: ['la demande'], stage: 2, register: 'courant' },
      { term: 'le délai de traitement', definition: "Temps nécessaire pour traiter une demande administrative", example: 'Le **délai de traitement** est de 6 mois.', synonyms: ['le temps de réponse'], stage: 2, register: 'courant' },
      { term: "l'admissibilité", definition: "Fait de remplir les conditions requises pour être accepté", example: "Vérifiez votre **admissibilité** avant de postuler.", synonyms: ["l'éligibilité"], stage: 2, register: 'courant' },
      { term: 'le Système de classement global', definition: "Système de points utilisé par Entrée express pour classer les candidats à l'immigration", example: 'Mon score au **Système de classement global** est de 470 points.', synonyms: ['le SCG', 'le CRS'], stage: 3, register: 'soutenu' },
      { term: 'la conformité', definition: 'Respect des règles et normes établies', example: 'Votre dossier doit être en **conformité** avec les exigences.', synonyms: ['le respect des normes'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'societe',
    domaine: 'Société, actualité & médias',
    icon: '📰',
    entries: [
      { term: 'la nouvelle', definition: "Information récente communiquée au public", example: "J'ai appris la **nouvelle** ce matin.", synonyms: ["l'information", "l'actualité"], stage: 1, register: 'courant' },
      { term: 'le journal', definition: 'Publication périodique d\'informations', example: 'Je lis le **journal** chaque matin.', synonyms: ['le quotidien', 'la presse'], stage: 1, register: 'courant' },
      { term: "l'actualité", definition: "Ensemble des événements récents et pertinents", example: "**L'actualité** internationale est préoccupante.", synonyms: ['les nouvelles', 'les faits du jour'], stage: 2, register: 'courant' },
      { term: 'le débat public', definition: 'Discussion ouverte sur un sujet de société', example: 'Le **débat public** sur l\'immigration est vif.', synonyms: ['la discussion citoyenne'], stage: 2, register: 'courant' },
      { term: 'la polarisation', definition: 'Division marquée de la société en camps opposés', example: 'La **polarisation** du débat empêche le dialogue.', synonyms: ['la division', 'le clivage'], stage: 3, register: 'soutenu' },
      { term: 'la désinformation', definition: "Diffusion volontaire d'informations fausses ou trompeuses", example: 'La **désinformation** se propage rapidement sur les réseaux.', synonyms: ['les fake news', 'l\'intox'], stage: 3, register: 'soutenu' },
      { term: 'le biais médiatique', definition: 'Tendance des médias à présenter les faits de manière orientée', example: 'Il faut être conscient du **biais médiatique** pour bien s\'informer.', synonyms: ['la partialité'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'environnement',
    domaine: 'Environnement',
    icon: '🌿',
    entries: [
      { term: 'le climat', definition: "Ensemble des conditions météorologiques d'une région", example: "Le **climat** du Canada est rude en hiver.", synonyms: ['la météo'], stage: 1, register: 'courant' },
      { term: 'protéger', definition: 'Mettre à l\'abri d\'un danger', example: 'Il faut **protéger** la nature.', synonyms: ['préserver', 'sauvegarder'], stage: 1, register: 'courant' },
      { term: 'le réchauffement', definition: "Augmentation de la température moyenne de la Terre", example: 'Le **réchauffement** climatique est un défi mondial.', synonyms: ['le changement climatique'], stage: 2, register: 'courant' },
      { term: 'le développement durable', definition: 'Développement qui répond aux besoins présents sans compromettre l\'avenir', example: 'Cette entreprise s\'engage pour le **développement durable**.', synonyms: ['la durabilité'], stage: 2, register: 'courant' },
      { term: 'la transition énergétique', definition: 'Passage des énergies fossiles aux énergies renouvelables', example: 'La **transition énergétique** est une priorité nationale.', synonyms: ['le virage énergétique'], stage: 3, register: 'soutenu' },
      { term: "l'empreinte carbone", definition: "Quantité de CO₂ émise par une activité ou une personne", example: "Réduire son **empreinte carbone** passe par moins de vols.", synonyms: ['le bilan carbone'], stage: 3, register: 'soutenu' },
      { term: 'la sobriété', definition: 'Réduction volontaire de la consommation de ressources', example: 'La **sobriété** énergétique est encouragée par le gouvernement.', synonyms: ['la modération', 'la frugalité'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'technologie',
    domaine: 'Technologie & numérique',
    icon: '💻',
    entries: [
      { term: "l'ordinateur", definition: 'Machine électronique de traitement de données', example: "J'utilise **l'ordinateur** pour travailler.", synonyms: ['le PC', 'le portable'], stage: 1, register: 'courant' },
      { term: 'internet', definition: 'Réseau informatique mondial', example: "**Internet** a changé nos habitudes de vie.", synonyms: ['le web', 'le réseau'], stage: 1, register: 'courant' },
      { term: 'le télétravail', definition: 'Travail effectué à distance grâce aux outils numériques', example: 'Le **télétravail** s\'est généralisé depuis 2020.', synonyms: ['le travail à distance'], stage: 2, register: 'courant' },
      { term: 'la sécurité numérique', definition: 'Protection des données et systèmes informatiques', example: 'La **sécurité numérique** est un enjeu majeur pour les entreprises.', synonyms: ['la cybersécurité'], stage: 2, register: 'courant' },
      { term: "l'intelligence artificielle", definition: "Simulation de l'intelligence humaine par des machines", example: "**L'intelligence artificielle** transforme le marché du travail.", synonyms: ["l'IA"], stage: 3, register: 'soutenu' },
      { term: 'la fracture numérique', definition: 'Inégalité d\'accès aux technologies numériques', example: 'La **fracture numérique** touche surtout les personnes âgées.', synonyms: ['le fossé numérique'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'finances',
    domaine: 'Consommation & finances',
    icon: '💰',
    entries: [
      { term: 'acheter', definition: 'Acquérir un bien en payant', example: "Je vais **acheter** des provisions.", synonyms: ['acquérir', 'se procurer'], stage: 1, register: 'courant' },
      { term: "l'argent", definition: 'Moyen d\'échange utilisé pour les transactions', example: "**L'argent** ne fait pas le bonheur.", synonyms: ['les fonds', 'les finances'], stage: 1, register: 'courant' },
      { term: 'le budget', definition: 'Plan prévisionnel des dépenses et revenus', example: 'Il faut établir un **budget** mensuel.', synonyms: ['le plan financier'], stage: 2, register: 'courant' },
      { term: "l'épargne", definition: "Part du revenu mise de côté", example: "**L'épargne** est importante pour les imprévus.", synonyms: ['les économies'], stage: 2, register: 'courant' },
      { term: 'le crédit', definition: "Somme prêtée par une banque à rembourser avec intérêts", example: "J'ai contracté un **crédit** pour acheter ma voiture.", synonyms: ['le prêt', 'l\'emprunt'], stage: 2, register: 'courant' },
      { term: 'la fiscalité', definition: "Ensemble des lois et pratiques relatives aux impôts", example: 'La **fiscalité** canadienne est complexe.', synonyms: ['le système fiscal'], stage: 3, register: 'soutenu' },
      { term: 'la planification financière', definition: "Stratégie à long terme pour gérer ses finances", example: 'Une bonne **planification financière** commence tôt.', synonyms: ['la gestion patrimoniale'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'relations',
    domaine: 'Relations sociales & culture',
    icon: '🤝',
    entries: [
      { term: "l'ami", definition: 'Personne avec qui on a des liens d\'affection', example: "Mon meilleur **ami** est Québécois.", synonyms: ['le copain', 'le camarade'], stage: 1, register: 'courant' },
      { term: 'la fête', definition: 'Célébration, réjouissance collective', example: 'On organise une **fête** pour le Nouvel An.', synonyms: ['la célébration', 'la soirée'], stage: 1, register: 'courant' },
      { term: "l'intégration", definition: 'Processus par lequel une personne s\'insère dans un groupe', example: "**L'intégration** des immigrants passe par la langue.", synonyms: ["l'insertion", "l'inclusion"], stage: 2, register: 'courant' },
      { term: 'la diversité culturelle', definition: 'Coexistence de différentes cultures dans une société', example: 'Le Canada célèbre la **diversité culturelle**.', synonyms: ['le multiculturalisme'], stage: 2, register: 'courant' },
      { term: 'le métissage culturel', definition: 'Mélange et fusion de cultures différentes', example: 'Le **métissage culturel** enrichit la société.', synonyms: ['le brassage culturel', 'la fusion'], stage: 3, register: 'soutenu' },
      { term: 'la cohésion sociale', definition: "Capacité d'une société à fonctionner harmonieusement", example: 'La **cohésion sociale** est mise à mal par les inégalités.', synonyms: ['le vivre-ensemble', 'la solidarité'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'voyage',
    domaine: 'Voyage & mobilité',
    icon: '✈️',
    entries: [
      { term: 'le billet', definition: "Titre de transport", example: "J'ai acheté un **billet** d'avion pour Toronto.", synonyms: ['le ticket'], stage: 1, register: 'courant' },
      { term: "l'avion", definition: 'Véhicule aérien de transport', example: "**L'avion** décolle à 8 heures.", synonyms: ['l\'aéronef'], stage: 1, register: 'courant' },
      { term: 'le transport en commun', definition: "Système de transport collectif (bus, métro, tramway)", example: 'Je prends le **transport en commun** tous les jours.', synonyms: ['les transports publics'], stage: 2, register: 'courant' },
      { term: "l'itinéraire", definition: "Trajet planifié d'un point à un autre", example: 'Quel est **l\'itinéraire** le plus rapide ?', synonyms: ['le parcours', 'le trajet'], stage: 2, register: 'courant' },
      { term: 'la mobilité durable', definition: 'Déplacements respectueux de l\'environnement', example: 'La ville investit dans la **mobilité durable**.', synonyms: ['les transports verts'], stage: 3, register: 'soutenu' },
      { term: "l'aménagement urbain", definition: "Organisation et planification de l'espace d'une ville", example: "**L'aménagement urbain** de Montréal favorise le vélo.", synonyms: ['l\'urbanisme'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'droit',
    domaine: 'Droit, justice & citoyenneté',
    icon: '⚖️',
    entries: [
      { term: 'la loi', definition: 'Règle juridique votée par le parlement', example: 'La **loi** interdit la discrimination.', synonyms: ['la législation', 'le texte de loi'], stage: 1, register: 'courant' },
      { term: 'voter', definition: 'Exprimer son choix lors d\'une élection', example: 'Les citoyens canadiens peuvent **voter** dès 18 ans.', synonyms: ['élire', 'se prononcer'], stage: 1, register: 'courant' },
      { term: 'les droits et libertés', definition: 'Ensemble des droits fondamentaux garantis aux individus', example: 'La Charte protège les **droits et libertés** de tous.', synonyms: ['les libertés fondamentales'], stage: 2, register: 'courant' },
      { term: 'le tribunal', definition: 'Institution chargée de rendre la justice', example: "L'affaire sera jugée par le **tribunal**.", synonyms: ['la cour', 'la juridiction'], stage: 2, register: 'courant' },
      { term: "l'État de droit", definition: "Système où tous sont soumis à la loi, y compris les gouvernants", example: "**L'État de droit** est un pilier de la démocratie.", synonyms: ['la primauté du droit'], stage: 3, register: 'soutenu' },
      { term: 'la jurisprudence', definition: 'Ensemble des décisions de justice servant de référence', example: 'La **jurisprudence** a évolué sur cette question.', synonyms: ['le droit prétorien'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'sport',
    domaine: 'Sport & loisirs',
    icon: '⚽',
    entries: [
      { term: 'le sport', definition: 'Activité physique pratiquée pour le plaisir ou la compétition', example: 'Le **sport** est bon pour la santé.', synonyms: ["l'activité physique"], stage: 1, register: 'courant' },
      { term: 'le match', definition: 'Rencontre sportive entre deux équipes', example: 'Le **match** de hockey est ce soir.', synonyms: ['la partie', 'la rencontre'], stage: 1, register: 'courant' },
      { term: "l'entraînement", definition: 'Préparation physique et technique régulière', example: "**L'entraînement** a lieu trois fois par semaine.", synonyms: ['la pratique', 'la préparation'], stage: 2, register: 'courant' },
      { term: 'la compétition', definition: 'Épreuve sportive avec classement', example: 'Elle participe à une **compétition** nationale.', synonyms: ['le tournoi', 'le championnat'], stage: 2, register: 'courant' },
      { term: 'le dépassement de soi', definition: 'Fait de repousser ses propres limites', example: 'Le marathon est un exercice de **dépassement de soi**.', synonyms: ['le surpassement'], stage: 3, register: 'soutenu' },
      { term: 'le fair-play', definition: 'Respect des règles et de l\'adversaire', example: 'Le **fair-play** est une valeur essentielle du sport.', synonyms: ['l\'esprit sportif'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'alimentation',
    domaine: 'Alimentation & gastronomie',
    icon: '🍽️',
    entries: [
      { term: 'cuisiner', definition: 'Préparer des aliments pour les manger', example: "J'aime **cuisiner** des plats québécois.", synonyms: ['préparer', 'faire la cuisine'], stage: 1, register: 'courant' },
      { term: 'la nourriture', definition: 'Ce que l\'on mange', example: 'La **nourriture** canadienne est variée.', synonyms: ['les aliments', 'la bouffe'], stage: 1, register: 'courant' },
      { term: "l'alimentation équilibrée", definition: "Régime alimentaire varié et adapté aux besoins du corps", example: "Une **alimentation équilibrée** prévient de nombreuses maladies.", synonyms: ['la diète saine'], stage: 2, register: 'courant' },
      { term: 'le marché local', definition: 'Lieu de vente de produits locaux', example: 'J\'achète mes légumes au **marché local**.', synonyms: ['le marché fermier'], stage: 2, register: 'courant' },
      { term: 'la souveraineté alimentaire', definition: "Droit d'un peuple à définir sa propre politique alimentaire", example: "La **souveraineté alimentaire** est un enjeu politique.", synonyms: ["l'autosuffisance alimentaire"], stage: 3, register: 'soutenu' },
      { term: 'le circuit court', definition: 'Vente directe du producteur au consommateur avec peu d\'intermédiaires', example: 'Acheter en **circuit court** soutient les agriculteurs.', synonyms: ['la vente directe'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'arts',
    domaine: 'Arts, culture & médias',
    icon: '🎭',
    entries: [
      { term: 'le film', definition: 'Œuvre cinématographique', example: "Ce **film** québécois a gagné un prix.", synonyms: ['le long-métrage'], stage: 1, register: 'courant' },
      { term: 'la musique', definition: "Art de combiner les sons", example: 'J\'écoute de la **musique** francophone.', synonyms: ['les airs', 'les morceaux'], stage: 1, register: 'courant' },
      { term: "l'exposition", definition: "Présentation publique d'œuvres d'art", example: "**L'exposition** au musée est gratuite ce dimanche.", synonyms: ['le vernissage'], stage: 2, register: 'courant' },
      { term: 'le patrimoine', definition: 'Héritage culturel et historique d\'une communauté', example: 'Le Vieux-Québec fait partie du **patrimoine** mondial.', synonyms: ["l'héritage culturel"], stage: 2, register: 'courant' },
      { term: 'la médiation culturelle', definition: 'Action de rendre la culture accessible à tous', example: 'La **médiation culturelle** rapproche l\'art du public.', synonyms: ['la vulgarisation culturelle'], stage: 3, register: 'soutenu' },
      { term: 'le rayonnement culturel', definition: 'Influence et diffusion de la culture à l\'étranger', example: 'Le Cirque du Soleil contribue au **rayonnement culturel** du Québec.', synonyms: ["l'influence culturelle"], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'entrepreneuriat',
    domaine: 'Entrepreneuriat',
    icon: '🚀',
    entries: [
      { term: "l'entreprise", definition: 'Organisation à but commercial', example: "Mon **entreprise** emploie 15 personnes.", synonyms: ['la société', 'la compagnie'], stage: 1, register: 'courant' },
      { term: 'le client', definition: 'Personne qui achète un bien ou un service', example: 'Le **client** est toujours prioritaire.', synonyms: ["l'acheteur", 'le consommateur'], stage: 1, register: 'courant' },
      { term: "le plan d'affaires", definition: "Document décrivant la stratégie et les projections d'une entreprise", example: "Rédigez un **plan d'affaires** solide avant de vous lancer.", synonyms: ['le business plan'], stage: 2, register: 'courant' },
      { term: 'la concurrence', definition: 'Compétition entre entreprises sur un même marché', example: 'La **concurrence** est féroce dans ce secteur.', synonyms: ['la compétition', 'la rivalité'], stage: 2, register: 'courant' },
      { term: 'la levée de fonds', definition: "Opération visant à obtenir des financements d'investisseurs", example: "La startup a réussi sa **levée de fonds** de 2 millions.", synonyms: ['le financement', 'la capitalisation'], stage: 3, register: 'soutenu' },
      { term: 'la proposition de valeur', definition: 'Ce qui rend un produit/service unique et attractif', example: 'Affinez votre **proposition de valeur** pour vous démarquer.', synonyms: ["l'avantage concurrentiel"], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'politique',
    domaine: 'Politique & vie démocratique',
    icon: '🏛️',
    entries: [
      { term: 'le gouvernement', definition: "Ensemble des personnes qui dirigent un pays", example: "Le **gouvernement** a annoncé de nouvelles mesures.", synonyms: ["l'exécutif", "l'administration"], stage: 1, register: 'courant' },
      { term: "l'élection", definition: 'Processus de choix des représentants par le vote', example: "**L'élection** fédérale aura lieu en octobre.", synonyms: ['le scrutin', 'le vote'], stage: 1, register: 'courant' },
      { term: 'le débat démocratique', definition: "Discussion publique sur les choix politiques d'une société", example: 'Le **débat démocratique** est vital pour la démocratie.', synonyms: ['la délibération'], stage: 2, register: 'courant' },
      { term: 'la réforme', definition: 'Modification d\'une loi ou d\'un système pour l\'améliorer', example: 'La **réforme** de l\'éducation est en cours.', synonyms: ['le changement', 'la transformation'], stage: 2, register: 'courant' },
      { term: 'la gouvernance', definition: 'Manière dont le pouvoir est exercé et contrôlé', example: 'La bonne **gouvernance** exige de la transparence.', synonyms: ['la gestion du pouvoir'], stage: 3, register: 'soutenu' },
      { term: 'la reddition de comptes', definition: 'Obligation de justifier ses actes et décisions devant les citoyens', example: 'Les élus doivent assurer une **reddition de comptes** régulière.', synonyms: ['la redevabilité', 'la responsabilité'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'securite',
    domaine: 'Sécurité & prévention',
    icon: '🛡️',
    entries: [
      { term: 'le danger', definition: 'Situation qui menace la sécurité', example: 'Attention au **danger** sur la route verglacée.', synonyms: ['le risque', 'le péril'], stage: 1, register: 'courant' },
      { term: 'prévenir', definition: "Agir pour empêcher qu'un problème survienne", example: 'Il vaut mieux **prévenir** que guérir.', synonyms: ['anticiper', 'devancer'], stage: 1, register: 'courant' },
      { term: 'la prévention des risques', definition: 'Ensemble des actions pour réduire les dangers potentiels', example: 'La **prévention des risques** au travail est obligatoire.', synonyms: ['la gestion des risques'], stage: 2, register: 'courant' },
      { term: 'le dispositif de sécurité', definition: 'Ensemble des moyens mis en place pour assurer la sécurité', example: 'Un **dispositif de sécurité** renforcé sera déployé.', synonyms: ['le système de sécurité'], stage: 2, register: 'courant' },
      { term: 'le principe de précaution', definition: "Règle consistant à agir préventivement face à un risque incertain", example: 'Le **principe de précaution** s\'applique aux OGM.', synonyms: ['la prudence préventive'], stage: 3, register: 'soutenu' },
      { term: 'la cybermenace', definition: 'Danger lié aux attaques informatiques', example: 'La **cybermenace** est la nouvelle forme de guerre.', synonyms: ['la menace informatique'], stage: 3, register: 'soutenu' },
    ],
  },
  {
    id: 'management',
    domaine: 'Management & organisation',
    icon: '📊',
    entries: [
      { term: "l'équipe", definition: 'Groupe de personnes travaillant ensemble', example: 'Notre **équipe** est composée de 5 personnes.', synonyms: ['le groupe', 'le collectif'], stage: 1, register: 'courant' },
      { term: 'diriger', definition: "Conduire, être responsable d'un groupe", example: 'Elle **dirige** une équipe de 20 personnes.', synonyms: ['gérer', 'piloter', 'administrer'], stage: 1, register: 'courant' },
      { term: 'la gestion de projet', definition: 'Méthode d\'organisation pour atteindre des objectifs dans un délai', example: 'La **gestion de projet** agile est de plus en plus courante.', synonyms: ['le pilotage de projet'], stage: 2, register: 'courant' },
      { term: 'la délégation', definition: 'Action de confier une tâche ou une responsabilité à quelqu\'un', example: 'La **délégation** est un signe de confiance.', synonyms: ['le transfert de responsabilité'], stage: 2, register: 'courant' },
      { term: "l'échéance", definition: "Date limite à laquelle un travail doit être accompli", example: "**L'échéance** du projet est fixée au 30 mars.", synonyms: ['la deadline', 'la date butoir'], stage: 2, register: 'courant' },
      { term: 'le management transversal', definition: "Gestion d'un projet impliquant plusieurs départements sans lien hiérarchique", example: 'Le **management transversal** requiert de l\'influence plus que de l\'autorité.', synonyms: ['la gestion horizontale'], stage: 3, register: 'soutenu' },
      { term: "l'intelligence collective", definition: "Capacité d'un groupe à résoudre des problèmes mieux qu'un individu seul", example: "**L'intelligence collective** émerge quand chacun contribue.", synonyms: ['la synergie', 'la co-construction'], stage: 3, register: 'soutenu' },
    ],
  },
];

// ── Build final domains with generated quiz questions ──
export const lexiqueDomains: LexiqueDomain[] = rawDomains.map(d => ({
  ...d,
  quizQuestions: buildQuiz(d.entries),
}));

// Stats
export const LEXIQUE_STATS = {
  totalDomains: lexiqueDomains.length,
  totalEntries: lexiqueDomains.reduce((acc, d) => acc + d.entries.length, 0),
  totalQuestions: lexiqueDomains.reduce((acc, d) => acc + d.quizQuestions.length, 0),
  byStage: {
    1: lexiqueDomains.reduce((acc, d) => acc + d.entries.filter(e => e.stage === 1).length, 0),
    2: lexiqueDomains.reduce((acc, d) => acc + d.entries.filter(e => e.stage === 2).length, 0),
    3: lexiqueDomains.reduce((acc, d) => acc + d.entries.filter(e => e.stage === 3).length, 0),
  },
};
