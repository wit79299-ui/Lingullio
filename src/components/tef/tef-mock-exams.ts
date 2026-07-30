// ============================================================
// TEF Canada - 5 Complete Mock Exams (CE, CO, EE, EO)
// ============================================================
import type { QuizItem, QuizChoice, EEItem, EOItem } from './tef-data';

// ── Types for mock exams ──
export interface MockExam {
  id: number;
  label: string;
  ce: QuizItem[];
  co: QuizItem[];
  ee: EEItem[];
  eo: EOItem[];
}

// ════════════════════════════════════════
// MOCK EXAM #1
// ════════════════════════════════════════

const ce1: QuizItem[] = [
  {
    meta: "Famille A · Annonce perdue · NCLC 5",
    text: "Perdu chat gris tigré, répond au nom de Simba. Vu pour la dernière fois près du parc Lafontaine mardi soir. Collier bleu avec médaille. Récompense offerte. Contactez le 514-555-0198.",
    questions: [
      { q: "Où le chat a-t-il été vu pour la dernière fois ?", choices: [{ t: "Près du parc Lafontaine" }, { t: "Près de la médaille bleue", piege: "P1", exp: "« bleue » décrit le collier, pas un lieu ; confusion entre un objet et un lieu." }, { t: "Chez le vétérinaire", piege: "P6", exp: "Plausible pour un animal perdu en général, mais absent du texte." }], correct: 0 },
      { q: "Quel jour le chat a-t-il disparu ?", choices: [{ t: "Mardi soir" }, { t: "Mardi matin", piege: "P2", exp: "Même jour, mauvais moment de la journée." }, { t: "Mercredi soir", piege: "P2", exp: "Jour adjacent plausible." }], correct: 0 },
    ],
  },
  {
    meta: "Famille A · Cours de cuisine · NCLC 6",
    text: "Cours de cuisine italienne, tous niveaux bienvenus. Six séances les jeudis soirs de 18h à 20h, à partir du 5 septembre. Matériel fourni, ingrédients inclus dans le prix. Places limitées à 12 participants, inscription en ligne obligatoire avant le 30 août.",
    questions: [
      { q: "Que faut-il faire avant le 30 août ?", choices: [{ t: "S'inscrire en ligne" }, { t: "Apporter son matériel", piege: "P5", exp: "Contredit « matériel fourni »." }, { t: "Payer les ingrédients séparément", piege: "P5", exp: "Contredit « ingrédients inclus dans le prix »." }], correct: 0 },
      { q: "Combien de participants maximum ?", choices: [{ t: "12" }, { t: "6", piege: "P1", exp: "Confond le nombre de séances (6) avec le nombre de participants." }, { t: "20", piege: "P2", exp: "Chiffre plausible mais absent du texte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille B · Courriel professionnel · NCLC 7",
    text: "Bonjour Karim, ___(1)___ vous confirme que votre commande a été expédiée ce matin. ___(2)___ un imprévu logistique, la livraison prendra deux jours de plus que prévu. Nous nous excusons ___(3)___ ce contretemps et restons à votre disposition.",
    questions: [
      { q: "Blanc (1)", choices: [{ t: "je" }, { t: "j'y", piege: "P1", exp: "« j'y confirme » n'est pas correct ici." }, { t: "je le", piege: "P1", exp: "Pronom complément superflu, incorrect." }], correct: 0 },
      { q: "Blanc (2)", choices: [{ t: "En raison d'" }, { t: "Malgré", piege: "P5", exp: "« malgré » introduirait une contradiction." }, { t: "Sans", piege: "P5", exp: "Inverserait le sens." }], correct: 0 },
      { q: "Blanc (3)", choices: [{ t: "pour" }, { t: "de", piege: "P1", exp: "Préposition incorrecte dans cette construction." }, { t: "avec", piege: "P1", exp: "Préposition incorrecte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille C · Offres d'emploi (tableau) · NCLC 6",
    text: "| Poste | Lieu | Salaire/heure | Horaires |\n|---|---|---|---|\n| Caissier | Centre-ville | 17 $ | Jour |\n| Préposé entrepôt | Banlieue | 19 $ | Soir |\n| Livreur | Centre-ville | 18 $ | Jour |",
    questions: [
      { q: "Quel poste paie le mieux à l'heure ?", choices: [{ t: "Préposé entrepôt" }, { t: "Livreur", piege: "P2", exp: "18$ est proche de 19$, teste la lecture précise." }, { t: "Caissier", piege: "P2", exp: "Plus bas salaire du tableau." }], correct: 0 },
      { q: "Quel poste est en centre-ville ET paie plus de 17$/h ?", choices: [{ t: "Livreur" }, { t: "Caissier", piege: "P2", exp: "Centre-ville mais paie exactement 17$, pas plus." }, { t: "Préposé entrepôt", piege: "P5", exp: "Ni centre-ville ni jour." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Éditorial rénovation · NCLC 9",
    text: "Loin de se réduire à une simple question de coût, le débat sur la rénovation énergétique des bâtiments anciens révèle une tension plus profonde entre préservation patrimoniale et impératifs climatiques. Certains architectes plaident pour une flexibilité réglementaire accrue, arguant que des normes trop rigides découragent précisément les propriétaires qu'elles cherchent à responsabiliser. D'autres y voient au contraire le risque d'un nivellement par le bas, où l'urgence climatique servirait de prétexte à un affaiblissement des protections patrimoniales.",
    questions: [
      { q: "Quelle est la tension centrale décrite dans le texte ?", choices: [{ t: "Entre préservation du patrimoine et urgence climatique" }, { t: "Entre propriétaires et architectes", piege: "P6", exp: "Ces deux groupes sont mentionnés mais leur opposition n'est pas la tension centrale." }, { t: "Entre coût et rapidité des travaux", piege: "P4", exp: "Le texte dit justement que le débat ne se réduit PAS au coût." }], correct: 0 },
      { q: "Que craignent certains à propos d'une flexibilité accrue ?", choices: [{ t: "Un affaiblissement des protections patrimoniales" }, { t: "Une hausse des coûts de rénovation", piege: "P6", exp: "Préoccupation plausible en général, absente de ce texte." }, { t: "Un manque d'architectes qualifiés", piege: "P6", exp: "Sur-inférence non soutenue." }], correct: 0 },
      { q: "Le mot « nivellement » dans ce contexte évoque :", choices: [{ t: "Une baisse généralisée du niveau d'exigence" }, { t: "Une répartition équitable des ressources", piege: "P1", exp: "Sens positif erroné, « nivellement par le bas » est négatif." }, { t: "Une hausse progressive des normes", piege: "P1", exp: "Sens quasiment opposé." }], correct: 0 },
    ],
  },
];

const co1: QuizItem[] = [
  {
    meta: "Section A · Dialogue court · NCLC 5 · [IMAGE]",
    text: "– Bonjour, je cherche la pharmacie la plus proche.\n– Ah, c'est facile, vous descendez cette rue, et c'est juste après la boulangerie, sur votre droite.\n– Merci beaucoup, bonne journée !",
    questions: [{ q: "Quelle image correspond ?", choices: [{ t: "Une personne qui demande son chemin vers une pharmacie", img: "/static/images/co/ex1_q1_a.jpg" }, { t: "Une personne qui achète du pain", img: "/static/images/co/ex1_q1_b.jpg", piege: "CO-P2", exp: "La boulangerie n'est qu'un repère donné dans la réponse, pas le sujet." }, { t: "Une personne qui visite une nouvelle ville", img: "/static/images/co/ex1_q1_c.jpg", piege: "CO-P2", exp: "Générique, aucun ancrage dans le dialogue." }], correct: 0 }],
  },
  {
    meta: "Section A · Dialogue court · NCLC 6",
    text: "– Tu as fini de préparer les valises pour le voyage ?\n– Presque, il me reste juste à trouver mon passeport, je ne sais plus où je l'ai rangé.\n– Regarde dans le tiroir du bureau, c'est souvent là qu'on le met.",
    questions: [{ q: "Quel est le problème de la personne ?", choices: [{ t: "Elle ne trouve plus son passeport" }, { t: "Elle n'a pas fini de faire ses valises", piege: "CO-P2", exp: "Mentionné (« presque ») mais le vrai problème est le passeport égaré." }, { t: "Elle a oublié d'acheter un billet", piege: "CO-P2", exp: "Aucun ancrage dans le dialogue, thème proche mais absent." }], correct: 0 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 6",
    text: "« Avis à la clientèle : notre magasin fermera exceptionnellement à 17h aujourd'hui pour un inventaire annuel. Nous vous remercions de terminer vos achats avant cette heure. »",
    questions: [{ q: "Quel est l'objectif de cette annonce ?", choices: [{ t: "Informer d'une fermeture plus tôt que d'habitude" }, { t: "Annoncer une fermeture définitive du magasin", piege: "CO-P6", exp: "Confond une fermeture exceptionnelle ponctuelle avec une fermeture permanente." }, { t: "Annoncer une promotion pour l'inventaire", piege: "CO-P2", exp: "Le mot « inventaire » évoque parfois des soldes, mais ce n'est pas le sujet." }], correct: 0 }],
  },
  {
    meta: "Section C · Message répondeur · NCLC 7",
    text: "« Salut, c'est Amélie. Écoute, je suis désolée mais je ne pourrai pas venir t'aider à déménager samedi finalement, j'ai un empêchement familial de dernière minute. Est-ce que je pourrais plutôt venir dimanche te donner un coup de main pour ranger ? Rappelle-moi. »",
    questions: [{ q: "Pourquoi Amélie appelle-t-elle ?", choices: [{ t: "Pour reporter son aide à un autre jour" }, { t: "Pour annuler définitivement son aide", piege: "CO-P6", exp: "Elle propose une alternative le dimanche, ce n'est pas une annulation totale." }, { t: "Pour demander de l'aide elle-même", piege: "CO-P1", exp: "Inverse les rôles, c'est elle qui proposait de l'aide." }], correct: 0 }],
  },
  {
    meta: "Section D · Opinion · NCLC 8",
    text: "« Franchement, le télétravail, moi je trouve que ça dépend énormément du métier qu'on fait. Dans mon domaine, ça marche très bien, mais j'ai des amis dans la santé ou l'enseignement pour qui ce n'est juste pas possible. Donc dire que c'est la solution pour tout le monde, je trouve ça un peu réducteur. »",
    questions: [{ q: "Quel est le point de vue de la personne ?", choices: [{ t: "L'efficacité du télétravail dépend fortement du métier exercé" }, { t: "Le télétravail devrait être généralisé à tous les métiers", piege: "CO-P7", exp: "Contredit « je trouve ça un peu réducteur » de généraliser." }, { t: "Le télétravail ne fonctionne dans aucun métier", piege: "CO-P7", exp: "Contredit « dans mon domaine, ça marche très bien »." }], correct: 0 }],
  },
  {
    meta: "Section D · Opinion · NCLC 9",
    text: "« Les taxes sur le carbone, disons que je ne suis pas contre le principe, hein, l'idée de faire payer les gros pollueurs, ça se défend. Ceci dit, dans les faits, c'est souvent le consommateur ordinaire qui finit par payer la note, via les prix qui augmentent partout. Donc voilà, sur le papier c'est une bonne idée, mais l'exécution, c'est autre chose. »",
    questions: [{ q: "Quel est le point de vue de la personne ?", choices: [{ t: "Elle approuve le principe mais critique la mise en œuvre réelle" }, { t: "Elle est totalement opposée aux taxes sur le carbone", piege: "CO-P7", exp: "Contredit « je ne suis pas contre le principe »." }, { t: "Elle pense que seuls les gros pollueurs paient", piege: "CO-P6", exp: "Contredit « c'est souvent le consommateur ordinaire qui finit par payer »." }], correct: 0 }],
  },
];

const ee1: EEItem[] = [
  {
    sujet: "Section A : Fait divers. « Ce matin, un automobiliste a découvert que son véhicule, stationné devant chez lui, avait été recouvert de peinture pendant la nuit... » Continuez cet article.",
    n6: "L'homme a immédiatement appelé la police pour signaler l'incident. Selon lui, il n'a aucune idée de qui pourrait avoir fait ça, mais il pense que ça pourrait être lié à un conflit de voisinage récent concernant une place de stationnement. Les policiers ont pris des photos et ont dit qu'ils allaient vérifier les caméras de surveillance du quartier. L'homme espère que son assurance couvrira les frais de nettoyage, qui pourraient être élevés. (85 mots)",
    n9: "Sitôt le méfait découvert, le propriétaire s'est empressé d'alerter les autorités, non sans laisser entendre qu'un différend de voisinage, portant sur l'usage récurrent d'une place de stationnement, pourrait bien être à l'origine de cet acte de vandalisme. Les enquêteurs, dépêchés sur les lieux, ont procédé aux constatations d'usage avant d'annoncer leur intention d'examiner les enregistrements des caméras environnantes, dans l'espoir d'identifier le ou les responsables. Reste que la victime, si elle nourrit l'espoir d'une prise en charge par son assureur, s'inquiète déjà du montant potentiellement conséquent des réparations. (118 mots)",
  },
  {
    sujet: "Section B : Argumentation. Certaines municipalités interdisent désormais les trottinettes électriques en libre-service dans leurs rues. Qu'en pensez-vous ?",
    n6: "Je pense que cette décision peut se comprendre, mais je ne suis pas totalement d'accord. D'un côté, les trottinettes causent parfois des accidents, surtout quand elles sont mal garées sur les trottoirs. Cependant, je pense que c'est aussi un bon moyen de transport écologique pour les courtes distances. Peut-être qu'au lieu d'interdire complètement, il faudrait mieux réglementer, par exemple avec des zones de stationnement obligatoires. Ça permettrait de garder les avantages sans les inconvénients. (88 mots)",
    n9: "Il serait sans doute excessif de considérer cette interdiction comme la seule réponse envisageable, tant les trottinettes en libre-service présentent des avantages réels en matière de mobilité urbaine et de réduction de l'empreinte carbone. Cela étant, on ne saurait ignorer les nuisances bien réelles qu'elles engendrent, qu'il s'agisse des accidents impliquant des piétons ou de l'encombrement chronique des trottoirs. Plutôt qu'une interdiction pure et simple, il conviendrait sans doute d'explorer des solutions intermédiaires — zones de stationnement dédiées, limitation de vitesse en centre-ville — qui permettraient de concilier innovation en matière de mobilité et sécurité des usagers les plus vulnérables. (128 mots)",
  },
];

const eo1: EOItem[] = [
  {
    titre: "Section A : Obtenir des renseignements — location de voiture",
    base: "Candidat : Bonjour, je voudrais des renseignements pour louer une voiture ce week-end, s'il vous plaît.",
    variantes: [
      ["Objection (disponibilité)", "« En fait, il ne nous reste plus que des véhicules haut de gamme, plus chers que la normale. »", "Réagir à une contrainte budgétaire, demander des alternatives."],
      ["Question retour", "« Vous avez votre permis depuis combien de temps ? »", "Répondre spontanément à une question de vérification."],
      ["Précision technique", "« Sachez qu'une caution de 500$ sera bloquée sur votre carte pendant la location. »", "Réagir à une information inattendue, poser une question de clarification."],
    ],
  },
  {
    titre: "Section B : Argumenter — abonnement à un service de méditation",
    base: "Candidat : Ce document présente une application de méditation guidée, avec un essai gratuit de 7 jours. Je pense que ça pourrait vous intéresser pour gérer le stress.",
    variantes: [
      ["Objection (scepticisme)", "« Honnêtement, je trouve que la méditation, c'est un peu à la mode, je n'y crois pas trop. »", "Répondre au scepticisme sans être condescendant, apporter un argument concret."],
      ["Objection (temps)", "« Je n'ai clairement pas dix minutes à consacrer à ça chaque jour. »", "Adapter l'argument à la contrainte de temps."],
      ["Acceptation immédiate", "« D'accord, ça m'intéresse, je fais comment pour m'inscrire ? »", "Clôturer efficacement, donner une marche à suivre claire."],
    ],
  },
];

// ════════════════════════════════════════
// MOCK EXAM #2
// ════════════════════════════════════════

const ce2: QuizItem[] = [
  {
    meta: "Famille A · Vente de garage · NCLC 5",
    text: "Vente de garage samedi 14 juin, 8h à 14h, au 245 rue des Érables. Vêtements, jouets, vaisselle, petits meubles. Paiement comptant seulement, pas de cartes acceptées.",
    questions: [
      { q: "Comment peut-on payer ?", choices: [{ t: "En argent comptant seulement" }, { t: "Par carte", piege: "P5", exp: "Contredit directement « pas de cartes acceptées »." }, { t: "Par virement", piege: "P6", exp: "Moyen plausible mais non mentionné." }], correct: 0 },
      { q: "Quels objets ne sont PAS mentionnés dans l'annonce ?", choices: [{ t: "Des appareils électroniques" }, { t: "Des vêtements", piege: "P5", exp: "Explicitement mentionné." }, { t: "Des jouets", piege: "P5", exp: "Explicitement mentionné." }], correct: 0 },
    ],
  },
  {
    meta: "Famille A · Piscine municipale · NCLC 6",
    text: "La piscine municipale sera ouverte tous les jours cet été, de 10h à 19h, sauf le lundi (jour de nettoyage). L'entrée est gratuite pour les enfants de moins de 5 ans, 3$ pour les 5-17 ans, 6$ pour les adultes.",
    questions: [
      { q: "Quel jour la piscine est-elle fermée ?", choices: [{ t: "Le lundi" }, { t: "Le dimanche", piege: "P2", exp: "Jour plausible mais incorrect." }, { t: "Aucun jour", piege: "P5", exp: "Ignore « sauf le lundi »." }], correct: 0 },
      { q: "Combien coûte l'entrée pour un enfant de 4 ans ?", choices: [{ t: "Gratuit" }, { t: "3$", piege: "P2", exp: "Tarif de la tranche adjacente (5-17 ans)." }, { t: "6$", piege: "P2", exp: "Tarif adulte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire · NCLC 8",
    text: "Bien que le télétravail ___(1)___ largement démocratisé depuis quelques années, toutes les entreprises ne disposent pas encore des outils nécessaires. Certaines organisations ___(2)___ investi massivement dans des plateformes collaboratives, ___(3)___ d'autres peinent encore à sortir d'un fonctionnement essentiellement présentiel.",
    questions: [
      { q: "Blanc (1)", choices: [{ t: "se soit" }, { t: "s'est", piege: "P1", exp: "« bien que » exige le subjonctif." }, { t: "sera", piege: "P1", exp: "Temps incorrect après « bien que »." }], correct: 0 },
      { q: "Blanc (2)", choices: [{ t: "ont" }, { t: "avaient", piege: "P1", exp: "Temps incohérent avec le contexte présent." }, { t: "auraient", piege: "P1", exp: "Conditionnel non justifié." }], correct: 0 },
      { q: "Blanc (3)", choices: [{ t: "tandis que" }, { t: "parce que", piege: "P5", exp: "Inverserait la relation d'opposition en cause." }, { t: "donc", piege: "P5", exp: "Inverserait la logique concessive en conséquence." }], correct: 0 },
    ],
  },
  {
    meta: "Famille C · Formations (tableau) · NCLC 7",
    text: "| Formation | Durée | Modalité | Certification |\n|---|---|---|---|\n| Comptabilité de base | 8 semaines | En ligne | Oui |\n| Gestion de projet | 12 semaines | Hybride | Oui |\n| Service à la clientèle | 4 semaines | En personne | Non |",
    questions: [
      { q: "Quelle formation dure le plus longtemps ?", choices: [{ t: "Gestion de projet" }, { t: "Comptabilité de base", piege: "P2", exp: "8 semaines, proche de 12." }, { t: "Service à la clientèle", piege: "P2", exp: "Durée la plus courte." }], correct: 0 },
      { q: "Quelle formation n'offre pas de certification ?", choices: [{ t: "Service à la clientèle" }, { t: "Comptabilité de base", piege: "P5", exp: "Le tableau indique « Oui »." }, { t: "Gestion de projet", piege: "P5", exp: "Le tableau indique « Oui »." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Commerce en ligne · NCLC 8",
    text: "L'essor du commerce en ligne a profondément transformé les attentes des consommateurs envers les commerces de proximité, sommés de rivaliser sur des critères — rapidité, prix, choix — qui ne leur sont pas naturellement favorables. Plusieurs municipalités ont réagi en soutenant financièrement la numérisation des petits commerces, une stratégie dont l'efficacité réelle reste toutefois difficile à évaluer à ce jour.",
    questions: [
      { q: "Sur quels critères les petits commerces sont-ils désavantagés ?", choices: [{ t: "Rapidité, prix, choix" }, { t: "Qualité, service, accueil", piege: "P6", exp: "Critères plausibles mais non ceux cités dans le texte." }, { t: "Localisation et horaires", piege: "P6", exp: "Non mentionnés." }], correct: 0 },
      { q: "Que pense l'auteur de l'efficacité du soutien municipal ?", choices: [{ t: "Elle reste incertaine" }, { t: "Elle est clairement positive", piege: "P4", exp: "Confond l'action des municipalités avec un jugement positif." }, { t: "Elle est un échec total", piege: "P6", exp: "Bien plus tranché que « difficile à évaluer »." }], correct: 0 },
    ],
  },
];

const co2: QuizItem[] = [
  {
    meta: "Section A · Dialogue court · NCLC 5 · [IMAGE]",
    text: "– Vous désirez autre chose avec votre café ?\n– Oui, un croissant s'il vous plaît, et pour emporter.\n– Très bien, ça fait 5 dollars 75.",
    questions: [{ q: "Quelle image correspond ?", choices: [{ t: "Une personne qui commande à emporter dans un café", img: "/static/images/co/ex2_q1_a.jpg" }, { t: "Une personne qui mange sur place au restaurant", img: "/static/images/co/ex2_q1_b.jpg", piege: "CO-P2", exp: "« pour emporter » est un mot clé facile à manquer." }, { t: "Une personne qui paie une addition à plusieurs", img: "/static/images/co/ex2_q1_c.jpg", piege: "CO-P2", exp: "Aucun ancrage, générique." }], correct: 0 }],
  },
  {
    meta: "Section A · Dialogue court · NCLC 7",
    text: "– J'ai vu que le loyer de l'appartement a encore augmenté cette année.\n– Oui, c'est la troisième fois en quatre ans, ça devient difficile à suivre pour beaucoup de familles.\n– Tu penses qu'il devrait y avoir un contrôle des loyers plus strict ?\n– Honnêtement, je ne sais pas trop, ça a aussi des effets secondaires sur l'offre de logements.",
    questions: [{ q: "Quelle est la position du deuxième locuteur sur le contrôle des loyers ?", choices: [{ t: "Il est incertain, conscient des effets secondaires possibles" }, { t: "Il est totalement favorable", piege: "CO-P7", exp: "Contredit « je ne sais pas trop »." }, { t: "Il est totalement opposé", piege: "CO-P7", exp: "Trop tranché par rapport à l'hésitation." }], correct: 0 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 7",
    text: "« Votre attention s'il vous plaît, en raison d'une affluence exceptionnelle, l'attente pour le guichet des passeports est actuellement d'environ 90 minutes. Nous vous invitons à prendre un numéro et à patienter dans la zone d'attente. »",
    questions: [{ q: "Quel est l'objectif de cette annonce ?", choices: [{ t: "Informer d'un temps d'attente inhabituel" }, { t: "Annoncer la fermeture du guichet", piege: "CO-P6", exp: "Confond une attente prolongée avec une fermeture." }, { t: "Annoncer un problème technique", piege: "CO-P6", exp: "La cause est l'affluence, pas un problème technique." }], correct: 0 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 8",
    text: "« Mesdames, messieurs, nous informons notre clientèle qu'en raison de travaux de maintenance sur le réseau, certains rayons du deuxième étage seront temporairement inaccessibles cet après-midi. Le personnel reste à votre disposition pour vous rediriger. »",
    questions: [{ q: "Quel est l'objectif de cette annonce ?", choices: [{ t: "Signaler un accès restreint temporaire à certains rayons" }, { t: "Annoncer la fermeture définitive du deuxième étage", piege: "CO-P6", exp: "Confond « temporairement » avec définitif." }, { t: "Annoncer une promotion au deuxième étage", piege: "CO-P2", exp: "Aucun lien avec le sujet." }], correct: 0 }],
  },
  {
    meta: "Section C · Message répondeur · NCLC 6",
    text: "« Bonjour, c'est la garderie qui appelle pour vous rappeler que demain, c'est journée pédagogique, donc pas de service régulier. Le service de garde spécial est disponible sur inscription seulement. Merci de nous confirmer si vous en avez besoin. »",
    questions: [{ q: "Que doivent faire les parents intéressés ?", choices: [{ t: "Confirmer leur besoin auprès de la garderie" }, { t: "Se présenter directement demain matin", piege: "CO-P5", exp: "Contredit « sur inscription seulement »." }, { t: "Attendre un nouvel appel", piege: "CO-P1", exp: "Inverse la démarche demandée." }], correct: 0 }],
  },
  {
    meta: "Section D · Opinion · NCLC 9",
    text: "« L'intelligence artificielle dans les écoles, bon, moi je dirais que ça ne sert à rien de s'y opposer, elle est déjà là de toute façon. La vraie question, c'est plutôt comment on l'encadre. Parce que juste l'interdire, ça revient à fermer les yeux sur ce que les jeunes utilisent déjà tous les jours de toute façon. »",
    questions: [{ q: "Quel est le point de vue de la personne ?", choices: [{ t: "L'enjeu principal est l'encadrement, pas l'interdiction" }, { t: "L'IA devrait être totalement interdite à l'école", piege: "CO-P7", exp: "Contredit « ça ne sert à rien de s'y opposer »." }, { t: "L'IA n'a aucun impact sur les jeunes", piege: "CO-P6", exp: "Contredit « ce que les jeunes utilisent déjà tous les jours »." }], correct: 0 }],
  },
];

const ee2: EEItem[] = [
  {
    sujet: "Section A : Fait divers. « Une employée de bureau a eu la surprise de trouver un message manuscrit glissé sous sa porte, signé par un voisin qu'elle n'avait jamais rencontré... » Continuez cet article.",
    n6: "Le message expliquait que le voisin, un homme âgé vivant seul, avait remarqué qu'elle rentrait souvent tard le soir et voulait simplement lui souhaiter la bienvenue dans l'immeuble. Il proposait de l'aider si elle avait besoin de quoi que ce soit, comme arroser ses plantes pendant les vacances. Touchée par cette attention, elle est allée le remercier en personne le lendemain. Ils ont discuté pendant une heure et ont découvert qu'ils avaient plusieurs points communs. (85 mots)",
    n9: "Le mot, rédigé d'une écriture soignée, révélait que son auteur, un homme âgé résidant seul dans l'immeuble, avait simplement souhaité lui témoigner sa sympathie, ayant remarqué ses horaires de rentrée tardifs. Loin de toute arrière-pensée, il lui proposait son aide en cas de besoin, citant en exemple l'arrosage de ses plantes durant ses absences. Touchée par cette délicatesse peu commune à notre époque, la jeune femme s'est empressée, dès le lendemain, d'aller le remercier de vive voix — une rencontre qui allait se prolonger bien au-delà des politesses d'usage. (122 mots)",
  },
  {
    sujet: "Section B : Argumentation. Certains employeurs demandent désormais à consulter les réseaux sociaux personnels des candidats avant de les embaucher. Qu'en pensez-vous ?",
    n6: "À mon avis, ce n'est pas une bonne pratique. Les réseaux sociaux personnels ne devraient pas avoir de lien avec la vie professionnelle. Une personne peut avoir des opinions ou des photos qui n'ont rien à voir avec ses compétences au travail. Je pense que les employeurs devraient plutôt se concentrer sur les compétences et l'expérience du candidat. (86 mots)",
    n9: "Cette pratique, bien qu'elle se généralise, soulève à mon sens de sérieuses questions quant au respect de la frontière entre vie privée et vie professionnelle. Certes, on peut comprendre le souci de l'employeur de s'assurer que le comportement en ligne d'un futur employé ne portera pas préjudice à l'image de l'entreprise. Il n'en demeure pas moins que cette logique ouvre la voie à des discriminations difficilement décelables. Il me semble donc que l'évaluation d'un candidat devrait rester circonscrite à son parcours et à ses aptitudes. (128 mots)",
  },
];

const eo2: EOItem[] = [
  {
    titre: "Section A : Obtenir des renseignements — inscription à la bibliothèque",
    base: "Candidat : Bonjour, je viens d'emménager dans le quartier, comment je peux m'inscrire à la bibliothèque ?",
    variantes: [
      ["Précision administrative", "« Il faut une preuve de résidence de moins de trois mois, vous en avez une sur vous ? »", "Réagir honnêtement à une exigence non anticipée."],
      ["Question retour", "« Vous cherchez plutôt des livres, des films, ou les deux ? »", "Répondre précisément et enchaîner naturellement."],
      ["Objection (frais)", "« Sachez qu'il y a des frais de retard assez élevés si vous ne rapportez pas les livres à temps. »", "Réagir à une mise en garde, demander des précisions."],
    ],
  },
  {
    titre: "Section B : Argumenter — covoiturage pour le travail",
    base: "Candidat : Cette annonce propose de partager les frais de transport avec des collègues. Je pense que ça pourrait vous faire économiser pas mal d'argent.",
    variantes: [
      ["Objection (flexibilité)", "« Le problème, c'est que mes horaires changent souvent, je ne suis jamais sûr de finir à la même heure. »", "Adapter l'argument (application flexible, covoiturage ponctuel)."],
      ["Objection (confiance)", "« Je ne connais pas ces gens, ça me met un peu mal à l'aise de monter dans leur voiture. »", "Rassurer sur la sécurité (profils vérifiés, évaluations)."],
      ["Acceptation conditionnelle", "« Bon, je veux bien essayer, mais juste une semaine pour voir. »", "Accueillir positivement un accord partiel."],
    ],
  },
];

// ════════════════════════════════════════
// MOCK EXAM #3
// ════════════════════════════════════════

const ce3: QuizItem[] = [
  {
    meta: "Famille A · Colocation · NCLC 5",
    text: "Cherche colocataire pour appartement 4 ½, non-fumeur, avec ou sans animaux. Loyer : 625$/mois incluant internet. Chambre disponible dès maintenant. Métro à 5 minutes à pied.",
    questions: [
      { q: "Que comprend le loyer ?", choices: [{ t: "Internet" }, { t: "L'électricité", piege: "P6", exp: "Plausible mais non mentionné." }, { t: "Rien d'autre", piege: "P5", exp: "Contredit « incluant internet »." }], correct: 0 },
      { q: "À quelle distance est le métro ?", choices: [{ t: "5 minutes à pied" }, { t: "5 minutes en voiture", piege: "P1", exp: "Mode de transport erroné, le texte précise « à pied »." }, { t: "15 minutes à pied", piege: "P2", exp: "Chiffre proche." }], correct: 0 },
    ],
  },
  {
    meta: "Famille A · Clinique fermée · NCLC 6",
    text: "La clinique sera fermée du 22 décembre au 2 janvier inclusivement pour la période des Fêtes. En cas d'urgence durant cette période, veuillez composer le 811 ou vous présenter à l'urgence de l'hôpital le plus proche.",
    questions: [
      { q: "Que faire en cas d'urgence pendant la fermeture ?", choices: [{ t: "Composer le 811 ou aller à l'urgence" }, { t: "Attendre la réouverture", piege: "P5", exp: "Contredit les instructions explicites." }, { t: "Appeler la clinique", piege: "P6", exp: "La clinique est fermée." }], correct: 0 },
      { q: "Jusqu'à quand la clinique est-elle fermée ?", choices: [{ t: "Le 2 janvier inclus" }, { t: "Le 1er janvier", piege: "P2", exp: "Date adjacente." }, { t: "Le 22 décembre", piege: "P1", exp: "Confond début et fin de fermeture." }], correct: 0 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire · NCLC 9",
    text: "Loin ___(1)___ constituer une solution miracle, l'intelligence artificielle appliquée au diagnostic médical soulève des questions éthiques ___(2)___ aucun encadrement réglementaire actuel ne semble en mesure de résoudre pleinement, ___(3)___ les progrès techniques indéniables.",
    questions: [
      { q: "Blanc (1)", choices: [{ t: "de" }, { t: "à", piege: "P1", exp: "« loin de » est l'expression correcte." }, { t: "pour", piege: "P1", exp: "Préposition incorrecte." }], correct: 0 },
      { q: "Blanc (2)", choices: [{ t: "que" }, { t: "dont", piege: "P1", exp: "Construction différente requise." }, { t: "qui", piege: "P1", exp: "Le pronom est complément, pas sujet." }], correct: 0 },
      { q: "Blanc (3)", choices: [{ t: "malgré" }, { t: "grâce à", piege: "P5", exp: "Inverserait la relation concessive." }, { t: "à cause de", piege: "P5", exp: "Relation causale erronée." }], correct: 0 },
    ],
  },
  {
    meta: "Famille C · Horaires bus (tableau) · NCLC 6",
    text: "| Ligne de bus | Départ | Destination | Durée |\n|---|---|---|---|\n| 45 | Terminus Nord | Centre-ville | 35 min |\n| 67 | Terminus Est | Centre-ville | 50 min |\n| 12 | Terminus Nord | Aéroport | 40 min |",
    questions: [
      { q: "Quelle ligne va le plus vite au centre-ville ?", choices: [{ t: "Ligne 45" }, { t: "Ligne 67", piege: "P2", exp: "Durée la plus longue." }, { t: "Ligne 12", piege: "P3", exp: "Ne va pas au centre-ville mais à l'aéroport." }], correct: 0 },
      { q: "Quelles lignes partent du Terminus Nord ?", choices: [{ t: "45 et 12" }, { t: "45 et 67", piege: "P2", exp: "La ligne 67 part du Terminus Est." }, { t: "67 et 12", piege: "P2", exp: "La ligne 67 ne part pas du Terminus Nord." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Transports gratuits · NCLC 7",
    text: "De plus en plus de villes nord-américaines expérimentent la gratuité des transports en commun, avec des résultats mitigés. Si la fréquentation augmente généralement de façon significative, certaines municipalités peinent à financer durablement cette mesure sans compromettre la qualité du service, notamment la fréquence des passages.",
    questions: [
      { q: "Quel est l'effet observé sur la fréquentation ?", choices: [{ t: "Elle augmente généralement" }, { t: "Elle diminue légèrement", piege: "P5", exp: "Contredit directement." }, { t: "Elle reste stable", piege: "P5", exp: "Contredit « augmente de façon significative »." }], correct: 0 },
      { q: "Quel risque est associé à la gratuité ?", choices: [{ t: "Une baisse de la qualité du service" }, { t: "Une hausse des impôts locaux", piege: "P6", exp: "Plausible mais non mentionné." }, { t: "Une baisse de la sécurité", piege: "P6", exp: "Sur-inférence." }], correct: 0 },
    ],
  },
];

const co3: QuizItem[] = [
  {
    meta: "Section A · Dialogue court · NCLC 5 · [IMAGE]",
    text: "– Excusez-moi, le bus pour le centre-ville, c'est bien ici ?\n– Non, cet arrêt c'est pour la ligne 22, il faut traverser la rue pour la ligne 15.\n– Ah d'accord, merci pour l'info !",
    questions: [{ q: "Quelle image correspond ?", choices: [{ t: "Une personne qui cherche le bon arrêt de bus", img: "/static/images/co/ex3_q1_a.jpg" }, { t: "Une personne qui attend un ami", img: "/static/images/co/ex3_q1_b.jpg", piege: "CO-P2", exp: "Générique, aucun ancrage." }, { t: "Une personne qui achète un billet de bus", img: "/static/images/co/ex3_q1_c.jpg", piege: "CO-P2", exp: "L'action réelle est de trouver le bon arrêt." }], correct: 0 }],
  },
  {
    meta: "Section A · Dialogue court · NCLC 6",
    text: "– Comment s'est passé ton entretien d'embauche ce matin ?\n– Plutôt bien je pense, mais ils m'ont dit qu'ils avaient encore plusieurs candidats à rencontrer cette semaine.\n– Ah, donc tu n'auras pas de réponse tout de suite alors.",
    questions: [{ q: "Quand la personne aura-t-elle une réponse ?", choices: [{ t: "Pas tout de suite, d'autres candidats doivent être rencontrés" }, { t: "Le jour même", piege: "CO-P1", exp: "Contredit l'information sur les autres candidats." }, { t: "Elle n'a pas eu l'entretien", piege: "CO-P6", exp: "Contredit « comment s'est passé ton entretien »." }], correct: 0 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 6",
    text: "« Chers usagers, la ligne de métro orange connaît actuellement un ralentissement en raison d'un problème mineur signalé à la station Berri. Le service reprendra son cours normal sous peu. »",
    questions: [{ q: "Quel est l'objectif de cette annonce ?", choices: [{ t: "Informer d'un ralentissement temporaire" }, { t: "Annoncer l'arrêt complet de la ligne", piege: "CO-P6", exp: "Confond ralentissement et arrêt complet." }, { t: "Annoncer la fermeture définitive d'une station", piege: "CO-P6", exp: "Aucune mention." }], correct: 0 }],
  },
  {
    meta: "Section C · Message répondeur · NCLC 8",
    text: "« Bonjour, c'est votre agent d'assurance. Je vous appelle concernant votre dossier de réclamation suite au dégât d'eau. Nous avons besoin de photos supplémentaires avant de pouvoir finaliser l'évaluation. Pourriez-vous nous les envoyer par courriel d'ici vendredi ? Sinon le traitement pourrait être retardé. »",
    questions: [{ q: "Pourquoi l'agent appelle-t-il ?", choices: [{ t: "Pour demander des photos supplémentaires avant vendredi" }, { t: "Pour annoncer le refus de la réclamation", piege: "CO-P6", exp: "Rien n'indique un refus." }, { t: "Pour confirmer que le dossier est finalisé", piege: "CO-P1", exp: "Le dossier n'est PAS encore finalisé." }], correct: 0 }],
  },
  {
    meta: "Section D · Opinion · NCLC 7",
    text: "« Le vélo en ville, moi j'adore, mais il faut être honnête, les infrastructures ne suivent pas partout pareil. Dans certains quartiers c'est parfait, dans d'autres tu te retrouves carrément dans le trafic sans piste cyclable. Donc oui pour encourager le vélo, mais il faut investir en même temps. »",
    questions: [{ q: "Quel est le point de vue de la personne ?", choices: [{ t: "Favorable au vélo, mais soulignant un manque d'infrastructures" }, { t: "Totalement opposée au vélo en ville", piege: "CO-P7", exp: "Contredit « moi j'adore »." }, { t: "Satisfaite des infrastructures partout", piege: "CO-P7", exp: "Contredit « tu te retrouves dans le trafic »." }], correct: 0 }],
  },
  {
    meta: "Section D · Opinion · NCLC 9",
    text: "« Le prix des logements, franchement, je pense qu'on cherche trop souvent un coupable unique — les investisseurs, le gouvernement, la spéculation — alors que c'est un ensemble de facteurs qui s'additionnent. Pointer du doigt une seule cause, ça m'a toujours semblé être une façon un peu facile de simplifier un problème qui est en réalité bien plus complexe. »",
    questions: [{ q: "Quel est le point de vue de la personne ?", choices: [{ t: "Le problème est multifactoriel, pas réductible à une cause unique" }, { t: "Les investisseurs sont les seuls responsables", piege: "CO-P7", exp: "Contredit directement le propos." }, { t: "Le gouvernement n'a aucune responsabilité", piege: "CO-P6", exp: "Le texte ne dédouane personne spécifiquement." }], correct: 0 }],
  },
];

const ee3: EEItem[] = [
  {
    sujet: "Section A : Fait divers. « Les clients d'un café du quartier ont eu la surprise, en arrivant hier matin, de découvrir que le propriétaire avait entièrement repeint la façade pendant la nuit... » Continuez cet article.",
    n6: "Le propriétaire a expliqué qu'il voulait faire une surprise à ses clients réguliers pour célébrer les cinq ans du café. La nouvelle couleur, un bleu vif, a beaucoup plu au voisinage. Plusieurs personnes ont pris des photos pour les partager sur les réseaux sociaux. Le propriétaire a aussi annoncé qu'il offrirait un café gratuit à tous les clients pendant toute la journée. (88 mots)",
    n9: "Il s'est avéré que cette transformation nocturne n'avait rien d'un hasard : le propriétaire souhaitait ainsi marquer, à sa façon, le cinquième anniversaire de son établissement. Ce bleu éclatant, résolument tranché avec la façade grisâtre d'autrefois, a immédiatement fait sensation auprès du voisinage, au point que plusieurs badauds n'ont pu résister à l'envie d'immortaliser la scène pour la partager sur les réseaux sociaux. (115 mots)",
  },
  {
    sujet: "Section B : Argumentation. Devrait-on limiter le temps d'écran des enfants avant l'âge de 12 ans, même pour des contenus éducatifs ?",
    n6: "Je pense qu'il faut effectivement limiter le temps d'écran, mais pas complètement l'interdire. Même les contenus éducatifs peuvent être fatigants pour les yeux des enfants s'il y en a trop. Par contre, certains contenus, comme des vidéos qui apprennent une langue ou des mathématiques, peuvent être utiles avec modération. L'important c'est de trouver un équilibre entre les écrans et d'autres activités comme jouer dehors ou lire des livres. (80 mots)",
    n9: "La question mérite d'être nuancée, dans la mesure où tous les contenus ne se valent manifestement pas. S'il paraît raisonnable de limiter une exposition purement récréative et passive aux écrans, il serait sans doute contre-productif d'appliquer la même restriction à des contenus véritablement éducatifs et interactifs. Cela dit, même dans ce cas, un usage démesuré demeure préoccupant, tant sur le plan de la santé visuelle que du développement des interactions sociales réelles. (112 mots)",
  },
];

const eo3: EOItem[] = [
  {
    titre: "Section A : Obtenir des renseignements — réclamation colis endommagé",
    base: "Candidat : Bonjour, j'ai reçu un colis endommagé hier et j'aimerais savoir comment procéder pour un remboursement.",
    variantes: [
      ["Précision (preuve)", "« Avez-vous pris des photos de l'emballage et du produit endommagé ? »", "Répondre précisément ou expliquer comment fournir la preuve."],
      ["Objection (délai)", "« Le remboursement peut prendre jusqu'à trois semaines, ça vous convient ? »", "Réagir au délai, négocier une alternative (échange rapide)."],
      ["Question retour", "« Vous préférez un remboursement complet ou l'envoi d'un nouveau produit ? »", "Exprimer une préférence claire et justifiée."],
    ],
  },
  {
    titre: "Section B : Argumenter — cours de premiers secours",
    base: "Candidat : Cette publicité présente une formation de premiers secours d'une journée, ouverte à tous. Je pense que c'est une compétence utile pour tout le monde.",
    variantes: [
      ["Objection (utilité)", "« Je n'ai jamais eu besoin de ça, je ne vois pas trop l'intérêt. »", "Illustrer l'utilité avec un exemple concret."],
      ["Objection (disponibilité)", "« Une journée complète, c'est difficile à caser dans mon horaire. »", "Proposer une alternative (session en soirée)."],
      ["Acceptation immédiate", "« Vous m'avez convaincu, comment je m'inscris ? »", "Clôturer efficacement avec les étapes d'inscription."],
    ],
  },
];

// ════════════════════════════════════════
// MOCK EXAM #4
// ════════════════════════════════════════

const ce4: QuizItem[] = [
  {
    meta: "Famille A · Atelier CV · NCLC 6",
    text: "Atelier gratuit de rédaction de CV, mercredi 20h au centre communautaire. Apportez votre CV actuel si vous en avez un. Places limitées, réservation par téléphone au 450-555-0176 avant lundi midi.",
    questions: [
      { q: "Que doit-on faire avant lundi midi ?", choices: [{ t: "Réserver sa place par téléphone" }, { t: "Apporter son CV", piege: "P3", exp: "Vrai mais ne répond pas à la question sur le délai." }, { t: "Payer l'atelier", piege: "P5", exp: "Contredit « atelier gratuit »." }], correct: 0 },
      { q: "L'atelier est-il payant ?", choices: [{ t: "Non, il est gratuit" }, { t: "Oui, sur inscription", piege: "P5", exp: "Contredit « gratuit »." }, { t: "Non précisé", piege: "P5", exp: "Information bien précisée." }], correct: 0 },
    ],
  },
  {
    meta: "Famille A · Livraison repas · NCLC 5",
    text: "Livraison de repas à domicile, du lundi au vendredi, entre 11h30 et 13h30. Menu du jour à 12$, incluant soupe, plat principal et dessert. Commande la veille avant 18h.",
    questions: [
      { q: "Que comprend le menu du jour ?", choices: [{ t: "Soupe, plat principal et dessert" }, { t: "Soupe et plat principal seulement", piege: "P5", exp: "Omet le dessert." }, { t: "Entrée, plat, dessert et café", piege: "P6", exp: "Ajoute un élément non mentionné." }], correct: 0 },
      { q: "Quand faut-il commander ?", choices: [{ t: "La veille avant 18h" }, { t: "Le jour même avant 18h", piege: "P1", exp: "Confond « la veille » avec « le jour même »." }, { t: "La veille avant midi", piege: "P2", exp: "Heure proche mais inexacte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire · NCLC 7",
    text: "Après ___(1)___ réfléchi longuement, l'équipe a finalement décidé de reporter le lancement du produit, ___(2)___ des retours mitigés obtenus lors des tests utilisateurs. Cette décision, bien qu'impopulaire auprès de certains investisseurs, ___(3)___ jugée nécessaire par la direction.",
    questions: [
      { q: "Blanc (1)", choices: [{ t: "avoir" }, { t: "être", piege: "P1", exp: "« réfléchir » se construit avec avoir." }, { t: "avait", piege: "P1", exp: "Temps incorrect, infinitif passé requis." }], correct: 0 },
      { q: "Blanc (2)", choices: [{ t: "en raison" }, { t: "malgré", piege: "P5", exp: "Inverserait la relation causale." }, { t: "au sujet", piege: "P1", exp: "Construction incorrecte." }], correct: 0 },
      { q: "Blanc (3)", choices: [{ t: "a été" }, { t: "sera", piege: "P1", exp: "Incohérence temporelle avec le récit au passé." }, { t: "serait", piege: "P1", exp: "Conditionnel non justifié." }], correct: 0 },
    ],
  },
  {
    meta: "Famille C · Fournisseurs (tableau) · NCLC 8",
    text: "| Fournisseur | Délai de livraison | Coût unitaire | Quantité minimale |\n|---|---|---|---|\n| Fournisseur A | 5 jours | 12,50$ | 100 unités |\n| Fournisseur B | 10 jours | 9,80$ | 250 unités |\n| Fournisseur C | 3 jours | 15,00$ | 50 unités |",
    questions: [
      { q: "Quel fournisseur offre le délai le plus court ?", choices: [{ t: "Fournisseur C" }, { t: "Fournisseur A", piege: "P2", exp: "Délai proche mais pas le plus court." }, { t: "Fournisseur B", piege: "P2", exp: "Délai le plus long." }], correct: 0 },
      { q: "Quel fournisseur exige la plus petite quantité minimale ?", choices: [{ t: "Fournisseur C" }, { t: "Fournisseur A", piege: "P2", exp: "Quantité intermédiaire." }, { t: "Fournisseur B", piege: "P2", exp: "Quantité la plus élevée." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Relocalisation · NCLC 9",
    text: "Prétendre que la relocalisation industrielle résoudra à elle seule les enjeux de dépendance économique relève d'une vision pour le moins simplificatrice. Si rapatrier certaines chaînes de production présente des avantages indéniables en matière de résilience, cette stratégie se heurte à des contraintes structurelles — coûts de main-d'œuvre, disponibilité des compétences — que peu d'analyses semblent prendre pleinement en compte.",
    questions: [
      { q: "Quelle est la position de l'auteur ?", choices: [{ t: "Elle présente des avantages mais aussi des limites sous-estimées" }, { t: "Elle est la solution absolue", piege: "P4", exp: "C'est la position que l'auteur qualifie de « simplificatrice »." }, { t: "Elle est inutile et sans intérêt", piege: "P6", exp: "Trop extrême, contredit « avantages indéniables »." }], correct: 0 },
      { q: "Quelles contraintes sont mentionnées ?", choices: [{ t: "Coûts de main-d'œuvre et disponibilité des compétences" }, { t: "Réglementation environnementale", piege: "P6", exp: "Plausible mais non citée." }, { t: "Manque d'infrastructures", piege: "P6", exp: "Sur-inférence." }], correct: 0 },
    ],
  },
];

const co4: QuizItem[] = [
  {
    meta: "Section A · Dialogue court · NCLC 6 · [IMAGE]",
    text: "– J'aimerais réserver une table pour ce soir, vous avez de la place ?\n– Pour combien de personnes ?\n– Quatre, vers 19h si possible.\n– Oui c'est parfait, à quel nom je note la réservation ?",
    questions: [{ q: "Quelle image correspond ?", choices: [{ t: "Une personne qui réserve une table au restaurant", img: "/static/images/co/ex4_q1_a.jpg" }, { t: "Une personne qui commande un repas", img: "/static/images/co/ex4_q1_b.jpg", piege: "CO-P2", exp: "L'action est la réservation, pas la commande." }, { t: "Une personne qui annule une réservation", img: "/static/images/co/ex4_q1_c.jpg", piege: "CO-P1", exp: "Inverse complètement l'action." }], correct: 0 }],
  },
  {
    meta: "Section A · Dialogue court · NCLC 8",
    text: "– Tu as reçu les résultats de ton examen médical ?\n– Oui, tout est normal, le médecin m'a juste recommandé de faire un suivi dans six mois par précaution.\n– Ah, tant mieux alors.",
    questions: [{ q: "Quel est le résultat de l'examen ?", choices: [{ t: "Normal, avec un suivi de précaution dans six mois" }, { t: "Préoccupant, nécessitant un traitement immédiat", piege: "CO-P1", exp: "Contredit « tout est normal » et « par précaution »." }, { t: "Non reçu, en attente", piege: "CO-P1", exp: "Contredit « j'ai reçu les résultats »." }], correct: 0 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 7",
    text: "« Nous rappelons à notre aimable clientèle que le stationnement extérieur sera limité à deux heures durant la fin de semaine en raison d'un événement spécial. Merci de votre compréhension. »",
    questions: [{ q: "Quel est l'objectif ?", choices: [{ t: "Informer d'une limite temporaire de stationnement" }, { t: "Annoncer la fermeture du stationnement", piege: "CO-P6", exp: "Confond une limite de durée avec une fermeture." }, { t: "Annoncer un événement gratuit", piege: "CO-P2", exp: "L'événement est une cause, pas le sujet." }], correct: 0 }],
  },
  {
    meta: "Section C · Message répondeur · NCLC 7",
    text: "« Bonjour, c'est le service à la clientèle. Un des articles de votre commande est en rupture de stock, nous pouvons soit vous rembourser cet article, soit attendre le réapprovisionnement prévu dans deux semaines. Rappelez-nous pour nous indiquer votre préférence. »",
    questions: [{ q: "Pourquoi le service appelle-t-il ?", choices: [{ t: "Pour proposer un choix suite à une rupture de stock" }, { t: "Pour annuler complètement la commande", piege: "CO-P6", exp: "Deux options sont proposées, ce n'est pas une annulation." }, { t: "Pour confirmer la livraison complète", piege: "CO-P1", exp: "Contredit « un des articles est en rupture »." }], correct: 0 }],
  },
  {
    meta: "Section D · Opinion · NCLC 8",
    text: "« Les congés parentaux plus longs, moi je suis pour, clairement, mais je comprends aussi les inquiétudes des petites entreprises qui doivent gérer une absence prolongée avec moins de ressources qu'une grande boîte. Donc je pense qu'il faudrait peut-être un accompagnement différent selon la taille de l'entreprise. »",
    questions: [{ q: "Quel est le point de vue ?", choices: [{ t: "Favorable, avec proposition d'accompagnement différencié" }, { t: "Totalement opposé aux congés longs", piege: "CO-P7", exp: "Contredit « je suis pour, clairement »." }, { t: "Favorable sans aucune réserve", piege: "CO-P7", exp: "Ignore la nuance sur les petites entreprises." }], correct: 0 }],
  },
  {
    meta: "Section D · Opinion · NCLC 9",
    text: "« La 4ᵉ semaine de travail, sur le principe, difficile d'être contre, qui ne voudrait pas plus de temps libre ? Mais je reste sceptique sur la faisabilité dans certains secteurs, genre la santé ou les services essentiels, où on ne peut juste pas réduire les heures sans embaucher massivement, ce qui n'est pas toujours réaliste financièrement. »",
    questions: [{ q: "Quel est le point de vue ?", choices: [{ t: "Favorable en principe, mais sceptique sur la faisabilité" }, { t: "Totalement convaincu que c'est faisable partout", piege: "CO-P7", exp: "Contredit « je reste sceptique »." }, { t: "Opposé par principe à la réduction", piege: "CO-P7", exp: "Contredit « difficile d'être contre »." }], correct: 0 }],
  },
];

const ee4: EEItem[] = [
  {
    sujet: "Section A : Fait divers. « Un groupe de randonneurs a dû être secouru hier après-midi après s'être égaré dans la forêt, à quelques kilomètres seulement du sentier principal... » Continuez cet article.",
    n6: "Le groupe, composé de quatre amis, avait quitté le sentier balisé pour explorer un chemin qui semblait plus intéressant, mais ils se sont vite retrouvés perdus. Heureusement, l'un d'entre eux avait gardé son téléphone chargé et a pu appeler les secours à temps. Les sauveteurs les ont retrouvés environ deux heures plus tard, fatigués mais en bonne santé. (84 mots)",
    n9: "C'est en s'aventurant hors du sentier balisé, attirés par un chemin d'apparence prometteuse, que les quatre amis se sont rapidement retrouvés désorientés au cœur de la forêt. Par chance, l'un des randonneurs disposait encore d'un téléphone suffisamment chargé pour alerter les secours avant que la situation ne s'aggrave. Ce n'est qu'au terme de près de deux heures de recherches que l'équipe de sauveteurs a finalement localisé le petit groupe, épuisé mais sain et sauf. (120 mots)",
  },
  {
    sujet: "Section B : Argumentation. Les compagnies aériennes devraient-elles être obligées d'indemniser systématiquement les passagers en cas de retard, quelle qu'en soit la cause ?",
    n6: "Je pense que ça dépend de la cause du retard. Si c'est la faute de la compagnie, par exemple un problème d'organisation, alors oui, les passagers devraient être indemnisés. Mais si c'est à cause de la météo ou d'un problème de sécurité, je trouve ça plus compliqué. Peut-être qu'il faudrait au moins offrir un repas ou un hôtel. (94 mots)",
    n9: "Il me semble difficile de trancher cette question de manière uniforme. Lorsque le retard résulte d'une défaillance imputable à la compagnie elle-même — mauvaise gestion, surbooking — une indemnisation systématique paraît pleinement justifiée. En revanche, exiger la même chose en cas de conditions météorologiques exceptionnelles relèverait d'une logique punitive difficilement défendable. Cela n'exclut cependant pas une obligation minimale d'assistance — hébergement, repas — qui devrait demeurer garantie. (118 mots)",
  },
];

const eo4: EOItem[] = [
  {
    titre: "Section A : Obtenir des renseignements — changement de forfait mobile",
    base: "Candidat : Bonjour, j'aimerais changer mon forfait de téléphone pour un qui inclut plus de données.",
    variantes: [
      ["Question retour", "« Vous utilisez environ combien de données par mois actuellement ? »", "Répondre avec une estimation raisonnable."],
      ["Objection (engagement)", "« Ce forfait exige un engagement de 24 mois, c'est un problème pour vous ? »", "Réagir, demander s'il existe une option sans engagement."],
      ["Précision (prix)", "« Sachez que le prix affiché est promotionnel pour six mois seulement, ensuite il augmente. »", "Réagir à une information cachée, demander le prix après la promotion."],
    ],
  },
  {
    titre: "Section B : Argumenter — jardin communautaire",
    base: "Candidat : Cette annonce invite les résidents à rejoindre un jardin communautaire dans le quartier. Je pense que ce serait une belle façon de rencontrer vos voisins.",
    variantes: [
      ["Objection (compétence)", "« Je n'ai jamais jardiné de ma vie, je ne saurais même pas par où commencer. »", "Rassurer sur l'accompagnement (mentorat, ateliers pour débutants)."],
      ["Objection (temps)", "« Ça demande sûrement un entretien régulier, non ? Je n'ai pas beaucoup de temps libre. »", "Nuancer l'engagement (quelques heures par semaine, entraide)."],
      ["Acceptation conditionnelle", "« D'accord, je veux bien essayer une saison pour voir. »", "Accueillir positivement, préciser la prochaine étape."],
    ],
  },
];

// ════════════════════════════════════════
// MOCK EXAM #5
// ════════════════════════════════════════

const ce5: QuizItem[] = [
  {
    meta: "Famille A · Promeneur de chien · NCLC 6",
    text: "Recherche promeneur de chien fiable pour berger allemand, 3 fois par semaine, 30 minutes par sortie. Expérience avec grands chiens souhaitée mais non obligatoire. Rémunération : 15$ par sortie, paiement hebdomadaire.",
    questions: [
      { q: "L'expérience est-elle obligatoire ?", choices: [{ t: "Non, souhaitée mais pas obligatoire" }, { t: "Oui, absolument requise", piege: "P5", exp: "Contredit « non obligatoire »." }, { t: "Non précisé", piege: "P5", exp: "Information bien précisée." }], correct: 0 },
      { q: "Quand le paiement est-il effectué ?", choices: [{ t: "Chaque semaine" }, { t: "Après chaque sortie", piege: "P1", exp: "Confond fréquence des sorties avec celle du paiement." }, { t: "Une fois par mois", piege: "P2", exp: "Fréquence plausible mais inexacte." }], correct: 0 },
    ],
  },
  {
    meta: "Famille A · Marché fermier · NCLC 5",
    text: "Marché fermier tous les samedis de 9h à 13h sur la place du village, de mai à octobre. Producteurs locaux : légumes, fromages, pain, miel. Paiement comptant ou carte accepté.",
    questions: [
      { q: "Jusqu'à quel mois le marché a-t-il lieu ?", choices: [{ t: "Octobre" }, { t: "Mai", piege: "P1", exp: "Confond mois de début et de fin." }, { t: "Septembre", piege: "P2", exp: "Mois adjacent." }], correct: 0 },
      { q: "Quels moyens de paiement sont acceptés ?", choices: [{ t: "Comptant ou carte" }, { t: "Comptant seulement", piege: "P5", exp: "Omet « ou carte »." }, { t: "Carte seulement", piege: "P5", exp: "Omet le comptant." }], correct: 0 },
    ],
  },
  {
    meta: "Famille B · Texte lacunaire · NCLC 8",
    text: "Malgré les nombreuses campagnes de sensibilisation ___(1)___ ont été menées ces dernières années, le taux de recyclage stagne, ce ___(2)___ pousse certains experts à réclamer des mesures plus contraignantes plutôt que de continuer à ___(3)___ uniquement sur la bonne volonté citoyenne.",
    questions: [
      { q: "Blanc (1)", choices: [{ t: "qui" }, { t: "que", piege: "P1", exp: "« qui » est sujet du verbe « ont été menées »." }, { t: "dont", piege: "P1", exp: "Construction incorrecte." }], correct: 0 },
      { q: "Blanc (2)", choices: [{ t: "qui" }, { t: "que", piege: "P1", exp: "« qui » reprend « ce » comme sujet de « pousse »." }, { t: "dont", piege: "P1", exp: "Construction incorrecte." }], correct: 0 },
      { q: "Blanc (3)", choices: [{ t: "compter" }, { t: "comptant", piege: "P1", exp: "Forme incorrecte après « continuer à »." }, { t: "compté", piege: "P1", exp: "Participe passé incorrect." }], correct: 0 },
    ],
  },
  {
    meta: "Famille C · Hébergement (tableau) · NCLC 7",
    text: "| Type | Prix/nuit | Capacité | Animaux acceptés |\n|---|---|---|---|\n| Chalet | 145$ | 6 personnes | Oui |\n| Studio | 85$ | 2 personnes | Non |\n| Maison | 210$ | 8 personnes | Oui |",
    questions: [
      { q: "Quel hébergement accueille le plus de personnes et accepte les animaux ?", choices: [{ t: "Maison" }, { t: "Chalet", piege: "P2", exp: "Accepte les animaux mais capacité inférieure." }, { t: "Studio", piege: "P5", exp: "N'accepte pas les animaux." }], correct: 0 },
      { q: "Quelle est la différence de prix entre le Chalet et le Studio ?", choices: [{ t: "60$" }, { t: "65$", piege: "P2", exp: "Erreur de calcul plausible." }, { t: "55$", piege: "P2", exp: "Erreur de calcul plausible." }], correct: 0 },
    ],
  },
  {
    meta: "Famille D · Faux comptes · NCLC 9",
    text: "Il serait tentant, face à la multiplication des faux comptes sur les réseaux sociaux, d'en conclure que la modération automatisée constitue l'unique rempart efficace. Or cette lecture occulte un paradoxe central : plus les algorithmes de détection se perfectionnent, plus les techniques de contournement évoluent en retour, dans une course sans fin dont l'issue favorable n'est jamais garantie à long terme.",
    questions: [
      { q: "Quel paradoxe l'auteur souligne-t-il ?", choices: [{ t: "L'amélioration de la détection entraîne l'amélioration du contournement" }, { t: "La modération est totalement inefficace", piege: "P6", exp: "Plus extrême que la position réelle." }, { t: "Les faux comptes n'existent plus grâce aux algorithmes", piege: "P4", exp: "Confond l'opinion réfutée avec la position de l'auteur." }], correct: 0 },
      { q: "L'issue de cette « course » est-elle garantie ?", choices: [{ t: "Non, jamais à long terme" }, { t: "Oui, toujours en faveur des algorithmes", piege: "P5", exp: "Contredit « n'est jamais garantie »." }, { t: "Oui, mais seulement à court terme", piege: "P6", exp: "Nuance non présente dans le texte." }], correct: 0 },
    ],
  },
];

const co5: QuizItem[] = [
  {
    meta: "Section A · Dialogue court · NCLC 5 · [IMAGE]",
    text: "– Il fait vraiment froid aujourd'hui, tu n'as pas de manteau ?\n– Si, mais je l'ai oublié dans la voiture, je vais vite le chercher.\n– D'accord, je t'attends ici.",
    questions: [{ q: "Quelle image correspond ?", choices: [{ t: "Une personne qui va chercher un manteau oublié", img: "/static/images/co/ex5_q1_a.jpg" }, { t: "Une personne qui achète un manteau", img: "/static/images/co/ex5_q1_b.jpg", piege: "CO-P2", exp: "Aucun ancrage, générique." }, { t: "Une personne qui attend le bus", img: "/static/images/co/ex5_q1_c.jpg", piege: "CO-P2", exp: "Aucun lien avec le dialogue." }], correct: 0 }],
  },
  {
    meta: "Section A · Dialogue court · NCLC 7",
    text: "– Alors, cette nouvelle collègue, comment tu la trouves ?\n– Très compétente, mais elle est encore un peu réservée en réunion, je pense qu'elle prendra confiance avec le temps.\n– Oui, c'est normal les premières semaines.",
    questions: [{ q: "Quelle est l'opinion sur la nouvelle collègue ?", choices: [{ t: "Compétente, mais encore réservée pour l'instant" }, { t: "Peu compétente et distante", piege: "CO-P7", exp: "Contredit « très compétente »." }, { t: "Parfaitement intégrée dès le début", piege: "CO-P1", exp: "Contredit « encore un peu réservée »." }], correct: 0 }],
  },
  {
    meta: "Section B · Annonce publique · NCLC 8",
    text: "« En raison d'une forte demande, la billetterie en ligne connaît des ralentissements. Nous vous invitons à patienter et à ne pas rafraîchir la page à répétition, ce qui pourrait aggraver la situation. Le système devrait se stabiliser sous peu. »",
    questions: [{ q: "Quel est l'objectif ?", choices: [{ t: "Demander de la patience face à un ralentissement technique" }, { t: "Annoncer que la billetterie est fermée", piege: "CO-P6", exp: "Confond ralentissement et fermeture." }, { t: "Annoncer l'annulation de l'événement", piege: "CO-P6", exp: "Aucun lien, seulement un problème technique." }], correct: 0 }],
  },
  {
    meta: "Section C · Message répondeur · NCLC 9",
    text: "« Bonjour, c'est votre notaire. Je vous appelle au sujet de la signature prévue jeudi — tout est prêt de notre côté, mais l'autre partie a demandé un léger report, probablement à la semaine suivante, le temps de finaliser un détail de financement. Rien d'inquiétant. »",
    questions: [{ q: "Pourquoi le notaire appelle-t-il ?", choices: [{ t: "Pour informer d'un report probable de la signature" }, { t: "Pour annoncer l'annulation définitive", piege: "CO-P6", exp: "« rien d'inquiétant » et « report » contredisent une annulation." }, { t: "Pour signaler un problème de son côté", piege: "CO-P1", exp: "« tout est prêt de notre côté » — le retard vient de l'autre partie." }], correct: 0 }],
  },
  {
    meta: "Section D · Opinion · NCLC 8",
    text: "« L'apprentissage en ligne, disons que ça a clairement démocratisé l'accès à plein de formations qu'on n'aurait jamais pu suivre autrement. Après, faut pas se mentir, la motivation à distance, c'est un défi complètement différent, et tout le monde n'est pas égal face à ça. »",
    questions: [{ q: "Quel est le point de vue ?", choices: [{ t: "Reconnaît l'accessibilité accrue, tout en soulignant le défi de la motivation" }, { t: "L'apprentissage en ligne est supérieur en tout point", piege: "CO-P7", exp: "Ignore la réserve sur la motivation." }, { t: "L'apprentissage en ligne n'apporte rien de nouveau", piege: "CO-P7", exp: "Contredit « ça a clairement démocratisé l'accès »." }], correct: 0 }],
  },
  {
    meta: "Section D · Opinion · NCLC 9",
    text: "« Le nucléaire dans la transition énergétique, c'est un sujet où j'ai l'impression que les gens campent sur des positions figées depuis des décennies, sans vraiment réévaluer à la lumière des nouvelles données sur le climat. Moi je pense qu'il faut au moins accepter de remettre la question sur la table, sans forcément trancher tout de suite dans un sens ou dans l'autre. »",
    questions: [{ q: "Quel est le point de vue ?", choices: [{ t: "Elle appelle à rouvrir le débat sans prendre position tranchée" }, { t: "Elle est fermement pour le nucléaire", piege: "CO-P7", exp: "Contredit « sans forcément trancher »." }, { t: "Elle est fermement contre le nucléaire", piege: "CO-P7", exp: "Même contradiction." }], correct: 0 }],
  },
];

const ee5: EEItem[] = [
  {
    sujet: "Section A : Fait divers. « Une bibliothèque municipale a annoncé avoir retrouvé, dans ses réserves, un exemplaire rare qu'elle croyait perdu depuis plus de vingt ans... » Continuez cet article.",
    n6: "Le livre, une première édition d'un roman célèbre, avait été mal classé lors d'un déménagement des collections il y a plusieurs années. Un employé l'a retrouvé par hasard en réorganisant une section rarement consultée. La bibliothèque a décidé d'exposer le livre dans une vitrine spéciale plutôt que de le remettre en circulation, à cause de sa valeur. (86 mots)",
    n9: "Il s'avère que l'ouvrage, une première édition d'un roman aujourd'hui considéré comme un classique, avait tout simplement été égaré lors d'un déménagement des collections survenu il y a plus de deux décennies. C'est en réorganisant une section peu fréquentée de la réserve qu'un employé est tombé, presque par hasard, sur cette pièce que l'on croyait définitivement perdue. Plutôt que de la remettre en circulation, la bibliothèque a préféré l'exposer dans une vitrine sécurisée. (122 mots)",
  },
  {
    sujet: "Section B : Argumentation. Les entreprises devraient-elles publier chaque année l'écart de salaire entre leurs employés hommes et femmes ?",
    n6: "Je pense que oui, ce serait une bonne chose. Ça permettrait de voir clairement s'il y a un problème dans l'entreprise et de le corriger. Beaucoup de gens ne savent pas exactement comment sont calculés les salaires, donc rendre cette information publique pourrait aider à créer plus de confiance. Bien sûr, il faudrait faire attention à ne pas partager d'informations trop précises sur chaque personne. (82 mots)",
    n9: "Cette mesure me semble aller dans le bon sens, dans la mesure où la transparence constitue souvent un levier efficace pour faire évoluer des pratiques restées longtemps opaques. Publier ces écarts obligerait les entreprises à justifier, voire à corriger, des disparités qui, autrement, demeureraient invisibles. Il conviendrait néanmoins d'encadrer cette obligation avec précaution, en s'assurant que les données restent agrégées par poste, sans permettre d'identifier la rémunération individuelle. (120 mots)",
  },
];

const eo5: EOItem[] = [
  {
    titre: "Section A : Obtenir des renseignements — cours de natation pour enfant",
    base: "Candidat : Bonjour, je cherche des cours de natation pour mon enfant de 6 ans, qu'est-ce que vous proposez ?",
    variantes: [
      ["Précision (niveau)", "« Est-ce que votre enfant a déjà eu des cours, ou c'est un début complet ? »", "Répondre précisément pour orienter le placement."],
      ["Objection (horaire)", "« Les seuls cours pour cet âge sont le dimanche matin très tôt, à 8h. »", "Réagir à une contrainte d'horaire, demander des alternatives."],
      ["Question retour", "« Vous voulez un cours individuel ou en groupe ? »", "Exprimer une préférence avec une brève justification."],
    ],
  },
  {
    titre: "Section B : Argumenter — service de réparation d'appareils",
    base: "Candidat : Cette publicité présente un service de réparation rapide pour téléphones et ordinateurs, plutôt que de les remplacer. Je pense que ça pourrait vous faire économiser de l'argent.",
    variantes: [
      ["Objection (confiance)", "« J'ai peur qu'une réparation ne soit jamais aussi fiable qu'un appareil neuf. »", "Rassurer avec un argument concret (garantie, pièces certifiées)."],
      ["Objection (écologie)", "« De toute façon, je préfère acheter un nouvel appareil plus performant. »", "Réorienter sur l'aspect économique ET écologique."],
      ["Acceptation immédiate", "« D'accord, mon téléphone a justement un problème d'écran, je peux venir quand ? »", "Clôturer efficacement, orienter vers la prise de rendez-vous."],
    ],
  },
];

// ════════════════════════════════════════
// Export all mock exams
// ════════════════════════════════════════

export const mockExams: MockExam[] = [
  { id: 1, label: "Examen blanc #1", ce: ce1, co: co1, ee: ee1, eo: eo1 },
  { id: 2, label: "Examen blanc #2", ce: ce2, co: co2, ee: ee2, eo: eo2 },
  { id: 3, label: "Examen blanc #3", ce: ce3, co: co3, ee: ee3, eo: eo3 },
  { id: 4, label: "Examen blanc #4", ce: ce4, co: co4, ee: ee4, eo: eo4 },
  { id: 5, label: "Examen blanc #5", ce: ce5, co: co5, ee: ee5, eo: eo5 },
];
