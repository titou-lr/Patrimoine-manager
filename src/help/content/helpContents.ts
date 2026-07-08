import type { HelpContent, HelpPageKey } from '../types/help'

/**
 * Contenu d'aide contextuelle par page — référentiel consultable à tout moment
 * via le bouton « ? » de chaque page. Distinct du tour guidé (séquence unique
 * au premier lancement) : ici, rien n'est persisté, tout est relisible.
 */
export const HELP_CONTENTS: Record<HelpPageKey, HelpContent> = {

  patrimoine: {
    pageTitle: 'Patrimoine',
    intro: 'Cette page est la photo de ce que vous possédez réellement aujourd\'hui — distincte de la simulation, qui projette le futur, et du budget, qui suit vos flux mensuels.',
    sections: [
      {
        title: 'Le patrimoine net',
        content: 'Le grand chiffre en haut de page est votre patrimoine net : la somme de tous vos actifs (comptes, PEA, assurance-vie, immobilier, crypto…) moins tous vos passifs (crédits en cours, dettes). C\'est l\'indicateur de référence de votre situation financière à l\'instant T.',
      },
      {
        title: 'Saisir ses actifs et prendre un snapshot',
        content: 'L\'onglet « Saisir mon patrimoine » liste vos actifs et passifs par grandes familles (financier, immobilier, alternatif, dettes). Une fois vos valeurs à jour, cliquez sur « Prendre un snapshot » : la photo du moment est enregistrée. Les snapshots ne sont jamais pris automatiquement — c\'est vous qui décidez quand figer un point.',
        tip: 'Prenez un snapshot une fois par mois, par exemple après réception de vos relevés — la régularité rend la courbe d\'évolution vraiment lisible.',
      },
      {
        title: 'Lire la timeline et les KPIs',
        content: 'Chaque snapshot ajoute un point à la courbe « Évolution du patrimoine » (actifs, passifs et net). Les KPIs sous le chiffre principal résument votre structure : ratio de liquidités (part immédiatement mobilisable), fonds d\'urgence (mois de dépenses couvertes, calculé avec vos données Budget) et taux d\'endettement.',
      },
      {
        title: 'Les top movers',
        content: 'Dès que vous avez au moins deux snapshots, la section « Top movers » affiche les actifs qui ont le plus varié entre les deux dernières photos — en euros et en pourcentage. C\'est le moyen le plus rapide de voir ce qui tire votre patrimoine vers le haut ou vers le bas.',
      },
    ],
  },

  succession: {
    pageTitle: 'Succession / Donation',
    intro: 'Ce simulateur estime les droits de succession sur votre patrimoine selon le droit fiscal français (barèmes 2024). Estimation indicative — elle ne remplace pas un conseil notarial.',
    sections: [
      {
        title: 'La masse successorale',
        content: 'La masse successorale est la valeur transmise à votre décès : votre patrimoine net actuel (actifs moins passifs, tel que saisi dans la page Patrimoine), éventuellement diminué de l\'assurance-vie traitée hors succession (régime de l\'article 990 I pour les versements avant 70 ans).',
      },
      {
        title: 'Ajouter des bénéficiaires et leur part',
        content: 'Chaque bénéficiaire est défini par son lien de parenté (qui détermine l\'abattement et le barème applicables) et sa part de la succession en pourcentage. Le total des parts doit faire 100 % — un avertissement s\'affiche sinon. Le conjoint ou partenaire de PACS est totalement exonéré.',
      },
      {
        title: 'Interpréter les droits estimés',
        content: 'Pour chaque bénéficiaire, le tableau détaille : la part brute reçue, l\'abattement appliqué (100 000 € pour un enfant, 31 865 € pour un petit-enfant…), la base imposable restante, les droits à payer selon le barème progressif, et le taux effectif réellement supporté.',
      },
      {
        title: 'Le rappel fiscal des 15 ans',
        content: 'Les donations effectuées dans les 15 ans précédant le décès sont « rappelées » : elles consomment l\'abattement du bénéficiaire concerné. Saisissez vos donations passées dans le panneau dédié — le simulateur réduit automatiquement l\'abattement disponible.',
        tip: 'Donner tôt et régulièrement permet de repartir avec un abattement complet tous les 15 ans — c\'est le levier de transmission le plus simple.',
      },
      {
        title: 'Projeter dans le futur',
        content: 'Le curseur « Projeter dans X ans » ajoute à la masse successorale la croissance calculée par votre simulation d\'épargne. Vous voyez ainsi comment les droits évolueraient si votre patrimoine continue de croître — utile pour anticiper une stratégie de donation.',
      },
    ],
  },

  simulation: {
    pageTitle: 'Simulation',
    intro: 'La simulation projette l\'évolution de votre épargne sur le long terme, enveloppe par enveloppe, avec intérêts composés, frais, fiscalité réelle à la sortie et correction de l\'inflation.',
    sections: [
      {
        title: 'Créer et gérer des simulations',
        content: 'Chaque simulation de la sidebar est un scénario indépendant : ses enveloppes, ses paramètres, ses événements de vie. Le bouton « + » de la section Simulations en crée une nouvelle — pratique pour comparer deux stratégies (par exemple avec ou sans achat immobilier) via le panneau de comparaison du tableau de bord.',
      },
      {
        title: 'Paramètres globaux',
        content: 'La barre de chips en haut de la page Enveloppes règle l\'horizon (en années), le scénario de marché (pessimiste, réaliste, optimiste) et le mode de calcul (Standard ou Monte-Carlo, qui génère 1 000 trajectoires probabilistes). Le revenu mensuel et le taux d\'épargne définissent votre effort d\'épargne total.',
      },
      {
        title: 'Ajouter et paramétrer des enveloppes',
        content: 'Le bouton « Ajouter une enveloppe » propose 10 presets (Livret A, PEA, CTO, assurance-vie, PER…) avec fiscalité et plafonds légaux intégrés. Dans chaque enveloppe, réglez le capital initial, le versement mensuel, l\'allocation d\'actifs avec leurs rendements attendus, et les frais — importables directement depuis la page Courtiers.',
        tip: 'Quand une enveloppe atteint son plafond légal (Livret A à 22 950 €…), l\'app vous propose de rediriger le surplus de versements vers une autre enveloppe.',
      },
      {
        title: 'Lire les graphiques de projection',
        content: 'Après « Lancer la simulation », le tableau de bord affiche vos résultats : la projection empilée montre la contribution de chaque enveloppe au capital total, la ligne pointillée donne la valeur en euros constants (pouvoir d\'achat réel). Les autres onglets analysent l\'inflation, la retraite, le bilan net de dettes, l\'impact des frais… Les résultats sont un instantané figé : modifiez librement vos enveloppes, puis relancez quand vous voulez.',
      },
      {
        title: 'Les événements de vie',
        content: 'En bas de la page Enveloppes, ajoutez des événements datés qui modifient la trajectoire : pause d\'épargne, rentrée d\'argent exceptionnelle, retrait (apport immobilier…), naissance d\'un enfant, hausse de dépenses. Ils sont injectés mois par mois dans le calcul.',
      },
    ],
  },

  budget: {
    pageTitle: 'Budget',
    intro: 'Le module Budget suit vos revenus et dépenses réels mois par mois, et confronte votre taux d\'épargne réel à l\'hypothèse utilisée dans votre simulation.',
    sections: [
      {
        title: 'Créer ses enveloppes budgétaires',
        content: 'Une enveloppe budgétaire est un poste de dépense (alimentation, loyer, loisirs…) doté d\'un budget mensuel. Créez-les depuis la vue d\'ensemble : la barre à trois segments de chaque carte montre ce qui est dépensé, ce qui reste, et le report éventuel du mois précédent si l\'option rollover est activée.',
      },
      {
        title: 'Saisir ou importer ses transactions',
        content: 'Ajoutez vos transactions à la main (bouton « + Transaction ») ou importez un relevé bancaire CSV / Excel depuis l\'onglet Transactions : un assistant vous guide pour associer les colonnes (date, libellé, montant), et les doublons déjà importés sont automatiquement ignorés.',
      },
      {
        title: 'L\'écart réel vs simulation',
        content: 'Le bandeau en haut de page compare votre taux d\'épargne réel du mois (revenus moins dépenses) au taux supposé dans votre simulation. Un écart de plus de 5 points déclenche un avertissement, plus de 15 points une alerte critique — le signe que vos projections reposent sur une hypothèse à corriger.',
        tip: 'Si vous épargnez durablement plus que prévu, augmentez les versements dans la simulation : vos projections sont trop pessimistes.',
      },
      {
        title: 'La catégorisation automatique par mots-clés',
        content: 'Chaque catégorie peut porter des mots-clés (« carrefour », « edf »…). Lors d\'un import ou d\'une saisie, le libellé de la transaction est comparé aux mots-clés — accents et majuscules ignorés — et la catégorie correspondante est proposée automatiquement. Gérez les mots-clés depuis « Catégories », puis recatégorisez l\'existant en un clic. Vos choix manuels ne sont jamais écrasés.',
      },
    ],
  },

  finance: {
    pageTitle: 'Finance',
    intro: 'Suivez les marchés en temps réel, entraînez-vous au trading sans risque et analysez vos performances comme un professionnel — aucun argent réel n\'est jamais engagé.',
    sections: [
      {
        title: 'Paper trading et types d\'ordres',
        content: 'Créez un compte virtuel avec un capital fictif dans l\'onglet Trading, puis passez des ordres : au marché (exécution immédiate avec spread simulé), limite (prix garanti si le marché le croise), stop-loss, stop-limite, stop suiveur (le stop suit le cours à distance fixe) et OCO (deux ordres liés, le premier exécuté annule l\'autre). Commissions et slippage sont simulés pour coller à la réalité.',
      },
      {
        title: 'Lire les métriques de performance',
        content: 'Le tableau de bord du Journal calcule vos statistiques sur les trades fermés, en P&L net de frais : win rate (part de trades gagnants), profit factor (gains totaux / pertes totales, viser > 1,5), expectancy (gain moyen par trade), max drawdown (pire creux de votre courbe de capital) et ratio de Sharpe hebdomadaire.',
        tip: 'Un win rate élevé ne suffit pas : avec un profit factor sous 1, vous perdez de l\'argent malgré une majorité de trades gagnants.',
      },
      {
        title: 'Le Bar Replay',
        content: 'L\'onglet Replay rejoue l\'historique d\'un actif bougie par bougie depuis une date de votre choix. Avancez pas à pas ou en lecture automatique, passez des ordres comme en conditions réelles — sans connaître la suite. C\'est le meilleur moyen de tester une stratégie sur des configurations passées. La session est éphémère : rien n\'est mélangé avec vos comptes paper.',
      },
      {
        title: 'Le journal de trading',
        content: 'Chaque trade fermé est archivé avec son P&L net, sa durée, et son RRR réalisé (ratio gain obtenu / risque prévu au stop). Triez, filtrez, annotez chaque ligne pour documenter votre raisonnement — la relecture régulière de ses notes est ce qui fait progresser le plus.',
      },
    ],
  },

  education: {
    pageTitle: 'Éducation financière',
    intro: 'Un parcours de formation complet en 7 modules — des fondamentaux (inflation, intérêts composés) jusqu\'à l\'optimisation fiscale, en passant par la lecture des marchés.',
    sections: [
      {
        title: 'Progresser dans les modules',
        content: 'Les modules se suivent dans l\'ordre : terminer toutes les leçons et exercices d\'un module déverrouille automatiquement le suivant. Commencez par « Les Fondamentaux » — chaque carte du catalogue indique le format (QCM, interactif, mixte) et la durée estimée. Votre progression est sauvegardée : quittez et reprenez quand vous voulez.',
      },
      {
        title: 'Les simulateurs interactifs',
        content: 'Les leçons ne sont pas de la lecture passive : elles embarquent des simulateurs à manipuler (faites varier un taux, une durée, une allocation et observez l\'effet), des graphiques boursiers interactifs pour les modules marchés, et des QCM à correction immédiate. Certains exercices se valident automatiquement en terminant la leçon associée.',
        tip: 'Prenez le temps de manipuler chaque simulateur — c\'est en changeant les paramètres vous-même que les ordres de grandeur se retiennent.',
      },
    ],
  },

  brokers: {
    pageTitle: 'Courtiers & Banques',
    intro: 'Base de données des courtiers et banques français avec leurs grilles de frais par type d\'enveloppe — pour choisir où ouvrir votre PEA, CTO, assurance-vie ou PER.',
    sections: [
      {
        title: 'Comparer des courtiers',
        content: 'Filtrez par type d\'enveloppe pour ne voir que les établissements qui la proposent, puis sélectionnez jusqu\'à 3 courtiers et ouvrez la comparaison côte à côte : frais de courtage, minimum par ordre, frais de gestion et de garde, note globale, points forts et points faibles.',
      },
      {
        title: 'Créer un courtier personnalisé',
        content: 'Votre banque n\'est pas dans la liste ? Le bouton « + Ajouter » crée une fiche personnalisée : nom, type d\'établissement, note, avantages/inconvénients et grille de frais par enveloppe. Vos fiches sont marquées d\'un badge, restent modifiables, et sont propres à votre profil.',
      },
      {
        title: 'Importer des frais dans une enveloppe',
        content: 'Depuis la page Enveloppes, le panneau de configuration de chaque enveloppe propose un bouton d\'import dans la section Banque & frais : choisissez un courtier et sa grille de frais s\'applique directement à votre simulation. Plus besoin de ressaisir les pourcentages à la main.',
        tip: 'Sur 20 ou 30 ans, quelques dixièmes de pourcent de frais annuels représentent des dizaines de milliers d\'euros — comparez avant d\'ouvrir un compte.',
      },
    ],
  },

  models: {
    pageTitle: 'Modèles & Formules',
    intro: 'La référence mathématique exhaustive de l\'application : chaque formule utilisée dans le code, expliquée avec ses variables, un exemple chiffré et sa source exacte.',
    sections: [
      {
        title: 'Naviguer entre les sections',
        content: 'Le panneau de gauche liste les 8 sections : simulation et épargne, fiscalité française, retraite, crédit, indicateurs techniques, Monte-Carlo, Black-Litterman et backtest. Cliquez pour sauter directement à une section — la section active se met en surbrillance au fil de votre scroll.',
      },
      {
        title: 'Utiliser les calculateurs interactifs',
        content: 'La plupart des formules sont accompagnées d\'un calculateur : modifiez les entrées (capital, taux, durée…) et le résultat se recalcule instantanément avec la vraie formule du moteur. C\'est le moyen le plus concret de sentir l\'effet de chaque paramètre — l\'impact d\'un point de frais, d\'un point d\'inflation ou d\'une année de plus.',
        tip: 'Chaque formule cite son fichier source : ce que vous lisez ici est exactement ce que calcule l\'app, pas une approximation.',
      },
    ],
  },
}
